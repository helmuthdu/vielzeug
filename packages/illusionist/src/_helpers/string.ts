import type { RandomSource } from '../types';

import { nextFloat } from './next-float';

/** Picks a random element from a readonly array. Returns `undefined` for empty arrays. */
export function pick<T>(array: readonly T[], source?: RandomSource): T | undefined {
  return array.length === 0 ? undefined : array[Math.floor(nextFloat(source) * array.length)];
}

/** Generates a string of random digits with a fixed length. */
export function numericString(length: number, source?: RandomSource): string {
  let result = '';

  for (let i = 0; i < length; i++) {
    result += Math.floor(nextFloat(source) * 10);
  }

  return result;
}

/** Generates a random hex string of the given length. */
export function hexString(length: number, source?: RandomSource): string {
  const chars = '0123456789abcdef';
  let result = '';

  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(nextFloat(source) * 16)];
  }

  return result;
}

/** Generates a random alphanumeric string of the given length. */
export function alphanumeric(length: number, source?: RandomSource): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(nextFloat(source) * chars.length)];
  }

  return result;
}

/** Generates a random Base58 string (no 0, O, I, l) — used for Bitcoin-style addresses. */
export function base58String(length: number, source?: RandomSource): string {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let result = '';

  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(nextFloat(source) * chars.length)];
  }

  return result;
}
