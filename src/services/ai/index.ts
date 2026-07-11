// Barrel exports for AI services
export { streamChat } from './aiClient';
export type { ChatMsg, AIError, AICategorizeResult, AIInsightsResult, AIReceiptResult } from './aiClient';
export { predictCashflow, generateAlerts, calculateCreditSignal } from './aiInsights';
export { generateFinancialProfile, calculateFinancialHealthScore, generateSmartInsights } from './financialCopilot';
