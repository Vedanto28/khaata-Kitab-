import { useRef, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera as CameraComponent } from '@capacitor/camera';
import { CameraResultType, CameraSource } from '@capacitor/camera';
import { performOCR } from '@/lib/ocr-service';
import { aiReceipt } from '@/lib/ai-client';
import { pdfFirstPageToDataUrl, fileToDataUrl } from '@/lib/pdf-to-image';
import { db, Transaction } from '@/lib/db';
import { toast } from 'sonner';
import { Loader2, Camera, Upload, Sparkles, FileText, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AIConfirmationDialog, AIConfirmationData } from './AIConfirmationDialog';

interface ScanReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CONFIDENCE_THRESHOLD = 0.6;
const ACCEPTED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const ACCEPTED_EXT = /\.(jpe?g|png|pdf)$/i;

const mapPaymentMethod = (method: string | null | undefined): Transaction['paymentMethod'] => {
  if (!method) return 'unknown';
  const m = method.toLowerCase();
  if (m.includes('upi') || m.includes('gpay') || m.includes('phonepe') || m.includes('paytm') || m.includes('bhim')) return 'upi';
  if (m.includes('debit')) return 'debit_card';
  if (m.includes('credit') || m.includes('card') || m.includes('visa') || m.includes('mastercard') || m.includes('amex') || m.includes('rupay')) return 'credit_card';
  if (m.includes('net') || m.includes('bank') || m.includes('transfer')) return 'netbanking';
  if (m.includes('wallet')) return 'wallet';
  if (m.includes('atm')) return 'atm';
  if (m.includes('neft')) return 'neft';
  if (m.includes('rtgs')) return 'rtgs';
  if (m.includes('imps')) return 'imps';
  if (m.includes('cash')) return 'wallet';
  return 'unknown';
};

