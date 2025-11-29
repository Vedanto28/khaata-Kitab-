import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera as CameraComponent } from '@capacitor/camera';
import { CameraResultType, CameraSource } from '@capacitor/camera';
import { performOCR } from '@/lib/ocr-service';
import { db, Transaction } from '@/lib/db';
import { toast } from 'sonner';
import { Loader2, Camera, Upload } from 'lucide-react';

interface ScanReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ScanReceiptDialog = ({ open, onOpenChange }: ScanReceiptDialogProps) => {
  const [processing, setProcessing] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const handleCapture = async (source: CameraSource) => {
    try {
      setProcessing(true);
      
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
      
      // Perform OCR
      const ocrResult = await performOCR(image.dataUrl);
      
      if (ocrResult.amount) {
        // Create transaction from OCR result
        const transaction: Transaction = {
          type: 'expense', // Receipts are typically expenses
          amount: ocrResult.amount,
          description: ocrResult.vendor || 'Receipt',
          category: 'Other Expense',
          date: new Date(),
          source: 'receipt',
          rawData: ocrResult.text,
          createdAt: new Date(),
        };

        await db.transactions.add(transaction);
        
        // Store receipt
        await db.receipts.add({
          imageUrl: image.dataUrl,
          extractedData: {
            amount: ocrResult.amount,
            vendor: ocrResult.vendor,
            date: ocrResult.date,
            items: ocrResult.items,
          },
          createdAt: new Date(),
        });

        toast.success(`Receipt processed! Amount: ₹${ocrResult.amount}`);
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
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Scan Receipt</DialogTitle>
        </DialogHeader>

        {processing ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Processing receipt...</p>
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

            <p className="text-xs text-muted-foreground text-center">
              The app will automatically extract amount and details from your receipt
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
