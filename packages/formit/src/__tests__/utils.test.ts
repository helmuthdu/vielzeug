import { toFormData } from '../index';

describe('toFormData', () => {
  test('converts flat values to FormData entries', () => {
    const fd = toFormData({ age: 25, name: 'Alice' });

    expect(fd.get('name')).toBe('Alice');
    expect(fd.get('age')).toBe('25');
  });

  test('nested objects are flattened to dot-notation keys', () => {
    const fd = toFormData({ user: { age: 30, name: 'Bob' } });

    expect(fd.get('user.name')).toBe('Bob');
    expect(fd.get('user.age')).toBe('30');
  });

  test('null and undefined values are omitted', () => {
    const fd = toFormData({ a: null, b: undefined, c: 'ok' });

    expect(fd.has('a')).toBe(false);
    expect(fd.has('b')).toBe(false);
    expect(fd.get('c')).toBe('ok');
  });

  test('File values are appended without conversion', () => {
    const file = new File(['data'], 'test.txt');
    const fd = toFormData({ attachment: file });

    expect(fd.get('attachment')).toBe(file);
  });

  test('array values result in multiple entries for the same key', () => {
    const fd = toFormData({ tags: ['js', 'ts'] });

    expect(fd.getAll('tags')).toEqual(['js', 'ts']);
  });
});
