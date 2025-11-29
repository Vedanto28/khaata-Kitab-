import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Wallet, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Transaction } from '@/lib/db';
import { startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';

interface DashboardSummaryCardsProps {
  transactions: Transaction[];
}

export const DashboardSummaryCards = ({ transactions }: DashboardSummaryCardsProps) => {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);

  const thisWeekTransactions = transactions.filter((t) =>
    isWithinInterval(t.date, { start: weekStart, end: weekEnd })
  );

  const weekIncome = thisWeekTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const weekExpense = thisWeekTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  const cards = [
    {
      title: "This Week's Income",
      value: weekIncome,
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/10',
      trend: '+12%',
      prefix: '+₹',
    },
    {
      title: "This Week's Expense",
      value: weekExpense,
      icon: TrendingDown,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      trend: '-8%',
      prefix: '-₹',
    },
    {
      title: 'Cashflow Balance',
      value: balance,
      icon: Wallet,
      color: balance >= 0 ? 'text-primary' : 'text-destructive',
      bgColor: balance >= 0 ? 'bg-primary/10' : 'bg-destructive/10',
      trend: balance >= 0 ? '↑' : '↓',
      prefix: '₹',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: 'easeOut' as const,
      },
    },
  };

  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-3 gap-4 px-4 mb-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {cards.map((card, index) => (
        <motion.div key={card.title} variants={cardVariants} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Card
            className="p-5 backdrop-blur-xl bg-card/50 border-2 shadow-lg"
            style={{
              boxShadow: 'var(--glass-shadow)',
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`${card.bgColor} ${card.color} w-12 h-12 rounded-xl flex items-center justify-center`}>
                <card.icon className="w-6 h-6" />
              </div>
              <span className={`text-xs font-medium ${card.color}`}>{card.trend}</span>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">{card.title}</h3>
            <p className={`text-2xl font-bold ${card.color}`}>
              {card.prefix}
              {card.value.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </p>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
};
