'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { toast, useConfirm } from '@/lib/feedback';
import { haptic } from '@/lib/haptic';
import { BarcodeScanner } from './BarcodeScanner';
import type {
  Purchase,
  PurchaseAlert,
  PurchaseFormState,
  PurchaseItem,
  PurchaseStats,
  ReceiptLineInput,
  Supplier,
  View,
} from './compras/types';
import { EMPTY_PURCHASE_FORM } from './compras/types';
import { compressImage, fileToBase64 } from './compras/helpers';
import { PurchaseList } from './compras/PurchaseList';
import { PurchaseForm } from './compras/PurchaseForm';
import { PurchaseDetail } from './compras/PurchaseDetail';
import { ReceiptForm } from './compras/ReceiptForm';
import { PurchaseReports } from './compras/PurchaseReports';
import { DocumentViewer } from './compras/DocumentViewer';

export function Compras({ token }: { token: string }) {
  const [view, setView] = useState<View>('list');
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stats, setStats] = useState<PurchaseStats>({ totalThisMonth: 0, countThisMonth: 0, pendingReceipt: 0, suppliersCount: 0 });
  const [alerts, setAlerts] = useState<PurchaseAlert[]>([]);

  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ status: '', search: '' });

  const [showScanner, setShowScanner] = useState(false);

  const docInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<PurchaseFormState>({ ...EMPTY_PURCHASE_FORM });
  const [formItems, setFormItems] = useState<PurchaseItem[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [itemResults, setItemResults] = useState<any[]>([]);
  const [showItemSearch, setShowItemSearch] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [receiptItems, setReceiptItems] = useState<ReceiptLineInput[]>([]);
  const [reports, setReports] = useState<any>(null);
  const [docViewerUrl, setDocViewerUrl] = useState('');
  const [docViewerName, setDocViewerName] = useState('');

  const confirmDialog = useConfirm();

  const loadPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.status) params.set('status', filter.status);
      if (filter.search) params.set('search', filter.search);
      const res = await apiFetch<any>(`/admin/purchases?${params}`, { token });
      setPurchases(res?.data || []);
    } catch {
      setPurchases([]);
    }
    setLoading(false);
  }, [token, filter]);

  const loadStats = useCallback(async () => {
    try {
      const res = await apiFetch<any>('/admin/purchases/stats', { token });
      if (res) setStats(res);
    } catch {}
  }, [token]);

  const loadSuppliers = useCallback(async () => {
    try {
      const res = await apiFetch<any>('/admin/purchases/suppliers', { token });
      if (Array.isArray(res)) setSuppliers(res);
    } catch {}
  }, [token]);

  const loadAlerts = useCallback(async () => {
    try {
      const res = await apiFetch<any>('/admin/purchases/alerts', { token });
      if (Array.isArray(res)) setAlerts(res);
    } catch {}
  }, [token]);

  const loadReports = useCallback(async () => {
    try {
      const res = await apiFetch<any>('/admin/purchases/reports', { token });
      if (res) setReports(res);
    } catch {}
  }, [token]);

  const viewDocument = useCallback(
    async (purchaseId: string, docId: string, fileName: string) => {
      try {
        const res = await apiFetch<any>(`/admin/purchases/${purchaseId}/documents/${docId}`, { token });
        if (res?.storagePath) {
          setDocViewerUrl(res.storagePath);
          setDocViewerName(fileName);
          setView('docViewer');
        }
      } catch {
        toast.error('Error al cargar documento');
      }
    },
    [token],
  );

  const loadPurchaseDetail = useCallback(
    async (id: string) => {
      try {
        const res = await apiFetch<any>(`/admin/purchases/${id}`, { token });
        if (res) {
          setSelectedPurchase(res);
          setView('detail');
        }
      } catch {
        toast.error('Error al cargar detalle');
      }
    },
    [token],
  );

  useEffect(() => {
    loadPurchases();
    loadStats();
    loadSuppliers();
    loadAlerts();
  }, [loadPurchases, loadStats, loadSuppliers, loadAlerts]);
  useEffect(() => {
    if (view === 'reports') loadReports();
  }, [view, loadReports]);

  const searchItems = useCallback(
    async (q: string) => {
      if (!q || q.length < 2) {
        setItemResults([]);
        return;
      }
      try {
        let items: any[] = [];
        if (/^\d{8,14}$/.test(q.trim())) {
          try {
            const byBarcode = await apiFetch<any>(`/products/barcode/${q.trim()}`, { token });
            if (byBarcode?.data) {
              const p = byBarcode.data;
              items = (p.variants || []).map((v: any) => ({
                productId: p.id,
                variantId: v.id,
                productName: p.name,
                variantName: v.variantName,
                sku: v.sku,
                barcode: v.barcode,
                costPrice: v.costPrice || p.costPrice || 0,
                imageUrl: v.imageUrl || p.imageUrl,
              }));
            }
          } catch {}
        }
        if (items.length === 0) {
          const res = await apiFetch<any>(`/products?search=${encodeURIComponent(q)}`, { token });
          items = (res?.data || res || []).flatMap((p: any) =>
            (p.variants || []).map((v: any) => ({
              productId: p.id,
              variantId: v.id,
              productName: p.name,
              variantName: v.variantName,
              sku: v.sku,
              barcode: v.barcode,
              costPrice: v.costPrice || p.costPrice || 0,
              imageUrl: v.imageUrl || p.imageUrl,
            })),
          );
        }
        setItemResults(items.slice(0, 10));
      } catch {
        setItemResults([]);
      }
    },
    [token],
  );

  const handleItemSearchChange = useCallback(
    (q: string) => {
      setItemSearch(q);
      searchItems(q);
    },
    [searchItems],
  );

  const handleBarcodeDetected = useCallback(
    (code: string) => {
      setShowScanner(false);
      toast.success(`Detectado: ${code}`);
      setItemSearch(code);
      searchItems(code);
      setShowItemSearch(true);
    },
    [searchItems],
  );

  const addItemToForm = (item: any) => {
    setFormItems((prev) => {
      const key = `${item.productId || ''}-${item.variantId || ''}-${item.sku || ''}`;
      const existing = prev.findIndex((i) => {
        const eKey = `${i.productId || ''}-${i.variantId || ''}-${i.sku || ''}`;
        return eKey === key;
      });
      if (existing >= 0) {
        toast.info(`Producto ya existe. Cantidad incrementada.`);
        return prev.map((i, idx) => (idx === existing ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          variantName: item.variantName,
          sku: item.sku,
          barcode: item.barcode,
          quantity: 1,
          unitCost: item.costPrice || 0,
          discount: 0,
          tax: 0,
          totalCost: item.costPrice || 0,
          receivedQty: 0,
        },
      ];
    });
    setShowItemSearch(false);
    setItemSearch('');
    setItemResults([]);
    haptic();
  };

  const updateFormItem = (idx: number, field: string, value: any) => {
    setFormItems((prev) => {
      const updated = [...prev];
      (updated as any)[idx] = { ...updated[idx], [field]: value };
      if (field === 'quantity' || field === 'unitCost' || field === 'discount' || field === 'tax') {
        const qty = field === 'quantity' ? value : updated[idx].quantity;
        const cost = field === 'unitCost' ? value : updated[idx].unitCost;
        const disc = field === 'discount' ? value : updated[idx].discount || 0;
        const tax = field === 'tax' ? value : updated[idx].tax || 0;
        updated[idx].totalCost = qty * cost - disc + tax;
      }
      return updated;
    });
  };

  const removeFormItem = (idx: number) => {
    setFormItems((prev) => prev.filter((_, i) => i !== idx));
    haptic();
  };

  const formTotal = formItems.reduce((s, i) => s + i.totalCost, 0);

  const handleCreate = useCallback(async () => {
    if (formItems.length === 0) {
      toast.error('Agrega al menos un producto');
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch<any>('/admin/purchases', {
        method: 'POST',
        body: {
          ...form,
          supplierId: form.supplierId || null,
          items: formItems.map((i) => ({
            productId: i.productId || null,
            variantId: i.variantId || null,
            productName: i.productName,
            variantName: i.variantName,
            sku: i.sku,
            barcode: i.barcode,
            quantity: i.quantity,
            unitCost: i.unitCost,
            discount: i.discount || 0,
            tax: i.tax || 0,
          })),
        },
        token,
      });
      haptic(80);
      toast.success(`Compra ${res?.purchaseNumber || ''} creada`);
      setForm({ ...EMPTY_PURCHASE_FORM });
      setFormItems([]);
      setView('list');
      loadPurchases();
      loadStats();
    } catch (err: any) {
      toast.error(err?.message || 'Error al crear compra');
    } finally {
      setSubmitting(false);
    }
  }, [token, form, formItems, loadPurchases, loadStats]);

  const handleConfirm = useCallback(
    async (id: string) => {
      const ok = await confirmDialog({
        title: 'Confirmar compra',
        message: 'Â¿Confirmar esta compra?',
        confirmLabel: 'Confirmar',
      });
      if (!ok) return;
      try {
        await apiFetch(`/admin/purchases/${id}/confirm`, { method: 'POST', token });
        haptic(80);
        toast.success('Compra confirmada');
        loadPurchaseDetail(id);
        loadPurchases();
      } catch (err: any) {
        toast.error(err?.message || 'Error al confirmar');
      }
    },
    [token, confirmDialog, loadPurchaseDetail, loadPurchases],
  );

  const handleCancel = useCallback(
    async (id: string) => {
      const ok = await confirmDialog({
        title: 'Anular compra',
        message: 'Â¿Anular esta compra?',
        confirmLabel: 'Anular',
        danger: true,
      });
      if (!ok) return;
      try {
        await apiFetch(`/admin/purchases/${id}/cancel`, { method: 'POST', token });
        haptic(80);
        toast.success('Compra anulada');
        loadPurchaseDetail(id);
        loadPurchases();
      } catch (err: any) {
        toast.error(err?.message || 'Error al anular');
      }
    },
    [token, confirmDialog, loadPurchaseDetail, loadPurchases],
  );

  const handleReceipt = useCallback(
    async (id: string) => {
      const items = receiptItems.filter((r) => r.receivedQty > 0 || r.damagedQty > 0);
      if (items.length === 0) {
        toast.error('Indica cantidades recibidas');
        return;
      }
      try {
        await apiFetch(`/admin/purchases/${id}/receipt`, {
          method: 'POST',
          body: { items },
          token,
        });
        haptic(80);
        toast.success('Recepción registrada');
        loadPurchaseDetail(id);
        setView('detail');
      } catch (err: any) {
        toast.error(err?.message || 'Error en recepción');
      }
    },
    [token, receiptItems, loadPurchaseDetail],
  );

  const handleUploadDocument = useCallback(
    async (id: string, file: File) => {
      try {
        const compressed = await compressImage(file);
        const base64 = await fileToBase64(compressed);
        await apiFetch(`/admin/purchases/${id}/documents`, {
          method: 'POST',
          body: {
            documentType: form.documentType || 'OTRO',
            fileName: compressed.name,
            originalName: file.name,
            mimeType: compressed.type,
            fileSize: compressed.size,
            base64Data: base64,
          },
          token,
        });
        haptic();
        toast.success('Documento adjuntado');
        loadPurchaseDetail(id);
      } catch (err: any) {
        toast.error(err?.message || 'Error al subir documento');
      }
    },
    [token, form.documentType, loadPurchaseDetail],
  );

  const handleOCR = useCallback(
    async (purchaseId: string) => {
      try {
        toast.info('Procesando OCR...');
        const res = await apiFetch<any>(`/admin/purchases/${purchaseId}/ocr`, { method: 'POST', token });
        if (res?.error) {
          toast.error(res.error);
        } else if (res?.ocr) {
          toast.success(`OCR completado (${Math.round((res.confidence || 0) * 100)}% confianza)`);
          loadPurchaseDetail(purchaseId);
        }
      } catch (err: any) {
        toast.error(err?.message || 'Error al procesar OCR');
      }
    },
    [token, loadPurchaseDetail],
  );

  const editCopy = useCallback(
    (p: Purchase) => {
      setFormItems(p.items.map((i) => ({ ...i })));
      setForm({
        ...form,
        supplierId: p.supplierId || '',
        documentType: p.documentType || 'BOLETA',
        documentNumber: p.documentNumber || '',
        documentDate: p.documentDate?.slice(0, 10) || '',
        paymentMethod: p.paymentMethod || 'EFECTIVO',
        notes: p.notes || '',
      });
      setView('create');
    },
    [form],
  );

  const startReceipt = useCallback((p: Purchase) => {
    const ocrQuantities: Record<string, number> = {};
    if (p.documents) {
      for (const doc of p.documents) {
        if (doc.ocrRawData?.products) {
          for (const op of doc.ocrRawData.products) {
            const name = (op.name?.value || '')
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '');
            const qty = Number(op.quantity?.value) || 0;
            if (name && qty > 0) ocrQuantities[name] = qty;
          }
        }
      }
    }
    setReceiptItems(
      p.items.map((i) => {
        const itemName = `${i.productName} ${i.variantName}`
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        let ocrQty = 0;
        for (const [key, val] of Object.entries(ocrQuantities)) {
          if (itemName.includes(key) || key.includes(itemName.split(' ')[0])) {
            ocrQty = val;
            break;
          }
        }
        const pending = i.quantity - i.receivedQty;
        return {
          purchaseItemId: i.id!,
          receivedQty: ocrQty > 0 ? Math.min(ocrQty, pending) : pending,
          damagedQty: 0,
          notes: ocrQty > 0 ? 'Auto OCR' : '',
        };
      }),
    );
    setSelectedPurchase(p);
    setView('receipt');
  }, []);

  const updateReceiptItem = useCallback(
    (idx: number, field: 'receivedQty' | 'damagedQty', value: number) => {
      setReceiptItems((prev) => {
        const u = [...prev];
        const item = selectedPurchase?.items.find((i) => i.id === u[idx]?.purchaseItemId);
        const pending = item ? item.quantity - item.receivedQty : Number.MAX_SAFE_INTEGER;
        u[idx] = {
          ...u[idx],
          [field]: field === 'receivedQty' ? Math.min(Math.max(0, value), pending) : Math.max(0, value),
        };
        return u;
      });
    },
    [selectedPurchase],
  );

  return (
    <>
      {/* Hidden file input always mounted so "Adjuntar doc" works from any view */}
      <input
        ref={docInputRef}
        type="file"
        accept="image/*,.pdf"
        className="sr-only"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file && selectedPurchase) await handleUploadDocument(selectedPurchase.id, file);
          e.target.value = '';
        }}
      />

      {showScanner && (
        <BarcodeScanner onDetect={handleBarcodeDetected} onClose={() => setShowScanner(false)} />
      )}

      {view === 'list' && (
        <PurchaseList
          purchases={purchases}
          stats={stats}
          alerts={alerts}
          filter={filter}
          onFilterChange={setFilter}
          loading={loading}
          onOpen={loadPurchaseDetail}
          onNew={() => setView('create')}
          onReports={() => setView('reports')}
        />
      )}

      {view === 'create' && (
        <PurchaseForm
          suppliers={suppliers}
          form={form}
          onFormChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
          formItems={formItems}
          itemSearch={itemSearch}
          onItemSearchChange={handleItemSearchChange}
          itemResults={itemResults}
          showItemSearch={showItemSearch}
          onToggleItemSearch={(v) => {
            setShowItemSearch(v);
            if (!v) setItemSearch('');
          }}
          onAddItem={addItemToForm}
          onUpdateItem={updateFormItem}
          onRemoveItem={removeFormItem}
          formTotal={formTotal}
          submitting={submitting}
          onSubmit={handleCreate}
          onBack={() => setView('list')}
          onScan={() => setShowScanner(true)}
        />
      )}

      {view === 'detail' && selectedPurchase && (
        <PurchaseDetail
          purchase={selectedPurchase}
          onBack={() => {
            setView('list');
            setSelectedPurchase(null);
          }}
          onEditCopy={() => editCopy(selectedPurchase)}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          onStartReceipt={() => startReceipt(selectedPurchase)}
          onAttachDoc={() => docInputRef.current?.click()}
          onOCR={handleOCR}
          onViewDoc={viewDocument}
        />
      )}

      {view === 'receipt' && selectedPurchase && (
        <ReceiptForm
          purchase={selectedPurchase}
          receiptItems={receiptItems}
          onReceiptChange={updateReceiptItem}
          onSubmit={handleReceipt}
          onBack={() => setView('detail')}
        />
      )}

      {view === 'reports' && <PurchaseReports reports={reports} onBack={() => setView('list')} />}

      {view === 'docViewer' && (
        <DocumentViewer url={docViewerUrl} name={docViewerName} onBack={() => setView('detail')} />
      )}
    </>
  );
}

export default Compras;
