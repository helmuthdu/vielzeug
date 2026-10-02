import { describe, expect, it } from 'vitest';
import { loreExcerpt, paceLore, selectNarrative } from './lore';
import { TRIAL_SERIES } from './trials';

/**
 * The lore shaping contract: an opening sentence that works as a hook, body pacing of a
 * few paragraphs with the closing reflection set apart, and no sentence lost between
 * them. Sentence extraction itself lives with the speech reader that follows it.
 */

describe('lore journal shaping', () => {
  it('excerpts each series opening sentence as the hook', () => {
    for (const series of TRIAL_SERIES) {
      const excerpt = loreExcerpt(series.lore);
      expect(series.lore.startsWith(excerpt), series.id).toBe(true);
      expect(excerpt.endsWith('.'), series.id).toBe(true);
    }
  });

  it('paces a body into up to three paragraphs with the closing apart', () => {
    const sentences = ['One.', 'Two.', 'Three.', 'Four.', 'Something blooms within us.'];

    const { closing, paragraphs } = paceLore(sentences);

    expect(closing).toBe('Something blooms within us.');
    expect(paragraphs.length).toBeGreaterThanOrEqual(2);
    expect(paragraphs.length).toBeLessThanOrEqual(3);
    expect(paragraphs.flat().at(-1)).toBe('Four.');
  });

  it('keeps every sentence across paragraphs and closing', () => {
    const sentences = ['A.', 'B.', 'C.', 'D.', 'E.', 'F.', 'G.'];

    const { closing, paragraphs } = paceLore(sentences);

    const reassembled = [...paragraphs.flat(), closing].filter(Boolean).join(' ');
    expect(reassembled).toBe(sentences.join(' '));
  });

  it('keeps a long closing thought inside the body', () => {
    const longClosing = `A long closing thought ${'word '.repeat(40)}.`;

    const { closing, paragraphs } = paceLore(['First.', 'Second.', 'Third.', longClosing]);

    expect(closing).toBeNull();
    expect(paragraphs.flat().join(' ')).toBe(['First.', 'Second.', 'Third.', longClosing].join(' '));
  });

  it('keeps a lone sentence together as one paragraph', () => {
    const { closing, paragraphs } = paceLore(['One sentence only.']);

    expect(closing).toBeNull();
    expect(paragraphs).toEqual([['One sentence only.']]);
  });

  it('selects the available narrative branch while keeping shared passages', () => {
    const narrative = selectNarrative(
      [
        { id: 'shared', paragraphs: ['Shared.'], summary: 'Shared summary', title: 'Introduction' },
        {
          condition: { maxChapter: 2 },
          id: 'early',
          paragraphs: ['Early.'],
          summary: 'Early summary',
          title: 'Variant A',
        },
        {
          condition: { minChapter: 3 },
          id: 'late',
          paragraphs: ['Late.'],
          summary: 'Late summary',
          title: 'Variant B',
        },
      ],
      2,
      [],
      'Fallback.',
    );

    expect(narrative).toEqual({ excerpt: 'Early summary', lore: 'Shared. Early.' });
  });

  it('uses legacy quest text when no structured passage is available', () => {
    const fallback = 'The quest introduction.';

    expect(
      selectNarrative(
        [{ condition: { minChapter: 3 }, id: 'later', paragraphs: ['Later.'], summary: 'Later', title: 'Later' }],
        2,
        [],
        fallback,
      ),
    ).toEqual({ excerpt: fallback, lore: fallback });
  });

  it('sets no closing apart from a short body: too little to stand over', () => {
    const { closing, paragraphs } = paceLore(['One.', 'Two.']);

    expect(closing).toBeNull();
    expect(paragraphs.flat().join(' ')).toBe('One. Two.');
  });

  it('shapes an empty entry into nothing', () => {
    const { closing, paragraphs } = paceLore([]);

    expect(closing).toBeNull();
    expect(paragraphs).toEqual([]);
    expect(loreExcerpt('')).toBe('');
  });

  it('truncates an unpunctuated blob at a word boundary', () => {
    const excerpt = loreExcerpt(`word ${'word '.repeat(60).trim()}`);
    expect(excerpt.endsWith('…')).toBe(true);
    expect(excerpt.length).toBeLessThanOrEqual(201);
  });
});
