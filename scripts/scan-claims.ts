/**
 * Busca afirmaciones de salud, resultados garantizados y testimonios en el
 * contenido del sitio y escribe un informe en `docs/claims-review.md`.
 *
 * Uso:
 *   npm run scan:claims
 *
 * No modifica contenido ni oculta nada: solo lista lo que hay que revisar.
 * Los textos de reseñas de clientes viven en la base de datos (API), así que
 * este script no puede leerlas; el informe lo deja anotado como pendiente.
 *
 * Regla del proyecto: ninguna afirmación de efecto terapéutico puede
 * publicarse sin respaldo verificable (AGENTS.md §7 y docs/MEJORAS.md 1.4).
 */
import fs from 'node:fs';
import path from 'node:path';

type Severity = 'alta' | 'media' | 'baja';

type Rule = {
  /** Etiqueta que se muestra en el informe. */
  label: string;
  severity: Severity;
  pattern: RegExp;
  /** Por qué se marca. */
  note: string;
};

/**
 * Términos de partida de docs/MEJORAS.md (1.4) más variantes habituales.
 * Los patrones ignoran mayúsculas y tildes: el contenido se normaliza antes.
 */
const RULES: Rule[] = [
  // Enfermedad / efecto terapéutico: lo más delicado.
  {
    label: 'enfermedad o síntoma',
    severity: 'alta',
    pattern:
      /\b(colesterol|corazon|cardiovascular|diabetes|hipertension|higado|rinon|tiroides|ansiedad|depresion|inflamacion|cancer|anemia|osteoporosis)\b/,
    note: 'Sugiere efecto sobre una enfermedad o un síntoma clínico.',
  },
  {
    label: 'verbo terapéutico',
    severity: 'alta',
    pattern: /\b(cura|cura[rn]?|trata|tratar|previene|prevenir|revierte|desinflama|regula)\b/,
    note: 'Promete curar, tratar o prevenir: es una declaración terapéutica.',
  },
  {
    label: 'quemador / testosterona',
    severity: 'alta',
    pattern: /\b(quemador|quema ?grasa|termogenico|testosterona|testo\b|anabolico)/,
    note: 'Alegación hormonal o de pérdida de grasa con alto riesgo regulatorio.',
  },
  {
    label: 'sistema inmunitario',
    severity: 'media',
    pattern: /\b(inmunidad|inmunologico|defensas|sistema inmune)\b/,
    note: 'Solo admisible con redacción y respaldo autorizados.',
  },
  {
    label: 'digestión',
    severity: 'media',
    pattern: /\b(digestion|digestivo|intestinal|flora intestinal|probiótico|probióticos)\b/,
    note: 'Puede leerse como beneficio terapéutico si no está acotado.',
  },

  // Resultados: promesas absolutas.
  {
    label: 'resultado garantizado',
    severity: 'alta',
    pattern: /\b(garantizad[oa]s?|resultados? (seguros?|garantizados?)|100 ?% efectivo|sin fallar)\b/,
    note: 'Promete un resultado que no se puede garantizar.',
  },
  {
    label: 'rapidez o magnitud',
    severity: 'media',
    pattern:
      /\b(rapido aumento|aumento muscular rapido|en \d+ (dias|semanas)|pierde \d+|baja \d+ kilos?|resultados en)\b/,
    note: 'Plazo o magnitud concreta sin evidencia aplicable al producto.',
  },
  {
    label: 'sin grasa / sin calorías',
    severity: 'media',
    pattern: /\b(sin grasas?|cero grasas?|sin calorias|quema calorias)\b/,
    note: 'Afirmación nutricional absoluta: requiere respaldo por porción.',
  },
  {
    label: 'superlativo',
    severity: 'baja',
    pattern: /\b(el mejor|la mejor|numero 1|n[°º]?1|unico en el mercado|milagro|definitivo)\b/,
    note: 'Comparación no demostrable.',
  },
  {
    label: 'testimonio causal',
    severity: 'media',
    pattern: /\b(me (ayudo|ayudó|sirvio|sirvió|funciono|funcionó)|ayudo con|ayudó con|me cambio la vida)\b/,
    note: 'Testimonio que atribuye un efecto: no es evidencia y puede inducir a error.',
  },
];

/** Archivos con copy visible para el cliente. */
const TARGETS = [
  'src/data/seed.ts',
  'src/components/home/HeroSection.tsx',
  'src/components/home/FAQ.tsx',
  'src/components/home/Guarantee.tsx',
  'src/components/home/TrustStrip.tsx',
  'src/components/home/UGCProof.tsx',
  'src/app/(public)/sobre-nosotros/page.tsx',
  'src/app/(public)/terminos/page.tsx',
  'src/app/(public)/privacidad/page.tsx',
];

