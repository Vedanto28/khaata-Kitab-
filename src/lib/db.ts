import Dexie, { Table } from 'dexie';

export interface Transaction {
  id?: number;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  date: Date;
  source: 'sms' | 'receipt' | 'manual';
  rawData?: string;
  inventoryItemId?: number;
  quantityChange?: number;
  verified?: boolean;
  confidence?: number; // Parse confidence score (0-1)
  // SMS-specific fields
  isAutoAdded?: boolean;
  verifiedVia?: 'sms' | 'manual' | null;
  paymentMethod?: 'upi' | 'debit_card' | 'credit_card' | 'netbanking' | 'wallet' | 'atm' | 'neft' | 'rtgs' | 'imps' | 'unknown';
  last4Digits?: string;
  referenceId?: string;
  categoryConfidence?: number;
  needsReview?: boolean;
  createdAt: Date;
}

export interface Receipt {
  id?: number;
  imageUrl: string;
  extractedData: {
    amount?: number;
    vendor?: string;
    date?: string;
    items?: string[];
  };
  transactionId?: number;
  createdAt: Date;
}

export interface Settings {
  id?: number;
  smsPermissionGranted: boolean;
  cameraPermissionGranted: boolean;
  onboardingCompleted: boolean;
  smsAutomationEnabled: boolean;
  lastSyncDate?: Date;
  lastSMSSyncDate?: Date;
}

export interface InventoryItem {
  id?: number;
  name: string;
  quantity: number;
  price: number;
  unit?: string;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Learned category mappings from user corrections
export interface CategoryMapping {
  id?: number;
  merchant: string;
  category: string;
  confidence: number;
  timesUsed: number;
  lastUsed: Date;
}

class KhaataKitabDB extends Dexie {
  transactions!: Table<Transaction>;
  receipts!: Table<Receipt>;
  settings!: Table<Settings>;
  inventory!: Table<InventoryItem>;
  categoryMappings!: Table<CategoryMapping>;

  constructor() {
    super('KhaataKitabDB');
    this.version(4).stores({
      transactions: '++id, type, amount, date, source, category, verified, isAutoAdded, referenceId, needsReview',
      receipts: '++id, transactionId, createdAt',
      settings: '++id',
      inventory: '++id, name, category',
      categoryMappings: '++id, merchant, category'
    });
  }
}

export const db = new KhaataKitabDB();

// Initialize settings if not exists
export const initializeSettings = async () => {
  const count = await db.settings.count();
  if (count === 0) {
    await db.settings.add({
      smsPermissionGranted: false,
      cameraPermissionGranted: false,
      onboardingCompleted: false,
      smsAutomationEnabled: true,
    });
  }
};

// Save learned category mapping to DB
export const saveCategoryMapping = async (merchant: string, category: string) => {
  const existing = await db.categoryMappings.where('merchant').equalsIgnoreCase(merchant).first();
  
  if (existing && existing.id) {
    await db.categoryMappings.update(existing.id, {
      category,
      confidence: Math.min(existing.confidence + 0.05, 1),
      timesUsed: existing.timesUsed + 1,
      lastUsed: new Date(),
    });
  } else {
    await db.categoryMappings.add({
      merchant: merchant.toLowerCase(),
      category,
      confidence: 0.7,
      timesUsed: 1,
      lastUsed: new Date(),
    });
  }
};

// Get category suggestion from DB
export const getCategorySuggestion = async (merchant: string): Promise<{ category: string; confidence: number } | null> => {
  const mapping = await db.categoryMappings
    .where('merchant')
    .equalsIgnoreCase(merchant)
    .first();
  
  if (mapping) {
    return { category: mapping.category, confidence: mapping.confidence };
  }
  
  // Try partial match
  const allMappings = await db.categoryMappings.toArray();
  for (const m of allMappings) {
    if (merchant.toLowerCase().includes(m.merchant) || m.merchant.includes(merchant.toLowerCase())) {
      return { category: m.category, confidence: m.confidence * 0.8 };
    }
  }
  
  return null;
};
