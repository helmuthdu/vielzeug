/** JavaScript values that are not objects or functions. */
export type PrimitiveValue = bigint | boolean | null | number | string | symbol | undefined;

/** Checks whether a value is a JavaScript primitive. */
export function isPrimitive(value: unknown): value is PrimitiveValue {
  return value === null || (typeof value !== 'object' && typeof value !== 'function');
}
