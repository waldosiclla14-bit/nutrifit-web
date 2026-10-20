'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Gift } from 'lucide-react';
import { BUNDLES, PRODUCTS } from '@/data/seed';
import { useCart } from '@/context/CartContext';
import { bundlePricing, formatPrice } from '@/lib/utils';
import Reveal from '@/components/ui/Reveal';

/**
 * Sección "Sets y packs" de la home. Ancla #sets (referenciada por banners).
 * Muestra todos los packs con ahorro y compra directa al carrito.
 */
export default function Packs() {
  const { addBundle } = useCart();
  const [selections, setSelections] = useState<Record<string, Record<number, string>>>({});
  const resolve = (id: number) => PRODUCTS.find((p) => p.id === id);

  const select = (bundleId: string, productId: number, value: string) =>
    setSelections((prev) => ({
      ...prev,
      [bundleId]: { ...prev[bundleId], [productId]: value },
    }));

  if (BUNDLES.length === 0) return null;

  return (
    <section className="container-px bg-sport-surface py-14 lg:py-[100px]" id="sets">
      <Reveal className="mb-10 text-center">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-sport-green">
          SETS Y PACKS
        </p>
        <h2 className="mt-2 font-display text-[28px] uppercase leading-tight tracking-wide text-gray-900 lg:text-[36px]">
          Compra en <span className="text-sport-green">pack y ahorra</span>
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-gray-500">
          Combinaciones listas para tus objetivos, con el mejor precio por unidad.
        </p>
      </Reveal>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {BUNDLES.map((bundle, i) => {
          const pricing = bundlePricing(bundle, (id) => resolve(id));
          const variantItem = bundle.items
            .map((it) => ({ ...it, product: resolve(it.productId) }))
            .find((it) => it.product?.variants?.length);
          return (
            <Reveal key={bundle.id} delay={i * 50}>
              <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-sport-border/50 bg-sport-card transition-all duration-300 hover:-translate-y-1 hover:border-sport-green/40">
                <div className="relative aspect-[4/3] overflow-hidden bg-sport-surface">
                  {bundle.image && (
                    <Image
                      src={bundle.image}
                      alt={bundle.title}
                      fill
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="object-contain p-6"
                    />
                  )}
                  {pricing.percent > 0 && (
                    <span className="absolute left-3 top-3 rounded-full bg-sport-orange px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white">
                      -{pricing.percent}%
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-display text-lg uppercase tracking-wide text-gray-900">
                    {bundle.title}
                  </h3>
                  {bundle.subtitle && (
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-gray-500">
                      {bundle.subtitle}
                    </p>
                  )}

                  {variantItem && variantItem.product && (
                    <label className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                      <span className="shrink-0 font-semibold">Sabor</span>
                      <select
                        value={
                          selections[bundle.id]?.[variantItem.productId] ??
                          variantItem.product.variants![0].name
                        }
                        onChange={(e) => select(bundle.id, variantItem.productId, e.target.value)}
                        aria-label="Sabor de la proteína"
                        className="input !h-9 !py-1 text-xs font-semibold"
                      >
                        {(variantItem.product.variants || []).map((v) => (
                          <option key={v.name} value={v.name}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <div className="mt-auto pt-4">
                    <div className="flex items-end justify-between gap-2">
                      <div className="flex flex-col">
                        {pricing.saving > 0 && (
                          <span className="text-sm text-gray-400 line-through">
                            {formatPrice(pricing.sum)}
                          </span>
                        )}
                        <span className="text-xl font-bold leading-none text-gray-900">
                          {formatPrice(pricing.price)}
                        </span>
                      </div>
                      {pricing.saving > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-sport-green/15 px-2.5 py-1 text-[11px] font-bold text-sport-green">
                          <Gift size={12} /> Ahorras {formatPrice(pricing.saving)}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => addBundle(bundle, selections[bundle.id])}
                      className="btn-accent mt-4 w-full !py-3 text-xs"
                    >
                      Añadir el pack
                    </button>
                  </div>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
