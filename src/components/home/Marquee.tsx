const WORDS = [
  'WHEY PROTEIN',
  'CREATINA',
  'VITAMINAS',
  'OMEGA 3',
  'BIENESTAR',
  'PRE-ENTRENO',
];

export default function Marquee() {
  const items = [...WORDS, ...WORDS];
  return (
    <div className="overflow-hidden border-y border-white/10 bg-dark py-3.5 text-white">
      <div className="animate-marquee flex w-max items-center gap-8 whitespace-nowrap">
        {items.map((word, i) => (
          <span key={i} className="flex items-center gap-8 font-display text-sm uppercase tracking-[0.3em]">
            {word}
            <i className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
          </span>
        ))}
      </div>
    </div>
  );
}
