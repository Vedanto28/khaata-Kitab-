import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera as CameraComponent } from '@capacitor/camera';
import { CameraResultType, CameraSource } from '@capacitor/camera';
import { performOCR } from '@/lib/ocr-service';
import { aiReceipt } from '@/lib/ai-client';
import { db, Transaction } from '@/lib/db';
import { toast } from 'sonner';
import { Loader2, Camera, Upload, Sparkles } from 'lucide-react';
import { AIConfirmationDialog, AIConfirmationData } from './AIConfirmationDialog';

interface ScanReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ScanReceiptDialog = ({ open, onOpenChange }: ScanReceiptDialogProps) => {
  const [processing, setProcessing] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [statusText, setStatusText] = useState('Processing receipt...');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<AIConfirmationData | null>(null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [pendingRaw, setPendingRaw] = useState<string>('');

  const handleCapture = async (source: CameraSource) => {
    try {
      setProcessing(true);
      setStatusText('Capturing image...');

      const image = await CameraComponent.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: source,
      });

      if (!image.dataUrl) {
        toast.error('Failed to capture image');
        return;
      }

      setImageUrl(image.dataUrl);

      let amount: number | undefined;
      let vendor: string | undefined;
      let category = 'Other Expense';
      let dateStr: string | undefined;
      let items: string[] = [];
      let rawText = '';
      let confidence = 0.9;

      try {
        setStatusText('AI is reading your receipt...');
        const ai = await aiReceipt(image.dataUrl);
        if (ai.totalAmount) {
          amount = ai.totalAmount;
          vendor = ai.merchant ?? undefined;
          category = ai.category || category;
          dateStr = ai.date ?? undefined;
          items = ai.items || [];
        }
      } catch (e: any) {
        console.warn('AI receipt failed, falling back to OCR:', e?.message);
      }

      if (!amount) {
        setStatusText('Falling back to on-device OCR...');
        const ocrResult = await performOCR(image.dataUrl);
        amount = ocrResult.amount;
        vendor = ocrResult.vendor;
        items = ocrResult.items || [];
        rawText = ocrResult.text;
        confidence = 0.6;
      }

      if (amount) {
        setConfirmData({
          type: 'expense',
          merchant: vendor || 'Receipt',
          amount,
          date: dateStr ? new Date(dateStr) : new Date(),
          category,
          source: 'receipt',
          confidence,
          rawText: rawText || (items.length ? items.join('\n') : undefined),
        });
        setPendingImage(image.dataUrl);
        setPendingRaw(rawText);
        setConfirmOpen(true);
        // Close the scan dialog so the confirm dialog is the primary view
        onOpenChange(false);
      } else {
        toast.error('Could not extract amount from receipt');
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast.error('Failed to process receipt');
    } finally {
      setProcessing(false);
      setImageUrl(null);
      setStatusText('Processing receipt...');
    }
  };

  const handleConfirmSave = async (edited: AIConfirmationData) => {
    const transaction: Transaction = {
      type: edited.type,
      amount: edited.amount,
      description: edited.merchant,
      category: edited.category,
      date: edited.date,
      source: 'receipt',
      rawData: pendingRaw,
      verified: true,
      verifiedVia: 'manual',
      createdAt: new Date(),
    };
    await db.transactions.add(transaction);
    if (pendingImage) {
      await db.receipts.add({
        imageUrl: pendingImage,
        extractedData: {
          amount: edited.amount,
          vendor: edited.merchant,
          date: edited.date.toISOString(),
        },
        createdAt: new Date(),
      });
    }
    toast.success(`Saved ₹${edited.amount} — ${edited.merchant}`);
    setConfirmData(null);
    setPendingImage(null);
    setPendingRaw('');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Scan Receipt</DialogTitle>
          </DialogHeader>

          {processing ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="relative mb-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <Sparkles className="w-5 h-5 text-primary absolute -top-1 -right-1" />
              </div>
              <p className="text-sm text-muted-foreground">{statusText}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {imageUrl && (
                <div className="relative rounded-lg overflow-hidden border">
                  <img src={imageUrl} alt="Receipt" className="w-full" />
                </div>
              )}

              <div className="grid gap-3">
                <Button
                  onClick={() => handleCapture(CameraSource.Camera)}
                  className="w-full h-14"
                  size="lg"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Take Photo
                </Button>

                <Button
                  onClick={() => handleCapture(CameraSource.Photos)}
                  variant="outline"
                  className="w-full h-14"
                  size="lg"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Choose from Gallery
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3" />
                AI-powered extraction with on-device OCR fallback
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AIConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        data={confirmData}
        onConfirm={handleConfirmSave}
        onDiscard={() => {
          setConfirmData(null);
          setPendingImage(null);
          setPendingRaw('');
          toast.info('Discarded');
        }}
      />
    </>
  );
};
