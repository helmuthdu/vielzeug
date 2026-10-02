import { describe, expect, it } from 'vitest';
import { hunterById } from '../content';
import { unlockCampaignSkillStep } from './build';
import { createCampaign } from './campaign';
import { cardPoolSize, nextStep, pendingUpgrades, stepStatus, unlockedCards } from './skill-tree';
import type { CampaignHunter } from './types';

const NOW = '2026-01-01T00:00:00.000Z';
const base = createCampaign({
  config: { expansionIds: ['core', 'heart-of-the-wild'], name: 'Test', nightmareVariant: false, variants: [] },
  hunterIds: ['daeron', 'zaraya'],
  id: 'c1',
  now: NOW,
});
const hunter = (campaign = base, id = 'daeron'): CampaignHunter =>
  campaign.hunters.find((entry) => entry.hunterId === id) as CampaignHunter;

describe('card-pool upgrades', () => {
  it('reads granted-but-unchosen upgrades from the persisted balance', () => {
    expect(pendingUpgrades({ ...hunter(), skillPoints: 0 })).toBe(0);
    expect(pendingUpgrades({ ...hunter(), skillPoints: 2 })).toBe(2);
  });

  it('only the next step of a branch becomes available, and only while preparing with an upgrade pending', () => {
    const fresh = { ...hunter(), skillPoints: 0 };
    expect(stepStatus(fresh, 'A', 1, true)).toBe('locked');
    const funded = { ...fresh, skillPoints: 1 };
    expect(stepStatus(funded, 'A', 1, true)).toBe('available');
    expect(stepStatus(funded, 'A', 2, true)).toBe('locked');
    expect(stepStatus(funded, 'A', 1, false)).toBe('locked');
    const progressed = { ...funded, skillTree: { ...funded.skillTree, A: 1 as const } };
    expect(stepStatus(progressed, 'A', 1, true)).toBe('unlocked');
    expect(stepStatus(progressed, 'A', 2, true)).toBe('available');
    expect(nextStep(progressed, 'A')).toBe(2);
    expect(nextStep({ ...progressed, skillTree: { ...progressed.skillTree, A: 2 } }, 'A')).toBeNull();
  });

  it('lists unlocked cards in branch and step order and sizes the pool from the rules', () => {
    const daeron = hunterById('daeron');
    if (!daeron) throw new Error('missing daeron');
    const funded = { ...base, hunters: base.hunters.map((entry) => ({ ...entry, skillPoints: 3 })) };
    const upgraded = unlockCampaignSkillStep(
      unlockCampaignSkillStep(unlockCampaignSkillStep(funded, 'daeron', 'E', NOW), 'daeron', 'E', NOW),
      'daeron',
      'B',
      NOW,
    );
    const cards = unlockedCards(hunter(upgraded), daeron);
    expect(cards.map((card) => card.step)).toEqual(['B1', 'B1', 'E1', 'E1', 'E2', 'E2', 'E2']);
    expect(cards.at(-1)?.kind).toBe('mastery');
    expect(cardPoolSize(hunter(upgraded), daeron)).toBe(25 + 2 + 2 + 3);
    expect(cardPoolSize(hunter(), daeron)).toBe(25);
  });

  it('applies the same pool rules to expansion hunters', () => {
    const zaraya = hunterById('zaraya');
    if (!zaraya) throw new Error('missing zaraya');
    const funded = { ...base, hunters: base.hunters.map((entry) => ({ ...entry, skillPoints: 2 })) };
    const upgraded = unlockCampaignSkillStep(unlockCampaignSkillStep(funded, 'zaraya', 'A', NOW), 'zaraya', 'C', NOW);
    const cards = unlockedCards(hunter(upgraded, 'zaraya'), zaraya);
    expect(cards.map((card) => card.name)).toEqual([
      'Mastered Defense',
      'Quick Strike',
      'Chasing Blow',
      'Flank Piercer',
    ]);
    expect(cardPoolSize(hunter(upgraded, 'zaraya'), zaraya)).toBe(25 + 2 + 2);
  });

  it('is granted by the chapter box that instructs a card-pool upgrade', () => {
    expect(pendingUpgrades(hunter())).toBe(1);
  });
});
