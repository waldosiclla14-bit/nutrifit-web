'use client';

import { useState } from 'react';
import {
  Truck,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  FileText,
  DollarSign,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/feedback';

interface Supplier {
  id: string;
  name: string;
  rut?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  city?: string;
  paymentTerms: 'CONTADO' | 'CREDITO';
  productCount: number;
  lastPurchaseDate?: string;
  isActive: boolean;
}

const SAMPLE_SUPPLIERS: Supplier[] = [
  {
    id: 's-1',
    name: 'Eco Naturales Chile SpA',
    rut: '76.845.123-4',
    contactPerson: 'Cristóbal Valenzuela',
    phone: '+56988776655',
    email: 'contacto@econaturales.cl',
    city: 'Santiago',
    paymentTerms: 'CONTADO',
    productCount: 8,
    lastPurchaseDate: '15/09/2026',
    isActive: true,
  },
  {
    id: 's-2',
    name: 'FullEnergic Nutrition',
    rut: '77.123.456-K',
    contactPerson: 'Lorena Silva',
    phone: '+56977665544',
    email: 'ventas@fullenergic.cl',
    city: 'Santiago',
    paymentTerms: 'CREDITO',
    productCount: 14,
    lastPurchaseDate: '10/09/2026',
    isActive: true,
  },
  {
    id: 's-3',
    name: 'NutriSupps Distribuidora',
    rut: '76.998.776-1',
    contactPerson: 'Felipe Araya',
    phone: '+56966554433',
    email: 'faraya@nutrisupps.cl',
    city: 'Valparaíso',
    paymentTerms: 'CONTADO',
    productCount: 10,
    lastPurchaseDate: '02/09/2026',
    isActive: true,
  },
];

export function Proveedores({ token }: { token: string }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>(SAMPLE_SUPPLIERS);
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);

  const [name, setName] = useState('');
  const [rut, setRut] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [paymentTerms, setPaymentTerms] = useState<'CONTADO' | 'CREDITO'>('CONTADO');

  const filtered = suppliers.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || (s.rut && s.rut.toLowerCase().includes(q)) || (s.contactPerson && s.contactPerson.toLowerCase().includes(q));
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('El nombre del proveedor es obligatorio');
      return;
    }

    const newS: Supplier = {
      id: `s-${Date.now()}`,
      name: name.trim(),
      rut: rut.trim() || undefined,
      contactPerson: contact.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      paymentTerms,
      productCount: 0,
      isActive: true,
    };

    setSuppliers([newS, ...suppliers]);
    setShowNewModal(false);
    setName('');
    setRut('');
    setContact('');
    setPhone('');
    setEmail('');
    toast.success(`Proveedor ${newS.name} creado exitosamente`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sport-green/15 text-sport-green">
              <Truck size={16} />
            </span>
            <h2 className="font-display text-xl tracking-wide uppercase">Directorio de Proveedores</h2>
          </div>
          <p className="text-xs text-muted">Gestión de proveedores, acuerdos comerciales, condiciones de pago y compras asociadas.</p>
        </div>
        <Button onClick={() => setShowNewModal(true)} size="sm" className="bg-sport-green text-black font-extrabold hover:bg-sport-greenLight">
          <Plus size={14} /> Nuevo Proveedor
        </Button>
      </div>

      <div className="rounded-2xl border border-line bg-paper p-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Buscar por nombre, RUT, contacto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-3 text-xs text-ink placeholder:text-muted focus:border-sport-green focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((s) => (
          <div key={s.id} className="rounded-3xl border border-line bg-paper p-5 shadow-sm space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-base tracking-wide text-ink">{s.name}</h3>
                {s.rut && <p className="text-[11px] font-mono text-muted">{s.rut}</p>}
              </div>
              <span className="rounded-full bg-surface px-2.5 py-1 text-[10px] font-black text-muted">
                {s.paymentTerms}
              </span>
            </div>

            <div className="text-xs space-y-1.5 text-muted border-t border-line pt-2.5">
              {s.contactPerson && (
                <p className="flex items-center gap-2">
                  <span className="font-bold text-ink">{s.contactPerson}</span>
                </p>
              )}
              {s.phone && (
                <p className="flex items-center gap-2">
                  <Phone size={12} className="text-sport-green" />
                  <a href={`tel:${s.phone}`} className="hover:text-ink">{s.phone}</a>
                </p>
              )}
              {s.email && (
                <p className="flex items-center gap-2">
                  <Mail size={12} className="text-sport-green" />
                  <a href={`mailto:${s.email}`} className="hover:text-ink">{s.email}</a>
                </p>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted border-t border-line pt-2">
              <span>{s.productCount} productos</span>
              {s.lastPurchaseDate && <span>Última compra: <strong className="text-ink">{s.lastPurchaseDate}</strong></span>}
            </div>
          </div>
        ))}
      </div>

      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-line bg-paper p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-display text-base tracking-wide uppercase text-ink">Nuevo Proveedor</h3>
              <button onClick={() => setShowNewModal(false)} className="text-muted hover:text-ink text-sm">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-muted mb-1">Nombre Comercial / Razón Social *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Eco Naturales Chile SpA"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-muted mb-1">RUT</label>
                  <input
                    type="text"
                    placeholder="76.xxx.xxx-x"
                    value={rut}
                    onChange={(e) => setRut(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-muted mb-1">Término de Pago</label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value as any)}
                    className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink"
                  >
                    <option value="CONTADO">Contado</option>
                    <option value="CREDITO">Crédito 30 días</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold text-muted mb-1">Persona de Contacto</label>
                <input
                  type="text"
                  placeholder="Nombre y apellido"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-muted mb-1">Teléfono</label>
                  <input
                    type="text"
                    placeholder="+569..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink"
                  />
                </div>
                <div>
                  <label className="block font-bold text-muted mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="contacto@..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowNewModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-sport-green text-black font-bold">
                  Guardar Proveedor
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
