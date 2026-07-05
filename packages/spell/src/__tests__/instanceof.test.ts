import { s } from '../index';

describe('s.instanceof()', () => {
  it('accepts instances of the given class', () => {
    expect(s.instanceof(Date).parse(new Date())).toBeInstanceOf(Date);
    expect(s.instanceof(Map).parse(new Map())).toBeInstanceOf(Map);
  });

  it('rejects instances of a different class', () => {
    expect(() => s.instanceof(Date).parse(new Map())).toThrow('Expected instance of Date');
    expect(() => s.instanceof(RegExp).parse(new Date())).toThrow('Expected instance of RegExp');
  });

  it('rejects non-instance values', () => {
    expect(() => s.instanceof(Date).parse('not a date')).toThrow('Expected instance of Date');
  });

  describe('equals()', () => {
    it('two schemas wrapping the same class are equal', () => {
      expect(s.instanceof(Date).equals(s.instanceof(Date))).toBe(true);
    });

    it('two schemas wrapping different classes are not equal', () => {
      expect(s.instanceof(Date).equals(s.instanceof(RegExp))).toBe(false);
    });
  });

  describe('toDescriptor()', () => {
    it('includes the wrapped class name', () => {
      expect(s.instanceof(Date).toDescriptor()).toMatchObject({ className: 'Date', kind: 'instanceof' });
      expect(s.instanceof(RegExp).toDescriptor()).toMatchObject({ className: 'RegExp', kind: 'instanceof' });
    });
  });

  describe('toJsonSchema()', () => {
    it('adds an explanatory $comment naming the class', () => {
      const schema = s.instanceof(Date).toJsonSchema() as Record<string, unknown>;

      expect(schema['$comment']).toBe('Instances of "Date" are not representable in JSON Schema.');
    });
  });
});
