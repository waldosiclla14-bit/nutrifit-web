'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Clock, User, Truck, XCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { toast } from '@/lib/feedback';
import GoogleCalendarStatus from './GoogleCalendarStatus';

type Delivery = {
  id: string;
  status: string;
  deliveryDate: string | null;
  windowStart: string | null;
  windowEnd: string | null;
  meetingPoint: string | null;
  deliveryCode: string;
  order: { orderNumber: string; total: number; customerName: string };
  customer: { name: string; phone: string };
  station: { name: string; line: string; lineName: string; commune: string } | null;
};

const STATUS_DOT: Record<string, string> = {
  CREATED: 'bg-gray-400',
  PAYMENT_CONFIRMED: 'bg-blue-400',
  PREPARING: 'bg-yellow-400',
  READY: 'bg-orange-400',
  SCHEDULED: 'bg-purple-400',
  CONFIRMATION_PENDING: 'bg-amber-400',
  CONFIRMED: 'bg-emerald-400',
  IN_ROUTE: 'bg-cyan-400',
  ARRIVED: 'bg-indigo-400',
  DELIVERED: 'bg-green-500',
  CANCELLED: 'bg-red-400',
};

const STATUS_LABEL: Record<string, string> = {
  CREATED: 'Creado',
  PAYMENT_CONFIRMED: 'Pago',
  PREPARING: 'Preparando',
  READY: 'Listo',
  SCHEDULED: 'Programado',
  CONFIRMATION_PENDING: 'Pendiente',
  CONFIRMED: 'Confirmado',
  IN_ROUTE: 'En ruta',
  ARRIVED: 'Llegó',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};

type ViewMode = 'day' | 'week' | 'month';

