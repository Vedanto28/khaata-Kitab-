import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db, InventoryItem } from '@/lib/db';
import { toast } from 'sonner';
import { formatIndianCurrency, parseIndianCurrency } from '@/lib/indian-currency-formatter';

interface AddInventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem?: InventoryItem;
}

export const AddInventoryDialog = ({ open, onOpenChange, editItem }: AddInventoryDialogProps) => {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    if (editItem) {
      setName(editItem.name);
      setQuantity(editItem.quantity.toString());
      setPrice(formatIndianCurrency(editItem.price.toString()));
      setUnit(editItem.unit || '');
      setCategory(editItem.category || '');
    } else {
      setName('');
      setQuantity('');
      setPrice('');
      setUnit('');
      setCategory('');
    }
  }, [editItem, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedPrice = parseIndianCurrency(price);
    if (!name || !quantity || !parsedPrice) {
      toast.error('Please fill required fields');
      return;
    }

    const item: InventoryItem = {
      name,
      quantity: parseFloat(quantity),
      price: parsedPrice,
      unit: unit || undefined,
      category: category || undefined,
      createdAt: editItem?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    if (editItem?.id) {
      await db.inventory.update(editItem.id, item);
      toast.success('Item updated successfully');
    } else {
      await db.inventory.add(item);
      toast.success('Item added successfully');
    }
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editItem ? 'Edit Item' : 'Add Inventory Item'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Item Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Rice Bags"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                placeholder="kg, pcs, etc."
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Price per Unit (₹) *</Label>
            <Input
              id="price"
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={price}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d]/g, '');
                setPrice(formatIndianCurrency(raw));
              }}
              className="text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              placeholder="e.g., Groceries"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" size="lg">
            {editItem ? 'Update Item' : 'Add Item'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
