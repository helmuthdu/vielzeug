import type { ArrayField, FlatKeyOf, TypeAtPath } from '../types';

import { devOnly, warn } from '../_dev';
import { sanitizeForLog } from '../_utils';

// Resolves the element type of an array field — mirrored from types.ts.
type ElementOf<T> = T extends readonly (infer E)[] ? E : unknown;

/**
 * Builds a cached typed ArrayField helper for a specific field name.
 * The helper closes over `store` and `set` from the parent form closure.
 * R4: Return type is now `ArrayField<ElementOf<V>>` so callers get type-safe append/insert/etc.
 */
export function createArrayField<TValues extends Record<string, unknown>, K extends FlatKeyOf<TValues>>(
  name: K,
  store: Map<string, unknown>,
  set: (name: string, value: unknown) => void,
): ArrayField<ElementOf<TypeAtPath<TValues, K>>> {
  type T = ElementOf<TypeAtPath<TValues, K>>;

  const key = name as string;

  // Every mutating method below no-ops when the field isn't (yet) an array, instead of
  // throwing — a field can legitimately not exist yet. But a silent no-op with zero signal
  // is a debugging trap for the common mistake (typo'd field name, forgot to append() first
  // to seed the array). Warn once per call in dev so it's discoverable without being a
  // breaking runtime error for the legitimate "not initialized yet" case.
  function warnNotArray(apiLabel: string, current: unknown): void {
    devOnly(() => {
      warn(
        `array('${sanitizeForLog(key, 80)}').${apiLabel}(): field is not an array ` +
          `(got ${current === null ? 'null' : typeof current}) — no-op.`,
      );
    });
  }

  return {
    append(value: T) {
      const current = store.get(key);

      if (current !== undefined && !Array.isArray(current)) {
        warnNotArray('append', current);

        return;
      }

      set(name, (Array.isArray(current) ? [...current, value] : [value]) as TypeAtPath<TValues, K>);
    },
    insert(index: number, value: T) {
      const current = store.get(key);

      if (!Array.isArray(current)) {
        warnNotArray('insert', current);

        return;
      }

      const next = [...current];

      next.splice(index, 0, value);
      set(name, next as TypeAtPath<TValues, K>);
    },
    move(from: number, to: number) {
      const current = store.get(key);

      if (!Array.isArray(current)) {
        warnNotArray('move', current);

        return;
      }

      const next = [...current];

      next.splice(to, 0, next.splice(from, 1)[0]);
      set(name, next as TypeAtPath<TValues, K>);
    },
    prepend(value: T) {
      const current = store.get(key);

      if (current !== undefined && !Array.isArray(current)) {
        warnNotArray('prepend', current);

        return;
      }

      set(name, (Array.isArray(current) ? [value, ...current] : [value]) as TypeAtPath<TValues, K>);
    },
    remove(index: number) {
      const current = store.get(key);

      if (!Array.isArray(current)) {
        warnNotArray('remove', current);

        return;
      }

      set(name, current.filter((_, i) => i !== index) as TypeAtPath<TValues, K>);
    },
    replace(index: number, value: T) {
      const current = store.get(key);

      if (!Array.isArray(current)) {
        warnNotArray('replace', current);

        return;
      }

      const next = [...current];

      next[index] = value;
      set(name, next as TypeAtPath<TValues, K>);
    },
    swap(a: number, b: number) {
      const current = store.get(key);

      if (!Array.isArray(current)) {
        warnNotArray('swap', current);

        return;
      }

      const next = [...current];

      [next[a], next[b]] = [next[b], next[a]];
      set(name, next as TypeAtPath<TValues, K>);
    },
  };
}
