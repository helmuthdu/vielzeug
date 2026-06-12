/**
 * Performs a partial deep comparison between object and source to determine if object contains equivalent property values.
 *
 * @example
 * ```ts
 * const object = { a: 1, b: 2, c: { d: 3 } };
 *
 * isMatch(object, { a: 1, c: { d: 3 } }); // true
 * isMatch(object, { a: 1, b: 2 }); // true
 * isMatch(object, { a: 1, c: { d: 4 } }); // false
 *
 * isMatch([1, 2, 3], [1, 2]); // true
 * isMatch([1, 2, 3], [1, 2, 3]); // true
 * isMatch([1, 2, 3], [1, 2, 4]); // false
 * ```
 *
 * @param object - The object to inspect.
 * @param source - The object of property values to match.
 *
 * @returns `true` if the object is a match, else `false`.
 */
export function isMatch(object: unknown, source: unknown): boolean {
  if (object === source) return true;

  if (object == null || source == null) return false;

  const isObjArray = Array.isArray(object);
  const isSrcArray = Array.isArray(source);

  if (isObjArray !== isSrcArray) return false;

  if (isObjArray && isSrcArray) {
    const objArr = object as unknown[];
    const srcArr = source as unknown[];

    if (srcArr.length > objArr.length) return false;

    return srcArr.every((item, i) => isMatch(objArr[i], item));
  }

  if (typeof source === 'object' && typeof object === 'object') {
    // Map and Set are not structurally matched by key iteration — treat as opaque
    if (source instanceof Map || source instanceof Set || object instanceof Map || object instanceof Set) {
      return false;
    }

    for (const key of Object.keys(source as Record<string, unknown>)) {
      if (!isMatch((object as Record<string, unknown>)?.[key], (source as Record<string, unknown>)[key])) {
        return false;
      }
    }

    return true;
  }

  return object === source;
}
