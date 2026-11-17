/**
 * Import-boundary test: the `grid` subpath stays independent of the atlas
 * root surface. Only the structural shape types in `shapes.ts` and the shared
 * error classes may be shared, and the root must not import from `grid/`.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('..', import.meta.url));

function tsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...tsFiles(full));
    else if (entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

function importsOf(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  return [...source.matchAll(/from\s+'([^']+)'/g)].map((match) => match[1] as string);
}

describe('grid subpath boundary', () => {
  it('grid modules import only grid siblings, the structural shapes module, and shared errors', () => {
    for (const file of tsFiles(join(SRC, 'grid'))) {
      for (const specifier of importsOf(file)) {
        expect(
          specifier === '../shapes.js' || specifier === '../errors.js' || specifier.startsWith('./'),
          `${file} imports ${specifier}`,
        ).toBe(true);
      }
    }
  });

  it('root modules never import the grid subpath', () => {
    for (const file of tsFiles(SRC)) {
      if (file.includes('/grid/')) continue;
      for (const specifier of importsOf(file)) {
        expect(specifier, `${file} imports ${specifier}`).not.toMatch(/grid/);
      }
    }
  });
});
