'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CalendarDays,
  CheckCircle,
  Clock,
  MapPin,
  RefreshCw,
  Truck,
  XCircle,
  Search,
  ChevronDown,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatPrice, formatTime12 } from '@/lib/utils';
import { toast } from '@/lib/feedback';
import { handleAuthError } from '@/lib/admin/helpers';
import { DELIVERY_STATUS_LABEL, DELIVERY_STATUS_PILL, deliveryNextActions } from '@/lib/admin/deliveryStatus';
import type { AdminOrder } from '@/types/admin';
import NotificationButton from './NotificationButton';

const CHANNEL_LABEL: Record<string, string> = {
  METRO: '🚇 Metro',
  ENVIO_DOMICILIO: '🏠 Domicilio',
  RETIRO_TIENDA: '🏪 Local',
};

type Station = { id: string; name: string; line: string; lineName: string; commune: string };

type Delivery = {
  id: string;
  orderId: string;
  customerId: string;
  deliveryType: string;
  stationId: string | null;
  address: string | null;
  deliveryDate: string | null;
  windowStart: string | null;
  windowEnd: string | null;
  meetingPoint: string | null;
  notes: string | null;
  status: string;
  deliveryCode: string;
  assignedTo: string | null;
  confirmedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  order: { id: string; orderNumber: string; total: number; customerName: string; customerPhone: string };
  customer: { id: string; name: string; phone: string };
  station: Station | null;
};

type Stats = {
  today: number;
  week: number;
  month: number;
  byStatus: Record<string, number>;
  topStations: { station: Station | null; count: number }[];
  byLine: { line: string; lineName: string; count: number }[];
};

function weekBounds(): { from: string; to: string } {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { from: iso(monday), to: iso(sunday) };
}

