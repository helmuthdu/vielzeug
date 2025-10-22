import { expires } from '../expires';

describe('expires', () => {
  const now = new Date();

  it('returns NEVER if year >= 9999', () => {
    expect(expires(new Date(10000, 0, 1))).toBe('NEVER');
    expect(expires('9999-01-01')).toBe('NEVER');
  });

  it('returns UNKNOWN for invalid date', () => {
    expect(expires('invalid-date')).toBe('UNKNOWN');
  });

  it('returns EXPIRED if date is in the past', () => {
    const past = new Date(now.getTime() - 1000 * 60 * 60 * 24);
    expect(expires(past)).toBe('EXPIRED');
  });

  it('returns SOON if date is within threshold days', () => {
    const soon = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    expect(expires(soon, 3)).toBe('SOON');
  });

  it('returns LATER if date is after threshold', () => {
    const later = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
    expect(expires(later, 7)).toBe('LATER');
  });

  it('returns SOON if date is exactly at threshold', () => {
    const atThreshold = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    expect(expires(atThreshold, 7)).toBe('SOON');
  });

  it('handles string input for date', () => {
    const future = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    expect(expires(future.toISOString(), 7)).toBe('SOON');
  });

  it('returns EXPIRED if date is now', () => {
    expect(expires(now)).toBe('EXPIRED');
  });
});
