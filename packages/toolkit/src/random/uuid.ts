/**
 * Generates a unique identifier.
 *
 * @example
 * ```ts
 * uuid(); // a unique identifier, e.g., '22a746d0-08be-4aff-bbc2-4deddf0914e0'
 * ```
 *
 * @returns A unique identifier.
 */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'.replace(/x/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
