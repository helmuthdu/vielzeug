import { s } from '../index';

describe('s.literal()', () => {
  it('accepts the exact value', () => {
    expect(s.literal('active').parse('active')).toBe('active');
    expect(s.literal(42).parse(42)).toBe(42);
    expect(s.literal(true).parse(true)).toBe(true);
  });

  it('rejects anything else', () => {
    expect(() => s.literal('active').parse('inactive')).toThrow('Expected "active"');
    expect(() => s.literal(42).parse(43)).toThrow('Expected 42');
  });
});
