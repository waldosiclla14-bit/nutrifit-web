'use client';

import { useState, type FormEvent } from 'react';
import { CheckCircle2 } from 'lucide-react';
import Reveal from '@/components/ui/Reveal';

const KEY = 'nutrifit:newsletter';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    try {
      const raw = window.localStorage.getItem(KEY);
      const list = raw ? (JSON.parse(raw) as string[]) : [];
      list.push(email.trim());
      window.localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      // ignore
    }
    setDone(true);
  };

  return (
    <section className="container-px py-14" id="newsletter">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2.5rem] bg-dark px-6 py-12 text-white sm:px-12">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent/20 blur-[100px]" />
          <div className="relative grid items-center gap-8 lg:grid-cols-2">
            <div>
              <p className="section-label text-accent">NEWSLETTER</p>
              <h2 className="section-title-dark mt-2">
                Únete y obtén <span className="text-accent">10% OFF</span>
              </h2>
              <p className="mt-3 text-sm text-white/70">
                Recibe ofertas exclusivas, nuevos lanzamientos y tips de nutrición deportiva.
              </p>
            </div>
            {done ? (
              <div className="flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent/10 p-5">
                <CheckCircle2 size={28} className="shrink-0 text-accent" />
                <p className="text-sm font-semibold">
                  ¡Listo! Tu código de 10% OFF llegará a {email}. Revisa tu bandeja de entrada.
                </p>
              </div>
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Tu correo electrónico"
                  aria-label="Tu correo electrónico"
                  className="w-full rounded-full border border-white/20 bg-white/10 px-6 py-3.5 text-sm text-white placeholder-white/50 outline-none backdrop-blur transition focus:border-accent focus:ring-2 focus:ring-accent/40"
                />
                <button type="submit" className="btn-accent shrink-0">
                  Quiero mi descuento
                </button>
              </form>
            )}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
