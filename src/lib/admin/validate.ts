export function normalizeHeader(h: string) {
  return h.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function parseNum(v: unknown) {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(String(v).replace(/\./g, '').replace(',', '.'));
  return Number.isNaN(n) ? undefined : n;
}