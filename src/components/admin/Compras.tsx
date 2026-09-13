'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { toast } from '@/lib/feedback';
import { Camera, X, Plus, Minus, Trash2, Barcode, FileImage, FileText, Image as ImageIcon } from 'lucide-react';

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
  photo?: string;       // base64 data URL
  document?: string;    // base64 data URL
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

type CameraMode = 'barcode' | 'photo' | 'document' | null;

export function Compras({ token }: { token: string }) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [cameraMode, setCameraMode] = useState<CameraMode>(null);
  const [scanning, setScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string>('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [supplier, setSupplier] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeItemIdx, setActiveItemIdx] = useState<number | null>(null);
  const [filter, setFilter] = useState({ dateFrom: '', dateTo: '', status: 'all' });
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingPhotoFor, setPendingPhotoFor] = useState<number | null>(null);
  const [pendingDocFor, setPendingDocFor] = useState<number | null>(null);

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

  const startCamera = useCallback(async (mode: CameraMode) => {
    setCameraMode(mode);
    setScanning(true);
    setLastScanned('');

    if (mode === 'barcode') {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        await new Promise((r) => setTimeout(r, 100));
        if (!containerRef.current) return;
        const scanner = new Html5Qrcode('camera-container');
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
        setCameraMode(null);
      }
    } else {
      // photo or document mode — use native file input with capture
      try {
        await new Promise((r) => setTimeout(r, 200));
        if (fileInputRef.current) {
          fileInputRef.current.setAttribute('capture', mode === 'photo' ? 'environment' : 'environment');
          fileInputRef.current.click();
        }
      } catch {
        setScanning(false);
        setCameraMode(null);
      }
    }
  }, [lookupBarcode]);

  const stopCamera = useCallback(async () => {
    try {
      if (scannerRef.current?.isRunning) await scannerRef.current.stop();
      scannerRef.current?.clear();
    } catch {}
    setCameraMode(null);
    setScanning(false);
  }, []);

  useEffect(() => {
    return () => { if (scannerRef.current?.isRunning) scannerRef.current.stop().catch(() => {}); };
  }, []);

  const handleFileCapture = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) { setCameraMode(null); setScanning(false); return; }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const isDoc = cameraMode === 'document';

      if (pendingPhotoFor !== null) {
        // Attaching photo to specific item
        setScannedItems((prev) => {
          const updated = [...prev];
          updated[pendingPhotoFor].photo = base64;
          return updated;
        });
        toast.success('Foto adjuntada al producto');
        setPendingPhotoFor(null);
      } else if (pendingDocFor !== null) {
        // Attaching document to specific item
        setScannedItems((prev) => {
          const updated = [...prev];
          updated[pendingDocFor].document = base64;
          return updated;
        });
        toast.success('Documento adjuntado al producto');
        setPendingDocFor(null);
      } else if (activeItemIdx !== null) {
        // Attaching to active item
        setScannedItems((prev) => {
          const updated = [...prev];
          if (isDoc) {
            updated[activeItemIdx].document = base64;
          } else {
            updated[activeItemIdx].photo = base64;
          }
          return updated;
        });
        toast.success(isDoc ? 'Documento adjuntado' : 'Foto adjunta');
      } else {
        // No active item — store as pending for next scanned item
        toast.info(isDoc ? 'Documento capturado. Se adjuntará al próximo producto escaneado.' : 'Foto capturada. Se adjuntará al próximo producto escaneado.');
      }
      setCameraMode(null);
      setScanning(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [cameraMode, activeItemIdx, pendingPhotoFor, pendingDocFor]);

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
      {/* Hidden file input for camera capture */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileCapture}
      />

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

          {/* Quick stats */}
          <div className="bg-paper rounded-xl p-4 border border-line mt-4">
            <h4 className="font-semibold text-sm uppercase tracking-widest text-muted mb-3">Resumen</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted">Productos escaneados</span>
                <span className="font-bold">{scannedItems.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">Total compras</span>
                <span className="font-bold text-accent">${totalCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">Fotos adjuntas</span>
                <span className="font-bold">{scannedItems.filter(i => i.photo).length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">Documentos adjuntos</span>
                <span className="font-bold">{scannedItems.filter(i => i.document).length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-[2]">
          <div className="bg-paper rounded-xl p-4 border border-line">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm uppercase tracking-widest text-muted">Compra rápida</h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => cameraMode === 'barcode' ? stopCamera() : startCamera('barcode')}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-colors ${cameraMode === 'barcode' ? 'bg-red-500 text-white' : 'bg-accent text-ink hover:bg-accentDeep'}`}
                >
                  <Barcode className="h-4 w-4" />
                  {cameraMode === 'barcode' ? 'Cerrar' : 'Código'}
                </button>
                <button
                  onClick={() => startCamera('photo')}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                >
                  <Camera className="h-4 w-4" />
                  Foto
                </button>
                <button
                  onClick={() => startCamera('document')}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-purple-500 text-white hover:bg-purple-600 transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  Documento
                </button>
              </div>
            </div>

            {/* Camera viewport */}
            {cameraMode && (
              <div className="mb-4 relative">
                {cameraMode === 'barcode' ? (
                  <div id="camera-container" ref={containerRef} className="w-full rounded-xl overflow-hidden bg-black" style={{ minHeight: 280 }} />
                ) : (
                  <div className="w-full rounded-xl overflow-hidden bg-gray-100 border-2 border-dashed border-line p-8 text-center">
                    <div className="animate-pulse">
                      {cameraMode === 'photo' ? <Camera className="h-16 w-16 mx-auto text-blue-400 mb-3" /> : <FileText className="h-16 w-16 mx-auto text-purple-400 mb-3" />}
                      <p className="text-sm text-muted">
                        {cameraMode === 'photo' ? 'Abriendo cámara para foto del producto...' : 'Abriendo cámara para documento...'}
                      </p>
                      <p className="text-xs text-muted mt-1">Se abrirá el selector de archivos</p>
                    </div>
                  </div>
                )}
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

            {!cameraMode && (
              <div className="mb-4 p-6 border-2 border-dashed border-line rounded-xl text-center">
                <Barcode className="h-10 w-10 mx-auto text-muted mb-2" />
                <p className="text-sm text-muted">Selecciona una opción de captura arriba</p>
                <p className="text-xs text-muted mt-1">Código de barras • Foto de producto • Documento/boleta</p>
              </div>
            )}

            {/* Scanned items list */}
            {scannedItems.length > 0 && (
              <div className="space-y-2 mb-4">
                <h5 className="text-xs font-semibold text-muted uppercase">Productos ({scannedItems.length})</h5>
                {scannedItems.map((item, idx) => (
                  <div
                    key={`${item.productId}-${item.variantId}-${idx}`}
                    className={`p-3 rounded-xl border transition-colors cursor-pointer ${activeItemIdx === idx ? 'bg-accent/10 border-accent' : 'bg-soft border-line hover:bg-accent/5'}`}
                    onClick={() => setActiveItemIdx(activeItemIdx === idx ? null : idx)}
                  >
                    <div className="flex items-center gap-3">
                      {/* Thumbnail */}
                      <div className="w-12 h-12 rounded-lg bg-white border border-line overflow-hidden shrink-0 flex items-center justify-center relative">
                        {item.photo ? (
                          <img src={item.photo} alt="" className="w-full h-full object-cover" />
                        ) : item.imageUrl ? (
                          <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] text-muted">IMG</span>
                        )}
                        {item.photo && (
                          <span className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full h-4 w-4 flex items-center justify-center">
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

                      {/* Quantity */}
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => updateItemQty(idx, -1)} className="h-7 w-7 rounded-lg bg-white border border-line flex items-center justify-center hover:bg-soft"><Minus className="h-3 w-3" /></button>
                        <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                        <button onClick={() => updateItemQty(idx, 1)} className="h-7 w-7 rounded-lg bg-white border border-line flex items-center justify-center hover:bg-soft"><Plus className="h-3 w-3" /></button>
                      </div>

                      {/* Cost */}
                      <input
                        type="number"
                        min="0"
                        value={item.unitCost}
                        onChange={(e) => updateItemCost(idx, Number(e.target.value) || 0)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-20 rounded-lg border border-line px-2 py-1 text-xs text-right focus:outline-none focus:border-accent"
                        placeholder="Costo"
                      />

                      {/* Total */}
                      <span className="text-[11px] font-bold text-accent w-16 text-right shrink-0">${(item.quantity * item.unitCost).toLocaleString()}</span>

                      {/* Remove */}
                      <button onClick={(e) => { e.stopPropagation(); removeItem(idx); }} className="text-red-400 hover:text-red-600 shrink-0"><Trash2 className="h-4 w-4" /></button>
                    </div>

                    {/* Expanded: photo/document actions */}
                    {activeItemIdx === idx && (
                      <div className="mt-3 pt-3 border-t border-line flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => { setPendingPhotoFor(idx); startCamera('photo'); }}
                          className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                        >
                          <Camera className="h-3.5 w-3.5" />
                          {item.photo ? 'Cambiar foto' : 'Tomar foto'}
                        </button>
                        <button
                          onClick={() => { setPendingDocFor(idx); startCamera('document'); }}
                          className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          {item.document ? 'Cambiar documento' : 'Escanear documento'}
                        </button>
                        {item.photo && (
                          <span className="text-[10px] text-green-600 font-medium flex items-center gap-1">
                            <FileImage className="h-3 w-3" /> Foto adjunta
                          </span>
                        )}
                        {item.document && (
                          <span className="text-[10px] text-purple-600 font-medium flex items-center gap-1">
                            <FileText className="h-3 w-3" /> Documento adjunto
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Supplier & document fields */}
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

                {/* Submit */}
                <div className="flex items-center justify-between pt-3 border-t border-line">
                  <span className="text-sm text-muted">Total: <strong className="text-ink text-lg">${totalCost.toLocaleString()}</strong></span>
                  <button onClick={handleSubmit} disabled={submitting} className="btn-accent text-xs min-h-[36px] px-6">
                    {submitting ? 'Registrando...' : `Recibir compra (${scannedItems.length})`}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Purchase history */}
          <div className="mt-4 bg-paper rounded-xl p-4 border border-line">
            <h5 className="font-semibold text-sm uppercase tracking-widest text-muted mb-3">Historial de compras</h5>
            <div className="space-y-2 max-h-[400px] overflow-y-contained">
              {purchases.length === 0 && <p className="text-xs text-muted text-center py-4">No hay compras registradas</p>}
              {purchases.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-line hover:bg-soft transition-colors">
                  <span className="text-[10px] text-muted shrink-0">{p.createdAt?.slice(0, 10)}</span>
                  <span className="text-xs font-medium truncate flex-1">{p.productName}{p.variantName ? ` - ${p.variantName}` : ''}</span>
                  {p.photoUrl && <FileImage className="h-3.5 w-3.5 text-blue-400 shrink-0" />}
                  {p.documentUrl && <FileText className="h-3.5 w-3.5 text-purple-400 shrink-0" />}
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
