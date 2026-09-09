'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Droplets, Zap, FlaskConical, Leaf } from 'lucide-react';

const TABS = [
  {
    id: 'whey',
    label: 'Whey Protein',
    icon: FlaskConical,
    stats: [
      { label: 'Proteína', value: '24g', sub: 'por porción (30g)' },
      { label: 'Azúcar', value: '0g', sub: 'sin azúcar añadida' },
      { label: 'BCAAs', value: '5.5g', sub: 'aminoácidos ramificados' },
      { label: 'Calorías', value: '120', sub: 'kcal por servicio' },
    ],
    description:
      'Proteína de suero de leche de alta calidad. Fácil de preparar, rápido aumento muscular sin grasas.',
  },
  {
    id: 'creatina',
    label: 'Creatina',
    icon: Zap,
    stats: [
      { label: 'Creatina', value: '5g', sub: 'monohidratada pura' },
      { label: 'Disolución', value: 'Alta', sub: 'micronizada rápidamente' },
      { label: 'Por-envase', value: '60', sub: 'servicios por envase' },
      { label: 'Peso', value: '300g', sub: 'envase compacto' },
    ],
    description:
      'Creatina Monohidratada Micronizada de disolución rápida. 5g por servicio, pureza farmacéutica.',
  },
];

export default function NutritionalTransparency() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const active = TABS.find((t) => t.id === activeTab) ?? TABS[0];
  const Icon = active.icon;

  return (
    <section className="relative overflow-hidden bg-sport-bg py-14 lg:py-[100px]">
      <div className="container-px mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-sport-green">
            Transparencia nutricional
          </p>
          <h2 className="mt-3 font-display text-[28px] uppercase tracking-wide text-gray-900 lg:text-[36px]">
            Qué hay dentro de tu pack
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] text-gray-500">
            Datos reales, sin relleno. Cada porción tiene exactamente lo que necesitas para entrenar.
          </p>
        </motion.div>

        {/* Tab selector */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-8 flex justify-center"
        >
          <div className="inline-flex gap-1 rounded-2xl bg-sport-card p-1.5">
            {TABS.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-bold transition-colors ${
                    isActive ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nutritional-tab"
                      className="absolute inset-0 rounded-xl bg-sport-green/15 ring-1 ring-sport-green/30"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <TabIcon size={15} className="relative z-10" />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Stats grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35 }}
            className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
          >
            {active.stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="group rounded-2xl border border-sport-border bg-white p-5 text-center transition-colors hover:border-sport-green/40"
              >
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                  {stat.label}
                </p>
                <p className="mt-2 font-display text-4xl tracking-wide text-sport-green">
                  {stat.value}
                </p>
                <p className="mt-1 text-[12px] text-gray-400">{stat.sub}</p>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Description */}
        <AnimatePresence mode="wait">
          <motion.p
            key={active.id + '-desc'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-6 text-center text-[14px] text-gray-400"
          >
            {active.description}
          </motion.p>
        </AnimatePresence>
      </div>
    </section>
  );
}
