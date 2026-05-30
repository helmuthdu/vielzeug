/**
 * Deep clones using native structuredClone.
 */
export function deepClone<T>(value: T): T {
  return structuredClone(value);
}
