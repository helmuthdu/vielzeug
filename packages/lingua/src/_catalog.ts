// Internal — not part of the public API.
// Encapsulates the CatalogEntry class, flattenStrings, and related utilities.

import { UNSAFE_KEYS } from './_constants';
import { compileTemplate, type CompiledTemplate, parsePipePlural } from './template';

export interface Messages {
  [key: string]: string | Messages;
}

export type CatalogEntryData = {
  compiled: CompiledTemplate;
  message: string;
};

export class CatalogEntry {
  readonly entries = new Map<string, CatalogEntryData>();
  readonly prefixes = new Set<string>();

  get(key: string): CatalogEntryData | undefined {
    return this.entries.get(key);
  }

  set(key: string, value: string): void {
    this.entries.set(key, { compiled: compileTemplate(value), message: value });

    // Populate prefix set for O(1) branch detection in has().
    let dot = key.indexOf('.');

    while (dot !== -1) {
      this.prefixes.add(key.slice(0, dot));
      dot = key.indexOf('.', dot + 1);
    }
  }

  setAll(flat: Iterable<[string, string]>): void {
    for (const [k, v] of flat) this.set(k, v);
  }
}

export function flattenStrings(
  messages: Messages,
  result = new Map<string, string>(),
  prefix?: string,
): Map<string, string> {
  for (const [key, value] of Object.entries(messages)) {
    if (UNSAFE_KEYS.has(key)) continue;

    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string') {
      const plural = parsePipePlural(value);

      if (plural) {
        flattenStrings(plural, result, fullKey);
      } else {
        result.set(fullKey, value);
      }
    } else {
      flattenStrings(value as Messages, result, fullKey);
    }
  }

  return result;
}
