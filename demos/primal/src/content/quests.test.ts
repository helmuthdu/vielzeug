import { describe, expect, it } from 'vitest';
import { narrativeAvailable } from './lore';
import { monsterById } from './monsters';
import { questByNumber, questExpirationLabels, quests } from './quests';

describe('campaign book quest content', () => {
  it('extracts all quest scenarios with debrief content', () => {
    expect(quests).toHaveLength(49);
    expect(questByNumber(1)).toMatchObject({
      conclusion: expect.stringContaining('Emera'),
      introduction: expect.stringContaining('Red Peaks'),
      vision: expect.any(String),
    });
    expect(questByNumber(41)?.rewardResources).toMatchObject({ blood: 2, venom: 2 });
  });

  it('extracts full quest narratives, chapter branches, named visions, and expiration prose', () => {
    expect(quests).toHaveLength(49);
    for (const quest of quests) {
      expect(quest.lore.introductions.length, `quest ${quest.number} introduction`).toBeGreaterThan(0);
      expect(quest.lore.conclusions.length, `quest ${quest.number} conclusion`).toBeGreaterThan(0);
      expect(quest.lore.visions.length, `quest ${quest.number} vision`).toBeGreaterThan(0);
      for (const passage of [...quest.lore.introductions, ...quest.lore.conclusions, ...quest.lore.visions]) {
        expect(passage.paragraphs.length, `quest ${quest.number} ${passage.title}`).toBeGreaterThan(0);
      }
    }

    for (const number of [1, 2]) {
      const branches = questByNumber(number)!.lore.conclusions.filter((passage) => passage.variant);
      expect(branches.map((passage) => passage.variant)).toEqual(['A', 'B']);
      expect(branches.find((passage) => passage.variant === 'A')?.condition).toEqual({ maxChapter: 2 });
      expect(branches.find((passage) => passage.variant === 'B')?.condition).toEqual({ minChapter: 3 });
      expect(branches.filter((passage) => narrativeAvailable(passage.condition, 2, []))).toHaveLength(1);
      expect(branches.filter((passage) => narrativeAvailable(passage.condition, 3, []))).toHaveLength(1);
    }

    expect(quests.filter((quest) => quest.lore.visions.length > 1).map((quest) => quest.number)).toEqual([
      18, 20, 33, 45,
    ]);
    expect(quests.filter((quest) => quest.expiration.text).length).toBe(20);
  });

  it('extracts every quest achievement and expiration achievement', () => {
    const expected: Record<number, string[]> = {
      3: ['Calm the Sea'],
      4: ['Secrets from the Past'],
      5: ['Arkeum Dust', 'The Goldarks People'],
      7: ['The Burning Ember', 'The Tome of Creatures'],
      11: ['The Herbarium'],
      13: ['The Three Spears'],
      16: ['A Debt to Be Paid'],
      18: ['The Spear that Killed the Dragon'],
      20: ['The Dragon Star'],
      24: ['The Bones of the Ancient'],
      29: ['Ouroboros'],
      31: ['The Mushroom Forest'],
      36: ['The Jungle of Muara', 'The Poison of the Pazis'],
      37: ['The Lantern Bearer', 'The Echo of the Waterfall'],
      39: ['The Lantern Bearer'],
      40: ['Ouroboros'],
      41: ['The Blood of the Serpent'],
      45: ['The Spear that Killed the Dragon'],
      46: ['The Fallen Star'],
      49: ['The Lake of the Celestial'],
    };
    for (const [number, achievements] of Object.entries(expected)) {
      const quest = questByNumber(Number(number));
      const extracted = new Set([
        ...(quest?.progressionEffects.flatMap((effect) => effect.achievements) ?? []),
        ...(quest?.achievementRules.map((rule) => rule.achievement) ?? []),
      ]);
      expect(extracted).toEqual(new Set(achievements));
    }
    expect(
      questByNumber(47)
        ?.progressionEffects.filter((effect) => effect.trigger === 'expiration')
        .flatMap((effect) => effect.achievements),
    ).toContain('Glaciation');
    expect(
      questByNumber(48)
        ?.progressionEffects.filter((effect) => effect.trigger === 'expiration')
        .flatMap((effect) => effect.achievements),
    ).toContain('Glaciation');
  });

  it('formats quest-board expiration choices for comparison', () => {
    expect(questExpirationLabels(questByNumber(1)!)).toEqual(['Chapter 4']);
    expect(questExpirationLabels(questByNumber(2)!)).toEqual(['Chapter 4', 'Nightmare · Chapter 3']);
    expect(questExpirationLabels({ expires: '' })).toEqual([]);
  });

  it('uses authored reward and expiration unlock rules', () => {
    expect(questByNumber(1)?.rewardUnlocks).toEqual([
      { maxChapter: 2, questId: 'quest-004' },
      { minChapter: 3, questId: 'quest-006' },
    ]);
    expect(questByNumber(6)?.rewardUnlocks).toEqual([{ questId: 'quest-014' }]);
    expect(questByNumber(3)?.expirationUnlocks).toEqual([{ questId: 'quest-010' }]);
  });
});

it('parses reward-card grants from the reward box, including both copies', () => {
  const cards = (questNumber: number) => quests.find((quest) => quest.number === questNumber)?.rewardCards ?? [];
  expect(cards(5)).toEqual([1]);
  expect(cards(6)).toEqual([2, 2]);
  expect(cards(20)).toEqual([10, 11, 12, 13]);
  expect(cards(48)).toEqual([36, 37]);
  expect(cards(16)).toEqual([5]);
  const granted = new Set(quests.flatMap((quest) => quest.rewardCards));
  expect(granted.size).toBeGreaterThan(30);
});

describe('monster elemental data', () => {
  it.each([
    ['vyraxen', 'fire', ['horn', 'coral', 'ice']],
    ['toramat', 'horn', ['coral', 'metal', 'venom']],
    ['ozew', 'thunder', ['horn', 'crystal']],
    ['korowon', 'coral', ['horn', 'thunder', 'feather', 'venom']],
    ['felaxir', 'crystal', ['fire', 'metal', 'venom']],
    ['hurom', 'metal', ['fire', 'thunder']],
    ['tarragua', 'metal', ['fire', 'thunder', 'feather']],
    ['orouxen', 'coral', ['crystal', 'thunder', 'feather']],
    ['kharja', 'fire', ['horn', 'coral', 'crystal', 'ice']],
    ['dygorax', 'horn', ['coral', 'metal', 'venom', 'ice']],
    ['morkraas', 'crystal', ['fire', 'metal', 'ice']],
    ['jekoros', 'thunder', ['crystal', 'feather']],
    ['zekath', 'thunder', ['crystal', 'metal', 'feather']],
    ['zekalith', 'thunder', ['crystal', 'metal', 'feather']],
    ['xitheros', 'crystal', ['fire', 'horn', 'thunder', 'venom']],
    ['taraska', 'fire', ['coral', 'ice']],
    ['pazis', 'feather', ['horn', 'thunder', 'ice']],
    ['nagarjas', 'feather', ['coral', 'crystal', 'thunder', 'venom']],
    ['hydar', 'venom', ['fire', 'metal', 'ice']],
    ['reikal', 'venom', ['coral', 'feather']],
    ['sirkaaj', 'ice', ['horn', 'metal', 'venom']],
    ['mamuraak', 'ice', ['fire', 'crystal', 'feather']],
  ] as const)('%s uses the verified element and weaknesses', (id, element, weaknesses) => {
    expect(monsterById(id)).toMatchObject({ element, weaknesses });
  });
});
