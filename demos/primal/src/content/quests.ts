import type { CampaignAchievementRule, CampaignQuestUnlockRule, Quest } from '../domain/types';
import questData from './data/quests.json';

/** One quest as `scripts/extract-quests.mjs` extracts it from the campaign book: every
 *  field the app reads, minus the unlock-rule tables curated beside it here. */
type QuestRecord = Omit<Quest, 'achievementRules' | 'expirationUnlocks' | 'rewardUnlocks'>;

const unlock = (quest: number, conditions: Omit<CampaignQuestUnlockRule, 'questId'> = {}): CampaignQuestUnlockRule => ({
  ...conditions,
  questId: `quest-${String(quest).padStart(3, '0')}`,
});

const achievementRules: Partial<Record<number, CampaignAchievementRule[]>> = {
  29: [{ achievement: 'Ouroboros', allAchievements: ['The Voice of Woltyar'] }],
  40: [{ achievement: 'Ouroboros', allAchievements: ['The Voice of Woltyar'] }],
};

const rewardUnlocks: Partial<Record<number, CampaignQuestUnlockRule[]>> = {
  1: [unlock(4, { maxChapter: 2 }), unlock(6, { minChapter: 3 })],
  2: [unlock(5)],
  6: [unlock(14)],
  8: [unlock(16)],
  9: [unlock(15)],
  11: [
    unlock(17, { noAchievements: ['The Mushroom Forest'] }),
    unlock(32, { allAchievements: ['The Mushroom Forest'] }),
  ],
  12: [unlock(18, { blockedByQuestIds: ['quest-045'] })],
  13: [unlock(19)],
  15: [unlock(20, { maxChapter: 7, minChapter: 5 })],
  16: [unlock(21)],
  22: [unlock(23)],
  25: [
    unlock(27, { noAchievements: ['The Burning Ember'] }),
    unlock(34, { maxChapter: 7 }),
    unlock(34, { minChapter: 9 }),
  ],
  38: [unlock(39)],
  42: [unlock(45, { blockedByQuestIds: ['quest-018'] })],
  47: [unlock(48)],
};

const expirationUnlocks: Partial<Record<number, CampaignQuestUnlockRule[]>> = {
  1: [unlock(6)],
  2: [unlock(31)],
  3: [unlock(10)],
  4: [unlock(6)],
  7: [unlock(26)],
  8: [unlock(26)],
};

/** Quest scenarios extracted from the campaign book by `scripts/extract-quests.mjs`; the
 *  unlock tables the book only states in prose are curated here. */
export const quests: Quest[] = (questData as QuestRecord[]).map((quest) => ({
  ...quest,
  achievementRules: achievementRules[quest.number] ?? [],
  expansionId: quest.expansionId ?? 'core',
  expirationUnlocks: expirationUnlocks[quest.number] ?? [],
  rewardUnlocks: rewardUnlocks[quest.number] ?? [],
}));

export const questExpirationLabels = (quest: Pick<Quest, 'expires'>): string[] =>
  quest.expires
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const expansion = part.match(/\(([^)]+) Expansion\)/)?.[1];
      const chapter = part.match(/Chapter\s+\d+/i)?.[0] ?? part;
      return expansion ? `${expansion} · ${chapter}` : chapter;
    });

const questsById = new Map(quests.map((quest) => [quest.id, quest] as const));
export const questById = (id: string): Quest | undefined => questsById.get(id);
export const questByNumber = (number: number): Quest | undefined => quests.find((quest) => quest.number === number);
export const questId = (number: number): string => `quest-${String(number).padStart(3, '0')}`;
