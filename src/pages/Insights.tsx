import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { BottomNav } from '@/components/BottomNav';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2 } from 'lucide-react';
import { predictCashflow, generateAlerts, calculateCreditSignal } from '@/lib/ai-insights';
import { Badge } from '@/components/ui/badge';
import { OfflineSyncIndicator } from '@/components/OfflineSyncIndicator';
import { DashboardSummaryCards } from '@/components/DashboardSummaryCards';

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
  );
}
