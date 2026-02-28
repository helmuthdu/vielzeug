/**
 * Craftit - Refs
 * Element references with type safety
 */

/**
 * Ref interface - holds a reference to an element
 */
export interface Ref<T = Element> {
  value: T | null;
}

/**
 * Create a ref for an element
 */
export function ref<T = Element>(): Ref<T> {
  return {
    value: null,
  };
}

/**
 * Bind a ref to an element (used internally by template system)
 */
export function bindRef<T>(ref: Ref<T>, element: T): void {
  ref.value = element;
}

/**
 * Check if a value is a ref
 */
export function isRef(value: unknown): value is Ref {
  return value !== null && typeof value === 'object' && 'value' in value && Object.keys(value).length === 1;
}
