'use client';

export type PurchaseItem = {
  id?: string;
  productId?: string;
  variantId?: string;
  productName: string;
  variantName?: string;
  sku?: string;
  barcode?: string;
  quantity: number;
  unitCost: number;
  discount?: number;
  tax?: number;
  totalCost: number;
  receivedQty: number;
  notes?: string;
};

export type Purchase = {
  id: string;
  purchaseNumber: string;
  supplierId?: string;
  supplier?: { id: string; name: string };
  status: string;
  documentType?: string;
  documentNumber?: string;
  documentDate?: string;
  paymentMethod?: string;
  currency: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes?: string;
  receiptStatus: string;
  receivedAt?: string;
  confirmedAt?: string;
  createdAt: string;
  items: PurchaseItem[];
  documents?: any[];
  receipts?: any[];
  _count?: { items: number; documents: number; receipts: number };
};

export type Supplier = { id: string; name: string; rut?: string };

export type PurchaseAlert = {
  type: string;
  severity: string;
  message: string;
  purchaseId?: string;
};

export type PurchaseStats = {
  totalThisMonth: number;
  countThisMonth: number;
  pendingReceipt: number;
  suppliersCount: number;
};

export type PurchaseFormState = {
  supplierId: string;
  documentType: string;
  documentNumber: string;
  documentDate: string;
  paymentMethod: string;
  notes: string;
};

export type ReceiptLineInput = {
  purchaseItemId: string;
  receivedQty: number;
  damagedQty: number;
  notes: string;
};

export type View = 'list' | 'create' | 'detail' | 'receipt' | 'reports' | 'docViewer';

export const EMPTY_PURCHASE_FORM: PurchaseFormState = {
  supplierId: '',
  documentType: 'BOLETA',
  documentNumber: '',
  documentDate: '',
  paymentMethod: 'EFECTIVO',
  notes: '',
};
