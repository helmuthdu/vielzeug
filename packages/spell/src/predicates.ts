/**
 * Pure string format predicates backing the `s.string()` format methods. Use them where a
 * boolean is enough and no schema is needed:
 *
 * ```ts
 * import { isEmail } from '@vielzeug/spell/predicates';
 * isEmail('ada@example.com'); // true
 * ```
 */

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function isEmail(value: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);
}

/** Parses with `URL` and checks the protocol (without `:`) against `protocols`, case-insensitively. */
export function isUrl(value: string, protocols: readonly string[] = ['http', 'https']): boolean {
  const protocol = parseUrl(value)?.protocol.slice(0, -1).toLowerCase();

  return protocol !== undefined && protocols.some((allowed) => allowed.toLowerCase() === protocol);
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/** `YYYY-MM-DD` naming a real calendar day. */
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(value);

  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export function isIsoDateTime(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/.test(value) &&
    !Number.isNaN(new Date(value).getTime())
  );
}

/** IPv4 dotted quad or any IPv6 form accepted by the URL parser. */
export function isIp(value: string): boolean {
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return value.split('.').every((octet) => Number(octet) <= 255);

  return /^[0-9A-Fa-f:.]+$/.test(value) && parseUrl(`http://[${value}]/`) !== null;
}

export function isCuid(value: string): boolean {
  return /^c[a-z0-9]{8,}$/.test(value);
}

export function isCuid2(value: string): boolean {
  return /^[a-z][a-z0-9]{23}$/.test(value);
}

export function isUlid(value: string): boolean {
  return /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/.test(value);
}

/** NanoID alphabet of exactly `length` characters (default 21). */
export function isNanoid(value: string, length = 21): boolean {
  return value.length === length && /^[A-Za-z0-9_-]+$/.test(value);
}

export function isBase64(value: string): boolean {
  return /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/.test(value);
}

/** Base64url (RFC 4648 §5), padded or unpadded. */
export function isBase64url(value: string): boolean {
  if (value.length === 0 || value.length % 4 === 1) return false;

  return /^[A-Za-z0-9_-]*={0,2}$/.test(value);
}

export function isHex(value: string): boolean {
  return /^[A-Fa-f0-9]+$/.test(value);
}

/** `#rgb`, `#rrggbb`, or `#rrggbbaa`. */
export function isHexColor(value: string): boolean {
  return /^#(?:[A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(value);
}

export function isEmoji(value: string): boolean {
  return /^\p{Extended_Pictographic}+$/u.test(value);
}

/** Three base64url segments; does not verify the signature. */
export function isJwt(value: string): boolean {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
}

/** `HH:MM` or `HH:MM:SS`, 24-hour clock. */
export function isTime(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);
}

/** ISO 8601 duration such as `P1DT2H`. */
export function isDuration(value: string): boolean {
  return /^P(?=\d|T\d)(\d+Y)?(\d+M)?(\d+W)?(\d+D)?(T(\d+H)?(\d+M)?(\d+(?:\.\d+)?S)?)?$/.test(value);
}

export function isSemver(value: string): boolean {
  return /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/.test(
    value,
  );
}

/** Lowercase kebab-case: `my-post-1`. */
export function isSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

/** Decimal number literal with optional sign and exponent. */
export function isNumeric(value: string): boolean {
  return /^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i.test(value);
}