export function Calendario({ token }: { token: string }) {
  const [view, setView] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Delivery | null>(null);

  const loadDeliveries = useCallback(async () => {
    setLoading(true);
    try {
      const from = new Date(currentDate);
      const to = new Date(currentDate);

      if (view === 'day') {
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
      } else if (view === 'week') {
        const day = from.getDay();
        from.setDate(from.getDate() - day);
        from.setHours(0, 0, 0, 0);
        to.setDate(from.getDate() + 6);
        to.setHours(23, 59, 59, 999);
      } else {
        from.setDate(1);
        from.setHours(0, 0, 0, 0);
        to.setMonth(to.getMonth() + 1, 0);
        to.setHours(23, 59, 59, 999);
      }

      const params = new URLSearchParams({
        dateFrom: from.toISOString().split('T')[0],
        dateTo: to.toISOString().split('T')[0],
        limit: '200',
      });

      const res = await apiFetch<any>(`/deliveries?${params}`, { token });
      setDeliveries(res?.data || res || []);
    } catch {
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  }, [token, currentDate, view]);

  useEffect(() => { loadDeliveries(); }, [loadDeliveries]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await apiFetch(`/deliveries/${id}/status`, { method: 'PATCH', body: { status }, token });
      toast.success('Estado actualizado');
      loadDeliveries();
      setSelected(null);
    } catch {
      toast.error('Error al actualizar');
    }
  };

  const navigate = (dir: number) => {
    const d = new Date(currentDate);
    if (view === 'day') d.setDate(d.getDate() + dir);
    else if (view === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const today = new Date();
  const isToday = currentDate.toDateString() === today.toDateString();

  const title = (() => {
    if (view === 'day') return currentDate.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
    if (view === 'week') {
      const start = new Date(currentDate);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return `${start.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })} — ${end.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
  })();

  // Group deliveries by date for week/month view
  const byDate: Record<string, Delivery[]> = {};
  deliveries.forEach((d) => {
    if (!d.deliveryDate) return;
    const key = new Date(d.deliveryDate).toISOString().split('T')[0];
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(d);
  });

  // Get days for week view
  const weekDays = (() => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  })();

  // Get days for month view
  const monthDays = (() => {
    const first = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const last = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startPad = first.getDay();
    const days: (Date | null)[] = [];
    for (let i = 0; i < startPad; i++) days.push(null);
    for (let i = 1; i <= last.getDate(); i++) days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
    return days;
  })();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="rounded-full p-2 hover:bg-soft min-h-[36px] min-w-[36px] flex items-center justify-center"><ChevronLeft size={18} /></button>
          <h3 className="min-w-[200px] text-center font-display text-sm uppercase">{title}</h3>
          <button onClick={() => navigate(1)} className="rounded-full p-2 hover:bg-soft min-h-[36px] min-w-[36px] flex items-center justify-center"><ChevronRight size={18} /></button>
          {!isToday && (
            <button onClick={() => setCurrentDate(new Date())} className="rounded-full border border-line px-3 py-1 text-xs font-semibold hover:bg-soft">
              Hoy
            </button>
          )}
        </div>
        <div className="flex overflow-hidden rounded-full border border-line bg-paper">
          {(['day', 'week', 'month'] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 text-xs font-bold transition min-h-[32px] ${view === v ? 'bg-ink text-paper' : 'text-muted'}`}
            >
              {v === 'day' ? 'Día' : v === 'week' ? 'Semana' : 'Mes'}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[10px] font-semibold text-muted">
        {Object.entries(STATUS_DOT).filter(([k]) => !['CREATED', 'PAYMENT_CONFIRMED', 'PREPARING', 'READY'].includes(k)).map(([k, color]) => (
          <span key={k} className="flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${color}`} />{STATUS_LABEL[k]}</span>
        ))}
      </div>

      <GoogleCalendarStatus />

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
      ) : view === 'day' ? (
        /* Day view — hourly timeline */
        <DayView deliveries={deliveries} onSelect={setSelected} />
      ) : view === 'week' ? (
        /* Week view — 7 columns */
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((d) => {
            const key = d.toISOString().split('T')[0];
            const dayDeliveries = byDate[key] || [];
            const isTodayCol = d.toDateString() === today.toDateString();
            return (
              <div key={key} className={`rounded-xl border ${isTodayCol ? 'border-accent' : 'border-line'} bg-paper`}>
                <div className={`border-b border-line px-2 py-1.5 text-center text-xs font-bold ${isTodayCol ? 'text-accent' : 'text-muted'}`}>
                  {d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric' })}
                </div>
                <div className="min-h-[200px] space-y-1 p-1">
                  {dayDeliveries.length === 0 && <p className="py-4 text-center text-[10px] text-muted">—</p>}
                  {dayDeliveries.map((del) => (
                    <button
                      key={del.id}
                      onClick={() => setSelected(del)}
                      className="w-full rounded-lg border border-line px-1.5 py-1 text-left transition hover:border-accent"
                    >
                      <div className="flex items-center gap-1">
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[del.status] || 'bg-gray-300'}`} />
                        <span className="text-[10px] font-mono">{del.windowStart || '—'}</span>
                      </div>
                      <p className="truncate text-[10px] font-semibold">{del.order?.orderNumber}</p>
                      <p className="truncate text-[9px] text-muted">{del.station?.name || del.customer?.name}</p>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Month view — grid */
        <div className="grid grid-cols-7 gap-1">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d) => (
            <div key={d} className="px-2 py-1 text-center text-[10px] font-bold uppercase text-muted">{d}</div>
          ))}
          {monthDays.map((d, i) => {
            if (!d) return <div key={`pad-${i}`} />;
            const key = d.toISOString().split('T')[0];
            const dayDeliveries = byDate[key] || [];
            const isTodayCell = d.toDateString() === today.toDateString();
            return (
              <div
                key={key}
                className={`min-h-[80px] rounded-xl border ${isTodayCell ? 'border-accent bg-accent/5' : 'border-line'} p-1`}
              >
                <p className={`text-center text-xs font-bold ${isTodayCell ? 'text-accent' : 'text-muted'}`}>{d.getDate()}</p>
                {dayDeliveries.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {dayDeliveries.slice(0, 3).map((del) => (
                      <button
                        key={del.id}
                        onClick={() => setSelected(del)}
                        className="flex w-full items-center gap-1 rounded px-1 text-left hover:bg-soft"
                      >
                        <span className={`h-1 w-1 rounded-full ${STATUS_DOT[del.status] || 'bg-gray-300'}`} />
                        <span className="truncate text-[9px]">{del.windowStart} {del.order?.orderNumber}</span>
                      </button>
                    ))}
                    {dayDeliveries.length > 3 && <p className="text-center text-[9px] text-muted">+{dayDeliveries.length - 3}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div className="w-full max-w-sm rounded-3xl border border-line bg-paper p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h4 className="font-display text-sm uppercase">{selected.order?.orderNumber}</h4>
              <button onClick={() => setSelected(null)} className="rounded-full p-1 hover:bg-soft text-xs">✕</button>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center gap-2"><User size={14} className="text-muted" />{selected.customer?.name || selected.order?.customerName}</div>
              <div className="flex items-center gap-2"><Clock size={14} className="text-muted" />{selected.windowStart}–{selected.windowEnd}</div>
              {selected.station && (
                <div className="flex items-center gap-2"><MapPin size={14} className="text-muted" />{selected.station.name} ({selected.station.line})</div>
              )}
              {selected.meetingPoint && <p className="text-xs text-muted">Punto: {selected.meetingPoint}</p>}
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${STATUS_DOT[selected.status] || 'bg-gray-300'}`} />
                <span className="text-xs font-semibold">{STATUS_LABEL[selected.status] || selected.status}</span>
              </div>
              <p className="text-xs text-muted">Código: <span className="font-mono font-bold">{selected.deliveryCode}</span></p>
              <p className="text-right font-bold">{formatPrice(selected.order?.total || 0)}</p>
            </div>

            {/* Status actions */}
            {selected.status !== 'DELIVERED' && selected.status !== 'CANCELLED' && (
              <div className="mt-4 flex flex-wrap gap-2">
                {(selected.status === 'CREATED' || selected.status === 'CONFIRMATION_PENDING') && (
                  <button onClick={() => updateStatus(selected.id, 'CONFIRMED')} className="btn-accent text-xs min-h-[36px] px-3">Confirmar</button>
                )}
                {selected.status === 'CONFIRMED' && (
                  <button onClick={() => updateStatus(selected.id, 'IN_TRANSIT')} className="btn-accent text-xs min-h-[36px] px-3"><Truck size={12} className="mr-1" />En ruta</button>
                )}
                {selected.status === 'IN_TRANSIT' && (
                  <button onClick={() => updateStatus(selected.id, 'ARRIVED')} className="btn-accent text-xs min-h-[36px] px-3">Llegó</button>
                )}
                {selected.status === 'ARRIVED' && (
                  <button onClick={() => updateStatus(selected.id, 'DELIVERED')} className="btn-accent text-xs min-h-[36px] px-3">Entregar</button>
                )}
                <button onClick={() => updateStatus(selected.id, 'CANCELLED')} className="rounded-xl border border-red-300 text-red-600 text-xs min-h-[36px] px-3 hover:bg-red-50"><XCircle size={12} className="mr-1" />Cancelar</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DayView({ deliveries, onSelect }: { deliveries: Delivery[]; onSelect: (d: Delivery) => void }) {
  const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 8:00 - 21:00

  const byHour: Record<number, Delivery[]> = {};
  deliveries.forEach((d) => {
    if (!d.windowStart) return;
    const h = parseInt(d.windowStart.split(':')[0], 10);
    if (!byHour[h]) byHour[h] = [];
    byHour[h].push(d);
  });

  return (
    <div className="space-y-0">
      {hours.map((h) => {
        const hourDeliveries = byHour[h] || [];
        return (
          <div key={h} className="flex border-b border-line">
            <div className="w-14 shrink-0 py-2 text-right text-xs font-mono text-muted">{`${h.toString().padStart(2, '0')}:00`}</div>
            <div className="flex-1 min-h-[40px] py-1 pl-2">
              {hourDeliveries.map((d) => (
                <button
                  key={d.id}
                  onClick={() => onSelect(d)}
                  className="mb-1 flex w-full items-center gap-2 rounded-lg border border-line px-2 py-1 text-left transition hover:border-accent"
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[d.status] || 'bg-gray-300'}`} />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold">{d.windowStart}–{d.windowEnd}</span>
                    <span className="ml-2 text-xs">{d.order?.orderNumber}</span>
                    <span className="ml-2 text-[10px] text-muted truncate">{d.station?.name || d.customer?.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
