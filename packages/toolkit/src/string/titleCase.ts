import { words } from './words';

/**
 * Converts a string to title case.
 */
export function titleCase(str: string): string {
  return words(str)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
