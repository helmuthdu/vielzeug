import { int } from '../_helpers/int';
import { alphanumeric, hexString, pick } from '../_helpers/string';
import type { IllusionistContext } from '../types';
import { INTERNET_DATA } from './data';

const SPECIAL_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

const URL_PATH_WORDS = [
  'api',
  'v1',
  'v2',
  'users',
  'posts',
  'comments',
  'articles',
  'products',
  'orders',
  'items',
  'search',
  'auth',
  'login',
  'logout',
  'profile',
  'settings',
  'dashboard',
  'files',
  'images',
  'assets',
  'static',
  'public',
  'private',
  'admin',
  'reports',
];

/** Generates an email address of the form `firstname.lastname@domain.tld`. */
export function email(ctx: IllusionistContext): string {
  const first = (
    pick(ctx.locale.person.firstNameFemale, ctx.source) ??
    pick(ctx.locale.person.firstNameMale, ctx.source) ??
    'user'
  ).toLowerCase();
  const last = (pick(ctx.locale.person.lastName, ctx.source) ?? 'name').toLowerCase();
  const domain = pick(INTERNET_DATA.domains, ctx.source) ?? 'example';
  const tld = pick(INTERNET_DATA.tlds, ctx.source) ?? 'com';
  return `${first}.${last}@${domain}.${tld}`;
}

/** Generates a username: either a random alphanumeric string or a `firstname.lastname` pattern. */
export function username(ctx: IllusionistContext): string {
  if (int(0, 1, ctx.source) === 0) {
    return alphanumeric(int(6, 12, ctx.source), ctx.source);
  }
  const first = (
    pick(ctx.locale.person.firstNameFemale, ctx.source) ??
    pick(ctx.locale.person.firstNameMale, ctx.source) ??
    'user'
  ).toLowerCase();
  const last = (pick(ctx.locale.person.lastName, ctx.source) ?? 'name').toLowerCase();
  return `${first}.${last}`;
}

/** Options for {@link password}. */
export type PasswordOptions = {
  /** Password length. Defaults to `12`. */
  length?: number;
  /** When `true`, builds a memorable password from name fragments and digits. */
  memorable?: boolean;
};

/** Generates a password mixing upper/lowercase letters, digits, and special characters. */
export function password(ctx: IllusionistContext, opts: PasswordOptions = {}): string {
  const length = opts.length ?? 12;

  if (opts.memorable) {
    const first = (
      pick(ctx.locale.person.firstNameFemale, ctx.source) ??
      pick(ctx.locale.person.firstNameMale, ctx.source) ??
      'user'
    ).toLowerCase();
    const last = (pick(ctx.locale.person.lastName, ctx.source) ?? 'name').toLowerCase();
    const num = String(int(10, 99, ctx.source));
    const special = pick(SPECIAL_CHARS.split(''), ctx.source) ?? '!';
    const base = `${first}${last}${num}${special}`;
    if (base.length <= length) return base + alphanumeric(length - base.length, ctx.source);
    // Truncation would cut the special char/number — put them first, then fill from the name.
    const essential = `${num}${special}`;
    const remaining = length - essential.length;
    const namePart = remaining > 0 ? (first + last).slice(0, remaining) : '';
    const result = essential + namePart;

    return result.length < length ? result + alphanumeric(length - result.length, ctx.source) : result.slice(0, length);
  }

  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const pools = [upper, lower, digits, SPECIAL_CHARS];

  // Guarantee at least one char from each pool, then fill the rest randomly.
  const chars: string[] = [];
  for (const pool of pools) {
    chars.push(pool[Math.floor(ctx.source.next() * pool.length)] ?? upper[0]!);
  }
  const all = upper + lower + digits + SPECIAL_CHARS;
  while (chars.length < length) {
    chars.push(all[Math.floor(ctx.source.next() * all.length)] ?? 'a');
  }

  // Shuffle via Fisher-Yates using ctx.source.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(ctx.source.next() * (i + 1));
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }

  return chars.slice(0, length).join('');
}

/** Generates a URL of the form `protocol://sub.domain.tld/path/...`. */
export function url(ctx: IllusionistContext): string {
  const protocol = pick(INTERNET_DATA.protocols, ctx.source) ?? 'https';
  const sub = pick(['www', 'api', 'app', 'mail', 'static', 'cdn'], ctx.source) ?? 'www';
  const domain = pick(INTERNET_DATA.domains, ctx.source) ?? 'example';
  const tld = pick(INTERNET_DATA.tlds, ctx.source) ?? 'com';
  const host = `${sub}.${domain}.${tld}`;

  const segmentCount = int(1, 4, ctx.source);
  const segments: string[] = [];
  for (let i = 0; i < segmentCount; i++) {
    const word = pick(URL_PATH_WORDS, ctx.source) ?? 'api';
    // Occasionally append a numeric or short alphanumeric suffix to a segment.
    if (int(0, 2, ctx.source) === 0) {
      segments.push(`${word}-${alphanumeric(int(2, 5), ctx.source).toLowerCase()}`);
    } else {
      segments.push(word);
    }
  }

  return `${protocol}://${host}/${segments.join('/')}`;
}

/** Generates a domain name of the form `domain.tld`. */
export function domainName(ctx: IllusionistContext): string {
  const domain = pick(INTERNET_DATA.domains, ctx.source) ?? 'example';
  const tld = pick(INTERNET_DATA.tlds, ctx.source) ?? 'com';
  return `${domain}.${tld}`;
}

/** Generates an IPv4 or IPv6 address. Defaults to IPv4. */
export function ip(ctx: IllusionistContext, version: 4 | 6 = 4): string {
  if (version === 6) {
    const groups: string[] = [];
    for (let i = 0; i < 8; i++) {
      groups.push(hexString(4, ctx.source));
    }
    return groups.join(':');
  }
  const octets: number[] = [];
  for (let i = 0; i < 4; i++) {
    octets.push(int(0, 255, ctx.source));
  }
  return octets.join('.');
}

/** Generates a MAC address of the form `XX:XX:XX:XX:XX:XX`. */
export function mac(ctx: IllusionistContext): string {
  const parts: string[] = [];
  for (let i = 0; i < 6; i++) {
    parts.push(hexString(2, ctx.source));
  }
  return parts.join(':');
}

/** Picks a random user agent string. */
export function userAgent(ctx: IllusionistContext): string {
  return pick(INTERNET_DATA.userAgents, ctx.source) ?? INTERNET_DATA.userAgents[0]!;
}

/** Picks a random HTTP method. */
export function httpMethod(ctx: IllusionistContext): string {
  return pick(INTERNET_DATA.httpMethods, ctx.source) ?? 'GET';
}

/** Picks a random HTTP status code. */
export function statusCode(ctx: IllusionistContext): number {
  return pick(INTERNET_DATA.statusCodes, ctx.source) ?? 200;
}

/** Picks a random MIME type. */
export function mimeType(ctx: IllusionistContext): string {
  return pick(INTERNET_DATA.mimeTypes, ctx.source) ?? 'text/plain';
}
