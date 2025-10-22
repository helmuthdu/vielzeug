import { merge } from '../merge';

describe('merge', () => {
  test('should perform deep merge', () => {
    const obj1 = { a: 1, b: { x: 10, y: 'hello' }, c: [1] };
    const obj2 = { b: { y: 20, z: true }, c: [2] };
    const obj3 = { c: [3], d: false };

    const result = merge('deep', obj1, obj2, obj3);

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

    const result = merge('shallow', obj1, obj2, obj3);

    expect(result).toEqual({
      a: 1,
      b: { y: 20, z: true },
      c: [3],
      d: false,
    });
  });

  test('should handle arrayConcat strategy', () => {
    const obj1 = { list: [1, 2] };
    const obj2 = { list: [3, 4] };

    const result = merge('arrayConcat', obj1, obj2);

    expect(result).toEqual({ list: [1, 2, 3, 4] });
  });

  test('should handle arrayReplace strategy', () => {
    const obj1 = { list: [1, 2] };
    const obj2 = { list: [3, 4] };

    const result = merge('arrayReplace', obj1, obj2);

    expect(result).toEqual({ list: [3, 4] });
  });

  test('should handle lastWins strategy', () => {
    const obj1 = { key: 'first' };
    const obj2 = { key: 'second' };

    const result = merge('lastWins', obj1, obj2);

    expect(result).toEqual({ key: 'second' });
  });

  test('should return an empty object when no input is provided', () => {
    expect(merge()).toEqual({});
  });

  test('should handle merging objects with different types', () => {
    const obj1 = { a: 1, b: 'hello' };
    const obj2 = { a: 'changed', b: { nested: true } };

    const result = merge('deep', obj1, obj2);

    expect(result).toEqual({ a: 'changed', b: { nested: true } });
  });

  test('should avoid prototype pollution', () => {
    const pollutedObject = JSON.parse('{ "__proto__": { "polluted": "yes" } }');
    const safeObject = merge('deep', {}, pollutedObject);

    // biome-ignore lint/suspicious/noExplicitAny: -
    expect(({} as any).polluted).toBeUndefined();
    expect(safeObject).not.toHaveProperty('__proto__');
  });
});
