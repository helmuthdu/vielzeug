/**
 * Media-type matching for content negotiation.
 *
 * RFC 9110 §8.3.1: media types are case-insensitive and carry optional `;`-separated
 * parameters (`charset`, `boundary`, …). Comparing a raw header with `includes()` or
 * `startsWith()` therefore both misses uppercase variants and can match a parameter
 * value, so every content-type decision in courier goes through here.
 */

/** Lowercased media type with parameters stripped: `text/html` from `Text/HTML; charset=utf-8`. */
export function mediaTypeOf(contentType: string | null | undefined): string | undefined {
  const [mediaType] = contentType?.trim().toLowerCase().split(';') ?? [];

  return mediaType || undefined;
}

/**
 * True for any JSON media type: `application/json`, the `+json` structured-syntax
 * suffix (`application/problem+json`, `application/vnd.api+json`), and a `/json`
 * subtype. Deliberately stricter than a substring test, which would also accept
 * `application/jsonlines`.
 */
export function isJsonMediaType(contentType: string | null | undefined): boolean {
  const mediaType = mediaTypeOf(contentType);

  return mediaType !== undefined && (mediaType.endsWith('/json') || mediaType.endsWith('+json'));
}
