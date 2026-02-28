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
 *
 * @example
 * const buttonRef = ref<HTMLButtonElement>();
 *
 * return html`<button ref=${buttonRef}>Click me</button>`;
 * // Later: buttonRef.value?.focus()
 */
export function ref<T = Element>(): Ref<T> {
  return {
    value: null,
  };
}

/**
 * Bind a ref to an element (used internally by template system)
 * @internal
 */
export function bindRef<T>(ref: Ref<T>, element: T): void {
  ref.value = element;
}

/**
 * Check if a value is a ref (used internally)
 * @internal
 */
export function isRef(value: unknown): value is Ref {
  return (
    value !== null && typeof value === 'object' && 'value' in value && Object.getOwnPropertyNames(value).length === 1
  );
}
