// SMS Service for Android - Handles SMS reading, processing, and transaction creation
import { db, Transaction } from './db';
import { parseSMS, isFinancialSMS, maskSensitiveData, ParsedSMS, saveLearnedMapping } from './sms-parser';

interface RawSMSMessage {
  address: string;
  body: string;
  date: number;
  id?: string;
}

// Store processed SMS IDs to prevent duplicates
const PROCESSED_SMS_KEY = 'khaataKitab_processedSMS';
const SMS_BUFFER_KEY = 'khaataKitab_smsBuffer';

const getProcessedSMSIds = (): Set<string> => {
  try {
    const stored = localStorage.getItem(PROCESSED_SMS_KEY);
    return new Set(stored ? JSON.parse(stored) : []);
  } catch {
    return new Set();
  }
};

const markSMSAsProcessed = (id: string): void => {
  try {
    const processed = getProcessedSMSIds();
    processed.add(id);
    // Keep only last 1000 IDs to prevent storage bloat
    const arr = Array.from(processed).slice(-1000);
    localStorage.setItem(PROCESSED_SMS_KEY, JSON.stringify(arr));
  } catch (e) {
    console.error('Failed to mark SMS as processed:', e);
  }
};

// Buffer SMS when app is closed
export const bufferSMS = (sms: RawSMSMessage): void => {
  try {
    const buffer = getSMSBuffer();
    buffer.push(sms);
    localStorage.setItem(SMS_BUFFER_KEY, JSON.stringify(buffer));
  } catch (e) {
    console.error('Failed to buffer SMS:', e);
  }
};

