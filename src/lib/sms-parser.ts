// Comprehensive SMS Parser for Indian Financial Messages
// Supports: UPI, Debit Card, Credit Card, Netbanking, Wallet, ATM

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
  const matches = text.match(PATTERNS.amount);
  if (matches && matches.length > 0) {
    const amountStr = matches[0].replace(/[Rs.INR₹,\s]/gi, '');
    const amount = parseFloat(amountStr);
    return isNaN(amount) ? null : amount;
  }
  
  // Try alternative pattern
  const altMatches = text.match(PATTERNS.amountAlt);
  if (altMatches && altMatches.length > 0) {
    const amountStr = altMatches[0].replace(/[^0-9.]/g, '');
    const amount = parseFloat(amountStr);
    return isNaN(amount) ? null : amount;
  }
  
  return null;
};

const extractDirection = (text: string): 'debit' | 'credit' | 'unknown' => {
  if (PATTERNS.debit.test(text)) return 'debit';
  if (PATTERNS.credit.test(text)) return 'credit';
  return 'unknown';
};

const extractMethod = (text: string): ParsedSMS['method'] => {
  if (PATTERNS.upi.test(text)) return 'upi';
  if (PATTERNS.atm.test(text)) return 'atm';
  if (PATTERNS.imps.test(text)) return 'imps';
  if (PATTERNS.neft.test(text)) return 'neft';
  if (PATTERNS.rtgs.test(text)) return 'rtgs';
  if (PATTERNS.creditCard.test(text)) return 'credit_card';
  if (PATTERNS.debitCard.test(text)) return 'debit_card';
  if (PATTERNS.wallet.test(text)) return 'wallet';
  if (PATTERNS.netbanking.test(text)) return 'netbanking';
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
  const match = text.match(PATTERNS.last4);
  return match ? match[1] : null;
};

const extractReferenceId = (text: string): string | null => {
  const match = text.match(PATTERNS.refId);
  return match ? match[1] : null;
};

const extractBalance = (text: string): number | null => {
  const match = text.match(PATTERNS.balance);
  if (match) {
    const balanceStr = match[1].replace(/,/g, '');
    const balance = parseFloat(balanceStr);
    return isNaN(balance) ? null : balance;
  }
  return null;
};

const extractMerchant = (text: string): string | null => {
  // Try to extract UPI ID first
  const upiMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z]+)/);
  if (upiMatch) {
    return upiMatch[1];
  }
  
  // Try merchant pattern
  const merchantMatch = text.match(PATTERNS.merchant);
  if (merchantMatch) {
    return merchantMatch[1].trim().slice(0, 50);
  }
  
  // Try to extract from \"VPA\" pattern
  const vpaMatch = text.match(/VPA\s+([a-zA-Z0-9._@-]+)/i);
  if (vpaMatch) {
    return vpaMatch[1];
  }
  
  return null;
};

const categorizeTransaction = (text: string, merchant: string | null): { category: string; confidence: number } => {
  const searchText = `${text} ${merchant || ''}`.toLowerCase();
  
  // Check learned mappings first (highest confidence)
  if (merchant) {
    const learnedMappings = getLearnedMappings();
    const merchantLower = merchant.toLowerCase();
    
    for (const [key, category] of Object.entries(learnedMappings)) {
      if (merchantLower.includes(key) || key.includes(merchantLower)) {
        return { category, confidence: 0.95 };
      }
    }
  }
  
  // Check keyword mappings
  let bestMatch: { category: string; confidence: number } = { category: 'General Expense', confidence: 0.3 };
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        // More specific/longer keywords get higher confidence
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
    /(?:Rs\.?|INR|₹)\s*[\d,]+/i,
    /(?:credited|debited|spent|paid|received|withdrawn)/i,
    /(?:upi|imps|neft|rtgs|debit card|credit card|atm)/i,
    /(?:a\/c|account|card).{0,10}\d{4}/i,
    /(?:bal(?:ance)?|avl\.?\s*bal)/i,
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
  
  // Calculate overall parse confidence
  let parseConfidence = 0;
  if (amount !== null) parseConfidence += 0.4;
  if (direction !== 'unknown') parseConfidence += 0.25;
  if (method !== 'unknown') parseConfidence += 0.15;
  if (merchant) parseConfidence += 0.1;
  if (referenceId) parseConfidence += 0.1;
  
  const needsReview = direction === 'unknown' || parseConfidence < 0.5 || categoryConfidence < 0.5;
  
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
