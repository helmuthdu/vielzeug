import type { BundledPackage, DocPage } from './types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchHit {
  /** REPL example ids where the term appeared. Present when matchedIn includes "examples". */
  matchedExamples?: string[];
  /** All categories in which the term was found. */
  matchedIn: Array<'docs' | 'examples' | 'exports' | 'keywords' | 'metadata' | 'related' | 'source'>;
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

/** One example's id plus its already-normalised `name + code` searchable text. */
interface NormalisedExample {
  id: string;
  text: string;
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
  examples: NormalisedExample[];
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
    examples: pkg.examples.map((e) => ({ id: e.id, text: normalise(`${e.name} ${e.code}`) })),
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
  examples: 0.95,
  exports: 2.2,
  keywords: 2.5,
  name: 3.9,
  related: 2.0,
  source: 0.9,
} as const;

/**
 * Ordered highest-to-lowest for `describeScoreTiers()`. Single source of truth for the
 * search-packages tool description's "score: name(3.9) > category(3.5) > ..." prose — the
 * numbers used to be hand-typed into that description separately from `W`, so retuning a
 * weight silently made the description lie about the actual scoring.
 */
const SCORE_TIERS = [
  ['name', W.name],
  ['category', W.category],
  ['description', W.description],
  ['keywords', W.keywords],
  ['exports', W.exports],
  ['related', W.related],
  ['docs', W.docs],
  ['examples', W.examples],
  ['source', W.source],
] as const;

export function describeScoreTiers(): string {
  return SCORE_TIERS.map(([label, weight]) => `${label}(${weight})`).join(' > ');
}

/** Fields matched by simple substring inclusion, where the matchedIn category name equals the field name. */
const SIMPLE_FIELDS = ['keywords', 'exports', 'related', 'source'] as const;

/** Score a pre-normalised package against a query. The query is normalised here; fields are pre-normalised. */
export function scorePackage(pkg: NormalisedPackage, query: string): SearchHit | null {
  const terms = normalise(query)
    .split(/\s+/)
    .filter((t) => t.length > 0);

  if (terms.length === 0) return null;

  let score = 0;
  const matched = new Set<SearchHit['matchedIn'][number]>();
  const matchedPages: DocPage[] = [];
  const matchedExamples: string[] = [];

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

  for (const field of SIMPLE_FIELDS) {
    const value = pkg[field];

    if (value && allTermsMatch(value, terms)) {
      score = Math.max(score, W[field]);
      matched.add(field);
    }
  }

  for (const page of pkg.availableDocPages) {
    const content = pkg.docs[page];

    if (typeof content === 'string' && allTermsMatch(content, terms)) {
      score = Math.max(score, W.docs);
      matched.add('docs');
      matchedPages.push(page);
    }
  }

  for (const example of pkg.examples) {
    if (allTermsMatch(example.text, terms)) {
      score = Math.max(score, W.examples);
      matched.add('examples');
      matchedExamples.push(example.id);
    }
  }

  if (score === 0) return null;

  return {
    ...(matchedExamples.length > 0 && { matchedExamples }),
    matchedIn: [...matched] as SearchHit['matchedIn'],
    ...(matchedPages.length > 0 && { matchedPages }),
    name: pkg.name,
    score,
    slug: pkg.slug,
  };
}
