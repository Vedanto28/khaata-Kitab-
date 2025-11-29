import { Transaction } from './db';

interface SMSMessage {
  address: string;
  body: string;
  date: number;
}

// Common UPI/payment keywords and patterns
const UPI_KEYWORDS = [
  'credited', 'debited', 'received', 'sent', 'paid',
  'UPI', 'IMPS', 'NEFT', 'RTGS', 'paytm', 'phonepe', 'gpay'
];

const AMOUNT_PATTERN = /(?:Rs\.?|INR|₹)\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i;
const UPI_ID_PATTERN = /[a-zA-Z0-9._-]+@[a-zA-Z]+/;

export const parseSMS = (sms: SMSMessage): Transaction | null => {
  const body = sms.body.toLowerCase();
  
  // Check if SMS is payment related
  const isPaymentSMS = UPI_KEYWORDS.some(keyword => body.includes(keyword.toLowerCase()));
  if (!isPaymentSMS) return null;

  // Extract amount
  const amountMatch = sms.body.match(AMOUNT_PATTERN);
  if (!amountMatch) return null;
  
  const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  
  // Determine transaction type
  const isCredited = body.includes('credited') || body.includes('received');
  const isDebited = body.includes('debited') || body.includes('paid') || body.includes('sent');
  
  const type: 'income' | 'expense' = isCredited ? 'income' : 'expense';
  
  // Extract UPI ID or merchant name
  const upiMatch = sms.body.match(UPI_ID_PATTERN);
  const description = upiMatch ? upiMatch[0] : sms.address;
  
  // Categorize transaction
  const category = categorizeTransaction(sms.body, type);
  
  return {
    type,
    amount,
    description,
    category,
    date: new Date(sms.date),
    source: 'sms',
    rawData: sms.body,
    createdAt: new Date(),
  };
};

const categorizeTransaction = (body: string, type: 'income' | 'expense'): string => {
  const lower = body.toLowerCase();
  
  if (type === 'income') {
    // Salary keywords
    if (lower.includes('salary') || lower.includes('wage') || lower.includes('payment received')) return 'Salary';
    // Refund keywords
    if (lower.includes('refund') || lower.includes('cashback') || lower.includes('reversal')) return 'Refund';
    // Sales/business income
    if (lower.includes('upi from') || lower.includes('received from') || lower.includes('payment from')) return 'Sales';
    return 'Income';
  } else {
    // Food & Grocery
    if (lower.includes('grocery') || lower.includes('food') || lower.includes('restaurant') || 
        lower.includes('zomato') || lower.includes('swiggy') || lower.includes('blinkit') || 
        lower.includes('zepto') || lower.includes('bigbasket')) return 'Food & Grocery';
    
    // Utilities
    if (lower.includes('electricity') || lower.includes('water') || lower.includes('gas') || 
        lower.includes('bill payment')) return 'Utilities';
    
    // Telecom/Recharge
    if (lower.includes('recharge') || lower.includes('mobile') || lower.includes('prepaid') || 
        lower.includes('airtel') || lower.includes('jio') || lower.includes('vodafone') || 
        lower.includes('paytm recharge')) return 'Telecom';
    
    // Transport
    if (lower.includes('fuel') || lower.includes('petrol') || lower.includes('diesel') || 
        lower.includes('uber') || lower.includes('ola') || lower.includes('transport')) return 'Transport';
    
    // Rent
    if (lower.includes('rent') || lower.includes('lease')) return 'Rent';
    
    // Health
    if (lower.includes('medical') || lower.includes('hospital') || lower.includes('pharmacy') || 
        lower.includes('medicine') || lower.includes('doctor')) return 'Health';
    
    // Shopping
    if (lower.includes('shopping') || lower.includes('amazon') || lower.includes('flipkart') || 
        lower.includes('myntra')) return 'Shopping';
    
    // Entertainment
    if (lower.includes('movie') || lower.includes('netflix') || lower.includes('prime') || 
        lower.includes('hotstar') || lower.includes('spotify')) return 'Entertainment';
    
    return 'Expense';
  }
};

// Mock function for SMS reading - will be replaced with actual Capacitor plugin
export const requestSMSPermission = async (): Promise<boolean> => {
  // This will use a Capacitor SMS plugin in production
  // For now, return true to simulate permission granted
  console.log('SMS permission requested');
  return true;
};

export const readRecentSMS = async (limit: number = 50): Promise<SMSMessage[]> => {
  // This will use a Capacitor SMS plugin in production
  // Mock data for development
  return [
    {
      address: 'SBIINB',
      body: 'Rs 500.00 credited to A/c XX1234 on 15-Jan-25 by UPI/merchant@paytm (UPI Ref No 501234567890)',
      date: Date.now() - 86400000
    },
    {
      address: 'HDFCBK',
      body: 'Rs 250.00 debited from A/c XX5678 on 14-Jan-25 for grocery@phonepe',
      date: Date.now() - 172800000
    }
  ];
};
