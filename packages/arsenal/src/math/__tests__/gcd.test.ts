import { gcd } from '../gcd';

describe('gcd', () => {
  it('returns the greatest common divisor of two positives', () => {
    expect(gcd(54, 24)).toBe(6);
    expect(gcd(12, 8)).toBe(4);
    expect(gcd(100, 75)).toBe(25);
  });

  it('handles negative inputs (returns positive result)', () => {
    expect(gcd(-54, 24)).toBe(6);
    expect(gcd(54, -24)).toBe(6);
    expect(gcd(-54, -24)).toBe(6);
  });

  it('returns the other number when one is 0', () => {
    expect(gcd(0, 5)).toBe(5);
    expect(gcd(5, 0)).toBe(5);
  });

  it('returns 0 when both are 0', () => {
    expect(gcd(0, 0)).toBe(0);
  });

  it('returns 1 for coprime numbers', () => {
    expect(gcd(7, 13)).toBe(1);
    expect(gcd(1, 100)).toBe(1);
  });

  it('returns the number itself when equal', () => {
    expect(gcd(7, 7)).toBe(7);
  });
});
