import type { BlogPost } from '@/types';

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'que-proteina-elegir',
    title: '¿Qué proteína elegir según tu objetivo?',
    excerpt:
      'Guía completa para entender las diferencias entre Whey, Caseína y proteína vegana.',
    category: 'Guías',
    readTime: '5 min',
    date: '2026-07-20',
    blocks: [
      {
        type: 'h2',
        text: 'Whey Protein: la clásica para ganar masa',
      },
      {
        type: 'p',
        text: 'La proteína de suero de leche (whey) se absorbe rápido y tiene un perfil completo de aminoácidos, incluyendo BCAAs. Es ideal para tomar después de entrenar, cuando tu cuerpo necesita recuperarse lo antes posible.',
      },
      {
        type: 'ul',
        items: [
          'Objetivo: ganancia muscular y recuperación.',
          'Cuándo: post-entreno o como refuerzo proteico durante el día.',
          'Dosis: 1 porción de 25–30 g, una o dos veces al día.',
        ],
      },
      {
        type: 'h2',
        text: 'Proteína vegana: rendimiento sin lácteos',
      },
      {
        type: 'p',
        text: 'Las proteínas vegetales (soya, arveja) combinan fuentes para lograr un perfil completo de aminoácidos. Si no consumes lácteos, son tu mejor alternativa y rinden igual en recuperación.',
      },
      {
        type: 'ul',
        items: [
          'Objetivo: misma recuperación, cero lactosa.',
          'Ideal para personas veganas o con intolerancia a la lactosa.',
          'Combina soya + arveja para un perfil completo.',
        ],
      },
      {
        type: 'h2',
        text: 'Proteína de liberación lenta',
      },
      {
        type: 'p',
        text: 'La caseína se digiere despacio y libera aminoácidos de forma sostenida. Es perfecta antes de dormir o en periodos largos sin comer, para evitar el catabolismo nocturno.',
      },
    ],
  },
  {
    slug: 'creatina-guia-completa',
    title: 'Creatina: todo lo que necesitas saber',
    excerpt: 'Beneficios, dosis recomendada y mitos comunes sobre la creatina monohidratada.',
    category: 'Educación',
    readTime: '7 min',
    date: '2026-07-12',
    blocks: [
      {
        type: 'h2',
        text: '¿Qué es la creatina?',
      },
      {
        type: 'p',
        text: 'Es uno de los suplementos con más evidencia científica del deporte. La creatina monohidrato aumenta la disponibilidad de fosfocreatina muscular, mejorando la fuerza, la potencia y la capacidad de entrenar más duro en series cortas de alta intensidad.',
      },
      {
        type: 'h2',
        text: '¿Cómo se toma?',
      },
      {
        type: 'ul',
        items: [
          'Dosis: 5 g al día, todos los días, incluso los de descanso.',
          'Con agua o jugo, con o sin comida (se absorbe mejor con carbohidratos).',
          'No es necesaria una fase de carga: la saturación llega en 2–4 semanas.',
        ],
      },
      {
        type: 'h2',
        text: 'Mitos comunes',
      },
      {
        type: 'ul',
        items: [
          'Mito: "La creatina daña los riñones". Es seguro en dosis normales para personas sanas.',
          'Mito: "Retiene agua y me hincha". La retención intramuscular es leve y es parte del mecanismo.',
          'Mito: "Solo sirve para hipertrofia". También mejora rendimiento en deportes explosivos.',
        ],
      },
    ],
  },
  {
    slug: 'stack-suplementos',
    title: 'Cómo armar tu stack de suplementos',
    excerpt: 'Las combinaciones ideales para ganar masa, perder grasa o mejorar rendimiento.',
    category: 'Consejos',
    readTime: '6 min',
    date: '2026-06-28',
    blocks: [
      {
        type: 'h2',
        text: 'Ganar masa muscular',
      },
      {
        type: 'p',
        text: 'La base es un superávit calórico y entrenamiento de fuerza. Los suplementos acompañan, no reemplazan. Un stack clásico para volumen es whey + creatina.',
      },
      {
        type: 'ul',
        items: [
          'Whey Protein: para cubrir tus proteínas diarias (1.6–2 g por kg).',
          'Creatina monohidrato: para más fuerza y volumen de entrenamiento.',
        ],
      },
      {
        type: 'h2',
        text: 'Perder grasa manteniendo músculo',
      },
      {
        type: 'p',
        text: 'En déficit calórico prioriza mantener proteínas altas y energía para entrenar. Aquí el proteína + energía es la combinación clave.',
      },
      {
        type: 'ul',
        items: [
          'Proteína vegana o whey: saciedad y preservación muscular.',
          'Vitaminas y minerales: para cubrir carencias en dietas restrictivas.',
        ],
      },
      {
        type: 'h2',
        text: 'Mejorar rendimiento',
      },
      {
        type: 'p',
        text: 'Si tu foco es rendir más en cada sesión, la creatina y un buen pre-entreno con óxido nítrico marcan la diferencia en intensidad y bombeo.',
      },
      {
        type: 'ul',
        items: [
          'Creatina: fuerza y potencia sostenida.',
          'Pre-entreno / óxido nítrico: energía, foco y vasodilatación.',
        ],
      },
    ],
  },
];