export const ScanReceiptDialog = ({ open, onOpenChange }: ScanReceiptDialogProps) => {
  const [processing, setProcessing] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [statusText, setStatusText] = useState('Processing receipt...');
  const [isDragging, setIsDragging] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<AIConfirmationData | null>(null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [pendingRaw, setPendingRaw] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processDataUrl = useCallback(async (dataUrl: string, sourceName: string, isPdf: boolean) => {
    setImageUrl(isPdf ? null : dataUrl);

    let amount: number | undefined;
    let vendor: string | undefined;
    let category = 'Other Expense';
    let dateStr: string | undefined;
    let items: string[] = [];
    let rawText = '';
    let confidence = 0.9;
    let paymentMethodStr: string | undefined;

    try {
      setStatusText(isPdf ? 'AI is reading your PDF...' : 'AI is reading your receipt...');
      const ai = await aiReceipt(dataUrl) as any;
      
      // Safe mapping layer to support all potential mismatches
      const parsedReceipt = {
        merchant: ai.merchantName ?? ai.merchant ?? ai.vendor,
        amount: typeof ai.amount === 'number' ? ai.amount : (typeof ai.totalAmount === 'number' ? ai.totalAmount : parseFloat(ai.amount || ai.totalAmount || '0')),
        date: ai.transactionDate ?? ai.date,
        category: ai.categoryName ?? ai.category,
        confidence: typeof ai.confidenceScore === 'number' ? ai.confidenceScore : (typeof ai.confidence === 'number' ? ai.confidence : parseFloat(ai.confidenceScore || ai.confidence || '1.0')),
        paymentMethod: ai.paymentMethod,
        items: ai.items || []
      };

      if (parsedReceipt.amount && parsedReceipt.amount > 0) {
        amount = parsedReceipt.amount;
        vendor = parsedReceipt.merchant ?? undefined;
        category = parsedReceipt.category || category;
        dateStr = parsedReceipt.date ?? undefined;
        items = parsedReceipt.items;
        confidence = parsedReceipt.confidence;
        paymentMethodStr = parsedReceipt.paymentMethod ?? undefined;
      }
    } catch (e: any) {
      console.warn('AI receipt failed, falling back to OCR:', e?.message);
    }

    if (!amount && !isPdf) {
      setStatusText('Falling back to on-device OCR...');
      const ocrResult = await performOCR(dataUrl);
      amount = ocrResult.amount;
      vendor = ocrResult.vendor;
      items = ocrResult.items || [];
      rawText = ocrResult.text;
      confidence = 0.5;
    }

    if (amount) {
      setConfirmData({
        type: 'expense',
        merchant: vendor || sourceName,
        amount,
        date: dateStr ? new Date(dateStr) : new Date(),
        category,
        source: 'receipt',
        confidence,
        rawText: rawText || (items.length ? items.join('\n') : undefined),
        paymentMethod: paymentMethodStr,
        items: items,
      });
      setPendingImage(dataUrl);
      setPendingRaw(rawText);
      setConfirmOpen(true);
    } else {
      toast.error('Unable to extract receipt data.');
    }
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (!ACCEPTED_MIME.includes(file.type) && !ACCEPTED_EXT.test(file.name)) {
      toast.error('Unsupported file. Use JPG, JPEG, PNG, or PDF.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error('File too large (max 15MB).');
      return;
    }
    try {
      setProcessing(true);
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      let dataUrl: string;
      if (isPdf) {
        setStatusText('Rendering PDF first page...');
        dataUrl = await pdfFirstPageToDataUrl(file);
      } else {
        setStatusText('Reading image...');
        dataUrl = await fileToDataUrl(file);
      }
      await processDataUrl(dataUrl, file.name.replace(/\.[^.]+$/, '') || 'Receipt', isPdf);
    } catch (err) {
      console.error('File processing error:', err);
      toast.error('Failed to process file');
    } finally {
      setProcessing(false);
      setImageUrl(null);
      setStatusText('Processing receipt...');
    }
  }, [processDataUrl]);

  const handleCapture = async (source: CameraSource) => {
    try {
      setProcessing(true);
      setStatusText('Capturing image...');
      const image = await CameraComponent.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source,
      });
      if (!image.dataUrl) {
        toast.error('Failed to capture image');
        return;
      }
      await processDataUrl(image.dataUrl, 'Receipt', false);
    } catch (error) {
      console.error('Camera error:', error);
      toast.error('Failed to process receipt');
    } finally {
      setProcessing(false);
      setImageUrl(null);
      setStatusText('Processing receipt...');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleConfirmSave = async (edited: AIConfirmationData) => {
    try {
      const lowConfidence = (edited.confidence ?? 1) < CONFIDENCE_THRESHOLD;
      
      const { normalizeMerchant } = await import('@/lib/merchant-intelligence/normalizeMerchant');
      const norm = normalizeMerchant(edited.merchant);
      
      const isManual = edited.merchant !== confirmData?.merchant || edited.category !== confirmData?.category;
      const categorySource: Transaction['merchantCategorySource'] = isManual
        ? 'manual'
        : (norm.isMatched ? 'dictionary' : 'llm');

      const transaction: Transaction = {
        type: edited.type,
        amount: edited.amount,
        description: norm.canonicalName || edited.merchant,
        category: edited.category,
        date: edited.date,
        source: 'receipt',
        rawData: pendingRaw,
        verified: !lowConfidence,
        verifiedVia: 'manual',
        confidence: edited.confidence,
        needsReview: lowConfidence,
        createdAt: new Date(),
        paymentMethod: mapPaymentMethod(edited.paymentMethod),
        merchantRaw: edited.merchant,
        merchantCanonical: norm.canonicalName || edited.merchant,
        merchantCategorySource: categorySource,
      };
      
      const transactionId = await db.transactions.add(transaction);
      
      if (pendingImage) {
        await db.receipts.add({
          imageUrl: pendingImage,
          transactionId,
          extractedData: {
            amount: edited.amount,
            vendor: edited.merchant,
            date: edited.date.toISOString(),
            items: edited.items,
          },
          createdAt: new Date(),
        });
      }
      
      toast.success(
        lowConfidence
          ? `Saved ₹${edited.amount} — flagged for review`
          : `Saved ₹${edited.amount} — ${edited.merchant}`
      );
      
      setConfirmData(null);
      setPendingImage(null);
      setPendingRaw('');
      setConfirmOpen(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save transaction:', error);
      toast.error('Failed to save transaction.');
      throw error;
    }
  };

  return (
    <>
      <Dialog open={open && !confirmOpen} onOpenChange={(val) => {
        if (!val) {
          onOpenChange(false);
        }
      }}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Scan or Upload Receipt
            </DialogTitle>
            <DialogDescription>
              Camera, image, or PDF — AI extracts merchant, amount, date, and category.
            </DialogDescription>
          </DialogHeader>

          {processing ? (
            <div className="flex flex-col items-center justify-center py-10">
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
                  <img src={imageUrl} alt="Receipt preview" className="w-full" />
                </div>
              )}

              {/* Drag & drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                aria-label="Drop a receipt file or click to browse"
                className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                  isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/60 hover:bg-accent/40'
                }`}
              >
                <div className="flex justify-center gap-2 mb-2 text-muted-foreground">
                  <ImageIcon className="w-5 h-5" />
                  <FileText className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium">
                  {isDragging ? 'Drop file here' : 'Drag & drop or click to upload'}
                </p>
                <div className="flex justify-center gap-1 mt-2 flex-wrap">
                  {['JPG', 'JPEG', 'PNG', 'PDF'].map((f) => (
                    <Badge key={f} variant="secondary" className="text-[10px]">{f}</Badge>
                  ))}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = '';
                  }}
                />
              </div>

              <div className="grid gap-2">
                <Button onClick={() => handleCapture(CameraSource.Camera)} className="w-full h-12">
                  <Camera className="w-4 h-4 mr-2" />
                  Take Photo
                </Button>
                <Button onClick={() => handleCapture(CameraSource.Photos)} variant="outline" className="w-full h-12">
                  <Upload className="w-4 h-4 mr-2" />
                  Choose from Gallery
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Low-confidence results are flagged for review before saving.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AIConfirmationDialog
        open={confirmOpen}
        onOpenChange={(val) => {
          setConfirmOpen(val);
          if (!val) {
            onOpenChange(false);
          }
        }}
        data={confirmData}
        onConfirm={handleConfirmSave}
        onDiscard={() => {
          setConfirmData(null);
          setPendingImage(null);
          setPendingRaw('');
          toast.info('Discarded');
          onOpenChange(false);
        }}
      />
    </>
  );
};
