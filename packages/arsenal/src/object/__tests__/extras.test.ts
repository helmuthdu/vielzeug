import { defaults } from '../defaults';
import { filterValues } from '../filterValues';
import { invert } from '../invert';
import { mapKeys } from '../mapKeys';
import { mapValues } from '../mapValues';
import { omit } from '../omit';
import { pick } from '../pick';

describe('object extras', () => {
  it('picks and omits keys', () => {
    const input = { a: 1, b: 2, c: 3 };

    expect(pick(input, ['a', 'c'])).toEqual({ a: 1, c: 3 });
    expect(omit(input, ['b'])).toEqual({ a: 1, c: 3 });
  });

  it('maps and filters object entries', () => {
    const input = { a: 1, b: 2 };

    expect(mapValues(input, (value) => value * 2)).toEqual({ a: 2, b: 4 });
    expect(mapKeys(input, (key) => `x_${String(key)}`)).toEqual({ x_a: 1, x_b: 2 });
    expect(filterValues(input, (value) => value > 1)).toEqual({ b: 2 });
  });

  it('guards against __proto__ prototype pollution — security regression', () => {
    const malicious = JSON.parse('{"__proto__":{"polluted":true}}') as Record<string, unknown>;

    const d = defaults({} as Record<string, unknown>, malicious);
    const mv = mapValues(malicious, (v) => v);
    const mk = mapKeys(malicious, (k) => k);
    const om = omit(malicious, [] as never[]);
    const fv = filterValues(malicious, () => true);

    expect((Object.prototype as Record<string, unknown>)['polluted']).toBeUndefined();
    expect(Object.hasOwn(d, '__proto__')).toBe(false);
    expect(Object.hasOwn(mv, '__proto__')).toBe(false);
    expect(Object.hasOwn(mk, '__proto__')).toBe(false);
    expect(Object.hasOwn(om, '__proto__')).toBe(false);
    expect(Object.hasOwn(fv, '__proto__')).toBe(false);
  });

  it('invert and defaults', () => {
    const input = { a: 'x', b: 'y' };
    const target = { a: 1, b: undefined as number | undefined };

    expect(invert(input)).toEqual({ x: 'a', y: 'b' });
    expect(defaults(target, { b: 2, c: 3 } as never)).toEqual({ a: 1, b: 2, c: 3 });
  });
});
