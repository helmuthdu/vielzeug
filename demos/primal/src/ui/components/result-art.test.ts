import { describe, expect, it } from 'vitest';
import { resultArtwork } from './result-art';

describe('result artwork', () => {
  it('cycles chapter art for intermediate victories', () => {
    expect(resultArtwork('victory', 1, false)).toBe('/backgrounds/bg_victory_1.webp');
    expect(resultArtwork('victory', 4, false)).toBe('/backgrounds/bg_victory_1.webp');
  });

  it('reserves the final image for a completed victory', () => {
    expect(resultArtwork('victory', 3, true)).toBe('/backgrounds/bg_final_1.webp');
    expect(resultArtwork('defeat', 3, true)).toBe('/backgrounds/bg_defeated.webp');
    expect(resultArtwork('defeat', 1, false)).toBe('/backgrounds/bg_defeated.webp');
  });

  it('does not assign result artwork before an outcome', () => {
    expect(resultArtwork(null, 1, false)).toBeUndefined();
  });
});
