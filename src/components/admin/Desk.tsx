'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  LifeBuoy,
  Plus,
  Search,
  Clock,
  AlertCircle,
  CheckCircle2,
  Filter,
  MessageSquare,
  User,
  ShoppingBag,
  Send,
  Tag,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/feedback';

interface Ticket {
  id: string;
  ticketNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  orderNumber?: string;
  category: 'ENTREGA' | 'PAGO' | 'PRODUCTO' | 'CAMBIO' | 'CONSULTA' | 'INCIDENCIA';
  priority: 'ALTA' | 'MEDIA' | 'BAJA' | 'URGENTE';
  status: 'NUEVO' | 'ABIERTO' | 'EN_PROCESO' | 'ESPERANDO_CLIENTE' | 'RESUELTO' | 'CERRADO';
  subject: string;
  description: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  messages: Array<{
    id: string;
    sender: 'SOPORTE' | 'CLIENTE';
    senderName: string;
    text: string;
    timestamp: string;
  }>;
}

const SAMPLE_TICKETS: Ticket[] = [
  {
    id: 't-1',
    ticketNumber: 'NF-1042',
    customerName: 'Juan Morales',
    customerPhone: '+56987654321',
    orderNumber: 'NF-8921',
    category: 'ENTREGA',
    priority: 'ALTA',
    status: 'EN_PROCESO',
    subject: 'Cambio de hora de entrega en Metro Baquedano',
    description: 'El cliente solicita retrasar su entrega de las 14:00 a las 15:30 por motivos laborales.',
    assignedTo: 'Admin',
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    messages: [
      {
        id: 'm-1',
        sender: 'CLIENTE',
        senderName: 'Juan Morales',
        text: 'Hola, tuve un cambio de turno. ¿Puedo retirar a las 15:30 en Baquedano?',
        timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
      },
      {
        id: 'm-2',
        sender: 'SOPORTE',
        senderName: 'Admin NutriFit',
        text: 'Hola Juan, reviso la ruta del repartidor de Línea 1 y te confirmo.',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
    ],
  },
  {
    id: 't-2',
    ticketNumber: 'NF-1043',
    customerName: 'Camila Farías',
    customerPhone: '+56911223344',
    orderNumber: 'NF-8924',
    category: 'PRODUCTO',
    priority: 'MEDIA',
    status: 'ABIERTO',
    subject: 'Consulta por cambio de sabor en Creatina',
    description: 'Pregunta si puede cambiar Creatina neutra por versión saborizada.',
    assignedTo: 'Ventas',
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    messages: [
      {
        id: 'm-3',
        sender: 'CLIENTE',
        senderName: 'Camila Farías',
        text: 'Hola, aún no despachan mi pedido. ¿Alcanzo a cambiar el sabor de la proteína?',
        timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
      },
    ],
  },
];

export function Desk({ token }: { token: string }) {
  const [tickets, setTickets] = useState<Ticket[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nutrifit_desk_tickets');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore
        }
      }
    }
    return SAMPLE_TICKETS;
  });

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(tickets[0]?.id || null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [priorityFilter, setPriorityFilter] = useState<string>('TODOS');
  const [newMsgText, setNewMsgText] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);

  // New ticket form
  const [newCustomer, setNewCustomer] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newOrder, setNewOrder] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<Ticket['category']>('ENTREGA');
  const [newPriority, setNewPriority] = useState<Ticket['priority']>('MEDIA');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nutrifit_desk_tickets', JSON.stringify(tickets));
    }
  }, [tickets]);

  const selectedTicket = useMemo(
    () => tickets.find((t) => t.id === selectedTicketId),
    [tickets, selectedTicketId],
  );

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (statusFilter !== 'TODOS' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'TODOS' && t.priority !== priorityFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          t.ticketNumber.toLowerCase().includes(q) ||
          t.customerName.toLowerCase().includes(q) ||
          t.customerPhone.includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          (t.orderNumber && t.orderNumber.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [tickets, statusFilter, priorityFilter, search]);

  const handleSendMessage = () => {
    if (!newMsgText.trim() || !selectedTicketId) return;
    const msg = {
      id: `m-${Date.now()}`,
      sender: 'SOPORTE' as const,
      senderName: 'Soporte NutriFit',
      text: newMsgText.trim(),
      timestamp: new Date().toISOString(),
    };

    setTickets((prev) =>
      prev.map((t) =>
        t.id === selectedTicketId
          ? {
              ...t,
              messages: [...t.messages, msg],
              updatedAt: new Date().toISOString(),
            }
          : t,
      ),
    );
    setNewMsgText('');
    toast.success('Respuesta registrada');
  };

  const handleStatusChange = (newStatus: Ticket['status']) => {
    if (!selectedTicketId) return;
    setTickets((prev) =>
      prev.map((t) => (t.id === selectedTicketId ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t)),
    );
    toast.success(`Estado actualizado a: ${newStatus}`);
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.trim() || !newPhone.trim() || !newSubject.trim()) {
      toast.error('Completa los campos obligatorios');
      return;
    }

    const t: Ticket = {
      id: `t-${Date.now()}`,
      ticketNumber: `NF-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: newCustomer.trim(),
      customerPhone: newPhone.trim(),
      orderNumber: newOrder.trim() || undefined,
      category: newCategory,
      priority: newPriority,
      status: 'NUEVO',
      subject: newSubject.trim(),
      description: newDesc.trim(),
      assignedTo: 'Admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: `m-${Date.now()}`,
          sender: 'CLIENTE',
          senderName: newCustomer.trim(),
          text: newDesc.trim() || newSubject.trim(),
          timestamp: new Date().toISOString(),
        },
      ],
    };

    setTickets([t, ...tickets]);
    setSelectedTicketId(t.id);
    setShowNewModal(false);
    setNewCustomer('');
    setNewPhone('');
    setNewOrder('');
    setNewSubject('');
    setNewDesc('');
    toast.success(`Ticket ${t.ticketNumber} creado exitosamente`);
  };

  const getPriorityBadge = (p: Ticket['priority']) => {
    switch (p) {
      case 'URGENTE':
        return <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-black text-red-600">URGENTE</span>;
      case 'ALTA':
        return <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-black text-orange-600">ALTA</span>;
      case 'MEDIA':
        return <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600">MEDIA</span>;
      default:
        return <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600">BAJA</span>;
    }
  };

  const getStatusBadge = (s: Ticket['status']) => {
    switch (s) {
      case 'NUEVO':
        return <span className="rounded-full bg-purple-500/10 px-2.5 py-1 text-[11px] font-black text-purple-700">Nuevo</span>;
      case 'ABIERTO':
        return <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-[11px] font-bold text-blue-700">Abierto</span>;
      case 'EN_PROCESO':
        return <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-700">En proceso</span>;
      case 'ESPERANDO_CLIENTE':
        return <span className="rounded-full bg-yellow-500/10 px-2.5 py-1 text-[11px] font-bold text-yellow-800">Esperando cliente</span>;
      case 'RESUELTO':
        return <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-black text-emerald-700">Resuelto</span>;
      default:
        return <span className="rounded-full bg-gray-500/10 px-2.5 py-1 text-[11px] font-bold text-gray-700">Cerrado</span>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sport-green/15 text-sport-green">
              <LifeBuoy size={16} />
            </span>
            <h2 className="font-display text-xl tracking-wide uppercase">Desk / Centro de Atención</h2>
          </div>
          <p className="text-xs text-muted">Gestión de incidencias, consultas y seguimiento post-venta conectado al CRM.</p>
        </div>
        <Button onClick={() => setShowNewModal(true)} size="sm" className="bg-sport-green text-black font-extrabold hover:bg-sport-greenLight">
          <Plus size={14} /> Nuevo Ticket
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-2xl border border-line bg-paper p-3.5 shadow-sm">
          <p className="text-[11px] font-bold text-muted uppercase tracking-wider">Tickets Abiertos</p>
          <p className="mt-1 text-2xl font-display text-ink">
            {tickets.filter((t) => t.status === 'ABIERTO' || t.status === 'NUEVO' || t.status === 'EN_PROCESO').length}
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-paper p-3.5 shadow-sm">
          <p className="text-[11px] font-bold text-muted uppercase tracking-wider">Urgentes / Alta</p>
          <p className="mt-1 text-2xl font-display text-red-600">
            {tickets.filter((t) => (t.priority === 'URGENTE' || t.priority === 'ALTA') && t.status !== 'RESUELTO').length}
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-paper p-3.5 shadow-sm">
          <p className="text-[11px] font-bold text-muted uppercase tracking-wider">Tiempo Promedio</p>
          <p className="mt-1 text-2xl font-display text-emerald-600">28 min</p>
        </div>
        <div className="rounded-2xl border border-line bg-paper p-3.5 shadow-sm">
          <p className="text-[11px] font-bold text-muted uppercase tracking-wider">Tasa de Resolución</p>
          <p className="mt-1 text-2xl font-display text-ink">96%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-5">
          <div className="rounded-2xl border border-line bg-paper p-3 space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Buscar por ticket, cliente, teléfono, pedido..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-3 text-xs text-ink placeholder:text-muted focus:border-sport-green focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 rounded-xl border border-line bg-surface px-2.5 py-1.5 text-xs text-ink"
              >
                <option value="TODOS">Todos los estados</option>
                <option value="NUEVO">Nuevos</option>
                <option value="ABIERTO">Abiertos</option>
                <option value="EN_PROCESO">En proceso</option>
                <option value="RESUELTO">Resueltos</option>
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="flex-1 rounded-xl border border-line bg-surface px-2.5 py-1.5 text-xs text-ink"
              >
                <option value="TODOS">Todas las prioridades</option>
                <option value="URGENTE">Urgente</option>
                <option value="ALTA">Alta</option>
                <option value="MEDIA">Media</option>
                <option value="BAJA">Baja</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredTickets.length === 0 ? (
              <div className="rounded-2xl border border-line bg-paper p-8 text-center text-xs text-muted">
                No se encontraron tickets con los filtros aplicados.
              </div>
            ) : (
              filteredTickets.map((t) => {
                const isSelected = t.id === selectedTicketId;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className={`w-full text-left rounded-2xl border p-3.5 transition-all ${
                      isSelected
                        ? 'border-sport-green bg-sport-green/5 shadow-sm'
                        : 'border-line bg-paper hover:border-sport-green/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-extrabold text-ink">{t.ticketNumber}</span>
                      <div className="flex items-center gap-1.5">
                        {getPriorityBadge(t.priority)}
                        {getStatusBadge(t.status)}
                      </div>
                    </div>
                    <p className="mt-1.5 text-xs font-bold text-ink truncate">{t.subject}</p>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
                      <span className="flex items-center gap-1">
                        <User size={12} /> {t.customerName}
                      </span>
                      {t.orderNumber && (
                        <span className="flex items-center gap-1 font-mono">
                          <ShoppingBag size={12} /> {t.orderNumber}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-7">
          {selectedTicket ? (
            <div className="rounded-2xl border border-line bg-paper p-4 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-black text-ink">{selectedTicket.ticketNumber}</span>
                    <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold text-muted uppercase">
                      {selectedTicket.category}
                    </span>
                    {getPriorityBadge(selectedTicket.priority)}
                  </div>
                  <h3 className="mt-1 font-display text-base tracking-wide text-ink">{selectedTicket.subject}</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleStatusChange(e.target.value as Ticket['status'])}
                    className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-bold text-ink"
                  >
                    <option value="NUEVO">Nuevo</option>
                    <option value="ABIERTO">Abierto</option>
                    <option value="EN_PROCESO">En proceso</option>
                    <option value="ESPERANDO_CLIENTE">Esperando cliente</option>
                    <option value="RESUELTO">Resuelto</option>
                    <option value="CERRADO">Cerrado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface p-3 text-xs sm:grid-cols-3">
                <div>
                  <p className="text-[10px] font-bold text-muted uppercase">Cliente</p>
                  <p className="font-bold text-ink">{selectedTicket.customerName}</p>
                  <a
                    href={`https://wa.me/${selectedTicket.customerPhone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-sport-green hover:underline"
                  >
                    {selectedTicket.customerPhone}
                  </a>
                </div>
                {selectedTicket.orderNumber && (
                  <div>
                    <p className="text-[10px] font-bold text-muted uppercase">Pedido Asociado</p>
                    <p className="font-mono font-bold text-ink">{selectedTicket.orderNumber}</p>
                    <p className="text-[11px] text-muted">Entrega en Metro</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-bold text-muted uppercase">Asignado a</p>
                  <p className="font-bold text-ink">{selectedTicket.assignedTo || 'Sin asignar'}</p>
                </div>
              </div>

              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {selectedTicket.messages.map((m) => {
                  const isStaff = m.sender === 'SOPORTE';
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-muted mb-1 px-1">
                        <span className="font-bold">{m.senderName}</span>
                        <span>·</span>
                        <span>{new Date(m.timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div
                        className={`rounded-2xl p-3 text-xs leading-relaxed max-w-[85%] ${
                          isStaff
                            ? 'bg-ink text-paper rounded-tr-none'
                            : 'bg-surface border border-line text-ink rounded-tl-none'
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-line pt-3 flex gap-2">
                <input
                  type="text"
                  placeholder="Escribe una respuesta o nota interna..."
                  value={newMsgText}
                  onChange={(e) => setNewMsgText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendMessage();
                  }}
                  className="flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink placeholder:text-muted focus:border-sport-green focus:outline-none"
                />
                <Button onClick={handleSendMessage} size="sm" className="bg-sport-green text-black font-bold">
                  <Send size={13} /> Enviar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex h-[400px] items-center justify-center rounded-2xl border border-line bg-paper text-center text-xs text-muted">
              Selecciona un ticket para ver la conversación y gestionar el caso.
            </div>
          )}
        </div>
      </div>

      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-line bg-paper p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-display text-lg tracking-wide uppercase text-ink">Crear Nuevo Ticket</h3>
              <button onClick={() => setShowNewModal(false)} className="text-muted hover:text-ink text-sm">✕</button>
            </div>
            <form onSubmit={handleCreateTicket} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-muted mb-1">Nombre del Cliente *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Matías Ramos"
                  value={newCustomer}
                  onChange={(e) => setNewCustomer(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-muted mb-1">Teléfono *</label>
                  <input
                    type="text"
                    required
                    placeholder="+569..."
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink"
                  />
                </div>
                <div>
                  <label className="block font-bold text-muted mb-1">N° Pedido (Opcional)</label>
                  <input
                    type="text"
                    placeholder="NF-..."
                    value={newOrder}
                    onChange={(e) => setNewOrder(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-muted mb-1">Categoría</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as Ticket['category'])}
                    className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink"
                  >
                    <option value="ENTREGA">Entrega / Metro</option>
                    <option value="PRODUCTO">Producto / Sabor</option>
                    <option value="PAGO">Pago / Comprobante</option>
                    <option value="CAMBIO">Cambio / Devolución</option>
                    <option value="CONSULTA">Consulta Nutricional</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-muted mb-1">Prioridad</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as Ticket['priority'])}
                    className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink"
                  >
                    <option value="BAJA">Baja</option>
                    <option value="MEDIA">Media</option>
                    <option value="ALTA">Alta</option>
                    <option value="URGENTE">Urgente</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold text-muted mb-1">Asunto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Cambio de estación de entrega"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink"
                />
              </div>
              <div>
                <label className="block font-bold text-muted mb-1">Descripción / Mensaje Inicial</label>
                <textarea
                  rows={3}
                  placeholder="Detalles de la consulta o solicitud..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowNewModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-sport-green text-black font-bold">
                  Crear Ticket
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
