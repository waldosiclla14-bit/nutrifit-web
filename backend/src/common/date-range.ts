import { BadRequestException } from '@nestjs/common';

// All user-facing date filters are America/Santiago calendar days.
// The DB stores timestamptz (UTC); the server runs on UTC. Converting a bare
// "YYYY-MM-DD" with `new Date()` silently shifts the window by 3-4 hours AND
// an inclusive `lte` on midnight excludes the whole end day. These helpers
// make every range mean "the full local day(s) in Chile".

const TZ = 'America/Santiago';
const BARE_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function santiagoOffsetMinutes(instant: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(instant)) parts[p.type] = p.value;
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return Math.round((asUTC - instant.getTime()) / 60000);
}

function parseParts(iso: string): { y: number; mo: number; d: number } {
  const m = BARE_DATE.exec(iso.trim());
  if (!m) throw new BadRequestException('Fecha inválida (se espera YYYY-MM-DD)');
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const check = new Date(Date.UTC(y, mo - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) {
    throw new BadRequestException('Fecha inválida');
  }
  return { y, mo, d };
}

/** Start (00:00 Santiago) of a bare date, as UTC Date. */
export function startOfChileDay(iso: string): Date {
  const { y, mo, d } = parseParts(iso);
  const noonUTC = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
  const off = santiagoOffsetMinutes(noonUTC);
  return new Date(Date.UTC(y, mo - 1, d, 0, 0, 0) - off * 60000);
}

/** Full Chile-day range [00:00, 24:00) as { gte, lt } UTC Dates. */
export function chileDayRange(iso: string): { gte: Date; lt: Date } {
  const start = startOfChileDay(iso);
  const { y, mo, d } = parseParts(iso);
  const base = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
  base.setUTCDate(base.getUTCDate() + 1);
  const off = santiagoOffsetMinutes(base);
  const end = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), 0, 0, 0) - off * 60000);
  return { gte: start, lt: end };
}

/**
 * Range bound for query filters. Bare "YYYY-MM-DD" values resolve against
 * the America/Santiago calendar (start-of-day for `from`, end-of-day for
 * `to`, both inclusive-safe). Full datetimes keep legacy `new Date()` behavior.
 */
export function rangeBound(value: string, isEnd: boolean): Date {
  if (BARE_DATE.test(value.trim())) {
    const { gte, lt } = chileDayRange(value.trim());
    if (!isEnd) return gte;
    return new Date(lt.getTime() - 1);
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new BadRequestException('Fecha inválida');
  return d;
}

/** Current calendar day in America/Santiago as YYYY-MM-DD. */
export function todayChileISO(from: Date = new Date()): string {
  const dtf = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
  return dtf.format(from);
}
