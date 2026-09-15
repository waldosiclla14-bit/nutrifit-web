'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { toast } from '@/lib/feedback';
import {
  Camera, X, Plus, Minus, Trash2, Barcode, FileImage, FileText, ImageIcon, Zap, Scan,
  Package, CheckCircle, Clock, AlertTriangle, ChevronDown, ChevronRight, Eye, Send,
  RotateCcw, Search, Filter, FilePlus, Truck, ClipboardCheck, History, BarChart3, ArrowLeft,
} from 'lucide-react';

type PurchaseItem = {
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

type Purchase = {
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

type Supplier = { id: string; name: string; rut?: string };

function haptic(ms = 30) {
  try { navigator.vibrate?.(ms); } catch {}
}

let Html5QrcodeCtor: any = null;
async function getHtml5Qrcode() {
  if (Html5QrcodeCtor) return Html5QrcodeCtor;
  const mod = await import('html5-qrcode');
  Html5QrcodeCtor = mod.Html5Qrcode;
  return Html5QrcodeCtor;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function compressImage(file: File, maxDim = 1600, quality = 0.8): Promise<File> {
  if (!file.type.startsWith('image/') || file.size < 500000) return file;
  try {
    const bmp = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    let w = bmp.width, h = bmp.height;
    if (w > maxDim || h > maxDim) {
      const ratio = Math.min(maxDim / w, maxDim / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', quality));
    return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

type View = 'list' | 'create' | 'detail' | 'receipt' | 'reports' | 'docViewer';

export function Compras({ token }: { token: string }) {
  const [view, setView] = useState<View>('list');
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stats, setStats] = useState({ totalThisMonth: 0, countThisMonth: 0, pendingReceipt: 0, suppliersCount: 0 });
  const [alerts, setAlerts] = useState<Array<{ type: string; severity: string; message: string; purchaseId?: string }>>([]);

  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ status: '', search: '' });

  const [showScanner, setShowScanner] = useState(false);
  const [scannerStatus, setScannerStatus] = useState('');
  const scannedOnceRef = useRef<Set<string>>(new Set());

  const docInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    supplierId: '',
    documentType: 'BOLETA',
    documentNumber: '',
    documentDate: '',
    paymentMethod: 'EFECTIVO',
    notes: '',
  });
  const [formItems, setFormItems] = useState<PurchaseItem[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [itemResults, setItemResults] = useState<any[]>([]);
  const [showItemSearch, setShowItemSearch] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [receiptItems, setReceiptItems] = useState<Array<{ purchaseItemId: string; receivedQty: number; damagedQty: number; notes: string }>>([]);
  const [reports, setReports] = useState<any>(null);
  const [docViewerUrl, setDocViewerUrl] = useState('');
  const [docViewerName, setDocViewerName] = useState('');

  const loadPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.status) params.set('status', filter.status);
      if (filter.search) params.set('search', filter.search);
      const res = await apiFetch<any>(`/admin/purchases?${params}`, { token });
      setPurchases(res?.data || []);
    } catch { setPurchases([]); }
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

  const viewDocument = useCallback(async (purchaseId: string, docId: string, fileName: string) => {
    try {
      const res = await apiFetch<any>(`/admin/purchases/${purchaseId}/documents/${docId}`, { token });
      if (res?.storagePath) {
        setDocViewerUrl(res.storagePath);
        setDocViewerName(fileName);
        setView('docViewer');
      }
    } catch { toast.error('Error al cargar documento'); }
  }, [token]);

  const loadPurchaseDetail = useCallback(async (id: string) => {
    try {
      const res = await apiFetch<any>(`/admin/purchases/${id}`, { token });
      if (res) {
        setSelectedPurchase(res);
        setView('detail');
      }
    } catch { toast.error('Error al cargar detalle'); }
  }, [token]);

  useEffect(() => { loadPurchases(); loadStats(); loadSuppliers(); loadAlerts(); }, [loadPurchases, loadStats, loadSuppliers, loadAlerts]);
  useEffect(() => { if (view === 'reports') loadReports(); }, [view, loadReports]);

  const searchItems = useCallback(async (q: string) => {
    if (!q || q.length < 2) { setItemResults([]); return; }
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
          }))
        );
      }
      setItemResults(items.slice(0, 10));
    } catch { setItemResults([]); }
  }, [token]);

  const addItemToForm = (item: any) => {
    setFormItems((prev) => [...prev, {
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
    }]);
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
        const disc = field === 'discount' ? value : (updated[idx].discount || 0);
        const tax = field === 'tax' ? value : (updated[idx].tax || 0);
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
    if (formItems.length === 0) { toast.error('Agrega al menos un producto'); return; }
    setSubmitting(true);
    try {
      const res = await apiFetch<any>('/admin/purchases', {
        method: 'POST',
        body: JSON.stringify({
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
        }),
        token,
      });
      haptic(80);
      toast.success(`Compra ${res?.purchaseNumber || ''} creada`);
      setForm({ supplierId: '', documentType: 'BOLETA', documentNumber: '', documentDate: '', paymentMethod: 'EFECTIVO', notes: '' });
      setFormItems([]);
      setView('list');
      loadPurchases();
      loadStats();
    } catch (err: any) {
      toast.error(err?.message || 'Error al crear compra');
    } finally { setSubmitting(false); }
  }, [token, form, formItems, loadPurchases, loadStats]);

  const handleConfirm = useCallback(async (id: string) => {
    if (!confirm('Confirmar compra?')) return;
    try {
      await apiFetch(`/admin/purchases/${id}/confirm`, { method: 'POST', token });
      haptic(80);
      toast.success('Compra confirmada');
      loadPurchaseDetail(id);
      loadPurchases();
    } catch (err: any) {
      toast.error(err?.message || 'Error al confirmar');
    }
  }, [token, loadPurchaseDetail, loadPurchases]);

  const handleCancel = useCallback(async (id: string) => {
    if (!confirm('Anular esta compra?')) return;
    try {
      await apiFetch(`/admin/purchases/${id}/cancel`, { method: 'POST', token });
      haptic(80);
      toast.success('Compra anulada');
      loadPurchaseDetail(id);
      loadPurchases();
    } catch (err: any) {
      toast.error(err?.message || 'Error al anular');
    }
  }, [token, loadPurchaseDetail, loadPurchases]);

  const handleReceipt = useCallback(async (id: string) => {
    const items = receiptItems.filter((r) => r.receivedQty > 0 || r.damagedQty > 0);
    if (items.length === 0) { toast.error('Indica cantidades recibidas'); return; }
    try {
      await apiFetch(`/admin/purchases/${id}/receipt`, {
        method: 'POST',
        body: JSON.stringify({ items }),
        token,
      });
      haptic(80);
      toast.success('Recepcion registrada');
      loadPurchaseDetail(id);
      setView('detail');
    } catch (err: any) {
      toast.error(err?.message || 'Error en recepcion');
    }
  }, [token, receiptItems, loadPurchaseDetail]);

  const handleUploadDocument = useCallback(async (id: string, file: File) => {
    try {
      const compressed = await compressImage(file);
      const base64 = await fileToBase64(compressed);
      await apiFetch(`/admin/purchases/${id}/documents`, {
        method: 'POST',
        body: JSON.stringify({
          documentType: form.documentType || 'OTRO',
          fileName: compressed.name,
          originalName: file.name,
          mimeType: compressed.type,
          fileSize: compressed.size,
          base64Data: base64,
        }),
        token,
      });
      haptic();
      toast.success('Documento adjuntado');
      loadPurchaseDetail(id);
    } catch (err: any) {
      toast.error(err?.message || 'Error al subir documento');
    }
  }, [token, form.documentType, loadPurchaseDetail]);

  const handleOCR = useCallback(async (purchaseId: string) => {
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
  }, [token, loadPurchaseDetail]);

  const openScanner = useCallback(() => {
    scannedOnceRef.current.clear();
    setShowScanner(true);
    setScannerStatus('Iniciando camara...');
  }, []);

  useEffect(() => {
    if (!showScanner) return;
    let scanner: any = null;
    let closed = false;

    const start = async () => {
      try {
        const Html5Qrcode = await getHtml5Qrcode();
        if (closed) return;
        scanner = new Html5Qrcode('compras-barcode-scanner');
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 280, height: 120 },
            aspectRatio: 1.5,
            useBarCodeDetectorIfSupported: false,
            disableFlip: false,
          },
          (decodedText: string) => {
            if (!closed && !scannedOnceRef.current.has(decodedText)) {
              scannedOnceRef.current.add(decodedText);
              closed = true;
              scanner.stop().catch(() => {});
              toast.success(`Detectado: ${decodedText}`);
              setShowScanner(false);
              setItemSearch(decodedText);
              searchItems(decodedText);
              setShowItemSearch(true);
            }
          },
          () => {},
        );
        setScannerStatus('Apunta al codigo de barras');
        try {
          const el = document.getElementById('compras-barcode-scanner');
          const video = el?.querySelector('video');
          if (video) {
            const stream = video.srcObject as MediaStream;
            const track = stream?.getVideoTracks()[0];
            if (track) await track.applyConstraints({ advanced: [{ width: 1280, height: 720, focusMode: 'continuous' }] as any[] });
          }
        } catch {}
      } catch (err: any) {
        if (!closed) setScannerStatus(`Error: ${err?.message || 'No se pudo acceder a la camara'}`);
      }
    };

    start();

    return () => {
      closed = true;
      if (scanner) {
        scanner.stop().catch(() => {});
        scanner.clear().catch(() => {});
      }
    };
  }, [showScanner]);

  const stopScanner = useCallback(() => {
    setShowScanner(false);
  }, []);

  const statusColor = (s: string) => {
    switch (s) {
      case 'DRAFT': return 'bg-gray-100 text-gray-600';
      case 'PENDING_REVIEW': return 'bg-amber-100 text-amber-600';
      case 'CONFIRMED': return 'bg-blue-100 text-blue-600';
      case 'RECEIVING': return 'bg-purple-100 text-purple-600';
      case 'RECEIVED': return 'bg-green-100 text-green-600';
      case 'CANCELLED': return 'bg-red-100 text-red-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case 'DRAFT': return 'Borrador';
      case 'PENDING_REVIEW': return 'Pendiente revision';
      case 'CONFIRMED': return 'Confirmada';
      case 'RECEIVING': return 'Recibiendo';
      case 'RECEIVED': return 'Recibida';
      case 'CANCELLED': return 'Anulada';
      default: return s;
    }
  };

  if (showScanner) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col">
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
          <span className="text-white text-sm font-semibold">{scannerStatus}</span>
          <button onClick={stopScanner} className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
            <X className="h-5 w-5 text-white" />
          </button>
        </div>
        <div className="flex-1">
          <div id="compras-barcode-scanner" className="w-full h-full [&>div]:!h-full" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent text-center">
          <p className="text-white/70 text-xs mb-4">Mantén el barcode dentro del recuadro</p>
          <button onClick={stopScanner} className="px-6 py-3 rounded-xl bg-white/20 text-white text-sm font-semibold">Cancelar</button>
        </div>
      </div>
    );
  }

  if (view === 'create') {
    return (
      <div className="space-y-4">
        <input ref={docInputRef} type="file" accept="image/*,.pdf" className="sr-only" onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file && selectedPurchase) await handleUploadDocument(selectedPurchase.id, file);
          e.target.value = '';
        }} />

        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setView('list')} className="text-muted"><X className="h-5 w-5" /></button>
          <h2 className="text-lg font-bold text-ink">Nueva compra</h2>
        </div>

        <div className="bg-paper rounded-xl p-4 border border-line space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-muted uppercase tracking-widest mb-1">Proveedor</label>
              <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} className="w-full rounded-xl border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-accent">
                <option value="">Sin proveedor</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-muted uppercase tracking-widest mb-1">Tipo documento</label>
              <select value={form.documentType} onChange={(e) => setForm({ ...form, documentType: e.target.value })} className="w-full rounded-xl border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-accent">
                <option value="BOLETA">Boleta</option>
                <option value="FACTURA">Factura</option>
                <option value="NOTA_VENTA">Nota de venta</option>
                <option value="GUIA_DESPACHO">Guia despacho</option>
                <option value="ORDEN_COMPRA">Orden compra</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-muted uppercase tracking-widest mb-1">N documento</label>
              <input type="text" value={form.documentNumber} onChange={(e) => setForm({ ...form, documentNumber: e.target.value })} className="w-full rounded-xl border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-accent" placeholder="001245" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-muted uppercase tracking-widest mb-1">Fecha</label>
              <input type="date" value={form.documentDate} onChange={(e) => setForm({ ...form, documentDate: e.target.value })} className="w-full rounded-xl border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-accent" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted uppercase tracking-widest mb-1">Metodo de pago</label>
            <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="w-full rounded-xl border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-accent">
              <option value="EFECTIVO">Efectivo</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="TARJETA">Tarjeta</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted uppercase tracking-widest mb-1">Observaciones</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full rounded-xl border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-accent min-h-[60px]" placeholder="Notas adicionales..." />
          </div>
        </div>

        <div className="bg-paper rounded-xl p-4 border border-line">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-ink">Productos ({formItems.length})</h3>
            <div className="flex gap-2">
              <button onClick={openScanner} className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl bg-accent text-ink">
                <Scan className="h-3.5 w-3.5" /> Escanear
              </button>
              <button onClick={() => setShowItemSearch(true)} className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl bg-ink text-paper">
                <Plus className="h-3.5 w-3.5" /> Agregar
              </button>
            </div>
          </div>

          {showItemSearch && (
            <div className="mb-3 p-3 rounded-xl bg-soft border border-line">
              <div className="flex gap-2">
                <input type="text" value={itemSearch} onChange={(e) => { setItemSearch(e.target.value); searchItems(e.target.value); }} className="flex-1 rounded-xl border border-line px-3 py-2 text-sm focus:outline-none focus:border-accent" placeholder="Buscar producto o escanear barcode..." autoFocus />
                <button onClick={() => { setShowItemSearch(false); setItemSearch(''); }} className="text-muted"><X className="h-4 w-4" /></button>
              </div>
              {itemResults.length > 0 && (
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                  {itemResults.map((r, i) => (
                    <button key={i} onClick={() => addItemToForm(r)} className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white text-left">
                      <Package className="h-4 w-4 text-muted shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-ink truncate">{r.productName} - {r.variantName}</p>
                        <p className="text-[10px] text-muted">SKU: {r.sku} | ${r.costPrice?.toLocaleString()}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {formItems.length === 0 && (
            <div className="p-6 border-2 border-dashed border-line rounded-xl text-center">
              <Package className="h-10 w-10 mx-auto text-accent mb-2" />
              <p className="text-sm text-ink font-semibold">Sin productos</p>
              <p className="text-xs text-muted mt-1">Toca &quot;Escanear&quot; o &quot;Agregar&quot;</p>
            </div>
          )}

          {formItems.length > 0 && (
            <div className="space-y-2">
              {formItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl bg-soft border border-line">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-ink truncate">{item.productName}</p>
                    {item.variantName && <p className="text-[10px] text-muted truncate">{item.variantName}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => updateFormItem(idx, 'quantity', Math.max(1, item.quantity - 1))} className="h-7 w-7 rounded-lg bg-white border border-line flex items-center justify-center"><Minus className="h-3 w-3" /></button>
                    <input type="number" min="1" value={item.quantity} onChange={(e) => updateFormItem(idx, 'quantity', parseInt(e.target.value, 10) || 1)} className="w-10 text-center text-xs font-bold border-0 bg-transparent" />
                    <button type="button" onClick={() => updateFormItem(idx, 'quantity', item.quantity + 1)} className="h-7 w-7 rounded-lg bg-white border border-line flex items-center justify-center"><Plus className="h-3 w-3" /></button>
                  </div>
                  <input type="number" min="0" value={item.unitCost} onChange={(e) => updateFormItem(idx, 'unitCost', parseInt(e.target.value, 10) || 0)} className="w-16 rounded-lg border border-line px-1.5 py-1 text-[11px] text-right focus:outline-none focus:border-accent font-mono" placeholder="$" />
                  <span className="text-[10px] font-bold text-accent w-14 text-right shrink-0">${item.totalCost.toLocaleString()}</span>
                  <button type="button" onClick={() => removeFormItem(idx)} className="text-red-400 active:text-red-600 shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          )}

          {formItems.length > 0 && (
            <div className="mt-3 pt-3 border-t border-line flex items-center justify-between">
              <span className="text-lg font-bold text-ink">${formTotal.toLocaleString()}</span>
              <button onClick={handleCreate} disabled={submitting} className="btn-accent text-sm min-h-[44px] px-6 active:scale-[0.98] transition-transform">
                {submitting ? 'Creando...' : 'Crear compra'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === 'detail' && selectedPurchase) {
    const p = selectedPurchase;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => { setView('list'); setSelectedPurchase(null); }} className="text-muted"><X className="h-5 w-5" /></button>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-ink">{p.purchaseNumber}</h2>
            <p className="text-[10px] text-muted">{p.supplier?.name || 'Sin proveedor'} | {p.createdAt?.slice(0, 10)}</p>
          </div>
          <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${statusColor(p.status)}`}>{statusLabel(p.status)}</span>
        </div>

        <div className="bg-paper rounded-xl p-4 border border-line">
          <h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-2">Documento</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-muted">Tipo:</span> <span className="font-semibold">{p.documentType || '-'}</span></div>
            <div><span className="text-muted">N:</span> <span className="font-semibold">{p.documentNumber || '-'}</span></div>
            <div><span className="text-muted">Fecha:</span> <span className="font-semibold">{p.documentDate?.slice(0, 10) || '-'}</span></div>
            <div><span className="text-muted">Pago:</span> <span className="font-semibold">{p.paymentMethod || '-'}</span></div>
          </div>
          {p.notes && <p className="text-xs text-muted mt-2">{p.notes}</p>}
        </div>

        <div className="bg-paper rounded-xl p-4 border border-line">
          <h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-2">Productos ({p.items.length})</h3>
          <div className="space-y-2">
            {p.items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl bg-soft border border-line">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-ink truncate">{item.productName}</p>
                  {item.variantName && <p className="text-[10px] text-muted truncate">{item.variantName}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-muted">x{item.quantity} @ ${item.unitCost.toLocaleString()}</p>
                  <p className="text-[10px] font-bold text-accent">${item.totalCost.toLocaleString()}</p>
                </div>
                {item.receivedQty > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-600 font-semibold">
                    {item.receivedQty}/{item.quantity}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-line flex items-center justify-between">
            <div className="text-xs text-muted">
              <span>Subtotal: ${p.subtotal.toLocaleString()}</span>
              {p.tax > 0 && <span className="ml-2">IVA: ${p.tax.toLocaleString()}</span>}
              {p.discount > 0 && <span className="ml-2">Desc: -${p.discount.toLocaleString()}</span>}
            </div>
            <span className="text-lg font-bold text-ink">${p.total.toLocaleString()}</span>
          </div>
        </div>

        {p.documents && p.documents.length > 0 && (
          <div className="bg-paper rounded-xl p-4 border border-line">
            <h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-2">Documentos ({p.documents.length})</h3>
            <div className="space-y-1">
              {p.documents.map((doc: any) => (
                <div key={doc.id} className="flex items-center gap-2 p-2 rounded-lg bg-soft text-xs">
                  <FileText className="h-4 w-4 text-muted" />
                  <span className="flex-1 truncate">{doc.fileName}</span>
                  <span className="text-muted">{(doc.fileSize / 1024).toFixed(0)}KB</span>
                  {doc.ocrProcessed ? (
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <button onClick={() => handleOCR(p.id)} className="text-accent font-semibold underline whitespace-nowrap">Ejecutar OCR</button>
                  )}
                  <button onClick={() => viewDocument(p.id, doc.id, doc.fileName)} className="text-accent font-semibold underline">Ver</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {p.receipts && p.receipts.length > 0 && (
          <div className="bg-paper rounded-xl p-4 border border-line">
            <h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-2">Recepciones ({p.receipts.length})</h3>
            <div className="space-y-2">
              {p.receipts.map((r: any) => (
                <div key={r.id} className="p-2.5 rounded-xl bg-soft border border-line text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold">{r.receiptNumber}</span>
                    <span className={`px-2 py-0.5 rounded-full font-semibold ${r.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : r.status === 'PARTIAL' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-600'}`}>
                      {r.status === 'COMPLETED' ? 'Completa' : r.status === 'PARTIAL' ? 'Parcial' : 'Pendiente'}
                    </span>
                  </div>
                  <p className="text-muted">{r.receivedAt?.slice(0, 10)}</p>
                  {r.items && (
                    <div className="mt-1 space-y-0.5">
                      {r.items.map((ri: any) => (
                        <p key={ri.id} className="text-muted">
                          {ri.purchaseItem?.productName}: {ri.receivedQty}/{ri.expectedQty}
                          {ri.damagedQty > 0 && <span className="text-red-500"> ({ri.damagedQty} danado)</span>}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-paper rounded-xl p-4 border border-line">
          <h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-3">Acciones</h3>
          <div className="flex flex-wrap gap-2">
            {p.status === 'DRAFT' && (
              <button onClick={() => { setFormItems(p.items.map((i) => ({ ...i }))); setForm({ ...form, supplierId: p.supplierId || '', documentType: p.documentType || 'BOLETA', documentNumber: p.documentNumber || '', documentDate: p.documentDate?.slice(0, 10) || '', paymentMethod: p.paymentMethod || 'EFECTIVO', notes: p.notes || '' }); setView('create'); }} className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl bg-soft border border-line">
                <RotateCcw className="h-3.5 w-3.5" /> Editar
              </button>
            )}
            {p.status === 'DRAFT' && (
              <button onClick={() => handleConfirm(p.id)} className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl bg-blue-500 text-white">
                <Send className="h-3.5 w-3.5" /> Confirmar
              </button>
            )}
            {p.status === 'CONFIRMED' && (
              <button onClick={() => {
                const ocrQuantities: Record<string, number> = {};
                if (p.documents) {
                  for (const doc of p.documents) {
                    if (doc.ocrRawData?.products) {
                      for (const op of doc.ocrRawData.products) {
                        const name = (op.name?.value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                        const qty = Number(op.quantity?.value) || 0;
                        if (name && qty > 0) ocrQuantities[name] = qty;
                      }
                    }
                  }
                }
                setReceiptItems(p.items.map((i) => {
                  const itemName = `${i.productName} ${i.variantName}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                  let ocrQty = 0;
                  for (const [key, val] of Object.entries(ocrQuantities)) {
                    if (itemName.includes(key) || key.includes(itemName.split(' ')[0])) {
                      ocrQty = val;
                      break;
                    }
                  }
                  const pending = i.quantity - i.receivedQty;
                  return { purchaseItemId: i.id!, receivedQty: ocrQty > 0 ? Math.min(ocrQty, pending) : pending, damagedQty: 0, notes: ocrQty > 0 ? 'Auto OCR' : '' };
                }));
                setSelectedPurchase(p);
                setView('receipt');
              }} className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl bg-green-500 text-white">
                <Truck className="h-3.5 w-3.5" /> Recepcionar
              </button>
            )}
            {p.status !== 'CANCELLED' && p.status !== 'RECEIVED' && (
              <button onClick={() => handleCancel(p.id)} className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl bg-red-100 text-red-600">
                <X className="h-3.5 w-3.5" /> Anular
              </button>
            )}
            <button onClick={() => docInputRef.current?.click()} className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl bg-soft border border-line">
              <FilePlus className="h-3.5 w-3.5" /> Adjuntar doc
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'receipt' && selectedPurchase) {
    const p = selectedPurchase;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setView('detail')} className="text-muted"><X className="h-5 w-5" /></button>
          <h2 className="text-lg font-bold text-ink">Recepcion - {p.purchaseNumber}</h2>
        </div>

        <div className="bg-paper rounded-xl p-4 border border-line">
          <h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-3">Cantidades recibidas</h3>
          <div className="space-y-3">
            {receiptItems.map((ri, idx) => {
              const item = p.items.find((i) => i.id === ri.purchaseItemId);
              if (!item) return null;
              const pending = item.quantity - item.receivedQty;
              return (
                <div key={idx} className="p-3 rounded-xl bg-soft border border-line">
                  <p className="text-[11px] font-semibold text-ink mb-2">{item.productName} - {item.variantName}</p>
                  <p className="text-[10px] text-muted mb-2">Pendiente: {pending} unidades</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-[10px] text-muted">Recibidas</label>
                      <input type="number" min="0" max={pending} value={ri.receivedQty} onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 0;
                        setReceiptItems((prev) => { const u = [...prev]; u[idx].receivedQty = Math.min(val, pending); return u; });
                      }} className="w-full rounded-lg border border-line px-2 py-1.5 text-sm focus:outline-none focus:border-accent" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-muted">Danados</label>
                      <input type="number" min="0" value={ri.damagedQty} onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 0;
                        setReceiptItems((prev) => { const u = [...prev]; u[idx].damagedQty = val; return u; });
                      }} className="w-full rounded-lg border border-line px-2 py-1.5 text-sm focus:outline-none focus:border-accent" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4">
            <button onClick={() => handleReceipt(p.id)} className="w-full btn-accent text-sm min-h-[48px] active:scale-[0.98] transition-transform">
              Confirmar recepcion
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'docViewer') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setView('detail')} className="p-2 rounded-xl hover:bg-soft active:scale-95 transition-all"><ArrowLeft className="h-5 w-5" /></button>
          <h2 className="text-lg font-bold text-ink truncate">{docViewerName}</h2>
        </div>
        <div className="bg-paper rounded-xl border border-line overflow-hidden">
          {docViewerUrl.startsWith('data:application/pdf') ? (
            <iframe src={docViewerUrl} className="w-full h-[70vh]" title={docViewerName} />
          ) : (
            <img src={docViewerUrl} alt={docViewerName} className="w-full object-contain max-h-[70vh]" />
          )}
        </div>
      </div>
    );
  }

  if (view === 'reports') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setView('list')} className="p-2 rounded-xl hover:bg-soft active:scale-95 transition-all"><ArrowLeft className="h-5 w-5" /></button>
          <h2 className="text-lg font-bold text-ink">Reportes de Compras</h2>
        </div>

        {reports && (
          <>
            <div className="bg-paper rounded-xl p-4 border border-line">
              <h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-3">Por Proveedor</h3>
              {reports.bySupplier.length === 0 ? (
                <p className="text-xs text-muted">Sin datos</p>
              ) : (
                <div className="space-y-2">
                  {reports.bySupplier.map((s: any) => (
                    <div key={s.supplierId} className="flex items-center justify-between text-xs">
                      <span className="truncate">{s.supplierName}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-muted">{s.count} compras</span>
                        <span className="font-bold text-accent">${s.total.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-paper rounded-xl p-4 border border-line">
              <h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-3">Productos Mas Comprados</h3>
              {reports.byProduct.length === 0 ? (
                <p className="text-xs text-muted">Sin datos</p>
              ) : (
                <div className="space-y-2">
                  {reports.byProduct.slice(0, 10).map((p: any) => (
                    <div key={p.productId} className="flex items-center justify-between text-xs">
                      <span className="truncate">{p.productName}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-muted">{Number(p.quantity).toLocaleString()} unid.</span>
                        <span className="font-bold text-ink">${Number(p.totalCost).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {reports.monthlyTrend.length > 0 && (
              <div className="bg-paper rounded-xl p-4 border border-line">
                <h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-3">Tendencia Mensual</h3>
                <div className="space-y-2">
                  {reports.monthlyTrend.map((m: any) => (
                    <div key={m.month} className="flex items-center justify-between text-xs">
                      <span className="text-muted">{m.month}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-muted">{m.count} compras</span>
                        <span className="font-bold text-accent">${m.total.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-ink">Compras</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setView('reports')} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2.5 rounded-xl bg-soft border border-line text-ink active:scale-[0.97]">
            <BarChart3 className="h-4 w-4" /> Reportes
          </button>
          <button onClick={() => setView('create')} className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl bg-accent text-ink active:scale-[0.97]">
            <Plus className="h-4 w-4" /> Nueva
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-paper rounded-xl p-3 border border-line text-center">
          <p className="text-lg font-bold text-accent">${stats.totalThisMonth.toLocaleString()}</p>
          <p className="text-[10px] text-muted">Compras mes</p>
        </div>
        <div className="bg-paper rounded-xl p-3 border border-line text-center">
          <p className="text-lg font-bold text-ink">{stats.countThisMonth}</p>
          <p className="text-[10px] text-muted">Transacciones</p>
        </div>
        <div className="bg-paper rounded-xl p-3 border border-line text-center">
          <p className="text-lg font-bold text-ink">{stats.suppliersCount}</p>
          <p className="text-[10px] text-muted">Proveedores</p>
        </div>
        <div className="bg-paper rounded-xl p-3 border border-line text-center">
          <p className="text-lg font-bold text-amber-500">{stats.pendingReceipt}</p>
          <p className="text-[10px] text-muted">Pendientes recepcion</p>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-1.5">
          {alerts.slice(0, 5).map((a, i) => (
            <div key={i} className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs ${
              a.severity === 'critical' ? 'bg-red-50 border-red-200 text-red-700' :
              a.severity === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' :
              'bg-blue-50 border-blue-200 text-blue-700'
            }`}>
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1">{a.message}</span>
              {a.purchaseId && (
                <button onClick={() => loadPurchaseDetail(a.purchaseId!)} className="text-[10px] font-semibold underline shrink-0">Ver</button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input type="text" value={filter.search} onChange={(e) => setFilter({ ...filter, search: e.target.value })} className="w-full rounded-xl border border-line pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-accent" placeholder="Buscar..." />
        </div>
        <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })} className="rounded-xl border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-accent">
          <option value="">Todos</option>
          <option value="DRAFT">Borrador</option>
          <option value="PENDING_REVIEW">Pendiente</option>
          <option value="CONFIRMED">Confirmada</option>
          <option value="RECEIVING">Recibiendo</option>
          <option value="RECEIVED">Recibida</option>
          <option value="CANCELLED">Anulada</option>
        </select>
      </div>

      {loading && <p className="text-xs text-muted text-center py-4">Cargando...</p>}

      {!loading && purchases.length === 0 && (
        <div className="p-8 border-2 border-dashed border-line rounded-xl text-center">
          <Package className="h-10 w-10 mx-auto text-accent mb-2" />
          <p className="text-sm text-ink font-semibold">Sin compras</p>
          <p className="text-xs text-muted mt-1">Toca &quot;Nueva&quot; para crear</p>
        </div>
      )}

      <div className="space-y-2">
        {purchases.map((p) => (
          <button key={p.id} onClick={() => loadPurchaseDetail(p.id)} className="w-full text-left p-3 rounded-xl bg-paper border border-line active:bg-soft transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-ink">{p.purchaseNumber}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusColor(p.status)}`}>{statusLabel(p.status)}</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted">{p.supplier?.name || 'Sin proveedor'} | {p.createdAt?.slice(0, 10)}</p>
              <p className="text-[11px] font-bold text-accent">${p.total.toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-3 mt-1 text-[10px] text-muted">
              <span>{p._count?.items || p.items?.length || 0} items</span>
              {p._count?.documents ? <span>{p._count.documents} docs</span> : null}
              {p.receiptStatus !== 'PENDING' && (
                <span className={p.receiptStatus === 'COMPLETED' ? 'text-green-500' : 'text-amber-500'}>
                  {p.receiptStatus === 'COMPLETED' ? 'Recibida completa' : 'Recepcion parcial'}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default Compras;
