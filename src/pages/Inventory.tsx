import { useState } from 'react';
import { Package, Plus, TrendingUp, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { db, InventoryItem } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { BottomNav } from '@/components/BottomNav';
import { AddInventoryDialog } from '@/components/AddInventoryDialog';
import { motion, AnimatePresence } from 'framer-motion';

export default function Inventory() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | undefined>();

  const items = useLiveQuery(() => db.inventory.toArray(), []);

  const totalValue = items?.reduce((sum, item) => sum + (item.quantity * item.price), 0) || 0;
  const totalItems = items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  const handleEdit = (item: InventoryItem) => {
    setEditItem(item);
    setShowAddDialog(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this item?')) {
      await db.inventory.delete(id);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-6 rounded-b-3xl shadow-lg">
        <h1 className="text-2xl font-bold mb-4">Inventory</h1>
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-card/10 backdrop-blur border-primary-foreground/20 p-4">
            <div className="text-sm opacity-90 mb-1">Total Value</div>
            <div className="text-2xl font-bold">₹{totalValue.toLocaleString('en-IN')}</div>
          </Card>
          <Card className="bg-card/10 backdrop-blur border-primary-foreground/20 p-4">
            <div className="text-sm opacity-90 mb-1">Total Items</div>
            <div className="text-2xl font-bold">{totalItems}</div>
          </Card>
        </div>
      </div>

      {/* Add Button */}
      <div className="p-4" data-tour="add-inventory">
        <Button 
          onClick={() => {
            setEditItem(undefined);
            setShowAddDialog(true);
          }}
          className="w-full h-12 text-base"
          size="lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Inventory List - Responsive Grid */}
      <div className="px-4">
        {items?.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center py-12"
          >
            <Card className="p-8 text-center max-w-md bg-gradient-to-br from-card to-card/50 backdrop-blur">
              <div className="mb-4 flex justify-center">
                <div className="p-4 rounded-full bg-primary/10">
                  <Package className="w-12 h-12 text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Your stock list is empty</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Start tracking your inventory by adding your first item.
              </p>
              <Button 
                onClick={() => {
                  setEditItem(undefined);
                  setShowAddDialog(true);
                }}
                size="lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Item
              </Button>
            </Card>
          </motion.div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <AnimatePresence mode="popLayout">
            {items?.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                layout
              >
                <Card className="p-4 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] h-full flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Package className="w-4 h-4 text-primary flex-shrink-0" />
                      <h3 className="font-semibold truncate">{item.name}</h3>
                    </div>
                  </div>
                  
                  <div className="space-y-2 flex-1">
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div className="flex items-center justify-between">
                        <span>Quantity:</span>
                        <span className="font-medium text-foreground">
                          {item.quantity} {item.unit || 'units'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Price:</span>
                        <span className="font-medium text-foreground">₹{item.price}</span>
                      </div>
                    </div>
                    
                    {item.category && (
                      <div className="text-xs bg-secondary px-2 py-1 rounded-full inline-block">
                        {item.category}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                    <div className="text-lg font-bold text-primary">
                      ₹{(item.quantity * item.price).toLocaleString('en-IN')}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEdit(item)}
                        className="h-8 w-8 hover:bg-primary/10 transition-all duration-200"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => item.id && handleDelete(item.id)}
                        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <AddInventoryDialog 
        open={showAddDialog} 
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) setEditItem(undefined);
        }}
        editItem={editItem}
      />
      <BottomNav />
    </div>
  );
}
