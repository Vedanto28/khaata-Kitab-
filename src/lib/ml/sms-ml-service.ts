// SMS ML Service - Integrates classifier with SMS parsing
// Handles the complete flow: SMS → Parse → Classify → Store

import { db, Transaction } from '../db';
import { predictCategory, updateModel } from './classifier';
import { parseSMS, isFinancialSMS, type ParsedSMS } from '../sms-parser';

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
  
  // Step 3: Get ML prediction
  const textForPrediction = `${parsed.merchant || ''} ${rawSmsText}`.trim();
  const prediction = await predictCategory(textForPrediction);
  
  console.log(`[SMS-ML] Predicted: ${prediction.category} (${(prediction.confidence * 100).toFixed(1)}%)`);
  
  // Step 4: Determine if review is needed
  const needsReview = prediction.confidence < 0.5 || parsed.direction === 'unknown';
  
  // Step 5: Build transaction object
  const transaction: Partial<Transaction> = {
    type: parsed.direction === 'credit' ? 'income' : 'expense',
    amount: parsed.amount || 0,
    description: parsed.merchant || `SMS Transaction`,
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
    createdAt: new Date()
  };
  
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
    
    // Save new transaction
    const newTransaction: Transaction = {
      type: processed.transaction.type as 'income' | 'expense',
      amount: processed.transaction.amount!,
      description: processed.transaction.description!,
      category: processed.transaction.category!,
      date: processed.transaction.date!,
      source: 'sms',
      verified: !processed.needsReview,
      verifiedVia: 'sms',
      isAutoAdded: true,
      confidence: processed.prediction.confidence,
      needsReview: processed.needsReview,
      rawData: rawSmsText,
      paymentMethod: processed.parsed.method,
      referenceId: processed.parsed.referenceId,
      last4Digits: processed.parsed.last4Digits,
      categoryConfidence: processed.prediction.confidence,
      createdAt: new Date()
    };
    
    const id = await db.transactions.add(newTransaction);
    console.log(`[SMS-ML] Saved transaction #${id}`);
    
    return { ...newTransaction, id };
  } catch (error) {
    console.error('[SMS-ML] Error ingesting SMS:', error);
    return null;
  }
}

// Check for duplicate transactions
async function checkDuplicate(processed: ProcessedSMS): Promise<boolean> {
  const { parsed } = processed;
  
  // Check by reference ID first
  if (parsed.referenceId) {
    const existing = await db.transactions
      .where('referenceId')
      .equals(parsed.referenceId)
      .first();
    if (existing) return true;
  }
  
  // Check by amount + time window (±10 minutes)
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
      if (Math.abs(candidate.amount - parsed.amount) <= 2) {
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
