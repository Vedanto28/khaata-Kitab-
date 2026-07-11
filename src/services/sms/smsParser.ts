import { normalizeMerchant } from '@/lib/merchant/normalizeMerchant';

export interface ParsedSMS {
  amount: number | null;
  direction: 'debit' | 'credit' | 'unknown';
  method: 'upi' | 'debit_card' | 'credit_card' | 'netbanking' | 'wallet' | 'atm' | 'neft' | 'rtgs' | 'imps' | 'unknown';
  dateTime: Date | null;
  merchant: string | null;
  last4Digits: string | null;
  referenceId: string | null;
  availableBalance: number | null;
  category: string;
  categoryConfidence: number;
  parseConfidence: number;
  needsReview: boolean;
  rawText: string;
  merchantRaw?: string;
  merchantCanonical?: string;
  merchantCategorySource?: 'dictionary' | 'classifier' | 'llm' | 'manual';
}

// Extended category mapping for comprehensive classification
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Transport & Travel': ['irctc', 'uts', 'rail', 'train', 'bus', 'cab', 'uber', 'ola', 'rapido', 'parking', 'toll', 'petrol', 'fuel', 'fastag', 'metro', 'flight', 'indigo', 'spicejet', 'makemytrip'],
  'Medical & Healthcare': ['pharma', 'medical', 'chemist', 'hospital', 'clinic', 'lab', 'health', 'apollo', 'medplus', 'netmeds', '1mg', 'doctor', 'pharmacy'],
  'Office & Business Supplies': ['stationery', 'office', 'print', 'xerox', 'paper', 'cartridge', 'supplies', 'staples'],
  'Shopping & Retail': ['amazon', 'flipkart', 'ajio', 'shop', 'mart', 'department', 'dmart', 'reliance', 'myntra', 'nykaa', 'meesho', 'tatacliq'],
  'Groceries': ['grocery', 'foods', 'super market', 'supermarket', 'vegetable', 'fruits', 'dairy', 'bigbasket', 'blinkit', 'zepto', 'jiomart', 'grofers', 'dunzo'],
  'Food & Dining': ['cafe', 'bakery', 'restaurant', 'hotel', 'food', 'swiggy', 'zomato', 'dominos', 'pizza', 'mcdonalds', 'kfc', 'starbucks', 'chaayos', 'biryani', 'dineout'],
  'Entertainment & Subscriptions': ['spotify', 'netflix', 'hotstar', 'ott', 'prime', 'subscription', 'disney', 'youtube', 'gaana', 'jiocinema', 'zee5', 'sonyliv'],
  'Bills & Utilities': ['electricity', 'mseb', 'mahavitaran', 'gas', 'cylinder', 'water', 'bescom', 'tatapower', 'adani', 'torrent', 'piped'],
  'Telecom Recharge': ['mobile', 'recharge', 'wifi', 'data', 'postpaid', 'prepaid', 'jio', 'airtel', 'vodafone', 'vi', 'bsnl'],
  'Housing': ['rent', 'pg', 'hostel', 'maintenance', 'society', 'apartment', 'flat'],
  'Education': ['school', 'college', 'tuition', 'fees', 'books', 'university', 'coaching', 'byju', 'unacademy', 'vedantu'],
  'Loan & EMI': ['emi', 'loan', 'debit card bill', 'credit card bill', 'bajaj', 'hdfc loan', 'icici loan', 'sbi loan'],
  'Insurance': ['insurance', 'premium', 'lic', 'max life', 'hdfc life', 'icici pru', 'health insurance', 'motor insurance'],
  'Donations': ['donation', 'temple', 'charity', 'ngo', 'give', 'relief fund'],
  'Assets & Precious Items': ['gold', 'jewellery', 'jewelry', 'tanishq', 'kalyan', 'malabar', 'diamond'],
  'Investments': ['sip', 'mutual fund', 'mf', 'share', 'stock', 'demat', 'broker', 'zerodha', 'groww', 'upstox', 'angel', 'coin'],
  'Gaming & Entertainment': ['game', 'gaming', 'esports', 'dream11', 'mpl', 'playstore', 'steam'],
  'Personal Care': ['beauty', 'salon', 'spa', 'personal care', 'parlour', 'haircut', 'grooming'],
  'Vehicle Maintenance': ['bike', 'car', 'garage', 'service', 'mechanic', 'tyre', 'tire', 'servicing'],
  'Pet Expenses': ['pet', 'vet', 'pet store', 'veterinary'],
  'Electronics': ['appliance', 'electronics', 'mobile store', 'croma', 'reliance digital', 'vijay sales'],
  'Home Services': ['cleaning', 'laundry', 'repair', 'urban company', 'urbanclap', 'housejoy'],
  'Sports & Fitness': ['fitness', 'gym', 'sports', 'cult', 'cultfit', 'decathlon'],
  'Travel Planning': ['travel agency', 'tour packages', 'goibibo', 'yatra', 'cleartrip', 'easemytrip'],
  'Gifts': ['gifts', 'toys', 'archies', 'ferns n petals', 'fnp'],
  'Government / Taxes': ['tax', 'gst', 'income tax', 'challan', 'e-filing', 'passport', 'govt'],
  'Bank Fees': ['fees', 'service charge', 'chargeback', 'annual fee', 'maintenance charge', 'sms charge'],
  'Cash Withdrawal': ['cash', 'atm', 'withdrawal', 'withdraw'],
  'Wallet Payment': ['wallet', 'paytm', 'mobikwik', 'wallet debit', 'freecharge', 'phonepe wallet'],
  'Personal Transfers': ['transfer', 'neft', 'rtgs', 'imps', 'self', 'own account'],
  'Salary': ['salary', 'credited', 'payroll', 'wages'],
  'Refund': ['refund', 'reversal', 'cashback', 'returned'],
  'General Expense': ['unknown', 'others', 'misc', 'miscellaneous'],
};

