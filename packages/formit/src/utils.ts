export function isSameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (a instanceof File && b instanceof File) return a.name === b.name && a.size === b.size;

  if (a instanceof Blob && b instanceof Blob) return a.size === b.size;

  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => isSameValue(v, b[i]));
  }

  return false;
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
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

export function toFormData(values: Record<string, unknown>): FormData {
  const fd = new FormData();

  for (const [name, value] of Object.entries(flattenValues(values))) {
    if (value === null || value === undefined) continue;

    if (value instanceof File || value instanceof Blob) {
      fd.append(name, value);
    } else if (value instanceof FileList) {
      for (let i = 0; i < value.length; i++) fd.append(name, value[i]);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        fd.append(name, item instanceof File || item instanceof Blob ? item : String(item));
      }
    } else {
      fd.append(name, String(value));
    }
  }

  return fd;
}
