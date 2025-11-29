import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db, Transaction } from '@/lib/db';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatIndianCurrency, parseIndianCurrency } from '@/lib/indian-currency-formatter';

interface EditTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
}

const categories = {
  income: ['Sales', 'Salary', 'Refund', 'Other Income'],
  expense: ['Food & Grocery', 'Utilities', 'Rent', 'Transport', 'Supplies', 'Other Expense']
};

export const EditTransactionDialog = ({ open, onOpenChange, transaction }: EditTransactionDialogProps) => {
  const { t } = useLanguage();
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(formatIndianCurrency(transaction.amount.toString()));
      setDescription(transaction.description);
      setCategory(transaction.category);
    }
  }, [transaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedAmount = parseIndianCurrency(amount);
    if (!parsedAmount || !description || !category || !transaction?.id) {
      toast.error('Please fill all fields');
      return;
    }

    await db.transactions.update(transaction.id, {
      type,
      amount: parsedAmount,
      description,
      category,
    });

    toast.success('Transaction updated successfully');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('edit.title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('add.type')}</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={type === 'income' ? 'default' : 'outline'}
                onClick={() => {
                  setType('income');
                  setCategory('');
                }}
                className="w-full"
              >
                {t('ledger.income')}
              </Button>
              <Button
                type="button"
                variant={type === 'expense' ? 'default' : 'outline'}
                onClick={() => {
                  setType('expense');
                  setCategory('');
                }}
                className="w-full"
              >
                {t('ledger.expense')}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">{t('add.amount')} (₹)</Label>
            <Input
              id="amount"
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={amount}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d]/g, '');
                setAmount(formatIndianCurrency(raw));
              }}
              className="text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('add.description')}</Label>
            <Input
              id="description"
              placeholder="What was it for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">{t('add.category')}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder={t('add.selectCategory')} />
              </SelectTrigger>
              <SelectContent>
                {categories[type].map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full" size="lg">
            {t('edit.submit')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
