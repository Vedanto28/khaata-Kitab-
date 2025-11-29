import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingUp, Edit2 } from 'lucide-react';
import { Transaction } from '@/lib/db';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EditGoalDialog } from '@/components/EditGoalDialog';

interface GoalTrackerWidgetProps {
  transactions: Transaction[];
}

export const GoalTrackerWidget = ({ transactions }: GoalTrackerWidgetProps) => {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [monthlyGoal, setMonthlyGoal] = useState<number>(() => {
    const saved = localStorage.getItem('monthlyGoal');
    return saved ? parseFloat(saved) : 40000;
  });

  useEffect(() => {
    localStorage.setItem('monthlyGoal', monthlyGoal.toString());
  }, [monthlyGoal]);

  const handleSaveGoal = (newGoal: number) => {
    setMonthlyGoal(newGoal);
  };

  // Calculate current month's income
  const now = new Date();
  const monthlyIncome = transactions
    .filter(t => {
      const tDate = new Date(t.date);
      return (
        t.type === 'income' &&
        tDate.getMonth() === now.getMonth() &&
        tDate.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const progress = Math.min((monthlyIncome / monthlyGoal) * 100, 100);
  
  // Determine color based on progress
  const getProgressColor = () => {
    if (progress >= 80) return 'from-success via-success to-success/80';
    if (progress >= 50) return 'from-accent via-accent to-accent/80';
    return 'from-primary via-primary to-primary/80';
  };

  // Motivational message
  const getMessage = () => {
    if (progress >= 100) return "🎉 Goal achieved! Excellent work!";
    if (progress >= 80) return "🔥 You're so close! Keep it up!";
    if (progress >= 50) return "💪 Great progress this month!";
    return "🚀 Let's reach that goal together!";
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="px-4 mb-6"
    >
      <Card className="bg-card border border-border rounded-xl shadow-sm p-4 overflow-hidden relative">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -z-10" />
        
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Monthly Income Goal</h3>
              <p className="text-xs text-muted-foreground">Track your progress</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-primary/10 transition-all duration-200"
            onClick={() => setShowEditDialog(true)}
          >
            <Edit2 className="w-4 h-4 text-primary" />
          </Button>
        </div>

        {/* Goal Stats */}
        <div className="mb-3">
          <div className="flex items-baseline justify-between mb-2">
            <div>
              <span className="text-2xl font-bold text-foreground">
                ₹{monthlyIncome.toLocaleString('en-IN')}
              </span>
              <span className="text-sm text-muted-foreground ml-2">
                / ₹{monthlyGoal.toLocaleString('en-IN')}
              </span>
            </div>
            <span className="text-lg font-semibold text-primary">
              {Math.round(progress)}%
            </span>
          </div>

          {/* Progress Bar with Gradient */}
          <div className="relative">
            <motion.div
              className="h-3 w-full bg-secondary rounded-full overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <motion.div
                className={`h-full bg-gradient-to-r ${getProgressColor()} rounded-full relative`}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Motivational Message */}
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          className="text-xs text-muted-foreground font-medium"
        >
          {getMessage()}
        </motion.p>
      </Card>

      {/* Edit Goal Dialog */}
      <EditGoalDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        currentGoal={monthlyGoal}
        onSave={handleSaveGoal}
      />
    </motion.div>
  );
};
