'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeDollarSign,
  CheckCircle2,
  Coins,
  FileDown,
  Landmark,
  Printer,
  RefreshCw,
  Settings2,
  Truck,
  Wallet,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { toast, useConfirm } from '@/lib/feedback';

type LogisticsConfig = {
  id: string | null;
  courierCost: number;
  customerFee: number;
  nutrifitSubsidy: number;
  effectiveFrom?: string;
  isActive?: boolean;
};

type Summary = {
  from: string;
  to: string;
  config: LogisticsConfig;
  entregas: { hoy: number; semana: number; mes: number; periodo: number };
  totalPagadoRepartidor: number;
  totalCobradoEntregas: number;
  subsidioLogistico: number;
  costoLogisticoGenerado: number;
  pendientePago: number;
  pendientePagoEntregas: number;
  gananciaComercial: number;
  gananciaDespuesLogistica: number;
  resultadoOperativo: number;
  otrosGastos: number;
  productRevenue: number;
  productCost: number;
  liquidacionesPendientes: { count: number; total: number };
  liquidacionesPagadas: { count: number; total: number };
};

type Entry = {
  id: string;
  deliveryId: string;
  orderId: string;
  courierId: string | null;
  orderNumber: string;
  customerName: string;
  deliveryDay: string | null;
  deliveredAt: string | null;
  productRevenue: number;
  productCost: number;
  grossProfit: number;
  customerDeliveryFee: number;
  courierCost: number;
  nutrifitSubsidy: number;
  logisticsResult: number;
  netProfit: number;
  operatingResult: number;
  chargeType: 'ENTREGA_REALIZADA' | 'EXCEPCIONAL';
  chargeReason: string | null;
  settlementStatus: 'PENDIENTE' | 'LIQUIDADO' | 'ANULADO';
  settlementId: string | null;
  courier: { id: string; name: string } | null;
  delivery: { id: string; status: string; deliveryDay: string | null; assignedTo: string | null } | null;
  settlement: { id: string; settlementNumber: string; status: string } | null;
};

type Settlement = {
  id: string;
  settlementNumber: string;
  courierId: string | null;
  courierName: string;
  status: 'PENDIENTE' | 'LIQUIDADO' | 'ANULADO';
  periodFrom: string | null;
  periodTo: string | null;
  deliveriesCount: number;
  totalAmount: number;
  paymentMethod: string | null;
  paymentDate: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  courier: { id: string; name: string } | null;
  _count?: { items: number };
};

type Courier = { id: string; name: string; email: string };
type FailedDelivery = {
  id: string;
  deliveryDay: string | null;
  status: string;
  failureReason: string | null;
  assignedUser: { id: string; name: string } | null;
  order: { orderNumber: string; customerName: string; shippingCost: number } | null;
};

type Tab = 'rentabilidad' | 'activas' | 'liquidaciones';
type RangeKey = 'hoy' | '7d' | '30d' | 'mes' | 'personalizado';

const STATUS_LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  LIQUIDADO: 'Liquidado',
  ANULADO: 'Anulado',
};

const SETTLEMENT_LABEL: Record<string, string> = {
  PENDIENTE: 'Por pagar',
  LIQUIDADO: 'Pagada',
  ANULADO: 'Anulada',
};

const PAYMENT_METHODS = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'TARJETA', label: 'Tarjeta' },
  { value: 'OTRO', label: 'Otro' },
];

function isoToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const base = new Date(Date.UTC(y, m - 1, d, 12));
  base.setUTCDate(base.getUTCDate() + days);
  return `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, '0')}-${String(base.getUTCDate()).padStart(2, '0')}`;
}

function rangeForKey(key: RangeKey): { from: string; to: string } {
  const to = isoToday();
  if (key === 'hoy') return { from: to, to };
  if (key === '7d') return { from: addDays(to, -6), to };
  if (key === '30d') return { from: addDays(to, -29), to };
  return { from: `${to.slice(0, 7)}-01`, to };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );
}

