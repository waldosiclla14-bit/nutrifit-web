'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { toast } from '@/lib/feedback';
import { Camera, X, Plus, Minus, Trash2, Barcode, FileImage, FileText, ImageIcon } from 'lucide-react';

type ScannedItem = {
  productId: string;
  variantId?: string;
  productName: string;
  variantName?: string;
  barcode?: string;
  imageUrl?: string;
  lastCost: number;
  quantity: number;
  unitCost: number;
  photo?: string;
  document?: string;
};

type Purchase = {
  id: string;
  productName: string;
  variantName?: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  supplier?: string;
  referenceNumber?: string;
  status: string;
  createdAt: string;
  photoUrl?: string;
  documentUrl?: string;
};

export function Compras({ token }: { token: string }) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [barcodeMode, setBarcodeMode] = useState(false);
  const [lastScanned, setLastScanned] = useState<string>('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [supplier, setSupplier] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeItemIdx, setActiveItemIdx] = useState<number | null>(null);
  const [filter, setFilter] = useState({ dateFrom: '', dateTo: '', status: 'all' });
  const scannerRef = useRef<any>(null);
  const barcodeContainerRef = useRef<HTMLDivElement>(null);
  // iOS-safe: separate refs for photo and document, capture set at creation time
  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [pendingTarget, setPendingTarget] = useState<{ idx: number; type: 'photo' | 'document' } | null>(null);

  const loadPurchases = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter.dateFrom) params.set('dateFrom', filter.dateFrom);
      if (filter.dateTo) params.set('dateTo', filter.dateTo);
      if (filter.status !== 'all') params.set('status', filter.status);
      const res = await apiFetch<any>(`/admin/purchases?${params}`, { token });
      setPurchases(res?.data || res || []);
    } catch { setPurchases([]); }
  }, [token, filter]);

  useEffect(() => { loadPurchases(); }, [loadPurchases]);

  const lookupBarcode = useCallback(async (code: string) => {
    if (!code || lookupLoading) return;
    setLookupLoading(true);
    try {
      const res = await apiFetch<any>(`/products/barcode/${code}`, { token });
      if (!res || !res.data) {
        toast.error(`Código ${code} no encontrado`);
        setLookupLoading(false);
        return;
      }
      const d = res.data;
      const isProduct = res.type === 'product';
      const productId = isProduct ? d.id : d.product?.id;
      const variantId = isProduct ? d.variants?.[0]?.id : d.id;
      const productName = isProduct ? d.name : d.product?.name;
      const variantName = isProduct ? d.variants?.[0]?.variantName : d.variantName;
      const lastCost = isProduct ? (d.variants?.[0]?.costPrice || d.costPrice || 0) : (d.costPrice || 0);

      setScannedItems((prev) => {
        const existingIdx = prev.findIndex(
          (i) => i.variantId === variantId || (!variantId && i.productId === productId)
        );
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx].quantity += 1;
          return updated;
        }
        return [...prev, {
          productId, variantId, productName, variantName,
          barcode: code, imageUrl: d.imageUrl || d.product?.imageUrl,
          lastCost, quantity: 1, unitCost: lastCost,
        }];
      });
      toast.success(`${productName}${variantName ? ` - ${variantName}` : ''} agregado`);
    } catch {
      toast.error('Error al buscar código');
    } finally { setLookupLoading(false); }
  }, [token, lookupLoading]);

  // Barcode scanner (html5-qrcode)
  const toggleBarcodeScanner = useCallback(async () => {
    if (barcodeMode) {
      try {
        if (scannerRef.current?.isRunning) await scannerRef.current.stop();
        scannerRef.current?.clear();
      } catch {}
      setBarcodeMode(false);
      return;
    }

    setBarcodeMode(true);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      await new Promise((r) => setTimeout(r, 300));
      if (!barcodeContainerRef.current) return;
      const scanner = new Html5Qrcode('barcode-scanner-box');
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 280, height: 160 } },
        async (decodedText) => {
          setLastScanned(decodedText);
          await lookupBarcode(decodedText);
        },
        () => {},
      );
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo acceder a la cámara');
      setBarcodeMode(false);
    }
  }, [barcodeMode, lookupBarcode]);

  useEffect(() => {
    return () => { if (scannerRef.current?.isRunning) scannerRef.current.stop().catch(() => {}); };
  }, []);

  // iOS-safe photo capture: triggers native camera
  const capturePhoto = useCallback((idx: number) => {
    setPendingTarget({ idx, type: 'photo' });
    // Small delay ensures React has rendered the ref
    requestAnimationFrame(() => {
      photoInputRef.current?.click();
    });
  }, []);

  // iOS-safe document capture: triggers native camera
  const captureDocument = useCallback((idx: number) => {
    setPendingTarget({ idx, type: 'document' });
    requestAnimationFrame(() => {
      docInputRef.current?.click();
    });
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingTarget) {
      setPendingTarget(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setScannedItems((prev) => {
        const updated = [...prev];
        if (pendingTarget.type === 'photo') {
          updated[pendingTarget.idx].photo = base64;
        } else {
          updated[pendingTarget.idx].document = base64;
        }
        return updated;
      });
      toast.success(pendingTarget.type === 'photo' ? 'Foto adjunta' : 'Documento adjunto');
      setPendingTarget(null);
    };
    reader.onerror = () => {
      toast.error('Error al leer archivo');
      setPendingTarget(null);
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  }, [pendingTarget]);

  const updateItemQty = (idx: number, delta: number) => {
    setScannedItems((prev) => {
      const updated = [...prev];
      updated[idx].quantity = Math.max(1, updated[idx].quantity + delta);
      return updated;
    });
  };

  const updateItemCost = (idx: number, cost: number) => {
    setScannedItems((prev) => {
      const updated = [...prev];
      updated[idx].unitCost = cost;
      return updated;
    });
  };

  const removeItem = (idx: number) => {
    setScannedItems((prev) => prev.filter((_, i) => i !== idx));
    if (activeItemIdx === idx) setActiveItemIdx(null);
  };

  const totalCost = scannedItems.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);

  const handleSubmit = useCallback(async () => {
    if (scannedItems.length === 0) { toast.error('Escanea al menos un producto'); return; }
    setSubmitting(true);
    try {
      for (const item of scannedItems) {
        await apiFetch('/admin/purchases', {
          method: 'POST',
          body: JSON.stringify({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            supplier,
            referenceNumber,
            photoUrl: item.photo || null,
            documentUrl: item.document || null,
            notes: `Escaneado: ${item.barcode || 'N/A'}`,
          }),
          token,
        });
      }
      setScannedItems([]);
      setSupplier('');
      setReferenceNumber('');
      setActiveItemIdx(null);
      loadPurchases();
      toast.success(`${scannedItems.length} compra(s) registrada(s)`);
    } catch (err: any) {
      toast.error(err?.message || 'Error al registrar');
    } finally { setSubmitting(false); }
  }, [token, scannedItems, supplier, referenceNumber, loadPurchases]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Anular esta compra?')) return;
    try {
      await apiFetch(`/admin/purchases/${id}`, { method: 'DELETE', token });
      loadPurchases();
      toast.success('Compra anulada');
    } catch { toast.error('Error al anular'); }
  }, [token, loadPurchases]);

  return (
    <div className="space-y-4">
      {/* iOS-safe hidden file inputs with capture attribute set at creation time */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }}
        onChange={handleFileChange}
        aria-hidden="true"
      />
      <input
        ref={docInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }}
        onChange={handleFileChange}
        aria-hidden="true"
      />

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Sidebar */}
        <div className="flex-1 lg:max-w-sm">
          <div className="bg-paper rounded-xl p-4 border border-line">
            <h4 className="font-semibold text-sm uppercase tracking-widest text-muted mb-3">Filtros</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Fecha inicial</label>
                <input type="date" value={filter.dateFrom} onChange={(e) => setFilter({ ...filter, dateFrom: e.target.value })} className="w-full rounded-xl border border-line px-3 py-2 text-sm focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Fecha final</label>
                <input type="date" value={filter.dateTo} onChange={(e) => setFilter({ ...filter, dateTo: e.target.value })} className="w-full rounded-xl border border-line px-3 py-2 text-sm focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Estado</label>
                <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })} className="w-full rounded-xl border border-line px-3 py-2 text-sm focus:outline-none focus:border-accent">
                  <option value="all">Todos</option>
                  <option value="pending">Pendiente</option>
                  <option value="confirmed">Confirmada</option>
                  <option value="completed">Completada</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </div>
            </div>
          </div>

          {/* Summary card */}
          <div className="bg-paper rounded-xl p-4 border border-line mt-4">
            <h4 className="font-semibold text-sm uppercase tracking-widest text-muted mb-3">Resumen</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted">Productos</span>
                <span className="font-bold">{scannedItems.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">Total</span>
                <span className="font-bold text-accent">${totalCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">Fotos</span>
                <span className="font-bold">{scannedItems.filter(i => i.photo).length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">Documentos</span>
                <span className="font-bold">{scannedItems.filter(i => i.document).length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-[2]">
          <div className="bg-paper rounded-xl p-4 border border-line">
            {/* Action buttons */}
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm uppercase tracking-widest text-muted">Compra rápida</h4>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <button
                  onClick={toggleBarcodeScanner}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-colors min-h-[40px] ${barcodeMode ? 'bg-red-500 text-white' : 'bg-accent text-ink hover:bg-accentDeep'}`}
                >
                  {barcodeMode ? <X className="h-4 w-4" /> : <Barcode className="h-4 w-4" />}
                  <span className="hidden sm:inline">{barcodeMode ? 'Cerrar' : 'Código'}</span>
                </button>
              </div>
            </div>

            {/* Barcode scanner viewport */}
            {barcodeMode && (
              <div className="mb-4 relative">
                <div id="barcode-scanner-box" ref={barcodeContainerRef} className="w-full rounded-xl overflow-hidden bg-black" style={{ minHeight: 280 }} />
                {lookupLoading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                    <span className="text-white text-sm font-medium">Buscando...</span>
                  </div>
                )}
                {lastScanned && (
                  <div className="mt-2 text-center">
                    <span className="text-xs text-muted">Escaneado: <strong className="text-ink">{lastScanned}</strong></span>
                  </div>
                )}
              </div>
            )}

            {!barcodeMode && scannedItems.length === 0 && (
              <div className="mb-4 p-6 border-2 border-dashed border-line rounded-xl text-center">
                <Barcode className="h-10 w-10 mx-auto text-muted mb-2" />
                <p className="text-sm text-muted">Toca &quot;Código&quot; para escanear productos</p>
                <p className="text-xs text-muted mt-1">Después toca en cada producto para agregar foto o documento</p>
              </div>
            )}

            {/* Scanned items */}
            {scannedItems.length > 0 && (
              <div className="space-y-2 mb-4">
                <h5 className="text-xs font-semibold text-muted uppercase">Productos ({scannedItems.length})</h5>
                {scannedItems.map((item, idx) => (
                  <div
                    key={`${item.productId}-${item.variantId}-${idx}`}
                    className={`p-3 rounded-xl border transition-all ${activeItemIdx === idx ? 'bg-accent/10 border-accent shadow-sm' : 'bg-soft border-line'}`}
                  >
                    {/* Main row */}
                    <div
                      className="flex items-center gap-3"
                      onClick={() => setActiveItemIdx(activeItemIdx === idx ? null : idx)}
                    >
                      {/* Thumbnail */}
                      <div className="w-12 h-12 rounded-lg bg-white border border-line overflow-hidden shrink-0 relative">
                        {item.photo ? (
                          <img src={item.photo} alt="" className="w-full h-full object-cover" />
                        ) : item.imageUrl ? (
                          <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-[10px] text-muted">IMG</span>
                          </div>
                        )}
                        {item.photo && (
                          <span className="absolute -top-0.5 -right-0.5 bg-blue-500 text-white rounded-full h-4 w-4 flex items-center justify-center border border-white">
                            <ImageIcon className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-ink truncate">{item.productName}</p>
                        {item.variantName && <p className="text-[10px] text-muted truncate">{item.variantName}</p>}
                        {item.barcode && <p className="text-[10px] text-muted font-mono">{item.barcode}</p>}
                      </div>

                      {/* Quantity stepper */}
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => updateItemQty(idx, -1)}
                          className="h-8 w-8 rounded-lg bg-white border border-line flex items-center justify-center active:bg-soft min-h-[44px] min-w-[44px]"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                        <button
                          onClick={() => updateItemQty(idx, 1)}
                          className="h-8 w-8 rounded-lg bg-white border border-line flex items-center justify-center active:bg-soft min-h-[44px] min-w-[44px]"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Cost */}
                      <input
                        type="number"
                        min="0"
                        value={item.unitCost}
                        onChange={(e) => updateItemCost(idx, Number(e.target.value) || 0)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-20 rounded-lg border border-line px-2 py-1.5 text-xs text-right focus:outline-none focus:border-accent min-h-[44px]"
                        placeholder="Costo"
                      />

                      {/* Total */}
                      <span className="text-[11px] font-bold text-accent w-16 text-right shrink-0">
                        ${(item.quantity * item.unitCost).toLocaleString()}
                      </span>

                      {/* Delete */}
                      <button
                        onClick={(e) => { e.stopPropagation(); removeItem(idx); }}
                        className="text-red-400 hover:text-red-600 active:text-red-700 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Expanded actions */}
                    {activeItemIdx === idx && (
                      <div className="mt-3 pt-3 border-t border-line" onClick={(e) => e.stopPropagation()}>
                        <p className="text-[10px] text-muted mb-2 uppercase font-semibold">Captura</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => capturePhoto(idx)}
                            className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl bg-blue-500 text-white active:bg-blue-600 min-h-[44px] transition-colors"
                          >
                            <Camera className="h-4 w-4" />
                            {item.photo ? 'Cambiar foto' : 'Tomar foto'}
                          </button>
                          <button
                            onClick={() => captureDocument(idx)}
                            className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl bg-purple-500 text-white active:bg-purple-600 min-h-[44px] transition-colors"
                          >
                            <FileText className="h-4 w-4" />
                            {item.document ? 'Cambiar documento' : 'Escanear documento'}
                          </button>
                        </div>
                        {/* Status indicators */}
                        <div className="flex items-center gap-3 mt-2">
                          {item.photo && (
                            <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                              <FileImage className="h-3 w-3" /> Foto adjunta
                            </span>
                          )}
                          {item.document && (
                            <span className="text-[10px] text-purple-600 font-medium flex items-center gap-1">
                              <FileText className="h-3 w-3" /> Documento adjunto
                            </span>
                          )}
                          {!item.photo && !item.document && (
                            <span className="text-[10px] text-muted">Sin archivos adjuntos</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Supplier & document fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-line">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Proveedor</label>
                    <input type="text" value={supplier} onChange={(e) => setSupplier(e.target.value)} className="w-full rounded-xl border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-accent min-h-[44px]" placeholder="Opcional" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Nro documento</label>
                    <input type="text" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} className="w-full rounded-xl border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-accent min-h-[44px]" placeholder="Boleta, factura..." />
                  </div>
                </div>

                {/* Submit */}
                <div className="flex items-center justify-between pt-3 border-t border-line">
                  <span className="text-sm text-muted">
                    Total: <strong className="text-ink text-lg">${totalCost.toLocaleString()}</strong>
                  </span>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="btn-accent text-sm min-h-[48px] px-6 active:scale-[0.98] transition-transform"
                  >
                    {submitting ? 'Registrando...' : `Recibir (${scannedItems.length})`}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Purchase history */}
          <div className="mt-4 bg-paper rounded-xl p-4 border border-line">
            <h5 className="font-semibold text-sm uppercase tracking-widest text-muted mb-3">Historial</h5>
            <div className="space-y-2 max-h-[400px] overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              {purchases.length === 0 && <p className="text-xs text-muted text-center py-4">No hay compras</p>}
              {purchases.map((p) => (
                <div key={p.id} className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-line active:bg-soft transition-colors">
                  <span className="text-[10px] text-muted shrink-0">{p.createdAt?.slice(5, 10)}</span>
                  <span className="text-xs font-medium truncate flex-1">{p.productName}{p.variantName ? ` - ${p.variantName}` : ''}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {p.photoUrl && <FileImage className="h-3.5 w-3.5 text-blue-400" />}
                    {p.documentUrl && <FileText className="h-3.5 w-3.5 text-purple-400" />}
                  </div>
                  <span className="text-[10px] text-muted shrink-0">x{p.quantity}</span>
                  <span className="text-[11px] font-bold text-accent shrink-0">${p.totalCost?.toLocaleString()}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${p.status === 'cancelled' ? 'bg-red-100 text-red-600' : p.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                    {p.status}
                  </span>
                  {p.status !== 'cancelled' && (
                    <button onClick={() => handleDelete(p.id)} className="text-red-400 active:text-red-600 text-xs shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center">
                      Anular
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Compras;
