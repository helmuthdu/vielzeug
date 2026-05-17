export function isPlainObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === 'object' && Object.getPrototypeOf(val) === Object.prototype;
}

export function flattenValues(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (isPlainObject(val)) {
      Object.assign(result, flattenValues(val, fullKey));
    } else {
      result[fullKey] = val;
    }
  }

  return result;
}

export function unflattenValues(flat: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(flat)) {
    const parts = key.split('.');
    let obj = result;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!isPlainObject(obj[parts[i]])) obj[parts[i]] = {};

      obj = obj[parts[i]] as Record<string, unknown>;
    }
    obj[parts[parts.length - 1]] = val;
  }

  return result;
}
