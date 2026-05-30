/**
 * Type-safe endsWith wrapper.
 */
export function endsWith<S extends string>(value: string, suffix: S): value is `${string}${S}` {
  return value.endsWith(suffix);
}