// Regex patterns for parsing
const PATTERNS = {
  amount: /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/gi,
  amountAlt: /(?:amount|amt|rs|inr|rupees?)[:\s]*([\d,]+(?:\.\d{1,2})?)/gi,
  debit: /(?:debited|spent|paid|debit|withdrawn|purchase|sent|transferred out|deducted)/i,
  credit: /(?:credited|received|credit|deposited|refund|cashback|reversed|added|transferred in)/i,
  upi: /(?:upi|bhim|phonepe|gpay|paytm|googlepay)/i,
  imps: /imps/i,
  neft: /neft/i,
  rtgs: /rtgs/i,
  netbanking: /(?:netbanking|net banking|online banking|ibanking)/i,
  creditCard: /(?:credit\s*card|cc\s+|visa\s+credit|master\s*card\s+credit)/i,
  debitCard: /(?:debit\s*card|dc\s+|atm\s*card|visa\s+debit|maestro|rupay)/i,
  wallet: /(?:wallet|paytm\s+wallet|mobikwik|freecharge|phonepe\s+wallet)/i,
  atm: /(?:atm|cash\s+withdrawal|withdrawn\s+at)/i,
  last4: /(?:a\/c|ac|account|card|xx|ending)\s*(?:no\.?|number)?[:\s]*[x*]*(\d{4})/i,
  refId: /(?:ref\.?\s*(?:no\.?|id)?|txn\s*(?:id|no)?|utr|imps\s*ref|neft\s*ref)[:\s]*([a-zA-Z0-9]+)/i,
  balance: /(?:bal(?:ance)?|avl\.?\s*bal|available)[:\s]*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  merchant: /(?:to|from|at|@|via|for)\s+([a-zA-Z0-9\s\-_.@]+?)(?:\s+(?:on|ref|txn|upi|via|rs|inr|₹|\d))/i,
  date: /(\d{1,2}[-\/\\]\d{1,2}[-\/\\]\d{2,4})/,
  time: /(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]m)?)/i,
};

// User-learned category mappings (persisted in localStorage)
const LEARNED_MAPPINGS_KEY = 'khaataKitab_learnedCategories';

