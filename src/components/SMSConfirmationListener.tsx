import { useEffect, useState } from 'react';
import { AIConfirmationDialog, AIConfirmationData } from './AIConfirmationDialog';
import { db, Transaction } from '@/lib/db';
import { updateModel } from '@/lib/ml/classifier';
import { toast } from 'sonner';

export interface PendingSMSDetail {
  data: AIConfirmationData;
  rawSms: string;
  parsed: {
    referenceId?: string;
    last4Digits?: string;
    method?: any;
  };
}

// Listens for AI-detected SMS transactions and shows confirmation UI
export const SMSConfirmationListener = () => {
  const [open, setOpen] = useState(false);
  const [queue, setQueue] = useState<PendingSMSDetail[]>([]);
  const [current, setCurrent] = useState<PendingSMSDetail | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<PendingSMSDetail>).detail;
      if (!detail) return;
      setQueue((q) => [...q, detail]);
    };
    window.addEventListener('khaata:sms-pending-confirm', handler as EventListener);
    return () => window.removeEventListener('khaata:sms-pending-confirm', handler as EventListener);
  }, []);

  // Pop next from queue when no current shown
  useEffect(() => {
    if (!current && queue.length > 0) {
      setCurrent(queue[0]);
      setQueue((q) => q.slice(1));
      setOpen(true);
    }
  }, [queue, current]);

  const handleConfirm = async (edited: AIConfirmationData) => {
    if (!current) return;
    const tx: Transaction = {
      type: edited.type,
      amount: edited.amount,
      description: edited.merchant,
      category: edited.category,
      date: edited.date,
      source: 'sms',
      verified: true,
      verifiedVia: 'sms',
      isAutoAdded: true,
      confidence: 1,
      needsReview: false,
      rawData: current.rawSms,
      paymentMethod: current.parsed.method,
      referenceId: current.parsed.referenceId,
      last4Digits: current.parsed.last4Digits,
      categoryConfidence: 1,
      createdAt: new Date(),
    };
    await db.transactions.add(tx);
    // Online learning: train on user-confirmed category
    try {
      await updateModel(`${edited.merchant} ${current.rawSms}`.trim(), edited.category);
    } catch (e) { console.warn('updateModel failed', e); }
    toast.success(`Saved ₹${edited.amount} — ${edited.merchant}`);
    setCurrent(null);
  };

  const handleDiscard = () => {
    if (current) toast.info('SMS transaction discarded');
    setCurrent(null);
  };

  return (
    <AIConfirmationDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setCurrent(null);
      }}
      data={current?.data ?? null}
      onConfirm={handleConfirm}
      onDiscard={handleDiscard}
    />
  );
};
