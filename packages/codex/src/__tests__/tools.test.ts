import { describe, expect, it } from 'vitest';

import type { Catalog } from '../catalog.js';

import { packageTools } from '../tools/packages.js';

const catalog: Catalog = {
  getComponent: () => ({ tagName: 'ore-button' }),
  getContent: () => ({ apiSource: null, docs: {}, examples: [], typeSignatures: {} }),
  getDocs: (slug, page) => `${slug}:${page}`,
  getExample: () => ({ code: 'run()', id: 'basic', name: 'Basic' }),
  getPackage: (slug) => ({
    availableDocPages: ['index'],
    category: 'test',
    description: 'Test',
    exampleIds: [],
    exports: [],
    hasSource: false,
    keywords: [],
    name: '@vielzeug/test',
    related: [],
    slug,
    version: '1.0.0',
  }),
  getSource: () => 'export {}',
  getTypeSignature: () => 'export type Test = string',
  listComponents: () => [],
  listExamples: () => [],
  listPackages: () => [],
  search: () => [],
};

function tool(name: string) {
  const result = packageTools.find((item) => item.name === name);

  if (!result) throw new Error(`Missing tool: ${name}`);

  return result;
}

describe('MCP tool adapters', () => {
  it('returns catalog values without MCP result coupling', () => {
    expect(tool('get-docs').execute({ packageSlug: 'test' }, catalog)).toBe('test:index');
    expect(tool('get-type-signature').execute({ slug: 'test', symbol: 'Test' }, catalog)).toBe(
      'export type Test = string',
    );
  });

  it('rejects invalid arguments before catalog access', () => {
    expect(() => tool('get-docs').execute({ packageSlug: 1 }, catalog)).toThrow('packageSlug: must be a string');
    expect(() => tool('search-packages').execute({ query: '' }, catalog)).toThrow('query: required non-empty string');
  });
});
