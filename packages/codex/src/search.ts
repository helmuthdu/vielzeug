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

/**
 * Pre-normalised version of a package's searchable fields — computed once in
 * buildToolContext and reused across all queries. Avoids repeated toLowerCase/replace
 * per query per package.
 */
interface NormalisedPackage {
  availableDocPages: DocPage[];
  category: string;
  description: string;
  docs: Partial<Record<DocPage, string>>;
  exports: string;
  keywords: string;
  name: string;
  related: string;
  slug: string;
  source: string | null;
}

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

function normalise(s: string): string {
  return s.toLowerCase().replace(/-/g, ' ');
}

export function normalisePackage(pkg: BundledPackage): NormalisedPackage {
  const docs: Partial<Record<DocPage, string>> = {};

  for (const page of pkg.availableDocPages) {
    const content = pkg.docs[page];

    if (typeof content === 'string') docs[page] = normalise(content);
  }

  return {
    availableDocPages: pkg.availableDocPages,
    category: normalise(pkg.category),
    description: normalise(pkg.description),
    docs,
    exports: pkg.exports.map(normalise).join(' '),
    keywords: pkg.keywords.map(normalise).join(' '),
    name: pkg.name,
    related: pkg.related.map(normalise).join(' '),
    slug: pkg.slug,
    source: pkg.apiSource ? normalise(pkg.apiSource) : null,
  };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/** Returns true if every term appears in the already-normalised haystack. */
function allTermsMatch(haystack: string, terms: string[]): boolean {
  return terms.every((t) => haystack.includes(t));
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

/** Score a pre-normalised package against a query. The query is normalised here; fields are pre-normalised. */
export function scorePackage(pkg: NormalisedPackage, query: string): SearchHit | null {
  const terms = normalise(query)
    .split(/\s+/)
    .filter((t) => t.length > 0);

  if (terms.length === 0) return null;

  let score = 0;
  const matched = new Set<SearchHit['matchedIn'][number]>();
  const matchedPages: DocPage[] = [];

  if (allTermsMatch(normalise(pkg.name), terms)) {
    score = Math.max(score, W.name);
    matched.add('metadata');
  }

  if (allTermsMatch(pkg.category, terms)) {
    score = Math.max(score, W.category);
    matched.add('metadata');
  }

  if (allTermsMatch(pkg.description, terms)) {
    score = Math.max(score, W.description);
    matched.add('metadata');
  }

  if (pkg.keywords && allTermsMatch(pkg.keywords, terms)) {
    score = Math.max(score, W.keywords);
    matched.add('keywords');
  }

  if (pkg.exports && allTermsMatch(pkg.exports, terms)) {
    score = Math.max(score, W.exports);
    matched.add('exports');
  }

  if (pkg.related && allTermsMatch(pkg.related, terms)) {
    score = Math.max(score, W.related);
    matched.add('related');
  }

  for (const page of pkg.availableDocPages) {
    const content = pkg.docs[page];

    if (typeof content === 'string' && allTermsMatch(content, terms)) {
      score = Math.max(score, W.docs);
      matched.add('docs');
      matchedPages.push(page);
    }
  }

  if (pkg.source && allTermsMatch(pkg.source, terms)) {
    score = Math.max(score, W.source);
    matched.add('source');
  }

  if (score === 0) return null;

  return {
    matchedIn: [...matched] as SearchHit['matchedIn'],
    ...(matchedPages.length > 0 && { matchedPages }),
    name: pkg.name,
    score,
    slug: pkg.slug,
  };
}
