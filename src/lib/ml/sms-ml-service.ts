// SMS ML Service - Integrates classifier with SMS parsing
// Handles the complete flow: SMS → Parse → Classify (ML + LLM fallback) → Store

import { db, Transaction } from '@/database/db';
import { predictCategory, updateModel } from './classifier';
import { parseSMS, isFinancialSMS, type ParsedSMS, getLearnedMappings } from '@/services/sms/smsParser';
import { aiCategorize } from '@/services/ai/aiClient';

// Threshold below which we ask the LLM to refine the category
const LLM_FALLBACK_THRESHOLD = 0.45;

export interface ProcessedSMS {
  transaction: Partial<Transaction>;
  prediction: {
    category: string;
    confidence: number;
  };
  parsed: ParsedSMS;
  needsReview: boolean;
}

// Process incoming SMS with ML classification
export async function processSMSWithML(
  userId: string,
  rawSmsText: string,
  receivedAt: Date = new Date()
): Promise<ProcessedSMS> {
  console.log('[SMS-ML] Processing SMS:', rawSmsText.substring(0, 50) + '...');
  
  // Step 1: Check if financial SMS
  const isFinancial = isFinancialSMS(rawSmsText);
  
  // Step 2: Parse the SMS
  const parsed = parseSMS(rawSmsText);
  
  if (!isFinancial) {
    console.log('[SMS-ML] Non-financial SMS, skipping');
    return {
      transaction: {},
      prediction: { category: 'General Expense', confidence: 0 },
      parsed,
      needsReview: true
    };
  }
  
  // Step 3: Get ML prediction with overrides
  let prediction = { category: parsed.category, confidence: parsed.categoryConfidence };
  let merchantCategorySource: Transaction['merchantCategorySource'] = 'classifier';
  let isOverride = false;

  if (parsed.merchant) {
    // Check manual learned mappings first
    const learnedMappings = getLearnedMappings();
    const merchantLower = parsed.merchant.toLowerCase();
    
    let learnedCat = null;
    for (const [key, category] of Object.entries(learnedMappings)) {
      if (merchantLower.includes(key) || key.includes(merchantLower)) {
        learnedCat = category;
        break;
      }
    }
    
    if (learnedCat) {
      prediction = { category: learnedCat, confidence: 0.95 };
      merchantCategorySource = 'manual';
      isOverride = true;
      console.log(`[SMS-ML] Manual override: ${learnedCat} (95%)`);
    } else {
      // Check merchant dictionary normalizer
      const { normalizeMerchant } = await import('@/lib/merchant/normalizeMerchant');
      const norm = normalizeMerchant(parsed.merchant);
      if (norm.isMatched) {
        prediction = { category: norm.category, confidence: 1.0 };
        merchantCategorySource = 'dictionary';
        isOverride = true;
        console.log(`[SMS-ML] Dictionary override & boost: ${norm.category} (100%)`);
      }
    }
  }

  if (!isOverride) {
    const textForPrediction = `${parsed.merchant || ''} ${rawSmsText}`.trim();
    const mlPred = await predictCategory(textForPrediction);
    prediction = { category: mlPred.category, confidence: mlPred.confidence };
    merchantCategorySource = 'classifier';

    // Step 3b: LLM fallback when confidence is low
    if (prediction.confidence < LLM_FALLBACK_THRESHOLD && parsed.amount) {
      try {
        console.log('[SMS-ML] Confidence low, asking LLM for refinement');
        const llm = await aiCategorize({
          text: rawSmsText,
          merchant: parsed.merchant,
          amount: parsed.amount,
          direction: parsed.direction,
        });
        if (llm?.category && llm.confidence > prediction.confidence) {
          prediction = { category: llm.category, confidence: llm.confidence };
          merchantCategorySource = 'llm';
          console.log(`[SMS-ML] LLM refined → ${llm.category} (${(llm.confidence * 100).toFixed(1)}%)`);
          // Online learning
          try { await updateModel(textForPrediction, llm.category); } catch (e) { console.warn('[SMS-ML] updateModel failed', e); }
        }
      } catch (e) {
        console.warn('[SMS-ML] LLM fallback failed (using ML prediction):', e);
      }
    }
  }

  // Step 4: Determine if review is needed
  const needsReview = prediction.confidence < 0.5 || parsed.direction === 'unknown';
  
  // Step 5: Build transaction object
  const transaction: Partial<Transaction> = {
    type: parsed.direction === 'credit' ? 'income' : 'expense',
    amount: parsed.amount || 0,
    description: parsed.merchantCanonical || parsed.merchant || `SMS Transaction`,
    category: prediction.category,
    date: parsed.dateTime || receivedAt,
    source: 'sms',
    verified: !needsReview,
    verifiedVia: 'sms',
    isAutoAdded: true,
    confidence: prediction.confidence,
    needsReview,
    rawData: rawSmsText,
    paymentMethod: parsed.method,
    referenceId: parsed.referenceId,
    last4Digits: parsed.last4Digits,
    categoryConfidence: prediction.confidence,
    createdAt: new Date(),
    merchantRaw: parsed.merchant || undefined,
    merchantCanonical: parsed.merchantCanonical || parsed.merchant || undefined,
    merchantCategorySource: merchantCategorySource
  };
  
  // Parser test logging for debugging
  console.log(
    `[SMS Parsed]\n` +
    `merchant: ${parsed.merchant || 'SMS Transaction'}\n` +
    `amount: ${parsed.amount}\n` +
    `category: ${prediction.category}\n` +
    `confidence: ${prediction.confidence}`
  );
  
  return {
    transaction,
    prediction,
    parsed,
    needsReview
  };
}

