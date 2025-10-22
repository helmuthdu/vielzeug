import { path } from '../path';

describe('getValue', () => {
  it('should retrieve the value at a given path', () => {
    const obj = { a: { b: { c: 3 } } };
    expect(path(obj, 'a.b.c')).toBe(3);
  });

  it('should return the default value if the path does not exist', () => {
    const obj = { a: { b: { c: 3 } } };
    expect(path(obj, 'a.b.d', 'default')).toBe('default');
  });

  it('should handle paths with array indices', () => {
    const obj = { a: [{ b: 1 }, { b: 2 }] };
    expect(path(obj, 'a[1].b')).toBe(2);
  });

  it('should return undefined if the path does not exist and no default value is provided', () => {
    const obj = { a: { b: { c: 3 } } };
    expect(path(obj, 'a.b.d')).toBeUndefined();
  });

  it('should handle empty objects gracefully', () => {
    const obj = {};
    expect(path(obj, 'a.b.c', 'default')).toBe('default');
  });
});
