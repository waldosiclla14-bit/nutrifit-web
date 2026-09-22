'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { haptic } from '@/lib/haptic';
import {
  Banknote,
  CalendarDays,
  Copy,
  MessageCircle,
  Minus,
  Pause,
  Play,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  ShoppingCart,
  Store,
  Trash2,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatPrice, formatTime12, uid } from '@/lib/utils';
import { buildDeliveryOrderMessage, openWhatsApp, webFooter } from '@/lib/whatsapp';
import { toast, useConfirm } from '@/lib/feedback';
import { handleAuthError } from '@/lib/admin/helpers';
import type { AdminReport } from '@/types/admin';

import {
  ApiProduct,
  CartLine,
  CashRegister,
  PAYMENT_LABELS,
  TIME_SLOTS,
  lineKey,
  todayISO,
  marginOf,
} from '@/components/pos/posTypes';

type MetroStation = {
  id: string;
  name: string;
  line: string;
  lineName: string;
  commune: string;
  latitude: number;
  longitude: number;
  defaultMeetingPoint: string | null;
};

const LINE_COLORS: Record<string, string> = {
  L1: '#DA291C', L2: '#FFC72C', L3: '#6F4E37', L4: '#0033A0',
  L4A: '#00AEEF', L5: '#00A651', L6: '#92278F',
};

const STORE_NAME = 'NutriFit';
const HOLDS_KEY = 'nutrifit:pos:holds';
const ACTIVE_CART_KEY = 'nutrifit:pos:activecart';

// spec §4.7.1 — fixed 30-min delivery windows, 8 AM – 10 PM
const TIME_PERIODS = {
  manana: { label: 'Mañana', start: 8, end: 12 },
  tarde: { label: 'Tarde', start: 12, end: 18 },
  noche: { label: 'Noche', start: 18, end: 22 },
} as const;

type TimeSlot = {
  start: string;
  end: string;
  available: boolean;
};

