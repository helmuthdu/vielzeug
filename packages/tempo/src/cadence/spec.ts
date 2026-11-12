import { Temporal } from '@js-temporal/polyfill';

import { CadenceError, fail } from '../errors';
import type { CadenceByDay, CadenceFrequency, CadenceSpec, CadenceWeekday } from './types';

const FREQUENCIES: readonly CadenceFrequency[] = [
  'daily',
  'hourly',
  'minutely',
  'monthly',
  'secondly',
  'weekly',
  'yearly',
];

const WEEKDAY_TOKENS: readonly string[] = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

function bad(detail: string): never {
  return fail(detail, CadenceError);
}

/** Parse a bounded integer list part (`BYMONTH`, `BYMONTHDAY`, …) with range and sign rules. */
function parseInts(
  value: string,
  { max, min, nonzero, allowNegative }: { allowNegative?: boolean; max: number; min: number; nonzero?: boolean },
): number[] {
  const parts = value.split(',');
  const seen = new Set<number>();
  for (const part of parts) {
    if (!/^-?\d+$/.test(part)) bad(`invalid number "${part}"`);
    const num = Number(part);
    if (allowNegative !== true && num < 0) bad(`negative value ${part} is not allowed here`);
    if (nonzero === true && num === 0) bad('value must be non-zero');
    if (num < min || num > max) bad(`value ${part} outside ${min}..${max}`);
    seen.add(num);
  }
  return [...seen].sort((a, b) => a - b);
}

function parseWeekdayToken(token: string): CadenceWeekday {
  const index = WEEKDAY_TOKENS.indexOf(token);
  if (index === -1) bad(`unknown weekday "${token}"`);
  return index as CadenceWeekday;
}

function parseByDay(value: string): CadenceByDay[] {
  const seen = new Set<string>();
  const entries: CadenceByDay[] = [];
  for (const part of value.split(',')) {
    const match = /^([+-]?\d{1,2})?(SU|MO|TU|WE|TH|FR|SA)$/.exec(part);
    if (match === null) bad(`invalid BYDAY entry "${part}"`);
    const weekday = parseWeekdayToken(match[2]);
    let n: number | undefined;
    if (match[1] !== undefined) {
      n = Number(match[1]);
      if (n === 0 || n < -53 || n > 53) bad(`invalid BYDAY ordinal "${match[1]}"`);
    }
    const key = `${n ?? ''}:${weekday}`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push(n === undefined ? { weekday } : { n, weekday });
  }
  return entries.sort((a, b) => (a.n ?? 0) - (b.n ?? 0) || a.weekday - b.weekday);
}

function parseUntil(value: string): Temporal.Instant {
  try {
    if (/Z$/.test(value)) return Temporal.Instant.from(value);
    return Temporal.PlainDateTime.from(value).toZonedDateTime('UTC').toInstant();
  } catch {
    return bad(`invalid UNTIL instant "${value}"`);
  }
}

/**
 * Parse an RFC 5545 recurrence rule string into a validated {@link CadenceSpec}.
 * Accepts a bare rule value (`FREQ=WEEKLY;BYDAY=MO`) or a full `RRULE:` line.
 *
 * Arrays are sorted and deduplicated; unknown parts, non-advancing intervals,
 * and unsupported combinations throw {@link CadenceError} — never a silent
 * approximation. `BYYEARDAY`, `BYSETPOS`, and negative `BYMONTHDAY` are
 * supported for yearly/monthly rules as documented; `BYWEEKNO` and `BYYEARDAY`
 * outside yearly rules are rejected.
 */
