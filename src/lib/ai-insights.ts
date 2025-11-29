import { Transaction } from './db';

export interface CashflowPrediction {
  nextWeekIncome: number;
  nextWeekExpense: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  confidence: number;
}

export interface FinancialAlert {
  type: 'low_balance' | 'high_spending' | 'unusual_transaction' | 'positive_trend';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  recommendation: string;
}

export interface CreditSignal {
  score: number; // 0-100
  category: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  factors: {
    regularIncome: number;
    expenseControl: number;
    consistency: number;
  };
  explanation: string;
}

export const predictCashflow = (transactions: Transaction[]): CashflowPrediction => {
  const recentTransactions = transactions
    .filter(t => {
      const daysDiff = Math.floor((Date.now() - t.date.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff <= 30;
    });

  const weeklyIncome = recentTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0) / 4;

  const weeklyExpense = recentTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0) / 4;

  // Simple trend calculation
  const lastWeekBalance = calculateWeeklyBalance(transactions, 1);
  const prevWeekBalance = calculateWeeklyBalance(transactions, 2);
  
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (lastWeekBalance > prevWeekBalance * 1.1) trend = 'increasing';
  else if (lastWeekBalance < prevWeekBalance * 0.9) trend = 'decreasing';

  return {
    nextWeekIncome: weeklyIncome,
    nextWeekExpense: weeklyExpense,
    trend,
    confidence: 0.75
  };
};

export const generateAlerts = (transactions: Transaction[]): FinancialAlert[] => {
  const alerts: FinancialAlert[] = [];
  const prediction = predictCashflow(transactions);

  // Low balance alert
  if (prediction.nextWeekExpense > prediction.nextWeekIncome * 1.5) {
    alerts.push({
      type: 'high_spending',
      severity: 'warning',
      message: 'Your expenses are higher than usual this week',
      recommendation: 'Consider reviewing non-essential expenses'
    });
  }

  // Positive trend
  if (prediction.trend === 'increasing') {
    alerts.push({
      type: 'positive_trend',
      severity: 'info',
      message: 'Your financial health is improving!',
      recommendation: 'Keep up the good work with expense management'
    });
  }

  return alerts;
};

export const calculateCreditSignal = (transactions: Transaction[]): CreditSignal => {
  const recentTransactions = transactions
    .filter(t => {
      const daysDiff = Math.floor((Date.now() - t.date.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff <= 90;
    });

  // Factor 1: Regular Income (40%)
  const incomeTransactions = recentTransactions.filter(t => t.type === 'income');
  const regularIncomeScore = Math.min(incomeTransactions.length / 12, 1) * 40;

  // Factor 2: Expense Control (40%)
  const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = recentTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const expenseRatio = totalExpense / (totalIncome || 1);
  const expenseControlScore = Math.max(0, (1 - expenseRatio) * 40);

  // Factor 3: Consistency (20%)
  const consistencyScore = recentTransactions.length >= 30 ? 20 : (recentTransactions.length / 30) * 20;

  const totalScore = Math.min(100, Math.round(regularIncomeScore + expenseControlScore + consistencyScore));

  let category: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  if (totalScore >= 80) category = 'Excellent';
  else if (totalScore >= 60) category = 'Good';
  else if (totalScore >= 40) category = 'Fair';
  else category = 'Poor';

  return {
    score: totalScore,
    category,
    factors: {
      regularIncome: Math.round(regularIncomeScore),
      expenseControl: Math.round(expenseControlScore),
      consistency: Math.round(consistencyScore)
    },
    explanation: generateExplanation(totalScore, category)
  };
};

const calculateWeeklyBalance = (transactions: Transaction[], weeksAgo: number): number => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (weeksAgo * 7));
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - ((weeksAgo - 1) * 7));

  return transactions
    .filter(t => t.date >= startDate && t.date < endDate)
    .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
};

const generateExplanation = (score: number, category: string): string => {
  if (category === 'Excellent') {
    return 'Strong financial health with regular income and controlled expenses. Excellent creditworthiness.';
  } else if (category === 'Good') {
    return 'Good financial management with steady income. Minor improvements possible in expense control.';
  } else if (category === 'Fair') {
    return 'Moderate financial stability. Focus on increasing regular income and reducing unnecessary expenses.';
  } else {
    return 'Financial health needs attention. Build regular income patterns and control expenses for better credit.';
  }
};
