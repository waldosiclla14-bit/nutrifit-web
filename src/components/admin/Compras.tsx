'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { toast } from '@/lib/feedback';
import { Camera, X, Plus, Minus, Trash2, Barcode, FileImage, FileText, ImageIcon, Zap, Search } from 'lucide-react';

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

function haptic(ms = 30) {
  try { navigator.vibrate?.(ms); } catch {}
}

export function Compras({ token }: { token: string }) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [barcodeMode, setBarcodeMode] = useState(false);
  const [lastScanned, setLastScanned] = useState<string>('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [supplier, setSupplier] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState({ dateFrom: '', dateTo: '', status: 'all' });
  const [batchDocument, setBatchDocument] = useState<string | null>(null);
  const [batchDocName, setBatchDocName] = useState('');
  const scannerRef = useRef<any>(null);
  const barcodeContainerRef = useRef<HTMLDivElement>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);
  const scanCooldownRef = useRef(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const batchDocInputRef = useRef<HTMLInputElement>(null);

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

  const addOrUpdateItem = useCallback((code: string, productData: any) => {
    const d = productData;
    const isProduct = productData._type === 'product';
    const productId = isProduct ? d.id : d.product?.id;
    const variantId = isProduct ? d.variants?.[0]?.id : d.id;
    const productName = isProduct ? d.name : d.product?.name;
    const variantName = isProduct ? d.variants?.[0]?.variantName : d.variantName;
    const costPrice = isProduct ? (d.variants?.[0]?.costPrice || d.costPrice || 0) : (d.costPrice || 0);
    const imgUrl = isProduct ? (d.variants?.[0]?.imageUrl || d.imageUrl) : d.imageUrl;

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
        barcode: code, imageUrl: imgUrl,
        lastCost: costPrice, quantity: 1, unitCost: costPrice,
      }];
    });

    haptic(50);
    toast.success(`${productName}${variantName ? ` - ${variantName}` : ''} (+1)`);
  }, []);

  const lookupBarcode = useCallback(async (code: string) => {
    if (!code || lookupLoading) return;
    setLookupLoading(true);
    try {
      const res = await apiFetch<any>(`/products/barcode/${code}`, { token });
      if (!res || !res.data) {
        haptic(200);
        toast.error(`Código ${code} no encontrado`);
        setLookupLoading(false);
        return;
      }
      res.data._type = res.type;
      addOrUpdateItem(code, res.data);
    } catch {
      haptic(200);
      toast.error('Error al buscar código');
    } finally { setLookupLoading(false); }
  }, [token, lookupLoading, addOrUpdateItem]);

  const handleManualSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const code = manualCode.trim();
    if (!code) return;
    lookupBarcode(code);
    setManualCode('');
  }, [manualCode, lookupBarcode]);

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

      let lastCode = '';
      let lastTime = 0;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 15, qrbox: { width: 280, height: 120 }, aspectRatio: 2.0 },
        async (decodedText) => {
          const now = Date.now();
          if (decodedText === lastCode && now - lastTime < 2000) return;
          lastCode = decodedText;
          lastTime = now;
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

  const captureBatchDocument = useCallback(() => {
    requestAnimationFrame(() => { batchDocInputRef.current?.click(); });
  }, []);

  const handleBatchDocChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setBatchDocument(reader.result as string);
      setBatchDocName(file.name);
      haptic();
      toast.success('Documento adjuntado a todo el lote');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const captureItemPhoto = useCallback((idx: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        setScannedItems((prev) => {
          const updated = [...prev];
          updated[idx].photo = reader.result as string;
          return updated;
        });
        haptic();
        toast.success('Foto adjunta');
      };
      reader.readAsDataURL(file);
    };
    requestAnimationFrame(() => input.click());
  }, []);

  const updateItemQty = (idx: number, delta: number) => {
    setScannedItems((prev) => {
      const updated = [...prev];
      updated[idx].quantity = Math.max(1, updated[idx].quantity + delta);
      return updated;
    });
    haptic();
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
    haptic();
  };

  const totalCost = scannedItems.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);

  const handleSubmit = useCallback(async () => {
    if (scannedItems.length === 0) { toast.error('Escanea al menos un producto'); return; }
    setSubmitting(true);
    try {
      await apiFetch('/admin/purchases/batch', {
        method: 'POST',
        body: JSON.stringify({
          items: scannedItems.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
            unitCost: i.unitCost,
            photoUrl: i.photo || null,
            notes: `Barcode: ${i.barcode || 'N/A'}`,
          })),
          supplier,
          referenceNumber,
          documentUrl: batchDocument || null,
        }),
        token,
      });
      setScannedItems([]);
      setSupplier('');
      setReferenceNumber('');
      setBatchDocument(null);
      setBatchDocName('');
      loadPurchases();
      haptic(100);
      toast.success(`${scannedItems.length} compra(s) registrada(s)`);
    } catch (err: any) {
      toast.error(err?.message || 'Error al registrar');
    } finally { setSubmitting(false); }
  }, [token, scannedItems, supplier, referenceNumber, batchDocument, loadPurchases]);

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
      <input ref={batchDocInputRef} type="file" accept="image/*" capture="environment" className="sr-only" style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }} onChange={handleBatchDocChange} aria-hidden="true" />

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Main content — SCANNER + ITEMS */}
        <div className="flex-[2] order-1">
          <div className="bg-paper rounded-xl p-4 border border-line">

            {/* ── Scanner toggle + manual input ── */}
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={toggleBarcodeScanner}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-colors min-h-[44px] shrink-0 ${barcodeMode ? 'bg-red-500 text-white' : 'bg-accent text-ink'}`}
              >
                {barcodeMode ? <X className="h-4 w-4" /> : <Barcode className="h-4 w-4" />}
                <span className="hidden sm:inline">{barcodeMode ? 'Cerrar' : 'Escanear'}</span>
              </button>

              {/* Manual barcode input — always visible */}
              <form onSubmit={handleManualSubmit} className="flex-1 flex items-center gap-1">
                <div className="flex-1 relative">
                  <input
                    ref={manualInputRef}
                    type="text"
                    inputMode="numeric"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Código manual o Bluetooth scanner..."
                    className="w-full rounded-xl border border-line pl-3 pr-8 py-2 text-sm focus:outline-none focus:border-accent min-h-[44px] font-mono"
                    autoComplete="off"
                  />
                  {manualCode && (
                    <button type="button" onClick={() => setManualCode('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <button type="submit" className="h-[44px] w-[44px] rounded-xl bg-ink text-paper flex items-center justify-center shrink-0 active:scale-95 transition-transform">
                  <Search className="h-4 w-4" />
                </button>
              </form>
            </div>

            {/* ── Barcode scanner viewport ── */}
            {barcodeMode && (
              <div className="mb-3 relative">
                <div id="barcode-scanner-box" ref={barcodeContainerRef} className="w-full rounded-xl overflow-hidden bg-black" style={{ minHeight: 200 }} />
                {lookupLoading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                    <span className="text-white text-sm font-medium animate-pulse">Buscando...</span>
                  </div>
                )}
                {lastScanned && (
                  <div className="mt-1.5 text-center">
                    <span className="text-[10px] text-muted">Último: <strong className="text-ink font-mono">{lastScanned}</strong></span>
                  </div>
                )}
              </div>
            )}

            {/* ── Empty state ── */}
            {!barcodeMode && scannedItems.length === 0 && (
              <div className="mb-3 p-6 border-2 border-dashed border-line rounded-xl text-center">
                <Zap className="h-10 w-10 mx-auto text-accent mb-2" />
                <p className="text-sm text-ink font-semibold">Recepción rápida</p>
                <p className="text-xs text-muted mt-1">Escanea barcodes o ingrésalos manualmente</p>
                <p className="text-[10px] text-muted mt-1">Funciona con escáneres Bluetooth</p>
              </div>
            )}

            {/* ── Batch document bar ── */}
            {scannedItems.length > 0 && (
              <div className="mb-3 flex items-center gap-2 p-2.5 rounded-xl bg-soft border border-line">
                <FileText className="h-4 w-4 text-muted shrink-0" />
                <span className="text-xs text-muted flex-1 truncate">
                  {batchDocument ? `Documento: ${batchDocName}` : 'Documento del lote (opcional)'}
                </span>
                {batchDocument ? (
                  <button onClick={() => { setBatchDocument(null); setBatchDocName(''); }} className="text-xs text-red-500 font-semibold min-h-[36px] px-2">Quitar</button>
                ) : (
                  <button onClick={captureBatchDocument} className="text-xs text-accent font-semibold min-h-[36px] px-2">Adjuntar boleta/factura</button>
                )}
              </div>
            )}

            {/* ── Scanned items list ── */}
            {scannedItems.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {scannedItems.map((item, idx) => (
                  <div
                    key={`${item.productId}-${item.variantId}-${idx}`}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-soft border border-line"
                  >
                    {/* Thumbnail */}
                    <div className="w-10 h-10 rounded-lg bg-white border border-line overflow-hidden shrink-0 relative">
                      {item.photo ? (
                        <img src={item.photo} alt="" className="w-full h-full object-cover" />
                      ) : item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-[9px] text-muted">IMG</span>
                        </div>
                      )}
                      {item.photo && (
                        <span className="absolute -top-0.5 -right-0.5 bg-blue-500 text-white rounded-full h-3.5 w-3.5 flex items-center justify-center border border-white">
                          <ImageIcon className="h-2 w-2" />
                        </span>
                      )}
                    </div>

                    {/* Info + actions */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-ink truncate">{item.productName}</p>
                      {item.variantName && <p className="text-[10px] text-muted truncate">{item.variantName}</p>}
                    </div>

                    {/* Camera quick button */}
                    <button
                      onClick={() => captureItemPhoto(idx)}
                      className="h-8 w-8 rounded-lg bg-blue-500 text-white flex items-center justify-center shrink-0 active:bg-blue-600 min-h-[36px] min-w-[36px]"
                      title="Tomar foto"
                    >
                      <Camera className="h-3.5 w-3.5" />
                    </button>

                    {/* Quantity stepper */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => updateItemQty(idx, -1)}
                        className="h-8 w-8 rounded-lg bg-white border border-line flex items-center justify-center active:bg-soft min-h-[36px] min-w-[36px]"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-7 text-center text-xs font-bold">{item.quantity}</span>
                      <button
                        onClick={() => updateItemQty(idx, 1)}
                        className="h-8 w-8 rounded-lg bg-white border border-line flex items-center justify-center active:bg-soft min-h-[36px] min-w-[36px]"
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
                      className="w-16 rounded-lg border border-line px-1.5 py-1 text-[11px] text-right focus:outline-none focus:border-accent min-h-[36px] font-mono"
                      placeholder="$"
                    />

                    {/* Total */}
                    <span className="text-[10px] font-bold text-accent w-14 text-right shrink-0">
                      ${(item.quantity * item.unitCost).toLocaleString()}
                    </span>

                    {/* Delete */}
                    <button
                      onClick={() => removeItem(idx)}
                      className="text-red-400 active:text-red-600 shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* ── Supplier + Reference + Submit ── */}
            {scannedItems.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-line">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input type="text" value={supplier} onChange={(e) => setSupplier(e.target.value)} className="rounded-xl border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-accent min-h-[44px]" placeholder="Proveedor (opcional)" />
                  <input type="text" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} className="rounded-xl border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-accent min-h-[44px]" placeholder="Nro boleta / factura" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <span className="text-[10px] text-muted block">{scannedItems.length} producto(s)</span>
                    <span className="text-lg font-bold text-ink">${totalCost.toLocaleString()}</span>
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="btn-accent text-sm min-h-[48px] px-6 active:scale-[0.98] transition-transform"
                  >
                    {submitting ? 'Registrando...' : `Recibir todo`}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Purchase history ── */}
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

        {/* Sidebar — FILTERS + SUMMARY */}
        <div className="flex-1 lg:max-w-sm order-2">
          <div className="bg-paper rounded-xl p-4 border border-line sticky top-4">
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

            {scannedItems.length > 0 && (
              <div className="mt-4 pt-4 border-t border-line">
                <h4 className="font-semibold text-sm uppercase tracking-widest text-muted mb-2">Resumen</h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">Productos</span>
                    <span className="font-bold">{scannedItems.length}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">Unidades</span>
                    <span className="font-bold">{scannedItems.reduce((s, i) => s + i.quantity, 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">Total</span>
                    <span className="font-bold text-accent">${totalCost.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Compras;
