/**
 * Pure string format validators.
 *
 * All functions take a `string` and return `boolean`. They are exported as part of the
 * public API so callers can use them independently of any Schema.
 *
 * ```ts
 * import { isEmail, isUuid } from '@vielzeug/spell';
 * isEmail('foo@bar.com'); // true
 * ```
 */

export function isEmail(v: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v);
}

export function isUrl(v: string, protocols: readonly string[] = ['http', 'https']): boolean {
  try {
    const parsed = new URL(v);
    const allowed = new Set(protocols.map((p) => p.toLowerCase()));

    return allowed.has(parsed.protocol.replace(':', '').toLowerCase());
  } catch {
    return false;
  }
}

export function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

export function isIsoDate(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;

  const d = new Date(v);

  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(v);
}

export function isIsoDateTime(v: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/.test(v) &&
    !Number.isNaN(new Date(v).getTime())
  );
}

export function isIp(v: string): boolean {
  // IPv4
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(v)) {
    return v.split('.').every((o) => {
      const n = parseInt(o, 10);

      return n >= 0 && n <= 255;
    });
  }

  // IPv6 — rely on URL parser
  try {
    new URL(`http://[${v}]/`);

    return true;
  } catch {
    return false;
  }
}

export function isCuid(v: string): boolean {
  return /^c[a-z0-9]{8,}$/.test(v);
}

export function isCuid2(v: string): boolean {
  return /^[a-z][a-z0-9]{23}$/.test(v);
}

export function isUlid(v: string): boolean {
  return /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/.test(v);
}

/**
 * Validates a NanoID string. The default NanoID length is 21 characters; pass a
 * custom length to validate IDs generated with non-default sizes.
 */
export function isNanoid(v: string, length = 21): boolean {
  return v.length === length && /^[A-Za-z0-9_-]+$/.test(v);
}

export function isBase64(v: string): boolean {
  return /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/.test(v);
}

/**
 * Validates a base64url-encoded string (RFC 4648 §5). Accepts unpadded and padded forms.
 * A string whose length % 4 === 1 is never valid base64url.
 */
export function isBase64url(v: string): boolean {
  if (v.length === 0 || v.length % 4 === 1) return false;

  return /^[A-Za-z0-9_-]*={0,2}$/.test(v);
}

export function isHex(v: string): boolean {
  return /^[A-Fa-f0-9]+$/.test(v);
}

export function isHexColor(v: string): boolean {
  return /^#(?:[A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(v);
}

export function isEmoji(v: string): boolean {
  return /^\p{Extended_Pictographic}+$/u.test(v);
}

export function isJwt(v: string): boolean {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(v);
}

export function isTime(v: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(v);
}

export function isDuration(v: string): boolean {
  return /^P(?=\d|T\d)(\d+Y)?(\d+M)?(\d+W)?(\d+D)?(T(\d+H)?(\d+M)?(\d+(?:\.\d+)?S)?)?$/.test(v);
}

export function isSemver(v: string): boolean {
  return /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/.test(
    v,
  );
}

export function isSlug(v: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v);
}

export function isNumeric(v: string): boolean {
  return /^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i.test(v);
}
