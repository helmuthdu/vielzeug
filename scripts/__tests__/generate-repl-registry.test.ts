import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';
import ts from 'typescript';

import {
  buildRegistrySource,
  extractApi,
  findGetBundleConfigCall,
  normalizeAmbientText,
  parseBundleMeta,
  readDistFile,
  readExternalDeps,
  resolveLoadOrder,
  toPrintableNode,
} from '../generate-repl-registry';

describe('module has no import-time side effects', () => {
  it('only exports functions/constants, does not touch the filesystem', () => {
    expect(typeof normalizeAmbientText).toBe('function');
  });
});

function sourceFileFor(src: string): ts.SourceFile {
  return ts.createSourceFile('test.ts', src, ts.ScriptTarget.Latest, true);
}

function firstObjectLiteralArg(src: string): ts.ObjectLiteralExpression {
  const sourceFile = sourceFileFor(src);
  const call = findGetBundleConfigCall(sourceFile);
  const options = call?.arguments[1];
  if (!options || !ts.isObjectLiteralExpression(options)) throw new Error('fixture has no object literal arg');
  return options;
}

describe('findGetBundleConfigCall() / readExternalDeps()', () => {
  it('finds the call and reads @vielzeug/* externals, stripping the scope', () => {
    const obj = firstObjectLiteralArg(
      `export default defineConfig(getBundleConfig(__dirname, { name: 'Orbit', fileName: 'orbit', external: ['@vielzeug/ripple', 'some-other-lib'] }));`,
    );
    expect(readExternalDeps(obj)).toEqual(['ripple']);
  });

  it('returns an empty array when there is no external property', () => {
    const obj = firstObjectLiteralArg(`getBundleConfig(__dirname, { name: 'Ore', fileName: 'ore' });`);
    expect(readExternalDeps(obj)).toEqual([]);
  });

  it('returns undefined for findGetBundleConfigCall when there is no such call', () => {
    expect(findGetBundleConfigCall(sourceFileFor('const x = 1;'))).toBeUndefined();
  });
});

describe('parseBundleMeta()', () => {
  it('reads fileName, globalName, and externalDeps from a real-shaped config', () => {
    const meta = parseBundleMeta(
      'vite.bundle.config.ts',
      `export default defineConfig(getBundleConfig(__dirname, { name: 'Orbit', fileName: 'orbit', external: ['@vielzeug/ripple'] }));`,
    );
    expect(meta).toEqual({ externalDeps: ['ripple'], fileName: 'orbit', globalName: 'Orbit' });
  });

  it('throws a clear error when there is no getBundleConfig call at all', () => {
    expect(() => parseBundleMeta('vite.bundle.config.ts', 'export default {};')).toThrow(
      /Could not find a getBundleConfig/,
    );
  });

  it('throws a clear error when fileName/name are missing', () => {
    expect(() => parseBundleMeta('vite.bundle.config.ts', `getBundleConfig(__dirname, {});`)).toThrow(
      /missing a string "fileName" or "name"/,
    );
  });
});

