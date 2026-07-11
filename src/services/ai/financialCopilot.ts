import { Transaction } from '@/database/db';

export interface FinancialProfile {
  monthlyIncome: number;
  monthlyExpense: number;
  savingsRate: number;
  topMerchants: string[];
  topCategories: string[];
  highestExpenseCategory: string;
  recurringExpenses: string[];
  spendingTrend: 'increasing' | 'decreasing' | 'stable';
}

export interface SmartInsights {
  spendingAlerts: string[];
  savingsOpportunities: string[];
  merchantConcentration: string[];
  recurringExpensesText: string;
}

export interface HealthScoreResult {
  score: number;
  rating: 'Excellent' | 'Good' | 'Average' | 'Needs Attention';
  details: {
    savingsRateScore: number;
    incomeExpenseScore: number;
    recurringScore: number;
    diversificationScore: number;
  };
}

// 1. Context Generator
export function generateFinancialProfile(transactions: Transaction[]): FinancialProfile {
  if (!transactions || transactions.length === 0) {
    return {
      monthlyIncome: 0,
      monthlyExpense: 0,
      savingsRate: 0,
      topMerchants: [],
      topCategories: [],
      highestExpenseCategory: 'None',
      recurringExpenses: [],
      spendingTrend: 'stable'
    };
  }

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  // Filter current and previous month transactions
  const currentMonthTx = transactions.filter(t => new Date(t.date) >= currentMonthStart);
  const prevMonthTx = transactions.filter(t => {
    const d = new Date(t.date);
    return d >= prevMonthStart && d <= prevMonthEnd;
  });

  // Calculate Income / Expense
  const monthlyIncome = currentMonthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthlyExpense = currentMonthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const prevExpense = prevMonthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  // Savings rate
  const savingsRate = monthlyIncome > 0 
    ? Math.max(0, Math.round(((monthlyIncome - monthlyExpense) / monthlyIncome) * 100))
    : 0;

  // Merchant spend totals
  const merchantSpends: Record<string, number> = {};
  currentMonthTx.filter(t => t.type === 'expense').forEach(t => {
    const m = t.merchantCanonical || t.description || 'Other';
    merchantSpends[m] = (merchantSpends[m] || 0) + t.amount;
  });

  const topMerchants = Object.entries(merchantSpends)
    .sort((a, b) => b[1] - a[1])
    .map(e => e[0])
    .slice(0, 3);

  // Category spend totals
  const categorySpends: Record<string, number> = {};
  currentMonthTx.filter(t => t.type === 'expense').forEach(t => {
    categorySpends[t.category] = (categorySpends[t.category] || 0) + t.amount;
  });

  const sortedCategories = Object.entries(categorySpends)
    .sort((a, b) => b[1] - a[1]);

  const topCategories = sortedCategories.map(e => e[0]).slice(0, 3);
  const highestExpenseCategory = sortedCategories.length > 0 ? sortedCategories[0][0] : 'None';

  // Recurring Expenses detection
  const recurringNames = new Set<string>();
  const recurringKeywords = ['netflix', 'spotify', 'youtube', 'airtel', 'jio', 'vi', 'bsnl', 'lic', 'rent', 'pg', 'electricity', 'broadband', 'prime', 'hotstar', 'insurance', 'emi'];
  
  // Look at last 60 days
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const recentTx = transactions.filter(t => new Date(t.date) >= sixtyDaysAgo);

  recentTx.forEach(t => {
    const desc = (t.merchantCanonical || t.description || '').toLowerCase();
    const isRecurringCategory = ['Entertainment & Subscriptions', 'Bills & Utilities', 'Telecom Recharge', 'Housing', 'Loan & EMI', 'Insurance'].includes(t.category);
    
    const matchedKeyword = recurringKeywords.find(k => desc.includes(k));
    if (matchedKeyword || isRecurringCategory) {
      const canonical = t.merchantCanonical || t.description;
      if (canonical && canonical.toLowerCase() !== 'sms transaction' && canonical.toLowerCase() !== 'other') {
        recurringNames.add(canonical);
      }
    }
  });
  
  const recurringExpenses = Array.from(recurringNames).slice(0, 6);

  // Spending Trend
  let spendingTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (prevExpense > 0) {
    const diffPercent = ((monthlyExpense - prevExpense) / prevExpense) * 100;
    if (diffPercent >= 5) spendingTrend = 'increasing';
    else if (diffPercent <= -5) spendingTrend = 'decreasing';
  }

  return {
    monthlyIncome,
    monthlyExpense,
    savingsRate,
    topMerchants,
    topCategories,
    highestExpenseCategory,
    recurringExpenses,
    spendingTrend
  };
}

