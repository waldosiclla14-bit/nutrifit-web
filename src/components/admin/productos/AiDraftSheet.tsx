'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, Link2, Loader2, ScanLine, Sparkles, Trash2, X } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { toast } from '@/lib/feedback';
import { draftToForm } from '@/lib/admin/productDraft';
import type { ProductDraft } from '@/types/productDraft';
import { BarcodeScanner } from '../BarcodeScanner';

export type AiDraftResult = ProductDraft & {
  draftId: string;
  duplicates: {
    exact: { id: string; name: string; sku?: string; match?: string; variantName?: string }[];
    similar: { id: string; name: string; score: number }[];
  };
  warnings: string[];
  meta: {
    model: string;
    latencyMs: number;
    webSearchUsed: boolean;
    quota: { used: number; limit: number; resetAt: string };
  };
};

type Mode = 'photo' | 'barcode' | 'url' | 'text';

type Props = {
  open: boolean;
  token: string;
  onClose: () => void;
  onApply: (draft: AiDraftResult) => void;
  onQueue: (draft: AiDraftResult) => void;
};

const MAX_IMAGES = 4;
const LOW_CONFIDENCE = 0.6;

type Quota = { used: number; limit: number; resetAt: string };

async function fileToCompressedJpeg(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const maxSide = 1280;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  let quality = 0.8;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  // El backend rechaza > ~400 KB: baja calidad hasta cupo.
  while (dataUrl.split(',')[1]?.length > 520_000 && quality > 0.4) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }
  return dataUrl.split(',')[1];
}

