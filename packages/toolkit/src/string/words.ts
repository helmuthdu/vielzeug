import { normalizeCase } from './_caseUtils';

/**
 * Splits a string into normalized words.
 */
export function words(str: string): string[] {
  const normalized = normalizeCase(str, ' ');

  if (!normalized) return [];

  return normalized.split(' ').filter(Boolean);
}