// 2. Health Score Calculator
export function calculateFinancialHealthScore(transactions: Transaction[]): HealthScoreResult {
  if (!transactions || transactions.length === 0) {
    return {
      score: 50,
      rating: 'Average',
      details: {
        savingsRateScore: 0,
        incomeExpenseScore: 15,
        recurringScore: 15,
        diversificationScore: 15
      }
    };
  }

  const profile = generateFinancialProfile(transactions);
  const { monthlyIncome, monthlyExpense, savingsRate } = profile;

  // 1. Savings Rate Score (Max 40)
  // 30%+ savings rate gets full points, scaled down below that
  const savingsRateScore = Math.min(40, Math.round((savingsRate / 30) * 40));

  // 2. Income vs Expense Ratio Score (Max 30)
  let incomeExpenseScore = 0;
  if (monthlyIncome > 0) {
    const expenseRatio = monthlyExpense / monthlyIncome;
    if (expenseRatio <= 0.5) incomeExpenseScore = 30;
    else if (expenseRatio <= 0.8) incomeExpenseScore = 20;
    else if (expenseRatio <= 1.0) incomeExpenseScore = 10;
    else incomeExpenseScore = 0;
  } else if (monthlyExpense === 0) {
    incomeExpenseScore = 15; // No data, neutral score
  }

  // 3. Recurring Commitments Score (Max 15)
  // Low fixed/recurring expenses relative to income is healthy
  let recurringScore = 15;
  if (monthlyIncome > 0) {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthTx = transactions.filter(t => new Date(t.date) >= currentMonthStart);
    
    let recurringSum = 0;
    currentMonthTx.forEach(t => {
      const isRecurring = ['Entertainment & Subscriptions', 'Bills & Utilities', 'Telecom Recharge', 'Housing', 'Loan & EMI', 'Insurance'].includes(t.category);
      if (isRecurring && t.type === 'expense') {
        recurringSum += t.amount;
      }
    });

    const recurringRatio = recurringSum / monthlyIncome;
    if (recurringRatio <= 0.15) recurringScore = 15;
    else if (recurringRatio <= 0.35) recurringScore = 10;
    else if (recurringRatio <= 0.50) recurringScore = 5;
    else recurringScore = 0;
  }

  // 4. Category Diversification Score (Max 15)
  // Avoid concentrating all expenses into one single category
  let diversificationScore = 15;
  if (monthlyExpense > 0) {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthTx = transactions.filter(t => new Date(t.date) >= currentMonthStart && t.type === 'expense');

    const categorySpends: Record<string, number> = {};
    currentMonthTx.forEach(t => {
      categorySpends[t.category] = (categorySpends[t.category] || 0) + t.amount;
    });

    const maxCategorySpend = Math.max(...Object.values(categorySpends));
    const maxCategoryRatio = maxCategorySpend / monthlyExpense;

    if (maxCategoryRatio <= 0.40) diversificationScore = 15;
    else if (maxCategoryRatio <= 0.60) diversificationScore = 10;
    else if (maxCategoryRatio <= 0.80) diversificationScore = 5;
    else diversificationScore = 2;
  }

  const score = Math.max(0, Math.min(100, savingsRateScore + incomeExpenseScore + recurringScore + diversificationScore));

  let rating: HealthScoreResult['rating'] = 'Average';
  if (score >= 80) rating = 'Excellent';
  else if (score >= 60) rating = 'Good';
  else if (score >= 40) rating = 'Average';
  else rating = 'Needs Attention';

  return {
    score,
    rating,
    details: {
      savingsRateScore,
      incomeExpenseScore,
      recurringScore,
      diversificationScore
    }
  };
}

