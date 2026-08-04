'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { Minus, Plus, Trash2, Truck, X } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { METRO_LINES } from '@/data/metro';
import { formatPrice, uid } from '@/lib/utils';
import { buildWhatsAppMessage, openWhatsApp } from '@/lib/whatsapp';
import { getSettings, saveOrder } from '@/lib/store';
import type { Order } from '@/types';

export default function CartDrawer() {
  const {
    items,
    isOpen,
    closeCart,
    updateQuantity,
    removeItem,
    subtotal,
    discount,
    shipping,
    total,
    freeShippingFrom,
    clearCart,
  } = useCart();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [metroLine, setMetroLine] = useState('');
  const [metroStation, setMetroStation] = useState('');
  const [payment, setPayment] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    setMetroStation('');
  }, [metroLine]);

  const selectedLine = METRO_LINES.find((l) => l.line === metroLine);
  const remaining = Math.max(0, freeShippingFrom - subtotal);
  const progress = Math.min(100, (subtotal / freeShippingFrom) * 100);

  const checkout = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError('Completa tu nombre y teléfono.');
      return;
    }
    if (!metroLine || !metroStation) {
      setError('Elige tu línea y estación de metro.');
      return;
    }
    if (!payment) {
      setError('Elige tu método de pago.');
      return;
    }

    const order: Order = {
      id: uid('NF'),
      name: name.trim(),
      phone: phone.trim(),
      metroLine: `Línea ${metroLine}`,
      metroStation: metroStation.trim(),
      payment,
      items: items.map((i) => ({
        productId: i.productId,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        image: i.image,
      })),
      subtotal,
      shipping,
      total,
      status: 'nuevo',
      createdAt: Date.now(),
    };

    saveOrder(order);
    openWhatsApp(getSettings().whatsapp, buildWhatsAppMessage(order));
    clearCart();
    closeCart();
    setError('');
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={closeCart}
        aria-hidden="true"
      />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-paper shadow-2xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Carrito de compras"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="font-display text-xl uppercase tracking-wide">Tu Carrito</h3>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-soft"
          >
            <X size={18} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <ShoppingBagEmpty />
            <p className="font-semibold">Tu carrito está vacío</p>
            <p className="text-sm text-muted">Agrega tus suplementos favoritos y finaliza tu pedido por WhatsApp.</p>
            <Link href="/productos" onClick={closeCart} className="btn-primary mt-2">
              Ver catálogo
            </Link>
          </div>
        ) : (
          <>
            <div className="border-b border-line px-5 py-3">
              {remaining > 0 ? (
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-muted">
                      <Truck size={14} /> Envío gratis en metro
                    </span>
                    <span className="text-accentDeep">Te faltan {formatPrice(remaining)}</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-soft2">
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="flex items-center gap-1.5 text-xs font-bold text-accentDeep">
                  <Truck size={14} /> ¡Tienes envío GRATIS en metro!
                </p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <ul className="space-y-4">
                {items.map((item) => (
                  <li key={item.key} className="flex gap-3.5">
                    <Link href={`/productos/${item.slug}`} onClick={closeCart} className="shrink-0">
                      <Image
                        src={item.image}
                        alt={item.name}
                        width={72}
                        height={72}
                        className="h-[72px] w-[72px] rounded-xl border border-line object-cover"
                      />
                    </Link>
                    <div className="flex flex-1 flex-col">
                      <p className="line-clamp-2 text-sm font-semibold leading-snug">{item.name}</p>
                      <div className="mt-1 flex items-center justify-between">
                        <div className="flex items-center rounded-full border border-line">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.key, item.quantity - 1)}
                            aria-label="Disminuir cantidad"
                            className="flex h-7 w-7 items-center justify-center rounded-l-full transition-colors hover:bg-soft"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="w-7 text-center text-xs font-bold">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.key, item.quantity + 1)}
                            aria-label="Aumentar cantidad"
                            className="flex h-7 w-7 items-center justify-center rounded-r-full transition-colors hover:bg-soft"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.key)}
                          aria-label="Eliminar producto"
                          className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        {item.discount > 0 && (
                          <span className="text-xs text-muted line-through">
                            {formatPrice((item.price + item.discount) * item.quantity)}
                          </span>
                        )}
                        <span className="text-sm font-bold text-accentDeep">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-line px-5 py-4">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Subtotal</span>
                  <span className="font-semibold">{formatPrice(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted">Descuento</span>
                    <span className="font-semibold text-accentDeep">-{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted">Entrega en metro</span>
                  <span className={`font-semibold ${shipping === 0 ? 'text-accentDeep' : ''}`}>
                    {shipping === 0 ? 'GRATIS' : formatPrice(shipping)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-line pt-2 text-base">
                  <span className="font-bold">Total</span>
                  <span className="font-display text-lg">{formatPrice(total)}</span>
                </div>
              </div>

              <form onSubmit={checkout} className="mt-4 space-y-2.5">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre completo"
                  aria-label="Nombre completo"
                  className="input"
                />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Teléfono (ej: 9 8765 4321)"
                  aria-label="Teléfono"
                  className="input"
                />
                <div className="grid grid-cols-2 gap-2.5">
                  <select
                    value={metroLine}
                    onChange={(e) => setMetroLine(e.target.value)}
                    aria-label="Línea de Metro"
                    className="input"
                  >
                    <option value="">Línea...</option>
                    {METRO_LINES.map((l) => (
                      <option key={l.line} value={l.line}>
                        Línea {l.line}
                      </option>
                    ))}
                  </select>
                  <select
                    value={metroStation}
                    onChange={(e) => setMetroStation(e.target.value)}
                    aria-label="Estación de metro"
                    className="input"
                  >
                    <option value="">Estación...</option>
                    {selectedLine?.stations.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <select
                  value={payment}
                  onChange={(e) => setPayment(e.target.value)}
                  aria-label="Método de pago"
                  className="input"
                >
                  <option value="">Método de pago...</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Efectivo">Efectivo</option>
                </select>
                {error && <p className="text-xs font-semibold text-red-500">{error}</p>}
                <button type="submit" className="btn-accent w-full">
                  Finalizar compra por WhatsApp
                </button>
                <p className="text-center text-[11px] leading-relaxed text-muted">
                  Abrirás WhatsApp con tu pedido listo para confirmar. Coordinamos la entrega en tu
                  estación de metro.
                </p>
              </form>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

function ShoppingBagEmpty() {
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-soft">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
    </div>
  );
}
