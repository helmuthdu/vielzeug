import { IllusionistSeedError } from '../errors';
import { createSeed } from '../seed/create-seed';
import { mulberry32 } from '../seed/mulberry32';

describe('mulberry32', () => {
  it('produces the same sequence for the same seed', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    const seqA = [a.next(), a.next(), a.next(), a.next(), a.next()];
    const seqB = [b.next(), b.next(), b.next(), b.next(), b.next()];

    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = mulberry32(12345);
    const b = mulberry32(54321);
    const seqA = [a.next(), a.next(), a.next()];
    const seqB = [b.next(), b.next(), b.next()];

    expect(seqA).not.toEqual(seqB);
  });

  it('produces values in [0, 1)', () => {
    const source = mulberry32(1);
    for (let i = 0; i < 100; i++) {
      const value = source.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('createSeed', () => {
  it('is deterministic for a number seed', () => {
    const a = createSeed(12345);
    const b = createSeed(12345);
    const seqA = [a.next(), a.next(), a.next()];
    const seqB = [b.next(), b.next(), b.next()];

    expect(seqA).toEqual(seqB);
  });

  it('is deterministic for a string seed', () => {
    const a = createSeed('hello');
    const b = createSeed('hello');
    const seqA = [a.next(), a.next(), a.next()];
    const seqB = [b.next(), b.next(), b.next()];

    expect(seqA).toEqual(seqB);
  });

  it('produces values in [0, 1) when no seed is provided', () => {
    const source = createSeed();
    for (let i = 0; i < 100; i++) {
      const value = source.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('throws IllusionistSeedError for an invalid (NaN) number seed', () => {
    expect(() => createSeed(Number.NaN)).toThrow(IllusionistSeedError);
  });

  it('throws IllusionistSeedError for positive Infinity', () => {
    expect(() => createSeed(Number.POSITIVE_INFINITY)).toThrow(IllusionistSeedError);
  });

  it('throws IllusionistSeedError for negative Infinity', () => {
    expect(() => createSeed(Number.NEGATIVE_INFINITY)).toThrow(IllusionistSeedError);
  });
});
