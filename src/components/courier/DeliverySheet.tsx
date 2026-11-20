'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import { Camera, Loader2, MapPin, Phone, Receipt, StickyNote, X } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import {
  compressPhoto,
  formatCLP,
  formatWindow,
  courierActions,
  hasPodEvidence,
  PAYMENT_METHOD_LABEL,
} from '@/lib/courier/helpers';
import type { CourierAction } from '@/lib/courier/helpers';
import type { CourierDeliverPayload, CourierDelivery, CourierDeliveryDetail } from '@/lib/courier/types';
import { toast } from '@/lib/feedback';
import { DELIVERY_STATUS_LABEL, DELIVERY_STATUS_PILL } from '@/lib/admin/deliveryStatus';

type Props = {
  delivery: CourierDelivery;
  onClose: () => void;
  onStatus: (delivery: CourierDelivery, action: CourierAction, reason?: string) => Promise<void>;
  onDeliver: (delivery: CourierDelivery, payload: CourierDeliverPayload) => Promise<void>;
  onReschedule: (delivery: CourierDelivery, reason: string) => Promise<void>;
};

export default function DeliverySheet({ delivery, onClose, onStatus, onDeliver, onReschedule }: Props) {
  const [detail, setDetail] = useState<CourierDeliveryDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [reasonFor, setReasonFor] = useState<CourierAction | null>(null);
  const [reason, setReason] = useState('');
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  // Cierre con POD
  const [amount, setAmount] = useState(String(delivery.cobro.monto));
  const [method, setMethod] = useState(delivery.cobro.metodo || 'EFECTIVO');
  const [reference, setReference] = useState('');
  const [code, setCode] = useState(delivery.codigo || '');
  const [recipient, setRecipient] = useState('');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState('');
  const [compressing, setCompressing] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoadingDetail(true);
    apiFetch<CourierDeliveryDetail>(`/courier/route/${delivery.id}`)
      .then((d) => { if (alive) setDetail(d); })
      .catch(() => { if (alive) setDetail(null); })
      .finally(() => { if (alive) setLoadingDetail(false); });
    return () => { alive = false; };
  }, [delivery.id]);

  useEffect(() => {
    if (!detail) return;
    setAmount(String(detail.cobro.monto));
    setMethod(detail.cobro.metodo || 'EFECTIVO');
    setCode(detail.codigo || '');
  }, [detail]);

  const actions = courierActions(delivery.estado);
  const primary = actions.filter((a) => a.kind !== 'danger');
  const problems = actions.filter((a) => a.kind === 'danger');

  const run = async (action: CourierAction, writtenReason?: string) => {
    setWorking(action.to);
    try {
      await onStatus(delivery, action, writtenReason);
      onClose();
    } catch {
      // onStatus ya mostró el error y mantiene la hoja abierta.
    } finally {
      setWorking(null);
    }
  };

  const pick = (action: CourierAction) => {
    if (action.requiresReason) {
      setReason('');
      setReasonFor(action);
      return;
    }
    if (action.to === 'DELIVERED') {
      setDeliverOpen(true);
      return;
    }
    run(action);
  };

  const submitReason = () => {
    if (!reasonFor || reason.trim().length < 3) return;
    run(reasonFor, reason.trim());
  };

  const onPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCompressing(true);
    try {
      const dataUrl = await compressPhoto(file);
      if (dataUrl) {
        setPhoto(dataUrl);
        setPhotoName(file.name);
      } else {
        toast.error('No se pudo procesar la foto. Intenta con otra.');
      }
    } finally {
      setCompressing(false);
    }
  };

  const submitDeliver = async () => {
    const monto = Number(amount);
    if (!Number.isFinite(monto) || monto < 0) {
      toast.error('Revisa el monto del cobro.');
      return;
    }
    if (!hasPodEvidence(code, photo)) {
      toast.error('Confirma el código de entrega o toma una foto.');
      return;
    }
    setWorking('DELIVERED');
    try {
      await onDeliver(delivery, {
        amount: monto,
        method,
        code: code.trim() || undefined,
        photoDataUrl: photo,
        recipientName: recipient.trim() || undefined,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch {
      // El contenedor ya mostró el error; se mantiene el formulario abierto.
    } finally {
      setWorking(null);
    }
  };

  const submitReschedule = async () => {
    if (reason.trim().length < 3) return;
    setWorking('RESCHEDULE');
    try {
      await onReschedule(delivery, reason.trim());
      onClose();
    } catch {
      // El aviso de error ya lo mostró el contenedor.
    } finally {
      setWorking(null);
    }
  };

  const alreadyPaid = delivery.cobro.estado === 'PAGADO';

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose} role="presentation">
      <div
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-[var(--surface-page)] pb-safe shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Entrega ${delivery.pedido.numero}`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-line bg-[var(--surface-page)] px-4 py-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              {delivery.pedido.numero || 'Pedido'}
            </p>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">{delivery.cliente.nombre || 'Cliente'}</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${DELIVERY_STATUS_PILL[delivery.estado] || 'bg-gray-100 text-gray-700'}`}>
              {DELIVERY_STATUS_LABEL[delivery.estado] || delivery.estado}
            </span>
            <button onClick={onClose} className="rounded-full bg-white p-2 text-[var(--text-secondary)]" aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="space-y-4 px-4 py-4">
          <div className="rounded-2xl border border-line bg-white p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-[var(--text-primary)]">{formatWindow(delivery.ventana.inicio, delivery.ventana.fin)}</span>
              <span className="text-[var(--text-secondary)]">{detail?.dia || delivery.dia}</span>
            </div>
            <div className="mt-3 flex items-start gap-2 text-sm text-[var(--text-secondary)]">
              <MapPin size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-[var(--text-primary)]">
                  {delivery.estacion?.nombre || 'Sin estación'}
                  {delivery.estacion?.lineaNombre ? ` · ${delivery.estacion.lineaNombre}` : ''}
                </p>
                {delivery.direccion && <p>{delivery.direccion}</p>}
                {delivery.puntoEncuentro && <p>Punto: {delivery.puntoEncuentro}</p>}
              </div>
            </div>
            {delivery.cliente.telefono && (
              <a
                href={`tel:${delivery.cliente.telefono}`}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[var(--surface-muted)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)]"
              >
                <Phone size={15} /> {delivery.cliente.telefono}
              </a>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-white p-4">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              <Receipt size={14} /> Cobro
            </p>
            <div className="mt-2 flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{formatCLP(delivery.cobro.monto)}</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {alreadyPaid ? 'Ya pagado: no cobrar' : `Cobrar al entregar`}
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${alreadyPaid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {alreadyPaid ? 'PAGADO' : 'POR COBRAR'}
              </span>
            </div>
            {detail?.cobroRegistrado && (
              <p className="mt-2 text-xs text-green-700">
                Registrado: {formatCLP(detail.cobroRegistrado.monto)} · {detail.cobroRegistrado.metodo}
              </p>
            )}
            {detail?.evidencia && (
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Evidencia: {detail.evidencia.codigo || 'foto'}
                {detail.evidencia.conFoto ? ' + foto' : ''}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-white p-4">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              <StickyNote size={14} /> Productos
            </p>
            {loadingDetail ? (
              <div className="mt-3 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Loader2 size={15} className="animate-spin" /> Cargando…
              </div>
            ) : detail?.productos?.length ? (
              <ul className="mt-2 space-y-1 text-sm text-[var(--text-primary)]">
                {detail.productos.map((p, i) => (
                  <li key={`${p.nombre}-${i}`} className="flex justify-between gap-3">
                    <span>{p.nombre}</span>
                    <span className="font-semibold">x{p.cantidad}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-[var(--text-secondary)]">Sin detalle de productos.</p>
            )}
            {(detail?.notasPedido || delivery.notas) && (
              <p className="mt-3 rounded-xl bg-[var(--surface-muted)] p-3 text-sm text-[var(--text-secondary)]">
                {detail?.notasPedido || delivery.notas}
              </p>
            )}
          </div>

          {reasonFor && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-bold text-red-800">{reasonFor.label}</p>
              <p className="mt-1 text-xs text-red-700">Escribe qué pasó para que el admin pueda reprogramar.</p>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={500}
                className="input mt-2 w-full bg-white text-sm text-[var(--text-primary)]"
                placeholder="Ej: el cliente no llegó al punto de encuentro"
              />
              <div className="mt-3 flex gap-2">
                <button onClick={() => setReasonFor(null)} className="flex-1 rounded-xl border border-line bg-white py-2.5 text-sm font-semibold">
                  Cancelar
                </button>
                <button
                  onClick={submitReason}
                  disabled={reason.trim().length < 3 || !!working}
                  className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white disabled:opacity-40"
                >
                  {working ? 'Guardando…' : 'Confirmar'}
                </button>
              </div>
            </div>
          )}

          {deliverOpen && (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-bold text-green-800">Cerrar entrega con comprobante</p>
              <p className="mt-1 text-xs text-green-700">
                El cobro y la prueba quedan asociados al pedido antes de marcarlo entregado.
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="text-xs font-semibold text-green-900">
                  Monto cobrado
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={alreadyPaid}
                    className="input mt-1 w-full bg-white text-sm text-[var(--text-primary)] disabled:opacity-60"
                  />
                </label>
                <label className="text-xs font-semibold text-green-900">
                  Medio
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    disabled={alreadyPaid}
                    className="input mt-1 w-full bg-white text-sm text-[var(--text-primary)] disabled:opacity-60"
                  >
                    {Object.entries(PAYMENT_METHOD_LABEL).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="mt-2 block text-xs font-semibold text-green-900">
                Referencia (opcional)
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  maxLength={100}
                  placeholder="Últimos dígitos / operación"
                  className="input mt-1 w-full bg-white text-sm text-[var(--text-primary)]"
                />
              </label>

              <label className="mt-2 block text-xs font-semibold text-green-900">
                Código de entrega
                <input
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value.slice(0, 12))}
                  maxLength={12}
                  className="input mt-1 w-full bg-white text-center text-lg tracking-[0.3em] text-[var(--text-primary)]"
                />
              </label>

              <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-green-400 bg-white px-3 py-3 text-xs font-bold text-green-800">
                <Camera size={16} />
                {compressing ? 'Procesando…' : photoName || 'Tomar o elegir foto (opcional)'}
                <input type="file" accept="image/*" capture="environment" onChange={onPhoto} className="hidden" />
              </label>
              {photo && (
                <div className="mt-2 flex items-center gap-2">
                  <div
                    className="h-16 w-16 rounded-xl border border-green-200 bg-cover bg-center"
                    style={{ backgroundImage: `url(${photo})` }}
                    role="img"
                    aria-label="Vista previa de la prueba de entrega"
                  />
                  <button
                    onClick={() => { setPhoto(null); setPhotoName(''); }}
                    className="text-xs font-semibold text-red-600"
                  >
                    Quitar foto
                  </button>
                </div>
              )}

              <label className="mt-2 block text-xs font-semibold text-green-900">
                Quién recibió (opcional)
                <input
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  maxLength={120}
                  className="input mt-1 w-full bg-white text-sm text-[var(--text-primary)]"
                />
              </label>
              <label className="mt-2 block text-xs font-semibold text-green-900">
                Notas (opcional)
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  maxLength={500}
                  className="input mt-1 w-full bg-white text-sm text-[var(--text-primary)]"
                />
              </label>

              <div className="mt-3 flex gap-2">
                <button onClick={() => setDeliverOpen(false)} className="flex-1 rounded-xl border border-line bg-white py-2.5 text-sm font-semibold">
                  Cancelar
                </button>
                <button
                  onClick={submitDeliver}
                  disabled={!!working || compressing || !hasPodEvidence(code, photo)}
                  className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-bold text-white disabled:opacity-40"
                >
                  {working ? 'Guardando…' : 'Confirmar entrega'}
                </button>
              </div>
            </div>
          )}

          {rescheduling && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-800">Pedir reprogramación</p>
              <p className="mt-1 text-xs text-amber-700">
                No cambia la fecha: avisa al admin para que reagende contigo.
              </p>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={500}
                className="input mt-2 w-full bg-white text-sm text-[var(--text-primary)]"
                placeholder="Motivo de la reprogramación"
              />
              <div className="mt-3 flex gap-2">
                <button onClick={() => setRescheduling(false)} className="flex-1 rounded-xl border border-line bg-white py-2.5 text-sm font-semibold">
                  Cancelar
                </button>
                <button
                  onClick={submitReschedule}
                  disabled={reason.trim().length < 3 || !!working}
                  className="flex-1 rounded-xl bg-amber-600 py-2.5 text-sm font-bold text-white disabled:opacity-40"
                >
                  {working ? 'Enviando…' : 'Enviar aviso'}
                </button>
              </div>
            </div>
          )}

          {!reasonFor && !deliverOpen && !rescheduling && actions.length > 0 && (
            <div className="space-y-2">
              {primary.map((action) => (
                <button
                  key={action.to}
                  onClick={() => pick(action)}
                  disabled={!!working}
                  className={`w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-40 ${
                    action.kind === 'success' ? 'bg-green-600' : 'bg-[var(--fill-primary)]'
                  }`}
                >
                  {working === action.to ? 'Guardando…' : action.label}
                </button>
              ))}
              {problems.length > 0 && (
                <details className="rounded-xl border border-line bg-white">
                  <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-red-600">
                    Informar un problema
                  </summary>
                  <div className="grid gap-2 px-3 pb-3">
                    {problems.map((action) => (
                      <button
                        key={action.to}
                        onClick={() => pick(action)}
                        disabled={!!working}
                        className="rounded-lg border border-red-200 px-3 py-2 text-left text-sm font-semibold text-red-700 disabled:opacity-40"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </details>
              )}
              <button
                onClick={() => { setReason(''); setRescheduling(true); }}
                className="w-full rounded-xl border border-line bg-white py-3 text-sm font-semibold text-[var(--text-secondary)]"
              >
                Pedir reprogramación
              </button>
            </div>
          )}

          {actions.length === 0 && (
            <p className="rounded-2xl border border-line bg-white p-4 text-center text-sm text-[var(--text-secondary)]">
              Esta entrega ya está cerrada.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
