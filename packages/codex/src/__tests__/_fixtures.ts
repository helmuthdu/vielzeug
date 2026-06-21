import type { BundledData, BundledPackage } from '../types.js';

import { SCHEMA_VERSION } from '../types.js';

export function makePkg(overrides: Partial<BundledPackage> = {}): BundledPackage {
  return {
    apiSource: null,
    availableDocPages: [],
    category: '',
    components: [],
    description: '',
    docs: {},
    exports: [],
    keywords: [],
    name: '@vielzeug/test',
    related: [],
    slug: 'test',
    version: '1.0.0',
    ...overrides,
  };
}

/** Minimal synthetic dataset with one index-only package — guarantees deterministic error paths in server tests. */
export const SYNTHETIC_DATA: BundledData = {
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
  schemaVersion: SCHEMA_VERSION,
  version: '0.0.0',
};

export const VALID_DATA: BundledData = {
  packages: [makePkg({ name: '@vielzeug/x', slug: 'x', version: '1.0.0' })],
  schemaVersion: SCHEMA_VERSION,
  version: '1.0.0',
};
