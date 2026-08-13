import { s } from '../index';
import { fromDefinition } from '../json';

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

  describe('definition()', () => {
    it('includes the wrapped class name', () => {
      expect(s.instanceof(Date).definition()).toMatchObject({ className: 'Date', kind: 'instanceof' });
      expect(s.instanceof(RegExp).definition()).toMatchObject({ className: 'RegExp', kind: 'instanceof' });
    });

    it('converts through the JSON subpath', () => {
      const jsonSchema = fromDefinition(s.instanceof(Date).definition());

      expect(jsonSchema.$comment).toBe('Instances of "Date" are not representable in JSON Schema.');
    });
  });
});
