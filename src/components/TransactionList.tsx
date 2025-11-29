import { useState } from 'react';
import { motion } from 'framer-motion';
import { Transaction, db } from '@/lib/db';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowDownRight, ArrowUpRight, MessageSquare, Camera, Edit, CheckCircle2, ShieldCheck, AlertCircle, Bot, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { EditTransactionDialog } from './EditTransactionDialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

interface TransactionListProps {
  transactions: Transaction[];
}

export const TransactionList = ({ transactions }: TransactionListProps) => {
  const { t } = useLanguage();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const handleVerify = async (transaction: Transaction) => {
    if (transaction.id) {
      await db.transactions.update(transaction.id, {
        verified: !transaction.verified
      });
      toast.success(transaction.verified ? 'Transaction unverified' : 'Transaction verified');
    }
  };

  if (transactions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <Card className="p-8 text-center bg-card/70 backdrop-blur-xl border border-border relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 -z-10" />
          
          {/* Friendly AI Bot Illustration */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="mb-4"
          >
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Bot className="w-10 h-10 text-primary" />
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <h3 className="text-lg font-semibold mb-2">No entries yet — ready when you are!</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Start tracking your finances with AI-powered bookkeeping. Add your first transaction or scan a receipt.
            </p>
          </motion.div>

          {/* Call-to-action */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="flex gap-3 justify-center flex-wrap"
          >
            <Button
              size="sm"
              className="gap-2"
              onClick={() => {
                // This would trigger the add transaction dialog
                // Parent component should handle this
              }}
            >
              <Plus className="w-4 h-4" />
              Add Transaction
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => {
                // This would trigger the scan receipt dialog
                // Parent component should handle this
              }}
            >
              <Camera className="w-4 h-4" />
              Scan Receipt
            </Button>
          </motion.div>
        </Card>
      </motion.div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {transactions.map((transaction, index) => {
          return (
            <motion.div
              key={transaction.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              whileHover={{ scale: 1.01 }}
            >
              <Card 
                className={`p-4 hover:shadow-lg transition-all duration-200 hover:scale-[1.01] backdrop-blur-xl relative ${
                  transaction.verified ? 'border-success/50 bg-success/5' : ''
                }`}
                style={{ boxShadow: 'var(--glass-shadow)' }}
              >
                {/* SMS Verification Badge - Only show when verified via SMS */}
                {transaction.source === 'sms' && transaction.verified && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.25 }}
                    className="absolute top-3 right-3 z-10"
                  >
                    <Badge
                      variant="outline"
                      className="text-xs px-2 py-1 rounded-full border bg-success/10 text-success border-success/30 transition-all duration-200"
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Verified via SMS
                    </Badge>
                  </motion.div>
                )}
                
                {/* Mismatch Badge - Only show when explicitly marked */}
                {transaction.verified === false && transaction.source !== 'manual' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.25 }}
                    className="absolute top-3 right-3 z-10"
                  >
                    <Badge
                      variant="outline"
                      className="text-xs px-2 py-1 rounded-full border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 transition-all duration-200"
                    >
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Review Needed
                    </Badge>
                  </motion.div>
                )}

                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    transaction.type === 'income' 
                      ? 'bg-success/10 text-success' 
                      : 'bg-destructive/10 text-destructive'
                  }`}>
                    {transaction.type === 'income' ? (
                      <ArrowDownRight className="w-5 h-5" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold truncate">{transaction.description}</p>
                          {transaction.verified && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', stiffness: 300 }}
                            >
                              <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                            </motion.div>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{transaction.category}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-lg font-bold ${
                          transaction.type === 'income' ? 'text-success' : 'text-destructive'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}₹{transaction.amount.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>

                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>{format(transaction.date, 'MMM dd, yyyy')}</span>
                  <div className="flex items-center gap-1">
                    {transaction.source === 'sms' && <MessageSquare className="w-3 h-3" />}
                    {transaction.source === 'receipt' && <Camera className="w-3 h-3" />}
                    {transaction.source === 'manual' && <Edit className="w-3 h-3" />}
                    <span className="capitalize">{t(`transaction.${transaction.source}`)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingTransaction(transaction)}
                    className="h-8 text-xs transition-all duration-200 hover:bg-muted/20 hover:scale-105"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    {t('transaction.edit')}
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`verify-${transaction.id}`}
                      checked={transaction.verified || false}
                      onCheckedChange={() => handleVerify(transaction)}
                      className="transition-all duration-200"
                    />
                    <label
                      htmlFor={`verify-${transaction.id}`}
                      className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors duration-200"
                    >
                      {transaction.verified ? t('transaction.verified') : t('transaction.verify')}
                    </label>
                  </div>
                </div>
              </div>
            </div>
            </Card>
            </motion.div>
          );
        })}
      </div>

      <EditTransactionDialog
        open={!!editingTransaction}
        onOpenChange={(open) => !open && setEditingTransaction(null)}
        transaction={editingTransaction}
      />
    </TooltipProvider>
  );
};