export function RentabilidadLogistica({ token }: { token: string }) {
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>('rentabilidad');
  const [range, setRange] = useState<RangeKey>('mes');
  const [from, setFrom] = useState(() => rangeForKey('mes').from);
  const [to, setTo] = useState(() => rangeForKey('mes').to);
  const [courierId, setCourierId] = useState('');
  const [status, setStatus] = useState('');
  const [order, setOrder] = useState('');
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [activeDeliveries, setActiveDeliveries] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [configForm, setConfigForm] = useState({ courierCost: '2500', customerFee: '1000', nutrifitSubsidy: '1500' });
  const [showConfig, setShowConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  const [paySettlement, setPaySettlement] = useState<Settlement | null>(null);
  const [paymentForm, setPaymentForm] = useState({ paymentMethod: 'TRANSFERENCIA', paymentDate: isoToday() });

  const [showExceptional, setShowExceptional] = useState(false);
  const [showCreateCourier, setShowCreateCourier] = useState(false);
  const [courierForm, setCourierForm] = useState({ name: 'Jorge Cisneros', email: '', pin: '' });
  const [failed, setFailed] = useState<FailedDelivery[]>([]);
  const [exceptionalForm, setExceptionalForm] = useState({ deliveryId: '', amount: '', reason: '' });

  const applyRange = (key: RangeKey) => {
    setRange(key);
    if (key !== 'personalizado') {
      const r = rangeForKey(key);
      setFrom(r.from);
      setTo(r.to);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to });
      if (courierId) params.set('courierId', courierId);
      const entryParams = new URLSearchParams(params);
      if (status) entryParams.set('status', status);
      if (order.trim()) entryParams.set('order', order.trim());
      entryParams.set('limit', '200');

      const [s, e, st, co, active] = await Promise.all([
        apiFetch<Summary>(`/logistics/summary?${params.toString()}`, { token }),
        apiFetch<Entry[] | { data: Entry[] }>(`/logistics/entries?${entryParams.toString()}`, { token }),
        apiFetch<Settlement[]>(`/logistics/settlements?${params.toString()}&limit=100`, { token }).catch(() => []),
        apiFetch<Courier[]>('/logistics/couriers', { token }).catch(() => []),
        apiFetch<any[]>(`/logistics/active-deliveries?${params.toString()}`, { token }).catch(() => []),
      ]);
      setSummary(s);
      const list = Array.isArray(e) ? e : e?.data || [];
      setEntries(list);
      setSettlements(st || []);
      setCouriers(co || []);
      setActiveDeliveries(active || []);
      setSelected((prev) => {
        const valid = new Set(list.filter((x) => x.settlementStatus === 'PENDIENTE' && !x.settlementId).map((x) => x.id));
        return new Set([...prev].filter((id) => valid.has(id)));
      });
      if (s?.config) {
        setConfigForm({
          courierCost: String(s.config.courierCost ?? 2500),
          customerFee: String(s.config.customerFee ?? 1000),
          nutrifitSubsidy: String(s.config.nutrifitSubsidy ?? 1500),
        });
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error al cargar rentabilidad logística.');
    } finally {
      setLoading(false);
    }
  }, [token, from, to, courierId, status, order]);

  useEffect(() => {
    load();
  }, [load]);

  const selectable = useMemo(
    () => entries.filter((e) => e.settlementStatus === 'PENDIENTE' && !e.settlementId && e.courierCost > 0),
    [entries],
  );

  const selectedEntries = useMemo(
    () => entries.filter((e) => selected.has(e.id)),
    [entries, selected],
  );

  const selectedTotal = selectedEntries.reduce((acc, e) => acc + (e.courierCost || 0), 0);
  const selectedCourier = selectedEntries[0]?.courierId || '';
  const mixedCouriers = new Set(selectedEntries.map((e) => e.courierId || '')).size > 1;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      if (prev.size === selectable.length) return new Set();
      return new Set(selectable.map((e) => e.id));
    });
  };

  const saveConfig = async () => {
    const courierCost = Math.round(Number(configForm.courierCost));
    const customerFee = Math.round(Number(configForm.customerFee));
    const nutrifitSubsidy = Math.round(Number(configForm.nutrifitSubsidy));
    if (!Number.isFinite(courierCost) || courierCost < 0) {
      toast.error('Costo por entrega inválido.');
      return;
    }
    if (!Number.isFinite(customerFee) || customerFee < 0) {
      toast.error('Cobro al cliente inválido.');
      return;
    }
    if (!Number.isFinite(nutrifitSubsidy) || nutrifitSubsidy < 0) {
      toast.error('Subsidio inválido.');
      return;
    }
    setSavingConfig(true);
    try {
      await apiFetch('/logistics/config', {
        method: 'PUT',
        token,
        body: { courierCost, customerFee, nutrifitSubsidy },
      });
      toast.success('Tarifas actualizadas. Las entregas históricas no cambian.');
      setShowConfig(false);
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudieron guardar las tarifas.');
    } finally {
      setSavingConfig(false);
    }
  };

  const generateSettlement = async () => {
    if (!selectedEntries.length) {
      toast.error('Selecciona al menos una entrega pendiente.');
      return;
    }
    if (mixedCouriers) {
      toast.error('Selecciona entregas de un solo repartidor.');
      return;
    }
    if (!selectedCourier) {
      toast.error('Las entregas deben tener un repartidor asignado.');
      return;
    }
    const ok = await confirm({
      title: 'Generar liquidación',
      message: `${selectedEntries.length} entrega(s) por ${formatPrice(selectedTotal)}. La liquidación queda pendiente hasta confirmar el pago.`,
      confirmLabel: 'Generar',
      cancelLabel: 'Cancelar',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await apiFetch('/logistics/settlements', {
        method: 'POST',
        token,
        body: { entryIds: selectedEntries.map((e) => e.id), notes: notes.trim() || undefined },
      });
      toast.success('Liquidación generada.');
      setNotes('');
      setSelected(new Set());
      setTab('liquidaciones');
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo generar la liquidación.');
    } finally {
      setBusy(false);
    }
  };

  const openPayment = (s: Settlement) => {
    setPaymentForm({ paymentMethod: 'TRANSFERENCIA', paymentDate: isoToday() });
    setPaySettlement(s);
  };

  const confirmPayment = async () => {
    if (!paySettlement) return;
    setBusy(true);
    try {
      await apiFetch(`/logistics/settlements/${paySettlement.id}/confirm`, {
        method: 'PATCH',
        token,
        body: paymentForm,
      });
      toast.success('Pago confirmado. Las entregas quedaron liquidadas.');
      setPaySettlement(null);
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo confirmar el pago.');
    } finally {
      setBusy(false);
    }
  };

  const cancelSettlement = async (s: Settlement) => {
    const ok = await confirm({
      title: 'Anular liquidación',
      message: `¿Anular ${s.settlementNumber}? Las entregas volverán a quedar pendientes.`,
      confirmLabel: 'Sí, anular',
      cancelLabel: 'No',
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await apiFetch(`/logistics/settlements/${s.id}/cancel`, {
        method: 'PATCH',
        token,
        body: { reason: 'Anulación manual desde el panel' },
      });
      toast.success('Liquidación anulada.');
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo anular.');
    } finally {
      setBusy(false);
    }
  };

  const downloadReceipt = async (s: Settlement) => {
    const win = window.open('', '_blank', 'width=820,height=900');
    try {
      const detail = await apiFetch<any>(`/logistics/settlements/${s.id}`, { token });
      const rows = (detail.items || [])
        .map(
          (i: any, idx: number) => `
            <tr>
              <td>${idx + 1}</td>
              <td>${escapeHtml(i.profitability?.orderNumber || '')}</td>
              <td>${escapeHtml(i.deliveryDay || '')}</td>
              <td>${escapeHtml(i.profitability?.customerName || '')}</td>
              <td class="right">${formatPrice(i.amount || 0)}</td>
            </tr>`,
        )
        .join('');
      const html = `<!doctype html><html lang="es"><head><meta charset="utf-8" />
        <title>${escapeHtml(detail.settlementNumber)}</title>
        <style>
          *{box-sizing:border-box} body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111;margin:32px;}
          h1{font-size:22px;margin:0 0 4px} .muted{color:#666;font-size:12px}
          .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #5DD62C;padding-bottom:14px;margin-bottom:18px}
          .brand{font-weight:900;letter-spacing:.08em;font-size:13px}
          .box{background:#f6f8f5;border:1px solid #e3e8e0;border-radius:10px;padding:12px 14px;margin-bottom:16px;font-size:12px;display:grid;grid-template-columns:1fr 1fr;gap:6px}
          table{width:100%;border-collapse:collapse;font-size:11px} th{text-align:left;background:#f1f4ee;padding:8px;border-bottom:1px solid #dde3d8}
          td{padding:8px;border-bottom:1px solid #edf0ea}.right{text-align:right}
          .total{margin-top:16px;display:flex;justify-content:flex-end;gap:20px;font-size:14px;font-weight:700}
          .foot{margin-top:28px;font-size:10px;color:#777;border-top:1px solid #ddd;padding-top:10px}
        </style></head><body>
        <div class="head">
          <div><div class="brand">NUTRIFIT CHILE</div><h1>Comprobante de liquidación</h1>
          <div class="muted">${escapeHtml(detail.settlementNumber)} · Emitido ${new Date().toLocaleString('es-CL')}</div></div>
          <div style="text-align:right"><div class="muted">Estado</div><strong>${escapeHtml(SETTLEMENT_LABEL[detail.status] || detail.status)}</strong></div>
        </div>
        <div class="box">
          <div><strong>Repartidor:</strong> ${escapeHtml(detail.courierName || detail.courier?.name || '—')}</div>
          <div><strong>Entregas:</strong> ${detail.deliveriesCount}</div>
          <div><strong>Período:</strong> ${escapeHtml(detail.periodFrom || '—')} → ${escapeHtml(detail.periodTo || '—')}</div>
          <div><strong>Método de pago:</strong> ${escapeHtml(detail.paymentMethod || 'Pendiente')}</div>
        </div>
        <table><thead><tr><th>#</th><th>Pedido</th><th>Día</th><th>Cliente</th><th class="right">Pago repartidor</th></tr></thead>
        <tbody>${rows}</tbody></table>
        <div class="total"><span>Total a pagar</span><span>${formatPrice(detail.totalAmount || 0)}</span></div>
        <div class="foot">Documento generado automáticamente por NutriFit Business OS. Los montos corresponden al costo logístico registrado por entrega. ${
          detail.notes ? `Observaciones: ${escapeHtml(detail.notes)}` : ''
        }</div>
        <script>window.onload=function(){setTimeout(function(){window.print();},300);};</script>
        </body></html>`;
      if (win) {
        win.document.open();
        win.document.write(html);
        win.document.close();
      } else {
        toast.error('El navegador bloqueó la ventana de impresión.');
      }
    } catch (err: any) {
      win?.close();
      toast.error(err?.message || 'No se pudo generar el comprobante.');
    }
  };

  const openExceptional = async () => {
    setShowExceptional(true);
    setExceptionalForm({ deliveryId: '', amount: '', reason: '' });
    try {
      const list = await apiFetch<FailedDelivery[]>(
        `/logistics/failed-deliveries?from=${addDays(isoToday(), -30)}&to=${isoToday()}`,
        { token },
      );
      setFailed(list || []);
    } catch {
      setFailed([]);
    }
  };

  const saveExceptional = async () => {
    const amount = Math.round(Number(exceptionalForm.amount));
    if (!exceptionalForm.deliveryId) return toast.error('Selecciona una entrega fallida.');
    if (!Number.isFinite(amount) || amount <= 0) return toast.error('Monto inválido.');
    if (exceptionalForm.reason.trim().length < 3) return toast.error('Indica el motivo del cargo.');
    setBusy(true);
    try {
      await apiFetch('/logistics/entries/exceptional', {
        method: 'POST',
        token,
        body: {
          deliveryId: exceptionalForm.deliveryId,
          amount,
          reason: exceptionalForm.reason.trim(),
        },
      });
      toast.success('Cargo excepcional registrado.');
      setShowExceptional(false);
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo registrar el cargo.');
    } finally {
      setBusy(false);
    }
  };

  const kpis = summary
    ? [
        { label: 'Entregas hoy', value: String(summary.entregas.hoy), sub: `${summary.entregas.semana} esta semana` },
        { label: 'Entregas del mes', value: String(summary.entregas.mes), sub: `${summary.entregas.periodo} en el período` },
        { label: 'Cobrado por entregas', value: formatPrice(summary.totalCobradoEntregas), sub: 'Ingreso logístico' },
        { label: 'Subsidio NutriFit', value: formatPrice(summary.subsidioLogistico), sub: 'Costo asumido' },
        { label: 'Ganancia comercial', value: formatPrice(summary.gananciaComercial), sub: 'Antes de logística', tone: 'positive' },
        {
          label: 'Ganancia después de logística',
          value: formatPrice(summary.gananciaDespuesLogistica),
          sub: 'Resultado real por entrega',
          tone: summary.gananciaDespuesLogistica >= 0 ? 'positive' : 'negative',
        },
        { label: 'Pagado al repartidor', value: formatPrice(summary.totalPagadoRepartidor), sub: 'Liquidaciones pagadas' },
        { label: 'Pendiente de pago', value: formatPrice(summary.pendientePago), sub: `${summary.pendientePagoEntregas} entregas` },
        {
          label: 'Costo logístico generado',
          value: formatPrice(summary.costoLogisticoGenerado),
          sub: `${formatPrice(summary.liquidacionesPendientes.total)} en liquidaciones por pagar`,
        },
        {
          label: 'Liquidaciones pagadas',
          value: formatPrice(summary.liquidacionesPagadas.total),
          sub: `${summary.liquidacionesPagadas.count} liquidaciones`,
        },
      ]
    : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sport-green/15 text-sport-green">
              <Truck size={16} />
            </span>
            <h2 className="font-display text-xl uppercase tracking-wide">Rentabilidad logística</h2>
          </div>
          <p className="text-xs text-muted">
            Costo por entrega, subsidio NutriFit y liquidación del repartidor sobre las entregas existentes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openExceptional}
            className="ds-btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-[12px]"
          >
            <AlertTriangle size={14} /> Cargo excepcional
          </button>
          <button
            type="button"
            onClick={() => { setShowCreateCourier(true); setCourierForm({ name: 'Jorge Cisneros', email: '', pin: '' }); }} className="ds-btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-[12px]"><Settings2 size={14} /> Crear repartidor</button>\n          <button type="button" onClick={() => setShowConfig((v) => !v)}
            className="ds-btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-[12px]"
          >
            <Settings2 size={14} /> Tarifas
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="ds-btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-[12px]"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
        </div>
      </div>

      {showConfig && (
        <div className="rounded-3xl border border-line bg-paper p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm uppercase tracking-wide text-ink">Tarifas logísticas vigentes</h3>
            <span className="ds-badge ds-badge-accent">Versionadas</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="text-xs">
              <span className="mb-1 block font-bold text-muted">Costo por entrega (pago repartidor)</span>
              <input
                type="number"
                min={0}
                value={configForm.courierCost}
                onChange={(e) => setConfigForm((f) => ({ ...f, courierCost: e.target.value }))}
                className="w-full rounded-xl border border-line bg-surface p-2.5 font-bold text-ink"
              />
            </label>
            <label className="text-xs">
              <span className="mb-1 block font-bold text-muted">Cobro al cliente</span>
              <input
                type="number"
                min={0}
                value={configForm.customerFee}
                onChange={(e) => setConfigForm((f) => ({ ...f, customerFee: e.target.value }))}
                className="w-full rounded-xl border border-line bg-surface p-2.5 font-bold text-ink"
              />
            </label>
            <div className="text-xs">
              <span className="mb-1 flex items-center justify-between font-bold text-muted">
                Subsidio NutriFit
                <button
                  type="button"
                  onClick={() =>
                    setConfigForm((f) => ({
                      ...f,
                      nutrifitSubsidy: String(
                        Math.max(0, Math.round(Number(f.courierCost) || 0) - Math.round(Number(f.customerFee) || 0)),
                      ),
                    }))
                  }
                  className="rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-bold text-sport-green"
                >
                  Recalcular
                </button>
              </span>
              <input
                type="number"
                min={0}
                value={configForm.nutrifitSubsidy}
                onChange={(e) => setConfigForm((f) => ({ ...f, nutrifitSubsidy: e.target.value }))}
                className="w-full rounded-xl border border-line bg-surface p-2.5 font-bold text-ink"
              />
              <span className="mt-1 block text-[10px] text-muted">
                Referencia: {formatPrice(Math.max(0, Math.round(Number(configForm.courierCost) || 0) - Math.round(Number(configForm.customerFee) || 0)))}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-muted">
            Los cambios aplican solo a entregas nuevas. Cada pedido conserva una copia de las tarifas aplicadas.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveConfig}
              disabled={savingConfig}
              className="ds-btn-primary px-4 py-2 text-[12px]"
            >
              {savingConfig ? 'Guardando…' : 'Guardar tarifas'}
            </button>
            <button type="button" onClick={() => setShowConfig(false)} className="ds-btn-secondary px-4 py-2 text-[12px]">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2 rounded-3xl border border-line bg-paper p-3 shadow-sm">
        <div className="flex flex-wrap gap-1">
          {(['hoy', '7d', '30d', 'mes'] as RangeKey[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => applyRange(k)}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${
                range === k ? 'bg-ink text-paper' : 'bg-surface text-muted hover:text-ink'
              }`}
            >
              {k === 'hoy' ? 'Hoy' : k === '7d' ? '7 días' : k === '30d' ? '30 días' : 'Este mes'}
            </button>
          ))}
        </div>
        <label className="text-[11px] font-bold text-muted">
          Desde
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setRange('personalizado');
            }}
            className="ml-1 rounded-lg border border-line bg-surface px-2 py-1.5 text-[11px] text-ink"
          />
        </label>
        <label className="text-[11px] font-bold text-muted">
          Hasta
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setRange('personalizado');
            }}
            className="ml-1 rounded-lg border border-line bg-surface px-2 py-1.5 text-[11px] text-ink"
          />
        </label>
        <select
          value={courierId}
          onChange={(e) => setCourierId(e.target.value)}
          className="rounded-lg border border-line bg-surface px-2 py-1.5 text-[11px] font-bold text-ink"
        >
          <option value="">Todos los repartidores</option>
          {couriers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-line bg-surface px-2 py-1.5 text-[11px] font-bold text-ink"
        >
          <option value="">Todos los estados</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="LIQUIDADO">Liquidado</option>
          <option value="ANULADO">Anulado</option>
        </select>
        <input
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          placeholder="Pedido o cliente…"
          className="min-w-[150px] flex-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11px] text-ink"
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-line bg-paper p-3 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wide text-muted">{k.label}</p>
            <p
              className={`mt-1 text-lg font-black leading-tight ${
                k.tone === 'negative' ? 'text-red-500' : k.tone === 'positive' ? 'text-sport-green' : 'text-ink'
              }`}
            >
              {k.value}
            </p>
            <p className="text-[10px] text-muted">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 rounded-2xl border border-line bg-paper p-1 shadow-sm w-fit">
        <button
          type="button"
          onClick={() => setTab('rentabilidad')}
          className={`rounded-xl px-3 py-2 text-[12px] font-bold ${tab === 'rentabilidad' ? 'bg-ink text-paper' : 'text-muted'}`}
        >
          Rentabilidad por entrega
        </button>
        <button
          type="button"
          onClick={() => setTab('activas')}
          className={`rounded-xl px-3 py-2 text-[12px] font-bold ${tab === 'activas' ? 'bg-ink text-paper' : 'text-muted'}`}
        >
          En curso ({activeDeliveries.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('liquidaciones')}
          className={`rounded-xl px-3 py-2 text-[12px] font-bold ${tab === 'liquidaciones' ? 'bg-ink text-paper' : 'text-muted'}`}
        >
          Liquidaciones ({settlements.length})
        </button>
      </div>

      {tab === 'rentabilidad' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-paper p-3 shadow-sm">
            <div className="text-[11px] text-muted">
              <strong className="text-ink">{selected.size}</strong> seleccionadas ·{' '}
              <strong className="text-ink">{formatPrice(selectedTotal)}</strong> a pagar
              {mixedCouriers && <span className="ml-2 text-red-500">Selecciona un solo repartidor</span>}
            </div>
            <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Nota de liquidación (opcional)"
                className="min-w-[160px] flex-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11px] text-ink sm:max-w-xs"
              />
              <button
                type="button"
                onClick={generateSettlement}
                disabled={busy || !selected.size || mixedCouriers}
                className="ds-btn-primary inline-flex items-center gap-1.5 px-3 py-2 text-[12px]"
              >
                <Coins size={14} /> Generar liquidación
              </button>
            </div>
          </div>

          {loading ? (
            <div className="skeleton h-56 rounded-2xl" />
          ) : entries.length === 0 ? (
            <div className="ds-card p-10 text-center">
              <Truck size={26} className="mx-auto text-muted" />
              <p className="mt-2 font-bold text-ink">Sin entregas en el período</p>
              <p className="text-xs text-muted">Las entregas completadas aparecen aquí automáticamente.</p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-2xl border border-line bg-paper shadow-sm lg:block">
                <table className="w-full text-[11px]">
                  <thead className="bg-surface text-[10px] uppercase tracking-wide text-muted">
                    <tr>
                      <th className="w-9 p-2">
                        <input
                          type="checkbox"
                          aria-label="Seleccionar todas"
                          checked={selectable.length > 0 && selected.size === selectable.length}
                          onChange={toggleAll}
                        />
                      </th>
                      <th className="p-2 text-left">Pedido</th>
                      <th className="p-2 text-left">Entrega</th>
                      <th className="p-2 text-left">Repartidor</th>
                      <th className="p-2 text-right">Venta prod.</th>
                      <th className="p-2 text-right">Costo prod.</th>
                      <th className="p-2 text-right">Ganancia bruta</th>
                      <th className="p-2 text-right">Cobro entrega</th>
                      <th className="p-2 text-right">Pago repart.</th>
                      <th className="p-2 text-right">Ganancia final</th>
                      <th className="p-2 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => {
                      const locked = e.settlementStatus !== 'PENDIENTE' || !!e.settlementId;
                      return (
                        <tr key={e.id} className={`border-t border-line ${e.settlementStatus === 'ANULADO' ? 'opacity-50' : ''}`}>
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              aria-label={`Seleccionar ${e.orderNumber}`}
                              checked={selected.has(e.id)}
                              disabled={locked || e.courierCost <= 0}
                              onChange={() => toggle(e.id)}
                            />
                          </td>
                          <td className="p-2">
                            <p className="font-bold text-ink">{e.orderNumber}</p>
                            <p className="text-[10px] text-muted">{e.customerName}</p>
                            {e.chargeType === 'EXCEPCIONAL' && (
                              <span className="ds-badge ds-badge-warning mt-1 inline-block">Excepcional</span>
                            )}
                          </td>
                          <td className="p-2 text-muted">{e.deliveryDay || '—'}</td>
                          <td className="p-2">{e.courier?.name || <span className="text-red-500">Sin asignar</span>}</td>
                          <td className="p-2 text-right">{formatPrice(e.productRevenue)}</td>
                          <td className="p-2 text-right text-muted">{formatPrice(e.productCost)}</td>
                          <td className="p-2 text-right font-bold">{formatPrice(e.grossProfit)}</td>
                          <td className="p-2 text-right">{formatPrice(e.customerDeliveryFee)}</td>
                          <td className="p-2 text-right font-bold text-sport-green">{formatPrice(e.courierCost)}</td>
                          <td className={`p-2 text-right font-black ${e.netProfit < 0 ? 'text-red-500' : 'text-ink'}`}>
                            {formatPrice(e.netProfit)}
                          </td>
                          <td className="p-2 text-center">
                            <span
                              className={`ds-badge ${
                                e.settlementStatus === 'PENDIENTE'
                                  ? 'ds-badge-warning'
                                  : e.settlementStatus === 'LIQUIDADO'
                                  ? 'ds-badge-success'
                                  : 'ds-badge-muted'
                              }`}
                            >
                              {STATUS_LABEL[e.settlementStatus]}
                            </span>
                            {e.settlement?.settlementNumber && (
                              <p className="mt-1 text-[9px] text-muted">{e.settlement.settlementNumber}</p>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2 lg:hidden">
                {entries.map((e) => {
                  const locked = e.settlementStatus !== 'PENDIENTE' || !!e.settlementId;
                  return (
                    <div key={e.id} className="rounded-2xl border border-line bg-paper p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            className="mt-1"
                            aria-label={`Seleccionar ${e.orderNumber}`}
                            checked={selected.has(e.id)}
                            disabled={locked || e.courierCost <= 0}
                            onChange={() => toggle(e.id)}
                          />
                          <div>
                            <p className="text-sm font-black text-ink">{e.orderNumber}</p>
                            <p className="text-[11px] text-muted">{e.customerName}</p>
                            <p className="text-[10px] text-muted">
                              {e.deliveryDay || '—'} · {e.courier?.name || 'Sin repartidor'}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`ds-badge ${
                            e.settlementStatus === 'PENDIENTE'
                              ? 'ds-badge-warning'
                              : e.settlementStatus === 'LIQUIDADO'
                              ? 'ds-badge-success'
                              : 'ds-badge-muted'
                          }`}
                        >
                          {STATUS_LABEL[e.settlementStatus]}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-surface p-2 text-[10px]">
                        <div>
                          <p className="text-muted">Ganancia bruta</p>
                          <p className="font-bold text-ink">{formatPrice(e.grossProfit)}</p>
                        </div>
                        <div>
                          <p className="text-muted">Cobro entrega</p>
                          <p className="font-bold text-ink">{formatPrice(e.customerDeliveryFee)}</p>
                        </div>
                        <div>
                          <p className="text-muted">Pago repartidor</p>
                          <p className="font-bold text-sport-green">{formatPrice(e.courierCost)}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        <span className="text-muted">Ganancia después de logística</span>
                        <span className={`font-black ${e.netProfit < 0 ? 'text-red-500' : 'text-ink'}`}>
                          {formatPrice(e.netProfit)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'activas' && (
        <div className="space-y-2">
          <div className="rounded-2xl border border-line bg-paper p-3 shadow-sm">
            <p className="text-[11px] text-muted">
              Entregas en curso. <strong className="text-ink">No generan obligaciÃ³n de pago</strong> hasta que se marquen como entregadas. Al completarse, aparecen automÃ¡ticamente en "Rentabilidad por entrega".
            </p>
          </div>
          {activeDeliveries.length === 0 ? (
            <div className="ds-card p-10 text-center">
              <Truck size={26} className="mx-auto text-muted" />
              <p className="mt-2 font-bold text-ink">Sin entregas en curso</p>
              <p className="text-xs text-muted">Los pedidos con entrega aparecen aquÃ­ hasta que se completan.</p>
            </div>
          ) : (
            activeDeliveries.map((d) => (
              <div key={d.id} className="rounded-2xl border border-line bg-paper p-3 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Truck size={14} className="text-sport-green" />
                      <p className="font-black text-ink">{d.orderNumber}</p>
                      <span className="ds-badge ds-badge-warning">{d.status}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted">
                      {d.customerName} Â· {d.deliveryDay || 'â€”'} {d.window ? `Â· ${d.window}` : ''}
                    </p>
                    <p className="text-[10px] text-muted">
                      Repartidor: {d.courier?.name || <span className="text-red-500">sin asignar</span>}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-wide text-muted">Ganancia bruta estimada</p>
                    <p className="text-base font-black text-ink">{formatPrice(d.grossProfit || 0)}</p>
                    <p className="text-[10px] text-muted">Cobro entrega {formatPrice(d.customerDeliveryFee || 0)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      {tab === 'liquidaciones' && (
        <div className="space-y-2">
          {loading ? (
            <div className="skeleton h-40 rounded-2xl" />
          ) : settlements.length === 0 ? (
            <div className="ds-card p-10 text-center">
              <Wallet size={26} className="mx-auto text-muted" />
              <p className="mt-2 font-bold text-ink">Sin liquidaciones en el período</p>
              <p className="text-xs text-muted">Selecciona entregas pendientes y genera la primera liquidación.</p>
            </div>
          ) : (
            settlements.map((s) => (
              <div key={s.id} className="rounded-2xl border border-line bg-paper p-3 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Landmark size={15} className="text-sport-green" />
                      <p className="font-black text-ink">{s.settlementNumber}</p>
                      <span
                        className={`ds-badge ${
                          s.status === 'PENDIENTE'
                            ? 'ds-badge-warning'
                            : s.status === 'LIQUIDADO'
                            ? 'ds-badge-success'
                            : 'ds-badge-muted'
                        }`}
                      >
                        {SETTLEMENT_LABEL[s.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted">
                      {s.courierName || s.courier?.name} · {s.deliveriesCount} entregas · {s.periodFrom || '—'} →{' '}
                      {s.periodTo || '—'}
                    </p>
                    {s.paymentMethod && (
                      <p className="text-[10px] text-muted">
                        {s.paymentMethod} · {s.paymentDate ? new Date(s.paymentDate).toLocaleDateString('es-CL') : ''}
                      </p>
                    )}
                    {s.notes && <p className="text-[10px] text-muted">Nota: {s.notes}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-ink">{formatPrice(s.totalAmount)}</p>
                    <div className="mt-1 flex flex-wrap justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => downloadReceipt(s)}
                        className="ds-btn-secondary inline-flex items-center gap-1 px-2 py-1.5 text-[10px]"
                      >
                        <FileDown size={12} /> PDF
                      </button>
                      {s.status === 'PENDIENTE' && (
                        <>
                          <button
                            type="button"
                            onClick={() => openPayment(s)}
                            className="ds-btn-success inline-flex items-center gap-1 px-2 py-1.5 text-[10px]"
                          >
                            <CheckCircle2 size={12} /> Confirmar pago
                          </button>
                          <button
                            type="button"
                            onClick={() => cancelSettlement(s)}
                            className="ds-btn-danger inline-flex items-center gap-1 px-2 py-1.5 text-[10px]"
                          >
                            <XCircle size={12} /> Anular
                          </button>
                        </>
                      )}
                      {s.status === 'LIQUIDADO' && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-sport-green/10 px-2 py-1.5 text-[10px] font-bold text-sport-green">
                          <BadgeDollarSign size={12} /> Pagada
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {paySettlement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPaySettlement(null)} />
          <div className="relative w-full max-w-sm rounded-3xl border border-line bg-paper p-5 shadow-2xl">
            <h3 className="font-display text-base uppercase tracking-wide text-ink">Confirmar pago</h3>
            <p className="text-xs text-muted">
              {paySettlement.settlementNumber} · {formatPrice(paySettlement.totalAmount)} a {paySettlement.courierName}
            </p>
            <div className="mt-4 space-y-3 text-xs">
              <label className="block">
                <span className="mb-1 block font-bold text-muted">Método de pago</span>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                  className="w-full rounded-xl border border-line bg-surface p-2.5 font-bold text-ink"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block font-bold text-muted">Fecha de pago</span>
                <input
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, paymentDate: e.target.value }))}
                  className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink"
                />
              </label>
            </div>
            <p className="mt-3 text-[10px] text-muted">
              Al confirmar, las entregas quedan marcadas como liquidadas y no podrán liquidarse dos veces.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setPaySettlement(null)} className="ds-btn-secondary px-3 py-2 text-[12px]">
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmPayment}
                disabled={busy}
                className="ds-btn-success inline-flex items-center gap-1.5 px-3 py-2 text-[12px]"
              >
                <CheckCircle2 size={14} /> Confirmar pago
              </button>
            </div>
          </div>
        </div>
      )}

      {showExceptional && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowExceptional(false)} />
          <div className="relative w-full max-w-md rounded-3xl border border-line bg-paper p-5 shadow-2xl">
            <h3 className="font-display text-base uppercase tracking-wide text-ink">Cargo excepcional</h3>
            <p className="text-xs text-muted">
              Solo para entregas canceladas, fallidas o incidencias. No se genera pago automático por entregas no completadas.
            </p>
            <div className="mt-4 space-y-3 text-xs">
              <label className="block">
                <span className="mb-1 block font-bold text-muted">Entrega</span>
                <select
                  value={exceptionalForm.deliveryId}
                  onChange={(e) => setExceptionalForm((f) => ({ ...f, deliveryId: e.target.value }))}
                  className="w-full rounded-xl border border-line bg-surface p-2.5 font-bold text-ink"
                >
                  <option value="">Seleccionar entrega…</option>
                  {failed.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.order?.orderNumber} · {d.deliveryDay || '—'} · {d.order?.customerName}
                    </option>
                  ))}
                </select>
                {failed.length === 0 && (
                  <span className="mt-1 block text-[10px] text-muted">No hay entregas fallidas sin cargo en los últimos 30 días.</span>
                )}
              </label>
              <label className="block">
                <span className="mb-1 block font-bold text-muted">Monto a pagar</span>
                <input
                  type="number"
                  min={1}
                  value={exceptionalForm.amount}
                  onChange={(e) => setExceptionalForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="Ej: 2500"
                  className="w-full rounded-xl border border-line bg-surface p-2.5 font-bold text-ink"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-bold text-muted">Motivo</span>
                <textarea
                  value={exceptionalForm.reason}
                  onChange={(e) => setExceptionalForm((f) => ({ ...f, reason: e.target.value }))}
                  rows={3}
                  className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink"
                  placeholder="Ej: reintento autorizado por coordinación"
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowExceptional(false)} className="ds-btn-secondary px-3 py-2 text-[12px]">
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveExceptional}
                disabled={busy}
                className="ds-btn-primary inline-flex items-center gap-1.5 px-3 py-2 text-[12px]"
              >
                <Printer size={14} /> Registrar cargo
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateCourier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateCourier(false)} />
          <div className="relative w-full max-w-md rounded-3xl border border-line bg-paper p-5 shadow-2xl">
            <h3 className="font-display text-base uppercase tracking-wide text-ink">Crear repartidor</h3>
            <p className="text-xs text-muted">Crea la cuenta de reparto y asigna un PIN de 4 a 6 digitos para ingresar a la app.</p>
            <div className="mt-4 space-y-3 text-xs">
              <label className="block">
                <span className="mb-1 block font-bold text-muted">Nombre</span>
                <input value={courierForm.name} onChange={(e) => setCourierForm((f) => ({ ...f, name: e.target.value }))} className="w-full rounded-xl border border-line bg-surface p-2.5 font-bold text-ink" />
              </label>
              <label className="block">
                <span className="mb-1 block font-bold text-muted">Email</span>
                <input type="email" value={courierForm.email} onChange={(e) => setCourierForm((f) => ({ ...f, email: e.target.value }))} placeholder="jorge@nutrifit.cl" className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink" />
              </label>
              <label className="block">
                <span className="mb-1 block font-bold text-muted">PIN (4 a 6 digitos)</span>
                <input value={courierForm.pin} onChange={(e) => setCourierForm((f) => ({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 6) }))} placeholder="1234" className="w-full rounded-xl border border-line bg-surface p-2.5 font-bold text-ink" />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreateCourier(false)} className="ds-btn-secondary px-3 py-2 text-[12px]">Cancelar</button>
              <button type="button" disabled={busy} onClick={async () => {
                const name = courierForm.name.trim();
                const email = courierForm.email.trim();
                if (name.length < 2) return toast.error('Nombre invalido.');
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error('Email invalido.');
                setBusy(true);
                try {
                  const created = await apiFetch<any>('/users', { method: 'POST', token, body: { name, email, role: 'DELIVERY' } });
                  if (courierForm.pin.length >= 4) {
                    await apiFetch(`/users/${created.id}/pin`, { method: 'PATCH', token, body: { pin: courierForm.pin } });
                  }
                  toast.success('Repartidor creado. Ya puede ingresar con su PIN.');
                  setShowCreateCourier(false);
                  await load();
                } catch (err: any) {
                  toast.error(err?.message || 'No se pudo crear el repartidor.');
                } finally {
                  setBusy(false);
                }
              }} className="ds-btn-primary inline-flex items-center gap-1.5 px-3 py-2 text-[12px]">Crear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
