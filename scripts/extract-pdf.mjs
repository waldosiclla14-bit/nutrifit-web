/**
 * Extrae texto de un PDF sin dependencias externas: descomprime los streams
 * (FlateDecode) y recupera los operadores de texto Tj / TJ.
 *
 * Uso: node scripts/extract-pdf.mjs <archivo.pdf> [maxChars]
 */
import { readFileSync } from 'node:fs';
import { inflateSync, inflateRawSync } from 'node:zlib';

const file = process.argv[2];
const maxChars = Number(process.argv[3] || 20000);
if (!file) {
  console.error('Uso: node scripts/extract-pdf.mjs <archivo.pdf> [maxChars]');
  process.exit(1);
}

const buf = readFileSync(file);
const raw = buf.toString('latin1');

const chunks = [];
const re = /stream\r?\n/g;
let m;
while ((m = re.exec(raw)) !== null) {
  const start = m.index + m[0].length;
  const end = raw.indexOf('endstream', start);
  if (end === -1) continue;
  const slice = buf.subarray(start, end);
  try {
    chunks.push(inflateSync(slice).toString('latin1'));
  } catch {
    try {
      chunks.push(inflateRawSync(slice).toString('latin1'));
    } catch {
      // stream no comprimido o con filtro desconocido
    }
  }
}

function decodeText(s) {
  // Octal escapes <XX> y escapes
  return s
    .replace(/\\([nrtbf()\\])/g, (_, c) => ({ n: '\n', r: '\r', t: '\t', b: '', f: '' }[c] ?? c))
    .replace(/\\([0-7]{1,3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)))
    .replace(/\\([0-9]{1,3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)));
}

const out = [];
for (const content of chunks) {
  if (!content.includes('Tj') && !content.includes('TJ')) continue;
  // (texto) Tj   y   [(a) -10 (b)] TJ
  const tj = /\((?:\\.|[^\\()])*\)\s*Tj/g;
  const tJ = /\[((?:[^\][]|\\.)*)\]\s*TJ/g;
  let mm;
  while ((mm = tj.exec(content)) !== null) {
    out.push(decodeText(mm[0].slice(1, mm[0].lastIndexOf(')'))));
  }
  while ((mm = tJ.exec(content)) !== null) {
    const parts = mm[1].match(/\((?:\\.|[^\\()])*\)/g) || [];
    out.push(parts.map((p) => decodeText(p.slice(1, -1))).join(''));
  }
}

const text = out.join('\n');
console.log(text.slice(0, maxChars));
console.log(`\n--- caracteres extraídos: ${text.length}`);
