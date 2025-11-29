import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, AlertTriangle, X } from 'lucide-react';
import { Transaction } from '@/lib/db';

interface Alert {
  id: string;
  message: string;
  type: 'info' | 'warning';
}

interface SmartAlertBarProps {
  transactions: Transaction[];
}

export const SmartAlertBar = ({ transactions }: SmartAlertBarProps) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  useEffect(() => {
    const generateAlerts = () => {
      const newAlerts: Alert[] = [];
      
      // Calculate monthly income
      const now = new Date();
      const thisMonthTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
      });
      
      const monthlyIncome = thisMonthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const monthlyExpense = thisMonthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      
      // Alert: Income goal progress (example: 40000 goal)
      const incomeGoal = 40000;
      const incomeProgress = (monthlyIncome / incomeGoal) * 100;
      
      if (incomeProgress >= 80 && incomeProgress < 100) {
        newAlerts.push({
          id: 'income-goal-80',
          message: `You've reached ${Math.round(incomeProgress)}% of your monthly income goal. Keep going!`,
          type: 'info'
        });
      }
      
      // Alert: Spending increase
      const lastWeekExpenses = thisMonthTransactions
        .filter(t => {
          const tDate = new Date(t.date);
          const daysAgo = Math.floor((now.getTime() - tDate.getTime()) / (1000 * 60 * 60 * 24));
          return t.type === 'expense' && daysAgo <= 7;
        })
        .reduce((sum, t) => sum + t.amount, 0);
      
      const previousWeekExpenses = thisMonthTransactions
        .filter(t => {
          const tDate = new Date(t.date);
          const daysAgo = Math.floor((now.getTime() - tDate.getTime()) / (1000 * 60 * 60 * 24));
          return t.type === 'expense' && daysAgo > 7 && daysAgo <= 14;
        })
        .reduce((sum, t) => sum + t.amount, 0);
      
      if (previousWeekExpenses > 0) {
        const spendingIncrease = ((lastWeekExpenses - previousWeekExpenses) / previousWeekExpenses) * 100;
        
        if (spendingIncrease > 10) {
          newAlerts.push({
            id: 'spending-increase',
            message: `Spending increased by ${Math.round(spendingIncrease)}% this week compared to last week.`,
            type: 'warning'
          });
        }
      }
      
      // Alert: High expense ratio
      if (monthlyIncome > 0 && monthlyExpense > 0) {
        const expenseRatio = (monthlyExpense / monthlyIncome) * 100;
        
        if (expenseRatio > 70) {
          newAlerts.push({
            id: 'high-expense-ratio',
            message: `Your expenses are ${Math.round(expenseRatio)}% of your income this month. Consider reviewing your spending.`,
            type: 'warning'
          });
        }
      }
      
      // Filter out dismissed alerts
      return newAlerts.filter(alert => !dismissedAlerts.has(alert.id));
    };
    
    setAlerts(generateAlerts());
  }, [transactions, dismissedAlerts]);

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
    
    // Store in localStorage to persist across page reloads (for current session)
    const dismissed = JSON.parse(localStorage.getItem('dismissedAlerts') || '[]');
    localStorage.setItem('dismissedAlerts', JSON.stringify([...dismissed, alertId]));
  };

  // Load dismissed alerts from localStorage on mount
  useEffect(() => {
    const dismissed = JSON.parse(localStorage.getItem('dismissedAlerts') || '[]');
    setDismissedAlerts(new Set(dismissed));
    
    // Clear dismissed alerts after 24 hours
    const lastClear = localStorage.getItem('dismissedAlertsLastClear');
    const now = Date.now();
    
    if (!lastClear || now - parseInt(lastClear) > 24 * 60 * 60 * 1000) {
      localStorage.removeItem('dismissedAlerts');
      localStorage.setItem('dismissedAlertsLastClear', now.toString());
      setDismissedAlerts(new Set());
    }
  }, []);

  return (
    <AnimatePresence mode="popLayout">
      {alerts.map((alert) => (
        <motion.div
          key={alert.id}
          initial={{ opacity: 0, y: -20, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -10, height: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="px-4 mb-4"
        >
          <div
            className={`rounded-md p-3 shadow-sm border flex items-start gap-3 ${
              alert.type === 'info'
                ? 'bg-accent/10 text-accent-foreground border-accent/20'
                : 'bg-destructive/10 text-destructive-foreground border-destructive/20'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {alert.type === 'info' ? (
                <Info className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            <p className="flex-1 text-sm font-medium leading-relaxed">{alert.message}</p>
            <button
              onClick={() => dismissAlert(alert.id)}
              className="shrink-0 hover:opacity-70 transition-opacity"
              aria-label="Dismiss alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      ))}
    </AnimatePresence>
  );
};