type ReceiptLine = {
  productName: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type ReceiptData = {
  orderNumber: string;
  at: string;
  customerName: string;
  customerPhone: string;
  lines: ReceiptLine[];
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
  payment: string;
  paid: boolean;
  pago?: number;
  vuelto?: number;
};

type Hold = {
  id: string;
  at: number;
  lines: CartLine[];
  customerName: string;
  customerPhone: string;
  total: number;
  mode: 'LOCAL' | 'METRO' | 'DELIVERY';
  payment: string;
  metroLine: string;
  metroStation: string;
  selectedStationId: string;
  selectedStationCommune: string;
  selectedMeetingPoint: string;
  deliveryDay: string;
  deliveryTime: string;
  deliveryTimeEnd: string;
  deliveryAddress: string;
  shippingInput: number;
  paymentReceived: boolean;
  quickSale: boolean;
  discountPct: number;
  discountMode: 'percent' | 'amount';
  discountAmountInput: number;
  mixedCash: number;
  mixedTransfer: number;
};

function roundUp(value: number, step: number) {
  return Math.ceil(value / step) * step;
}

function tendersOf(total: number): number[] {
  if (total <= 0) return [];
  const values = new Set<number>([
    total,
    roundUp(total, 5000),
    roundUp(total, 10000),
    roundUp(total, 20000),
    roundUp(total, 50000),
  ]);
  return [...values]
    .filter((v) => v >= total)
    .sort((a, b) => a - b)
    .slice(0, 4);
}

function formatDateTimeShort(iso: string) {
  try {
    return new Date(iso).toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function receiptText(r: ReceiptData): string {
  const lines: string[] = [];
  lines.push(STORE_NAME);
  lines.push(`Boleta ${r.orderNumber}`);
  lines.push(formatDateTimeShort(r.at));
  lines.push('');
  lines.push(`Cliente: ${r.customerName}`);
  if (r.customerPhone) lines.push(`Teléfono: ${r.customerPhone}`);
  lines.push('─'.repeat(26));
  lines.push('');
  lines.push('PRODUCTOS:');
  r.lines.forEach((l, i) => {
    lines.push(
      `${i + 1}. ${l.productName}${l.variantName ? ` (${l.variantName})` : ''}`,
    );
    lines.push(`   ${l.quantity} × ${formatPrice(l.unitPrice)} = ${formatPrice(l.total)}`);
  });
  lines.push('');
  lines.push('─'.repeat(26));
  lines.push(`Subtotal: ${formatPrice(r.subtotal)}`);
  if (r.discount > 0) lines.push(`Descuento: -${formatPrice(r.discount)}`);
  if (r.shippingCost > 0) lines.push(`Envío: ${formatPrice(r.shippingCost)}`);
  lines.push(`TOTAL: ${formatPrice(r.total)}`);
  lines.push(`Pago: ${r.payment}${r.paid ? ' · PAGADO' : ' · PENDIENTE'}`);
  if (r.pago !== undefined) lines.push(`Pagó con: ${formatPrice(r.pago)}`);
  if (r.vuelto !== undefined) lines.push(`Vuelto: ${formatPrice(r.vuelto)}`);
  lines.push('');
  lines.push('¡Gracias por tu compra! 💪');
  return lines.join('\n');
}

export function Pos({ token, onLogout }: { token: string; onLogout: () => void }) {
  const confirm = useConfirm();
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [query, setQuery] = useState('');
  const [discountPct, setDiscountPct] = useState(0);
  const [discountMode, setDiscountMode] = useState<'percent' | 'amount'>('percent');
  const [discountAmountInput, setDiscountAmountInput] = useState(0);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [payment, setPayment] = useState('EFECTIVO');
  const [pago, setPago] = useState(0);
  const [mode, setMode] = useState<'LOCAL' | 'METRO' | 'DELIVERY'>('LOCAL');
  const [metroLine, setMetroLine] = useState('');
  const [metroStation, setMetroStation] = useState('');
  const [selectedStationId, setSelectedStationId] = useState('');
  const [selectedStationCommune, setSelectedStationCommune] = useState('');
  const [selectedMeetingPoint, setSelectedMeetingPoint] = useState('');
  const [stationSearch, setStationSearch] = useState('');
  const [stationResults, setStationResults] = useState<MetroStation[]>([]);
  const [deliveryDay, setDeliveryDay] = useState(todayISO());
  const [deliveryTime, setDeliveryTime] = useState('11:00');
  const [deliveryTimeEnd, setDeliveryTimeEnd] = useState('11:30');
  const [quickSale, setQuickSale] = useState(false);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [timePeriod, setTimePeriod] = useState<'manana' | 'tarde' | 'noche'>(() => {
    const h = new Date().getHours();
    if (h < 12) return 'manana';
    if (h < 18) return 'tarde';
    return 'noche';
  });
  const [paymentReceived, setPaymentReceived] = useState(false);
  const [shippingInput, setShippingInput] = useState(1000);
  const [mixedCash, setMixedCash] = useState(0);
  const [mixedTransfer, setMixedTransfer] = useState(0);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [cash, setCash] = useState<CashRegister | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [saleMsg, setSaleMsg] = useState<string | null>(null);
  const [salePhone, setSalePhone] = useState('');
  const [copied, setCopied] = useState(false);
  const [holds, setHolds] = useState<Hold[]>([]);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [showCash, setShowCash] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [report, setReport] = useState<AdminReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [metroLines, setMetroLines] = useState<{ line: string; lineName: string; stations: string[] }[]>([]);
  const [lineFilter, setLineFilter] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const cartRef = useRef<HTMLDivElement | null>(null);
  const customerNameRef = useRef<HTMLInputElement | null>(null);

  const scrollToCart = () => cartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Load metro lines for the line filter
  useEffect(() => {
    if ((mode === 'METRO' || mode === 'DELIVERY') && metroLines.length === 0) {
      apiFetch<{ line: string; lineName: string; count: number }[]>('/metro-stations/lines', { token })
        .then((lines) => setMetroLines(lines.map((l) => ({ line: l.line, lineName: l.lineName, stations: [] }))))
        .catch(() => {});
    }
  }, [mode, metroLines.length, token]);

  // Search stations from API
  useEffect(() => {
    if (mode !== 'METRO') return;
    const term = stationSearch.trim();
    if (term.length < 2 && !lineFilter) {
      setStationResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      let url = `/metro-stations?search=${encodeURIComponent(term || '*')}`;
      if (lineFilter) url += `&line=${lineFilter}`;
      apiFetch<MetroStation[]>(url, { token })
        .then((data) => { if (!cancelled) setStationResults(data); })
        .catch(() => { if (!cancelled) setStationResults([]); });
    }, 300);
    return () => { clearTimeout(timer); cancelled = true; };
  }, [stationSearch, mode, token, lineFilter]);

  // Delivery window availability for the selected date (fallback: all windows open)
  useEffect(() => {
    if (mode !== 'METRO' || !deliveryDay) return;
    let cancelled = false;
    const params = new URLSearchParams({ date: deliveryDay });
    if (selectedStationId) params.set('stationId', selectedStationId);
    apiFetch<TimeSlot[]>(`/deliveries/slots?${params}`, { token })
      .then((s) => { if (!cancelled) setSlots(Array.isArray(s) ? s : []); })
      .catch(() => { if (!cancelled) setSlots([]); });
    return () => { cancelled = true; };
  }, [mode, deliveryDay, selectedStationId, token]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === 'F2') {
        e.preventDefault();
        customerNameRef.current?.focus();
      } else if (e.key === 'F3' && cart.length > 0) {
        e.preventDefault();
        pauseSale();
      } else if (e.key === 'F4' && cart.length > 0 && !saving) {
        e.preventDefault();
        scrollToCart();
      } else if ((e.key === 'n' || e.key === 'N') && !e.ctrlKey && !e.metaKey && e.target === document.body) {
        e.preventDefault();
        resetSaleForm();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cart.length, saving]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(HOLDS_KEY);
      if (raw) setHolds(JSON.parse(raw));
    } catch {
      setHolds([]);
    }
  }, []);

  // Active cart survives PWA reloads/updates mid-sale (same day only).
  const restoredCartRef = useRef(false);
  useEffect(() => {
    if (restoredCartRef.current) return;
    restoredCartRef.current = true;
    try {
      const raw = window.localStorage.getItem(ACTIVE_CART_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (!s || !Array.isArray(s.cart) || s.cart.length === 0) return;
      if (s.savedDay !== todayISO()) {
        window.localStorage.removeItem(ACTIVE_CART_KEY);
        return;
      }
      setCart(s.cart);
      if (typeof s.customerName === 'string') setCustomerName(s.customerName);
      if (typeof s.customerPhone === 'string') setCustomerPhone(s.customerPhone);
      if (s.payment) setPayment(s.payment);
      if (s.mode) setMode(s.mode);
      if (s.deliveryDay) setDeliveryDay(s.deliveryDay);
      if (s.deliveryTime) setDeliveryTime(s.deliveryTime);
      if (s.deliveryTimeEnd) setDeliveryTimeEnd(s.deliveryTimeEnd);
      if (s.metroStation !== undefined) setMetroStation(s.metroStation);
      if (s.metroLine !== undefined) setMetroLine(s.metroLine);
      if (s.selectedStationId !== undefined) setSelectedStationId(s.selectedStationId);
      if (s.shippingInput !== undefined) setShippingInput(s.shippingInput);
      if (typeof s.paymentReceived === 'boolean') setPaymentReceived(s.paymentReceived);
      if (typeof s.discountPct === 'number') setDiscountPct(s.discountPct);
      if (s.discountMode) setDiscountMode(s.discountMode);
      if (typeof s.discountAmountInput === 'number') setDiscountAmountInput(s.discountAmountInput);
      if (typeof s.deliveryAddress === 'string') setDeliveryAddress(s.deliveryAddress);
      toast.info('Venta en curso recuperada.');
    } catch {
      // corrupted snapshot: ignore
    }
  }, []);

  useEffect(() => {
    try {
      if (cart.length === 0) {
        window.localStorage.removeItem(ACTIVE_CART_KEY);
        return;
      }
      window.localStorage.setItem(
        ACTIVE_CART_KEY,
        JSON.stringify({
          savedDay: todayISO(),
          cart,
          customerName,
          customerPhone,
          payment,
          mode,
          deliveryDay,
          deliveryTime,
          deliveryTimeEnd,
          metroStation,
          metroLine,
          selectedStationId,
          shippingInput,
          paymentReceived,
          discountPct,
          discountMode,
          discountAmountInput,
          deliveryAddress,
        }),
      );
    } catch {
      // storage unavailable
    }
  }, [cart, customerName, customerPhone, payment, mode, deliveryDay, deliveryTime, deliveryTimeEnd, metroStation, metroLine, selectedStationId, shippingInput, paymentReceived, discountPct, discountMode, discountAmountInput, deliveryAddress]);

  const persistHolds = useCallback((next: Hold[]) => {
    setHolds(next);
    try {
      window.localStorage.setItem(HOLDS_KEY, JSON.stringify(next));
    } catch {
      // storage unavailable
    }
  }, []);

  const load = useCallback(async (initial = true) => {
    if (initial) setLoading(true);
    try {
      const [p, cr] = await Promise.all([
        apiFetch<any[]>('/products/internal', { token }),
        apiFetch<any | null>('/cash-register/current-lite', { token }).catch(() =>
          apiFetch<any | null>('/cash-register/current', { token }),
        ),
      ]);
      setProducts(
        (p || []).map((x) => {
          const variants = (x.variants || []).map((v: any) => ({
            id: v.id,
            name: v.variantName || v.name || 'Sin variante',
            sku: v.sku,
            price: v.price,
            costPrice: (v.costPrice || 0) || (x.costPrice || 0),
            stock: v.stock,
            lowStockAlert: v.lowStockAlert,
            active: v.isActive !== false,
          }));
          const totalStock = variants.reduce((s: number, v: any) => s + (v.stock ?? 0), 0);
          return {
            id: x.id,
            name: x.name,
            brand: x.brand,
            sku: x.sku,
            price: x.basePrice ?? x.price,
            costPrice: x.costPrice ?? 0,
            stock: totalStock,
            active: x.isActive !== false,
            category: x.category ? { id: x.category.id, name: x.category.name } : null,
            variants,
          };
        }),
      );
      setCash(
        cr
          ? { id: cr.id, status: cr.isOpen ? 'OPEN' : 'CLOSED', initialAmount: cr.initialAmount, openedAt: cr.openedAt }
          : null,
      );
    } catch (err: any) {
      if (handleAuthError(err, onLogout)) return;
      toast.error(err?.message || 'No se pudieron cargar los productos. Verifica tu conexión.');
    } finally {
      if (initial) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const today = todayISO();

  const loadReport = useCallback(async () => {
    setReportLoading(true);
    try {
      const r = await apiFetch<AdminReport>(`/orders/reports?from=${today}&to=${today}`, { token });
      setReport(r);
    } catch (err: any) {
      if (handleAuthError(err, onLogout)) return;
      toast.error(err?.message || 'Error al cargar el resumen de caja.');
    } finally {
      setReportLoading(false);
    }
  }, [today, token, onLogout]);

  useEffect(() => {
    if (showCash && !report) loadReport();
  }, [showCash, report, loadReport]);

  const filtered = useMemo(() => {
    let list = products;
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((p) => `${p.name} ${p.brand?.name || ''} ${p.sku || ''}`.toLowerCase().includes(q));
    return list;
  }, [products, query]);

  const addToCart = (p: ApiProduct, variantId: string | null) => {
    const v = variantId ? p.variants?.find((x) => x.id === variantId) : null;
    const unitPrice = v?.price ?? p.price;
    const stock = v?.stock ?? p.stock ?? 999;
    const key = variantId ?? p.id;
    setCart((cart) => {
      const existing = cart.find((l) => lineKey(l) === key);
      if (existing) {
        if (stock > 0 && existing.quantity >= stock) return cart;
        return cart.map((l) => (lineKey(l) === key ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...cart,
        {
          productId: p.id,
          variantId,
          productName: p.name,
          variantName: v?.name || '',
          sku: v?.sku || '',
          unitPrice,
          quantity: 1,
          stock,
        },
      ];
    });
    setReceipt(null);
    setSaleMsg(null);
  };

  const setQty = (key: string, quantity: number) => {
    setCart((cart) =>
      cart
        .map((l) => (lineKey(l) === key ? { ...l, quantity: Math.max(0, Math.min(l.stock, quantity)) } : l))
        .filter((l) => l.quantity > 0),
    );
  };

  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0), [cart]);

  function computeEndTime(timeStart: string): string {
    const [h, m] = timeStart.split(':').map(Number);
    const endM = m + 30;
    const endH = h + Math.floor(endM / 60);
    if (endH > 23) return '23:59';
    return `${String(endH).padStart(2, '0')}:${String(endM % 60).padStart(2, '0')}`;
  }

  // spec §5 — single payment select encodes method + received (no separate checkbox)
  type PayOption = 'EFECTIVO' | 'TRANSFER_PAGADA' | 'TRANSFER_PENDIENTE' | 'TARJETA_MANUAL' | 'MIXTO';

  function currentPayOption(): PayOption {
    if (payment === 'TRANSFERENCIA') return paymentReceived ? 'TRANSFER_PAGADA' : 'TRANSFER_PENDIENTE';
    if (payment === 'TARJETA_MANUAL') return 'TARJETA_MANUAL';
    if (payment === 'MIXTO') return 'MIXTO';
    return 'EFECTIVO';
  }

  function applyPayOption(opt: PayOption): void {
    const receivedNow = mode === 'LOCAL';
    if (opt === 'TRANSFER_PAGADA') {
      setPayment('TRANSFERENCIA');
      setPaymentReceived(true);
    } else if (opt === 'TRANSFER_PENDIENTE') {
      setPayment('TRANSFERENCIA');
      setPaymentReceived(false);
    } else if (opt === 'TARJETA_MANUAL') {
      setPayment('TARJETA_MANUAL');
      setPaymentReceived(receivedNow);
    } else if (opt === 'MIXTO') {
      setPayment('MIXTO');
      setPaymentReceived(receivedNow);
    } else {
      setPayment('EFECTIVO');
      setPaymentReceived(receivedNow);
    }
    if (opt !== 'MIXTO') {
      setMixedCash(0);
      setMixedTransfer(0);
    }
  }

  function payOptions(): { value: PayOption; label: string }[] {
    return [
      { value: 'EFECTIVO', label: mode === 'LOCAL' ? 'Efectivo' : 'Efectivo (contra entrega)' },
      { value: 'TRANSFER_PAGADA', label: 'Transferencia (pagada)' },
      { value: 'TRANSFER_PENDIENTE', label: 'Transferencia (contra entrega)' },
      { value: 'TARJETA_MANUAL', label: 'Tarjeta' },
      { value: 'MIXTO', label: 'Mixto' },
    ];
  }

  const discountAmount = useMemo(() => {
    if (discountMode === 'amount') return Math.min(subtotal, Math.max(0, discountAmountInput));
    return Math.round((subtotal * discountPct) / 100);
  }, [subtotal, discountPct, discountMode, discountAmountInput]);
  const shippingCost = (mode === 'METRO' || mode === 'DELIVERY') ? Math.max(0, shippingInput) : 0;
  const total = Math.max(0, subtotal - discountAmount + shippingCost);

  const tenders = useMemo(() => tendersOf(total), [total]);

  const cashRequired = mode === 'LOCAL' || paymentReceived;
  const showCashPay = cashRequired && payment === 'EFECTIVO' && total > 0;
  const cashShort = cashRequired && payment === 'EFECTIVO' && total > 0 && pago < total;

  useEffect(() => {
    if (payment !== 'EFECTIVO' || !cashRequired) return;
    if (pago === 0) {
      const first = tenders[0];
      if (first) setPago(first);
    }
  }, [payment, cashRequired, tenders, pago]);

  const resetSaleForm = () => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setPayment('EFECTIVO');
    setDiscountPct(0);
    setDiscountAmountInput(0);
    setPago(0);
    setPaymentReceived(false);
    setMetroLine('');
    setMetroStation('');
    setSelectedStationId('');
    setSelectedStationCommune('');
    setSelectedMeetingPoint('');
    setStationSearch('');
    setStationResults([]);
    setDeliveryDay(todayISO());
    setDeliveryTime('11:00');
    setDeliveryTimeEnd('11:30');
    setShippingInput(1000);
    setMixedCash(0);
    setMixedTransfer(0);
    setDeliveryAddress('');
  };

  const pauseSale = () => {
    if (cart.length === 0) return;
    const hold: Hold = {
      id: uid('hold'),
      at: Date.now(),
      lines: [...cart],
      customerName,
      customerPhone,
      total,
      mode,
      payment,
      metroLine,
      metroStation,
      selectedStationId,
      selectedStationCommune,
      selectedMeetingPoint,
      deliveryDay,
      deliveryTime,
      deliveryTimeEnd,
      deliveryAddress,
      shippingInput,
      paymentReceived,
      quickSale,
      discountPct,
      discountMode,
      discountAmountInput,
      mixedCash,
      mixedTransfer,
    };
    persistHolds([hold, ...holds]);
    resetSaleForm();
    toast.info(`Venta de ${formatPrice(total)} puesta en espera.`);
  };

  const resumeHold = (h: Hold) => {
    persistHolds(holds.filter((x) => x.id !== h.id));
    setCart(h.lines.map((l) => ({ ...l })));
    setCustomerName(h.customerName);
    setCustomerPhone(h.customerPhone);
    setMode(h.mode || 'LOCAL');
    setPayment(h.payment || 'EFECTIVO');
    setMetroLine(h.metroLine || '');
    setMetroStation(h.metroStation || '');
    setSelectedStationId(h.selectedStationId || '');
    setSelectedStationCommune(h.selectedStationCommune || '');
    setSelectedMeetingPoint(h.selectedMeetingPoint || '');
    setDeliveryDay(h.deliveryDay || todayISO());
    setDeliveryTime(h.deliveryTime || '11:00');
    setDeliveryTimeEnd(h.deliveryTimeEnd || '11:30');
    setDeliveryAddress(h.deliveryAddress || '');
    setShippingInput(h.shippingInput ?? 1000);
    setPaymentReceived(h.paymentReceived || false);
    setQuickSale(h.quickSale || false);
    setDiscountPct(h.discountPct || 0);
    setDiscountMode(h.discountMode || 'percent');
    setDiscountAmountInput(h.discountAmountInput || 0);
    setMixedCash(h.mixedCash || 0);
    setMixedTransfer(h.mixedTransfer || 0);
    setReceipt(null);
    setSaleMsg(null);
    toast.info('Venta recuperada de espera.');
  };

  const deleteHold = async (h: Hold) => {
    const ok = await confirm({
      title: 'Eliminar venta en espera',
      message: `¿Eliminar la venta de ${formatPrice(h.total)}? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (ok) {
      persistHolds(holds.filter((x) => x.id !== h.id));
      toast.success('Venta en espera eliminada.');
    }
  };

  const cancelSale = async () => {
    if (cart.length === 0) return;
    const ok = await confirm({
      title: 'Cancelar venta',
      message: 'Se descartarán los productos del carrito actual. Esta acción no se puede deshacer.',
      confirmLabel: 'Cancelar venta',
      danger: true,
    });
    if (ok) {
      resetSaleForm();
      toast.info('Venta cancelada.');
    }
  };

  const openRegister = async () => {
    try {
      await apiFetch('/cash-register/open', { method: 'POST', token, body: { initialAmount: 0 } });
      await load(false);
    } catch (err: any) {
      if (handleAuthError(err, onLogout)) return;
      toast.error(err?.message || 'Error al abrir caja.');
    }
  };

  const insufficientStock = (): { name: string; avail: number } | null => {
    for (const l of cart) {
      const p = products.find((x) => x.id === l.productId);
      if (!p) continue;
      if (l.variantId) {
        const v = p.variants?.find((x) => x.id === l.variantId);
        if (!v) continue;
        if (l.quantity > v.stock) return { name: `${p.name} · ${v.name}`, avail: v.stock };
      } else if (p.stock != null && l.quantity > p.stock) {
        return { name: p.name, avail: p.stock };
      }
    }
    return null;
  };

  const checkout = async () => {
    if (savingRef.current || saving || cart.length === 0) return;
    const stockIssue = insufficientStock();
    if (stockIssue) {
      toast.error(`Stock insuficiente: ${stockIssue.name} (disponible: ${stockIssue.avail})`);
      return;
    }
    if (showCashPay && pago < total) {
      toast.error(`Faltan ${formatPrice(total - pago)} para completar el pago en efectivo.`);
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      if (!(quickSale && mode !== 'DELIVERY')) {
        toast.error('Ingresa nombre y teléfono del cliente.');
        if (!customerName.trim()) customerNameRef.current?.focus();
        else document.querySelector<HTMLInputElement>('[placeholder="Teléfono"]')?.focus();
        return;
      }
    }
    // Venta rápida (spec §4.9): cliente genérico reutilizable — el backend
    // lo fusiona por teléfono, así todas las ventas rápidas caen en "Mostrador".
    const qName = customerName.trim() || 'Mostrador';
    const qPhone = customerPhone.trim() || '000000';
    if (mode === 'METRO' && (!selectedStationId || !deliveryDay || !deliveryTime)) {
      toast.error('Selecciona estación, fecha y horario de entrega.');
      return;
    }
    if (mode === 'DELIVERY' && (!deliveryAddress.trim() || !deliveryDay)) {
      toast.error('Ingresa la dirección y fecha de envío.');
      return;
    }
    if (payment === 'MIXTO') {
      const mixTotal = (mixedCash || 0) + (mixedTransfer || 0);
      if (mixTotal <= 0) {
        toast.error('Ingresa el monto en efectivo y/o transferencia para pago mixto.');
        return;
      }
      if (mixTotal < total) {
        toast.error(`El total de pago mixto ($${mixTotal.toLocaleString('es-CL')}) es menor al total ($${total.toLocaleString('es-CL')}).`);
        return;
      }
    }
    // Generate idempotency key once per checkout attempt — prevents double-submit
    const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    savingRef.current = true;
    setSaving(true);
    try {
      const customer = await apiFetch<{ id: string }>('/customers', {
        method: 'POST',
        token,
        body: { name: qName, phone: qPhone },
      });
      const order = await apiFetch<{ id: string; orderNumber: string }>('/orders', {
        method: 'POST',
        token,
        body: {
          idempotencyKey,
          customerId: customer.id,
          customerName: qName,
          customerPhone: qPhone,
          deliveryType: mode === 'METRO' ? 'METRO' : mode === 'DELIVERY' ? 'ENVIO_DOMICILIO' : 'RETIRO_TIENDA',
          metroLine: mode === 'METRO' ? metroLine : undefined,
          metroStation: mode === 'METRO' ? metroStation : undefined,
          stationId: mode === 'METRO' ? selectedStationId : undefined,
          deliveryDay: (mode === 'METRO' || mode === 'DELIVERY') ? deliveryDay : undefined,
          deliveryTime: (mode === 'METRO' || mode === 'DELIVERY') ? deliveryTime : undefined,
          address: mode === 'DELIVERY' ? deliveryAddress.trim() : undefined,
          subtotal,
          discount: discountAmount,
          shippingCost,
          total,
          paymentMethod: payment,
          cashRegisterId: cash?.id || null,
          items: cart.map((l) => ({
            productId: l.productId,
            variantId: l.variantId,
            productName: l.productName,
            variantName: l.variantName,
            sku: l.sku,
            unitPrice: l.unitPrice,
            quantity: l.quantity,
            total: l.unitPrice * l.quantity,
          })),
        },
      });
      if (mode === 'LOCAL' || paymentReceived) {
        try {
          await apiFetch(`/orders/${order.id}/payment`, {
            method: 'PATCH',
            token,
            body: { paymentMethod: payment, paymentNotes: 'Pago registrado en POS' },
          });
        } catch {
          await apiFetch(`/orders/${order.id}`, { method: 'DELETE', token }).catch(() => {});
          throw new Error('Error al registrar el pago. La venta fue cancelada.');
        }
      }
      // Create Delivery record for METRO and DELIVERY orders
      if (mode === 'METRO' || mode === 'DELIVERY') {
        try {
          const deliveryPayload: any = {
            orderId: order.id,
            customerId: customer.id,
            deliveryType: mode === 'METRO' ? 'METRO' : 'ENVIO_DOMICILIO',
            deliveryDate: deliveryDay,
            windowStart: deliveryTime,
            windowEnd: deliveryTimeEnd,
          };
          if (mode === 'METRO') {
            deliveryPayload.stationId = selectedStationId;
            deliveryPayload.meetingPoint = selectedMeetingPoint;
          } else {
            deliveryPayload.address = deliveryAddress.trim();
          }
          const deliveryResult = await apiFetch<any>('/deliveries', { method: 'POST', token, body: deliveryPayload });
          // If payment already received, transition delivery status
          if (paymentReceived) {
            await apiFetch(`/deliveries/${deliveryResult.id}/status`, {
              method: 'PATCH',
              token,
              body: { status: 'PAYMENT_CONFIRMED' },
            }).catch(() => {});
          }
        } catch (deliveryErr: any) {
          toast.error(`Venta registrada pero error al agendar entrega: ${deliveryErr?.message || 'desconocido'}`);
        }
      }
      const paidNow = mode === 'LOCAL' || paymentReceived;
      setReceipt({
        orderNumber: order.orderNumber,
        at: new Date().toISOString(),
        customerName: qName,
        customerPhone: qPhone,
        lines: cart.map((l) => ({
          productName: l.productName,
          variantName: l.variantName,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          total: l.unitPrice * l.quantity,
        })),
        subtotal,
        discount: discountAmount,
        shippingCost,
        total,
        payment: PAYMENT_LABELS[payment] ?? payment,
        paid: paidNow,
        pago: payment === 'EFECTIVO' && pago >= total ? pago : undefined,
        vuelto: payment === 'EFECTIVO' && pago >= total ? pago - total : undefined,
      });
      haptic(80);
      toast.success(paidNow ? `Venta ${order.orderNumber} registrada y pagada.` : `Venta ${order.orderNumber} registrada.`);
      if (mode === 'METRO') {
        // Get deliveryCode from the delivery result if available
        let deliveryCodeVal = '';
        try {
          const delRes = await apiFetch<any>(`/deliveries/order/${order.id}`, { token }).catch(() => null);
          deliveryCodeVal = delRes?.deliveryCode || '';
        } catch {}

        setSalePhone(qPhone);
        setSaleMsg(
          buildDeliveryOrderMessage({
            name: qName,
            phone: qPhone,
            orderNumber: order.orderNumber,
            items: cart.map((l) => ({
              productName: l.productName,
              variantName: l.variantName || undefined,
              quantity: l.quantity,
              total: l.unitPrice * l.quantity,
            })),
            subtotal,
            discount: discountAmount,
            shippingCost,
            total,
            paymentLabel: PAYMENT_LABELS[payment] ?? payment,
            paymentReceived,
            metroLine,
            metroStation,
            deliveryDay,
            deliveryTime,
            deliveryTimeEnd,
            meetingPoint: selectedMeetingPoint,
            deliveryCode: deliveryCodeVal,
          }),
        );
      } else if (mode === 'DELIVERY') {
        setSalePhone(qPhone);
        const delLines: string[] = [];
        delLines.push('NUTRIFIT · TU PEDIDO CONFIRMADO');
        delLines.push('─'.repeat(24));
        delLines.push('');
        delLines.push(`Hola ${qName} 👋`);
        delLines.push(`Tu pedido ${order.orderNumber} quedó registrado con envío a domicilio.`);
        delLines.push('');
        delLines.push('*PRODUCTOS:*');
        cart.forEach((l, i) => {
          delLines.push(`${i + 1}. ${l.productName}${l.variantName ? ` (${l.variantName})` : ''} ×${l.quantity}`);
          delLines.push(`   ${formatPrice(l.unitPrice * l.quantity)}`);
        });
        delLines.push('');
        delLines.push('─'.repeat(24));
        delLines.push(`*Subtotal:* ${formatPrice(subtotal)}`);
        if (discountAmount) delLines.push(`*Descuento:* -${formatPrice(discountAmount)}`);
        delLines.push(`*Envío:* ${shippingCost > 0 ? formatPrice(shippingCost) : 'GRATIS'}`);
        delLines.push(`*TOTAL:* ${formatPrice(total)}`);
        delLines.push(`*Pago:* ${PAYMENT_LABELS[payment] ?? payment}${paidNow ? ' · RECIBIDO' : ' · CONTRA ENTREGA'}`);
        delLines.push('');
        delLines.push('*ENVÍO A DOMICILIO:*');
        delLines.push(`📅 ${deliveryDay}`);
        delLines.push(`⏰ ${formatTime12(deliveryTime)}`);
        delLines.push(`🏠 ${deliveryAddress}`);
        delLines.push('');
        delLines.push('¡Te esperamos! Gracias por entrenar con confianza 💪');
        delLines.push(webFooter());
        setSaleMsg(delLines.join('\n'));
      }
      resetSaleForm();
      await load(false);
    } catch (err: any) {
      if (handleAuthError(err, onLogout)) return;
      toast.error(err?.message || 'Error al cobrar. Verifica la conexion y vuelve a intentar.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const copyMessage = async () => {
    if (!saleMsg) return;
    try {
      await navigator.clipboard.writeText(saleMsg);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar. Copia el mensaje manualmente.');
    }
  };

  const copyReceipt = async () => {
    if (!receipt) return;
    try {
      await navigator.clipboard.writeText(receiptText(receipt));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar la boleta.');
    }
  };

  const printReceipt = () => {
    if (!receipt) return;
    const receiptEl = document.getElementById('pos-receipt-area');
    if (!receiptEl) { window.print(); return; }
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) { window.print(); return; }
    printWindow.document.write(`<html><head><title>Boleta ${receipt.orderNumber}</title><style>
      body{font-family:monospace;font-size:12px;padding:16px;max-width:300px;margin:0 auto}
      .flex{display:flex}.justify-between{justify-content:space-between}.items-center{align-items:center}
      .gap-2{gap:8px}.mt-3{margin-top:12px}.mt-1{margin-top:4px}.mb-2{margin-bottom:8px}
      .text-xs{font-size:11px}.text-sm{font-size:13px}.font-bold{font-weight:700}.font-semibold{font-weight:600}
      .uppercase{text-transform:uppercase}.text-center{text-align:center}.border-t{border-top:1px dashed #ccc;padding-top:8px}
      .truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    </style></head><body>${receiptEl.innerHTML}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  // Metro schedule picker (spec §4.7.1): fixed 30-min window chips, 8 AM – 10 PM.
  // Selecting a chip IS the confirmation — no extra confirm step.
  const renderMetroSchedule = () => {
    const base: TimeSlot[] =
      slots.length > 0
        ? slots
        : TIME_SLOTS.map((t) => ({ start: t, end: computeEndTime(t), available: true }));
    const period = TIME_PERIODS[timePeriod];
    const inPeriod = base.filter((s) => {
      const h = parseInt(s.start.split(':')[0], 10);
      return h >= period.start && h < period.end;
    });
    return (
      <div className="space-y-2">
        <input
          type="date"
          value={deliveryDay}
          min={todayISO()}
          onChange={(e) => setDeliveryDay(e.target.value)}
          className="ds-input"
          aria-label="Fecha de entrega"
        />
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {(Object.keys(TIME_PERIODS) as (keyof typeof TIME_PERIODS)[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTimePeriod(k)}
              className={`ds-chip ${timePeriod === k ? 'ds-chip-active' : ''}`}
            >
              {TIME_PERIODS[k].label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {inPeriod.map((s) => (
            <button
              key={s.start}
              type="button"
              disabled={!s.available}
              onClick={() => {
                setDeliveryTime(s.start);
                setDeliveryTimeEnd(s.end);
              }}
              className={`ds-chip justify-center ${deliveryTime === s.start ? 'ds-chip-active' : ''}`}
            >
              {formatTime12(s.start)}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="container-px py-3 sm:py-4 lg:py-5 pt-safe" style={{ touchAction: 'manipulation' }}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="section-label text-[10px] sm:text-xs">PUNTO DE VENTA</p>
          <h1 className="mt-0.5 font-display text-lg sm:text-xl tracking-wide">
            {mode === 'LOCAL' ? 'Cobrar en local' : 'Venta con entrega en metro'}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
          <div className="flex overflow-hidden rounded-full border border-line bg-paper">
            <button
              onClick={() => { setMode('LOCAL'); setShippingInput(0); setPaymentReceived(true); }}
              className={`flex items-center gap-1 px-2.5 py-1.5 font-bold transition sm:px-3 ${mode === 'LOCAL' ? 'bg-ink text-paper' : 'text-muted'}`}
            >
              <Store size={13} /> <span className="hidden sm:inline">Local</span>
            </button>
            <button
              onClick={() => { setMode('METRO'); setShippingInput(1000); setPaymentReceived(false); }}
              className={`flex items-center gap-1 px-2.5 py-1.5 font-bold transition sm:px-3 ${mode === 'METRO' ? 'bg-ink text-paper' : 'text-muted'}`}
            >
              <CalendarDays size={13} /> <span className="hidden sm:inline">Metro</span>
            </button>
            <button
              onClick={() => { setMode('DELIVERY'); setShippingInput(1000); setPaymentReceived(false); setQuickSale(false); }}
              className={`flex items-center gap-1 px-2.5 py-1.5 font-bold transition sm:px-3 ${mode === 'DELIVERY' ? 'bg-ink text-paper' : 'text-muted'}`}
            >
              🏠 <span className="hidden sm:inline">Domicilio</span>
            </button>
          </div>
          <button
            onClick={() => { if (mode !== 'DELIVERY') setQuickSale((v) => !v); }}
            disabled={mode === 'DELIVERY'}
            title={mode === 'DELIVERY' ? 'No disponible en envío a domicilio' : 'Oculta datos no esenciales'}
            className={`flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-bold transition disabled:opacity-40 ${quickSale ? 'border-ink bg-ink text-paper' : 'border-line bg-paper text-muted'}`}
          >
            <Zap size={13} /> Rápida
          </button>
          {cash?.status === 'OPEN' ? (
            <span className="chip border-emerald-300 bg-emerald-100 text-emerald-800 text-[11px]">Caja abierta</span>
          ) : (
            <button onClick={openRegister} className="btn-accent px-2.5 py-1 text-xs">
              Abrir caja
            </button>
          )}
          <button
            onClick={() => setShowCash((v) => !v)}
            className={`btn-outline px-2.5 py-1 text-xs ${showCash ? 'border-ink bg-ink text-paper' : ''}`}
          >
            <Wallet size={12} /> {showCash ? 'Ocultar' : 'Caja'}
          </button>
          <button onClick={onLogout} className="btn-outline px-2.5 py-1 text-xs">
            Salir
          </button>
        </div>
      </div>

      {quickSale && (
        <div className="mt-2 flex items-center gap-2 rounded-xl bg-[var(--accent-bg)] px-3 py-2 text-[13px] font-medium text-[var(--accent-text)]">
          <Zap size={14} className="shrink-0" />
          Venta rápida activa{mode === 'LOCAL' ? ': sin datos de cliente.' : ': nombre y teléfono opcionales.'}
        </div>
      )}

      {showCash && (
        <div className="mt-3 rounded-xl border border-line bg-paper p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 font-display text-lg uppercase">
              <Wallet size={18} className="text-accent" /> Resumen de caja del día
            </p>
            <div className="flex items-center gap-2">
              {cash?.status === 'OPEN' ? (
                <span className="chip border-emerald-300 bg-emerald-100 text-emerald-800">
                  Caja abierta{cash.initialAmount > 0 ? ` · apertura ${formatPrice(cash.initialAmount)}` : ''}
                </span>
              ) : (
                <span className="chip border-red-200 bg-red-50 text-red-700">Caja cerrada</span>
              )}
              <button onClick={loadReport} disabled={reportLoading} className="btn-outline px-4 py-2 text-xs">
                <RefreshCw size={13} /> Actualizar
              </button>
            </div>
          </div>

          {reportLoading && !report ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted">
              <RefreshCw size={14} className="animate-spin" /> Cargando resumen…
            </div>
          ) : !report ? (
            <p className="py-8 text-center text-sm text-muted">Sin datos por ahora. Pulsa Actualizar.</p>
          ) : (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-line bg-soft/50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">Ventas del día</p>
                  <p className="mt-1 font-display text-xl">{formatPrice(report.totalSales)}</p>
                </div>
                <div className="rounded-2xl border border-line bg-soft/50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">Número de ventas</p>
                  <p className="mt-1 font-display text-xl">{report.orderCount}</p>
                </div>
                <div className="rounded-2xl border border-line bg-soft/50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">Utilidad</p>
                  <p className="mt-1 font-display text-xl text-emerald-600">{formatPrice(report.totalProfit)}</p>
                </div>
                <div className="rounded-2xl border border-line bg-soft/50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">Ticket promedio</p>
                  <p className="mt-1 font-display text-xl">{formatPrice(report.avgTicket)}</p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-line bg-soft/50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted">Por método de pago</p>
                {report.methods.length > 0 ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {report.methods.map((m) => (
                      <div key={m.method} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-paper px-3 py-2">
                        <span className="text-xs font-semibold">{PAYMENT_LABELS[m.method] ?? m.method}</span>
                        <span className="text-sm font-bold">{formatPrice(m.total)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted">Sin ventas registradas hoy.</p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {receipt && (
        <div className="mt-3 rounded-xl border border-line bg-paper p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 font-display text-lg uppercase">
              <Receipt size={18} className="text-accent" /> Boleta {receipt.orderNumber}
            </p>
            <div className="flex gap-2">
              <button onClick={copyReceipt} className="btn-outline px-4 py-2 text-xs">
                <Copy size={13} /> {copied ? '¡Copiado!' : 'Copiar'}
              </button>
              <button
                onClick={() => openWhatsApp(receipt.customerPhone, receiptText(receipt))}
                className="btn-outline px-4 py-2 text-xs text-emerald-600 hover:border-emerald-300"
              >
                <MessageCircle size={13} /> WhatsApp
              </button>
              <button onClick={printReceipt} className="btn-outline px-4 py-2 text-xs">
                <Printer size={13} /> Imprimir
              </button>
              <button onClick={() => setReceipt(null)} className="btn-accent px-4 py-2 text-xs">
                <X size={13} /> Cerrar
              </button>
            </div>
          </div>
          <div id="pos-receipt-area" className="mt-4 rounded-2xl border border-line bg-soft/50 p-5">
            <div className="flex items-center justify-between">
              <p className="font-display text-sm uppercase">{STORE_NAME}</p>
              <p className="text-[11px] text-muted">{formatDateTimeShort(receipt.at)}</p>
            </div>
            <p className="mt-0.5 text-xs text-muted">
              Boleta {receipt.orderNumber} · {receipt.customerName}
              {receipt.customerPhone ? ` · ${receipt.customerPhone}` : ''}
            </p>
            <div className="mt-3 space-y-1.5">
              {receipt.lines.map((l, i) => (
                <div key={i} className="flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {l.quantity} × {l.productName}
                    </p>
                    <p className="truncate text-muted">
                      {l.variantName && `${l.variantName} · `}
                      {formatPrice(l.unitPrice)} c/u
                    </p>
                  </div>
                  <span className="shrink-0 font-bold">{formatPrice(l.total)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 border-t border-line pt-2 text-xs">
              <div className="flex justify-between text-muted">
                <span>Subtotal</span>
                <span>{formatPrice(receipt.subtotal)}</span>
              </div>
              {receipt.discount > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Descuento</span>
                  <span>-{formatPrice(receipt.discount)}</span>
                </div>
              )}
              {receipt.shippingCost > 0 && (
                <div className="flex justify-between text-muted">
                  <span>Envío</span>
                  <span>{formatPrice(receipt.shippingCost)}</span>
                </div>
              )}
              <div className="mt-1 flex justify-between text-sm">
                <span className="font-semibold text-muted">Total</span>
                <span className="font-display text-base">{formatPrice(receipt.total)}</span>
              </div>
              <div className="mt-2 space-y-0.5 border-t border-line pt-2">
                <div className="flex justify-between">
                  <span>Pago</span>
                  <span className="font-semibold">
                    {receipt.payment} · {receipt.paid ? 'Pagado' : 'Pendiente (contra entrega)'}
                  </span>
                </div>
                {receipt.pago !== undefined && (
                  <div className="flex justify-between">
                    <span>Pagó con</span>
                    <span>{formatPrice(receipt.pago)}</span>
                  </div>
                )}
                {receipt.vuelto !== undefined && (
                  <div className="flex justify-between">
                    <span>Vuelto</span>
                    <span className="font-bold text-emerald-600">{formatPrice(receipt.vuelto)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {saleMsg && salePhone && (
        <div className="mt-3 rounded-xl border border-accent/30 bg-paper p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 font-display text-lg uppercase tracking-wide text-ink">
              <MessageCircle size={18} className="text-emerald-600" />
              Mensaje para el cliente (WhatsApp)
            </p>
            <div className="flex gap-2">
              <button onClick={copyMessage} className="btn-outline px-4 py-2 text-xs">
                <Copy size={13} /> {copied ? '¡Copiado!' : 'Copiar'}
              </button>
              <button
                onClick={() => openWhatsApp(salePhone, saleMsg)}
                className="btn-accent px-4 py-2 text-xs"
              >
                <MessageCircle size={13} /> Enviar por WhatsApp
              </button>
            </div>
          </div>
          <pre className="mt-3 max-h-80 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-line bg-soft/50 p-4 font-mono text-xs leading-relaxed text-ink">
            {saleMsg}
          </pre>
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px]">
        <div>
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar producto o SKU… (F1 · F2 cliente · F3 pausar)"
              className="input pl-10 pr-9"
            />
            {query.length > 0 && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition">
                <X size={15} />
              </button>
            )}
          </div>
          {!loading && (
            <p className="mt-2 text-[13px] font-medium text-[var(--text-secondary)]">
              {filtered.length} disponible{filtered.length === 1 ? '' : 's'}
              {query.trim() ? ` para “${query.trim()}”` : ''}
            </p>
          )}
          {loading ? (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="skeleton h-28 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filtered.map((p) => {
                const variants = p.variants?.filter((v) => v.active) || [];
                const list = variants.length > 0 ? variants : [{ id: null as string | null, name: '', sku: p.sku || '', price: p.price, stock: p.stock ?? 999 }];
                const outOfStock = list.length > 0 && list.every((v: any) => v.stock != null && v.stock <= 0);
                return (
                  <div key={p.id} className={`ds-card p-[14px] transition hover:shadow-sm ${outOfStock ? 'ds-card-action-danger' : ''}`}>
                    <p className="line-clamp-2 min-h-[2.5em] text-[14px] font-medium leading-snug text-ink">{p.name}</p>
                    {outOfStock ? (
                      <span className="ds-badge ds-badge-danger mt-1">agotado</span>
                    ) : (
                      <p className="mt-0.5 truncate text-[13px] text-[var(--text-secondary)]">{p.brand?.name || ' '}</p>
                    )}
                    <div className="mt-1.5 space-y-1">
                      {list.map((v: any) => (
                        <button
                          key={v.id ?? p.id}
                          onClick={() => addToCart(p, v.id)}
                          disabled={v.stock != null && v.stock <= 0}
                          className="flex w-full items-center justify-between rounded-lg border border-line bg-soft/30 px-2 py-1.5 text-left transition hover:border-accent active:scale-[0.98] disabled:opacity-40"
                        >
                          <span className="truncate text-xs font-medium">
                            {v.name || 'Sin variante'}
                            {v.stock != null && v.stock <= 0 ? (
                              <span className="ds-badge ds-badge-danger ml-1">Sin stock</span>
                            ) : (
                              <span className="ml-1 text-[10px] font-normal text-muted">({Math.max(0, v.stock ?? 0)})</span>
                            )}
                          </span>
                          <span className={`ml-2 shrink-0 text-sm font-medium tabular-nums ${outOfStock ? 'text-muted' : 'text-accent'}`}>{formatPrice(v.price)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && <p className="py-10 text-center text-sm text-muted">Sin resultados.</p>}
            </div>
          )}
        </div>

        <div ref={cartRef} className="hidden lg:block h-fit max-h-[80vh] overflow-y-auto rounded-xl border border-line bg-paper p-4 lg:sticky lg:top-4">
          <p className="flex items-center gap-2 font-display text-lg uppercase">
            <ShoppingCart size={18} /> Venta{receipt ? ` ${receipt.orderNumber}` : ''}
          </p>
          {cart.length > 0 && (
            <div className="mt-3 flex items-center justify-between rounded-xl bg-soft/70 px-3 py-2">
              <span className="text-xs font-semibold text-muted">{cart.reduce((s, l) => s + l.quantity, 0)} items</span>
              <span className="text-lg font-bold tabular-nums">{formatPrice(total)}</span>
            </div>
          )}
          <div className="mt-1.5 max-h-[35vh] space-y-1 overflow-y-auto">
            {cart.map((l) => (
              <div key={lineKey(l)} className="flex items-center gap-1 rounded-lg border border-line bg-soft/30 px-2 py-1">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-bold text-ink">{l.productName}</p>
                  {l.variantName && <p className="truncate text-[10px] text-muted">{l.variantName}</p>}
                </div>
                <button onClick={() => setQty(lineKey(l), l.quantity - 1)} className="ds-stepper-btn" aria-label="Quitar uno">
                  <Minus size={12} />
                </button>
                <span className="w-6 text-center text-xs font-medium tabular-nums">{l.quantity}</span>
                <button onClick={() => setQty(lineKey(l), l.quantity + 1)} disabled={l.quantity >= l.stock} className="ds-stepper-btn" aria-label="Agregar uno">
                  <Plus size={12} />
                </button>
                <span className="w-14 text-right text-[11px] font-bold text-accent tabular-nums">{formatPrice(l.unitPrice * l.quantity)}</span>
                <button onClick={() => setQty(lineKey(l), 0)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-red-400 transition hover:bg-red-50 hover:text-red-600 active:scale-95">
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
            {cart.length === 0 && <p className="py-6 text-center text-xs text-muted">Carrito vacío.</p>}
          </div>

          {cart.length > 0 && (
            <div className="mt-3 flex gap-2">
              <button onClick={pauseSale} className="btn-outline flex-1 px-3 py-2 text-xs">
                <Pause size={13} /> Pausar venta
              </button>
              <button onClick={cancelSale} className="btn-outline flex-1 px-3 py-2 text-xs text-red-600 hover:border-red-300">
                <X size={13} /> Cancelar venta
              </button>
            </div>
          )}

          {holds.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted">Ventas en espera</p>
              {holds.map((h, i) => (
                <div key={h.id} className="flex items-center gap-2 rounded-2xl border border-accent/30 bg-accent/5 p-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold">Venta {i + 1} · {formatPrice(h.total)}</p>
                    <p className="truncate text-[11px] text-muted">
                      {h.customerName || 'Sin cliente'} · {h.lines.length} {h.lines.length === 1 ? 'item' : 'items'}
                    </p>
                    {h.lines.length > 0 && (
                      <p className="truncate text-[10px] text-muted/70">
                        {h.lines.slice(0, 2).map((l) => `${l.productName}${l.quantity > 1 ? ` ×${l.quantity}` : ''}`).join(', ')}
                        {h.lines.length > 2 ? ` +${h.lines.length - 2} más` : ''}
                      </p>
                    )}
                  </div>
                  <button onClick={() => resumeHold(h)} title="Retomar venta" className="rounded-full border border-line bg-paper p-1.5 hover:border-accent">
                    <Play size={13} />
                  </button>
                  <button onClick={() => deleteHold(h)} title="Eliminar venta en espera" className="rounded-full p-1.5 text-red-500">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-2 space-y-2">
            {!(quickSale && mode === 'LOCAL') && (
              <>
                <input ref={customerNameRef} value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder={quickSale ? 'Nombre del cliente (opcional)' : 'Nombre del cliente (F2)'} className="input" />
                <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder={quickSale ? 'Teléfono (opcional)' : 'Teléfono (ej: 9 1234 5678)'} inputMode="tel" pattern="[0-9 ]*" maxLength={12} className="input" />
              </>
            )}
            <select value={currentPayOption()} onChange={(e) => applyPayOption(e.target.value as PayOption)} className="input">
              {payOptions().map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {payment === 'MIXTO' && (
              <div className="rounded-2xl border border-line bg-soft/40 p-3 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted">Pago mixto</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-muted">Efectivo ($)</label>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={mixedCash || ''}
                      onChange={(e) => setMixedCash(Math.max(0, Number(e.target.value) || 0))}
                      className="input w-full text-xs mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted">Transferencia ($)</label>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={mixedTransfer || ''}
                      onChange={(e) => setMixedTransfer(Math.max(0, Number(e.target.value) || 0))}
                      className="input w-full text-xs mt-1"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-muted">Total: {formatPrice(mixedCash + mixedTransfer)} / {formatPrice(total)}</p>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-line/30">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${mixedCash + mixedTransfer >= total ? 'bg-emerald-500' : 'bg-amber-400'}`}
                    style={{ width: `${Math.min(100, ((mixedCash + mixedTransfer) / Math.max(total, 1)) * 100)}%` }}
                  />
                </div>
                {mixedCash + mixedTransfer > 0 && mixedCash + mixedTransfer < total && (
                  <p className="text-[10px] font-semibold text-amber-600">Faltan {formatPrice(total - mixedCash - mixedTransfer)}</p>
                )}
              </div>
            )}
          </div>

          {showCashPay && (
            <div className="mt-3 rounded-2xl border border-line bg-soft/40 p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted">
                <Banknote size={13} /> Pago en efectivo
              </p>
              <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {tenders.map((t) => (
                  <button
                    key={t}
                    onClick={() => setPago(t)}
                    className={`min-h-[44px] rounded-full border px-3 py-2 text-xs font-bold transition active:scale-95 ${
                      pago === t ? 'border-ink bg-ink text-paper' : 'border-line bg-paper text-muted hover:border-ink'
                    }`}
                  >
                    {formatPrice(t)}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <label htmlFor="pago-input" className="shrink-0 text-xs font-semibold text-muted">
                  Paga con
                </label>
                <input
                  id="pago-input"
                  type="number"
                  min={0}
                  step={100}
                  value={pago || ''}
                  onChange={(e) => setPago(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0"
                  className="input w-full text-sm"
                />
              </div>
              {cashShort ? (
                <p className="mt-2 text-sm font-bold text-red-500">Faltan {formatPrice(total - pago)}</p>
              ) : (
                pago > 0 && (
                  pago > total
                    ? <p className="mt-2 text-sm font-bold text-emerald-600">Vuelto: {formatPrice(pago - total)}</p>
                    : pago === total && <p className="mt-2 text-sm font-bold text-muted">Pago exacto</p>
                )
              )}
            </div>
          )}

          {mode === 'METRO' && (
            <div className="mt-4 rounded-2xl border border-line bg-soft/40 p-4">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm">🚇</span>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-ink leading-tight">Entrega en metro</p>
                  <p className="text-[11px] text-muted">Retira tu pedido en la estación y horario que elijas</p>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {/* Line selector pills */}
                <div>
                  <p className="text-[10px] font-semibold text-muted mb-1">Línea de metro</p>
                  <div className="flex flex-wrap gap-1.5">
                    {metroLines.map((l) => {
                      const color = LINE_COLORS[l.line] || '#666';
                      const isActive = lineFilter === l.line;
                      return (
                        <button
                          key={l.line}
                          type="button"
                          onClick={() => {
                            setLineFilter(isActive ? null : l.line);
                            setSelectedStationId('');
                            setMetroStation('');
                            setMetroLine('');
                            setSelectedStationCommune('');
                            setSelectedMeetingPoint('');
                            setStationSearch('');
                          }}
                          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border transition ${
                            isActive
                              ? 'text-white border-transparent'
                              : 'border-line bg-paper text-ink hover:bg-soft'
                          }`}
                          style={isActive ? { background: color } : {}}
                        >
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: isActive ? '#fff' : color }}
                          />
                          {l.lineName || l.line}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Station search */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    value={stationSearch}
                    onChange={(e) => { setStationSearch(e.target.value); setSelectedStationId(''); setMetroStation(''); setMetroLine(''); }}
                    onFocus={() => { if (stationResults.length > 0) document.getElementById('station-dropdown')?.classList.add('abierta'); }}
                    placeholder="Buscar estación..."
                    className="input pl-9"
                  />
                  {stationResults.length > 0 && !selectedStationId && (
                    <div id="station-dropdown" className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-line bg-paper shadow-lg">
                      {stationResults.slice(0, 15).map((s) => (
                        <button
                          key={s.id}
                          onClick={() => {
                            setSelectedStationId(s.id);
                            setMetroStation(s.name);
                            setMetroLine(s.line);
                            setSelectedStationCommune(s.commune);
                            setSelectedMeetingPoint(s.defaultMeetingPoint || 'Acceso principal');
                            setStationSearch(s.name);
                            setStationResults([]);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-soft border-b border-line/30 last:border-0"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ background: LINE_COLORS[s.line] || '#666' }}
                          />
                          <span className="font-semibold">{s.name}</span>
                          <span className="text-[11px] text-muted ml-auto">{s.lineName || s.line} · {s.commune}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {stationSearch.length >= 2 && stationResults.length === 0 && !selectedStationId && (
                    <p className="mt-1.5 text-[11px] text-muted">Sin resultados para &ldquo;{stationSearch}&rdquo;</p>
                  )}
                </div>

                {/* Selected station info */}
                {selectedStationId && (
                  <div className="rounded-xl border border-accent/30 bg-accent/5 px-3 py-2">
                    <p className="text-sm font-bold text-ink">{metroStation}</p>
                    <p className="text-xs text-muted">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ background: LINE_COLORS[metroLine] || '#666' }} />
                        {metroLines.find(l => l.line === metroLine)?.lineName || metroLine}
                      </span>
                      {' · '}{selectedStationCommune || '—'}
                    </p>
                  </div>
                )}

                {/* Date */}
                {renderMetroSchedule()}

                {/* Meeting point */}
                {selectedStationId && (
                  <div className="text-[11px] text-muted flex items-center gap-1">
                    📍 Punto de encuentro: <span className="font-semibold">{selectedMeetingPoint}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted">Envío ($)</span>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={shippingInput}
                    onChange={(e) => setShippingInput(Math.max(0, Number(e.target.value) || 0))}
                    className="input w-full text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {mode === 'DELIVERY' && (
            <div className="mt-4 rounded-2xl border border-line bg-soft/40 p-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted">🏠 Envío a Domicilio</p>
              <div className="mt-3 space-y-2">
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Dirección completa (calle, número, comuna)"
                  className="input"
                />
                <input
                  type="date"
                  value={deliveryDay}
                  min={todayISO()}
                  onChange={(e) => setDeliveryDay(e.target.value)}
                  className="input"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    value={deliveryTime}
                    onChange={(e) => { setDeliveryTime(e.target.value); setDeliveryTimeEnd(computeEndTime(e.target.value)); }}
                    className="input"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted">Envío ($)</span>
                    <input
                      type="number"
                      min={0}
                      step={500}
                      value={shippingInput}
                      onChange={(e) => setShippingInput(Math.max(0, Number(e.target.value) || 0))}
                      className="input w-full text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {cart.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Descuento</p>
                <div className="flex rounded-full border border-line">
                  <button
                    onClick={() => { setDiscountMode('percent'); setDiscountAmountInput(0); }}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition ${discountMode === 'percent' ? 'bg-ink text-white' : 'text-muted'}`}
                  >
                    %
                  </button>
                  <button
                    onClick={() => { setDiscountMode('amount'); setDiscountPct(0); }}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition ${discountMode === 'amount' ? 'bg-ink text-white' : 'text-muted'}`}
                  >
                    $
                  </button>
                </div>
              </div>
              {discountMode === 'percent' ? (
                <div className="mt-2 grid grid-cols-5 gap-1.5">
                  {[0, 5, 10, 15, 20].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setDiscountPct(pct)}
                      className={`min-h-[44px] rounded-full border px-2 py-2 text-xs font-bold transition active:scale-95 ${discountPct === pct ? 'border-ink bg-ink text-paper' : 'border-line bg-paper text-muted hover:border-ink'}`}
                    >
                      {pct === 0 ? '0%' : `-${pct}%`}
                    </button>
                  ))}
                </div>
              ) : (
                  <>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm font-bold text-muted">$</span>
                  <input
                    type="number"
                    min={0}
                    max={subtotal}
                    step={100}
                    value={discountAmountInput || ''}
                    onChange={(e) => setDiscountAmountInput(Math.min(subtotal, Math.max(0, Number(e.target.value) || 0)))}
                    placeholder="0"
                    className="input w-full text-sm"
                  />
                  <button
                    onClick={() => setDiscountAmountInput(0)}
                    className="shrink-0 rounded-full border border-line px-2 py-1 text-[10px] font-bold text-muted hover:border-ink hover:text-ink"
                  >
                    Limpiar
                  </button>
                </div>
                <p className="mt-1 text-[10px] text-muted">Máximo: {formatPrice(subtotal)}</p>
                </>
              )}
            </div>
          )}

          <div className="mt-3 border-t border-line pt-3 text-sm">
            <div className="flex justify-between text-muted">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-red-500">
                <span>Descuento ({discountMode === 'percent' ? `-${discountPct}%` : `-${formatPrice(discountAmount)}`})</span>
                <span>-{formatPrice(discountAmount)}</span>
              </div>
            )}
            {shippingCost > 0 && (
              <div className="flex justify-between text-muted">
                <span>Envío (metro)</span>
                <span>{formatPrice(shippingCost)}</span>
              </div>
            )}
            <div className="mt-2 flex items-center justify-between rounded-lg bg-ink px-3 py-2">
              <span className="text-sm font-semibold text-paper/70">Total</span>
              <span className="text-xl font-bold text-paper tabular-nums">{formatPrice(total)}</span>
            </div>
          </div>
          <button
            onClick={checkout}
            disabled={saving || cart.length === 0 || (showCashPay && cashShort)}
            className={`ds-btn-primary mt-2 w-full py-2.5 text-sm uppercase tracking-wide ${showCashPay && cashShort ? 'bg-red-500 text-white' : ''}`}
          >
            {saving
              ? 'Procesando…'
              : mode === 'METRO'
                ? paymentReceived
                  ? `Cobrar ${formatPrice(total)} y registrar`
                  : 'Registrar venta (pago contra entrega)'
                : mode === 'DELIVERY'
                ? paymentReceived
                  ? `Cobrar ${formatPrice(total)} y registrar`
                  : 'Registrar venta (envío a domicilio)'
                : showCashPay
                  ? `Cobrar ${formatPrice(total)}`
                  : 'Cobrar'}
          </button>
          {showCashPay && cashShort && (
            <p className="mt-2 text-center text-xs font-semibold text-red-500">
              Faltan {formatPrice(total - pago)} para completar el pago en efectivo.
            </p>
          )}
        </div>
      </div>

      {/* Mobile floating cart bar */}
      {cart.length > 0 && !showMobileCart && (
        <button
          onClick={() => setShowMobileCart(true)}
          className="fixed left-0 right-0 z-50 mx-3 flex items-center justify-between rounded-xl border border-ink bg-ink px-4 py-3 text-sm font-bold text-paper shadow-lg transition active:scale-[0.98] lg:hidden"
          style={{ bottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center gap-2">
            <ShoppingCart size={16} />
            <span>{cart.reduce((s, l) => s + l.quantity, 0)} items</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-display text-lg">{formatPrice(total)}</span>
            <span className="rounded-full bg-paper/20 px-3 py-1 text-xs font-bold">Ver carrito</span>
          </div>
        </button>
      )}

      {/* Mobile cart drawer */}
      {showMobileCart && (
        <div className="fixed inset-0 z-50 lg:hidden" style={{ touchAction: 'manipulation' }}>
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowMobileCart(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-2xl bg-paper shadow-xl" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper px-4 py-3">
              <p className="flex items-center gap-2 font-display text-base uppercase">
                <ShoppingCart size={16} /> Venta
              </p>
              <button onClick={() => setShowMobileCart(false)} className="rounded-full border border-line p-1.5">
                <X size={16} />
              </button>
            </div>

            <div className="px-4 py-3">
              {/* Cart items */}
              <div className="max-h-[25vh] space-y-1 overflow-y-auto">
                {cart.map((l) => (
                  <div key={lineKey(l)} className="flex items-center gap-1.5 rounded-lg border border-line bg-soft/30 px-2.5 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-ink">{l.productName}</p>
                      {l.variantName && <p className="truncate text-[11px] text-muted">{l.variantName}</p>}
                    </div>
                    <button onClick={() => setQty(lineKey(l), l.quantity - 1)} className="ds-stepper-btn" aria-label="Quitar uno">
                      <Minus size={12} />
                    </button>
                    <span className="w-7 text-center text-sm font-medium tabular-nums">{l.quantity}</span>
                    <button onClick={() => setQty(lineKey(l), l.quantity + 1)} disabled={l.quantity >= l.stock} className="ds-stepper-btn" aria-label="Agregar uno">
                      <Plus size={12} />
                    </button>
                    <span className="w-16 text-right text-xs font-bold text-accent tabular-nums">{formatPrice(l.unitPrice * l.quantity)}</span>
                    <button onClick={() => setQty(lineKey(l), 0)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-red-400 transition hover:bg-red-50 hover:text-red-600 active:scale-95">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                {cart.length === 0 && <p className="py-8 text-center text-sm text-muted">Carrito vacío.</p>}
              </div>

              {cart.length > 0 && (
                <div className="mt-2 flex gap-2">
                  <button onClick={pauseSale} className="btn-outline flex-1 px-3 py-2 text-xs">
                    <Pause size={12} /> Pausar
                  </button>
                  <button onClick={cancelSale} className="btn-outline flex-1 px-3 py-2 text-xs text-red-600 hover:border-red-300">
                    <X size={12} /> Cancelar
                  </button>
                </div>
              )}

              {/* Holds */}
              {holds.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted">Ventas en espera</p>
                  {holds.map((h, i) => (
                    <div key={h.id} className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/5 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold">Venta {i + 1} · {formatPrice(h.total)}</p>
                        <p className="truncate text-[11px] text-muted">{h.customerName || 'Sin cliente'} · {h.lines.length} items</p>
                      </div>
                      <button onClick={() => resumeHold(h)} className="rounded-full border border-line bg-paper p-1.5"><Play size={12} /></button>
                      <button onClick={() => deleteHold(h)} className="rounded-full p-1.5 text-red-500"><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
              )}

              {/* Customer */}
              <div className="mt-3 space-y-2">
                {!(quickSale && mode === 'LOCAL') && (
                  <>
                    <input ref={customerNameRef} value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder={quickSale ? 'Nombre del cliente (opcional)' : 'Nombre del cliente'} className="input" />
                    <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder={quickSale ? 'Teléfono (opcional)' : 'Teléfono (ej: 9 1234 5678)'} inputMode="tel" pattern="[0-9 ]*" maxLength={12} className="input" />
                  </>
                )}
                <select value={currentPayOption()} onChange={(e) => applyPayOption(e.target.value as PayOption)} className="input">
                  {payOptions().map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {payment === 'MIXTO' && (
                  <div className="rounded-xl border border-line bg-soft/40 p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-muted">Efectivo ($)</label>
                        <input type="number" min={0} step={100} value={mixedCash || ''} onChange={(e) => setMixedCash(Math.max(0, Number(e.target.value) || 0))} className="input w-full text-xs mt-1" />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted">Transferencia ($)</label>
                        <input type="number" min={0} step={100} value={mixedTransfer || ''} onChange={(e) => setMixedTransfer(Math.max(0, Number(e.target.value) || 0))} className="input w-full text-xs mt-1" />
                      </div>
                    </div>
                    <p className="text-[11px] text-muted">Total: {formatPrice(mixedCash + mixedTransfer)} / {formatPrice(total)}</p>
                  </div>
                )}
              </div>

              {/* Cash payment (LOCAL) */}
              {showCashPay && (
                <div className="mt-3 rounded-xl border border-line bg-soft/40 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted">
                    <Banknote size={12} /> Pago en efectivo
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {tenders.map((t) => (
                      <button key={t} onClick={() => setPago(t)} className={`min-h-[44px] rounded-full border px-2 py-2 text-xs font-bold transition active:scale-95 ${pago === t ? 'border-ink bg-ink text-paper' : 'border-line bg-paper text-muted hover:border-ink'}`}>
                        {formatPrice(t)}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="shrink-0 text-xs font-semibold text-muted">Paga con</span>
                    <input id="pago-input-m" type="number" min={0} step={100} value={pago || ''} onChange={(e) => setPago(Math.max(0, Number(e.target.value) || 0))} placeholder="0" className="input w-full text-sm" />
                  </div>
                  {cashShort ? (
                    <p className="mt-1.5 text-sm font-bold text-red-500">Faltan {formatPrice(total - pago)}</p>
                  ) : (
                    pago > 0 && (
                      pago > total
                        ? <p className="mt-1.5 text-sm font-bold text-emerald-600">Vuelto: {formatPrice(pago - total)}</p>
                        : pago === total && <p className="mt-1.5 text-sm font-bold text-muted">Pago exacto</p>
                    )
                  )}
                </div>
              )}

              {/* Metro / Delivery options (mobile) */}
              {mode === 'METRO' && (
                <div className="mt-3 rounded-xl border border-line bg-soft/40 p-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted mb-2">🚇 Entrega en metro</p>
                  <div className="space-y-2">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                      <input type="text" value={stationSearch} onChange={(e) => { setStationSearch(e.target.value); setSelectedStationId(''); setMetroStation(''); setMetroLine(''); }} placeholder="Buscar estación..." className="input pl-9" />
                      {stationResults.length > 0 && !selectedStationId && (
                        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-line bg-paper shadow-lg">
                          {stationResults.slice(0, 10).map((s) => (
                            <button key={s.id} onClick={() => { setSelectedStationId(s.id); setMetroStation(s.name); setMetroLine(s.line); setSelectedStationCommune(s.commune); setSelectedMeetingPoint(s.defaultMeetingPoint || 'Acceso principal'); setStationSearch(s.name); setStationResults([]); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-soft border-b border-line/30 last:border-0">
                              <span className="w-2 h-2 rounded-full" style={{ background: LINE_COLORS[s.line] || '#666' }} />
                              <span className="font-semibold">{s.name}</span>
                              <span className="text-[11px] text-muted ml-auto">{s.commune}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedStationId && (
                      <div className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-1.5">
                        <p className="text-sm font-bold">{metroStation}</p>
                      </div>
                    )}
                    {renderMetroSchedule()}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted">Envío ($)</span>
                      <input type="number" min={0} step={500} value={shippingInput} onChange={(e) => setShippingInput(Math.max(0, Number(e.target.value) || 0))} className="input w-full text-sm" />
                    </div>
                  </div>
                </div>
              )}

              {mode === 'DELIVERY' && (
                <div className="mt-3 rounded-xl border border-line bg-soft/40 p-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted mb-2">🏠 Envío a Domicilio</p>
                  <div className="space-y-2">
                    <input type="text" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="Dirección completa" className="input" />
                    <input type="date" value={deliveryDay} min={todayISO()} onChange={(e) => setDeliveryDay(e.target.value)} className="input" />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="time" value={deliveryTime} onChange={(e) => { setDeliveryTime(e.target.value); setDeliveryTimeEnd(computeEndTime(e.target.value)); }} className="input" />
                      <input type="number" min={0} step={500} value={shippingInput} onChange={(e) => setShippingInput(Math.max(0, Number(e.target.value) || 0))} placeholder="Envío $" className="input text-sm" />
                    </div>
                  </div>
                </div>
              )}

              {/* Discount */}
              {cart.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted">Descuento</p>
                    <div className="flex rounded-full border border-line">
                      <button onClick={() => { setDiscountMode('percent'); setDiscountAmountInput(0); }} className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold transition ${discountMode === 'percent' ? 'bg-ink text-white' : 'text-muted'}`}>%</button>
                      <button onClick={() => { setDiscountMode('amount'); setDiscountPct(0); }} className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold transition ${discountMode === 'amount' ? 'bg-ink text-white' : 'text-muted'}`}>$</button>
                    </div>
                  </div>
                  {discountMode === 'percent' ? (
                    <div className="mt-2 grid grid-cols-5 gap-1.5">
                      {[0, 5, 10, 15, 20].map((pct) => (
                        <button key={pct} onClick={() => setDiscountPct(pct)} className={`min-h-[44px] rounded-full border px-2 py-2 text-sm font-bold transition active:scale-95 ${discountPct === pct ? 'border-ink bg-ink text-paper' : 'border-line bg-paper text-muted hover:border-ink'}`}>
                          {pct === 0 ? '0%' : `-${pct}%`}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-sm font-bold text-muted">$</span>
                      <input type="number" min={0} max={subtotal} step={100} value={discountAmountInput || ''} onChange={(e) => setDiscountAmountInput(Math.min(subtotal, Math.max(0, Number(e.target.value) || 0)))} placeholder="0" className="input w-full text-sm" />
                    </div>
                  )}
                </div>
              )}

              {/* Totals + Checkout */}
              {cart.length > 0 && (
                <div className="mt-3 border-t border-line pt-3">
                  <div className="flex justify-between text-sm text-muted">
                    <span>Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-red-500">
                      <span>Descuento</span>
                      <span>-{formatPrice(discountAmount)}</span>
                    </div>
                  )}
                  {shippingCost > 0 && (
                    <div className="flex justify-between text-sm text-muted">
                      <span>Envío</span>
                      <span>{formatPrice(shippingCost)}</span>
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-between rounded-lg bg-ink px-4 py-2">
                    <span className="text-sm font-semibold text-paper/70">Total</span>
                    <span className="text-2xl font-bold text-paper tabular-nums">{formatPrice(total)}</span>
                  </div>
                  <button
                    onClick={async () => { await checkout(); if (cart.length === 0 || receipt) setShowMobileCart(false); }}
                    disabled={saving || cart.length === 0 || (showCashPay && cashShort)}
                    className={`ds-btn-primary mt-3 w-full py-3 text-base uppercase tracking-wide ${showCashPay && cashShort ? 'bg-red-500 text-white' : ''}`}
                  >
                    {saving ? 'Procesando…' : `Cobrar ${formatPrice(total)}`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}