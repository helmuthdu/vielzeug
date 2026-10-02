import keywordData from './data/keywords.json';

export interface Keyword {
  id: string;
  name: string;
  /** Hunter or monster the trait belongs to, e.g. "Mirah" for Aim. */
  scope: string | null;
  text: string;
}

/** Rulebook glossary extracted by `scripts/extract-quests.mjs`. */
export const keywords: Keyword[] = keywordData as Keyword[];
