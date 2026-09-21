import { MeshPairingError } from './errors';

/**
 * Base45 (RFC 9285): two bytes → three chars, one leftover byte → two chars.
 * The alphabet sits inside the QR alphanumeric charset, so QR encoders can use
 * alphanumeric mode (~5.5 bits/char) instead of byte mode — about a third
 * denser than base64 for the same payload.
 */

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
const INDEX = new Map([...ALPHABET].map((ch, i) => [ch, i]));

export function bytesToBase45(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    const value = bytes[i] * 256 + bytes[i + 1];
    out += ALPHABET[value % 45] + ALPHABET[Math.floor(value / 45) % 45] + ALPHABET[Math.floor(value / 2025)];
  }
  if (bytes.length % 2) {
    const value = bytes[bytes.length - 1];
    out += ALPHABET[value % 45] + ALPHABET[Math.floor(value / 45)];
  }
  return out;
}

export function base45ToBytes(text: string): Uint8Array {
  const out: number[] = [];
  let i = 0;
  while (i + 2 < text.length) {
    const value = digit(text, i) + 45 * digit(text, i + 1) + 2025 * digit(text, i + 2);
    if (value > 0xffff) throw new MeshPairingError('Malformed base45 payload');
    out.push(value >> 8, value & 0xff);
    i += 3;
  }
  if (text.length - i === 2) {
    const value = digit(text, i) + 45 * digit(text, i + 1);
    if (value > 0xff) throw new MeshPairingError('Malformed base45 payload');
    out.push(value);
  } else if (text.length - i === 1) {
    throw new MeshPairingError('Malformed base45 payload');
  }
  return new Uint8Array(out);
}

function digit(text: string, at: number): number {
  const value = INDEX.get(text[at]);
  if (value === undefined) throw new MeshPairingError('Malformed base45 payload');
  return value;
}
