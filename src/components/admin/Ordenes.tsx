'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, Pencil, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatPrice, formatTime12 } from '@/lib/utils';
import { toast, useConfirm } from '@/lib/feedback';
import { handleAuthError } from '@/lib/admin/helpers';
import { STATUS_LABEL, PAYMENT_LABEL } from '@/lib/admin/constants';
import { waLink } from '@/lib/admin/format';
import type { AdminOrder } from '@/types/admin';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { OrderStatusBadge } from './OrderStatusBadge';
import { PaymentModal } from './PaymentModal';
import { EditOrderModal } from './EditOrderModal';

const PAGE_LIMIT = 50;

export function Ordenes({ token }: { token: string }) {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [paymentOrder, setPaymentOrder] = useState<AdminOrder | null>(null);
  const [editOrder, setEditOrder] = useState<AdminOrder | null>(null);
  const confirm = useConfirm();
  const pageRef = useRef(1);

  const logout = useCallback(() => {
    window.location.href = '/login?next=/admin';
  }, []);

  const loadPage = useCallback(
    async (p: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const res = await apiFetch<any>(`/orders?page=${p}&limit=${PAGE_LIMIT}`, { token });
        const data: AdminOrder[] = res?.data || res || [];
        setOrders((prev) => (append ? [...prev, ...data] : data));
        setTotal(typeof res?.total === 'number' ? res.total : data.length);
        pageRef.current = p;
        setPage(p);
      } catch (err: any) {
        if (handleAuthError(err, logout)) return;
        toast.error(err?.message || 'Error al cargar órdenes.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [token, logout],
  );

  const reloadAll = useCallback(async () => {
    try {
      const pages = pageRef.current;
      const all: AdminOrder[] = [];
      let t = 0;
      for (let p = 1; p <= pages; p++) {
        const res = await apiFetch<any>(`/orders?page=${p}&limit=${PAGE_LIMIT}`, { token });
        all.push(...(res?.data || res || []));
        if (typeof res?.total === 'number') t = res.total;
      }
      setOrders(all);
      setTotal(t);
    } catch (err: any) {
      if (handleAuthError(err, logout)) return;
      toast.error(err?.message || 'Error al cargar órdenes.');
    }
  }, [token, logout]);

  useEffect(() => {
    loadPage(1, false);
  }, [loadPage]);

  const act = useCallback(
    async (fn: () => Promise<any>, id: string, successMsg?: string) => {
      setBusyId(id);
      try {
        await fn();
        if (successMsg) toast.success(successMsg);
        await reloadAll();
      } catch (err: any) {
        toast.error(err?.message || 'Error en la operación.');
      } finally {
        setBusyId(null);
      }
    },
    [reloadAll],
  );

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

  if (loading && orders.length === 0) {
    return (
      <div className="space-y-3">
        <div className="skeleton h-10 w-full rounded-xl" />
        <div className="skeleton h-64 w-full rounded-xl" />
      </div>
    );
  }

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
        <button
          onClick={() => {
            const header = 'Pedido,Cliente,Fecha,Método,Estado,Subtotal,Descuento,Envío,Total';
            const rows = filtered.map(o => [
              o.orderNumber,
              o.customerName || o.customer?.name || '',
              new Date(o.createdAt).toLocaleString('es-CL'),
              o.paymentMethod || '',
              STATUS_LABEL[o.status] || o.status,
              o.subtotal,
              o.discount,
              o.shippingCost,
              o.total,
            ].map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
            const blob = new Blob([String.fromCharCode(0xFEFF) + `${header}\n${rows}`], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ordenes-${statusFilter || 'todas'}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="rounded-full border border-line bg-paper px-3 py-1.5 text-[11px] font-bold text-muted transition hover:text-ink"
        >
          CSV
        </button>
      </div>
      <div className="mt-4 hidden overflow-x-auto rounded-xl border border-line bg-card lg:block">
        <Table>
          <TableHeader>
            <TableRow className="text-[11px] uppercase tracking-widest text-muted-foreground">
              <TableHead>Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Entrega</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((o) => (
              <TableRow key={o.id}>
                <TableCell>
                  <p className="font-bold text-foreground truncate">{o.orderNumber}</p>
                  <p className="text-[11px] text-muted-foreground">{new Date(o.createdAt).toLocaleString('es-CL')}</p>
                </TableCell>
                <TableCell>
                  <p className="font-semibold truncate">{o.customer?.name || '—'}</p>
                  <p className="text-[11px] text-muted-foreground">{o.customer?.phone || ''}</p>
                </TableCell>
                <TableCell className="text-xs">
                  {o.deliveryType === 'METRO' ? (
                    <>
                      <p>Metro {o.metroLine}</p>
                      <p className="text-muted-foreground">{o.metroStation}</p>
                      {o.deliveryDay && <p className="text-muted-foreground">Día: {o.deliveryDay}</p>}
                      {o.deliveryTime && <p className="text-muted-foreground">Hora: {formatTime12(o.deliveryTime)}</p>}
                    </>
                  ) : (
                    <span className="text-muted-foreground">Retiro tienda</span>
                  )}
                </TableCell>
                <TableCell className="font-bold tabular-nums">{formatPrice(o.total)}</TableCell>
                <TableCell className="text-xs">
                  <p>{PAYMENT_LABEL[o.paymentMethod || ''] || '—'}</p>
                  <p className="text-muted-foreground">{o.paymentStatus === 'CONFIRMED' ? 'Pagado' : 'Pendiente'}</p>
                </TableCell>
                <TableCell>
                  <OrderStatusBadge status={o.status} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    {renderActions(o)}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                  Sin órdenes.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Cards móvil */}
      <div className="mt-4 space-y-3 lg:hidden">
        {filtered.map((o) => (
          <div key={o.id} className="rounded-xl border border-line bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-bold text-foreground">{o.orderNumber}</p>
                <p className="text-[11px] text-muted-foreground">{new Date(o.createdAt).toLocaleString('es-CL')}</p>
              </div>
              <OrderStatusBadge status={o.status} />
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-sm">
              <p className="truncate font-semibold">{o.customer?.name || '—'}</p>
              <p className="shrink-0 font-bold tabular-nums">{formatPrice(o.total)}</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {o.customer?.phone || ''}
              {o.deliveryType === 'METRO' ? ` · Metro ${o.metroLine || ''} ${o.metroStation || ''}` : ' · Retiro tienda'}
              {o.deliveryDay ? ` · ${o.deliveryDay}` : ''}{o.deliveryTime ? ` ${formatTime12(o.deliveryTime)}` : ''}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {PAYMENT_LABEL[o.paymentMethod || ''] || 'Pago'} · {o.paymentStatus === 'CONFIRMED' ? 'Pagado' : 'Pendiente'}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 [&>*]:justify-center">
              {renderActions(o)}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="rounded-xl border border-line bg-card px-4 py-10 text-center text-muted-foreground">
            Sin órdenes.
          </p>
        )}
      </div>

      {orders.length < total && (
        <div className="mt-3">
          <Button
            variant="outline"
            className="w-full"
            disabled={loadingMore}
            onClick={() => loadPage(pageRef.current + 1, true)}
          >
            {loadingMore ? 'Cargando…' : `Cargar más (${total - orders.length} restantes)`}
          </Button>
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
          onSaved={async () => {
            setEditOrder(null);
            await reloadAll();
          }}
        />
      )}
    </div>
  );
}