export const getLearnedMappings = (): Record<string, string> => {
  try {
    const stored = localStorage.getItem(LEARNED_MAPPINGS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

export const saveLearnedMapping = (merchant: string, category: string): void => {
  try {
    const mappings = getLearnedMappings();
    mappings[merchant.toLowerCase().trim()] = category;
    localStorage.setItem(LEARNED_MAPPINGS_KEY, JSON.stringify(mappings));
  } catch (e) {
    console.error('Failed to save learned mapping:', e);
  }
};

const extractAmount = (text: string): number | null => {
  const patterns = [
    /(?:Rs\.?|INR|₹|rupees?)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:debited|credited|spent|paid|withdrawn|for|amount|amt|recharge)\s+(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:Rs\.?|INR|₹|rupees?)/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const amountStr = match[1].replace(/,/g, '');
      const val = parseFloat(amountStr);
      if (!isNaN(val) && val > 0) return val;
    }
  }
  return null;
};

const extractDirection = (text: string): 'debit' | 'credit' | 'unknown' => {
  const debitKeywords = /(?:debited|spent|paid|debit|withdrawn|purchase|sent|transferred\s+out|deducted|emi|recharge|payment\s+to)/i;
  const creditKeywords = /(?:credited|received|credit|deposited|refund|cashback|reversed|added|transferred\s+in|salary)/i;
  
  if (debitKeywords.test(text)) return 'debit';
  if (creditKeywords.test(text)) return 'credit';
  return 'unknown';
};

const extractMethod = (text: string): ParsedSMS['method'] => {
  const t = text.toLowerCase();
  if (t.includes('upi') || t.includes('bhim') || t.includes('gpay') || t.includes('phonepe') || t.includes('paytm')) return 'upi';
  if (t.includes('atm') || t.includes('cash withdrawal') || t.includes('withdrawn at')) return 'atm';
  if (t.includes('credit card') || t.includes('cc ending') || (t.includes('card ending') && t.includes('credit'))) return 'credit_card';
  if (t.includes('debit card') || t.includes('dc ending') || (t.includes('card ending') && t.includes('debit'))) return 'debit_card';
  if (t.includes('wallet')) return 'wallet';
  if (t.includes('imps')) return 'imps';
  if (t.includes('neft')) return 'neft';
  if (t.includes('rtgs')) return 'rtgs';
  if (t.includes('netbanking') || t.includes('net banking') || t.includes('online banking')) return 'netbanking';
  
  if (t.includes('card')) return 'credit_card';
  return 'unknown';
};

const extractDateTime = (text: string): Date | null => {
  const dateMatch = text.match(PATTERNS.date);
  const timeMatch = text.match(PATTERNS.time);
  
  if (dateMatch) {
    try {
      const dateParts = dateMatch[1].split(/[-\/\\]/);
      let day: number, month: number, year: number;
      
      if (dateParts[2].length === 4) {
        day = parseInt(dateParts[0]);
        month = parseInt(dateParts[1]) - 1;
        year = parseInt(dateParts[2]);
      } else {
        day = parseInt(dateParts[0]);
        month = parseInt(dateParts[1]) - 1;
        year = parseInt(dateParts[2]) + (parseInt(dateParts[2]) < 50 ? 2000 : 1900);
      }
      
      const date = new Date(year, month, day);
      
      if (timeMatch) {
        const timeParts = timeMatch[1].replace(/[ap]m/i, '').trim().split(':');
        let hours = parseInt(timeParts[0]);
        const minutes = parseInt(timeParts[1]);
        
        if (/pm/i.test(timeMatch[1]) && hours < 12) hours += 12;
        if (/am/i.test(timeMatch[1]) && hours === 12) hours = 0;
        
        date.setHours(hours, minutes);
      }
      
      return date;
    } catch {
      return null;
    }
  }
  
  return null;
};

const extractLast4Digits = (text: string): string | null => {
  const patterns = [
    /(?:a\/c|ac|account|card|xx|ending)\s*(?:no\.?|number)?\s*[x*]*(\d{4})\b/i,
    /\b[x*]+(\d{4})\b/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return null;
};

const extractReferenceId = (text: string): string | null => {
  const patterns = [
    /(?:ref\s*(?:no\.?|id)?|txn\s*(?:id|no)?|utr|imps\s*ref|neft\s*ref|rtgs\s*ref|reference)[:\s]*([a-zA-Z0-9]+)/i,
    /ref\s+(\d+)/i,
    /txn\s+(\d+)/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return null;
};

const extractBalance = (text: string): number | null => {
  const patterns = [
    /(?:bal(?:ance)?|avl\.?\s*bal|available\s*(?:bal(?:ance)?)?)[:\s]*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /bal\s+Rs\.?\s*([\d,]+(?:\.\d{1,2})?)/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const balanceStr = match[1].replace(/,/g, '');
      const val = parseFloat(balanceStr);
      if (!isNaN(val)) return val;
    }
  }
  return null;
};

const extractMerchant = (text: string): string | null => {
  const upiMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z]+)/);
  if (upiMatch) {
    return upiMatch[1];
  }
  
  const patterns = [
    /(?:paid\s+to|spent\s+at|transferred\s+to|received\s+from|ref\s+to|vpa|at)\s+([a-zA-Z0-9\s\-_.&]+?)(?:\s+(?:on|ref|txn|upi|via|rs|inr|₹|bal|avl|\d{2}[-\/\\]))/i,
    /(?:to|from)\s+([a-zA-Z0-9\s\-_.&]+?)(?:\s+(?:on|ref|txn|upi|via|rs|inr|₹|bal|avl|\d{2}[-\/\\]))/i,
    /info\s*:\s*([a-zA-Z0-9\s\-_.&]+)/i,
    /spent\s*Rs\s*[\d,.]+\s*at\s*([a-zA-Z0-9\s\-_.&]+)/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const cleaned = match[1].trim();
      const stopWords = ['bal', 'avl', 'balance', 'account', 'card', 'ending', 'for', 'ref', 'txn', 'on', 'withdrawn'];
      let words = cleaned.split(/\s+/);
      words = words.filter(w => !stopWords.includes(w.toLowerCase()));
      const result = words.join(' ').trim();
      if (result.length > 2) return result.slice(0, 50);
    }
  }
  return null;
};

