/**
 * Checks if an object has a key.
 */
export function has<T extends object, K extends PropertyKey>(item: T, key: K): key is Extract<K, keyof T> {
  return key in item;
}
