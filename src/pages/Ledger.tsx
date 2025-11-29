import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Plus, Filter, Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { db, Transaction } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { BottomNav } from '@/components/BottomNav';
import { AddTransactionDialog } from '@/components/AddTransactionDialog';
import { ScanReceiptDialog } from '@/components/ScanReceiptDialog';
import { TransactionList } from '@/components/TransactionList';
import { OfflineSyncIndicator } from '@/components/OfflineSyncIndicator';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardSummaryCards } from '@/components/DashboardSummaryCards';
import { FloatingActionButton } from '@/components/FloatingActionButton';
import { TransactionTimeline } from '@/components/TransactionTimeline';
import { SmartAlertBar } from '@/components/SmartAlertBar';
import { GoalTrackerWidget } from '@/components/GoalTrackerWidget';
import { AISnapshotBanner } from '@/components/AISnapshotBanner';

export default function Ledger() {
  const { t } = useLanguage();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const transactions = useLiveQuery(
    () => db.transactions.orderBy('date').reverse().toArray(),
    []
  );

  const filteredTransactions = transactions?.filter(t => {
    const matchesFilter = filter === 'all' ? true : t.type === filter;
    const matchesSearch = searchQuery === '' || 
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalIncome = transactions?.filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0) || 0;

  const totalExpense = transactions?.filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0) || 0;

  const balance = totalIncome - totalExpense;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header with Balance */}
      <motion.div
        className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-6 rounded-b-3xl shadow-lg mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">{t('ledger.title')}</h1>
          <OfflineSyncIndicator />
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          <Card
            className="backdrop-blur-xl bg-card/10 border-primary-foreground/20 p-4"
            style={{ boxShadow: 'var(--glass-shadow)' }}
          >
            <div className="text-sm opacity-90 mb-1">{t('ledger.balance')}</div>
            <div className="text-3xl font-bold">₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            <div className="flex gap-4 mt-4 text-sm">
              <div>
                <div className="opacity-80">{t('ledger.income')}</div>
                <div className="text-success font-semibold">+₹{totalIncome.toLocaleString('en-IN')}</div>
              </div>
              <div>
                <div className="opacity-80">{t('ledger.expense')}</div>
                <div className="text-destructive font-semibold">-₹{totalExpense.toLocaleString('en-IN')}</div>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* Smart Alert Bar */}
      <SmartAlertBar transactions={transactions || []} />

      {/* AI Snapshot Banner */}
      <AISnapshotBanner transactions={transactions || []} />

      {/* Goal Tracker Widget */}
      <div data-tour="goal-edit">
        <GoalTrackerWidget transactions={transactions || []} />
      </div>

      {/* Dashboard Summary Cards */}
      <DashboardSummaryCards transactions={transactions || []} />

      {/* Transaction Timeline */}
      <TransactionTimeline transactions={filteredTransactions || []} />

      {/* Search Bar */}
      <motion.div
        className="px-4 mb-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('ledger.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12"
          />
        </div>
      </motion.div>

      {/* Filter Tabs */}
      <motion.div
        className="flex gap-2 px-4 mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
      >
        {(['all', 'income', 'expense'] as const).map((filterType) => (
          <motion.div key={filterType} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={() => setFilter(filterType)}
              variant={filter === filterType ? 'default' : 'outline'}
              size="sm"
              className="capitalize"
            >
              {t(`ledger.${filterType}`)}
            </Button>
          </motion.div>
        ))}
      </motion.div>

      {/* Transactions List */}
      <motion.div
        className="px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.3 }}
      >
        <TransactionList transactions={filteredTransactions || []} />
      </motion.div>

      {/* Floating Action Button */}
      <div data-tour="add-transaction-fab">
        <FloatingActionButton 
          onAddTransaction={() => setShowAddDialog(true)}
          onScanReceipt={() => setShowScanDialog(true)}
        />
      </div>

      <AnimatePresence>
        {showAddDialog && (
          <AddTransactionDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
        )}
        {showScanDialog && (
          <ScanReceiptDialog open={showScanDialog} onOpenChange={setShowScanDialog} />
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