const categorizeTransaction = (text: string, merchant: string | null): { category: string; confidence: number } => {
  const searchText = `${text} ${merchant || ''}`.toLowerCase();
  
  if (merchant) {
    // 1. User-learned manual mappings take top priority
    const learnedMappings = getLearnedMappings();
    const merchantLower = merchant.toLowerCase();
    
    for (const [key, category] of Object.entries(learnedMappings)) {
      if (merchantLower.includes(key) || key.includes(merchantLower)) {
        return { category, confidence: 0.95 };
      }
    }

    // 2. Merchant dictionary normalization matching takes second priority
    const norm = normalizeMerchant(merchant);
    if (norm.isMatched) {
      return { category: norm.category, confidence: 1.0 };
    }
  }
  
  let bestMatch: { category: string; confidence: number } = { category: 'General Expense', confidence: 0.3 };
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        const confidence = Math.min(0.9, 0.5 + (keyword.length * 0.03));
        if (confidence > bestMatch.confidence) {
          bestMatch = { category, confidence };
        }
      }
    }
  }
  
  return bestMatch;
};

export const isFinancialSMS = (text: string): boolean => {
  const financialIndicators = [
    /(?:Rs\.?|INR|₹|rupees?)\s*[\d,]+/i,
    /(?:credited|debited|spent|paid|received|withdrawn|refund|deducted|recharge|emi|payment|salary)/i,
    /(?:upi|imps|neft|rtgs|debit card|credit card|atm|fastag|wallet|card ending|a\/c ending)/i,
    /(?:a\/c|account|card|xx)\s*(?:no\.?)?\s*[x*]*\d{4}/i,
    /(?:bal(?:ance)?|avl\.?\s*bal|limit|available)/i,
  ];
  
  const matchCount = financialIndicators.filter(pattern => pattern.test(text)).length;
  return matchCount >= 2;
};

export const parseSMS = (rawText: string): ParsedSMS => {
  const amount = extractAmount(rawText);
  const direction = extractDirection(rawText);
  const method = extractMethod(rawText);
  const dateTime = extractDateTime(rawText) || new Date();
  const merchant = extractMerchant(rawText);
  const last4Digits = extractLast4Digits(rawText);
  const referenceId = extractReferenceId(rawText);
  const availableBalance = extractBalance(rawText);
  
  const { category, confidence: categoryConfidence } = categorizeTransaction(rawText, merchant);
  
  // Calculate overall parse confidence according to Phase 3
  let parseConfidence = 0.15; // baseline
  if (amount !== null) parseConfidence += 0.35;
  if (direction !== 'unknown') parseConfidence += 0.15;
  if (merchant) parseConfidence += 0.15;
  if (method !== 'unknown') parseConfidence += 0.10;
  if (referenceId) parseConfidence += 0.10;
  
  parseConfidence = Math.min(1.0, Math.round(parseConfidence * 100) / 100);
  
  // Rule: confidence < 0.60 -> needsReview = true, otherwise false
  const needsReview = parseConfidence < 0.60 || direction === 'unknown';

  // Perform merchant intelligence lookup
  let merchantRaw = merchant || undefined;
  let merchantCanonical = merchant || undefined;
  let merchantCategorySource: ParsedSMS['merchantCategorySource'] = 'classifier';

  if (merchant) {
    const learnedMappings = getLearnedMappings();
    const merchantLower = merchant.toLowerCase();
    let isManual = false;
    for (const [key] of Object.entries(learnedMappings)) {
      if (merchantLower.includes(key) || key.includes(merchantLower)) {
        isManual = true;
        break;
      }
    }

    const norm = normalizeMerchant(merchant);
    merchantCanonical = norm.canonicalName;

    if (isManual) {
      merchantCategorySource = 'manual';
    } else if (norm.isMatched) {
      merchantCategorySource = 'dictionary';
    }
  }
  
  return {
    amount,
    direction,
    method,
    dateTime,
    merchant,
    last4Digits,
    referenceId,
    availableBalance,
    category,
    categoryConfidence,
    parseConfidence,
    needsReview,
    rawText,
    merchantRaw,
    merchantCanonical,
    merchantCategorySource,
  };
};

// Mask sensitive data for storage
export const maskSensitiveData = (text: string): string => {
  // Mask full account numbers, keeping only last 4
  let masked = text.replace(/\b\d{10,18}\b/g, (match) => 'XXXX' + match.slice(-4));
  // Mask phone numbers
  masked = masked.replace(/\b[6-9]\d{9}\b/g, (match) => match.slice(0, 2) + 'XXXX' + match.slice(-4));
  return masked;
};
