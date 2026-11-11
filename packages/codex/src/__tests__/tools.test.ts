import { describe, expect, it } from 'vitest';

import type { Catalog } from '../catalog.js';
import type { RefineCatalog } from '../refine-catalog.js';

import { packageTools } from '../tools/packages.js';
import { refineTools } from '../tools/refine.js';

const catalog: Catalog = {
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
  listExamples: () => [],
  listPackages: () => [],
  search: () => [],
};
const refineCatalog: RefineCatalog = {
  ...catalog,
  getComponent: () => ({ tagName: 'ore-button' }),
  listComponents: () => [],
};

function tool(name: string) {
  const result = packageTools.find((item) => item.name === name);

  if (!result) throw new Error(`Missing tool: ${name}`);

  return result;
}

function refineTool(name: string) {
  const result = refineTools.find((item) => item.name === name);

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

  it('rejects invalid and unknown arguments before catalog access', () => {
    expect(() => tool('get-docs').execute({ packageSlug: 1 }, catalog)).toThrow(
      expect.objectContaining({ code: 'INVALID_ARG', message: 'packageSlug: must be a string.' }),
    );
    expect(() => tool('search-packages').execute({ query: '' }, catalog)).toThrow(
      expect.objectContaining({ code: 'INVALID_ARG', message: 'query: required non-empty string.' }),
    );
    expect(() => tool('get-docs').execute({ packageSlug: 'test', pgae: 'api' }, catalog)).toThrow(
      expect.objectContaining({ code: 'INVALID_ARG', message: 'pgae: unknown argument.' }),
    );
  });

  it('publishes strict schemas for generic and Refine tools', () => {
    for (const item of [...packageTools, ...refineTools]) expect(item.inputSchema.additionalProperties).toBe(false);
  });

  it('lists Refine components as tags and descriptions only', () => {
    const catalogWithComponents: RefineCatalog = {
      ...refineCatalog,
      listComponents: () => [{ attributes: [{ name: 'variant' }], description: 'A button.', tagName: 'ore-button' }],
    };

    expect(refineTool('refine-list-components').execute({}, catalogWithComponents)).toEqual([
      { description: 'A button.', tagName: 'ore-button' },
    ]);
  });

  it('filters component CSS properties by case-insensitive prefix', () => {
    const catalogWithComponents: RefineCatalog = {
      ...refineCatalog,
      listComponents: () => [
        {
          cssProperties: [{ name: '--button-gap' }, { name: '--button-color' }, { name: '--input-gap' }],
          tagName: 'ore-button',
        },
      ],
    };

    expect(refineTool('refine-get-tokens').execute({ filter: '--BUTTON-G' }, catalogWithComponents)).toEqual([
      { component: 'ore-button', name: '--button-gap' },
    ]);
    expect(refineTool('refine-get-tokens').execute({ filter: '--size-' }, catalogWithComponents)).toEqual([]);
  });

  it('requires an exact component tag boundary when validating usage', () => {
    expect(
      refineTool('refine-validate-usage').execute(
        { html: '<ore-buttonish></ore-buttonish>', tagName: 'ore-button' },
        refineCatalog,
      ),
    ).toEqual([{ message: 'Could not find opening <ore-button> tag.', type: 'error' }]);
  });
});
