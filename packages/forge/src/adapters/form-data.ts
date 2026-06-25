import { flattenValues } from '../_utils';

/**
 * Converts a form values object into a `FormData` instance.
 * Nested objects are flattened to dot-notation keys (e.g. `user.name`).
 * `File`, `Blob`, and `FileList` values are appended as-is; all others are coerced to strings.
 * `null` and `undefined` values are omitted.
 */
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
