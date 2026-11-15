import { readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { listVielzeugPackages, REPL_EXCLUDED_PACKAGES } from '../../../../../scripts/vielzeug-packages';
import { examples } from '../repl/examples';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXAMPLES_DIR = resolve(__dirname, '../repl/examples');
const PACKAGES_DIR = resolve(__dirname, '../../../../../packages');

/**
 * REPL wiring drifts in two ways, and neither the docs build nor validate:repl catches it:
 * a folder that exists but was never registered in examples/index.ts (its examples are
 * invisible in the picker), and a package that never got a folder at all (empty picker).
 */
describe('REPL examples registration', () => {
  it('registers every examples folder in the examples map', () => {
    const folders = readdirSync(EXAMPLES_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    for (const folder of folders) {
      expect(examples, `examples/${folder}/ exists but is not registered in examples/index.ts`).toHaveProperty(folder);
    }
  });

  it('provides examples for every REPL-eligible package', () => {
    const eligible = listVielzeugPackages(PACKAGES_DIR).filter((pkg) => !REPL_EXCLUDED_PACKAGES.has(pkg));
    // Packages with no meaningful runnable REPL surface. Keep this set empty unless
    // a package truly has nothing to run: assay's primitives query and drive the
    // DOM an example builds inside the sandbox body, so they demo fine.
    const noExamplesByDesign = new Set<string>([]);
    for (const pkg of eligible) {
      if (noExamplesByDesign.has(pkg)) continue;
      const registered = examples[pkg];
      expect(registered, `@vielzeug/${pkg} has no REPL examples`).toBeInstanceOf(Object);
      expect(Object.keys(registered ?? {}).length, `@vielzeug/${pkg} has an empty examples map`).toBeGreaterThan(0);
    }
  });
});
