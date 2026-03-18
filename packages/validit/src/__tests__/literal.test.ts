import { v } from '../index';

describe('v.literal()', () => {
  it('accepts the exact value', () => {
    expect(v.literal('active').parse('active')).toBe('active');
    expect(v.literal(42).parse(42)).toBe(42);
    expect(v.literal(true).parse(true)).toBe(true);
  });

  it('rejects anything else', () => {
    expect(() => v.literal('active').parse('inactive')).toThrow('Expected "active"');
    expect(() => v.literal(42).parse(43)).toThrow('Expected 42');
  });
});