export function Entregas({ token }: { token: string }) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterLine, setFilterLine] = useState('');
  const [week] = useState(weekBounds);
  const [filterDateFrom, setFilterDateFrom] = useState(week.from);
  const [filterDateTo, setFilterDateTo] = useState(week.to);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [closedToday, setClosedToday] = useState<AdminOrder[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterLine) params.set('line', filterLine);
      if (filterDateFrom) params.set('dateFrom', filterDateFrom);
      if (filterDateTo) params.set('dateTo', filterDateTo);
      params.set('limit', '200');

      const [delRes, statsRes] = await Promise.all([
        apiFetch<any>(`/deliveries?${params}`, { token }),
        apiFetch<Stats>('/deliveries/stats', { token }).catch(() => null),
      ]);

      setDeliveries(delRes?.data || delRes || []);
      if (statsRes) setStats(statsRes);

      // Cierre de hoy: ventas pagadas y entregadas el mismo día (todos los canales)
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const closedQ = new URLSearchParams({
        status: 'DELIVERED',
        paymentStatus: 'CONFIRMED',
        updatedFrom: today,
        updatedTo: today,
        page: '1',
        limit: '100',
      });
      const closedRes = await apiFetch<any>(`/orders?${closedQ}`, { token }).catch(() => null);
      setClosedToday(closedRes?.data || []);
    } catch (err: any) {
      if (handleAuthError(err, () => { localStorage.removeItem('admin_token'); window.location.href = '/login'; })) return;
      toast.error('Error al cargar entregas');
    } finally {
      setLoading(false);
    }
  }, [token, filterStatus, filterLine, filterDateFrom, filterDateTo]);

  useEffect(() => { loadData(); }, [loadData]);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    try {
      await apiFetch(`/deliveries/${id}/status`, { method: 'PATCH', token, body: { status } });
      toast.success(`Estado actualizado a ${DELIVERY_STATUS_LABEL[status] || status}`);
      loadData();
      setSelectedDelivery(null);
    } catch (err: any) {
      toast.error(err?.message || 'Error al actualizar');
    } finally {
      setUpdating(null);
    }
  };

  const filtered = deliveries.filter((d) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      d.order?.orderNumber?.toLowerCase().includes(term) ||
      d.customer?.name?.toLowerCase().includes(term) ||
      d.station?.name?.toLowerCase().includes(term) ||
      d.deliveryCode?.includes(term)
    );
  });

  const closedTotal = closedToday.reduce((s, o) => s + (o.total || 0), 0);
  const closedByChannel = closedToday.reduce<Record<string, { count: number; total: number }>>((acc, o) => {
    const k = o.deliveryType || 'RETIRO_TIENDA';
    if (!acc[k]) acc[k] = { count: 0, total: 0 };
    acc[k].count += 1;
    acc[k].total += o.total || 0;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={<CalendarDays size={16} />} label="Hoy" value={stats.today} color="text-accent" />
          <StatCard icon={<Truck size={16} />} label="Semana" value={stats.week} color="text-blue-600" />
          <StatCard icon={<CheckCircle size={16} />} label="Entregados" value={stats.byStatus['DELIVERED'] || 0} color="text-green-600" />
          <StatCard icon={<Clock size={16} />} label="Pendientes" value={Object.entries(stats.byStatus || {}).reduce((s, [k, v]) => (k === 'DELIVERED' || k === 'CANCELLED' ? s : s + (v || 0)), 0)} color="text-amber-600" />
        </div>
      )}

      {/* Cierre de hoy: pagadas + entregadas */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-800">
            Cierre de hoy · pagadas y entregadas
          </p>
          <p className="font-display text-2xl tabular-nums text-emerald-700">
            {formatPrice(closedTotal)}
          </p>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
          <span className="chip">{closedToday.length} ventas</span>
          {Object.entries(closedByChannel).map(([k, v]) => (
            <span key={k} className="chip">
              {CHANNEL_LABEL[k] || k} · {v.count} · {formatPrice(v.total)}
            </span>
          ))}
          {closedToday.length === 0 && (
            <span className="text-xs text-muted">Aún no hay ventas cerradas hoy.</span>
          )}
        </div>
        {closedToday.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {closedToday.slice(0, 8).map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-2 rounded-xl border border-line/60 bg-paper px-3 py-1.5 text-xs">
                <div className="min-w-0">
                  <span className="font-bold">{o.orderNumber}</span>
                  <span className="text-muted"> · {o.customer?.name || o.customerName || '—'}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-muted">{CHANNEL_LABEL[o.deliveryType || ''] || ''}</span>
                  <span className="text-muted tabular-nums">
                    {o.updatedAt
                      ? new Date(o.updatedAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
                      : ''}
                  </span>
                  <span className="font-bold tabular-nums">{formatPrice(o.total)}</span>
                </div>
              </div>
            ))}
            {closedToday.length > 8 && (
              <p className="text-[11px] text-muted">+{closedToday.length - 8} más hoy.</p>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por pedido, cliente, estación o código..."
            className="input pl-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-1">
          <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="input text-sm" />
          <span className="text-muted text-xs">—</span>
          <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="input text-sm" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input text-sm">
          <option value="">Todos los estados</option>
          {Object.entries(DELIVERY_STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select value={filterLine} onChange={(e) => setFilterLine(e.target.value)} className="input text-sm">
          <option value="">Todas las líneas</option>
          {stats?.byLine.map((l) => (
            <option key={l.line} value={l.line}>{l.lineName} ({l.count})</option>
          ))}
        </select>
        <button onClick={() => {
          const header = 'Pedido,Cliente,Estación,Línea,Comuna,Fecha,Hora,Código,Estado,Punto';
          const rows = filtered.map(d => [
            d.order?.orderNumber,
            d.customer?.name || d.order?.customerName,
            d.station?.name || '',
            d.station?.line || '',
            d.station?.commune || '',
            d.deliveryDate ? new Date(d.deliveryDate).toLocaleDateString('es-CL') : '',
            `${d.windowStart ? formatTime12(d.windowStart) : ''}–${d.windowEnd ? formatTime12(d.windowEnd) : ''}`,
            d.deliveryCode,
            DELIVERY_STATUS_LABEL[d.status] || d.status,
            d.meetingPoint || '',
          ].map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
          const blob = new Blob(['\uFEFF' + `${header}\n${rows}`], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `entregas-${filterDateFrom}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        }} className="btn-outline px-3 py-2 text-xs min-h-[40px]">CSV</button>
        <button onClick={loadData} className="btn-outline px-3 py-2 text-xs min-h-[40px]">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Deliveries table */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">No hay entregas para los filtros seleccionados.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-soft/50 text-left text-xs font-bold uppercase tracking-wider text-muted">
                <th className="px-3 py-2">Hora</th>
                <th className="px-3 py-2">Pedido</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2 hidden sm:table-cell">Estación</th>
                <th className="px-3 py-2 hidden md:table-cell">Línea</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="border-b border-line last:border-0 hover:bg-soft/30">
                  <td className="px-3 py-2 font-mono text-xs">
                    {d.windowStart ? formatTime12(d.windowStart) : '—'}{d.windowEnd ? `–${formatTime12(d.windowEnd)}` : ''}
                  </td>
                  <td className="px-3 py-2 font-bold">{d.order?.orderNumber || '—'}</td>
                  <td className="px-3 py-2">{d.customer?.name || d.order?.customerName || '—'}</td>
                  <td className="px-3 py-2 hidden sm:table-cell">
                    <span className="flex items-center gap-1">
                      <MapPin size={12} className="text-muted" />
                      {d.station?.name || '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2 hidden md:table-cell text-xs text-muted">{d.station?.line || '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${DELIVERY_STATUS_PILL[d.status] || 'bg-gray-100 text-gray-700'}`}>
                      {DELIVERY_STATUS_LABEL[d.status] || d.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSelectedDelivery(d)} className="rounded-lg px-2 py-1 text-xs font-semibold hover:bg-soft min-h-[32px]">
                        Ver
                      </button>
                      <NotificationButton
                        delivery={{
                          deliveryId: d.id,
                          orderNumber: d.order?.orderNumber,
                          customerName: d.customer?.name || d.order?.customerName,
                          customerPhone: d.customer?.phone || d.order?.customerPhone,
                          stationName: d.station?.name,
                          lineName: d.station?.lineName || d.station?.line,
                          deliveryDate: d.deliveryDate,
                          windowStart: d.windowStart,
                          windowEnd: d.windowEnd,
                          meetingPoint: d.meetingPoint,
                          deliveryCode: d.deliveryCode,
                          commune: d.station?.commune,
                          status: d.status,
                        }}
                      />
                      {d.status === 'CONFIRMED' && (
                        <button
                          onClick={() => updateStatus(d.id, 'IN_ROUTE')}
                          disabled={updating === d.id}
                          className="rounded-lg bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-700 hover:bg-cyan-100 min-h-[32px]"
                        >
                          En ruta
                        </button>
                      )}
                      {d.status === 'IN_ROUTE' && (
                        <button
                          onClick={() => updateStatus(d.id, 'ARRIVED')}
                          disabled={updating === d.id}
                          className="rounded-lg bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 min-h-[32px]"
                        >
                          Llegó
                        </button>
                      )}
                      {d.status === 'ARRIVED' && (
                        <button
                          onClick={() => updateStatus(d.id, 'DELIVERED')}
                          disabled={updating === d.id}
                          className="rounded-lg bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-100 min-h-[32px]"
                        >
                          Entregar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail modal */}
      {selectedDelivery && (
        <DeliveryDetail
          delivery={selectedDelivery}
          token={token}
          onClose={() => setSelectedDelivery(null)}
          onUpdated={loadData}
          onUpdateStatus={updateStatus}
          updating={updating}
        />
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl border border-line bg-paper p-4">
      <div className={`flex items-center gap-2 ${color}`}>{icon}<span className="text-xs font-bold uppercase tracking-wider">{label}</span></div>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function DeliveryDetail({
  delivery,
  token,
  onClose,
  onUpdated,
  onUpdateStatus,
  updating,
}: {
  delivery: Delivery;
  token: string;
  onClose: () => void;
  onUpdated: () => void;
  onUpdateStatus: (id: string, status: string) => void;
  updating: string | null;
}) {
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  const verifyCode = async () => {
    if (code.length !== 4) return;
    setVerifying(true);
    try {
      await apiFetch(`/deliveries/${delivery.id}/verify-code`, { method: 'PATCH', token, body: { code } });
      toast.success('✓ Entrega confirmada');
      onUpdated();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Código incorrecto');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-line bg-paper p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg uppercase">Detalle de Entrega</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-soft"><XCircle size={18} /></button>
        </div>

        <div className="mt-4 space-y-3 text-sm">
          <Row label="Pedido" value={delivery.order?.orderNumber || '—'} />
          <Row label="Cliente" value={delivery.customer?.name || delivery.order?.customerName || '—'} />
          <Row label="Teléfono" value={delivery.customer?.phone || delivery.order?.customerPhone || '—'} />
          <Row label="Código" value={delivery.deliveryCode} bold />
          <Row label="Tipo" value={delivery.deliveryType === 'METRO' ? '🚇 Metro' : delivery.deliveryType === 'ENVIO_DOMICILIO' ? '🏠 Domicilio' : '🏪 Retiro'} />
          {delivery.station && (
            <>
              <Row label="Estación" value={`${delivery.station.name} (${delivery.station.lineName})`} />
              <Row label="Comuna" value={delivery.station.commune} />
            </>
          )}
          {delivery.deliveryType === 'ENVIO_DOMICILIO' && delivery.address && (
            <Row label="Dirección" value={delivery.address} />
          )}
          <Row label="Fecha" value={delivery.deliveryDate ? new Date(delivery.deliveryDate).toLocaleDateString('es-CL') : '—'} />
          <Row label="Horario" value={delivery.windowStart ? `${formatTime12(delivery.windowStart)}–${delivery.windowEnd ? formatTime12(delivery.windowEnd) : ''}` : '—'} />
          <Row label="Punto" value={delivery.meetingPoint || '—'} />
          <Row label="Estado" value={<span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${DELIVERY_STATUS_PILL[delivery.status] || ''}`}>{DELIVERY_STATUS_LABEL[delivery.status] || delivery.status}</span>} />
          {delivery.order?.total != null && <Row label="Total pedido" value={`$${Number(delivery.order.total).toLocaleString()}`} />}
          {delivery.notes && <Row label="Notas" value={delivery.notes} />}

          {/* Code verification (only valid from ARRIVED) */}
          {delivery.status === 'ARRIVED' && (
            <div className="mt-4 rounded-xl border border-line bg-soft/40 p-3">
              <p className="text-xs font-bold text-muted">Código del cliente:</p>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="____"
                  className="input w-24 text-center font-mono text-lg tracking-[0.3em]"
                  maxLength={4}
                />
                <button
                  onClick={verifyCode}
                  disabled={code.length !== 4 || verifying}
                  className="btn-primary px-4 text-xs min-h-[40px]"
                >
                  {verifying ? 'Verificando...' : '✓ Confirmar'}
                </button>
              </div>
            </div>
          )}

          {/* Status actions — only backend-valid transitions */}
          <div className="mt-4 flex flex-wrap gap-2">
            {deliveryNextActions(delivery.status).map((a) => (
              <button
                key={a.to}
                onClick={() => onUpdateStatus(delivery.id, a.to)}
                disabled={!!updating}
                className={
                  a.kind === 'primary'
                    ? 'btn-primary px-4 text-xs min-h-[40px] disabled:opacity-50'
                    : a.kind === 'danger'
                      ? 'rounded-xl border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 min-h-[40px] disabled:opacity-50'
                      : 'rounded-xl border border-amber-300 px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 min-h-[40px] disabled:opacity-50'
                }
              >
                {a.label}
              </button>
            ))}
            <NotificationButton
              delivery={{
                deliveryId: delivery.id,
                orderNumber: delivery.order?.orderNumber,
                customerName: delivery.customer?.name || delivery.order?.customerName,
                customerPhone: delivery.customer?.phone || delivery.order?.customerPhone,
                stationName: delivery.station?.name,
                lineName: delivery.station?.line,
                deliveryDate: delivery.deliveryDate,
                windowStart: delivery.windowStart,
                windowEnd: delivery.windowEnd,
                meetingPoint: delivery.meetingPoint,
                deliveryCode: delivery.deliveryCode,
                commune: delivery.station?.commune,
                status: delivery.status,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: React.ReactNode; bold?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="shrink-0 text-xs font-semibold text-muted">{label}:</span>
      <span className={`text-right ${bold ? 'font-bold' : ''}`}>{value}</span>
    </div>
  );
}
