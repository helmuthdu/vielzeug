/**
 * Formats a value received from the sandboxed REPL execution for display in the
 * output panel. Pulled out of the editor component so it can be unit tested without
 * mounting Vue or a Monaco instance.
 */
export function stringify(item: unknown): string {
  if (item === undefined) return 'undefined';

  if (item === null) return 'null';

  if (typeof item === 'string') return `'${item}'`;

  if (typeof item === 'object') {
    try {
      if (item instanceof Date) return `Date(${item.toISOString()})`;

      if (item instanceof Error) return `Error: ${item.message}`;

      if (item instanceof RegExp) return String(item);

      return JSON.stringify(item, null, 2);
    } catch {
      return String(item);
    }
  }

  return String(item);
}
