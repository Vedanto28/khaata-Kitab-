import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Receipt, Camera, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Action {
  label: string;
  icon: any;
  onClick: () => void;
  color: string;
  tourId?: string;
}

interface FloatingActionButtonProps {
  onAddTransaction: () => void;
  onScanReceipt: () => void;
}

export const FloatingActionButton = ({ onAddTransaction, onScanReceipt }: FloatingActionButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const actions: Action[] = [
    {
      label: 'Add Transaction',
      icon: Receipt,
      onClick: () => {
        onAddTransaction();
        setIsOpen(false);
      },
      color: 'bg-primary text-primary-foreground',
    },
    {
      label: 'Scan Receipt',
      icon: Camera,
      onClick: () => {
        onScanReceipt();
        setIsOpen(false);
      },
      color: 'bg-accent text-accent-foreground',
      tourId: 'scan-receipt',
    },
  ];

  return (
    <div className="fixed bottom-24 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="flex flex-col-reverse gap-3 mb-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {actions.map((action, index) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: {
                    delay: index * 0.1,
                    duration: 0.2,
                    ease: [0.4, 0, 0.2, 1],
                  },
                }}
                exit={{
                  opacity: 0,
                  y: 20,
                  scale: 0.8,
                  transition: { duration: 0.15 },
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                {...(action.tourId && { 'data-tour': action.tourId })}
              >
                <Button
                  onClick={action.onClick}
                  className={`${action.color} h-14 px-6 rounded-2xl shadow-xl backdrop-blur-lg flex items-center gap-3`}
                  style={{ boxShadow: 'var(--glass-shadow)' }}
                >
                  <action.icon className="w-5 h-5" />
                  <span className="font-medium">{action.label}</span>
                </Button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-2xl hover:shadow-primary/50"
          style={{ boxShadow: 'var(--glass-shadow)' }}
        >
          <motion.div
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
          </motion.div>
        </Button>
      </motion.div>
    </div>
  );
};
