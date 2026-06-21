export const description = 'Trigram fuzzy-search index with match highlighting and reactive layer.';

export const loader = () => import('@vielzeug/scout');

export const apiExports = [
  'createIndex',
  'createReactiveSearch',
  'createSearch',
  'highlight',
  'highlightField',
  'toFilterPredicate',
  'toSearchFn',
] as const;
