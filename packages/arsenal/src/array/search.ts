import { similarity } from '../string/similarity';

export type ScoredResult<T> = { item: T; score: number };

export type FuzzyOptions = {
  normalize?: boolean;
  threshold?: number;
};

export type FuzzySelection<T> = FuzzyOptions & {
  select: (item: T) => string | readonly string[];
};

const normalizeText = (value: string): string => value.normalize('NFKD').replace(/\p{M}/gu, '');

const termsFor = <T>(item: T, select: (item: T) => string | readonly string[]): readonly string[] => {
  const selected = select(item);

  return typeof selected === 'string' ? [selected] : selected;
};

const prepareQuery = (query: string, normalize: boolean): string => {
  const trimmed = query.trim().toLowerCase();

  return normalize ? normalizeText(trimmed) : trimmed;
};

const score = <T>(
  item: T,
  query: string,
  normalize: boolean,
  select: (item: T) => string | readonly string[],
): number => {
  return termsFor(item, select).reduce((best, term) => {
    const value = normalize ? normalizeText(term.toLowerCase()) : term.toLowerCase();

    return Math.max(best, similarity(value, query));
  }, 0);
};

const stringSelection = (value: string): string => value;

export function fuzzyFilter(array: readonly string[], query: string, options?: FuzzyOptions): string[];
export function fuzzyFilter<T>(array: readonly T[], query: string, options: FuzzySelection<T>): T[];
export function fuzzyFilter<T>(
  array: readonly T[],
  query: string,
  options: FuzzyOptions | FuzzySelection<T> = {},
): T[] {
  const { normalize = false, threshold = 0.25 } = options;
  const select = 'select' in options ? options.select : (stringSelection as (item: T) => string);
  const searchTerm = prepareQuery(query, normalize);

  if (!searchTerm) return [...array];

  return array.filter((item) => score(item, searchTerm, normalize, select) >= threshold);
}

export function fuzzyScore(array: readonly string[], query: string, options?: FuzzyOptions): ScoredResult<string>[];
export function fuzzyScore<T>(array: readonly T[], query: string, options: FuzzySelection<T>): ScoredResult<T>[];
export function fuzzyScore<T>(
  array: readonly T[],
  query: string,
  options: FuzzyOptions | FuzzySelection<T> = {},
): ScoredResult<T>[] {
  const { normalize = false, threshold = 0.25 } = options;
  const select = 'select' in options ? options.select : (stringSelection as (item: T) => string);
  const searchTerm = prepareQuery(query, normalize);

  if (!searchTerm) return array.map((item) => ({ item, score: 1 }));

  return array
    .map((item) => ({ item, score: score(item, searchTerm, normalize, select) }))
    .filter((result) => result.score >= threshold)
    .sort((a, b) => b.score - a.score);
}
