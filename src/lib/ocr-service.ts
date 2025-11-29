// On-device OCR using Tesseract.js via Transformers.js
// We'll use a lightweight approach for receipt text extraction

export interface OCRResult {
  text: string;
  amount?: number;
  vendor?: string;
  date?: string;
  items: string[];
  confidence: number;
}

export const performOCR = async (imageUrl: string): Promise<OCRResult> => {
  try {
    console.log('Starting OCR processing...');
    
    // In production, this would use Tesseract.js or ML Kit
    // For now, we'll simulate OCR processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock OCR result
    const mockResult: OCRResult = {
      text: 'Mock receipt text\nTotal: Rs 450.00\nVendor: ABC Store\nDate: 15/01/2025',
      amount: 450,
      vendor: 'ABC Store',
      date: '15/01/2025',
      items: ['Item 1 - Rs 200', 'Item 2 - Rs 250'],
      confidence: 0.85
    };
    
    return mockResult;
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error('Failed to process receipt image');
  }
};

export const extractAmountFromText = (text: string): number | undefined => {
  // Extract amount from OCR text
  const patterns = [
    /(?:total|amount|sum)[\s:]*(?:rs\.?|₹)?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    /(?:rs\.?|₹)\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return parseFloat(match[1].replace(/,/g, ''));
    }
  }
  
  return undefined;
};

export const extractDateFromText = (text: string): string | undefined => {
  const datePattern = /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/;
  const match = text.match(datePattern);
  return match ? match[1] : undefined;
};

export const extractVendorFromText = (text: string): string | undefined => {
  // Simple vendor extraction - usually at the top of receipt
  const lines = text.split('\n').filter(line => line.trim());
  return lines.length > 0 ? lines[0].trim() : undefined;
};
