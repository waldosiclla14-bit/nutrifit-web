'use client';

import { useState } from 'react';
import {
  Boxes,
  LayoutDashboard,
  MoreHorizontal,
  ShoppingBag,
  ShoppingCart,
  X,
  LifeBuoy,
  Users,
  Megaphone,
  Bot,
  Truck,
  Settings,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export type AdminTabKey =
  | 'resumen'
  | 'ordenes'
  | 'entregas'
  | 'calendario'
  | 'productos'
  | 'inventario'
  | 'compras'
  | 'proveedores'
  | 'clientes'
  | 'caja'
  | 'desk'
  | 'marketing'
  | 'reportes'
  | 'ia'
  | 'configuracion';

const SHEET_KEYS: AdminTabKey[] = [
  'entregas',
  'calendario',
  'productos',
  'proveedores',
  'clientes',
  'caja',
  'desk',
  'marketing',
  'reportes',
  'ia',
  'configuracion',
];

export function AdminBottomNav({
  tabs,
  tab,
  setTab,
}: {
  tabs: { key: AdminTabKey; label: string; icon: any }[];
  tab: AdminTabKey;
  setTab: (t: AdminTabKey) => void;
}) {
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const byKey = new Map(tabs.map((t) => [t.key, t]));
  const inSheet = SHEET_KEYS.includes(tab);

  const pick = (k: AdminTabKey) => {
    setTab(k);
    setMoreOpen(false);
    window.scrollTo({ top: 0 });
  };

  const itemCls = (active: boolean) =>
    `flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-[10px] font-bold transition ${
      active ? 'text-ink' : 'text-muted'
    }`;

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-safe backdrop-blur lg:hidden">
        <div className="flex items-stretch px-1">
          <button type="button" onClick={() => pick('resumen')} className={itemCls(tab === 'resumen')}>
            <LayoutDashboard size={22} className={tab === 'resumen' ? 'text-sport-green' : ''} />
            Inicio
          </button>
          <button type="button" onClick={() => pick('ordenes')} className={itemCls(tab === 'ordenes')}>
            <ShoppingBag size={22} className={tab === 'ordenes' ? 'text-sport-green' : ''} />
            Pedidos
          </button>
          <button
            type="button"
            onClick={() => router.push('/pos')}
            aria-label="Vender en POS"
            className="flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-[10px] font-bold text-muted"
          >
            <span className="flex h-12 w-12 -translate-y-3 items-center justify-center rounded-full bg-sport-green text-black font-extrabold shadow-lg">
              <ShoppingCart size={22} />
            </span>
            Vender
          </button>
          <button type="button" onClick={() => pick('inventario')} className={itemCls(tab === 'inventario')}>
            <Boxes size={22} className={tab === 'inventario' ? 'text-sport-green' : ''} />
            Stock
          </button>
          <button type="button" onClick={() => setMoreOpen(true)} className={itemCls(inSheet)}>
            <MoreHorizontal size={22} className={inSheet ? 'text-sport-green' : ''} />
            Módulos
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-paper p-4 pb-safe shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="mb-3 flex items-center justify-between border-b border-line pb-2">
              <div>
                <p className="font-display text-base uppercase text-ink">NUTRIFIT BUSINESS OS</p>
                <p className="text-[10px] text-muted">Todos los módulos del sistema</p>
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Cerrar"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SHEET_KEYS.map((k) => {
                const t = byKey.get(k);
                if (!t) return null;
                const Icon = t.icon;
                const active = tab === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => pick(k)}
                    className={`flex items-center gap-2.5 rounded-2xl border p-3 text-left transition ${
                      active
                        ? 'border-sport-green bg-sport-green/10 text-ink shadow-sm'
                        : 'border-line bg-surface text-muted hover:border-sport-green hover:text-ink'
                    }`}
                  >
                    <Icon size={16} className={active ? 'text-sport-green' : ''} />
                    <span className="text-xs font-bold">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
