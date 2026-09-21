const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const LOOKUP = new Map([...ALPHABET].map((char, index) => [char, index]));

/** Environment-independent base64url encoding (no `btoa`/`Buffer` dependency). */
export function bytesToBase64Url(bytes: Uint8Array): string {
  let output = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index]!;
    const b = bytes[index + 1];
    const c = bytes[index + 2];
    output += ALPHABET[a >> 2]!;
    output += ALPHABET[((a & 0b11) << 4) | ((b ?? 0) >> 4)]!;
    if (b !== undefined) output += ALPHABET[((b & 0b1111) << 2) | ((c ?? 0) >> 6)]!;
    if (c !== undefined) output += ALPHABET[c & 0b111111]!;
  }
  return output;
}

/** Decodes base64url text. Throws on characters outside the base64url alphabet. */
export function base64UrlToBytes(text: string): Uint8Array {
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of text) {
    const value = LOOKUP.get(char);
    if (value === undefined) throw new Error(`Invalid base64url character "${char}"`);
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(bytes);
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function textToBase64Url(text: string): string {
  return bytesToBase64Url(encoder.encode(text));
}

export function base64UrlToText(text: string): string {
  return decoder.decode(base64UrlToBytes(text));
}

/** Byte length of a UTF-8 string — used for `maxMessageBytes` checks. */
export function utf8Bytes(text: string): number {
  return encoder.encode(text).length;
}
