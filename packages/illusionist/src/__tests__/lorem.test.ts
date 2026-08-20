import { en } from '../locales/en';
import { lines, paragraph, paragraphs, sentence, sentences, slug, word, words } from '../lorem/lorem';
import { createSeed } from '../seed/create-seed';
import type { IllusionistContext, IllusionistLocale } from '../types';

function ctx(seed = 12345, locale: IllusionistLocale = en): IllusionistContext {
  return { locale, source: createSeed(seed) };
}

describe('lorem', () => {
  it('word is non-empty', () => {
    const value = word(ctx());

    expect(value.length).toBeGreaterThan(0);
  });

  it('words(5) has 5 words', () => {
    const value = words(ctx(), 5);

    expect(value.split(' ')).toHaveLength(5);
  });

  it('sentence ends with a period and starts with uppercase', () => {
    const value = sentence(ctx());

    expect(value.endsWith('.')).toBe(true);
    expect(value.charAt(0)).toMatch(/[A-Z]/);
  });

  it('sentences(3) has 3 sentences', () => {
    const value = sentences(ctx(), 3);

    expect((value.match(/\./g) ?? []).length).toBe(3);
  });

  it('paragraph is non-empty', () => {
    const value = paragraph(ctx());

    expect(value.length).toBeGreaterThan(0);
  });

  it('paragraphs(2) contains a newline', () => {
    const value = paragraphs(ctx(), 2);

    expect(value).toContain('\n');
  });

  it('slug contains hyphens', () => {
    const value = slug(ctx());

    expect(value).toContain('-');
  });

  it('lines(3) contains newlines', () => {
    const value = lines(ctx(), 3);

    expect(value).toContain('\n');
  });
});
