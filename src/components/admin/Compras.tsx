'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { toast } from '@/lib/feedback';
import { Camera, X, Plus, Minus, Trash2, Search, Barcode } from 'lucide-react';

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
};

export function Compras({ token }: { token: string }) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string>('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [supplier, setSupplier] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState({ dateFrom: '', dateTo: '', status: 'all' });
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
        toast.error(`Código ${code} no encontrado en productos`);
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
          productId,
          variantId,
          productName,
          variantName,
          barcode: code,
          imageUrl: d.imageUrl || d.product?.imageUrl,
          lastCost,
          quantity: 1,
          unitCost: lastCost,
        }];
      });
      toast.success(`${productName}${variantName ? ` - ${variantName}` : ''} agregado`);
    } catch {
      toast.error('Error al buscar código de barras');
    } finally {
      setLookupLoading(false);
    }
  }, [token, lookupLoading]);

  const startScanner = useCallback(async () => {
    setScannerOpen(true);
    setScanning(true);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      await new Promise((r) => setTimeout(r, 100));
      if (!containerRef.current) return;
      const scanner = new Html5Qrcode('barcode-scanner');
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
      setScanning(false);
    }
  }, [lookupBarcode]);

  const stopScanner = useCallback(async () => {
    try {
      if (scannerRef.current?.isRunning) {
        await scannerRef.current.stop();
      }
      scannerRef.current?.clear();
    } catch {}
    setScannerOpen(false);
    setScanning(false);
  }, []);

  useEffect(() => {
    return () => { if (scannerRef.current?.isRunning) scannerRef.current.stop().catch(() => {}); };
  }, []);

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
            notes: `Escaneado por código de barras: ${item.barcode || 'N/A'}`,
          }),
          token,
        });
      }
      setScannedItems([]);
      setSupplier('');
      setReferenceNumber('');
      loadPurchases();
      toast.success(`${scannedItems.length} compra(s) registrada(s) exitosamente`);
    } catch (err: any) {
      toast.error(err?.message || 'Error al registrar compras');
    } finally { setSubmitting(false); }
  }, [token, scannedItems, supplier, referenceNumber, loadPurchases]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Anular esta compra?')) return;
    try {
      await apiFetch(`/admin/purchases/${id}`, { method: 'DELETE', token });
      loadPurchases();
      toast.success('Compra anulada');
    } catch { toast.error('Error al anular compra'); }
  }, [token, loadPurchases]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-4">
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
        </div>

        <div className="flex-[2]">
          <div className="bg-paper rounded-xl p-4 border border-line">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm uppercase tracking-widest text-muted">Compra rápida</h4>
              <button
                onClick={scannerOpen ? stopScanner : startScanner}
                className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl transition-colors ${scannerOpen ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-accent text-ink hover:bg-accentDeep'}`}
              >
                {scannerOpen ? <X className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                {scannerOpen ? 'Cerrar cámara' : 'Escanear código'}
              </button>
            </div>

            {scannerOpen && (
              <div className="mb-4 relative">
                <div id="barcode-scanner" ref={containerRef} className="w-full rounded-xl overflow-hidden bg-black" style={{ minHeight: 280 }} />
                {lookupLoading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                    <span className="text-white text-sm font-medium">Buscando producto...</span>
                  </div>
                )}
                {lastScanned && (
                  <div className="mt-2 text-center">
                    <span className="text-xs text-muted">Último escaneado: <strong className="text-ink">{lastScanned}</strong></span>
                  </div>
                )}
              </div>
            )}

            {!scannerOpen && (
              <div className="mb-4 p-8 border-2 border-dashed border-line rounded-xl text-center">
                <Barcode className="h-12 w-12 mx-auto text-muted mb-2" />
                <p className="text-sm text-muted">Presiona &quot;Escanear código&quot; para abrir la cámara</p>
                <p className="text-xs text-muted mt-1">Escanea el código de barras del producto para agregarlo a la compra</p>
              </div>
            )}

            {scannedItems.length > 0 && (
              <div className="space-y-3 mb-4">
                <h5 className="text-xs font-semibold text-muted uppercase">Productos escaneados ({scannedItems.length})</h5>
                {scannedItems.map((item, idx) => (
                  <div key={`${item.productId}-${item.variantId}-${idx}`} className="flex items-center gap-3 p-3 rounded-xl bg-soft border border-line">
                    <div className="w-10 h-10 rounded-lg bg-white border border-line overflow-hidden shrink-0 flex items-center justify-center">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] text-muted">IMG</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-ink truncate">{item.productName}</p>
                      {item.variantName && <p className="text-[10px] text-muted truncate">{item.variantName}</p>}
                      {item.barcode && <p className="text-[10px] text-muted font-mono">{item.barcode}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => updateItemQty(idx, -1)} className="h-7 w-7 rounded-lg bg-white border border-line flex items-center justify-center hover:bg-soft"><Minus className="h-3 w-3" /></button>
                      <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                      <button onClick={() => updateItemQty(idx, 1)} className="h-7 w-7 rounded-lg bg-white border border-line flex items-center justify-center hover:bg-soft"><Plus className="h-3 w-3" /></button>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={item.unitCost}
                      onChange={(e) => updateItemCost(idx, Number(e.target.value) || 0)}
                      className="w-20 rounded-lg border border-line px-2 py-1 text-xs text-right focus:outline-none focus:border-accent"
                      placeholder="Costo"
                    />
                    <span className="text-[11px] font-bold text-accent w-16 text-right shrink-0">${(item.quantity * item.unitCost).toLocaleString()}</span>
                    <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 shrink-0"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-line">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Proveedor</label>
                    <input type="text" value={supplier} onChange={(e) => setSupplier(e.target.value)} className="w-full rounded-xl border border-line px-3 py-2 text-sm focus:outline-none focus:border-accent" placeholder="Opcional" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Nro documento</label>
                    <input type="text" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} className="w-full rounded-xl border border-line px-3 py-2 text-sm focus:outline-none focus:border-accent" placeholder="Boleta, factura..." />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-line">
                  <span className="text-sm text-muted">Total: <strong className="text-ink text-lg">${totalCost.toLocaleString()}</strong></span>
                  <button onClick={handleSubmit} disabled={submitting} className="btn-accent text-xs min-h-[36px] px-6">
                    {submitting ? 'Registrando...' : `Recibir compra (${scannedItems.length})`}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 bg-paper rounded-xl p-4 border border-line">
            <h5 className="font-semibold text-sm uppercase tracking-widest text-muted mb-3">Historial de compras</h5>
            <div className="space-y-2 max-h-[400px] overflow-y-contained">
              {purchases.length === 0 && <p className="text-xs text-muted text-center py-4">No hay compras registradas</p>}
              {purchases.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-line hover:bg-soft transition-colors">
                  <span className="text-[10px] text-muted shrink-0">{p.createdAt?.slice(0, 10)}</span>
                  <span className="text-xs font-medium truncate flex-1">{p.productName}{p.variantName ? ` - ${p.variantName}` : ''}</span>
                  <span className="text-[10px] text-muted shrink-0">x{p.quantity}</span>
                  <span className="text-[11px] font-bold text-accent shrink-0">${p.totalCost?.toLocaleString()}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${p.status === 'cancelled' ? 'bg-red-100 text-red-600' : p.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>{p.status}</span>
                  {p.status !== 'cancelled' && (
                    <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-600 text-xs shrink-0" title="Anular">Anular</button>
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
