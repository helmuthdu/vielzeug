import { describe, expect, it } from 'vitest';
import { trialSeriesById } from '../../content';
import type { SharedVictory } from '../../domain/victory';
import { resultArtwork, victoryResultArt } from './result-art';

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

const victory = (patch: Partial<SharedVictory> & Pick<SharedVictory, 'mode'>): SharedVictory => ({
  chapter: null,
  defeatedMonsterIds: null,
  durationMs: null,
  endingId: null,
  expeditionNumber: null,
  finished: false,
  hunterIds: ['zaraya'],
  monsterId: null,
  name: null,
  questId: null,
  scenarioId: null,
  score: null,
  seriesId: null,
  ...patch,
});

describe('shared victory banner art', () => {
  it('carries the game mode’s own background', () => {
    expect(victoryResultArt(victory({ mode: 'campaign-hunt' }))).toBe('/backgrounds/bg_campaign.webp');
    expect(victoryResultArt(victory({ mode: 'ascent' }))).toBe('/backgrounds/bg_mount_havoc_2.webp');
    expect(victoryResultArt(victory({ mode: 'expedition' }))).toBe('/backgrounds/bg_expedition.webp');
  });

  it('carries the Winds series cover, falling back to the challenges art', () => {
    expect(victoryResultArt(victory({ mode: 'challenge', seriesId: 'winds-of-spring' }))).toBe(
      trialSeriesById('winds-of-spring')?.art,
    );
    expect(victoryResultArt(victory({ mode: 'challenge' }))).toBe('/backgrounds/bg_challenges.webp');
  });

  it('keeps the final art only for the campaign’s closing record', () => {
    expect(victoryResultArt(victory({ finished: true, mode: 'campaign-final' }))).toBe('/backgrounds/bg_final_1.webp');
    // A finished run of another mode still reads as its own game.
    expect(victoryResultArt(victory({ finished: true, mode: 'ascent' }))).toBe('/backgrounds/bg_mount_havoc_2.webp');
  });
});
