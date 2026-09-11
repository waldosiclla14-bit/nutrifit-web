'use client';

import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Pencil, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { useConfirm } from '@/lib/feedback';
import { STATUS_LABEL, STATUS_STYLE, PAYMENT_LABEL } from '@/lib/admin/constants';
import { waLink } from '@/lib/admin/format';
import type { AdminOrder } from '@/types/admin';
import { PaymentModal } from './PaymentModal';
import { EditOrderModal } from './EditOrderModal';

export function Ordenes({
  orders,
  token,
  busyId,
  act,
}: {
  orders: AdminOrder[];
  token: string;
  busyId: string | null;
  act: (fn: () => Promise<any>, id: string, successMsg?: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [paymentOrder, setPaymentOrder] = useState<AdminOrder | null>(null);
  const [editOrder, setEditOrder] = useState<AdminOrder | null>(null);
  const [visibleCount, setVisibleCount] = useState(50);
  const confirm = useConfirm();

  useEffect(() => {
    setVisibleCount(50);
  }, [query, statusFilter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter && o.status !== statusFilter) return false;
      if (!q) return true;
      const hay = `${o.orderNumber} ${o.customer?.name || ''} ${o.customer?.phone || ''} ${o.metroStation || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [orders, query, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const o of orders) counts[o.status] = (counts[o.status] || 0) + 1;
    return counts;
  }, [orders]);

  const statusOptions = Object.keys(STATUS_LABEL);

  const renderActions = (o: AdminOrder) => (
    <>
      {o.status === 'PENDING' && (
        <button
          disabled={busyId === o.id}
          onClick={() => act(() => apiFetch(`/orders/${o.id}/status`, { method: 'PATCH', token, body: { status: 'CONFIRMED' } }), o.id, 'Orden confirmada.')}
          className="btn-primary px-3 py-1.5 text-[11px] min-h-[44px]"
        >
          Confirmar
        </button>
      )}
      {o.status === 'CONFIRMED' && (
        <button
          disabled={busyId === o.id}
          onClick={() => setPaymentOrder(o)}
          className="btn-accent px-3 py-1.5 text-[11px] min-h-[44px]"
        >
          Marcar pagado
        </button>
      )}
      {o.status === 'PAID' && (
        <button
          disabled={busyId === o.id}
          onClick={() => act(() => apiFetch(`/orders/${o.id}/status`, { method: 'PATCH', token, body: { status: 'DELIVERED' } }), o.id, 'Orden marcada como entregada.')}
          className="rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50 min-h-[44px]"
        >
          Entregado
        </button>
      )}
      {!['CANCELLED', 'DELIVERED', 'RETURNED'].includes(o.status) && (
        <button
          disabled={busyId === o.id}
          onClick={async () => {
            const ok = await confirm({
              title: 'Cancelar orden',
              message: `¿Cancelar la orden ${o.orderNumber}?`,
              cancelLabel: 'No',
              confirmLabel: 'Sí, cancelar',
              danger: true,
            });
            if (!ok) return;
            act(() => apiFetch(`/orders/${o.id}/status`, { method: 'PATCH', token, body: { status: 'CANCELLED' } }), o.id, 'Orden cancelada.');
          }}
          className="rounded-full border border-red-300 px-3 py-1.5 text-[11px] font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50 min-h-[44px]"
        >
          Cancelar
        </button>
      )}
      {!['PAID', 'DELIVERED'].includes(o.status) && (
        <button
          disabled={busyId === o.id}
          onClick={async () => {
            const ok = await confirm({
              title: 'Eliminar orden',
              message: `¿Eliminar permanentemente la orden ${o.orderNumber}? Esta acción no se puede deshacer.`,
              cancelLabel: 'No',
              confirmLabel: 'Sí, eliminar',
              danger: true,
            });
            if (!ok) return;
            act(() => apiFetch(`/orders/${o.id}`, { method: 'DELETE', token }), o.id, 'Orden eliminada.');
          }}
          className="inline-flex items-center gap-1 rounded-full border border-red-300 px-3 py-1.5 text-[11px] font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50 min-h-[44px]"
        >
          <Trash2 size={12} /> Eliminar
        </button>
      )}
      {!['CANCELLED', 'RETURNED', 'DELIVERED'].includes(o.status) && (
        <button
          disabled={busyId === o.id}
          onClick={() => setEditOrder(o)}
          className="inline-flex items-center gap-1 btn-outline px-3 py-1.5 text-[11px] min-h-[44px]"
          title="Editar productos, entrega y pago de la orden"
        >
          <Pencil size={12} /> Editar
        </button>
      )}
      {o.customer?.phone && (
        <a
          href={waLink(o)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[11px] font-bold text-ink transition hover:bg-soft min-h-[44px]"
        >
          <MessageCircle size={12} /> WhatsApp
        </a>
      )}
    </>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nº de pedido, cliente, teléfono o estación…"
          className="input max-w-md"
        />
        <button
          onClick={() => setStatusFilter('')}
          className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${statusFilter === '' ? 'bg-ink text-paper' : 'border border-line bg-paper text-muted'}`}
        >
          Todos
        </button>
        {statusOptions.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
            className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${statusFilter === s ? 'bg-ink text-paper' : 'border border-line bg-paper text-muted'}`}
          >
            {STATUS_LABEL[s]} · {statusCounts[s] || 0}
          </button>
        ))}
      </div>
      <div className="mt-4 hidden overflow-x-auto rounded-3xl border border-line bg-paper lg:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-[11px] uppercase tracking-widest text-muted">
              <th className="px-4 py-3">Pedido</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Entrega</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Pago</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, visibleCount).map((o) => (
              <tr key={o.id} className="border-b border-line/60 last:border-0">
                <td className="px-4 py-3">
                  <p className="font-bold text-ink truncate">{o.orderNumber}</p>
                  <p className="text-[11px] text-muted">{new Date(o.createdAt).toLocaleString('es-CL')}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold truncate">{o.customer?.name || '—'}</p>
                  <p className="text-[11px] text-muted">{o.customer?.phone || ''}</p>
                </td>
                <td className="px-4 py-3 text-xs">
                  {o.deliveryType === 'METRO' ? (
                    <>
                      <p>Metro {o.metroLine}</p>
                      <p className="text-muted">{o.metroStation}</p>
                      {o.deliveryDay && <p className="text-muted">Día: {o.deliveryDay}</p>}
                      {o.deliveryTime && <p className="text-muted">Hora: {o.deliveryTime}</p>}
                    </>
                  ) : (
                    <span className="text-muted">Retiro tienda</span>
                  )}
                </td>
                <td className="px-4 py-3 font-bold">{formatPrice(o.total)}</td>
                <td className="px-4 py-3 text-xs">
                  <p>{PAYMENT_LABEL[o.paymentMethod || ''] || '—'}</p>
                  <p className="text-muted">{o.paymentStatus === 'CONFIRMED' ? 'Pagado' : 'Pendiente'}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${STATUS_STYLE[o.status] || 'border-line bg-soft text-muted'}`}>
                    {STATUS_LABEL[o.status] || o.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {renderActions(o)}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  Sin órdenes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Cards móvil */}
      <div className="mt-4 space-y-3 lg:hidden">
        {filtered.slice(0, visibleCount).map((o) => (
          <div key={o.id} className="rounded-3xl border border-line bg-paper p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-bold text-ink">{o.orderNumber}</p>
                <p className="text-[11px] text-muted">{new Date(o.createdAt).toLocaleString('es-CL')}</p>
              </div>
              <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${STATUS_STYLE[o.status] || 'border-line bg-soft text-muted'}`}>
                {STATUS_LABEL[o.status] || o.status}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-sm">
              <p className="truncate font-semibold">{o.customer?.name || '—'}</p>
              <p className="shrink-0 font-bold">{formatPrice(o.total)}</p>
            </div>
            <p className="mt-1 text-xs text-muted">
              {o.customer?.phone || ''}
              {o.deliveryType === 'METRO' ? ` · Metro ${o.metroLine || ''} ${o.metroStation || ''}` : ' · Retiro tienda'}
              {o.deliveryDay ? ` · ${o.deliveryDay}` : ''}{o.deliveryTime ? ` ${o.deliveryTime}` : ''}
            </p>
            <p className="mt-1 text-xs text-muted">
              {PAYMENT_LABEL[o.paymentMethod || ''] || 'Pago'} · {o.paymentStatus === 'CONFIRMED' ? 'Pagado' : 'Pendiente'}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 [&>*]:justify-center">
              {renderActions(o)}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="rounded-3xl border border-line bg-paper px-4 py-10 text-center text-muted">
            Sin órdenes.
          </p>
        )}
      </div>

      {visibleCount < filtered.length && (
        <div className="mt-3">
          <button
            onClick={() => setVisibleCount((c) => c + 50)}
            className="w-full rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-bold text-ink transition hover:bg-soft"
          >
            Cargar más ({filtered.length - visibleCount} restantes)
          </button>
        </div>
      )}

      {paymentOrder && (
        <PaymentModal
          order={paymentOrder}
          token={token}
          busy={busyId === paymentOrder.id}
          onClose={() => setPaymentOrder(null)}
          onSave={async (method) => {
            const confirmed = paymentOrder.paymentStatus !== 'CONFIRMED';
            await act(
              () =>
                apiFetch(`/orders/${paymentOrder.id}/${confirmed ? 'payment' : 'payment-method'}`, {
                  method: 'PATCH',
                  token,
                  body: { paymentMethod: method },
                }),
              paymentOrder.id,
              confirmed ? 'Pago confirmado.' : 'Método de pago actualizado.',
            );
            setPaymentOrder(null);
          }}
        />
      )}
      {editOrder && (
        <EditOrderModal
          order={editOrder}
          token={token}
          busy={busyId === editOrder.id}
          onClose={() => setEditOrder(null)}
          onSaved={() => setEditOrder(null)}
        />
      )}
    </div>
  );
}