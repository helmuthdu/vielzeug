import type { NarrativeCondition, NarrativePassage } from '../domain/types';

/**
 * Journal-lore shaping: the printed narrative strings (Winds series, trial cards, ascent
 * chapters) are re-read as a journal rather than fine print. Pure text shaping: the lore
 * strings are content and stay untouched; these decide only how an entry is excerpted and paced.
 */

/** The entry's sentences: printed journal prose ends . ! or ?, with no abbreviations;
 *  closing quotation marks belong to the sentence they end. The speech reader splits
 *  with the same shape, so a paced display and the spoken stream share one order. */
export function loreSentences(lore: string): string[] {
  const normalized = lore.replace(/\s+/g, ' ');
  const sentences = normalized.match(/[^.!?]+[.!?]+["'”’»]*\s*/g);
  if (sentences) return sentences.map((sentence) => sentence.trim());
  const rest = normalized.trim();
  return rest ? [rest] : [];
}

/** The opening line: the hook shown collapsed in the excerpt band and on selection cards. */
export function loreExcerpt(lore: string): string {
  const first = loreSentences(lore)[0] ?? '';
  if (first.length <= 220) return first;
  const cut = first.slice(0, 200);
  const end = cut.lastIndexOf(' ');
  return `${cut.slice(0, end > 0 ? end : 200)}…`;
}

/** Whether a campaign chapter and achievement set selects a conditional narrative passage. */
export function narrativeAvailable(
  condition: NarrativeCondition | undefined,
  chapter: number,
  achievements: readonly string[],
): boolean {
  if (!condition) return true;
  if (condition.minChapter !== undefined && chapter < condition.minChapter) return false;
  if (condition.maxChapter !== undefined && chapter > condition.maxChapter) return false;
  if (condition.achievement && !achievements.includes(condition.achievement)) return false;
  if (condition.unlessAchievement && achievements.includes(condition.unlessAchievement)) return false;
  return true;
}

/** Selects a chapter's available passages for a journal entry, preserving its legacy text as fallback. */
export function selectNarrative(
  passages: readonly NarrativePassage[],
  chapter: number,
  achievements: readonly string[],
  fallback: string,
): { excerpt: string; lore: string } {
  const available = passages.filter((passage) => narrativeAvailable(passage.condition, chapter, achievements));

  return {
    excerpt: available.find((passage) => passage.condition)?.summary ?? available[0]?.summary ?? fallback,
    lore: available.flatMap((passage) => passage.paragraphs).join(' ') || fallback,
  };
}

/**
 * Paces the entry's sentences for display: the body grouped into up to three
 * paragraphs, with the closing reflection: the last sentence, when short enough
 * to stand apart: left to its own line.
 */
export function paceLore(sentences: string[]): { closing: string | null; paragraphs: string[][] } {
  const last = sentences.at(-1) ?? null;
  const closing = last !== null && sentences.length >= 4 && last.length <= 180 ? last : null;
  const body = closing ? sentences.slice(0, -1) : sentences;
  const groupCount = Math.min(3, Math.max(1, Math.ceil(body.length / 3)));
  const size = Math.ceil(body.length / groupCount);
  const paragraphs = Array.from({ length: groupCount }, (_, group) =>
    body.slice(group * size, group * size + size),
  ).filter((group) => group.length > 0);
  return { closing, paragraphs };
}
