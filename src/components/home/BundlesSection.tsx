'use client';

import { BUNDLES, PRODUCTS } from '@/data/seed';
import BundleCard from '@/components/ui/BundleCard';
import Reveal from '@/components/ui/Reveal';

export default function BundlesSection() {
  if (BUNDLES.length === 0) return null;

  return (
    <section className="container-px py-14" id="sets">
      <Reveal className="mb-10 text-center">
        <p className="section-label">SETS CON DESCUENTO</p>
        <h2 className="section-title">
          Combina y <span className="text-accentDeep">ahorra</span>
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted">
          Arma tu stack de suplementos con nuestros sets y paga menos por cada producto.
        </p>
      </Reveal>
      <div className="grid gap-6 md:grid-cols-2">
        {BUNDLES.map((bundle) => (
          <Reveal key={bundle.id} className="h-full">
            <BundleCard bundle={bundle} products={PRODUCTS} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
