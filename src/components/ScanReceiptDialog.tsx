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

    try {
      setStatusText(isPdf ? 'AI is reading your PDF...' : 'AI is reading your receipt...');
      const ai = await aiReceipt(dataUrl);
      if (ai.totalAmount) {
        amount = ai.totalAmount;
        vendor = ai.merchant ?? undefined;
        category = ai.category || category;
        dateStr = ai.date ?? undefined;
        items = ai.items || [];
        confidence = typeof ai.confidence === 'number' ? ai.confidence : 0.85;
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
      });
      setPendingImage(dataUrl);
      setPendingRaw(rawText);
      setConfirmOpen(true);
      onOpenChange(false);
    } else {
      toast.error('Could not extract amount from receipt');
    }
  }, [onOpenChange]);

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
    const lowConfidence = (edited.confidence ?? 1) < CONFIDENCE_THRESHOLD;
    const transaction: Transaction = {
      type: edited.type,
      amount: edited.amount,
      description: edited.merchant,
      category: edited.category,
      date: edited.date,
      source: 'receipt',
      rawData: pendingRaw,
      verified: !lowConfidence,
      verifiedVia: 'manual',
      confidence: edited.confidence,
      needsReview: lowConfidence,
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
    toast.success(
      lowConfidence
        ? `Saved ₹${edited.amount} — flagged for review`
        : `Saved ₹${edited.amount} — ${edited.merchant}`
    );
    setConfirmData(null);
    setPendingImage(null);
    setPendingRaw('');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
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
