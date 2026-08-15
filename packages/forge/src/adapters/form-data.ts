import { flattenPaths as flattenValues } from '@vielzeug/arsenal/object';

/**
 * Converts a form values object into a `FormData` instance.
 * Nested objects are flattened to dot-notation keys (e.g. `user.name`).
 * `File`, `Blob`, and `FileList` values are appended as-is; all others are coerced to strings.
 * `null` and `undefined` values are omitted.
 */
export function toFormData(values: Record<string, unknown>): FormData {
  const fd = new FormData();

  const isBlob = (value: unknown): value is Blob => typeof Blob !== 'undefined' && value instanceof Blob;
  const isFile = (value: unknown): value is File => typeof File !== 'undefined' && value instanceof File;
  const isFileList = (value: unknown): value is FileList =>
    typeof FileList !== 'undefined' && value instanceof FileList;

  for (const [name, value] of Object.entries(flattenValues(values))) {
    if (value === null || value === undefined) continue;

    if (isFile(value) || isBlob(value)) {
      fd.append(name, value);
    } else if (isFileList(value)) {
      for (let i = 0; i < value.length; i++) fd.append(name, value[i]);
    } else if (Array.isArray(value)) {
      for (const item of value) fd.append(name, isFile(item) || isBlob(item) ? item : String(item));
    } else {
      fd.append(name, String(value));
    }
  }

  return fd;
}
