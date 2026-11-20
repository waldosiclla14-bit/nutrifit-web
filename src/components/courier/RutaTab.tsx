'use client';

import { useState } from 'react';
import { CheckCircle2, ClipboardList, Loader2, RefreshCw, Truck, XCircle } from 'lucide-react';
import { formatCLP, formatWindow, groupByStation } from '@/lib/courier/helpers';
import type { CourierAction } from '@/lib/courier/helpers';
import type { CourierDeliverPayload, CourierDelivery, CourierRoute } from '@/lib/courier/types';
import { DELIVERY_STATUS_LABEL, DELIVERY_STATUS_PILL } from '@/lib/admin/deliveryStatus';
import DeliverySheet from './DeliverySheet';

type Day = 'hoy' | 'manana';

type Props = {
  route: CourierRoute | null;
  loading: boolean;
  day: Day;
  onDayChange: (day: Day) => void;
  mananaHabilitado: boolean;
  onRefresh: () => void;
  onStatus: (delivery: CourierDelivery, action: CourierAction, reason?: string) => Promise<void>;
  onDeliver: (delivery: CourierDelivery, payload: CourierDeliverPayload) => Promise<void>;
  onReschedule: (delivery: CourierDelivery, reason: string) => Promise<void>;
};

function SummaryChip({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: string }) {
  return (
    <div className="flex flex-1 flex-col gap-1 rounded-2xl border border-line bg-white p-3">
      <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${tone}`}>
        {icon} {label}
      </span>
      <span className="text-xl font-bold text-[var(--text-primary)]">{value}</span>
    </div>
  );
}

export default function RutaTab({
  route,
  loading,
  day,
  onDayChange,
  mananaHabilitado,
  onRefresh,
  onStatus,
  onDeliver,
  onReschedule,
}: Props) {
  const [selected, setSelected] = useState<CourierDelivery | null>(null);
  const groups = groupByStation(route?.entregas || []);

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
          aria-label="Actualizar ruta"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
        </button>
      </div>

      {route && (
        <div className="flex gap-2">
          <SummaryChip icon={<Truck size={12} />} label="Pendientes" value={route.resumen.pendientes} tone="text-amber-600" />
          <SummaryChip icon={<CheckCircle2 size={12} />} label="Entregadas" value={route.resumen.entregadas} tone="text-green-600" />
          <SummaryChip icon={<XCircle size={12} />} label="No entregadas" value={route.resumen.noEntregadas} tone="text-red-600" />
        </div>
      )}

      {loading && !route && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
      )}

      {route && route.entregas.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-white p-10 text-center">
          <ClipboardList size={28} className="text-[var(--text-muted)]" />
          <p className="text-sm font-semibold text-[var(--text-primary)]">Sin entregas para {day === 'hoy' ? 'hoy' : 'mañana'}</p>
          <p className="text-xs text-[var(--text-secondary)]">Cuando el admin te asigne pedidos aparecerán aquí.</p>
        </div>
      )}

      {groups.map((group) => (
        <section key={group.key} className="space-y-2">
          <div className="flex items-baseline justify-between px-1">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">{group.nombre}</h2>
              <p className="text-[11px] text-[var(--text-secondary)]">
                {[group.linea, group.comuna].filter(Boolean).join(' · ') || 'Sin línea'}
              </p>
            </div>
            <span className="text-[11px] font-semibold text-[var(--text-secondary)]">{group.entregas.length} entrega{group.entregas.length === 1 ? '' : 's'}</span>
          </div>

          {group.entregas.map((delivery) => (
            <button
              key={delivery.id}
              onClick={() => setSelected(delivery)}
              className="w-full rounded-2xl border border-line bg-white p-4 text-left transition active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[var(--text-primary)]">
                    {delivery.cliente.nombre || delivery.pedido.numero || 'Cliente'}
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    {delivery.pedido.numero} · {formatWindow(delivery.ventana.inicio, delivery.ventana.fin)}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${DELIVERY_STATUS_PILL[delivery.estado] || 'bg-gray-100 text-gray-700'}`}>
                  {DELIVERY_STATUS_LABEL[delivery.estado] || delivery.estado}
                </span>
              </div>
              <div className="mt-3 flex items-end justify-between gap-2">
                <div className="min-w-0 text-xs text-[var(--text-secondary)]">
                  <p className="truncate">{delivery.puntoEncuentro || delivery.direccion || 'Sin punto de encuentro'}</p>
                  <p className="mt-0.5">{delivery.cobro.estado === 'PAGADO' ? 'Pagado' : `Cobrar ${formatCLP(delivery.cobro.monto)}`}</p>
                </div>
                <span className={`shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold ${delivery.cobro.estado === 'PAGADO' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                  {delivery.cobro.estado === 'PAGADO' ? 'PAGADO' : formatCLP(delivery.cobro.monto)}
                </span>
              </div>
            </button>
          ))}
        </section>
      ))}

      {selected && (
        <DeliverySheet
          delivery={selected}
          onClose={() => setSelected(null)}
          onStatus={onStatus}
          onDeliver={onDeliver}
          onReschedule={onReschedule}
        />
      )}
    </div>
  );
}
