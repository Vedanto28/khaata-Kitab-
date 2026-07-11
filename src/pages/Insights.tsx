import { motion, AnimatePresence } from 'framer-motion';
import { SEO } from '@/components/common/SEO';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/database/db';
import { BottomNav } from '@/components/common/BottomNav';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2, DollarSign, Wallet, FileText, MessageSquare, CheckSquare, Shield, Layers, HelpCircle, BarChart2, PieChart as PieIcon, LineChart as LineIcon } from 'lucide-react';
import { predictCashflow, generateAlerts, calculateCreditSignal } from '@/services/ai/aiInsights';
import { Badge } from '@/components/ui/badge';
import { OfflineSyncIndicator } from '@/components/common/OfflineSyncIndicator';
import { DashboardSummaryCards } from '@/components/dashboard/DashboardSummaryCards';
import { AIMonthlySummary } from '@/components/ai/AIMonthlySummary';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';

export default function Insights() {
  const transactions = useLiveQuery(
    () => db.transactions.toArray(),
    []
  );

  if (!transactions || transactions.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">AI Insights</h1>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center py-12"
          >
            <Card className="p-8 text-center max-w-md bg-gradient-to-br from-card to-card/50 backdrop-blur">
              <div className="mb-4 flex justify-center">
                <div className="p-4 rounded-full bg-primary/10">
                  <AlertCircle className="w-12 h-12 text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">No insights yet</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Add some transactions to see AI-powered insights about your finances.
              </p>
            </Card>
          </motion.div>
        </div>
        <BottomNav />
      </div>
    );
  }

  const cashflow = predictCashflow(transactions);
  const alerts = generateAlerts(transactions);
  const creditSignal = calculateCreditSignal(transactions);

  // 1. Total Income & Total Expenses
  let totalIncome = 0;
  let totalExpenses = 0;
  
  // 7 & 8 & 9. Counts
  let receiptCount = 0;
  let smsCount = 0;
  let needsReviewCount = 0;
  
  // 10. AI Confidence
  let aiConfidenceSum = 0;
  let aiConfidenceCount = 0;
  
  // Category maps
  const categoryCounts: Record<string, number> = {};
  const categoryExpenses: Record<string, number> = {};
  
  // Merchant maps
  const merchantExpenses: Record<string, number> = {};

  transactions.forEach(t => {
    const amt = Number(t.amount) || 0;
    if (t.type === 'income') {
      totalIncome += amt;
    } else if (t.type === 'expense') {
      totalExpenses += amt;
      categoryExpenses[t.category] = (categoryExpenses[t.category] || 0) + amt;
    }
    
    if (t.source === 'receipt') {
      receiptCount++;
      if (t.confidence !== undefined && t.confidence !== null) {
        aiConfidenceSum += t.confidence;
        aiConfidenceCount++;
      }
    } else if (t.source === 'sms') {
      smsCount++;
      if (t.confidence !== undefined && t.confidence !== null) {
        aiConfidenceSum += t.confidence;
        aiConfidenceCount++;
      }
    }
    
    if (t.needsReview) {
      needsReviewCount++;
    }
    
    categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
    
    // Merchant expenses
    if (t.type === 'expense') {
      const merchantName = t.merchantCanonical || t.description || 'Other';
      merchantExpenses[merchantName] = (merchantExpenses[merchantName] || 0) + amt;
    }
  });
  
  // Net cash flow
  const netCashFlow = totalIncome - totalExpenses;
  
  // Average AI Confidence
  const averageAIConfidence = aiConfidenceCount > 0 ? (aiConfidenceSum / aiConfidenceCount) : 0.85;
  
  // Most Frequent Category
  let mostFrequentCategory = 'N/A';
  let maxFreq = 0;
  Object.entries(categoryCounts).forEach(([cat, freq]) => {
    if (freq > maxFreq) {
      maxFreq = freq;
      mostFrequentCategory = cat;
    }
  });
  
  // Highest Expense Category
  let highestExpenseCategory = 'N/A';
  let maxExpense = 0;
  Object.entries(categoryExpenses).forEach(([cat, amt]) => {
    if (amt > maxExpense) {
      maxExpense = amt;
      highestExpenseCategory = cat;
    }
  });

  // Group transactions by month for trend
  const monthlyDataMap: Record<string, { month: string; income: number; expense: number }> = {};
  
  transactions.forEach(t => {
    const d = new Date(t.date);
    const monthKey = d.toLocaleString('en-US', { month: 'short', year: 'numeric' }); // e.g. "Jun 2026"
    if (!monthlyDataMap[monthKey]) {
      monthlyDataMap[monthKey] = { month: monthKey, income: 0, expense: 0 };
    }
    const amt = Number(t.amount) || 0;
    if (t.type === 'income') {
      monthlyDataMap[monthKey].income += amt;
    } else {
      monthlyDataMap[monthKey].expense += amt;
    }
  });
  
  // Sort the months chronologically
  const monthlySpendingTrend = Object.values(monthlyDataMap).sort((a, b) => {
    return new Date(a.month).getTime() - new Date(b.month).getTime();
  });

  // Monthly trend description direction
  let trendDirection = 'Stable';
  if (monthlySpendingTrend.length >= 2) {
    const lastMonthExpense = monthlySpendingTrend[monthlySpendingTrend.length - 1].expense;
    const prevMonthExpense = monthlySpendingTrend[monthlySpendingTrend.length - 2].expense;
    if (lastMonthExpense > prevMonthExpense * 1.05) {
      trendDirection = 'Increasing 📈';
    } else if (lastMonthExpense < prevMonthExpense * 0.95) {
      trendDirection = 'Decreasing 📉';
    } else {
      trendDirection = 'Stable ➡️';
    }
  }

  // Pie chart expects array of { name: string, value: number }
  const categoryBreakdown = Object.entries(categoryExpenses).map(([name, value]) => ({
    name,
    value
  }));

  // Bar chart of top merchants by expense
  const topMerchantsData = Object.entries(merchantExpenses)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4'];

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'from-success/20 to-success/10 border-success/30';
    if (score >= 60) return 'from-accent/20 to-accent/10 border-accent/30';
    return 'from-destructive/20 to-destructive/10 border-destructive/30';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-success';
    if (score >= 60) return 'bg-accent';
    return 'bg-destructive';
  };

  return (
    <>
      <SEO title="Insights | KhaataKitab" description="AI-powered monthly summary, spending charts, and savings goal tracking for your business." path="/insights" />
      <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <motion.div
        className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-6 rounded-b-3xl shadow-lg mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">AI Insights</h1>
          <OfflineSyncIndicator />
        </div>
        <p className="text-sm opacity-90">Smart analysis of your finances</p>
      </motion.div>

      {/* Dashboard Summary Cards */}
      <DashboardSummaryCards transactions={transactions} />

      {/* AI Monthly Summary */}
      <div className="px-4 mb-4">
        <AIMonthlySummary transactions={transactions} />
      </div>

      {/* Microloan Eligibility Bar */}
      <motion.div
        className="px-4 mb-4"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        data-tour="credit-signal"
      >
        <Card
          className={`p-5 border-2 bg-gradient-to-r ${getScoreColor(creditSignal.score)} backdrop-blur-xl`}
          style={{ boxShadow: 'var(--neumorphic-shadow)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-foreground">Microloan Eligibility</h2>
              <p className="text-sm text-muted-foreground">Credit Signal: {creditSignal.category}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-foreground">{creditSignal.score}%</div>
            </div>
          </div>
          <div className="relative">
            <div className="h-3 w-full bg-muted/30 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${getProgressColor(creditSignal.score)}`}
                style={{ width: `${creditSignal.score}%` }}
              />
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div
        className="px-4 space-y-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
      >
        {/* Financial Intelligence Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.3 }}
          className="mb-4"
        >
          <Card className="p-6 bg-gradient-to-br from-card to-card/50 backdrop-blur-xl" style={{ boxShadow: 'var(--neumorphic-shadow)' }}>
            <div className="flex items-center gap-3 mb-6">
              <BarChart2 className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Financial Intelligence Dashboard</h2>
            </div>

            {/* KPI Grid - 12 items */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
              {/* 1. Total Income */}
              <div className="p-4 rounded-xl border bg-success/5 border-success/15 hover:scale-[1.02] transition-transform duration-200">
                <div className="flex items-center gap-2 text-success mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Total Income</span>
                </div>
                <p className="text-lg font-bold text-success">₹{totalIncome.toLocaleString('en-IN')}</p>
              </div>

              {/* 2. Total Expenses */}
              <div className="p-4 rounded-xl border bg-destructive/5 border-destructive/15 hover:scale-[1.02] transition-transform duration-200">
                <div className="flex items-center gap-2 text-destructive mb-1">
                  <TrendingDown className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Total Expenses</span>
                </div>
                <p className="text-lg font-bold text-destructive">₹{totalExpenses.toLocaleString('en-IN')}</p>
              </div>

              {/* 3. Net Cash Flow */}
              <div className={`p-4 rounded-xl border hover:scale-[1.02] transition-transform duration-200 ${netCashFlow >= 0 ? 'bg-success/5 border-success/15 text-success' : 'bg-destructive/5 border-destructive/15 text-destructive'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Net Cash Flow</span>
                </div>
                <p className="text-lg font-bold">₹{netCashFlow.toLocaleString('en-IN')}</p>
              </div>

              {/* 4. Monthly Spending Trend */}
              <div className="p-4 rounded-xl border bg-accent/5 border-accent/15 hover:scale-[1.02] transition-transform duration-200">
                <div className="flex items-center gap-2 text-accent mb-1">
                  <LineIcon className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Spending Trend</span>
                </div>
                <p className="text-sm font-bold truncate">{trendDirection}</p>
              </div>

              {/* 5. Category Breakdown Summary */}
              <div className="p-4 rounded-xl border bg-primary/5 border-primary/15 hover:scale-[1.02] transition-transform duration-200">
                <div className="flex items-center gap-2 text-primary mb-1">
                  <Layers className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Categories</span>
                </div>
                <p className="text-lg font-bold">{categoryBreakdown.length} Active</p>
              </div>

              {/* 6. Top Merchants Summary */}
              <div className="p-4 rounded-xl border bg-primary/5 border-primary/15 hover:scale-[1.02] transition-transform duration-200">
                <div className="flex items-center gap-2 text-primary mb-1">
                  <Shield className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Top Merchants</span>
                </div>
                <p className="text-lg font-bold">{Object.keys(merchantExpenses).length} Tracked</p>
              </div>

              {/* 7. Receipt Transactions Count */}
              <div className="p-4 rounded-xl border bg-muted/50 border-muted-foreground/15 hover:scale-[1.02] transition-transform duration-200">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Receipt Txns</span>
                </div>
                <p className="text-lg font-bold">{receiptCount} saved</p>
              </div>

              {/* 8. SMS Transactions Count */}
              <div className="p-4 rounded-xl border bg-muted/50 border-muted-foreground/15 hover:scale-[1.02] transition-transform duration-200">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">SMS Txns</span>
                </div>
                <p className="text-lg font-bold">{smsCount} saved</p>
              </div>

              {/* 9. Needs Review Transactions */}
              <div className={`p-4 rounded-xl border hover:scale-[1.02] transition-transform duration-200 ${needsReviewCount > 0 ? 'bg-destructive/10 border-destructive/25 text-destructive animate-pulse' : 'bg-muted/50 border-muted-foreground/15 text-muted-foreground'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <CheckSquare className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Needs Review</span>
                </div>
                <p className="text-lg font-bold">{needsReviewCount} pending</p>
              </div>

              {/* 10. Average AI Confidence */}
              <div className="p-4 rounded-xl border bg-primary/5 border-primary/15 hover:scale-[1.02] transition-transform duration-200">
                <div className="flex items-center gap-2 text-primary mb-1">
                  <HelpCircle className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Avg AI Conf</span>
                </div>
                <p className="text-lg font-bold">{Math.round(averageAIConfidence * 100)}%</p>
              </div>

              {/* 11. Most Frequent Category */}
              <div className="p-4 rounded-xl border bg-accent/5 border-accent/15 hover:scale-[1.02] transition-transform duration-200 col-span-1">
                <div className="flex items-center gap-2 text-accent mb-1">
                  <Layers className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Most Frequent</span>
                </div>
                <p className="text-xs font-bold truncate" title={mostFrequentCategory}>{mostFrequentCategory}</p>
              </div>

              {/* 12. Highest Expense Category */}
              <div className="p-4 rounded-xl border bg-destructive/5 border-destructive/15 hover:scale-[1.02] transition-transform duration-200 col-span-1">
                <div className="flex items-center gap-2 text-destructive mb-1">
                  <TrendingDown className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Highest Expense</span>
                </div>
                <p className="text-xs font-bold truncate" title={highestExpenseCategory}>{highestExpenseCategory}</p>
              </div>
            </div>

            {/* Charts Section */}
            <div className="space-y-6 pt-6 border-t border-muted/50">
              
              {/* Monthly Trend Area Chart */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  <LineIcon className="w-4 h-4 text-primary" />
                  <span>Monthly Spending Trend</span>
                </div>
                <div className="p-4 rounded-xl border bg-muted/20">
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={monthlySpendingTrend}>
                      <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" stroke="currentColor" className="text-[10px] opacity-60" />
                      <YAxis stroke="currentColor" className="text-[10px] opacity-60" tickFormatter={(v) => `₹${v}`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }} 
                        formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`]} 
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      <Area type="monotone" dataKey="income" name="Income" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                      <Area type="monotone" dataKey="expense" name="Expense" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Category Pie Chart */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    <PieIcon className="w-4 h-4 text-primary" />
                    <span>Expense Category Breakdown</span>
                  </div>
                  <div className="p-4 rounded-xl border bg-muted/20 flex flex-col items-center">
                    {categoryBreakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={categoryBreakdown}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {categoryBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }} 
                            formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`]} 
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground">No expense data available</div>
                    )}
                    
                    {/* Legend grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs w-full">
                      {categoryBreakdown.map((entry, index) => (
                        <div key={entry.name} className="flex items-center gap-1.5 truncate">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="truncate text-muted-foreground">{entry.name}</span>
                          <span className="font-semibold ml-auto">₹{entry.value.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Top Merchants Bar Chart */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    <BarChart2 className="w-4 h-4 text-primary" />
                    <span>Top 5 Merchants</span>
                  </div>
                  <div className="p-4 rounded-xl border bg-muted/20">
                    {topMerchantsData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={230}>
                        <BarChart data={topMerchantsData} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                          <XAxis type="number" stroke="currentColor" className="text-[10px] opacity-60" tickFormatter={(v) => `₹${v}`} />
                          <YAxis dataKey="name" type="category" stroke="currentColor" className="text-[10px] opacity-60" width={80} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }} 
                            formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`]} 
                          />
                          <Bar dataKey="value" name="Amount" fill="#3B82F6" radius={[0, 4, 4, 0]}>
                            {topMerchantsData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[230px] flex items-center justify-center text-xs text-muted-foreground">No merchant data available</div>
                    )}
                  </div>
                </div>

              </div>

            </div>

          </Card>
        </motion.div>

        {/* Credit Signal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          whileHover={{ scale: 1.01 }}
        >
          <Card
            className="p-6 bg-gradient-to-br from-card to-card/50 backdrop-blur-xl"
            style={{ boxShadow: 'var(--neumorphic-shadow)' }}
          >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Credit Signal</h3>
              <p className="text-sm text-muted-foreground">Financial health score</p>
            </div>
            <Badge 
              variant={
                creditSignal.category === 'Excellent' ? 'default' :
                creditSignal.category === 'Good' ? 'secondary' :
                'outline'
              }
              className="text-sm"
            >
              {creditSignal.category}
            </Badge>
          </div>
          
          <div className="relative pt-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl font-bold text-primary">{creditSignal.score}</span>
              <span className="text-sm text-muted-foreground">/100</span>
            </div>
            <Progress value={creditSignal.score} className="h-3" />
          </div>

          <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
            {creditSignal.explanation}
          </p>

          <div className="mt-4 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Regular Income</span>
              <span className="font-medium">{creditSignal.factors.regularIncome}/40</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Expense Control</span>
              <span className="font-medium">{creditSignal.factors.expenseControl}/40</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Consistency</span>
              <span className="font-medium">{creditSignal.factors.consistency}/20</span>
            </div>
          </div>
          </Card>
        </motion.div>

        {/* Cashflow Prediction */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.3 }}
          whileHover={{ scale: 1.01 }}
        >
          <Card className="p-6 backdrop-blur-xl" style={{ boxShadow: 'var(--neumorphic-shadow)' }}>
          <h3 className="text-lg font-semibold mb-4">Next Week Prediction</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-success" />
                <span className="text-sm font-medium">Expected Income</span>
              </div>
              <span className="text-lg font-bold text-success">
                ₹{cashflow.nextWeekIncome.toLocaleString('en-IN')}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-destructive" />
                <span className="text-sm font-medium">Expected Expense</span>
              </div>
              <span className="text-lg font-bold text-destructive">
                ₹{cashflow.nextWeekExpense.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Net Cashflow</span>
                <span className={`text-lg font-bold ${
                  cashflow.nextWeekIncome - cashflow.nextWeekExpense > 0
                    ? 'text-success'
                    : 'text-destructive'
                }`}>
                  ₹{(cashflow.nextWeekIncome - cashflow.nextWeekExpense).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {cashflow.trend === 'increasing' ? '📈' : cashflow.trend === 'decreasing' ? '📉' : '➡️'}
                  {' '}{cashflow.trend}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {(cashflow.confidence * 100).toFixed(0)}% confidence
                </span>
              </div>
            </div>
          </div>
          </Card>
        </motion.div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.3 }}
            whileHover={{ scale: 1.01 }}
          >
            <Card className="p-6 backdrop-blur-xl" style={{ boxShadow: 'var(--neumorphic-shadow)' }}>
            <h3 className="text-lg font-semibold mb-4">Alerts & Recommendations</h3>
            <div className="space-y-4">
              {alerts.map((alert, index) => (
                <div 
                  key={index}
                  className={`flex gap-3 p-4 rounded-lg border ${
                    alert.severity === 'critical' ? 'bg-destructive/10 border-destructive/20' :
                    alert.severity === 'warning' ? 'bg-accent/10 border-accent/20' :
                    'bg-success/10 border-success/20'
                  }`}
                >
                  {alert.severity === 'info' ? (
                    <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${
                      alert.severity === 'critical' ? 'text-destructive' : 'text-accent'
                    }`} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm mb-1">{alert.message}</p>
                    <p className="text-xs text-muted-foreground">{alert.recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
            </Card>
          </motion.div>
        )}
      </motion.div>

      <BottomNav />
    </div>
    </>
  );
}