// Ingest SMS and save to database
export async function ingestSMS(
  userId: string,
  rawSmsText: string,
  receivedAt: Date = new Date()
): Promise<Transaction | null> {
  try {
    // Check if financial SMS first
    if (!isFinancialSMS(rawSmsText)) {
      console.log('[SMS-ML] Skipping non-financial SMS');
      return null;
    }
    
    // Process with ML
    const processed = await processSMSWithML(userId, rawSmsText, receivedAt);
    
    if (!processed.parsed.amount) {
      console.log('[SMS-ML] Skipping invalid SMS - no amount');
      return null;
    }
    
    // Check for duplicates
    const isDuplicate = await checkDuplicate(processed);
    if (isDuplicate) {
      console.log('[SMS-ML] Duplicate detected, skipping');
      return null;
    }
    
    // Check for matching manual entry to merge
    const matchingManual = await findMatchingManualEntry(processed);
    if (matchingManual) {
      console.log('[SMS-ML] Found matching manual entry, merging');
      await db.transactions.update(matchingManual.id!, {
        verifiedVia: 'sms',
        rawData: rawSmsText,
        referenceId: processed.parsed.referenceId,
        confidence: processed.prediction.confidence
      });
      return matchingManual;
    }
    
    // Dispatch AI confirmation event — user must approve before saving
    if (typeof window !== 'undefined') {
      const detail = {
        data: {
          type: (processed.transaction.type as 'income' | 'expense') || 'expense',
          merchant: processed.transaction.description || 'SMS Transaction',
          amount: processed.transaction.amount!,
          date: processed.transaction.date || receivedAt,
          category: processed.transaction.category || 'Other Expense',
          source: 'sms' as const,
          confidence: processed.prediction.confidence,
          rawText: rawSmsText,
        },
        rawSms: rawSmsText,
        parsed: {
          referenceId: processed.parsed.referenceId,
          last4Digits: processed.parsed.last4Digits,
          method: processed.parsed.method,
          merchantRaw: processed.parsed.merchantRaw,
          merchantCanonical: processed.parsed.merchantCanonical,
          merchantCategorySource: processed.transaction.merchantCategorySource || processed.parsed.merchantCategorySource,
        },
      };
      window.dispatchEvent(new CustomEvent('khaata:sms-pending-confirm', { detail }));
      console.log('[SMS-ML] Dispatched confirmation event for user review');
    }

    return null;
  } catch (error) {
    console.error('[SMS-ML] Error ingesting SMS:', error);
    return null;
  }
}

