import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { extractExportedSignatures, resolveBarrelFiles } from '../../scripts/type-signatures.ts';

let dir: string;

afterEach(() => {
  rmSync(dir, { force: true, recursive: true });
});

/** Writes a fixture file under a fresh temp dir (created lazily, once per test) and returns its absolute path. */
function writeFile(relPath: string, content: string): string {
  dir ??= mkdtempSync(join(tmpdir(), 'codex-typesig-'));

  const filePath = join(dir, relPath);

  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, 'utf8');

  return filePath;
}

describe('extractExportedSignatures', () => {
  it('extracts a single-line const export', () => {
    const entry = writeFile('index.ts', 'export const debounce = (fn: () => void, ms: number) => fn;');

    expect(extractExportedSignatures(entry)['debounce']).toContain('export const debounce');
  });

  it('extracts a full multi-line interface', () => {
    const entry = writeFile(
      'index.ts',
      ['export interface MemoOptions {', '  ttl?: number;', '  maxSize?: number;', '}'].join('\n'),
    );

    const decl = extractExportedSignatures(entry)['MemoOptions'];

    expect(decl).toContain('MemoOptions');
    expect(decl).toContain('ttl');
    expect(decl).toContain('maxSize');
  });

  it('extracts a named re-export line without needing to resolve its target', () => {
    const entry = writeFile('index.ts', 'export { throttle } from "./throttle.js";');

    expect(extractExportedSignatures(entry)['throttle']).toContain('throttle');
  });

  it('does not extract non-exported declarations', () => {
    const entry = writeFile('index.ts', 'const internal = 1;\nexport const external = 2;');

    expect(extractExportedSignatures(entry)).not.toHaveProperty('internal');
    expect(extractExportedSignatures(entry)).toHaveProperty('external');
  });

  it('joins multiple declarations for the same name (overloads) with a blank line', () => {
    const entry = writeFile(
      'index.ts',
      [
        'export function chunk(input: string, size?: number): string[];',
        'export function chunk<T>(input: T[], size?: number): T[][];',
        'export function chunk(input: unknown, size = 2): unknown { return input; }',
      ].join('\n'),
    );

    const decl = extractExportedSignatures(entry)['chunk'];

    expect(decl?.match(/export function chunk/g)).toHaveLength(3);
    expect(decl).toContain('\n\n');
  });

  it('does not miscount braces inside a string literal (the old regex approach could)', () => {
    const entry = writeFile('index.ts', 'export const weird = "{ not a brace, no closing paren here }";');

    expect(extractExportedSignatures(entry)['weird']).toBe(
      'export const weird = "{ not a brace, no closing paren here }";',
    );
  });

  it('follows a single-level `export * from` re-export into a sibling file', () => {
    writeFile('array/chunk.ts', 'export function chunk(input: unknown[]): unknown[] { return input; }');

    const entry = writeFile('index.ts', "export * from './array/chunk';");

    expect(extractExportedSignatures(entry)['chunk']).toContain('export function chunk');
  });

  it('follows nested `export *` chains (barrel of barrels)', () => {
    writeFile('array/chunk.ts', 'export function chunk(): void {}');
    writeFile('array/index.ts', "export * from './chunk';");

    const entry = writeFile('index.ts', "export * from './array';");

    expect(extractExportedSignatures(entry)['chunk']).toContain('export function chunk');
  });

  it('returns {} when the entry file has no exports', () => {
    const entry = writeFile('index.ts', 'const x = 1;');

    expect(extractExportedSignatures(entry)).toEqual({});
  });
});

describe('resolveBarrelFiles', () => {
  it('returns just the entry file when there are no `export *` statements', () => {
    const entry = writeFile('index.ts', 'export const x = 1;');

    expect(resolveBarrelFiles(entry)).toEqual([entry]);
  });

  it('includes every file reachable via `export *`, entry included', () => {
    const chunkFile = writeFile('array/chunk.ts', 'export function chunk(): void {}');
    const entry = writeFile('index.ts', "export * from './array/chunk';");

    expect(resolveBarrelFiles(entry).sort()).toEqual([chunkFile, entry].sort());
  });

  it('is cycle-safe — a re-export loop does not recurse forever', () => {
    writeFile('a.ts', "export * from './b';\nexport const a = 1;");
    writeFile('b.ts', "export * from './a';\nexport const b = 2;");

    const entry = writeFile('index.ts', "export * from './a';");

    const files = resolveBarrelFiles(entry);

    expect(files).toHaveLength(3); // index.ts, a.ts, b.ts — each visited exactly once
    expect(extractExportedSignatures(entry)).toMatchObject({
      a: expect.stringContaining('a = 1'),
      b: expect.stringContaining('b = 2'),
    });
  });
});
