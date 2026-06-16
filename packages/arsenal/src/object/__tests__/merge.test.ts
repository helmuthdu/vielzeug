import { deepMerge, shallowMerge } from '../merge';

describe('merge', () => {
  test('performs deep merge (arrays replaced by default)', () => {
    const obj1 = { a: 1, b: { x: 10, y: 'hello' }, c: [1] };
    const obj2 = { b: { y: 20, z: true }, c: [2] };
    const obj3 = { c: [3], d: false };

    const result = deepMerge(obj1, obj2, obj3);

    expect(result).toEqual({
      a: 1,
      b: { x: 10, y: 20, z: true },
      c: [3],
      d: false,
    });
  });

  test('arrayStrategy:concat concatenates arrays', () => {
    const obj1 = { a: 1, b: { x: 10, y: 'hello' }, c: [1] };
    const obj2 = { b: { y: 20, z: true }, c: [2] };
    const obj3 = { c: [3], d: false };

    const result = deepMerge(obj1, obj2, obj3, { arrayStrategy: 'concat' });

    expect(result).toEqual({
      a: 1,
      b: { x: 10, y: 20, z: true },
      c: [1, 2, 3],
      d: false,
    });
  });

  test('arrayStrategy:replace replaces arrays (explicit)', () => {
    expect(deepMerge({ tags: ['a'] }, { tags: ['b', 'c'] }, { arrayStrategy: 'replace' })).toEqual({
      tags: ['b', 'c'],
    });
  });

  test('returns empty object for no arguments', () => {
    expect(deepMerge()).toEqual({});
  });

  test('performs shallow merge', () => {
    const obj1 = { a: 1, b: { x: 10, y: 'hello' }, c: [1] };
    const obj2 = { b: { y: 20, z: true }, c: [2] };
    const obj3 = { c: [3], d: false };

    const result = shallowMerge(obj1, obj2, obj3);

    expect(result).toEqual({
      a: 1,
      b: { y: 20, z: true },
      c: [3],
      d: false,
    });
  });

  test('shallowMerge returns empty object for no arguments', () => {
    expect(shallowMerge()).toEqual({});
  });

  test('handles merging objects with different value types', () => {
    const result = deepMerge({ a: 1, b: 'hello' }, { a: 'changed', b: { nested: true } });

    expect(result).toEqual({ a: 'changed', b: { nested: true } });
  });

  test('object with arrayStrategy key passed as data (not as last options arg) is safely merged', () => {
    const result = deepMerge({ arrayStrategy: 'a' }, { arrayStrategy: 'b' });

    expect(result).toEqual({ arrayStrategy: 'b' });
  });

  test('avoids prototype pollution', () => {
    const pollutedObject = JSON.parse('{ "__proto__": { "polluted": "yes" } }');
    const safeObject = deepMerge({}, pollutedObject);

    expect(Object.prototype).not.toHaveProperty('polluted' as never);
    expect(Object.getPrototypeOf(safeObject)).not.toHaveProperty('polluted' as never);
    expect(safeObject).not.toHaveProperty('__proto__');
  });
});
