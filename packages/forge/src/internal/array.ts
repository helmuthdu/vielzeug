import type { ArrayField, FlatKeyOf, TypeAtPath } from '../types';

/**
 * Builds a cached ArrayField helper for a specific field name.
 * The helper closes over `store` and `set` from the parent form closure.
 */
export function createArrayField<TValues extends Record<string, unknown>>(
  name: FlatKeyOf<TValues>,
  store: Map<string, unknown>,
  set: <K extends FlatKeyOf<TValues>>(name: K, value: TypeAtPath<TValues, K>) => void,
): ArrayField {
  const key = name as string;

  return {
    append(value) {
      const current = store.get(key);

      set(name, (Array.isArray(current) ? [...current, value] : [value]) as TypeAtPath<TValues, typeof name>);
    },
    insert(index, value) {
      const current = store.get(key);

      if (!Array.isArray(current)) return;

      const next = [...current];

      next.splice(index, 0, value);
      set(name, next as TypeAtPath<TValues, typeof name>);
    },
    move(from, to) {
      const current = store.get(key);

      if (!Array.isArray(current)) return;

      const next = [...current];

      next.splice(to, 0, next.splice(from, 1)[0]);
      set(name, next as TypeAtPath<TValues, typeof name>);
    },
    prepend(value) {
      const current = store.get(key);

      set(name, (Array.isArray(current) ? [value, ...current] : [value]) as TypeAtPath<TValues, typeof name>);
    },
    remove(index) {
      const current = store.get(key);

      if (!Array.isArray(current)) return;

      set(name, current.filter((_, i) => i !== index) as TypeAtPath<TValues, typeof name>);
    },
    replace(index, value) {
      const current = store.get(key);

      if (!Array.isArray(current)) return;

      const next = [...current];

      next[index] = value;
      set(name, next as TypeAtPath<TValues, typeof name>);
    },
    swap(a, b) {
      const current = store.get(key);

      if (!Array.isArray(current)) return;

      const next = [...current];

      [next[a], next[b]] = [next[b], next[a]];
      set(name, next as TypeAtPath<TValues, typeof name>);
    },
  };
}
