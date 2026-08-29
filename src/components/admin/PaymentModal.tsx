'use client';

import { useState } from 'react';
import { formatPrice } from '@/lib/utils';
import { PAYMENT_LABEL } from '@/lib/admin/constants';
import type { AdminOrder } from '@/types/admin';

export function PaymentModal({
  order,
  token,
  busy,
  onClose,
  onSave,
}: {
  order: AdminOrder;
  token: string;
  busy: boolean;
  onClose: () => void;
  onSave: (method: string) => Promise<void> | void;
}) {
  const [method, setMethod] = useState(order.paymentMethod || 'TRANSFERENCIA');
  const confirming = order.paymentStatus !== 'CONFIRMED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl border border-line bg-paper p-6" onClick={(e) => e.stopPropagation()}>
        <p className="font-display text-xl uppercase">Editar pago</p>
        <div className="mt-2 rounded-2xl border border-line bg-soft p-3 text-sm">
          <p className="font-semibold">{order.orderNumber}</p>
          <p className="text-muted">
            Total <b className="text-ink">{formatPrice(order.total)}</b> · Actual:{' '}
            {PAYMENT_LABEL[order.paymentMethod || ''] || '—'}
          </p>
          <p className="mt-1 text-xs text-muted">
            {confirming ? 'Este pedido está pendiente. Confirmar el pago lo marcará como pagado.' : 'La orden ya está pagada. Solo se cambiará el método de pago.'}
          </p>
        </div>
        <div className="mt-4">
          <span className="text-xs font-semibold text-muted">Método de pago</span>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {Object.keys(PAYMENT_LABEL).map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  method === m ? 'border-accent bg-accent/10 text-ink' : 'border-line bg-paper text-muted hover:text-ink'
                }`}
              >
                {PAYMENT_LABEL[m]}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="btn-outline px-4 py-2 text-xs">
            Cancelar
          </button>
          <button
            onClick={() => onSave(method)}
            disabled={busy}
            className="btn-accent px-4 py-2 text-xs disabled:opacity-50"
          >
            {busy ? 'Guardando…' : confirming ? 'Confirmar pago' : 'Guardar método'}
          </button>
        </div>
      </div>
    </div>
  );
}