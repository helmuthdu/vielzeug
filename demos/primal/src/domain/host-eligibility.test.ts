import { describe, expect, it } from 'vitest';
import { createAscent } from './ascent';
import { createCampaign } from './campaign';
import { createChallenge } from './challenge';
import { createExpedition } from './expedition';
import { canHostSubject } from './host-eligibility';
import { requiredExpansionsFor } from './prerequisites';

const NOW = '2026-01-01T00:00:00.000Z';

describe('host eligibility', () => {
  it('allows running campaigns but not final victories or ended Hunter trials', () => {
    const campaign = createCampaign({
      config: { expansionIds: ['core'], name: 'Test', nightmareVariant: false, variants: [] },
      hunterIds: ['daeron', 'mirah'],
      id: 'c1',
      now: NOW,
    });
    expect(canHostSubject(campaign)).toBe(true);
    expect(canHostSubject({ ...campaign, finalBattleWon: true })).toBe(false);
    expect(canHostSubject({ ...campaign, defeats: 3, variants: ['hunters-trial'] })).toBe(false);
  });

  it('excludes played expeditions and finished ascents or Winds series', () => {
    const expedition = createExpedition('e1', ['core'], NOW);
    const ascent = createAscent('a1', 'Test', ['core', 'mount-havoc'], NOW, () => 0);
    const challenge = createChallenge(
      'w1',
      'winds-of-spring',
      'Test',
      ['core', ...requiredExpansionsFor('challenge', 'winds-of-spring')],
      NOW,
    );
    for (const subject of [expedition, ascent, challenge]) expect(canHostSubject(subject)).toBe(true);
    expect(canHostSubject({ ...expedition, status: 'played' })).toBe(false);
    expect(canHostSubject({ ...ascent, status: 'finished' })).toBe(false);
    expect(canHostSubject({ ...challenge, status: 'finished' })).toBe(false);
  });
});
