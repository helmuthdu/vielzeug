import type { ArrayField, FlatKeyOf, TypeAtPath } from '../types';

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

  return {
    append(value: T) {
      const current = store.get(key);

      set(name, (Array.isArray(current) ? [...current, value] : [value]) as TypeAtPath<TValues, K>);
    },
    insert(index: number, value: T) {
      const current = store.get(key);

      if (!Array.isArray(current)) return;

      const next = [...current];

      next.splice(index, 0, value);
      set(name, next as TypeAtPath<TValues, K>);
    },
    move(from: number, to: number) {
      const current = store.get(key);

      if (!Array.isArray(current)) return;

      const next = [...current];

      next.splice(to, 0, next.splice(from, 1)[0]);
      set(name, next as TypeAtPath<TValues, K>);
    },
    prepend(value: T) {
      const current = store.get(key);

      set(name, (Array.isArray(current) ? [value, ...current] : [value]) as TypeAtPath<TValues, K>);
    },
    remove(index: number) {
      const current = store.get(key);

      if (!Array.isArray(current)) return;

      set(name, current.filter((_, i) => i !== index) as TypeAtPath<TValues, K>);
    },
    replace(index: number, value: T) {
      const current = store.get(key);

      if (!Array.isArray(current)) return;

      const next = [...current];

      next[index] = value;
      set(name, next as TypeAtPath<TValues, K>);
    },
    swap(a: number, b: number) {
      const current = store.get(key);

      if (!Array.isArray(current)) return;

      const next = [...current];

      [next[a], next[b]] = [next[b], next[a]];
      set(name, next as TypeAtPath<TValues, K>);
    },
  };
}
