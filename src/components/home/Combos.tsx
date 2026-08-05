'use client';

import Image from 'next/image';
import { Check, MessageCircle, Zap } from 'lucide-react';
import { COMBOS } from '@/data/seed';
import type { Combo } from '@/types';
import Reveal from '@/components/ui/Reveal';
import FlashSaleCountdown from '@/components/home/FlashSaleCountdown';
import { formatPrice } from '@/lib/utils';
import { buildComboMessage, openWhatsApp } from '@/lib/whatsapp';
import { getSettings } from '@/lib/store';

function ComboCard({ combo, index }: { combo: Combo; index: number }) {
  return (
    <Reveal delay={index * 80} className="h-full">
      <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-accent/60">
        <div className="relative aspect-[4/3] overflow-hidden bg-soft">
          <Image src={combo.image} alt={combo.name} fill sizes="(max-width: 1024px) 100vw, 33vw" className="object-contain p-6" />
          <span className="absolute left-3 top-3 rounded-full bg-accent px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-ink">
            {combo.tag}
          </span>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <h3 className="font-display text-xl uppercase tracking-wide text-paper">{combo.name}</h3>
          <p className="mt-1 text-sm text-white/60">{combo.desc}</p>
          <ul className="mt-4 space-y-2">
            {combo.items.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-paper/80">
                <Check size={15} className="mt-0.5 shrink-0 text-accent" />
                <span className="font-medium">{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-auto flex items-center justify-between pt-5">
            <div>
              <span className="text-xs text-white/40 line-through">{formatPrice(combo.oldPrice)}</span>
              <p className="font-display text-2xl leading-none tracking-wide text-accent">
                {formatPrice(combo.price)}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                openWhatsApp(getSettings().whatsapp, buildComboMessage(combo))
              }
              className="btn-accent !px-5 !py-2.5 text-xs"
            >
              <MessageCircle size={15} /> Pedir combo
            </button>
          </div>
        </div>
      </article>
    </Reveal>
  );
}

export default function Combos() {
  return (
    <section className="bg-ink py-16" id="combos">
      <div className="container-px">
        <Reveal className="mb-10 flex flex-col items-center gap-4 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-ink">
            <Zap size={13} /> Ofertas Flash
          </span>
          <h2 className="section-title text-paper">Descuentos de hoy</h2>
          <p className="max-w-xl text-sm text-white/60">
            Combos por tiempo limitado. Pide directo por WhatsApp y coordina tu entrega en metro.
          </p>
          <FlashSaleCountdown />
        </Reveal>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {COMBOS.map((combo, i) => (
            <ComboCard key={combo.id} combo={combo} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
