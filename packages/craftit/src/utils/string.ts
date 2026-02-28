/**
 * String utilities
 * Shared string manipulation functions
 */

/**
 * Convert camelCase to kebab-case
 * @example toKebab('fontSize') => 'font-size'
 */
export function toKebab(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}
