// Category functions are re-exported from the root barrel (ROOT_EXPORTS) and reach
// consumers through the bound `createIllusion()` instance. Only locale data keeps a
// dedicated subpath because the root deliberately does not statically import it.
export const EXPORTS = {};

export const SUBPATH_EXPORTS = {
  'locales': 'locales/index',
  'locales/de': 'locales/de',
  'locales/en': 'locales/en',
};

export const ROOT_EXPORTS = [
  'commerce/commerce',
  'date/date',
  'errors',
  'factory',
  'finance/finance',
  'internet/internet',
  'location/location',
  'lorem/lorem',
  'person/person',
  'seed/create-seed',
  'seed/mulberry32',
  'types',
];