const ROOT = process.cwd();

/** Quita tildes y baja a minúsculas para que el patrón no dependa de ellas. */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/** Limpia el texto de una línea de código para poder leerlo en el informe. */
function readable(line: string): string {
  return line
    .replace(/^\s*[\w"'`]+:\s*/, '')
    .replace(/[`{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);
}

type Finding = {
  file: string;
  line: number;
  rule: Rule;
  text: string;
};

function scanFile(relative: string): Finding[] {
  const absolute = path.join(ROOT, relative);
  if (!fs.existsSync(absolute)) return [];

  const lines = fs.readFileSync(absolute, 'utf8').split(/\r?\n/);
  const findings: Finding[] = [];

  lines.forEach((raw, index) => {
    const trimmed = raw.trim();
    // Se ignora lo que no es copy: comentarios, imports y líneas muy cortas.
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('import ')) {
      return;
    }

    const normalized = normalize(raw);
    for (const rule of RULES) {
      if (rule.pattern.test(normalized)) {
        findings.push({ file: relative, line: index + 1, rule, text: readable(raw) });
        break;
      }
    }
  });

  return findings;
}

const ORDER: Record<Severity, number> = { alta: 0, media: 1, baja: 2 };
const SEVERITY_LABEL: Record<Severity, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

const findings = TARGETS.flatMap(scanFile).sort(
  (a, b) =>
    ORDER[a.rule.severity] - ORDER[b.rule.severity] ||
    a.file.localeCompare(b.file) ||
    a.line - b.line,
);

const bySeverity = (severity: Severity) =>
  findings.filter((f) => f.rule.severity === severity);

const now = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'America/Santiago',
}).format(new Date());

const rows = findings.length
  ? findings
      .map(
        (f, i) =>
          `| ${i + 1} | ${SEVERITY_LABEL[f.rule.severity]} | \`${f.file}:${f.line}\` | ${f.rule.label} | ${f.text.replace(/\|/g, '\\|')} |`,
      )
      .join('\n')
  : '| — | — | — | — | Sin coincidencias |';

const report = `# Revisión de afirmaciones y testimonios

> Generado por \`scripts/scan-claims.ts\` el ${now} (America/Santiago).
> **Este informe no cambia contenido.** Cada hallazgo requiere decisión del dueño:
> mantener (con respaldo), reescribir o quitar.

## Resumen

| Severidad | Hallazgos |
|---|---|
| Alta | ${bySeverity('alta').length} |
| Media | ${bySeverity('media').length} |
| Baja | ${bySeverity('baja').length} |
| **Total** | **${findings.length}** |

Regla aplicada: una afirmación de efecto terapéutico, un resultado garantizado o
un testimonio causal **no se publica** sin fuente verificable y redacción
aprobada (AGENTS.md §7). La evidencia de un ingrediente no respalda un producto.

## Hallazgos

| # | Severidad | Ubicación | Tipo | Texto |
|---|---|---|---|---|
${rows}

## Criterios de revisión

- **Alta**: retirar o reformular antes de volver a publicar. Incluye enfermedad,
  cura/tratamiento, hormonas, \"quemador\" y resultados garantizados.
- **Media**: se puede mantener solo si está acotado a lo que el producto es
  (por ejemplo, \"aporta proteína\") y sin prometer un efecto clínico.
- **Baja**: superlativos y comparaciones; se prefieren descripciones concretas.

## Qué no cubre este informe

- **Reseñas de clientes**: viven en la base de datos y se leen por la API
  (\`/api/reviews\`). Hay que revisarlas desde el panel o con una consulta a la
  base; el script no inventa su contenido.
- **Imágenes y videos**: las etiquetas y empaques pueden incluir claims que no
  están en el texto del sitio.
- **Ficha técnica de cada producto**: la revisión de composición y dosis es la
  del Laboratorio NutriFit, no este barrido de copy.

## Siguiente paso

1. El dueño marca cada fila: mantener / reescribir / quitar.
2. Lo que se mantenga necesita fuente en \`sources\` y redacción aprobada.
3. Volver a correr \`npm run scan:claims\` y comparar el conteo con este informe.
`;

const output = path.join(ROOT, 'docs', 'claims-review.md');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, report, 'utf8');

console.log(`Hallazgos: ${findings.length} (alta ${bySeverity('alta').length}, media ${bySeverity('media').length}, baja ${bySeverity('baja').length})`);
console.log(`Informe: docs/claims-review.md`);
