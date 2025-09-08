import { seek } from '../seek';

describe('seek', () => {
  const data = {
    address: {
      city: 'New York',
      zip: '10001',
    },
    age: 25,
    hobbies: ['reading', 'traveling'],
    name: 'John Doe',
    nestedArray: [{ key: 'value1' }, { key: 'value2' }],
  };

  it('should return true for a matching string value', () => {
    expect(seek(data, 'John', 0.5)).toBe(true);
  });

  it('should return true for a matching value in a nested object', () => {
    expect(seek(data, 'New York', 0.5)).toBe(true);
  });

  it('should return true for a matching value in an array', () => {
    expect(seek(data, 'reading', 0.5)).toBe(true);
  });

  it('should return true for a matching value in a nested array of objects', () => {
    expect(seek(data, 'value1', 0.5)).toBe(true);
  });

  it('should return false for a non-matching query', () => {
    expect(seek(data, 'nonexistent', 0.5)).toBe(false);
  });

  it('should return false for a query below the similarity threshold', () => {
    expect(seek(data, 'Joh', 0.8)).toBe(false);
  });

  it('should handle empty objects gracefully', () => {
    expect(seek({}, 'test', 0.5)).toBe(false);
  });

  it('should handle null or undefined values in the object', () => {
    const dataWithNull = { ...data, extra: null };
    expect(seek(dataWithNull, 'extra', 0.5)).toBe(false);
  });

  it('should handle an empty query string', () => {
    expect(seek(data, '', 0.5)).toBe(false);
  });

  it('should throw an error for an invalid tone value', () => {
    expect(() => seek(data, 'test', 2)).toThrow(Error);
  });
});