export function AiDraftSheet({ open, token, onClose, onApply, onQueue }: Props) {
  const [mode, setMode] = useState<Mode>('photo');
  const [step, setStep] = useState<'input' | 'processing' | 'review'>('input');
  const [stage, setStage] = useState('');
  const [images, setImages] = useState<{ mimeType: string; dataBase64: string }[]>([]);
  const [barcode, setBarcode] = useState('');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [webSearch, setWebSearch] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [result, setResult] = useState<AiDraftResult | null>(null);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [confirmedLow, setConfirmedLow] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setMode('photo');
    setStep('input');
    setStage('');
    setImages([]);
    setBarcode('');
    setUrl('');
    setText('');
    setWebSearch(false);
    setScanOpen(false);
    setResult(null);
    setConfirmedLow(false);
    // Consulta barata: muestra cuota y precalienta Render antes de generar.
    apiFetch<Quota>(`/ai/product-draft/status`, { token })
      .then(setQuota)
      .catch(() => {});
  }, [open, token]);

  if (!open) return null;

  const canProcess =
    mode === 'photo'
      ? images.length > 0
      : mode === 'barcode'
        ? barcode.trim().length > 0
        : mode === 'url'
          ? /^https?:\/\//i.test(url.trim())
          : text.trim().length > 0;

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    const encoded: { mimeType: string; dataBase64: string }[] = [];
    for (const file of Array.from(files).slice(0, MAX_IMAGES)) {
      try {
        const dataBase64 = await fileToCompressedJpeg(file);
        encoded.push({ mimeType: 'image/jpeg', dataBase64 });
      } catch {
        toast.error(`No se pudo leer ${file.name}`);
      }
    }
    if (encoded.length) setImages((prev) => [...prev, ...encoded].slice(0, MAX_IMAGES));
  };

  const process = async () => {
    setStep('processing');
    setStage('Comprimiendo imágenes…');
    // Pequeña pausa para que la UI pinte la etapa antes del fetch.
    await new Promise((resolve) => setTimeout(resolve, 60));
    setStage(mode === 'photo' ? 'Analizando la etiqueta…' : 'Consultando a la IA…');

    try {
      const body: any = { mode, webSearch: mode === 'url' ? true : webSearch };
      if (mode === 'photo') body.images = images;
      if (mode === 'barcode') body.barcode = barcode.trim();
      if (mode === 'url') body.url = url.trim();
      if (mode === 'text') body.text = text.trim();

      const draft = await apiFetch<AiDraftResult>('/ai/product-draft', {
        method: 'POST',
        token,
        body,
      });
      setStage('Buscando duplicados…');
      setResult(draft);
      setQuota(draft.meta?.quota ?? quota);
      setConfirmedLow(false);
      setStep('review');
    } catch (err: any) {
      toast.error(err?.message || 'La IA no respondió.');
      setStep('input');
    } finally {
      setStage('');
    }
  };

  const confidenceTone = (value: number) =>
    value >= 0.85 ? 'bg-emerald-500' : value >= 0.6 ? 'bg-amber-400' : 'bg-red-400';

  const Field = ({ label, value, confidence }: { label: string; value: string; confidence: number }) => (
    <div className="min-w-0" title={`${label}: confianza ${Math.round(confidence * 100)}%. Revisa este dato antes de usarlo.`}>
      <p className="truncate text-sm text-ink">{value}</p>
      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted/40">
        <div className={`h-full ${confidenceTone(confidence)}`} style={{ width: `${Math.round(confidence * 100)}%` }} />
      </div>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted">
        {label} · {Math.round(confidence * 100)}%{confidence < LOW_CONFIDENCE && value !== '—' ? ' ⚠️' : ''}
      </p>
    </div>
  );

  const reviewedFields = result
    ? [
        { label: 'Nombre', value: result.name, confidence: result.confidence?.name ?? 0 },
        { label: 'Marca', value: result.brand, confidence: result.confidence?.brand ?? 0 },
        { label: 'Presentación', value: result.size, confidence: result.confidence?.size ?? 0 },
        {
          label: 'Porciones',
          value: result.servings != null ? String(result.servings) : null,
          confidence: result.confidence?.servings ?? 0,
        },
        { label: 'Categoría', value: result.category, confidence: result.confidence?.category ?? 0 },
        { label: 'ISP', value: result.isp_number, confidence: result.confidence?.isp_number ?? 0 },
      ]
    : [];
  const lowConfidenceFields = reviewedFields.filter(
    (field) => !!field.value && field.confidence < LOW_CONFIDENCE,
  );
  const blockedByConfidence = lowConfidenceFields.length > 0 && !confirmedLow;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-line bg-paper shadow-xl sm:rounded-3xl">
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-base uppercase">Crear ficha con IA</h2>
            <p className="text-xs text-muted">
              {step === 'review' ? 'Revisa los datos antes de usarlos' : 'Foto de etiqueta, barcode, URL o texto'}
              {quota ? ` · cuota ${quota.used}/${quota.limit}` : ''}
            </p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-full p-2 hover:bg-muted/30">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === 'processing' && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Loader2 className="animate-spin text-accent" size={34} />
              <p className="text-sm font-bold">{stage || 'Procesando…'}</p>
              <p className="max-w-sm text-xs text-muted">
                Puede tardar unos segundos. Nada se guarda hasta que tú lo decidas.
              </p>
            </div>
          )}

          {step === 'input' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(
                  [
                    { key: 'photo', label: 'Foto', icon: Camera },
                    { key: 'barcode', label: 'Barcode', icon: ScanLine },
                    { key: 'url', label: 'URL', icon: Link2 },
                    { key: 'text', label: 'Texto', icon: Sparkles },
                  ] as const
                ).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMode(key)}
                    className={`flex flex-col items-center gap-1 rounded-2xl border px-3 py-3 text-xs font-bold ${
                      mode === key ? 'border-accent bg-accent/10 text-accent' : 'border-line text-muted'
                    }`}
                  >
                    <Icon size={18} />
                    {label}
                  </button>
                ))}
              </div>

              {mode === 'photo' && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => cameraRef.current?.click()} className="ds-btn-secondary px-3 py-2 text-xs">
                      <span className="inline-flex items-center gap-1"><Camera size={14} /> Cámara</span>
                    </button>
                    <button type="button" onClick={() => galleryRef.current?.click()} className="ds-btn-secondary px-3 py-2 text-xs">
                      <span className="inline-flex items-center gap-1"><ImagePlus size={14} /> Galería</span>
                    </button>
                  </div>

                  <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
                  <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden"
                    onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />

                  {images.length > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                      {images.map((image, i) => (
                        <div key={i} className="group relative aspect-square overflow-hidden rounded-xl border border-line">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`data:${image.mimeType};base64,${image.dataBase64}`} alt={`Captura ${i + 1}`} className="h-full w-full object-cover" />
                          <button
                            type="button"
                            aria-label="Quitar foto"
                            onClick={() => setImages((list) => list.filter((_, idx) => idx !== i))}
                            className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] text-muted">Máximo {MAX_IMAGES} fotos. Las imágenes solo se usan para esta extracción.</p>
                </div>
              )}

              {mode === 'barcode' && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input value={barcode} onChange={(e) => setBarcode(e.target.value.replace(/\D/g, ''))}
                      placeholder="Ej: 5901234123457" inputMode="numeric" className="input flex-1" maxLength={14} />
                    <button type="button" onClick={() => setScanOpen(true)} className="ds-btn-secondary px-3 py-2 text-xs"
                      title="Escanear con la cámara">
                      <span className="inline-flex items-center gap-1"><ScanLine size={14} /> Escanear</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-muted">Puedes escribirlo o escanearlo desde la cámara.</p>
                </div>
              )}

              {mode === 'url' && (
                <input value={url} onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://tienda.cl/producto" className="input" inputMode="url" autoComplete="off" />
              )}

              {mode === 'text' && (
                <textarea value={text} onChange={(e) => setText(e.target.value)}
                  placeholder="Pega la descripción del proveedor o lo que sepas del producto…" rows={5} className="input" />
              )}

              {mode !== 'url' && (
                <label className="flex items-start gap-2 text-xs text-muted">
                  <input type="checkbox" checked={webSearch} onChange={(e) => setWebSearch(e.target.checked)} className="mt-0.5 accent-[#5DD62C]" />
                  Buscar también en web para completar presentación, sabores e ingredientes (opt-in).
                </label>
              )}
            </div>
          )}

          {step === 'review' && result && (
            <div className="space-y-4">
              {result.warnings?.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {result.warnings.map((warning, i) => <p key={i} className={i ? 'mt-1' : ''}>⚠️ {warning}</p>)}
                </div>
              )}

              {result.duplicates?.exact?.length > 0 && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                  <p className="font-bold">Barcode ya registrado: {result.duplicates.exact[0].name}</p>
                  <p className="mt-0.5">Verifica antes de crear; elige otro barcode o edita el existente.</p>
                </div>
              )}

              {(result.duplicates?.similar?.length ?? 0) > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <p className="font-bold">Posibles duplicados por nombre:</p>
                  <p className="mt-0.5">
                    {result.duplicates.similar.slice(0, 3).map((item: any) => `${item.name} (${Math.round(item.score * 100)}%)`).join(' · ')}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {reviewedFields.map((field) => (
                  <Field
                    key={field.label}
                    label={field.label}
                    value={field.value || '—'}
                    confidence={field.confidence}
                  />
                ))}
              </div>

              {lowConfidenceFields.length > 0 && (
                <label className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <input
                    type="checkbox"
                    checked={confirmedLow}
                    onChange={(e) => setConfirmedLow(e.target.checked)}
                    className="mt-0.5 accent-[#5DD62C]"
                  />
                  Ya revisé los campos con baja confianza: {lowConfidenceFields.map((f) => f.label).join(', ')}.
                </label>
              )}

              {result.flavors?.length > 0 && (
                <div>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-muted">Sabores ({result.flavors.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {result.flavors.map((flavor) => (
                      <span key={flavor} className="rounded-full border border-line px-2 py-1 text-xs">{flavor}</span>
                    ))}
                  </div>
                </div>
              )}

              {result.ingredients && (
                <p className="whitespace-pre-line rounded-2xl bg-muted/20 px-3 py-2 text-xs text-muted">{result.ingredients}</p>
              )}

              {result.sources?.length > 0 && (
                <div>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-muted">Fuentes</p>
                  <ul className="space-y-1 text-xs text-muted">
                    {result.sources.slice(0, 5).map((source, i) => (
                      <li key={`${source.type}-${source.title}-${i}`}>
                        {source.type === 'web' ? '🌐' : source.type === 'catalog' ? '📦' : '🏷️'}{' '}
                        {source.title}
                        {source.field ? ` · ${source.field}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-[11px] text-muted">
                Modelo {result.meta?.model} · {result.meta?.latencyMs ?? 0} ms · cuota{' '}
                {result.meta?.quota?.used ?? 0}/{result.meta?.quota?.limit ?? 60} ·{' '}
                {result.meta?.webSearchUsed ? 'búsqueda web sí' : 'sin búsqueda web'}
              </p>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-line px-5 py-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          <button
            type="button"
            onClick={() => (step === 'review' ? setStep('input') : onClose())}
            className="ds-btn-secondary px-4 py-2 text-xs"
          >
            {step === 'review' ? 'Volver' : 'Cancelar'}
          </button>
          {step === 'input' && (
            <button type="button" onClick={process} disabled={!canProcess} className="ds-btn-accent px-4 py-2 text-xs disabled:opacity-40">
              Generar borrador
            </button>
          )}
          {step === 'review' && result && (
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => onQueue(result)}
                disabled={blockedByConfidence}
                className="ds-btn-secondary px-3 py-2 text-xs disabled:opacity-40"
              >
                Agregar a cola
              </button>
              <button
                type="button"
                onClick={() => onApply(result)}
                disabled={blockedByConfidence}
                className="ds-btn-accent px-3 py-2 text-xs disabled:opacity-40"
              >
                Usar estos datos
              </button>
            </div>
          )}
        </footer>
      </div>

      {scanOpen && (
        <BarcodeScanner
          onClose={() => setScanOpen(false)}
          onDetect={(code) => {
            setBarcode(code.replace(/\D/g, '').slice(0, 14));
            setScanOpen(false);
          }}
        />
      )}
    </div>
  );
}
