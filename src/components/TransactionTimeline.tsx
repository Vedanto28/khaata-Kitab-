import { motion } from 'framer-motion';
import { Transaction } from '@/lib/db';
import { format, startOfDay, isSameDay } from 'date-fns';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface TransactionTimelineProps {
  transactions: Transaction[];
}

export const TransactionTimeline = ({ transactions }: TransactionTimelineProps) => {
  // Group transactions by date
  const groupedByDate = transactions.reduce((groups, transaction) => {
    const dateKey = format(startOfDay(transaction.date), 'yyyy-MM-dd');
    if (!groups[dateKey]) {
      groups[dateKey] = {
        date: transaction.date,
        income: 0,
        expense: 0,
        transactions: [],
      };
    }
    groups[dateKey].transactions.push(transaction);
    if (transaction.type === 'income') {
      groups[dateKey].income += transaction.amount;
    } else {
      groups[dateKey].expense += transaction.amount;
    }
    return groups;
  }, {} as Record<string, { date: Date; income: number; expense: number; transactions: Transaction[] }>);

  const timelineData = Object.values(groupedByDate).sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );

  if (timelineData.length === 0) {
    return null;
  }

  return (
    <div className="px-4 mb-6">
      <h2 className="text-lg font-bold mb-4">Transaction Timeline</h2>
      <div className="relative">
        {/* Horizontal scroll container */}
        <motion.div
          className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {timelineData.map((day, index) => {
            const net = day.income - day.expense;
            const isPositive = net >= 0;

            return (
              <motion.div
                key={format(day.date, 'yyyy-MM-dd')}
                className="flex-shrink-0 snap-center"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                whileHover={{ scale: 1.02 }}
              >
                <Card
                  className="w-64 p-4 backdrop-blur-xl bg-card/60 border-2"
                  style={{ boxShadow: 'var(--neumorphic-shadow)' }}
                >
                  {/* Date Header */}
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-foreground">
                      {format(day.date, 'MMM dd, yyyy')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {day.transactions.length} transaction{day.transactions.length > 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Income/Expense Summary */}
                  <div className="space-y-2 mb-3">
                    {day.income > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-success">
                          <ArrowDownRight className="w-4 h-4" />
                          <span>Income</span>
                        </div>
                        <span className="font-semibold text-success">
                          +₹{day.income.toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                    {day.expense > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-destructive">
                          <ArrowUpRight className="w-4 h-4" />
                          <span>Expense</span>
                        </div>
                        <span className="font-semibold text-destructive">
                          -₹{day.expense.toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Net Balance */}
                  <div
                    className={`pt-3 border-t flex items-center justify-between ${
                      isPositive ? 'border-success/20' : 'border-destructive/20'
                    }`}
                  >
                    <span className="text-sm font-medium text-muted-foreground">Net</span>
                    <span
                      className={`text-lg font-bold ${
                        isPositive ? 'text-success' : 'text-destructive'
                      }`}
                    >
                      {isPositive ? '+' : ''}₹{net.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Color indicator bar */}
                  <div className="mt-3 h-1 w-full rounded-full overflow-hidden bg-muted/30">
                    <motion.div
                      className={isPositive ? 'bg-success' : 'bg-destructive'}
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ delay: index * 0.05 + 0.2, duration: 0.5 }}
                      style={{ height: '100%' }}
                    />
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
};
