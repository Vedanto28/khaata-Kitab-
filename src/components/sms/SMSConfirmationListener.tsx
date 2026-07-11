import { useEffect, useState } from 'react';
import { AIConfirmationDialog, AIConfirmationData } from '@/components/ai/AIConfirmationDialog';
import { db, Transaction } from '@/database/db';
import { updateModel } from '@/lib/ml/classifier';
import { toast } from 'sonner';

export interface PendingSMSDetail {
  data: AIConfirmationData;
  rawSms: string;
  parsed: {
    referenceId?: string;
    last4Digits?: string;
    method?: any;
    merchantRaw?: string;
    merchantCanonical?: string;
    merchantCategorySource?: 'dictionary' | 'classifier' | 'llm' | 'manual';
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

      // Check if duplicate of current displaying item
      if (current && (
        (detail.parsed.referenceId && current.parsed.referenceId === detail.parsed.referenceId) ||
        (current.data.amount === detail.data.amount && 
         current.data.merchant.toLowerCase() === detail.data.merchant.toLowerCase() && 
         Math.abs(new Date(current.data.date).getTime() - new Date(detail.data.date).getTime()) < 60000)
      )) {
        console.log('[SMS Queue] Duplicate of current message blocked:', detail.data.merchant);
        try {
          const count = parseInt(localStorage.getItem('khaataKitab_duplicatesRemoved') || '0');
          localStorage.setItem('khaataKitab_duplicatesRemoved', String(count + 1));
        } catch {}
        return;
      }

      // Check if duplicate of an item already in the queue
      const isAlreadyInQueue = queue.some(q => 
        (detail.parsed.referenceId && q.parsed.referenceId === detail.parsed.referenceId) ||
        (q.data.amount === detail.data.amount && 
         q.data.merchant.toLowerCase() === detail.data.merchant.toLowerCase() && 
         Math.abs(new Date(q.data.date).getTime() - new Date(detail.data.date).getTime()) < 60000)
      );

      if (isAlreadyInQueue) {
        console.log('[SMS Queue] Duplicate in queue blocked:', detail.data.merchant);
        try {
          const count = parseInt(localStorage.getItem('khaataKitab_duplicatesRemoved') || '0');
          localStorage.setItem('khaataKitab_duplicatesRemoved', String(count + 1));
        } catch {}
        return;
      }

      setQueue((q) => [...q, detail]);
    };
    window.addEventListener('khaata:sms-pending-confirm', handler as EventListener);
    return () => window.removeEventListener('khaata:sms-pending-confirm', handler as EventListener);
  }, [queue, current]);

  // Pop next from queue when no current shown, and detect when queue is empty
  useEffect(() => {
    if (!current && queue.length > 0) {
      setCurrent(queue[0]);
      setQueue((q) => q.slice(1));
      setOpen(true);
    } else if (!current && queue.length === 0 && open) {
      setOpen(false);
      console.log('[SMS Queue Empty]');
    }
  }, [queue, current, open]);

  const handleConfirm = async (edited: AIConfirmationData) => {
    if (!current) return;

    const { normalizeMerchant } = await import('@/lib/merchant/normalizeMerchant');
    const norm = normalizeMerchant(edited.merchant);

    const isManual = edited.merchant !== current.data.merchant || edited.category !== current.data.category;
    const categorySource: Transaction['merchantCategorySource'] = isManual
      ? 'manual'
      : (current.parsed.merchantCategorySource || (norm.isMatched ? 'dictionary' : 'classifier'));

    const tx: Transaction = {
      type: edited.type,
      amount: edited.amount,
      description: norm.canonicalName || edited.merchant,
      category: edited.category,
      date: edited.date,
      source: 'sms',
      verified: true,
      verifiedVia: 'sms',
      isAutoAdded: true,
      confidence: current.data.confidence ?? 1,
      needsReview: false,
      rawData: current.rawSms,
      paymentMethod: current.parsed.method,
      referenceId: current.parsed.referenceId,
      last4Digits: current.parsed.last4Digits,
      categoryConfidence: current.data.confidence ?? 1,
      createdAt: new Date(),
      merchantRaw: current.parsed.merchantRaw || current.data.merchant || undefined,
      merchantCanonical: norm.canonicalName || edited.merchant,
      merchantCategorySource: categorySource,
    };
    await db.transactions.add(tx);
    
    // Increment total processed/saved in localStorage for diagnostics
    try {
      const savedCount = parseInt(localStorage.getItem('khaataKitab_smsSaved') || '0');
      localStorage.setItem('khaataKitab_smsSaved', String(savedCount + 1));
    } catch {}

    // Online learning: train on user-confirmed category
    try {
      await updateModel(`${edited.merchant} ${current.rawSms}`.trim(), edited.category);
    } catch (e) { console.warn('updateModel failed', e); }
    toast.success(`Saved ₹${edited.amount} — ${edited.merchant}`);
    setCurrent(null);
  };

  const handleDiscard = () => {
    if (current) {
      toast.info('SMS transaction discarded');
      // Increment discard diagnostics in localStorage
      try {
        const discardCount = parseInt(localStorage.getItem('khaataKitab_smsDiscarded') || '0');
        localStorage.setItem('khaataKitab_smsDiscarded', String(discardCount + 1));
      } catch {}
    }
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
