/** Resolves nested properties using dot notation: 'user.name.profile'. */
export function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  if (!path.includes('.')) return Object.hasOwn(obj, path) ? obj[path] : undefined;

  const parts = path.split('.');
  let value: unknown = obj;

  for (const part of parts) {
    if (value == null || typeof value !== 'object') return undefined;

    if (!Object.hasOwn(value as object, part)) return undefined;

    value = (value as Record<string, unknown>)[part];
  }

  return value;
}
