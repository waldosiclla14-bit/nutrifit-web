'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { BRAND } from '@/data/seed';
import { formatPrice } from '@/lib/utils';

export default function Footer() {
  return (
    <footer className="bg-dark text-white" id="contacto">
      <div className="container-px grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/logo.png" alt="NUTRIFIT" className="h-10 w-auto" />
            <span className="font-display text-lg uppercase tracking-wide">
              Nutri<span className="text-accent">Fit</span>
            </span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            Suplementos deportivos premium para quienes entrenan sin excusas. Santiago, Chile.
          </p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            {BRAND.tagline}
          </p>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-white/90">Contacto</h4>
          <ul className="mt-4 space-y-2.5 text-sm text-white/70">
            <li>
              WhatsApp:{' '}
              <a href={`https://wa.me/${BRAND.whatsappDigits}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-white transition-colors hover:text-accent">
                {BRAND.whatsapp}
              </a>
            </li>
            <li>
              Instagram:{' '}
              <a href={BRAND.instagramUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-white transition-colors hover:text-accent">
                {BRAND.instagram}
              </a>
            </li>
            <li>Santiago, Chile</li>
            <li>Horario: {BRAND.hours}</li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-white/90">Enlaces</h4>
          <ul className="mt-4 space-y-2.5 text-sm text-white/70">
            <li><Link href="/productos" className="transition-colors hover:text-accent">Catálogo</Link></li>
            <li><Link href="/#combos" className="transition-colors hover:text-accent">Combos</Link></li>
            <li><Link href="/#beneficios" className="transition-colors hover:text-accent">Beneficios</Link></li>
            <li><Link href="/#opiniones" className="transition-colors hover:text-accent">Opiniones</Link></li>
            <li><Link href="/blog" className="transition-colors hover:text-accent">Blog y guías</Link></li>
            <li><Link href="/favoritos" className="transition-colors hover:text-accent">Mis favoritos</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-white/90">Información</h4>
          <ul className="mt-4 space-y-2.5 text-sm text-white/70">
            <li><Link href="/legal#politicas-envio" className="transition-colors hover:text-accent">Políticas de Entrega</Link></li>
            <li><Link href="/legal#terminos" className="transition-colors hover:text-accent">Términos y Condiciones</Link></li>
            <li><Link href="/legal#privacidad" className="transition-colors hover:text-accent">Política de Privacidad</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-px flex flex-col items-center justify-between gap-2 py-6 text-xs text-white/50 sm:flex-row">
          <p>© {new Date().getFullYear()} NutriFit. Todos los derechos reservados.</p>
          <p>Suplementos deportivos · Santiago de Chile</p>
        </div>
      </div>
    </footer>
  );
}
