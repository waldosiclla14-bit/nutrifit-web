import type { Product } from '@/types';
import { BRAND } from '@/data/seed';
import { formatPrice } from '@/lib/utils';

export interface RecommendContext {
  freeShippingFrom: number;
  whatsapp?: string;
}

type Intent =
  | 'recommend'
  | 'shipping'
  | 'payment'
  | 'warranty'
  | 'trust'
  | 'greeting'
  | 'product_question'
  | 'contact'
  | 'fallback';

const INTENT_RULES: Array<{ intent: Intent; words: string[] }> = [
  {
    intent: 'shipping',
    words: ['envio', 'despacho', 'entrega', 'metro', 'estacion', 'llegar', 'domicilio', 'cobertura', 'repart'],
  },
  {
    intent: 'payment',
    words: ['pago', 'pagar', 'metodo', 'transferencia', 'efectivo', 'cuenta', 'abono', 'cuotas'],
  },
  {
    intent: 'warranty',
    words: ['garanti', 'devolver', 'reembolso', 'cambio', 'sello', 'satisfaccion'],
  },
  {
    intent: 'contact',
    words: ['contacto', 'hablar', 'asesor', 'telefono', 'llamar', 'whatsapp', 'horario', 'atencion'],
  },
  {
    intent: 'trust',
    words: ['original', 'falso', 'confian', 'seguro', 'serio', 'fiable', 'garantiz', 'autentic'],
  },
  {
    intent: 'greeting',
    words: ['hola', 'buenas', 'que tal', 'buen dia', 'buenas tardes', 'buenas noches', 'saludos', 'hey', 'present'],
  },
  {
    intent: 'recommend',
    words: [
      'recomend', 'sugier', 'cual', 'que me', 'que tomo', 'que producto', 'objetivo', 'ganar musculo',
      'masa', 'adelgazar', 'bajar', 'energia', 'recuper', 'fuerza', 'potencia', 'rendimiento',
      'proteina', 'whey', 'creatina', 'vitamina', 'omega', 'pre entreno', 'preentreno', 'pump',
      'vegano', 'vegan', 'sueño', 'dormir', 'colageno', 'opciones', 'busco', 'quiero', 'ayud',
    ],
  },
];

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeWord(w: string): string {
  return w.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function hasTerm(queryNorm: string, term: string): boolean {
  const t = normalizeWord(term).trim();
  if (!t) return false;
  if (t.includes(' ')) return queryNorm.includes(t);
  return new RegExp(`(^|[^a-z0-9])${t}([^a-z0-9]|$)`).test(queryNorm);
}

function detectIntent(query: string): Intent {
  const q = norm(query);
  for (const rule of INTENT_RULES) {
    if (rule.words.some((w) => hasTerm(q, w))) {
      return rule.intent;
    }
  }
  return 'fallback';
}

const CATEGORY_KEYWORDS: Array<{ cat: string; words: string[] }> = [
  { cat: 'proteinas', words: ['proteina', 'whey', 'isolate', 'caseina', 'veg protein', 'proteina vegana', 'protein veg', 'suero'] },
  { cat: 'creatinas', words: ['creatina', 'monohidrato', 'creatine'] },
  { cat: 'rendimiento', words: [' pre entreno', 'pre-entreno', 'preentreno', 'pump', 'oxido nitrico', 'citrulina', 'arginina', 'bcaa', 'amino', 'testo', 'energia', 'nitrico'] },
  { cat: 'vitaminas', words: ['vitamina', 'multivitam', 'c 1000', 'zinc', 'magnesio', 'mineral', 'resveratrol', 'carnitina'] },
  { cat: 'bienestar', words: ['ashwagandha', 'melena', 'colageno', 'zma', 'omega', 'melatonina', 'shilajit', 'berberina', 'dormir', 'sueño', 'relaj'] },
  { cat: 'control-peso', words: ['quemador', 'grasa', 'keto', 'slim', 'carnitina', 'adelgazar', 'bajar de peso', 'lipo'] },
  { cat: 'minerales', words: ['magnesio', 'zinc', 'mineral'] },
  { cat: 'vegano', words: ['vegano', 'vegan', 'vegetal', 'soya', 'arveja', 'planta'] },
];

function scoreProduct(p: Product, clean: string): number {
  let score = 0;
  const name = norm(p.name);
  const tags = norm((p.tags || []).join(' '));
  const desc = norm(p.desc || '');
  const benefits = norm((p.benefits || []).join(' '));
  const blob = `${name} ${tags} ${desc} ${benefits}`;
  const nclean = norm(clean);

  for (const rule of CATEGORY_KEYWORDS) {
    for (const w of rule.words) {
      const term = norm(w);
      if (!term) continue;
      if (blob.includes(term)) {
        score += 4;
        if (name.includes(term)) score += 3;
      }
    }
  }

  for (const goal of p.goal || []) {
    const g = goal.toLowerCase();
    if (nclean.includes('musculo') && (g === 'ganancia-muscular' || g === 'fuerza')) score += 3;
    if (nclean.includes('fuerza') && g === 'fuerza') score += 4;
    if (nclean.includes('energia') && (g === 'energia' || g === 'rendimiento')) score += 3;
    if (nclean.includes('recuper') && (g === 'rendimiento' || g === 'bienestar')) score += 3;
    if (nclean.includes('adelgazar') || nclean.includes('bajar de peso')) if (g === 'control-peso') score += 5;
    if (nclean.includes('vegano') || nclean.includes('vegan')) if (g === 'vegano') score += 4;
    if (nclean.includes('salud') && (g === 'salud' || g === 'bienestar')) score += 3;
  }

  if (p.bestseller) score += 1;
  if (nclean.includes('barat') || nclean.includes('oferta') || nclean.includes('descuento')) score += Math.max(0, 4 - Math.round(p.price / 10000));

  return score;
}

export function findProductMatches(products: Product[], rawQuery: string, limit = 3) {
  const clean = norm(rawQuery);
  const scored = products
    .map((p) => ({ p, score: scoreProduct(p, clean) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    const featured = [...products]
      .filter((p) => p.bestseller && p.stock > 0)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);
    return featured.map((p) => ({ p, score: 0 }));
  }

  return scored.slice(0, limit);
}

function firstBenefit(p: Product): string {
  const b = p.benefits?.[0];
  if (!b) return '';
  return b.length > 110 ? `${b.slice(0, 110).trim()}...` : b;
}

function formatPriceLine(p: Product): string {
  return p.oldPrice && p.oldPrice > p.price
    ? `${formatPrice(p.oldPrice)} → ${formatPrice(p.price)}`
    : formatPrice(p.price);
}

function productBlock(p: Product, note?: string): string {
  const lines: string[] = [];
  lines.push(`• ${p.name}`);
  lines.push(`  💰 ${formatPriceLine(p)} · ${p.rating}★ (${p.reviews} reseñas)`);
  if (note) lines.push(`  🎯 ${note}`);
  const benefit = firstBenefit(p);
  if (benefit) lines.push(`  ✅ ${benefit}`);
  const uso =
    p.modoUso && p.modoUso.length > 120 ? `${p.modoUso.slice(0, 120).trim()}...` : p.modoUso;
  if (uso) lines.push(`  📘 Cómo usarlo: ${uso}`);
  lines.push(`   /productos/${p.slug}`);
  return lines.join('\n');
}

function buildPlan(
  heading: string,
  explanation: string,
  picks: Array<{ p: Product; note: string }>,
  closing: string,
): string {
  const blocks = picks.map(({ p, note }) => productBlock(p, note)).join('\n\n');
  return `${heading}\n\n${explanation}\n\n${blocks}\n\n${closing}`;
}

interface GoalPlan {
  match: (q: string) => boolean;
  heading: string;
  explanation: string;
  select: (products: Product[]) => Array<{ p: Product; note: string }>;
  closing: string;
}

const GOAL_PLANS: GoalPlan[] = [
  {
    match: (q) =>
      q.includes('musculo') ||
      q.includes('masa') ||
      q.includes('volumen') ||
      q.includes('crecer') ||
      q.includes('aumentar'),
    heading: '💪 Plan para GANAR MÚSCULO',
    explanation:
      'Para ganar masa muscular se combinan dos claves: suficiente proteína diaria (para reparar y construir fibra) y creatina (para más fuerza y volumen de entrenamiento). Este es el kit básico que recomendamos:',
    select: (products) => {
      const whey = [...products]
        .filter((p) => p.category === 'proteinas' && p.tags?.some((t) => t.includes('whey')))
        .sort((a, b) => (b.bestseller ? 1 : 0) - (a.bestseller ? 1 : 0) || b.rating - a.rating)[0];
      const prot = whey || products.find((p) => p.id === 4)!;
      const creat =
        findProductMatches(products, 'creatina', 6).find(({ p }) => p.category === 'creatinas')?.p ||
        products.find((p) => p.id === 31)!;
      return [
        { p: prot, note: 'Tu fuente de proteína de calidad, ideal después de entrenar.' },
        { p: creat, note: 'El complemento de fuerza para progresar en cada serie.' },
      ];
    },
    closing:
      '💡 Tip: hay un Pack Proteína + Creatina en oferta que junta ambas y te ahorra dinero. ¿Te lo muestro?',
  },
  {
    match: (q) => q.includes('fuerza') || q.includes('potencia') || q.includes('power'),
    heading: '🏋️ Plan para FUERZA Y POTENCIA',
    explanation:
      'Para levantar más peso y tener más potencia, la creatina es el suplemento con mayor respaldo científico. Es monohidrato puro, se acumula en el músculo y te da fuerza en las últimas repeticiones:',
    select: (products) => {
      const creat =
        findProductMatches(products, 'creatina', 6).find(({ p }) => p.category === 'creatinas')?.p ||
        products.find((p) => p.id === 31)!;
      const pump = products
        .filter(
          (p) =>
            p.tags?.some((t) => t.includes('oxido') || t.includes('citrulina') || t.includes('pump') || t.includes('arginina')),
        )
        .sort((a, b) => (b.bestseller ? 1 : 0) - (a.bestseller ? 1 : 0) || b.rating - a.rating)[0];
      const picks = [{ p: creat, note: 'El estándar de oro para fuerza y rendimiento.' }];
      if (pump) picks.push({ p: pump, note: 'Mejora el pump y la circulación durante el entreno.' });
      return picks;
    },
    closing:
      '💡 Tip: si tu meta es el mejor pump del entrenamiento, sumar un óxido nítrico antes de entrenar te ayuda mucho.',
  },
  {
    match: (q) => q.includes('energia') || q.includes('pre entreno') || q.includes('pre-entreno') || q.includes('preentreno') || q.includes('rendimiento'),
    heading: '⚡ Plan para ENERGÍA Y PRE-ENTRENO',
    explanation:
      'Para llegar con energía, enfoque y un buen pump al gimnasio, el óxido nítrico y los aminoácidos son la vía clásica. Estimulan la circulación y la resistencia sin los bajones del café:',
    select: (products) => {
      const rend = products
        .filter(
          (p) =>
            p.category === 'rendimiento' &&
            p.tags?.some((t) => t.includes('oxido') || t.includes('citrulina') || t.includes('arginina') || t.includes('pump')),
        )
        .sort((a, b) => (b.bestseller ? 1 : 0) - (a.bestseller ? 1 : 0) || b.rating - a.rating)[0];
      const picks: Array<{ p: Product; note: string }> = [];
      if (rend) picks.push({ p: rend, note: 'Energía, enfoque y pump antes de entrenar.' });
      const creat = products
        .filter((p) => p.category === 'creatinas')
        .sort((a, b) => (b.bestseller ? 1 : 0) - (a.bestseller ? 1 : 0) || b.rating - a.rating)[0];
      if (creat) picks.push({ p: creat, note: 'Resistencia y fuerza sostenidas sesión a sesión.' });
      return picks;
    },
    closing: '💡 ¿A qué hora entrenas? Te ajusto la recomendación al momento del día.',
  },
  {
    match: (q) => q.includes('dormir') || q.includes('sueno') || q.includes('estres') || q.includes('cansa') || q.includes('recuper') || q.includes('descans') || q.includes('relaj'),
    heading: '😴 Plan para RECUPERACIÓN Y DESCANSO',
    explanation:
      'El músculo crece cuando descansas. Para dormir profundo, bajar el estrés y acelerar la recuperación, estos son tus aliados de noche. Hay incluso un Combo Noche de Recuperación listo:',
    select: (products) => {
      const picks: Array<{ p: Product; note: string }> = [];
      const zma = products.find((p) => p.tags?.includes('zma'));
      if (zma) picks.push({ p: zma, note: 'Magnesio + zinc para dormir y recuperar el músculo.' });
      const melena = products.find((p) => p.tags?.some((t) => t.includes('melena')));
      if (melena) picks.push({ p: melena, note: 'Apoyo natural para calmar la mente y dormir mejor.' });
      if (picks.length === 0) {
        const mag = findProductMatches(products, 'magnesio', 6).find(({ p }) => p.category === 'minerales');
        if (mag) picks.push({ p: mag.p, note: 'El mineral clave para relajación y sueño.' });
      }
      return picks;
    },
    closing:
      '💡 Tenemos el "Combo Noche de Recuperación" (ZMA + Melena de León) a $25.000. ¿Te lo armo?',
  },
  {
    match: (q) => q.includes('adelgazar') || q.includes('bajar') || q.includes('peso') || q.includes('grasa') || q.includes('defin') || q.includes('slim') || q.includes('quema') || q.includes('control de peso'),
    heading: '🔥 Plan para CONTROL DE PESO Y DEFINICIÓN',
    explanation:
      'Ningún suplemento sustituye la dieta, pero sí puede apoyar el metabolismo, dar saciedad y ayudar a usar la grasa como energía. Esto recomiendo como apoyo:',
    select: (products) => {
      const picks: Array<{ p: Product; note: string }> = [];
      const quema = findProductMatches(products, 'quemador carnitina', 6).find(
        ({ p }) => p.category === 'control-peso',
      )?.p;
      if (quema) picks.push({ p: quema, note: 'Apoya el metabolismo y el uso de grasa como energía.' });
      const prot = findProductMatches(products, 'whey protein', 6).find(
        ({ p }) => p.category === 'proteinas',
      )?.p;
      if (prot) picks.push({ p: prot, note: 'Saciedad y proteína para no perder músculo en déficit.' });
      return picks;
    },
    closing: '💡 La proteína es super útil en definición: evita que bajes músculo junto con grasa.',
  },
  {
    match: (q) => q.includes('vegano') || q.includes('vegan') || q.includes('vegetar') || q.includes('planta') || q.includes('sin lactosa'),
    heading: '🌱 Plan PARA VEGANOS / VEGETARIANOS',
    explanation:
      'Perfecto, tenemos opciones 100% vegetales para que no sacrifiques ni ética ni resultados. La proteína vegana de guisante rinde igual que la whey para tu recuperación:',
    select: (products) => {
      const veg = findProductMatches(products, 'proteina vegana', 6).find(
        ({ p }) => p.goal?.includes('vegano'),
      )?.p;
      const picks: Array<{ p: Product; note: string }> = [];
      if (veg) picks.push({ p: veg, note: '24 g de proteína vegetal por porción, sin lácteos ni soya.' });
      const creat = products.find((p) => p.category === 'creatinas');
      if (creat) picks.push({ p: creat, note: 'La creatina es 100% apta vegana y no viene de animales.' });
      return picks;
    },
    closing: '💡 La creatina en polvo es vegana al 100%. La proteína de guisante es nuestra top recomendada.',
  },
  {
    match: (q) => q.includes('bienestar') || q.includes('salud') || q.includes('omega') || q.includes('vitamina') || q.includes('corazon') || q.includes('colesterol') || q.includes('defensa'),
    heading: '🌿 Plan para SALUD Y BIENESTAR',
    explanation:
      'Para el día a día, la base es un buen omega 3 y vitaminas que te cubran lo que la dieta no puede. Esto apoya corazón, colesterol e inmunidad:',
    select: (products) => {
      const picks: Array<{ p: Product; note: string }> = [];
      const omega = products
        .filter((p) => p.tags?.some((t) => t.includes('omega')))
        .sort((a, b) => (b.bestseller ? 1 : 0) - (a.bestseller ? 1 : 0) || b.rating - a.rating)[0];
      if (omega) picks.push({ p: omega, note: 'Corazón, inflamación y salud general.' });
      const vit = [...products]
        .filter((p) => p.category === 'vitaminas' || p.tags?.some((t) => t.includes('multivitam') || t.includes('vitamina c')))
        .sort((a, b) => (b.bestseller ? 1 : 0) - (a.bestseller ? 1 : 0) || b.rating - a.rating);
      const multivit = vit[0];
      if (multivit) picks.push({ p: multivit, note: 'Cobertura completa de micronutrientes a diario.' });
      return picks;
    },
    closing: '💡 ¿Buscas algo puntual como omega, vitamina C o colágeno? Pregúntame y lo afinamos.',
  },
];

function bestGoalPlan(q: string): GoalPlan | undefined {
  return GOAL_PLANS.find((plan) => plan.match(q));
}

const WHEY_EDU = `🥛 ¿QUÉ ES LA WHEY PROTEIN?

Es la proteína que se extrae del suero de la leche (el subproducto líquido al hacer queso). Es considerada la proteína de MÁS ALTO valor biológico que existe: tiene un perfil completo de los 9 aminoácidos esenciales que tu cuerpo no puede fabricar solo, y se digiere y absorbe muy rápido.

Por eso es la reina de la suplementación deportiva: en cuanto el cuerpo la recibe, los aminoácidos (especialmente los BCAAs: leucina, isoleucina y valina) entran al torrente y tu músculo los usa para repararse y crecer.

✨ Beneficios clave:
- 💪 Recuperación muscular: repara la fibra dañada tras el entreno y reduce el catabolismo.
- 📈 Crecimiento e hipertrofia: aporta los ladrillos (aminoácidos) para construir masa magra.
- ⏱️ Absorción rápida: ideal justo después de entrenar.
- 🍽️ Saciedad: ayuda a controlar el apetito, por eso también se usa en dietas de pérdida de peso.
- 💊 Extra (según la presentación): muchas vienen con BCAAs, glutamina, biotina, colágeno o coenzima Q10 (como la Whey Woman).

⏰ CUÁNDO TOMARLA
- Justo después de entrenar (ventana de recuperación): 1 porción en 200–250 ml de agua fría o leche descremada.
- Como refuerzo entre comidas (media mañana / media tarde) si no llegas a tu proteína diaria con la comida.

📐 CUÁNTA TOMAR
- La recomendación general es de 1,6–2,2 g de proteína por kilo de peso al día para objetivos de músculo.
- Ejemplo: si pesas 70 kg, apunta a ~112–154 g de proteína al día entre todo (comida + suplemento).
- Una porción típica rinde 21–28 g de proteína, según el producto.

🔄 CÓMO TOMARLA
- Mezclar 1 medida en agua fría o leche descremada (nunca agua caliente: desatura la proteína).
- Agitar bien en shaker para que no queden grumos.
- Se puede combinar con creatina en el mismo batido sin problema.

💡 MOTIVACIÓN: la whey es un complemento, no un sustituto. La base siempre debe ser una buena alimentación y entrenamiento constante.

📦 NUESTRAS OPCIONES DE WHEY

`;

function wheyCatalog(products: Product[]): string {
  const wheys = products
    .filter((p) => p.category === 'proteinas' && p.tags?.some((t) => t.toLowerCase().includes('whey')))
    .sort((a, b) => (b.bestseller ? 1 : 0) - (a.bestseller ? 1 : 0) || b.rating - a.rating);

  const lines = wheys.map((p) => {
    let line = `• ${p.name}`;
    line += `\n  💰 ${p.oldPrice && p.oldPrice > p.price ? `${formatPrice(p.oldPrice)} → ${formatPrice(p.price)}` : formatPrice(p.price)} · ${p.rating}★ (${p.reviews} reseñas)`;
    if (p.variants?.length) {
      line += `\n  🎨 Sabores: ${p.variants.map((v) => v.name).join(', ')}`;
    }
    const protInfo = p.nutrientes?.find(([k]) => k.toLowerCase().includes('prote'));
    if (protInfo) line += `\n  🥩 ${protInfo[0]}: ${protInfo[1]}`;
    line += `\n   /productos/${p.slug}`;
    return line;
  });

  return lines.length ? lines.join('\n\n') : '';
}

function buildWheyGuide(products: Product[], shippingLine: string): string {
  const catalog = wheyCatalog(products);
  return `${WHEY_EDU}${catalog}\n\nTodos 100% originales con sello. ${shippingLine}\n\n¿Quieres que te recomiende cuál elegir según tu objetivo, o te ayudo con otra cosa? 💪`;
}

function isWheyQuery(q: string): boolean {
  return (
    (q.includes('whey') || q.includes('proteina') || q.includes('suero') || q.includes('bcaa')) &&
    !q.includes('vegan') &&
    !q.includes('vegetal') &&
    !q.includes('guisante')
  );
}

function trimSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function hitStrategy(q: string, products: Product[]): string {
  const dir = {
    proteinas: ['proteina', 'whey', 'suero'],
    creatinas: ['creatina', 'monohidrato'],
    rendimiento: ['pre entreno', 'pre-entreno', 'preentreno', 'oxido nitrico', 'citrulina', 'arginina', 'bcaa', 'amino', 'pump'],
    vitaminas: ['vitamina', 'multivitam', 'vitamin'],
    minerales: ['magnesio', 'zinc', 'mineral'],
    bienestar: ['omega', 'ashwagandha', 'colageno', 'melena', 'zma', 'berberina', 'shilajit', 'melatonina'],
    'control-peso': ['quemador', 'carnitina', 'slim', 'keto'],
  } as const;

  for (const [cat, words] of Object.entries(dir)) {
    if (words.some((w) => hasTerm(q, w))) {      const list = products.filter((p) => p.category === cat).sort((a, b) => (b.bestseller ? 1 : 0) - (a.bestseller ? 1 : 0) || b.rating - a.rating);
      if (list.length) {
        const top = list.slice(0, 2).map((p) => productBlock(p));
        return `¡Claro! En **${cat === 'proteinas' ? 'Proteínas' : cat === 'creatinas' ? 'Creatinas' : cat === 'rendimiento' ? 'Rendimiento' : cat === 'vitaminas' ? 'Vitaminas' : cat === 'minerales' ? 'Minerales' : cat === 'bienestar' ? 'Bienestar' : 'Control de Peso'}** estos son los más elegidos:\n\n${top.join('\n\n')}\n\n¿Quieres que te recomiende el mejor según tu objetivo exacto?`;
      }
    }
  }
  return '';
}

export function generateRecommendation(
  rawQuery: string,
  products: Product[],
  ctx: RecommendContext,
): string {
  const intent = detectIntent(rawQuery);
  const q = norm(rawQuery);
  const shippingLine = ctx.freeShippingFrom > 0
    ? `Envío gratis en compras sobre ${formatPrice(ctx.freeShippingFrom)}.`
    : 'Tenemos envío coordinado.';

  // Explicit product name/link matching
  const slug = rawQuery.match(/\/productos\/([a-z0-9-]+)/i)?.[1];
  if (slug) {
    const p = products.find((x) => x.slug === slug);
    if (p) {
      return `Este es el detalle de **${p.name}**\n\n💰 ${formatPriceLine(p)} · ${p.rating}★ (${p.reviews} reseñas)\n\n${p.desc}\n\n📘 Modo de uso: ${p.modoUso}\n\nValoración: ${p.rating}★ de 5 con ${p.reviews} reseñas. 100% original. ${shippingLine}\n\n¿Te lo agrego al carrito o te ayudo con otra cosa? 💪`;
    }
  }

  // Direct product name search (e.g. "creatina eco naturales")
  const direct = products.find((p) => p.slug === trimSlug(rawQuery));
  if (direct) {
    return `Este es el detalle de **${direct.name}**\n\n💰 ${formatPriceLine(direct)} · ${direct.rating}★ (${direct.reviews} reseñas)\n\n${direct.desc}\n\n📘 Modo de uso: ${direct.modoUso}\n\n100% original. ${shippingLine}\n\n¿Te lo agrego al carrito? 💪`;
  }

  switch (intent) {
    case 'shipping': {
      return `🚇 ¡Claro! Arreglamos así la entrega:
- Entregamos en todas las estaciones de Metro de Santiago (líneas 1, 2, 3, 4, 4A, 5 y 6).
- ${shippingLine}
- Coordinamos la estación y el horario por WhatsApp, normalmente en 24–48 hrs.

¿Quieres que te recomiende algo para tu pedido?`;
    }
    case 'payment': {
      return `💳 Nuestros métodos de pago:
- Transferencia bancaria antes del despacho.
- Efectivo contra entrega en la estación de Metro.
No manejamos tarjetas ni pago online por ahora, pero es súper simple. ¿En qué te ayudo?`;
    }
    case 'warranty': {
      return `🛡️ Tu compra está protegida:
- 100% productos originales con sello y trazabilidad.
- Garantía de satisfacción de 30 días en productos sin abrir y con sello intacto.
- Si algo no te convence, te devolvemos tu dinero. ¿Necesitas más info?`;
    }
    case 'trust': {
      return `✅ Tranquilo, en NutriFit:
- Trabajamos con distribuidores oficiales y marcas certificadas (FullEnergic, FNL, Rain, Eco Naturales, entre otras).
- Todos los productos tienen sello de garantía y fecha de vencimiento visible.
- Más de 500 pedidos entregados y valoración 4.9/5.

¿Te recomendamos algo?`;
    }
    case 'contact': {
      return `📞 Puedes hablarnos directo por WhatsApp al ${ctx.whatsapp || BRAND.whatsapp} (${
        ctx.whatsapp || BRAND.whatsapp
      }).
Atendemos de lunes a sábado, 10:00 a 20:00 hrs. ¡Te respondemos al tiro!`;
    }
    case 'greeting': {
      return `¡Hola! 👋 Soy el asistente virtual de NutriFit. Te ayudo a elegir el suplemento ideal según tu objetivo (músculo, fuerza, energía, bienestar o control de peso) y resuelvo dudas de envío y pago.

Dime, por ejemplo:
- "Quiero ganar músculo"
- "Creatina para fuerza"
- "Algo para dormir mejor"

¿En qué te ayudo hoy?`;
    }
    case 'product_question': {
      const matches = findProductMatches(products, rawQuery, 3);
      if (matches.length > 0) {
        const blocks = matches.map(({ p }) => productBlock(p));
        return `Estas son las mejores opciones según lo que buscas, con su detalle:\n\n${blocks.join('\n\n')}\n\nTodas 100% originales. ¿Te ayudo a decidir o eliges alguna? 😊`;
      }
      return 'Hmm, no encontré un producto exacto con esa descripción, pero puedo recomendarte según tu objetivo. ¿Qué buscas: músculo, fuerza, energía o bienestar?';
    }
    case 'recommend':
    default: {
      const plan = bestGoalPlan(q);
      if (plan) {
        return buildPlan(plan.heading, plan.explanation, plan.select(products), plan.closing);
      }

      // Deep dive educativo sobre whey/proteína (sin objetivo claro definido)
      const goalTerms = ['musculo', 'masa', 'fuerza', 'potencia', 'adelgazar', 'bajar', 'peso', 'dormir', 'vegano', 'energia', 'bienestar', 'recuper'];
      if (isWheyQuery(q) && !goalTerms.some((t) => q.includes(t))) {
        return buildWheyGuide(products, shippingLine);
      }

      const strategy = hitStrategy(q, products);
      if (strategy) return strategy;

      const matches = findProductMatches(products, rawQuery, 3);
      if (matches.length === 0) {
        return `Podemos orientarte mejor: dime tu objetivo y te sugiero el mejor suplemento de nuestro catálogo.
- 🥩 Ganar músculo (proteína + creatina)
- 🏋️ Fuerza (creatina)
- ⚡ Energía / pre-entreno
- 🌿 Salud y bienestar (omega, vitaminas)
- 🔥 Control de peso

O pregúntame por un producto puntual y te paso su detalle completo.`;
      }
      const blocks = matches.map(({ p }) => productBlock(p));
      return `Aquí tienes mis recomendaciones con su detalle:\n\n${blocks.join('\n\n')}\n\nTodos 100% originales. ${shippingLine} ¿Quieres que ordene algo por ti o te ayudo con otra cosa? 💪`;
    }
  }
}

export function quickChips(): string[] {
  return [
    'Quiero ganar músculo',
    'Creatina para fuerza',
    'Energía pre-entreno',
    '¿Tienen envío gratis?',
    'Omega 3',
    'Vegano',
  ];
}
