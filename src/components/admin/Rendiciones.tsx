'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Eye, FileImage, Loader2, RefreshCw, Wallet } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { toast } from '@/lib/feedback';
import { formatCLP, paymentMethodLabel, todayChileISO } from '@/lib/courier/helpers';

type Money = { efectivo: number; transferencia: number; otros: number; total: number };
type Shift = {
  id: string;
  estado: 'ABIERTA' | 'RENDIDA' | 'CONFIRMADA' | 'ANULADA';
  esperado: Money;
  declarado: Money & { total: number | null };
  diferencia: number | null;
  cerradaEn: string | null;
  confirmadaEn: string | null;
  notas: string | null;
  courier: { id: string; name: string };
  confirmedBy: { id: string; name: string } | null;
  cobros: number;
  recaudado: number;
};
type Collection = {
  id: string;
  deliveryId: string;
  monto: number;
  metodo: string;
  referencia: string | null;
  cobradoEn: string;
  pedido: string | null;
  cliente: string | null;
  evidencia: {
    codigo: string | null;
    receptor: string | null;
    conFoto: boolean;
    registradaEn: string;
  } | null;
};
type Detail = Shift & { cobrosDetalle: Collection[] };

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('es-CL', {
      timeZone: 'America/Santiago',
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function Rendiciones() {
  const [day, setDay] = useState(todayChileISO());
  const [status, setStatus] = useState('RENDIDA');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [photo, setPhoto] = useState<{ url: string; pedido: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [declared, setDeclared] = useState({ efectivo: '', transferencia: '', otros: '' });
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ day, ...(status ? { status } : {}) });
      const rows = await apiFetch<Shift[]>(`/courier/rendiciones?${qs}`);
      setShifts(rows);
      setDetail(null);
    } catch (err: any) {
      toast.error(err?.message || 'No se pudieron cargar las rendiciones.');
    } finally {
      setLoading(false);
    }
  }, [day, status]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (id: string) => {
    setLoading(true);
    try {
      const data = await apiFetch<any>(`/courier/rendiciones/${id}`);
      setDetail({ ...data, cobrosDetalle: data.cobrosDetalle || [] });
      setDeclared({
        efectivo: String(data.declarado?.efectivo ?? 0),
        transferencia: String(data.declarado?.transferencia ?? 0),
        otros: String(data.declarado?.otros ?? 0),
      });
      setNotes(data.notas || '');
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo cargar el detalle.');
    } finally {
      setLoading(false);
    }
  };

  const openPhoto = async (deliveryId: string, pedido: string | null) => {
    if (!detail) return;
    try {
      const data = await apiFetch<{ foto: string | null; pedido: string | null }>(
        `/courier/rendiciones/${detail.id}/proof/${deliveryId}`,
      );
      if (!data.foto) {
        toast.error('Esta prueba no tiene foto (solo código).');
        return;
      }
      setPhoto({ url: data.foto, pedido: data.pedido || pedido });
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo cargar la foto.');
    }
  };

  const confirm = async () => {
    if (!detail) return;
    const values = {
      efectivo: Number(declared.efectivo),
      transferencia: Number(declared.transferencia),
      otros: Number(declared.otros),
    };
    if (Object.values(values).some((n) => !Number.isFinite(n) || n < 0)) {
      toast.error('Revisa los montos declarados.');
      return;
    }
    setConfirming(true);
    try {
      await apiFetch(`/courier/rendiciones/${detail.id}/confirm`, {
        method: 'POST',
        body: { declared: values, notes },
      });
      toast.success('Rendición confirmada.');
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo confirmar.');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="space-y-5 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Rendiciones del repartidor</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Control de cobros y efectivo de la ruta Metro. Independiente de la caja del POS: aquí no se abren turnos ni se registran ventas.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] disabled:opacity-50"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Actualizar
        </button>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-line bg-white p-3">
        <label className="text-xs font-semibold text-[var(--text-secondary)]">
          Día
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="input ml-2 mt-0 w-auto text-sm text-[var(--text-primary)]"
          />
        </label>
        <label className="text-xs font-semibold text-[var(--text-secondary)]">
          Estado
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="input ml-2 mt-0 w-auto text-sm text-[var(--text-primary)]"
          >
            <option value="">Todos</option>
            <option value="ABIERTA">Abierta</option>
            <option value="RENDIDA">Rendida (sin confirmar)</option>
            <option value="CONFIRMADA">Confirmada</option>
            <option value="ANULADA">Anulada</option>
          </select>
        </label>
      </div>

      {shifts.length === 0 && !loading && (
        <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center">
          <Wallet size={28} className="mx-auto text-[var(--text-muted)]" />
          <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">Sin rendiciones para este filtro</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Aparecen cuando el repartidor cierra el día desde la PWA.
          </p>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {shifts.map((s) => (
          <button
            key={s.id}
            onClick={() => openDetail(s.id)}
            className={`rounded-2xl border bg-white p-4 text-left transition hover:shadow-md ${
              detail?.id === s.id ? 'border-[var(--fill-primary)]' : 'border-line'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-[var(--text-primary)]">{s.courier?.name || 'Repartidor'}</p>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  {s.cobros} cobros · recaudado {formatCLP(s.recaudado)}
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                s.estado === 'CONFIRMADA' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {s.estado}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <p className="text-[var(--text-secondary)]">Esperado</p>
                <p className="font-bold text-[var(--text-primary)]">{formatCLP(s.esperado.total)}</p>
              </div>
              <div>
                <p className="text-[var(--text-secondary)]">Declarado</p>
                <p className="font-bold text-[var(--text-primary)]">
                  {s.declarado.total === null ? '—' : formatCLP(s.declarado.total)}
                </p>
              </div>
              <div>
                <p className="text-[var(--text-secondary)]">Diferencia</p>
                <p className={`font-bold ${Number(s.diferencia || 0) === 0 ? 'text-green-700' : 'text-amber-700'}`}>
                  {s.diferencia === null ? '—' : formatCLP(s.diferencia)}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {detail && (
        <div className="rounded-2xl border border-line bg-white p-4 lg:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                {detail.courier?.name || 'Repartidor'}
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Cerrada {formatDateTime(detail.cerradaEn)}
                {detail.confirmedBy ? ` · Confirmada por ${detail.confirmedBy.name}` : ''}
              </p>
            </div>
            <button
              onClick={() => setDetail(null)}
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]"
            >
              Cerrar detalle
            </button>
          </div>

          {detail.diferencia !== null && detail.diferencia !== 0 && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-bold">Diferencia de {formatCLP(detail.diferencia)}</p>
                <p className="text-xs">
                  {detail.diferencia < 0
                    ? 'El repartidor declaró menos de lo esperado. Revisa los cobros antes de confirmar.'
                    : 'El repartidor declaró más de lo esperado. Revisa la documentación.'}
                </p>
              </div>
            </div>
          )}

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">
                <tr className="border-b border-line">
                  <th className="py-2">Pedido</th>
                  <th className="py-2">Cliente</th>
                  <th className="py-2">Monto</th>
                  <th className="py-2">Medio</th>
                  <th className="py-2">Evidencia</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {detail.cobrosDetalle.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-[var(--text-secondary)]">
                      No hay cobros registrados (rendición preliminar de entregas anteriores).
                    </td>
                  </tr>
                )}
                {detail.cobrosDetalle.map((c) => (
                  <tr key={c.id} className="border-b border-line last:border-0">
                    <td className="py-2 font-semibold text-[var(--text-primary)]">{c.pedido || '—'}</td>
                    <td className="py-2 text-[var(--text-secondary)]">{c.cliente || '—'}</td>
                    <td className="py-2 font-bold text-[var(--text-primary)]">{formatCLP(c.monto)}</td>
                    <td className="py-2 text-[var(--text-secondary)]">
                      {paymentMethodLabel(c.metodo)}
                      {c.referencia ? ` · ${c.referencia}` : ''}
                    </td>
                    <td className="py-2 text-[var(--text-secondary)]">
                      {c.evidencia?.codigo || '—'}
                      {c.evidencia?.conFoto ? ' · foto' : ''}
                    </td>
                    <td className="py-2">
                      {c.evidencia?.conFoto && (
                        <button
                          onClick={() => openPhoto(c.deliveryId, c.pedido)}
                          className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs font-semibold text-[var(--text-secondary)]"
                        >
                          <Eye size={13} /> Ver foto
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {detail.estado === 'RENDIDA' && (
            <div className="mt-5 rounded-xl border border-line bg-[var(--surface-page)] p-4">
              <p className="text-sm font-bold text-[var(--text-primary)]">Confirmar rendición</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Puedes ajustar el monto declarado si el conteo en caja difiere. El cambio queda auditado con tu usuario.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {([
                  ['efectivo', 'Efectivo'],
                  ['transferencia', 'Transferencia'],
                  ['otros', 'Otros medios'],
                ] as const).map(([key, label]) => (
                  <label key={key} className="text-xs font-semibold text-[var(--text-secondary)]">
                    {label}
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={declared[key]}
                      onChange={(e) => setDeclared((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="input mt-1 w-full text-sm text-[var(--text-primary)]"
                    />
                  </label>
                ))}
              </div>
              <label className="mt-2 block text-xs font-semibold text-[var(--text-secondary)]">
                Nota de cierre (opcional)
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  maxLength={500}
                  className="input mt-1 w-full text-sm text-[var(--text-primary)]"
                />
              </label>
              <button
                onClick={confirm}
                disabled={confirming}
                className="mt-3 flex items-center gap-2 rounded-xl bg-[var(--fill-primary)] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
              >
                {confirming ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                {confirming ? 'Confirmando…' : 'Confirmar rendición'}
              </button>
            </div>
          )}
        </div>
      )}

      {photo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPhoto(null)}
          role="presentation"
        >
          <div
            className="max-h-[90dvh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-4"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Foto de la prueba de entrega"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
                <FileImage size={16} /> {photo.pedido || 'Prueba de entrega'}
              </p>
              <button
                onClick={() => setPhoto(null)}
                className="rounded-lg border border-line px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]"
              >
                Cerrar
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL local, sin optimización de Next */}
            <img src={photo.url} alt="Prueba de entrega" className="w-full rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
}
