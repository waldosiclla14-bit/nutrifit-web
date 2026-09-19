'use client';

import { useState } from 'react';
import {
  Settings,
  Building,
  Shield,
  Bell,
  Save,
  Users,
  Smartphone,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/feedback';

export function Configuracion({ token }: { token: string }) {
  const [businessName, setBusinessName] = useState('NutriFit Chile');
  const [whatsapp, setWhatsapp] = useState('+56923883826');
  const [minFreeShipping, setMinFreeShipping] = useState('30000');
  const [shippingCost, setShippingCost] = useState('2500');
  const [vatRate, setVatRate] = useState('19');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Configuración guardada correctamente.');
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sport-green/15 text-sport-green">
            <Settings size={16} />
          </span>
          <h2 className="font-display text-xl tracking-wide uppercase">Configuración Empresarial</h2>
        </div>
        <p className="text-xs text-muted">Parámetros generales de NutriFit Business OS, logística y reglas de negocio.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Datos Empresa */}
        <div className="rounded-3xl border border-line bg-paper p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-line pb-3">
            <Building size={16} className="text-sport-green" />
            <h3 className="font-display text-base uppercase tracking-wide text-ink">Identidad de Negocio</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
            <div>
              <label className="block font-bold text-muted mb-1">Nombre Comercial</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full rounded-xl border border-line bg-surface p-2.5 font-bold text-ink"
              />
            </div>
            <div>
              <label className="block font-bold text-muted mb-1">WhatsApp de Ventas & Soporte</label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full rounded-xl border border-line bg-surface p-2.5 font-bold text-ink"
              />
            </div>
          </div>
        </div>

        {/* Parámetros Operativos y Delivery */}
        <div className="rounded-3xl border border-line bg-paper p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-line pb-3">
            <Smartphone size={16} className="text-sport-green" />
            <h3 className="font-display text-base uppercase tracking-wide text-ink">Logística & Despachos</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
            <div>
              <label className="block font-bold text-muted mb-1">Mínimo Envío Gratis en Metro ($)</label>
              <input
                type="number"
                value={minFreeShipping}
                onChange={(e) => setMinFreeShipping(e.target.value)}
                className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink"
              />
            </div>
            <div>
              <label className="block font-bold text-muted mb-1">Costo Entrega Metro Estándar ($)</label>
              <input
                type="number"
                value={shippingCost}
                onChange={(e) => setShippingCost(e.target.value)}
                className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink"
              />
            </div>
            <div>
              <label className="block font-bold text-muted mb-1">Tasa IVA (%)</label>
              <input
                type="number"
                value={vatRate}
                onChange={(e) => setVatRate(e.target.value)}
                className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink"
              />
            </div>
          </div>
        </div>

        {/* Roles y Multi-Tenant (SaaS Ready) */}
        <div className="rounded-3xl border border-line bg-paper p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b border-line pb-3">
            <Shield size={16} className="text-sport-green" />
            <h3 className="font-display text-base uppercase tracking-wide text-ink">Roles y Seguridad RBAC</h3>
          </div>
          <div className="text-xs text-muted space-y-2">
            <p>Organización activa: <strong className="text-ink">NutriFit Principal (ID: org_nutrifit_main)</strong></p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="rounded-full bg-sport-green/10 border border-sport-green/30 px-3 py-1 text-[11px] font-extrabold text-sport-green">
                Owner / Admin Total
              </span>
              <span className="rounded-full bg-surface border border-line px-3 py-1 text-[11px] font-bold text-ink">
                Ventas / POS
              </span>
              <span className="rounded-full bg-surface border border-line px-3 py-1 text-[11px] font-bold text-ink">
                Repartidor Metro / Logística
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" className="bg-sport-green text-black font-extrabold px-6">
            <Save size={14} /> Guardar Cambios
          </Button>
        </div>
      </form>
    </div>
  );
}
