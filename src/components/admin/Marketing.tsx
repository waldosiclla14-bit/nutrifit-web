'use client';

import { useState } from 'react';
import {
  Megaphone,
  Percent,
  Plus,
  Target,
  Send,
  Sparkles,
  Users,
  Copy,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/feedback';

interface Coupon {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  minAmount: number;
  maxUses?: number;
  usedCount: number;
  isActive: boolean;
  expiresAt?: string;
}

const SAMPLE_COUPONS: Coupon[] = [
  {
    id: 'c-1',
    code: 'METROGRATIS',
    type: 'FIXED',
    value: 2500,
    minAmount: 25000,
    maxUses: 100,
    usedCount: 42,
    isActive: true,
  },
  {
    id: 'c-2',
    code: 'CREATINA10',
    type: 'PERCENTAGE',
    value: 10,
    minAmount: 15000,
    usedCount: 18,
    isActive: true,
  },
  {
    id: 'c-3',
    code: 'VIPNUTRIFIT',
    type: 'PERCENTAGE',
    value: 15,
    minAmount: 30000,
    maxUses: 50,
    usedCount: 12,
    isActive: true,
  },
];

const SEGMENTS = [
  { name: 'Clientes VIP (+ $100.000)', count: 24, avgTicket: '$48.500', potential: 'Alta fidelidad' },
  { name: 'Compradores de Creatina', count: 156, avgTicket: '$27.500', potential: 'Recompra cada 60 días' },
  { name: 'Compradores de Proteína', count: 210, avgTicket: '$32.000', potential: 'Recompra cada 30 días' },
  { name: 'Inactivos (+ 45 días)', count: 48, avgTicket: '$25.000', potential: 'Campaña de reactivación' },
];

export function Marketing({ token }: { token: string }) {
  const [coupons, setCoupons] = useState<Coupon[]>(SAMPLE_COUPONS);
  const [showNewCoupon, setShowNewCoupon] = useState(false);
  const [code, setCode] = useState('');
  const [type, setType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [val, setVal] = useState('');
  const [minAmt, setMinAmt] = useState('20000');

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !val) {
      toast.error('Completa los campos del cupón');
      return;
    }

    const newC: Coupon = {
      id: `c-${Date.now()}`,
      code: code.trim().toUpperCase(),
      type,
      value: Number(val),
      minAmount: Number(minAmt) || 0,
      usedCount: 0,
      isActive: true,
    };

    setCoupons([newC, ...coupons]);
    setShowNewCoupon(false);
    setCode('');
    setVal('');
    toast.success(`Cupón ${newC.code} creado exitosamente`);
  };

  const copyCoupon = (c: string) => {
    navigator.clipboard.writeText(c);
    toast.success(`Código ${c} copiado al portapapeles`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sport-green/15 text-sport-green">
              <Megaphone size={16} />
            </span>
            <h2 className="font-display text-xl tracking-wide uppercase">Marketing & Fidelización</h2>
          </div>
          <p className="text-xs text-muted">Gestión de cupones de descuento, segmentación de clientes y promociones WhatsApp.</p>
        </div>
        <Button onClick={() => setShowNewCoupon(true)} size="sm" className="bg-sport-green text-black font-extrabold hover:bg-sport-greenLight">
          <Plus size={14} /> Nuevo Cupón
        </Button>
      </div>

      {/* Segmentos de Audiencia */}
      <div>
        <h3 className="font-display text-sm tracking-wider uppercase text-muted mb-2">Segmentación Inteligente CRM</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SEGMENTS.map((s) => (
            <div key={s.name} className="rounded-2xl border border-line bg-paper p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-extrabold text-muted">
                  {s.count} clientes
                </span>
                <Users size={14} className="text-sport-green" />
              </div>
              <p className="text-xs font-black text-ink">{s.name}</p>
              <div className="flex items-center justify-between text-[11px] text-muted pt-1 border-t border-line">
                <span>Ticket prom: <strong className="text-ink">{s.avgTicket}</strong></span>
                <span className="text-sport-green font-bold">{s.potential}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Listado de Cupones */}
      <div>
        <h3 className="font-display text-sm tracking-wider uppercase text-muted mb-2">Cupones y Descuentos Activos</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {coupons.map((c) => (
            <div key={c.id} className="rounded-2xl border border-line bg-paper p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-black tracking-widest text-sport-green bg-sport-green/10 px-2.5 py-1 rounded-xl">
                    {c.code}
                  </span>
                  <button onClick={() => copyCoupon(c.code)} className="text-muted hover:text-ink">
                    <Copy size={13} />
                  </button>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-extrabold text-emerald-600">
                  Activo
                </span>
              </div>
              <div className="text-xs space-y-1 text-muted">
                <p>Descuento: <strong className="text-ink">{c.type === 'PERCENTAGE' ? `${c.value}%` : `$${c.value.toLocaleString('es-CL')}`}</strong></p>
                <p>Compra mínima: <strong className="text-ink">$${c.minAmount.toLocaleString('es-CL')}</strong></p>
                <p>Usos registrados: <strong className="text-ink">{c.usedCount} {c.maxUses ? `/ ${c.maxUses}` : ''}</strong></p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Coupon Modal */}
      {showNewCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-line bg-paper p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-display text-base tracking-wide uppercase text-ink">Crear Cupón</h3>
              <button onClick={() => setShowNewCoupon(false)} className="text-muted hover:text-ink text-sm">✕</button>
            </div>
            <form onSubmit={handleCreateCoupon} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-muted mb-1">Código del Cupón *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: METROVERANO"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-line bg-surface p-2.5 font-mono font-bold uppercase text-ink"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-muted mb-1">Tipo de Descuento</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink"
                  >
                    <option value="PERCENTAGE">Porcentaje (%)</option>
                    <option value="FIXED">Monto Fijo ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-muted mb-1">Valor *</label>
                  <input
                    type="number"
                    required
                    placeholder={type === 'PERCENTAGE' ? '10' : '2500'}
                    value={val}
                    onChange={(e) => setVal(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-muted mb-1">Monto Mínimo de Compra ($)</label>
                <input
                  type="number"
                  placeholder="20000"
                  value={minAmt}
                  onChange={(e) => setMinAmt(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowNewCoupon(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-sport-green text-black font-bold">
                  Guardar Cupón
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
