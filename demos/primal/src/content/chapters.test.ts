import { describe, expect, it } from 'vitest';
import { chapterByNumber, chapters, finalBattle, TOTAL_CHAPTERS } from './chapters';
import { loreExcerpt, loreSentences, narrativeAvailable, paceLore } from './lore';

const chapterLore = (chapter: (typeof chapters)[number]) => chapter.paragraphs.join(' ');

describe('campaign chapter prose', () => {
  it('carries narrative prose for every chapter', () => {
    expect(chapters).toHaveLength(TOTAL_CHAPTERS);
    for (const chapter of chapters) {
      expect(chapter.paragraphs.length, `chapter ${chapter.number}`).toBeGreaterThan(0);
      for (const paragraph of chapter.paragraphs) {
        expect(paragraph.trim().length, `chapter ${chapter.number}`).toBeGreaterThan(40);
      }
    }
  });

  it('exposes prose through the chapter lookup', () => {
    for (let number = 1; number <= TOTAL_CHAPTERS; number += 1) {
      const chapter = chapterByNumber(number);
      expect(chapter?.paragraphs.length, `chapter ${number}`).toBeGreaterThan(0);
    }
    expect(chapterByNumber(TOTAL_CHAPTERS + 1)).toBeUndefined();
  });

  it('shapes every chapter through the journal lore functions without losing text', () => {
    for (const chapter of chapters) {
      const lore = chapterLore(chapter);
      expect(loreExcerpt(lore).length, `chapter ${chapter.number}`).toBeGreaterThan(0);
      const { closing, paragraphs } = paceLore(loreSentences(lore));
      const reassembled = [...paragraphs.flat(), ...(closing ? [closing] : [])].join(' ');
      expect(reassembled, `chapter ${chapter.number}`).toBe(lore.replace(/\s+/g, ' ').trim());
    }
  });

  it('ends every paragraph so sentence shaping keeps all of it', () => {
    for (const chapter of chapters) {
      for (const paragraph of chapter.paragraphs) {
        expect(/[.!?]["’”]?$/u.test(paragraph.trim()), `chapter ${chapter.number}`).toBe(true);
      }
    }
  });

  it('poses the lore questions only in the final chapter', () => {
    for (const chapter of chapters.filter((entry) => entry.number < TOTAL_CHAPTERS)) {
      expect(chapter.loreQuestions, `chapter ${chapter.number}`).toBeUndefined();
    }
    const final = chapterByNumber(TOTAL_CHAPTERS);
    expect(final?.loreQuestions).toHaveLength(5);
    expect(final?.loreQuestions?.[0]).toBe('What happened to the ancient civilizations?');
  });
});

describe('final battle endings', () => {
  const endings = [finalBattle.endings.dawn, finalBattle.endings.rebirth];

  it('carry narrative prose shaped by the journal lore functions', () => {
    for (const ending of endings) {
      expect(ending.paragraphs.length).toBeGreaterThan(0);
      const lore = ending.paragraphs.join(' ');
      expect(loreExcerpt(lore).length).toBeGreaterThan(0);
      const { closing, paragraphs } = paceLore(loreSentences(lore));
      const reassembled = [...paragraphs.flat(), ...(closing ? [closing] : [])].join(' ');
      expect(reassembled).toBe(lore.replace(/\s+/g, ' ').trim());
    }
  });

  it('keep their authored summary as the excerpt hook', () => {
    for (const ending of endings) {
      expect(ending.summary.length).toBeGreaterThan(20);
      expect(ending.title.length).toBeGreaterThan(0);
    }
  });

  it('extracts the Lantern Bearer and conditional Awakened narrative', () => {
    expect(finalBattle.lanternBearer.paragraphs.length).toBeGreaterThan(0);
    expect(finalBattle.lore.introduction.paragraphs.length).toBeGreaterThan(0);
    expect(finalBattle.lore.vision.title).toBe('Blood Vision');
    expect(finalBattle.lore.vision.paragraphs.length).toBeGreaterThan(0);
    expect(finalBattle.lore.conclusions).toHaveLength(3);

    const branches = finalBattle.lore.conclusions.filter((passage) => passage.condition);
    expect(
      branches.filter((passage) => narrativeAvailable(passage.condition, 11, ['The Voice of Woltyar'])),
    ).toHaveLength(1);
    expect(
      branches.filter((passage) => narrativeAvailable(passage.condition, 11, [])).map((passage) => passage.title),
    ).toEqual(['Otherwise']);
  });
});
