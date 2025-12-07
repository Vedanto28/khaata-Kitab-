// SMS Reader - Main interface for SMS automation in KhaataKitab
// Re-exports from modular SMS components for backward compatibility

import { Transaction, db, saveCategoryMapping } from './db';
import { 
  parseSMS as parseFinancialSMS, 
  isFinancialSMS, 
  ParsedSMS,
  maskSensitiveData,
  saveLearnedMapping,
  getLearnedMappings 
} from './sms-parser';
import { 
  processSMS, 
  processBufferedSMS, 
  updateCategoryLearning,
  checkSMSVerification,
  simulateSMSRead 
} from './sms-service';
import { 
  initializeSMSAutomation, 
  requestSMSPermissions as requestAndroidSMSPermissions,
  checkSMSPermissions,
  readSMSMessages,
  registerSMSListener,
  isAndroid,
  isNative
} from './android-sms-plugin';

// Re-export types
export type { ParsedSMS };

// Legacy interface for backward compatibility
interface SMSMessage {
  address: string;
  body: string;
  date: number;
}

// Legacy parse function - now uses new comprehensive parser
export const parseSMS = (sms: SMSMessage): Transaction | null => {
  if (!isFinancialSMS(sms.body)) return null;
  
  const parsed = parseFinancialSMS(sms.body);
  
  if (parsed.amount === null) return null;
  
  return {
    type: parsed.direction === 'credit' ? 'income' : 'expense',
    amount: parsed.amount,
    description: parsed.merchant || `${parsed.method.toUpperCase()} Transaction`,
    category: parsed.category,
    date: parsed.dateTime || new Date(sms.date),
    source: 'sms',
    rawData: maskSensitiveData(sms.body),
    verified: !parsed.needsReview,
    verifiedVia: 'sms',
    isAutoAdded: true,
    confidence: parsed.parseConfidence,
    categoryConfidence: parsed.categoryConfidence,
    needsReview: parsed.needsReview,
    paymentMethod: parsed.method,
    last4Digits: parsed.last4Digits || undefined,
    referenceId: parsed.referenceId || undefined,
    createdAt: new Date(),
  };
};

// Legacy permission request - uses new Android-specific implementation
export const requestSMSPermission = async (): Promise<boolean> => {
  const permissions = await requestAndroidSMSPermissions();
  return permissions.readSMS;
};

// Legacy SMS read - uses new implementation
export const readRecentSMS = async (limit: number = 50): Promise<SMSMessage[]> => {
  const messages = await simulateSMSRead();
  return messages.slice(0, limit).map(m => ({
    address: m.address,
    body: m.body,
    date: m.date,
  }));
};

// Initialize SMS automation on app startup
export const initSMSAutomation = async (): Promise<void> => {
  await initializeSMSAutomation();
  
  // Process any buffered SMS from when app was closed
  const processedCount = await processBufferedSMS();
  if (processedCount > 0) {
    console.log(`Processed ${processedCount} buffered SMS messages`);
  }
};

// When user corrects a category, update learning
export const learnFromCorrection = async (transaction: Transaction, newCategory: string): Promise<void> => {
  if (transaction.description) {
    // Update in-memory learning
    updateCategoryLearning(transaction.description, newCategory);
    saveLearnedMapping(transaction.description, newCategory);
    
    // Persist to database
    await saveCategoryMapping(transaction.description, newCategory);
    
    // Update the transaction's category in DB
    if (transaction.id) {
      await db.transactions.update(transaction.id, { 
        category: newCategory,
        categoryConfidence: 0.95, // User-confirmed category
      });
    }
  }
};

// Check if transaction can be verified via SMS
export const canVerifyViaSMS = async (transaction: Transaction): Promise<boolean> => {
  return checkSMSVerification(transaction);
};

// Get SMS automation status
export const getSMSAutomationStatus = async (): Promise<{
  enabled: boolean;
  hasPermission: boolean;
  isAndroid: boolean;
  lastSync: Date | null;
}> => {
  const settings = await db.settings.toCollection().first();
  const permissions = await checkSMSPermissions();
  
  return {
    enabled: settings?.smsAutomationEnabled ?? false,
    hasPermission: permissions.readSMS,
    isAndroid: isAndroid(),
    lastSync: settings?.lastSMSSyncDate ?? null,
  };
};

// Toggle SMS automation
export const toggleSMSAutomation = async (enabled: boolean): Promise<void> => {
  const settings = await db.settings.toCollection().first();
  if (settings?.id) {
    await db.settings.update(settings.id, { smsAutomationEnabled: enabled });
  }
  
  if (enabled) {
    await initializeSMSAutomation();
  }
};

// Manual trigger for SMS sync
export const syncSMSNow = async (): Promise<number> => {
  await readSMSMessages(100, 7);
  
  const settings = await db.settings.toCollection().first();
  if (settings?.id) {
    await db.settings.update(settings.id, { lastSMSSyncDate: new Date() });
  }
  
  return 0; // Will return actual count when native plugin is integrated
};

// Re-export for use in components
export { 
  isAndroid, 
  isNative, 
  checkSMSPermissions, 
  registerSMSListener,
  getLearnedMappings,
  isFinancialSMS
};
