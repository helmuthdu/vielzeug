import { describe, expect, it } from 'vitest';
import { repeatFadeDue } from './repeat-timing';

describe('repeat fade timing', () => {
  it('begins before the next track starts, leaving time to fade and poll', () => {
    expect(repeatFadeDue(98.4, 0, 100)).toBe(false);
    expect(repeatFadeDue(98.5, 0, 100)).toBe(true);
    expect(repeatFadeDue(100, 0, 100)).toBe(true);
  });

  it('uses the video end for a final track and does not fade immediately on short tracks', () => {
    expect(repeatFadeDue(211.5, 100, 213)).toBe(true);
    expect(repeatFadeDue(0, 0, 2)).toBe(false);
    expect(repeatFadeDue(1, 0, 2)).toBe(true);
    expect(repeatFadeDue(10, 10, 10)).toBe(false);
  });
});
