import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { categories as mlCategories } from '@/lib/ml/classifier';
import { toast } from 'sonner';

export interface AIConfirmationData {
  type: 'income' | 'expense';
  merchant: string;
  amount: number;
  date: Date;
  category: string;
  source: 'sms' | 'receipt';
  confidence?: number;
  rawText?: string;
  paymentMethod?: string;
  items?: string[];
}

interface AIConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: AIConfirmationData | null;
  onConfirm: (edited: AIConfirmationData) => void | Promise<void>;
  onDiscard?: () => void;
}

const fallbackCategories = [
  'Food & Grocery', 'Utilities', 'Rent', 'Transport', 'Fuel',
  'Shopping', 'Entertainment', 'Health', 'Education', 'Salary',
  'Sales', 'Refund', 'Other Income', 'Other Expense',
];

export const AIConfirmationDialog = ({
  open, onOpenChange, data, onConfirm, onDiscard,
}: AIConfirmationDialogProps) => {
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [items, setItems] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setMerchant(data.merchant || '');
      setAmount(String(data.amount ?? ''));
      setDateStr(format(data.date || new Date(), "yyyy-MM-dd'T'HH:mm"));
      setCategory(data.category || 'Other Expense');
      setType(data.type || 'expense');
      setPaymentMethod(data.paymentMethod || '');
      setItems(data.items || []);
    }
  }, [data]);

  const allCategories = Array.from(new Set([...(mlCategories || []), ...fallbackCategories]));

  const handleConfirm = async () => {
    if (!data) return;
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;
    setSaving(true);
    try {
      await onConfirm({
        ...data,
        merchant: merchant.trim() || 'Unknown',
        amount: numAmount,
        date: new Date(dateStr),
        category,
        type,
        paymentMethod: paymentMethod.trim() || undefined,
        items: items.map(i => i.trim()).filter(Boolean),
      });
      onOpenChange(false);
    } catch (err) {
      console.error('Save failed in handleConfirm:', err);
      toast.error('Failed to save transaction.');
    } finally {
      setSaving(false);
    }
  };

  const confidencePct = data?.confidence != null ? Math.round(data.confidence * 100) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Confirm AI-detected transaction
          </DialogTitle>
          <DialogDescription>
            Review and edit the details before saving.
            {data?.source && (
              <Badge variant="secondary" className="ml-2 capitalize">{data.source}</Badge>
            )}
            {confidencePct != null && (
              <Badge
                variant={confidencePct < 60 ? 'destructive' : 'outline'}
                className="ml-2"
              >
                {confidencePct}% confidence
              </Badge>
            )}
            {confidencePct != null && confidencePct < 60 && (
              <Badge variant="destructive" className="ml-2">Needs review</Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={type === 'expense' ? 'default' : 'outline'}
              onClick={() => setType('expense')}
            >
              Expense
            </Button>
            <Button
              type="button"
              variant={type === 'income' ? 'default' : 'outline'}
              onClick={() => setType('income')}
            >
              Income
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-merchant">Merchant / Description</Label>
            <Input
              id="ai-merchant"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="e.g. Swiggy"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-amount">Amount (₹)</Label>
            <Input
              id="ai-amount"
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-date">Date & Time</Label>
            <Input
              id="ai-date"
              type="datetime-local"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {allCategories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-payment-method">Payment Method</Label>
            <Input
              id="ai-payment-method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              placeholder="e.g. Cash, Card, UPI"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-items">Items (one per line)</Label>
            <textarea
              id="ai-items"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={items.join('\n')}
              onChange={(e) => setItems(e.target.value.split('\n'))}
              placeholder="e.g. Item 1&#10;Item 2"
            />
          </div>

          {data?.rawText && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">Original text</summary>
              <p className="mt-2 p-2 bg-muted rounded whitespace-pre-wrap">{data.rawText}</p>
            </details>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => { onDiscard?.(); onOpenChange(false); }}
              disabled={saving}
            >
              <X className="w-4 h-4 mr-1" /> Discard
            </Button>
            <Button
              className="flex-1"
              onClick={handleConfirm}
              disabled={saving || !amount}
            >
              <Check className="w-4 h-4 mr-1" /> {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
