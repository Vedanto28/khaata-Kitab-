// Barrel exports for SMS services
export { parseSMS } from './smsParser';
export type { ParsedSMS } from './smsParser';
export { processSMS, processBufferedSMS, updateCategoryLearning, checkSMSVerification, simulateSMSRead } from './smsService';
export { initSMSAutomation, learnFromCorrection, canVerifyViaSMS, getSMSAutomationStatus, toggleSMSAutomation, syncSMSNow } from './smsReader';
export { initializeSMSAutomation, requestSMSPermissions, checkSMSPermissions, readSMSMessages, registerSMSListener, isAndroid, isNative } from './androidSmsPlugin';
