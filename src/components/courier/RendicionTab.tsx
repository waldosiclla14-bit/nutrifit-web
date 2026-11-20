'use client';

import { useEffect, useRef, useState } from 'react';
import { Banknote, CheckCircle2, Clock, CreditCard, Info, Loader2, RefreshCw, Send, Wallet } from 'lucide-react';
import { formatCLP, paymentMethodLabel } from '@/lib/courier/helpers';
import type { CourierRendicion } from '@/lib/courier/types';

type Day = 'hoy' | 'manana';

type Props = {
  rendicion: CourierRendicion | null;
  loading: boolean;
  day: Day;
  onDayChange: (day: Day) => void;
  mananaHabilitado: boolean;
  onRefresh: () => void;
  onCerrar: (declared: { efectivo: number; transferencia: number; otros: number }, notes: string) => Promise<void>;
};

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-2.5 last:border-0">
      <span className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        {icon} {label}
      </span>
      <span className="text-sm font-bold text-[var(--text-primary)]">{value}</span>
    </div>
  );
}

export default function RendicionTab({
  rendicion,
  loading,
  day,
  onDayChange,
  mananaHabilitado,
  onRefresh,
  onCerrar,
}: Props) {
  const [efectivo, setEfectivo] = useState('');
  const [transferencia, setTransferencia] = useState('');
  const [otros, setOtros] = useState('');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const lastReset = useRef('');

  const turno = rendicion?.turno || null;
  const resetKey = `${rendicion?.dia || ''}:${rendicion?.porRendir.total ?? ''}:${turno?.id || ''}`;

  useEffect(() => {
    // No sobrescribir lo que el repartidor está escribiendo si solo se refrescó.
    if (!rendicion || lastReset.current === resetKey) return;
    lastReset.current = resetKey;
    setEfectivo(String(rendicion.porRendir.efectivo));
    setTransferencia(String(rendicion.porRendir.transferencia));
    setOtros(String(rendicion.porRendir.otros));
  }, [rendicion, resetKey]);

  const submit = async () => {
    const declared = {
      efectivo: Number(efectivo),
      transferencia: Number(transferencia),
      otros: Number(otros),
    };
    if (Object.values(declared).some((n) => !Number.isFinite(n) || n < 0)) return;
    setSending(true);
    try {
      await onCerrar(declared, notes.trim());
      setNotes('');
    } catch {
      // El contenedor ya mostró el error; se mantiene el formulario abierta.
    } finally {
      setSending(false);
    }
  };

  const cerrada = !!turno && turno.estado !== 'ABIERTA';
  const puedeCerrar = !!rendicion && rendicion.cerrado && day === 'hoy' && !cerrada;

  return (
    <div className="space-y-4 px-4 pb-4">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1 rounded-2xl border border-line bg-white p-1">
          <button
            onClick={() => onDayChange('hoy')}
            className={`flex-1 rounded-xl py-2 text-sm font-bold ${day === 'hoy' ? 'bg-[var(--fill-primary)] text-white' : 'text-[var(--text-secondary)]'}`}
          >
            Hoy
          </button>
          {mananaHabilitado && (
            <button
              onClick={() => onDayChange('manana')}
              className={`flex-1 rounded-xl py-2 text-sm font-bold ${day === 'manana' ? 'bg-[var(--fill-primary)] text-white' : 'text-[var(--text-secondary)]'}`}
            >
              Mañana
            </button>
          )}
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="rounded-2xl border border-line bg-white p-3 text-[var(--text-secondary)] disabled:opacity-50"
          aria-label="Actualizar rendición"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
        </button>
      </div>

      {!rendicion && loading && <div className="skeleton h-48 rounded-2xl" />}

      {rendicion && (
        <>
          <div className="rounded-3xl bg-[var(--fill-primary)] p-5 text-white">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-white/70">
              <Wallet size={13} /> {rendicion.preliminar ? 'Por rendir (estimado)' : 'Recaudado'}
            </p>
            <p className="mt-2 text-3xl font-bold">{formatCLP(rendicion.porRendir.total)}</p>
            <p className="mt-1 text-xs text-white/60">
              {rendicion.preliminar
                ? ' Calculado de pedidos entregados sin pago previo. Aún no hay cobros registrados.'
                : ' Suma de los cobros registrados con comprobante.'}
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-white px-4">
            <Row icon={<Banknote size={15} />} label="Efectivo" value={formatCLP(rendicion.porRendir.efectivo)} />
            <Row icon={<CreditCard size={15} />} label="Transferencia" value={formatCLP(rendicion.porRendir.transferencia)} />
            <Row icon={<Wallet size={15} />} label={paymentMethodLabel('OTRO')} value={formatCLP(rendicion.porRendir.otros)} />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-line bg-white p-3 text-center">
              <CheckCircle2 size={16} className="mx-auto text-green-600" />
              <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">{rendicion.entregadas}</p>
              <p className="text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">Entregadas</p>
            </div>
            <div className="rounded-2xl border border-line bg-white p-3 text-center">
              <Clock size={16} className="mx-auto text-amber-600" />
              <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">{rendicion.pendientes}</p>
              <p className="text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">Pendientes</p>
            </div>
            <div className="rounded-2xl border border-line bg-white p-3 text-center">
              <Info size={16} className="mx-auto text-red-600" />
              <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">{rendicion.noEntregadas}</p>
              <p className="text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">No entregadas</p>
            </div>
          </div>

          {turno && (
            <div className="rounded-2xl border border-line bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-[var(--text-primary)]">Tu rendición</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  turno.estado === 'CONFIRMADA'
                    ? 'bg-green-100 text-green-700'
                    : turno.estado === 'RENDIDA'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                }`}>
                  {turno.estado}
                </span>
              </div>
              <div className="mt-3 space-y-1.5 text-sm">
                <p className="flex justify-between gap-3 text-[var(--text-secondary)]">
                  <span>Esperado</span>
                  <span className="font-semibold text-[var(--text-primary)]">{formatCLP(turno.esperado.total)}</span>
                </p>
                <p className="flex justify-between gap-3 text-[var(--text-secondary)]">
                  <span>Declarado</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {turno.declarado.total === null ? '—' : formatCLP(turno.declarado.total)}
                  </span>
                </p>
                <p className="flex justify-between gap-3 text-[var(--text-secondary)]">
                  <span>Diferencia</span>
                  <span className={`font-bold ${Number(turno.diferencia || 0) === 0 ? 'text-green-700' : 'text-amber-700'}`}>
                    {turno.diferencia === null ? '—' : formatCLP(turno.diferencia)}
                  </span>
                </p>
              </div>
              {turno.notas && <p className="mt-2 text-xs text-[var(--text-secondary)]">Nota: {turno.notas}</p>}
              {turno.estado === 'RENDIDA' && (
                <p className="mt-3 rounded-xl bg-blue-50 p-2 text-xs text-blue-800">
                  Enviada. El admin revisará el efectivo y confirmará la rendición.
                </p>
              )}
              {turno.estado === 'CONFIRMADA' && (
                <p className="mt-3 rounded-xl bg-green-50 p-2 text-xs text-green-800">
                  Confirmada por el admin. Ya no se puede modificar.
                </p>
              )}
            </div>
          )}

          <div className={`rounded-2xl border p-4 text-sm ${rendicion.cerrado ? 'border-green-200 bg-green-50 text-green-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
            {rendicion.cerrado
              ? 'Sin entregas pendientes: puedes cerrar y enviar tu rendición.'
              : `Quedan ${rendicion.pendientes} entregas sin estado final. No puedes cerrar el día.`}
          </div>

          {puedeCerrar && (
            <div className="space-y-3 rounded-2xl border border-line bg-white p-4">
              <p className="text-sm font-bold text-[var(--text-primary)]">Declara lo que tienes en la mano</p>
              <p className="text-xs text-[var(--text-secondary)]">
                Ajusta los montos si recibiste menos o más de lo esperado. La diferencia quedará registrada.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Efectivo
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={efectivo}
                    onChange={(e) => setEfectivo(e.target.value)}
                    className="input mt-1 w-full text-sm text-[var(--text-primary)]"
                  />
                </label>
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Transferencia
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={transferencia}
                    onChange={(e) => setTransferencia(e.target.value)}
                    className="input mt-1 w-full text-sm text-[var(--text-primary)]"
                  />
                </label>
              </div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                Otros medios
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={otros}
                  onChange={(e) => setOtros(e.target.value)}
                  className="input mt-1 w-full text-sm text-[var(--text-primary)]"
                />
              </label>
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                Nota para el admin (opcional)
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  maxLength={500}
                  className="input mt-1 w-full text-sm text-[var(--text-primary)]"
                  placeholder="Ej: faltó un billete de 10.000"
                />
              </label>
              <button
                onClick={submit}
                disabled={sending || [efectivo, transferencia, otros].some((v) => v === '' || Number(v) < 0 || !Number.isFinite(Number(v)))}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--fill-primary)] py-3 text-sm font-bold text-white disabled:opacity-40"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {sending ? 'Enviando…' : 'Enviar rendición'}
              </button>
            </div>
          )}

          {day === 'manana' && (
            <p className="px-1 text-[11px] text-[var(--text-secondary)]">
              La rendición se cierra solo del día de hoy. Cambia a «Hoy» para enviarla.
            </p>
          )}
        </>
      )}
    </div>
  );
}
