'use client';

import { useCallback, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { toast } from '@/lib/feedback';
import { Camera, X, Plus, Minus, Trash2, Barcode, FileImage, FileText, ImageIcon, Zap, Scan } from 'lucide-react';

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

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

async function detectBarcodeFromImage(base64: string): Promise<string | null> {
  // Method 1: Native BarcodeDetector (Chrome, Edge, Safari 15.4+)
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const detector = new (window as any).BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
      });
      const img = await loadImage(base64);
      const barcodes = await detector.detect(img);
      if (barcodes.length > 0) return barcodes[0].rawValue;
    } catch (e) { console.warn('Native BarcodeDetector failed:', e); }
  }

  // Method 2: barcode-detector ponyfill (ZXing WASM)
  try {
    const mod = await import('barcode-detector');
    const BD = mod.BarcodeDetector;
    if (BD) {
      const detector = new BD({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'] as any,
      });
      const img = await loadImage(base64);
      const barcodes = await detector.detect(img);
      if (barcodes.length > 0) return barcodes[0].rawValue;
    }
  } catch (e) { console.warn('barcode-detector ponyfill failed:', e); }

  return null;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function Compras({ token }: { token: string }) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [scanning, setScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string>('');
  const [manualCode, setManualCode] = useState('');
  const [supplier, setSupplier] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState({ dateFrom: '', dateTo: '', status: 'all' });
  const [batchDocument, setBatchDocument] = useState<string | null>(null);
  const [batchDocName, setBatchDocName] = useState('');

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const itemPhotoIdxRef = useRef<number>(-1);
  const itemPhotoInputRef = useRef<HTMLInputElement>(null);

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
    if (!code) return;
    try {
      const res = await apiFetch<any>(`/products/barcode/${code}`, { token });
      if (!res || !res.data) {
        haptic(200);
        toast.error(`Codigo ${code} no encontrado`);
        return;
      }
      res.data._type = res.type;
      addOrUpdateItem(code, res.data);
    } catch {
      haptic(200);
      toast.error('Error al buscar codigo');
    }
  }, [token, addOrUpdateItem]);

  const handleManualSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const code = manualCode.trim();
    if (!code) return;
    lookupBarcode(code);
    setManualCode('');
  }, [manualCode, lookupBarcode]);

  const handleScanPhoto = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);

    try {
      const base64 = await fileToBase64(file);
      const detected = await detectBarcodeFromImage(base64);
      if (detected) {
        setLastScanned(detected);
        haptic(50);
        await lookupBarcode(detected);
      } else {
        haptic(200);
        toast.error('No se detecto codigo de barras. Intenta con mejor iluminacion.');
      }
    } catch (err) {
      haptic(200);
      toast.error('Error al procesar imagen');
    } finally {
      setScanning(false);
      e.target.value = '';
    }
  }, [lookupBarcode]);

  const handleBatchDocChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      setBatchDocument(base64);
      setBatchDocName(file.name);
      haptic();
      toast.success('Documento adjuntado');
    } catch {
      toast.error('Error al leer archivo');
    }
    e.target.value = '';
  }, []);

  const handleItemPhotoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const idx = itemPhotoIdxRef.current;
    if (!file || idx < 0) { e.target.value = ''; return; }
    try {
      const base64 = await fileToBase64(file);
      setScannedItems((prev) => {
        const updated = [...prev];
        updated[idx].photo = base64;
        return updated;
      });
      haptic();
      toast.success('Foto adjunta');
    } catch {
      toast.error('Error al leer imagen');
    }
    e.target.value = '';
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
      toast.success('Compra(s) registrada(s)');
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
      <input ref={barcodeInputRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={handleScanPhoto} />
      <input ref={docInputRef} type="file" accept="image/*,.pdf" className="sr-only" onChange={handleBatchDocChange} />
      <input ref={itemPhotoInputRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={handleItemPhotoChange} />

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-[2] order-1">
          <div className="bg-paper rounded-xl p-4 border border-line">

            <div className="flex items-center gap-2 mb-3">
              <button
                type="button"
                onClick={() => barcodeInputRef.current?.click()}
                disabled={scanning}
                className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors min-h-[48px] shrink-0 active:scale-[0.97] ${scanning ? 'bg-accent/50 text-ink animate-pulse' : 'bg-accent text-ink'}`}
              >
                {scanning ? (
                  <span className="h-4 w-4 border-2 border-ink border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Scan className="h-4 w-4" />
                )}
                <span>{scanning ? 'Procesando...' : 'Escanear'}</span>
              </button>

              <form onSubmit={handleManualSubmit} className="flex-1 flex items-center gap-1">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Codigo manual o Bluetooth..."
                    className="w-full rounded-xl border border-line pl-3 pr-8 py-2.5 text-sm focus:outline-none focus:border-accent min-h-[48px] font-mono"
                    autoComplete="off"
                  />
                  {manualCode && (
                    <button type="button" onClick={() => setManualCode('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <button type="submit" className="h-[48px] w-[48px] rounded-xl bg-ink text-paper flex items-center justify-center shrink-0 active:scale-95 transition-transform">
                  <Barcode className="h-4 w-4" />
                </button>
              </form>
            </div>

            {lastScanned && (
              <div className="mb-3 text-center">
                <span className="text-[10px] text-muted">Ultimo: <strong className="text-ink font-mono">{lastScanned}</strong></span>
              </div>
            )}

            {scannedItems.length === 0 && !scanning && (
              <div className="mb-3 p-6 border-2 border-dashed border-line rounded-xl text-center">
                <Zap className="h-10 w-10 mx-auto text-accent mb-2" />
                <p className="text-sm text-ink font-semibold">Recepcion rapida</p>
                <p className="text-xs text-muted mt-1">Toca &quot;Escanear&quot; para abrir la camara</p>
                <p className="text-[10px] text-muted mt-1">O ingresa el codigo manualmente</p>
              </div>
            )}

            {scannedItems.length > 0 && (
              <div className="mb-3 flex items-center gap-2 p-2.5 rounded-xl bg-soft border border-line">
                <FileText className="h-4 w-4 text-muted shrink-0" />
                <span className="text-xs text-muted flex-1 truncate">
                  {batchDocument ? `Documento: ${batchDocName}` : 'Boleta / factura del lote (opcional)'}
                </span>
                {batchDocument ? (
                  <button type="button" onClick={() => { setBatchDocument(null); setBatchDocName(''); }} className="text-xs text-red-500 font-semibold min-h-[36px] px-2">Quitar</button>
                ) : (
                  <button type="button" onClick={() => docInputRef.current?.click()} className="text-xs text-accent font-semibold min-h-[36px] px-2">Adjuntar</button>
                )}
              </div>
            )}

            {scannedItems.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {scannedItems.map((item, idx) => (
                  <div key={`${item.productId}-${item.variantId}-${idx}`} className="flex items-center gap-2 p-2.5 rounded-xl bg-soft border border-line">
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

                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-ink truncate">{item.productName}</p>
                      {item.variantName && <p className="text-[10px] text-muted truncate">{item.variantName}</p>}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        itemPhotoIdxRef.current = idx;
                        itemPhotoInputRef.current?.click();
                      }}
                      className="h-8 w-8 rounded-lg bg-blue-500 text-white flex items-center justify-center shrink-0 active:bg-blue-600 min-h-[36px] min-w-[36px]"
                    >
                      <Camera className="h-3.5 w-3.5" />
                    </button>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <button type="button" onClick={() => updateItemQty(idx, -1)} className="h-8 w-8 rounded-lg bg-white border border-line flex items-center justify-center active:bg-soft min-h-[36px] min-w-[36px]">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-7 text-center text-xs font-bold">{item.quantity}</span>
                      <button type="button" onClick={() => updateItemQty(idx, 1)} className="h-8 w-8 rounded-lg bg-white border border-line flex items-center justify-center active:bg-soft min-h-[36px] min-w-[36px]">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <input type="number" min="0" value={item.unitCost} onChange={(e) => updateItemCost(idx, Number(e.target.value) || 0)} className="w-16 rounded-lg border border-line px-1.5 py-1 text-[11px] text-right focus:outline-none focus:border-accent min-h-[36px] font-mono" placeholder="$" />
                    <span className="text-[10px] font-bold text-accent w-14 text-right shrink-0">${(item.quantity * item.unitCost).toLocaleString()}</span>
                    <button type="button" onClick={() => removeItem(idx)} className="text-red-400 active:text-red-600 shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

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
                  <button type="button" onClick={handleSubmit} disabled={submitting} className="btn-accent text-sm min-h-[48px] px-6 active:scale-[0.98] transition-transform">
                    {submitting ? 'Registrando...' : 'Recibir todo'}
                  </button>
                </div>
              </div>
            )}
          </div>

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
                    <button type="button" onClick={() => handleDelete(p.id)} className="text-red-400 active:text-red-600 text-xs shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center">
                      Anular
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

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
