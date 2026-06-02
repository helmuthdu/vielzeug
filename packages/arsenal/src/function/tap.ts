/**
 * Executes a side-effect callback and returns the original value.
 */
export function tap<T>(value: T, callback: (value: T) => void): T {
  callback(value);

  return value;
}
