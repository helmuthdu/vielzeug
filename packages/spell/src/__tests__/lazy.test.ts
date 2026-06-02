import { s } from '../index';

describe('s.lazy()', () => {
  it('optional() on lazy schema allows undefined', () => {
    const schema = s.lazy(() => s.string()).optional();

    expect(schema.parse(undefined)).toBeUndefined();
    expect(schema.parse('hello')).toBe('hello');
  });

  it('nullable() on lazy schema allows null', () => {
    const schema = s.lazy(() => s.string()).nullable();

    expect(schema.parse(null)).toBeNull();
    expect(schema.parse('hello')).toBe('hello');
  });

  it('catch() on lazy schema returns fallback on failure', () => {
    const schema = s.lazy(() => s.string()).catch('fallback');

    expect(schema.parse('hello')).toBe('hello');
    expect(schema.parse(42 as any)).toBe('fallback');
  });

  it('supports recursive schemas', () => {
    const Node: any = s.object({
      children: s.array(s.lazy(() => Node)).optional(),
      value: s.number(),
    });

    expect(Node.parse({ value: 1 })).toEqual({ value: 1 });
    expect(Node.parse({ children: [{ value: 2 }], value: 1 })).toEqual({
      children: [{ value: 2 }],
      value: 1,
    });
    expect(() => Node.parse({ value: 'bad' })).toThrow();
  });
});
