'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BadgeCheck, MessageCircle, PackageCheck, ShieldCheck, Truck, Users } from 'lucide-react';
import Reveal from '@/components/ui/Reveal';
import { BRAND } from '@/data/seed';

const VALUES = [
  {
    icon: ShieldCheck,
    title: '100% originales',
    text: 'Solo marcas certificadas, con sellos y trazabilidad intactos.',
  },
  {
    icon: Truck,
    title: 'Entrega en Metro',
    text: 'Coordinamos tu entrega en todas las estaciones de las líneas 1 a 6.',
  },
  {
    icon: PackageCheck,
    title: '+500 pedidos',
    text: 'Entregados en Santiago con coordinación 24–48 hrs por WhatsApp.',
  },
  {
    icon: BadgeCheck,
    title: 'Garantía 30 días',
    text: 'Si algo no te convence, te devolvemos tu dinero sin dramas.',
  },
];

export default function Storytelling() {
  const [imgError, setImgError] = useState(false);

  return (
    <section className="container-px py-14 lg:py-[100px]" id="nosotros">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
        <Reveal>
          <div className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-4xl border border-line bg-soft shadow-soft">
              {!imgError ? (
                <Image
                  src="/img/equipo.jpg"
                  alt="Equipo NUTRIFIT"
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-soft p-8 text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ink text-accent">
                    <Users size={28} />
                  </span>
                  <p className="font-display text-2xl uppercase tracking-wide text-ink/70">
                    Nuestro equipo en la cancha
                  </p>
                  <p className="max-w-xs text-sm text-muted">
                    Reemplaza este espacio agregando tu foto en <span className="font-mono text-xs">public/img/equipo.jpg</span>
                  </p>
                </div>
              )}
            </div>
            <span className="absolute -bottom-4 right-4 flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-bold text-white shadow-soft sm:right-8">
              <PackageCheck size={14} className="text-accent" /> +{BRAND.orders} pedidos entregados
            </span>
          </div>
        </Reveal>

        <div>
          <Reveal>
            <p className="section-label">NUESTRA HISTORIA</p>
            <h2 className="section-title">
              Más que suplementos, <span className="text-accentDeep">tu resultado</span>
            </h2>
          </Reveal>
          <Reveal delay={80}>
            <p className="mt-5 text-base leading-relaxed text-ink/80">
              NUTRIFIT nace en Santiago con una idea simple: el progreso no depende de excusas,
              sino de hábitos serios y de insumos en los que puedas confiar.
            </p>
            <p className="mt-3 text-base leading-relaxed text-ink/80">
              Probamos cada producto que vendemos, trabajamos directo con marcas como FullEnergic,
              Rain y FNL, y cuidamos el sellado para que lo que llega a tus manos sea exactamente
              lo que promete la etiqueta.
            </p>
            <p className="mt-3 text-base leading-relaxed text-ink/80">
              Hoy somos {BRAND.orders}+ pedidos entregados en todo Santiago, coordinados por
              WhatsApp y despachados a tu estación de metro. Seguimos siendo un equipo pequeño,
              obsesionado con que tu progreso también sea el nuestro.
            </p>
          </Reveal>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {VALUES.map((v, i) => (
              <Reveal key={v.title} delay={100 + i * 60}>
                <div className="flex h-full gap-3 rounded-2xl border border-line bg-soft p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink text-accent">
                    <v.icon size={18} />
                  </span>
                  <div>
                    <p className="text-sm font-bold">{v.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">{v.text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={360}>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/productos" className="btn-accent">
                Ver Catálogo
              </Link>
              <Link
                href={`https://wa.me/${BRAND.whatsappDigits}?text=${encodeURIComponent(
                  'Hola NUTRIFIT! Quiero conocer más sobre sus productos.',
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline"
              >
                <MessageCircle size={16} /> Escríbenos
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
