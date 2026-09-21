import { type RandomSource, randomFloat } from '@vielzeug/arsenal';
import { bytesToBase64Url } from './_base64';

/**
 * Random bytes from `crypto.getRandomValues`, or from an injected
 * `RandomSource` for deterministic tests.
 */
export function randomBytes(length: number, source?: RandomSource): Uint8Array {
  const bytes = new Uint8Array(length);
  if (source) {
    for (let index = 0; index < length; index++) bytes[index] = Math.floor(randomFloat(source) * 256);
  } else {
    crypto.getRandomValues(bytes);
  }
  return bytes;
}

/** Random 128-bit base64url id — used for peer ids, session ids, and message ids. */
export function randomId(source?: RandomSource): string {
  return bytesToBase64Url(randomBytes(16, source));
}
