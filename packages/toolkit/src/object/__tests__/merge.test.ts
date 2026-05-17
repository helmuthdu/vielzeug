import { deepMerge, shallowMerge } from '../merge';

describe('merge', () => {
  test('should perform deep merge', () => {
    const obj1 = { a: 1, b: { x: 10, y: 'hello' }, c: [1] };
    const obj2 = { b: { y: 20, z: true }, c: [2] };
    const obj3 = { c: [3], d: false };

    const result = deepMerge(obj1, obj2, obj3);

    expect(result).toEqual({
      a: 1,
      b: { x: 10, y: 20, z: true },
      c: [1, 2, 3],
      d: false,
    });
  });

  test('should perform shallow merge', () => {
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

  test('should return an empty object when no input is provided', () => {
    expect(deepMerge()).toEqual({});
    expect(shallowMerge()).toEqual({});
  });

  test('should handle merging objects with different types', () => {
    const obj1 = { a: 1, b: 'hello' };
    const obj2 = { a: 'changed', b: { nested: true } };

    const result = deepMerge(obj1, obj2);

    expect(result).toEqual({ a: 'changed', b: { nested: true } });
  });

  test('should avoid prototype pollution', () => {
    const pollutedObject = JSON.parse('{ "__proto__": { "polluted": "yes" } }');
    const safeObject = deepMerge({}, pollutedObject);

    // The dangerous key should be skipped entirely
    expect(Object.prototype).not.toHaveProperty('polluted' as any);
    expect(Object.getPrototypeOf(safeObject)).not.toHaveProperty('polluted' as any);
    expect(safeObject).not.toHaveProperty('__proto__');
  });
});
