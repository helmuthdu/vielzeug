/** Canonical JSON rejects values JSON.stringify would silently discard or coerce. */
export function canonicalJson(value: unknown, omitUndefinedFields = false, omissionSource?: unknown): string | null {
  const active = new Set<object>();
  const text = (value: string): string | null => {
    if (/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value)) return null;
    return JSON.stringify(value);
  };
  const serialize = (value: unknown, source?: unknown): string | null => {
    if (value === null) return 'null';
    if (typeof value === 'string') return text(value);
    if (typeof value === 'boolean') return String(value);
    if (typeof value === 'number') return Number.isFinite(value) ? JSON.stringify(value) : null;
    if (typeof value !== 'object' || active.has(value)) return null;
    const array = Array.isArray(value);
    const prototype = Object.getPrototypeOf(value);
    if (!array && prototype !== Object.prototype && prototype !== null) return null;
    if (array && prototype !== Array.prototype) return null;
    active.add(value);
    try {
      const fields: string[] = [];
      const keys = Reflect.ownKeys(value);
      if (array) {
        if (keys.length !== value.length + 1) return null;
        for (let i = 0; i < value.length; i++) {
          const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
          if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) return null;
          const item = serialize(descriptor.value, Array.isArray(source) ? source[i] : undefined);
          if (item === null) return null;
          fields.push(item);
        }
        return `[${fields.join(',')}]`;
      }
      if (keys.some((key) => typeof key !== 'string')) return null;
      for (const key of Object.keys(value).sort()) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !('value' in descriptor)) return null;
        const sourceObject = source !== null && typeof source === 'object' ? source : null;
        // Spell materializes absent optional object fields as undefined.
        if (
          descriptor.value === undefined &&
          omitUndefinedFields &&
          (sourceObject === null || !Object.hasOwn(sourceObject, key))
        )
          continue;
        const name = text(key);
        const item = serialize(descriptor.value, sourceObject === null ? undefined : Reflect.get(sourceObject, key));
        if (name === null || item === null) return null;
        fields.push(`${name}:${item}`);
      }
      if (Object.keys(value).length !== keys.length) return null;
      return `{${fields.join(',')}}`;
    } finally {
      active.delete(value);
    }
  };
  try {
    return serialize(value, omissionSource);
  } catch {
    return null;
  }
}

export function canonicalObjectJson(
  value: unknown,
  omitUndefinedFields = false,
  omissionSource?: unknown,
): string | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  return canonicalJson(value, omitUndefinedFields, omissionSource);
}
