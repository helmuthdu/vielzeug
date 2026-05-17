import { gcd } from '../gcd';
import { lcm } from '../lcm';
import { lerp } from '../lerp';
import { mod } from '../mod';
import { normalize } from '../normalize';
import { standardDeviation } from '../standardDeviation';
import { variance } from '../variance';

describe('math extras', () => {
  it('supports interpolation and normalization', () => {
    expect(lerp(10, 20, 0.25)).toBe(12.5);
    expect(normalize(15, 10, 20)).toBe(0.5);
  });

  it('computes modular arithmetic and divisors', () => {
    expect(mod(-1, 5)).toBe(4);
    expect(gcd(54, 24)).toBe(6);
    expect(lcm(6, 8)).toBe(24);
  });

  it('computes statistical spread', () => {
    expect(variance([2, 4, 4, 4, 5, 5, 7, 9])).toBe(4);
    expect(standardDeviation([2, 4, 4, 4, 5, 5, 7, 9])).toBe(2);
  });
});