// 3. Smart Insights Generator
export function generateSmartInsights(transactions: Transaction[]): SmartInsights {
  if (!transactions || transactions.length === 0) {
    return {
      spendingAlerts: ["Add transactions to view personalized spending alerts."],
      savingsOpportunities: ["Import your expenses to analyze savings opportunities."],
      merchantConcentration: ["Add transactions to check merchant spending concentration."],
      recurringExpensesText: "No recurring subscriptions or bill payments detected."
    };
  }

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const currentTx = transactions.filter(t => new Date(t.date) >= currentMonthStart);
  const prevTx = transactions.filter(t => {
    const d = new Date(t.date);
    return d >= prevMonthStart && d <= prevMonthEnd;
  });

  const spendingAlerts: string[] = [];
  const savingsOpportunities: string[] = [];
  const merchantConcentration: string[] = [];

  // --- 1. Spending Alerts (Category spending increases) ---
  const currCatSpends: Record<string, number> = {};
  currentTx.filter(t => t.type === 'expense').forEach(t => {
    currCatSpends[t.category] = (currCatSpends[t.category] || 0) + t.amount;
  });

  const prevCatSpends: Record<string, number> = {};
  prevTx.filter(t => t.type === 'expense').forEach(t => {
    prevCatSpends[t.category] = (prevCatSpends[t.category] || 0) + t.amount;
  });

  Object.entries(currCatSpends).forEach(([cat, amt]) => {
    const prevAmt = prevCatSpends[cat] || 0;
    if (prevAmt > 500) { // Only check if previous spend is significant
      const increasePct = Math.round(((amt - prevAmt) / prevAmt) * 100);
      if (increasePct >= 10) {
        spendingAlerts.push(`${cat} spending increased ${increasePct}% this month.`);
      }
    }
  });

  if (spendingAlerts.length === 0) {
    spendingAlerts.push("Your category spending is well-controlled compared to last month.");
  }

  // --- 2. Savings Opportunities ---
  // Look for high Food & Dining spend or Shopping spend
  const swiggyZomatoSpend = currentTx
    .filter(t => t.type === 'expense' && ['swiggy', 'zomato'].includes((t.merchantCanonical || '').toLowerCase()))
    .reduce((s, t) => s + t.amount, 0);

  if (swiggyZomatoSpend > 1000) {
    const possibleSavings = Math.round(swiggyZomatoSpend * 0.20);
    savingsOpportunities.push(`Reducing Swiggy/Zomato orders by 20% could save ₹${possibleSavings}/month.`);
  }

  const shoppingSpend = currCatSpends['Shopping & Retail'] || 0;
  if (shoppingSpend > 3000) {
    const possibleSavings = Math.round(shoppingSpend * 0.15);
    savingsOpportunities.push(`Cutting back on shopping list purchases by 15% could save ₹${possibleSavings}/month.`);
  }

  if (savingsOpportunities.length === 0) {
    savingsOpportunities.push("Save money by setting a budget for your highest spending categories.");
  }

  // --- 3. Merchant Concentration ---
  const catMerchantSpends: Record<string, Record<string, number>> = {};
  currentTx.filter(t => t.type === 'expense').forEach(t => {
    if (!catMerchantSpends[t.category]) {
      catMerchantSpends[t.category] = {};
    }
    const m = t.merchantCanonical || t.description || 'Other';
    catMerchantSpends[t.category][m] = (catMerchantSpends[t.category][m] || 0) + t.amount;
  });

  Object.entries(catMerchantSpends).forEach(([cat, merchants]) => {
    const totalCatSpend = currCatSpends[cat] || 0;
    if (totalCatSpend > 500) {
      Object.entries(merchants).forEach(([m, amt]) => {
        const pct = Math.round((amt / totalCatSpend) * 100);
        if (pct >= 50 && m !== 'Other' && m !== 'Unknown' && m !== 'SMS Transaction') {
          merchantConcentration.push(`${pct}% of your ${cat.toLowerCase()} spending comes from ${m}.`);
        }
      });
    }
  });

  if (merchantConcentration.length === 0) {
    merchantConcentration.push("Your expenses are diversified nicely across merchants.");
  }

  // --- 4. Recurring Expenses Text ---
  const profile = generateFinancialProfile(transactions);
  let recurringExpensesText = "No recurring subscriptions or bill payments detected.";
  if (profile.recurringExpenses.length > 0) {
    const list = profile.recurringExpenses.slice(0, 3).join(", ");
    const remaining = profile.recurringExpenses.length > 3 ? ` and ${profile.recurringExpenses.length - 3} others` : "";
    recurringExpensesText = `${list}${remaining} are recurring monthly expenses.`;
  }

  return {
    spendingAlerts,
    savingsOpportunities,
    merchantConcentration,
    recurringExpensesText
  };
}
