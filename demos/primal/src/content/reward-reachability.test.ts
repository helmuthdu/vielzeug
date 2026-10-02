import { describe, expect, it } from 'vitest';
import { chapters } from './chapters';
import { quests } from './quests';

/** Every printed reward card must be earnable in some campaign path. */
const cardsGrantedBy = (lines: readonly string[]): number[] => {
  const cards: number[] = [];
  for (const line of lines) {
    const segment = /reward cards?\s+([^.;]+)/i.exec(line)?.[1] ?? '';
    const numbers = [...segment.matchAll(/\d+/g)].map(Number).filter((n) => n >= 1 && n <= 38);
    for (const card of numbers) {
      cards.push(card);
      if (/both copies/i.test(line)) cards.push(card);
    }
  }
  return cards;
};

describe('reward card availability', () => {
  it('grants every printed reward card through some quest or chapter story', () => {
    const questNumber = (questId: string) => Number(questId.split('-')[1]);

    // Reachability over the quest graph: chapter instruction unlocks and questUnlocks seed the
    // board, then completion and expiration rules carry it forward.
    const reachable = new Set<number>();
    const queue: number[] = [];
    for (const chapter of chapters) {
      const unlocked = [
        ...chapter.instructions.flatMap((instruction) => instruction.unlocks ?? []),
        ...(chapter.questUnlocks ?? []).map((rule) => questNumber(rule.questId)),
      ];
      for (const number of unlocked) {
        if (!reachable.has(number)) {
          reachable.add(number);
          queue.push(number);
        }
      }
    }
    while (queue.length) {
      const number = queue.shift()!;
      const quest = quests.find((entry) => entry.number === number);
      if (!quest) continue;
      for (const rule of [...(quest.rewardUnlocks ?? []), ...(quest.expirationUnlocks ?? [])]) {
        const number = questNumber(rule.questId);
        if (!reachable.has(number)) {
          reachable.add(number);
          queue.push(number);
        }
      }
    }

    const granted = new Set<number>();
    for (const quest of quests) {
      if (reachable.has(quest.number)) {
        for (const card of cardsGrantedBy(quest.rewards)) granted.add(card);
      }
    }
    for (const chapter of chapters) {
      for (const rule of chapter.rewardCardUnlocks ?? []) granted.add(rule.card);
    }

    const missing: number[] = [];
    for (let card = 1; card <= 38; card++) if (!granted.has(card)) missing.push(card);
    expect(missing).toEqual([]);
  });

  it('derives the Awakened set from chapter 11 achievements', () => {
    const finale = chapters.find((chapter) => chapter.number === 11);
    expect(finale?.awakenedSetUnlocks).toEqual([
      { allAchievements: ['The Bones of the Ancient'], set: 'ancient' },
      { allAchievements: ['The Dragon Star'], set: 'celestial' },
    ]);
  });
});
