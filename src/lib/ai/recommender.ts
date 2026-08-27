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

function detectIntent(query: string): Intent {
  const q = query.toLowerCase();
  for (const rule of INTENT_RULES) {
    if (rule.words.some((w) => q.includes(w))) {
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
  const name = p.name.toLowerCase();
  const tags = (p.tags || []).join(' ').toLowerCase();
  const desc = (p.desc || '').toLowerCase();
  const benefits = (p.benefits || []).join(' ').toLowerCase();
  const blob = `${name} ${tags} ${desc} ${benefits}`;

  for (const rule of CATEGORY_KEYWORDS) {
    for (const w of rule.words) {
      const term = w.trim();
      if (!term) continue;
      if (blob.includes(term)) {
        score += 4;
        if (name.includes(term)) score += 3;
      }
    }
  }

  for (const goal of p.goal || []) {
    const g = goal.toLowerCase();
    if (clean.includes('musculo') && (g === 'ganancia-muscular' || g === 'fuerza')) score += 3;
    if (clean.includes('fuerza') && g === 'fuerza') score += 4;
    if (clean.includes('energia') && (g === 'energia' || g === 'rendimiento')) score += 3;
    if (clean.includes('recuper') && (g === 'rendimiento' || g === 'bienestar')) score += 3;
    if (clean.includes('adelgazar') || clean.includes('bajar de peso')) if (g === 'control-peso') score += 5;
    if (clean.includes('vegano') || clean.includes('vegan')) if (g === 'vegano') score += 4;
    if (clean.includes('salud') && (g === 'salud' || g === 'bienestar')) score += 3;
  }

  if (p.bestseller) score += 1;
  if (clean.includes('barat') || clean.includes('oferta') || clean.includes('descuento')) score += Math.max(0, 4 - Math.round(p.price / 10000));

  return score;
}

export function findProductMatches(products: Product[], rawQuery: string, limit = 3) {
  const clean = rawQuery.toLowerCase();
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

function formatMatchList(matches: Array<{ p: Product; score: number }>): string {
  return matches
    .map(({ p, score }) => {
      const price = p.oldPrice && p.oldPrice > p.price ? `~~${formatPrice(p.oldPrice)}~~ ${formatPrice(p.price)}` : formatPrice(p.price);
      const star = score >= 0 ? `${p.rating}★ (${p.reviews} reseñas)` : '';
      return `• ${p.name} — ${price} ${star}\n   /productos/${p.slug}`;
    })
    .join('\n');
}

export function generateRecommendation(
  rawQuery: string,
  products: Product[],
  ctx: RecommendContext,
): string {
  const intent = detectIntent(rawQuery);
  const q = rawQuery.toLowerCase();
  const shippingLine = ctx.freeShippingFrom > 0
    ? `Envío gratis en compras sobre ${formatPrice(ctx.freeShippingFrom)}.`
    : 'Tenemos envío coordinado.';

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
      return `¡Hola! 👋 Soy el asistente virtual de NutriFit. Te ayudo a elegir el suplemento ideal según tu objetivo, o a resolver dudas de envío y pago. ¿En qué te ayudo hoy?`;
    }
    case 'product_question': {
      const matches = findProductMatches(products, rawQuery, 3);
      if (matches.length > 0) {
        return `Te dejo las mejores opciones según lo que buscas:\n\n${formatMatchList(matches)}\n\nPuedes ver el detalle completo tocando el enlace, y agregarlo al carrito. ¿Te ayudo con otro? 😊`;
      }
      return 'Hmm, no encontré un producto exacto con esa descripción, pero puedo recomendarte según tu objetivo. ¿Qué buscas: músculo, fuerza, energía o bienestar?';
    }
    case 'recommend':
    default: {
      const matches = findProductMatches(products, rawQuery, 3);
      if (matches.length === 0) {
        return `Podemos orientarte mejor: dime tu objetivo y te sugiero el mejor suplemento de nuestro catálogo.
- Ganar músculo (proteína + creatina)
- Fuerza (creatina)
- Energía / pre-entreno
- Salud y bienestar (omega, vitaminas)
- Control de peso`;
      }
      return `Te recomiendo estos según tu objetivo:\n\n${formatMatchList(matches)}\n\nTodos son 100% originales. ${shippingLine} ¿Quieres que ordene algo por ti o te ayudo con otra cosa? 💪`;
    }
  }
}

export function quickChips(): string[] {
  return [
    'Recomiéndame una proteína',
    'Creatina para fuerza',
    'Energía pre-entreno',
    '¿Tienen envío gratis?',
    'Omega 3',
    'Vegano',
  ];
}
