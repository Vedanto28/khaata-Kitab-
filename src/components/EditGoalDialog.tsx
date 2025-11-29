import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Target } from 'lucide-react';
import { toast } from 'sonner';
import { formatIndianCurrency, parseIndianCurrency } from '@/lib/indian-currency-formatter';

interface EditGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentGoal: number;
  onSave: (newGoal: number) => void;
}

export const EditGoalDialog = ({ open, onOpenChange, currentGoal, onSave }: EditGoalDialogProps) => {
  const [goal, setGoal] = useState(currentGoal.toString());

  useEffect(() => {
    setGoal(formatIndianCurrency(currentGoal.toString()));
  }, [currentGoal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newGoal = parseIndianCurrency(goal);
    
    if (isNaN(newGoal) || newGoal <= 0) {
      toast.error('Please enter a valid goal amount');
      return;
    }

    onSave(newGoal);
    toast.success('Monthly goal updated! 🎯');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Set Monthly Income Goal
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          <div className="space-y-2">
            <Label htmlFor="goal" className="text-sm font-medium">
              Target Amount (₹)
            </Label>
            <Input
              id="goal"
              type="text"
              inputMode="numeric"
              placeholder="40,000"
              value={goal}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d]/g, '');
                setGoal(formatIndianCurrency(raw));
              }}
              className="text-lg"
              required
            />
            <p className="text-xs text-muted-foreground">
              Set a realistic monthly income target to track your progress
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Save Goal
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
