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
  confidence?: number; // AI confidence score (0-1)
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
  lastSyncDate?: Date;
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

class KhaataKitabDB extends Dexie {
  transactions!: Table<Transaction>;
  receipts!: Table<Receipt>;
  settings!: Table<Settings>;
  inventory!: Table<InventoryItem>;

  constructor() {
    super('KhaataKitabDB');
    this.version(3).stores({
      transactions: '++id, type, amount, date, source, category, verified',
      receipts: '++id, transactionId, createdAt',
      settings: '++id',
      inventory: '++id, name, category'
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
    });
  }
};
