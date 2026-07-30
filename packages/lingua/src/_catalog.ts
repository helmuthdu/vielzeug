// Internal — not part of the public API.
// Encapsulates the CatalogEntry class, flattenStrings, and related utilities.
//
// This module is the package's single declaration site for `Locale` and `Messages` —
// every other module (internal or public-types) imports them from here instead of
// redeclaring its own copy.

import { UNSAFE_KEYS } from './_constants';
import { warn } from './_dev';
import { compileTemplate, type CompiledTemplate } from './template';

export type Locale = string;

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

    // Populate prefix set for O(1) branch detection in hasPlural().
    let dot = key.indexOf('.');

    while (dot !== -1) {
      this.prefixes.add(key.slice(0, dot));
      dot = key.indexOf('.', dot + 1);
    }
  }

  setAll(flat: Iterable<[string, string]>): void {
    for (const [k, v] of flat) this.set(k, v);
  }

  /**
   * Shallow-copy this entry for `fork()` seeding. The clone owns its key map (so a
   * `patch()` on the fork never mutates the parent's catalog) while the per-message
   * `CatalogEntryData` values — including their compiled templates — are shared by
   * reference: forking never re-compiles a message.
   */
  clone(): CatalogEntry {
    const copy = new CatalogEntry();

    for (const [k, v] of this.entries) copy.entries.set(k, v);
    for (const p of this.prefixes) copy.prefixes.add(p);

    return copy;
  }
}

export function flattenStrings(
  messages: Messages,
  result = new Map<string, string>(),
  prefix?: string,
): Map<string, string> {
  for (const [key, value] of Object.entries(messages)) {
    if (UNSAFE_KEYS.has(key)) {
      // Prototype-pollution guard — never silent: a dropped catalog entry is a bug
      // the author needs to see, not a quirk to discover at runtime.
      warn(`catalog key '${key}' is reserved and was skipped.`);

      continue;
    }

    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string') {
      result.set(fullKey, value);
    } else {
      flattenStrings(value as Messages, result, fullKey);
    }
  }

  return result;
}