// Check for duplicate transactions
async function checkDuplicate(processed: ProcessedSMS): Promise<boolean> {
  const { parsed } = processed;
  
  const incrementDuplicateCount = () => {
    try {
      const count = parseInt(localStorage.getItem('khaataKitab_duplicatesRemoved') || '0');
      localStorage.setItem('khaataKitab_duplicatesRemoved', String(count + 1));
    } catch (e) {
      console.warn('Failed to update duplicate count in localStorage', e);
    }
  };

  // Check by reference ID first
  if (parsed.referenceId) {
    const existing = await db.transactions
      .where('referenceId')
      .equals(parsed.referenceId)
      .first();
    if (existing) {
      console.log(`[Deduplication] Duplicate detected by reference ID: "${parsed.referenceId}"`);
      incrementDuplicateCount();
      return true;
    }
  }
  
  // Check by amount + time window (±10 minutes) + merchant similarity
  if (parsed.amount && parsed.dateTime) {
    const timeWindow = 10 * 60 * 1000; // 10 minutes
    const minTime = new Date(parsed.dateTime.getTime() - timeWindow);
    const maxTime = new Date(parsed.dateTime.getTime() + timeWindow);
    
    const candidates = await db.transactions
      .where('date')
      .between(minTime, maxTime)
      .toArray();
    
    for (const candidate of candidates) {
      // Amount within ±₹2
      const amountMatch = Math.abs(candidate.amount - parsed.amount) <= 2;
      
      // Merchant similarity
      let merchantMatch = false;
      if (parsed.merchant && candidate.description) {
        const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        const c1 = clean(parsed.merchant);
        const c2 = clean(candidate.description);
        merchantMatch = c1.includes(c2) || c2.includes(c1);
      } else {
        merchantMatch = true;
      }
      
      if (amountMatch && merchantMatch) {
        console.log(`[Deduplication] Duplicate detected by amount (±₹2) and merchant similarity inside ±10m window: ₹${parsed.amount} at "${parsed.merchant || 'unknown'}"`);
        incrementDuplicateCount();
        return true;
      }
    }
  }
  
  return false;
}

// Find matching manual entry for merging
async function findMatchingManualEntry(processed: ProcessedSMS): Promise<Transaction | null> {
  const { parsed } = processed;
  
  if (!parsed.amount || !parsed.dateTime) return null;
  
  const timeWindow = 10 * 60 * 1000; // 10 minutes
  const minTime = new Date(parsed.dateTime.getTime() - timeWindow);
  const maxTime = new Date(parsed.dateTime.getTime() + timeWindow);
  
  const candidates = await db.transactions
    .where('date')
    .between(minTime, maxTime)
    .filter(t => !t.isAutoAdded && t.verifiedVia !== 'sms')
    .toArray();
  
  for (const candidate of candidates) {
    // Amount within ±₹2 and not already auto-added
    if (Math.abs(candidate.amount - parsed.amount) <= 2) {
      return candidate;
    }
  }
  
  return null;
}

// Handle user category correction with online learning
export async function correctCategory(
  transactionId: number,
  correctedCategory: string
): Promise<void> {
  const transaction = await db.transactions.get(transactionId);
  
  if (!transaction) {
    console.error('[SMS-ML] Transaction not found:', transactionId);
    return;
  }
  
  // Update the transaction
  await db.transactions.update(transactionId, {
    category: correctedCategory,
    needsReview: false,
    confidence: 1.0 // User-verified
  });
  
  // Train the model with this correction
  const textForLearning = `${transaction.description || ''} ${transaction.rawData || ''}`.trim();
  
  if (textForLearning) {
    await updateModel(textForLearning, correctedCategory);
    console.log(`[SMS-ML] Model updated with correction: ${correctedCategory}`);
  }
}

// Get transactions needing review
export async function getTransactionsNeedingReview(): Promise<Transaction[]> {
  return db.transactions
    .filter(t => t.needsReview === true)
    .toArray();
}

// Batch process buffered SMS
export async function processBufferedSMS(
  userId: string,
  smsMessages: Array<{ text: string; receivedAt: Date }>
): Promise<number> {
  let processed = 0;
  
  for (const sms of smsMessages) {
    const result = await ingestSMS(userId, sms.text, sms.receivedAt);
    if (result) processed++;
  }
  
  console.log(`[SMS-ML] Processed ${processed}/${smsMessages.length} buffered SMS`);
  return processed;
}

// Export categories for UI use
export { categories } from './classifier';
