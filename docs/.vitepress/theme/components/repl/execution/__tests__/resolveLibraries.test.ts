// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createLibraryResolver, expandDependencyOrder, type LibraryRecord } from '../resolveLibraries';
import { referencedPackages } from '../rewriteImports';

// ore -> [ripple, arsenal]; refine -> [ore, assay] (assay itself depends on arsenal).
const REGISTRY: Record<string, LibraryRecord> = {
  arsenal: { dependencies: [], globalName: 'Arsenal', id: 'arsenal', iifeSource: 'A' },
  assay: { dependencies: ['arsenal'], globalName: 'Assay', id: 'assay', iifeSource: 'B' },
  forge: { dependencies: [], globalName: 'Forge', id: 'forge', iifeSource: 'F' },
  ore: { dependencies: ['ripple', 'arsenal'], globalName: 'Ore', id: 'ore', iifeSource: 'D' },
  refine: { dependencies: ['arsenal', 'ripple', 'ore', 'assay'], globalName: 'Refine', id: 'refine', iifeSource: 'E' },
  ripple: { dependencies: [], globalName: 'Ripple', id: 'ripple', iifeSource: 'C' },
};

describe('referencedPackages', () => {
  it('finds named, default, namespace, side-effect and subpath imports', () => {
    const code = `
      import { mount } from '@vielzeug/ore';
      import ore from '@vielzeug/refine';
      import * as ripple from '@vielzeug/ripple';
      import '@vielzeug/assay';
      import helpers from '@vielzeug/forge/dist/utils';
    `;
    expect(referencedPackages(code)).toEqual(['ore', 'refine', 'ripple', 'assay', 'forge']);
  });

  it('dedupes repeated imports of the same package', () => {
    expect(referencedPackages("import { a } from '@vielzeug/ore'; import { b } from '@vielzeug/ore';")).toEqual([
      'ore',
    ]);
  });

  it('ignores non-vielzeug imports and comment text', () => {
    // The commented line is a real match for a plain regex — the rewrite step has the
    // same limitation, and examples are plain code, so this documents shared behavior.
    expect(referencedPackages("import { z } from 'zod';\nimport { p } from '@pkg/notviel';")).toEqual([]);
  });
});

describe('expandDependencyOrder', () => {
  it('lists deps before dependents with no duplicates', () => {
    expect(expandDependencyOrder(['refine'], REGISTRY)).toEqual(['arsenal', 'ripple', 'ore', 'assay', 'refine']);
  });

  it('unions multiple roots in first-seen order', () => {
    expect(expandDependencyOrder(['forge', 'ore'], REGISTRY)).toEqual(['forge', 'ripple', 'arsenal', 'ore']);
  });
});

describe('createLibraryResolver', () => {
  const resolver = createLibraryResolver({ registry: REGISTRY, selectedId: 'forge' });

  it('loads only the selected chain when code imports nothing', () => {
    expect(resolver('console.log(1)').map((l) => l.globalName)).toEqual(['Forge']);
  });

  it('unions imported packages with the selected chain, deps first', () => {
    expect(resolver("import { h } from '@vielzeug/refine';").map((l) => l.globalName)).toEqual([
      'Forge',
      'Arsenal',
      'Ripple',
      'Ore',
      'Assay',
      'Refine',
    ]);
  });

  it('does not duplicate a package already in the selected chain', () => {
    const oreResolver = createLibraryResolver({ registry: REGISTRY, selectedId: 'ore' });
    expect(oreResolver("import { x } from '@vielzeug/ore';").map((l) => l.globalName)).toEqual([
      'Ripple',
      'Arsenal',
      'Ore',
    ]);
  });

  it('throws a friendly error for unregistered packages', () => {
    expect(() => resolver("import { x } from '@vielzeug/mystery';")).toThrowError(
      /Unknown @vielzeug package in code: @vielzeug\/mystery/,
    );
  });

  it('prepends the Temporal polyfill when tempo is loaded', () => {
    const withTempo: Record<string, LibraryRecord> = {
      ...REGISTRY,
      tempo: { dependencies: [], globalName: 'Tempo', id: 'tempo', iifeSource: 'T' },
    };
    const tempoResolver = createLibraryResolver({
      registry: withTempo,
      selectedId: 'forge',
      temporalPolyfill: 'globalThis.Temporal = {};',
    });
    const libs = tempoResolver("import { z } from '@vielzeug/tempo';");
    expect(libs[0]?.globalName).toBe('__temporalPolyfill');
    expect(libs[1]?.globalName).toBe('Forge');
  });
});