describe('resolveLoadOrder()', () => {
  it('orders dependencies before dependents, depth-first', () => {
    const metaByPkg = new Map([
      ['a', { externalDeps: [], fileName: 'a', globalName: 'A' }],
      ['b', { externalDeps: ['a'], fileName: 'b', globalName: 'B' }],
      ['c', { externalDeps: ['b'], fileName: 'c', globalName: 'C' }],
    ]);
    expect(resolveLoadOrder('c', metaByPkg)).toEqual(['a', 'b', 'c']);
  });

  it('de-duplicates a dependency shared by two branches', () => {
    const metaByPkg = new Map([
      ['a', { externalDeps: [], fileName: 'a', globalName: 'A' }],
      ['b', { externalDeps: ['a'], fileName: 'b', globalName: 'B' }],
      ['c', { externalDeps: ['a'], fileName: 'c', globalName: 'C' }],
      ['d', { externalDeps: ['b', 'c'], fileName: 'd', globalName: 'D' }],
    ]);
    expect(resolveLoadOrder('d', metaByPkg)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('throws on a circular dependency instead of recursing forever', () => {
    const metaByPkg = new Map([
      ['a', { externalDeps: ['b'], fileName: 'a', globalName: 'A' }],
      ['b', { externalDeps: ['a'], fileName: 'b', globalName: 'B' }],
    ]);
    expect(() => resolveLoadOrder('a', metaByPkg)).toThrow(/Circular @vielzeug dependency/);
  });
});

describe('toPrintableNode()', () => {
  it('promotes a const-arrow-function declarator to its enclosing export statement', () => {
    const sourceFile = sourceFileFor('export const foo = () => {};');
    const statement = sourceFile.statements[0] as ts.VariableStatement;
    const declarator = statement.declarationList.declarations[0];

    expect(toPrintableNode(declarator)).toBe(statement);
  });

  it('leaves a function declaration (already export-bearing on itself) unchanged', () => {
    const sourceFile = sourceFileFor('export function foo(): void {}');
    const fnDecl = sourceFile.statements[0];

    expect(toPrintableNode(fnDecl)).toBe(fnDecl);
  });
});

describe('normalizeAmbientText()', () => {
  it('leaves an already-exported declaration untouched', () => {
    expect(normalizeAmbientText('export function foo(): void;')).toBe('export function foo(): void;');
  });

  it('rewrites a bare "declare" into "export"', () => {
    expect(normalizeAmbientText('declare function foo(): void;')).toBe('export function foo(): void;');
  });

  it('rewrites "export declare" into a single "export"', () => {
    expect(normalizeAmbientText('export declare function foo(): void;')).toBe('export function foo(): void;');
  });

  it('prepends "export" when the declaration has neither keyword', () => {
    expect(normalizeAmbientText('function foo(): void;')).toBe('export function foo(): void;');
  });

  it('does not mistake leading JSDoc text for the code needing an export keyword', () => {
    const printed = '/**\n * Does the thing.\n */\ndeclare function foo(): void;';
    expect(normalizeAmbientText(printed)).toBe('/**\n * Does the thing.\n */\nexport function foo(): void;');
  });
});

describe('readDistFile()', () => {
  let root: string;

  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
  });

  it('throws a clear "run the build" error when dist/ is missing', () => {
    root = mkdtempSync(path.join(tmpdir(), 'repl-registry-test-'));
    mkdirSync(path.join(root, 'ore'), { recursive: true });
    expect(() => readDistFile('ore', 'index.d.ts', root)).toThrow(/Run "pnpm --filter @vielzeug\/ore build" first/);
  });

  it('returns the file content when present', () => {
    root = mkdtempSync(path.join(tmpdir(), 'repl-registry-test-'));
    mkdirSync(path.join(root, 'ore', 'dist'), { recursive: true });
    writeFileSync(path.join(root, 'ore', 'dist', 'index.d.ts'), 'export {};');
    expect(readDistFile('ore', 'index.d.ts', root)).toBe('export {};');
  });
});

// Builds a minimal real packages/ tree (package.json + dist/index.d.ts + vite.bundle.config.ts)
// so extractApi()/buildRegistrySource() exercise the real TS compiler Program API end to end,
// the same way the real generator does — just against two tiny fake packages instead of the
// full monorepo.
function makeFakePackage(
  packagesDir: string,
  name: string,
  { declaration, external = [] }: { declaration: string; external?: string[] },
) {
  const dir = path.join(packagesDir, name);
  mkdirSync(path.join(dir, 'dist'), { recursive: true });
  writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: `@vielzeug/${name}`, version: '1.0.0' }));
  writeFileSync(path.join(dir, 'dist', 'index.d.ts'), declaration);
  writeFileSync(path.join(dir, 'dist', `${name}.iife.js`), 'var IIFE = {};');
  writeFileSync(
    path.join(dir, 'vite.bundle.config.ts'),
    `export default defineConfig(getBundleConfig(__dirname, { name: '${name}', fileName: '${name}', external: [${external
      .map((e) => `'@vielzeug/${e}'`)
      .join(', ')}] }));`,
  );
}

describe('extractApi() — real TS compiler Program against a fixture dist/index.d.ts', () => {
  let root: string;

  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
  });

  it('extracts value exports and a self-contained ambient module declaration', () => {
    root = mkdtempSync(path.join(tmpdir(), 'repl-registry-test-'));
    makeFakePackage(root, 'fixture', {
      declaration: `export declare function greet(name: string): string;\nexport declare const VERSION: string;\n`,
    });

    const { typeDeclaration, valueExports } = extractApi('fixture', root);

    expect(valueExports).toEqual(['VERSION', 'greet']);
    expect(typeDeclaration).toContain(`declare module '@vielzeug/fixture'`);
    expect(typeDeclaration).toContain('export function greet(name: string): string;');
    expect(typeDeclaration).toContain('export const VERSION: string;');
    expect(typeDeclaration).not.toContain('declare function');
  });
});

describe('buildRegistrySource() — full assembly against a fake two-package tree', () => {
  let root: string;

  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
  });

  it('produces one entry per package with real dependency order baked into the output', () => {
    root = mkdtempSync(path.join(tmpdir(), 'repl-registry-test-'));
    makeFakePackage(root, 'base', { declaration: `export declare function baseFn(): void;\n` });
    makeFakePackage(root, 'derived', {
      declaration: `export declare function derivedFn(): void;\n`,
      external: ['base'],
    });

    const { output, packageCount } = buildRegistrySource(root);

    expect(packageCount).toBe(2);
    expect(output).toContain('export const LIBRARY_REGISTRY');
    // Real TS syntax, not just a string template — this is what a consumer of the generated
    // file actually type-checks against, so parse errors here would be a real regression.
    expect(() => ts.createSourceFile('registry.generated.ts', output, ts.ScriptTarget.Latest, true)).not.toThrow();

    expect(output).toContain('exports: ["baseFn"]');
    expect(output).toContain('exports: ["derivedFn"]');
    expect(output).toContain('dependencies: ["base"]'); // derived depends on base
    expect(output).toMatch(/"base": \{\n(?:.*\n)*?\s*dependencies: \[\]/); // base depends on nothing
  }, 15_000);

  it('throws when a package externalizes a dependency with no registry entry of its own', () => {
    root = mkdtempSync(path.join(tmpdir(), 'repl-registry-test-'));
    makeFakePackage(root, 'derived', {
      declaration: `export declare function derivedFn(): void;\n`,
      external: ['ghost'],
    });

    expect(() => buildRegistrySource(root)).toThrow();
  });
});
