import type { BundledPackage } from './types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchHit {
  /** All categories in which the term was found. */
  matchedIn: Array<'docs' | 'exports' | 'keywords' | 'metadata'>;
  /** Doc pages (and/or "source") where the term appeared. Present when matchedIn includes "docs". */
  matchedPages?: string[];
  name: string;
  /**
   * Ranking score: 3 = metadata match (name/description/category),
   * 2 = keywords or exports match, 1 = docs/source match.
   * Multiple matches return the highest category score.
   */
  score: number;
  slug: string;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export function scorePackage(pkg: BundledPackage, query: string): SearchHit | null {
  const term = query.toLowerCase();
  const has = (s: string) => s.toLowerCase().includes(term);

  let score = 0;
  const matchedIn: SearchHit['matchedIn'] = [];
  const matchedPages: string[] = [];

  if ([pkg.name, pkg.description, pkg.category].some(has)) {
    score = Math.max(score, 3);
    matchedIn.push('metadata');
  }

  if (pkg.keywords.some(has)) {
    score = Math.max(score, 2);
    matchedIn.push('keywords');
  }

  if (pkg.exports.some(has)) {
    score = Math.max(score, 2);
    matchedIn.push('exports');
  }

  for (const page of pkg.availableDocPages) {
    const content = pkg.docs[page];

    if (typeof content === 'string' && has(content)) {
      score = Math.max(score, 1);

      if (!matchedIn.includes('docs')) matchedIn.push('docs');

      matchedPages.push(page);
    }
  }

  if (pkg.apiSource && has(pkg.apiSource)) {
    score = Math.max(score, 1);

    if (!matchedIn.includes('docs')) matchedIn.push('docs');

    matchedPages.push('source');
  }

  if (score === 0) return null;

  return {
    matchedIn,
    ...(matchedPages.length > 0 && { matchedPages }),
    name: pkg.name,
    score,
    slug: pkg.slug,
  };
}
