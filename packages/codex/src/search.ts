import type { BundledPackage, DocPage } from './types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchHit {
  /** All categories in which the term was found. */
  matchedIn: Array<'docs' | 'exports' | 'keywords' | 'metadata' | 'source'>;
  /** Doc pages where the term appeared. Present when matchedIn includes "docs". */
  matchedPages?: DocPage[];
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

/** Returns true if every term in `terms` appears in `haystack` (case-insensitive, hyphens normalized to spaces). */
function allTermsMatch(haystack: string, terms: string[]): boolean {
  const lower = haystack.toLowerCase().replace(/-/g, ' ');

  return terms.every((t) => lower.includes(t));
}

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

  if ([pkg.name, pkg.description, pkg.category].some((s) => allTermsMatch(s, terms))) {
    score = Math.max(score, 3);
    matchedIn.push('metadata');
  }

  if (pkg.keywords.some((kw) => allTermsMatch(kw, terms))) {
    score = Math.max(score, 2);
    matchedIn.push('keywords');
  }

  if (pkg.exports.some((ex) => allTermsMatch(ex, terms))) {
    score = Math.max(score, 2);
    matchedIn.push('exports');
  }

  for (const page of pkg.availableDocPages) {
    const content = pkg.docs[page];

    if (typeof content === 'string' && allTermsMatch(content, terms)) {
      score = Math.max(score, 1);

      if (!matchedIn.includes('docs')) matchedIn.push('docs');

      matchedPages.push(page);
    }
  }

  if (pkg.apiSource && allTermsMatch(pkg.apiSource, terms)) {
    score = Math.max(score, 1);
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
