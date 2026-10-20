/**
 * Genera los íconos "NF" de NutriFit desde SVG vectorial (solo paths:
 * render fiable en cualquier SO, sin fuentes del sistema).
 *
 * Salidas:
 *   src/app/icon.png, src/app/apple-icon.png, src/app/favicon.ico
 *   public/icons/icon-192.png, icon-512.png, icon-512-maskable.png
 *
 * Uso: node scripts/gen-icons.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GREEN = '#72BF44';

// Monograma NF geométrico (viewBox 512): N x66..266 · F x306..446 · y136..376
const NF_PATHS = `
  <polygon points="66,136 114,136 218,316 218,136 266,136 266,376 218,376 114,196 114,376 66,376" fill="${GREEN}"/>
  <polygon points="306,136 446,136 446,184 354,184 354,246 421,246 421,294 354,294 354,376 306,376" fill="${GREEN}"/>
`;

function svg({ background = null, scale = 1 }) {
  const bg = background
    ? `<rect width="512" height="512" fill="${background}"/>`
    : '';
  const body =
    scale === 1
      ? NF_PATHS
      : `<g transform="translate(256 256) scale(${scale}) translate(-256 -256)">${NF_PATHS}</g>`;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${bg}${body}</svg>`,
  );
}

const png = (opts, size) =>
  sharp(svg(opts)).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

// ICO mínimo con PNGs embebidos (formato válido desde Windows Vista)
function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  const dir = [];
  let offset = 6 + entries.length * 16;
  for (const { buf, size } of entries) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(buf.length, 8);
    e.writeUInt32LE(offset, 12);
    dir.push(e);
    offset += buf.length;
  }
  return Buffer.concat([header, ...dir, ...entries.map((x) => x.buf)]);
}

mkdirSync(join(ROOT, 'src/app'), { recursive: true });
mkdirSync(join(ROOT, 'public/icons'), { recursive: true });

const plain = {};
for (const size of [16, 32, 48, 64, 192, 512]) {
  plain[size] = await png({}, size);
}
const apple = await png({ background: '#FFFFFF', scale: 0.85 }, 180);
const maskable = await png({ background: '#0A0A0A', scale: 0.85 }, 512);

writeFileSync(join(ROOT, 'src/app/icon.png'), plain[512]);
writeFileSync(join(ROOT, 'src/app/apple-icon.png'), apple);
writeFileSync(
  join(ROOT, 'src/app/favicon.ico'),
  buildIco(
    [16, 32, 48, 64].map((size) => ({ size, buf: plain[size] })),
  ),
);
writeFileSync(join(ROOT, 'public/icons/icon-192.png'), plain[192]);
writeFileSync(join(ROOT, 'public/icons/icon-512.png'), plain[512]);
writeFileSync(join(ROOT, 'public/icons/icon-512-maskable.png'), maskable);

console.log('Iconos NF generados: icon.png, apple-icon.png, favicon.ico, icons/*');
