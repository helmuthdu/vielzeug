type Falsy = false | '' | 0 | 0n | null | undefined;

/**
 * Creates a new array with all falsy values removed.
 */
export function compact<T>(array: T[]): Array<Exclude<T, Falsy>> {
  return array.filter(Boolean) as Array<Exclude<T, Falsy>>;
}
