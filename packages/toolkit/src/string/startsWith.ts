/**
 * Type-safe startsWith wrapper.
 */
export function startsWith<P extends string>(value: string, prefix: P): value is `${P}${string}` {
  return value.startsWith(prefix);
}
