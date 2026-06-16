import type { BundledPackage, DocPage } from './types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchHit {
  /** All categories in which the term was found. */
  matchedIn: Array<'docs' | 'exports' | 'keywords' | 'metadata' | 'related' | 'source'>;
  /** Doc pages where the term appeared. Present when matchedIn includes "docs". */
  matchedPages?: DocPage[];
  name: string;
  /**
   * Weighted ranking score. Tiers: 3.x = metadata (name > category > description),
   * 2.x = keywords > exports > related, 1.x = docs > source.
   * Multiple matches accumulate the highest weighted score across all matched fields.
   * Sort descending by score, then ascending by slug as tiebreaker.
   */
  score: number;
  slug: string;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/** Returns true if every term in `terms` appears in `haystack` (case-insensitive, hyphens normalized to spaces). */
function allTermsMatch(haystack: string, terms: string[]): boolean {
  const lower = haystack.toLowerCase().replace(/-/g, ' ');

  return terms.every((t) => lower.includes(t));
}

/** Weighted scores — higher = stronger signal within tier. */
const W = {
  category: 3.5,
  description: 3.1,
  docs: 1.0,
  exports: 2.2,
  keywords: 2.5,
  name: 3.9,
  related: 2.0,
  source: 0.9,
} as const;

export function scorePackage(pkg: BundledPackage, query: string): SearchHit | null {
  const terms = query
    .toLowerCase()
    .replace(/-/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0);

  if (terms.length === 0) return null;

  let score = 0;
  const matchedIn: SearchHit['matchedIn'] = [];
  const matchedPages: DocPage[] = [];

  if (allTermsMatch(pkg.name, terms)) {
    score = Math.max(score, W.name);
    matchedIn.push('metadata');
  }

  if (allTermsMatch(pkg.category, terms)) {
    score = Math.max(score, W.category);

    if (!matchedIn.includes('metadata')) matchedIn.push('metadata');
  }

  if (allTermsMatch(pkg.description, terms)) {
    score = Math.max(score, W.description);

    if (!matchedIn.includes('metadata')) matchedIn.push('metadata');
  }

  if (pkg.keywords.some((kw) => allTermsMatch(kw, terms))) {
    score = Math.max(score, W.keywords);
    matchedIn.push('keywords');
  }

  if (pkg.exports.some((ex) => allTermsMatch(ex, terms))) {
    score = Math.max(score, W.exports);
    matchedIn.push('exports');
  }

  if (pkg.related.some((rel) => allTermsMatch(rel, terms))) {
    score = Math.max(score, W.related);
    matchedIn.push('related');
  }

  for (const page of pkg.availableDocPages) {
    const content = pkg.docs[page];

    if (typeof content === 'string' && allTermsMatch(content, terms)) {
      score = Math.max(score, W.docs);

      if (!matchedIn.includes('docs')) matchedIn.push('docs');

      matchedPages.push(page);
    }
  }

  if (pkg.apiSource && allTermsMatch(pkg.apiSource, terms)) {
    score = Math.max(score, W.source);
    matchedIn.push('source');
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
