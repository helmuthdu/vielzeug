/**
 * The one SHA-256→hex helper shared by both server surfaces: the collection content
 * hash (browser-safe root) and the issuer's sign-in-link token hash. Web Crypto
 * only; no D1, JWKS or binding machinery.
 */
export const sha256Hex = async (text: string): Promise<string> =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
