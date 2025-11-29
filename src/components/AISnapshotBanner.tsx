import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Transaction } from '@/lib/db';

interface AISnapshotBannerProps {
  transactions: Transaction[];
}

const generateInsight = (transactions: Transaction[]): string => {
  if (!transactions || transactions.length === 0) {
    return "Start tracking to see AI insights.";
  }

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const thisWeek = transactions.filter(t => new Date(t.date) >= oneWeekAgo);
  const lastWeek = transactions.filter(t => new Date(t.date) >= twoWeeksAgo && new Date(t.date) < oneWeekAgo);

  const thisWeekExpense = thisWeek.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const lastWeekExpense = lastWeek.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  
  const thisMonthIncome = transactions
    .filter(t => t.type === 'income' && new Date(t.date).getMonth() === now.getMonth())
    .reduce((sum, t) => sum + t.amount, 0);

  // Simple logic-based insights
  if (thisWeekExpense < lastWeekExpense && lastWeekExpense > 0) {
    return "Your weekly expenses are lower than last week. 📉";
  }
  
  if (thisMonthIncome > 0 && transactions.filter(t => t.type === 'income').length >= 3) {
    return "Income is stable this month. Keep it up! 💰";
  }

  const inventoryLinked = transactions.filter(t => t.inventoryItemId).length;
  if (inventoryLinked > 5) {
    return "Inventory turnover improved this week. 📦";
  }

  return "You're tracking your finances well! 🎯";
};

export const AISnapshotBanner = ({ transactions }: AISnapshotBannerProps) => {
  const insight = generateInsight(transactions);

  return (
    <motion.div
      className="px-4 mb-4"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <Card className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{insight}</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
