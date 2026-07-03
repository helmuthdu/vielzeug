import type { BundledData, BundledPackage } from '../types.js';

import { SCHEMA_VERSION } from '../types.js';

export function makePkg(overrides: Partial<BundledPackage> = {}): BundledPackage {
  return {
    apiSource: null,
    availableDocPages: [],
    category: '',
    description: '',
    docs: {},
    examples: [],
    exports: [],
    keywords: [],
    name: '@vielzeug/test',
    related: [],
    slug: 'test',
    typeSignatures: {},
    version: '1.0.0',
    ...overrides,
  };
}

/** Builds a full BundledData object, defaulting to no packages and no refine CEM data. */
export function makeData(overrides: Partial<BundledData> = {}): BundledData {
  return {
    packages: [],
    refineComponents: [],
    schemaVersion: SCHEMA_VERSION,
    version: '0.0.0',
    ...overrides,
  };
}

/** Minimal synthetic dataset with one index-only package — guarantees deterministic error paths in server tests. */
export const SYNTHETIC_DATA: BundledData = makeData({
  packages: [
    makePkg({
      availableDocPages: ['index'],
      category: 'test',
      description: 'Synthetic test package',
      docs: { index: '# Synthetic\n\nTest content.' },
      exports: ['syntheticFn'],
      keywords: ['synthetic'],
      name: '@vielzeug/synthetic',
      slug: 'synthetic',
    }),
  ],
});

export const VALID_DATA: BundledData = makeData({
  packages: [makePkg({ name: '@vielzeug/x', slug: 'x', version: '1.0.0' })],
  version: '1.0.0',
});