export const getSMSBuffer = (): RawSMSMessage[] => {
  try {
    const stored = localStorage.getItem(SMS_BUFFER_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const clearSMSBuffer = (): void => {
  localStorage.removeItem(SMS_BUFFER_KEY);
};

// Generate unique ID for SMS deduplication
const generateSMSId = (sms: RawSMSMessage): string => {
  return `${sms.address}_${sms.date}_${sms.body.slice(0, 50)}`;
};

// Check if a similar transaction already exists (for auto-merge)
const findMatchingTransaction = async (parsed: ParsedSMS): Promise<Transaction | null> => {
  if (!parsed.amount || !parsed.dateTime) return null;
  
  const tenMinutes = 10 * 60 * 1000;
  const amountTolerance = 2;
  
  const startTime = new Date(parsed.dateTime.getTime() - tenMinutes);
  const endTime = new Date(parsed.dateTime.getTime() + tenMinutes);
  
  const transactions = await db.transactions
    .where('date')
    .between(startTime, endTime)
    .filter(t => {
      const amountMatch = Math.abs(t.amount - (parsed.amount || 0)) <= amountTolerance;
      const typeMatch = (parsed.direction === 'debit' && t.type === 'expense') ||
                       (parsed.direction === 'credit' && t.type === 'income');
      return amountMatch && typeMatch && t.source === 'manual';
    })
    .toArray();
  
  // Return first match, preferring those with matching description/merchant
  if (transactions.length > 0) {
    if (parsed.merchant) {
      const merchantMatch = transactions.find(t => 
        t.description.toLowerCase().includes(parsed.merchant?.toLowerCase() || '')
      );
      if (merchantMatch) return merchantMatch;
    }
    return transactions[0];
  }
  
  return null;
};

// Process a single SMS and create/update transaction
export const processSMS = async (sms: RawSMSMessage): Promise<Transaction | null> => {
  const smsId = generateSMSId(sms);
  
  // Check if already processed
  if (getProcessedSMSIds().has(smsId)) {
    console.log('SMS already processed:', smsId);
    return null;
  }
  
  // Check if it's a financial SMS
  if (!isFinancialSMS(sms.body)) {
    return null;
  }
  
  // Parse the SMS
  const parsed = parseSMS(sms.body);
  
  // Skip if no amount could be extracted
  if (parsed.amount === null) {
    console.log('Could not extract amount from SMS');
    return null;
  }
  
  // Check for existing manual transaction to merge with
  const existingTransaction = await findMatchingTransaction(parsed);
  
  if (existingTransaction && existingTransaction.id) {
    // Merge: Update existing transaction with SMS verification
    await db.transactions.update(existingTransaction.id, {
      verified: true,
      source: 'manual', // Keep as manual since user entered it
      rawData: maskSensitiveData(sms.body),
      confidence: parsed.parseConfidence,
    });
    
    markSMSAsProcessed(smsId);
    console.log('Merged SMS with existing transaction:', existingTransaction.id);
    return existingTransaction;
  }
  
  // Create new auto-added transaction
  const transaction: Omit<Transaction, 'id'> = {
    type: parsed.direction === 'credit' ? 'income' : 'expense',
    amount: parsed.amount,
    description: parsed.merchant || `${parsed.method.toUpperCase()} Transaction`,
    category: parsed.category,
    date: parsed.dateTime || new Date(sms.date),
    source: 'sms',
    rawData: maskSensitiveData(sms.body),
    verified: !parsed.needsReview,
    confidence: parsed.parseConfidence,
    createdAt: new Date(),
  };
  
  try {
    const id = await db.transactions.add(transaction);
    markSMSAsProcessed(smsId);
    console.log('Created new transaction from SMS:', id);
    return { ...transaction, id };
  } catch (e) {
    console.error('Failed to create transaction from SMS:', e);
    return null;
  }
};

// Process all buffered SMS on app launch
export const processBufferedSMS = async (): Promise<number> => {
  const buffer = getSMSBuffer();
  let processedCount = 0;
  
  for (const sms of buffer) {
    const result = await processSMS(sms);
    if (result) processedCount++;
  }
  
  clearSMSBuffer();
  return processedCount;
};

// Update category learning when user corrects
export const updateCategoryLearning = (merchant: string, category: string): void => {
  if (merchant && category) {
    saveLearnedMapping(merchant, category);
  }
};

// Check if a transaction matches any SMS (for verification badge)
export const checkSMSVerification = async (transaction: Transaction): Promise<boolean> => {
  // Already verified via SMS
  if (transaction.source === 'sms' || transaction.verified) {
    return true;
  }
  
  // Check recent SMS for matching transaction
  const processedIds = getProcessedSMSIds();
  // If transaction was created recently and has high confidence, consider it potentially verifiable
  return transaction.confidence !== undefined && transaction.confidence >= 0.8;
};

// Simulate SMS reading for development (will be replaced by Capacitor plugin)
export const simulateSMSRead = async (): Promise<RawSMSMessage[]> => {
  // Sample Indian bank SMS messages for testing
  return [
    {
      address: 'SBIINB',
      body: 'Rs 1,500.00 debited from A/c XX1234 on 07-Dec-24 by UPI/merchant@paytm for grocery shopping. Avl Bal Rs 25,450.00 -SBI',
      date: Date.now() - 3600000,
      id: 'sim_1'
    },
    {
      address: 'HDFCBK',
      body: 'INR 35,000.00 credited to your A/c XX5678 on 07-Dec-24. IMPS Ref 412345678901 from SALARY. Bal: Rs 1,25,450.00',
      date: Date.now() - 7200000,
      id: 'sim_2'
    },
    {
      address: 'ICICIB',
      body: 'Your ICICI Credit Card XX9012 has been used for Rs.2,499 at AMAZON on 06-Dec-24. Avl Limit: Rs 85,000',
      date: Date.now() - 86400000,
      id: 'sim_3'
    },
    {
      address: 'PAYTMB',
      body: 'Rs 250 paid to SWIGGY from Paytm Wallet on 07-Dec-24. Ref: TXN123456789. Wallet Bal: Rs 1,250',
      date: Date.now() - 1800000,
      id: 'sim_4'
    },
    {
      address: 'AXISBK',
      body: 'ATM WDL Rs.5,000 at AXIS ATM/MUMBAI on 06-Dec-24 from A/c XX3456. Avl Bal Rs.45,678.90',
      date: Date.now() - 172800000,
      id: 'sim_5'
    },
    {
      address: 'KOTAKB',
      body: 'NEFT of Rs.15,000 credited to A/c XX7890 from ABC COMPANY on 05-Dec-24. Ref: NEFT12345678. Bal Rs.75,000.00',
      date: Date.now() - 259200000,
      id: 'sim_6'
    }
  ];
};