export function parseCadence(input: string): CadenceSpec {
  const source = input.trim().replace(/^RRULE:/i, '');
  if (source === '') return bad('empty cadence rule');
  const spec: Record<string, unknown> = {};
  let freq: CadenceFrequency | undefined;
  for (const part of source.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) bad(`missing "=" in "${part}"`);
    const key = part.slice(0, eq).toUpperCase();
    const value = part.slice(eq + 1);
    if (value === '') bad(`empty value for ${key}`);
    switch (key) {
      case 'BYDAY':
        spec.byday = parseByDay(value);
        break;
      case 'BYHOUR':
        spec.byhour = parseInts(value, { max: 23, min: 0 });
        break;
      case 'BYMINUTE':
        spec.byminute = parseInts(value, { max: 59, min: 0 });
        break;
      case 'BYMONTH':
        spec.bymonth = parseInts(value, { max: 12, min: 1 });
        break;
      case 'BYMONTHDAY':
        spec.bymonthday = parseInts(value, { allowNegative: true, max: 31, min: -31, nonzero: true });
        break;
      case 'BYSECOND':
        spec.bysecond = parseInts(value, { max: 60, min: 0 });
        break;
      case 'BYSETPOS':
        spec.bysetpos = parseInts(value, { allowNegative: true, max: 366, min: -366, nonzero: true });
        break;
      case 'BYWEEKNO':
        bad('BYWEEKNO is not supported');
        break;
      case 'BYYEARDAY':
        spec.byyearday = parseInts(value, { allowNegative: true, max: 366, min: -366, nonzero: true });
        break;
      case 'COUNT': {
        if (!/^\d+$/.test(value)) bad(`invalid COUNT "${value}"`);
        spec.count = Number(value);
        break;
      }
      case 'FREQ': {
        const lower = value.toLowerCase() as CadenceFrequency;
        if (!FREQUENCIES.includes(lower)) bad(`unknown FREQ "${value}"`);
        freq = lower;
        break;
      }
      case 'INTERVAL': {
        if (!/^\d+$/.test(value) || Number(value) < 1) bad(`INTERVAL must be a positive integer, got "${value}"`);
        spec.interval = Number(value);
        break;
      }
      case 'UNTIL':
        spec.until = parseUntil(value);
        break;
      case 'WKST':
        spec.wkst = parseWeekdayToken(value);
        break;
      default:
        bad(`unknown cadence part "${key}"`);
    }
  }
  if (freq === undefined) return bad('FREQ is required');
  if (spec.count !== undefined && spec.until !== undefined) bad('COUNT and UNTIL are mutually exclusive');
  if (spec.bysetpos !== undefined && freq !== 'yearly' && freq !== 'monthly') {
    bad('BYSETPOS is supported only for monthly and yearly rules');
  }
  if (spec.byyearday !== undefined && freq !== 'yearly') bad('BYYEARDAY is supported only for yearly rules');
  const result: Record<string, unknown> = { freq, ...spec };
  return Object.freeze(result) as CadenceSpec;
}

function intsValue(values: readonly number[]): string {
  return values.join(',');
}

function untilValue(until: Temporal.Instant): string {
  const zdt = until.toZonedDateTimeISO('UTC');
  const pad = (n: number, width = 2): string => String(n).padStart(width, '0');
  return `${pad(zdt.year, 4)}${pad(zdt.month)}${pad(zdt.day)}T${pad(zdt.hour)}${pad(zdt.minute)}${pad(zdt.second)}Z`;
}

/** Serialize a {@link CadenceSpec} back to a canonical RFC 5545 rule value (parts in stable order). */
export function toCadence(spec: CadenceSpec): string {
  const parts: string[] = [`FREQ=${spec.freq.toUpperCase()}`];
  if (spec.until !== undefined) parts.push(`UNTIL=${untilValue(spec.until)}`);
  if (spec.count !== undefined) parts.push(`COUNT=${spec.count}`);
  if (spec.interval !== undefined && spec.interval !== 1) parts.push(`INTERVAL=${spec.interval}`);
  if (spec.bysetpos !== undefined) parts.push(`BYSETPOS=${intsValue(spec.bysetpos)}`);
  if (spec.bymonth !== undefined) parts.push(`BYMONTH=${intsValue(spec.bymonth)}`);
  if (spec.byyearday !== undefined) parts.push(`BYYEARDAY=${intsValue(spec.byyearday)}`);
  if (spec.bymonthday !== undefined) parts.push(`BYMONTHDAY=${intsValue(spec.bymonthday)}`);
  if (spec.byday !== undefined) {
    parts.push(
      `BYDAY=${spec.byday
        .map(
          (entry) =>
            `${entry.n === undefined ? '' : entry.n > 0 ? `+${entry.n}` : String(entry.n)}${WEEKDAY_TOKENS[entry.weekday]}`,
        )
        .join(',')}`,
    );
  }
  if (spec.byhour !== undefined) parts.push(`BYHOUR=${intsValue(spec.byhour)}`);
  if (spec.byminute !== undefined) parts.push(`BYMINUTE=${intsValue(spec.byminute)}`);
  if (spec.bysecond !== undefined) parts.push(`BYSECOND=${intsValue(spec.bysecond)}`);
  if (spec.wkst !== undefined) parts.push(`WKST=${WEEKDAY_TOKENS[spec.wkst]}`);
  return parts.join(';');
}
