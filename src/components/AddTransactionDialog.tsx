import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db, Transaction } from '@/lib/db';
import { toast } from 'sonner';
import { useLiveQuery } from 'dexie-react-hooks';
import { formatIndianCurrency, parseIndianCurrency } from '@/lib/indian-currency-formatter';
import { suggestCategory } from '@/lib/category-suggestions';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categories = {
  income: ['Sales', 'Salary', 'Refund', 'Other Income'],
  expense: ['Food & Grocery', 'Utilities', 'Rent', 'Transport', 'Supplies', 'Other Expense']
};

export const AddTransactionDialog = ({ open, onOpenChange }: AddTransactionDialogProps) => {
  const { t } = useLanguage();
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);
  const [inventoryItemId, setInventoryItemId] = useState<string>('');
  const [quantityChange, setQuantityChange] = useState('');

  const inventoryItems = useLiveQuery(() => db.inventory.toArray(), []);

  // Suggest category based on description
  useEffect(() => {
    if (description.length >= 2) {
      const suggestion = suggestCategory(description);
      setSuggestedCategory(suggestion);
    } else {
      setSuggestedCategory(null);
    }
  }, [description]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedAmount = parseIndianCurrency(amount);
    if (!parsedAmount || !description || !category) {
      toast.error('Please fill all fields');
      return;
    }

    const transaction: Transaction = {
      type,
      amount: parsedAmount,
      description,
      category,
      date: new Date(),
      source: 'manual',
      inventoryItemId: inventoryItemId ? parseInt(inventoryItemId) : undefined,
      quantityChange: quantityChange ? parseFloat(quantityChange) : undefined,
      verified: true,
      createdAt: new Date(),
    };

    // Auto Inventory Deduction (Feature #13)
    if (inventoryItemId && quantityChange) {
      const itemId = parseInt(inventoryItemId);
      const qty = parseFloat(quantityChange);
      const item = await db.inventory.get(itemId);
      
      if (item) {
        const newQuantity = type === 'income' ? item.quantity + qty : item.quantity - qty;
        
        if (newQuantity < 0) {
          toast.error('Not enough stock available');
          return;
        }
        
        await db.inventory.update(itemId, { 
          quantity: newQuantity,
          updatedAt: new Date()
        });
        toast.success('Stock updated automatically');
      }
    }

    await db.transactions.add(transaction);
    toast.success(`${type === 'income' ? 'Income' : 'Expense'} added successfully`);
    
    setAmount('');
    setDescription('');
    setCategory('');
    setSuggestedCategory(null);
    setInventoryItemId('');
    setQuantityChange('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('add.title')}</DialogTitle>
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
            {amount && (
              <p className="text-xs text-muted-foreground">
                ₹{amount}
              </p>
            )}
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
            {suggestedCategory && !category && (
              <Badge
                variant="secondary"
                className="cursor-pointer mb-2"
                onClick={() => setCategory(suggestedCategory)}
              >
                Suggested: {suggestedCategory}
              </Badge>
            )}
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

          {/* Inventory Link */}
          <div className="border-t pt-4 space-y-3">
            <Label className="text-sm text-muted-foreground">{t('add.inventoryLink')}</Label>
            
            <div className="space-y-2">
              <Label htmlFor="inventoryItem">{t('add.selectItem')}</Label>
              <Select value={inventoryItemId} onValueChange={setInventoryItemId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('add.selectItem')} />
                </SelectTrigger>
                <SelectContent>
                  {inventoryItems?.map((item) => (
                    <SelectItem key={item.id} value={item.id!.toString()}>
                      {item.name} (Available: {item.quantity} {item.unit || 'units'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {inventoryItemId && (
              <div className="space-y-2">
                <Label htmlFor="quantityChange">
                  {t('add.quantity')} {type === 'income' ? t('add.quantityAdded') : t('add.quantitySold')}
                </Label>
                <Input
                  id="quantityChange"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={quantityChange}
                  onChange={(e) => setQuantityChange(e.target.value)}
                />
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" size="lg">
            {t('add.submit')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
