export interface DocumentInput {
  base64Data: string;
  mimeType: string;
  fileName: string;
}

export interface OCRField<T = string> {
  value: T;
  confidence: number;
}

export interface OCRProduct {
  name: OCRField;
  quantity: OCRField<number>;
  unitPrice: OCRField<number>;
  totalLine: OCRField<number>;
  barcode?: OCRField;
  sku?: OCRField;
}

export interface OCRResult {
  supplier: OCRField;
  documentType: OCRField;
  documentNumber: OCRField;
  documentDate: OCRField;
  subtotal: OCRField<number>;
  tax: OCRField<number>;
  total: OCRField<number>;
  products: OCRProduct[];
  rawText?: string;
  provider: string;
  processedAt: string;
}

export interface DocumentOCRProvider {
  readonly name: string;
  processDocument(input: DocumentInput): Promise<OCRResult>;
  isAvailable(): Promise<boolean>;
}
