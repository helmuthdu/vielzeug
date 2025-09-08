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
  return (
    crypto?.randomUUID() ?? [12, 6, 6, 6, 18].map((val) => Math.floor(Math.random() * 10 ** val).toString(36)).join('-')
  );
}
