/** Resolves nested properties using dot notation: 'user.name.profile'. */
export function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  let value: unknown = obj;

  for (const part of path.split('.')) {
    if (value == null || typeof value !== 'object') return undefined;

    if (!Object.hasOwn(value as object, part)) return undefined;

    value = (value as Record<string, unknown>)[part];
  }

  return value;
}
