import { isRecord, isUnsafeKey } from './core/path.js';
import { ForgeConfigError } from './errors.js';

function flatten(obj: Record<string, unknown>, prefix: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (isUnsafeKey(key)) continue;
    if (key.includes('.')) throw new ForgeConfigError(`FormData keys must not contain dots: '${key}'.`);

    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (isRecord(value)) {
      Object.assign(result, flatten(value, fullKey));
    } else {
      result[fullKey] = value;
    }
  }

  return result;
}

/**
 * Converts a form values object into a `FormData` instance.
 * Nested objects are flattened to dot-notation keys (e.g. `user.name`).
 * `File`, `Blob`, and `FileList` values are appended as-is; scalar arrays use repeated keys.
 * `null` and `undefined` values are omitted. Ambiguous dotted keys and nested array containers reject.
 */
export function toFormData(values: Record<string, unknown>): FormData {
  const fd = new FormData();

  const isBlob = (value: unknown): value is Blob => typeof Blob !== 'undefined' && value instanceof Blob;
  const isFile = (value: unknown): value is File => typeof File !== 'undefined' && value instanceof File;
  const isFileList = (value: unknown): value is FileList =>
    typeof FileList !== 'undefined' && value instanceof FileList;

  for (const [name, value] of Object.entries(flatten(values, ''))) {
    if (value === null || value === undefined) continue;

    if (isFile(value) || isBlob(value)) {
      fd.append(name, value);
    } else if (isFileList(value)) {
      for (let i = 0; i < value.length; i++) fd.append(name, value[i]);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (isRecord(item) || Array.isArray(item)) {
          throw new ForgeConfigError(`FormData array '${name}' must contain only scalar or binary values.`);
        }
        fd.append(name, isFile(item) || isBlob(item) ? item : String(item));
      }
    } else {
      fd.append(name, String(value));
    }
  }

  return fd;
}
