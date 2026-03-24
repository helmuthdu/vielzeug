import type { MessageValue, Messages } from './types';

/* -------------------- Path Resolution -------------------- */

/**
 * Resolves nested properties using dot notation and bracket notation.
 * Supports: 'user.name', 'items[0]', 'user.items[0].name'
 */
export function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  // Try direct access first (handles keys with literal dots)
  if (path in obj) return obj[path];

  const parts = path.match(/[^.[\]]+/gu) ?? [];
  let value: unknown = obj;

  for (const part of parts) {
    if (value == null || typeof value !== 'object') return undefined;

    value = (value as Record<string, unknown>)[part];
  }

  return value;
}

/* -------------------- Message Value Guard -------------------- */

export const PLURAL_FORMS = new Set<string>(['zero', 'one', 'two', 'few', 'many', 'other']);

export function isMessageValue(value: unknown): value is MessageValue {
  if (typeof value === 'string') return true;

  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;

  const obj = value as Record<string, unknown>;

  if (!('other' in obj)) return false;

  const keys = Object.keys(obj);

  if (keys.length > PLURAL_FORMS.size) return false;

  return keys.every((k) => PLURAL_FORMS.has(k)) && Object.values(obj).every((v) => typeof v === 'string');
}

/* -------------------- Deep Merge -------------------- */

export function deepMerge(target: Messages, source: Messages): Messages {
  const result = { ...target };

  for (const [key, val] of Object.entries(source)) {
    const existing = result[key];

    if (!isMessageValue(val) && !isMessageValue(existing) && typeof existing === 'object' && existing !== null) {
      result[key] = deepMerge(existing as Messages, val as Messages);
    } else {
      // Clone PluralMessages objects to prevent external mutations from corrupting the catalog.
      result[key] = typeof val === 'object' && val !== null ? ({ ...(val as object) } as MessageValue) : val;
    }
  }

  return result;
}

/* -------------------- BoundedMap -------------------- */

/**
 * Size-bounded Map that evicts the oldest entry (insertion order) when the cap is reached.
 * Used by I18n's chain cache to prevent unbounded growth in long-lived SSR singletons when
 * locale tags are derived from arbitrary user input (e.g. Accept-Language headers).
 */
export class BoundedMap<K, V> extends Map<K, V> {
  readonly #cap: number;

  constructor(cap: number) {
    super();
    this.#cap = cap;
  }

  override set(key: K, value: V): this {
    if (!this.has(key) && this.size >= this.#cap) {
      this.delete(this.keys().next().value as K);
    }

    return super.set(key, value);
  }
}
