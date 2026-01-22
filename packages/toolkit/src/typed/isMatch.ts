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
// biome-ignore lint/suspicious/noExplicitAny: -
export function isMatch(object: any, source: any): boolean {
  if (object === source) return true;
  if (object == null || source == null) return false;

  const isObjArray = Array.isArray(object);
  const isSrcArray = Array.isArray(source);

  if (isObjArray !== isSrcArray) return false;

  if (isObjArray && isSrcArray) {
    if (source.length > object.length) return false;
    // biome-ignore lint/suspicious/noExplicitAny: -
    return source.every((item: any, i: number) => isMatch(object[i], item));
  }

  if (typeof source === 'object') {
    for (const key in source) {
      if (Object.hasOwn(source, key) && !isMatch(object?.[key], source[key])) {
        return false;
      }
    }
    return true;
  }

  return object === source;
}
