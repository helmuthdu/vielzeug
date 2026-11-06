import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { loadReadmes, validateReadmeWorkspace } from '../validate-readme';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { force: true, recursive: true });
});

const LICENSE_LINE =
  'MIT © [Helmuth Saatkamp](https://github.com/helmuthdu): part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.';

/** A packages/ tree with one package whose README is `readme` (or a compliant default). */
function tempPackages(readme?: string, description = 'A test package.') {
  const packagesDir = mkdtempSync(join(tmpdir(), 'readmes-'));
  roots.push(packagesDir);
  const pkgDir = join(packagesDir, 'ripple');
  mkdirSync(pkgDir, { recursive: true });
  writeFileSync(join(pkgDir, 'package.json'), JSON.stringify({ name: '@vielzeug/ripple', description }));
  writeFileSync(
    join(pkgDir, 'README.md'),
    readme ??
      `# @vielzeug/ripple

> ${description}

## Installation

\`\`\`bash
npm install @vielzeug/ripple
\`\`\`

## Quick Start

\`\`\`ts
import { createThing } from '@vielzeug/ripple';
\`\`\`

## Documentation

See [the docs](https://vielzeug.dev/ripple/).

## License

${LICENSE_LINE}
`,
  );
  return packagesDir;
}

function rules(packagesDir: string) {
  return validateReadmeWorkspace(loadReadmes(packagesDir)).diagnostics.map((d) => d.rule);
}

describe('module has no import-time side effects', () => {
  it('exports functions, not scan results', () => {
    expect(typeof loadReadmes).toBe('function');
    expect(typeof validateReadmeWorkspace).toBe('function');
  });
});

describe('validateReadmeWorkspace()', () => {
  it('accepts a compliant README', () => {
    expect(rules(tempPackages())).toEqual([]);
  });

  it('requires the @vielzeug/<slug> title', () => {
    const diagnostics = validateReadmeWorkspace(loadReadmes(tempPackages('# ripple\n'))).diagnostics;
    expect(diagnostics.some((d) => d.rule === 'readme/title')).toBe(true);
  });

  it('requires the blockquote description to equal package.json description', () => {
    const packagesDir = tempPackages(); // README says "A test package."
    writeFileSync(join(packagesDir, 'ripple', 'package.json'), JSON.stringify({ name: '@vielzeug/ripple', description: 'A different description.' }));

    const diagnostics = validateReadmeWorkspace(loadReadmes(packagesDir)).diagnostics;
    expect(diagnostics.some((d) => d.rule === 'readme/description')).toBe(true);
    expect(diagnostics.find((d) => d.rule === 'readme/description')?.hint).toContain('A different description.');
  });

  it('reports every missing required heading', () => {
    const diagnostics = validateReadmeWorkspace(loadReadmes(tempPackages('# @vielzeug/ripple\n\n> A test package.\n'))).diagnostics;
    const missing = diagnostics.filter((d) => d.rule === 'readme/heading-missing').map((d) => d.message);
    expect(missing).toHaveLength(4); // Installation, Quick Start, Documentation, License
  });

  it('rejects unpermitted sections', () => {
    const packagesDir = tempPackages();
    const readmePath = join(packagesDir, 'ripple', 'README.md');
    writeFileSync(readmePath, `${readFileSync(readmePath, 'utf8')}\n## Changelog\n\nSee docs.\n`);

    const diagnostics = validateReadmeWorkspace(loadReadmes(packagesDir)).diagnostics;
    expect(diagnostics.some((d) => d.rule === 'readme/heading-unpermitted' && d.message.includes('Changelog'))).toBe(true);
  });

  it('requires License last and sections in canonical order', () => {
    const packagesDir = tempPackages();
    const readmePath = join(packagesDir, 'ripple', 'README.md');
    const text = readFileSync(readmePath, 'utf8');
    writeFileSync(readmePath, text.replace('## Quick Start', '## Quick Start\n\nplaceholder').replace(/## Documentation/, '## License\n\nx\n\n## Documentation'));

    const rulesFound = validateReadmeWorkspace(loadReadmes(packagesDir)).diagnostics.map((d) => d.rule);
    expect(rulesFound).toContain('readme/heading-order');
  });

  it('rejects badges and <details> blocks', () => {
    const packagesDir = tempPackages();
    const readmePath = join(packagesDir, 'ripple', 'README.md');
    writeFileSync(readmePath, `${readFileSync(readmePath, 'utf8')}\n![npm](https://img.shields.io/npm/v/@vielzeug/ripple)\n<details><summary>x</summary></details>\n`);

    const rulesFound = validateReadmeWorkspace(loadReadmes(packagesDir)).diagnostics.map((d) => d.rule);
    expect(rulesFound).toContain('readme/no-badges');
    expect(rulesFound).toContain('readme/no-details');
  });

  it('requires the canonical license line', () => {
    const packagesDir = tempPackages();
    const readmePath = join(packagesDir, 'ripple', 'README.md');
    writeFileSync(readmePath, readFileSync(readmePath, 'utf8').replace(LICENSE_LINE, 'MIT licensed.'));

    const diagnostics = validateReadmeWorkspace(loadReadmes(packagesDir)).diagnostics;
    expect(diagnostics.some((d) => d.rule === 'readme/license-line')).toBe(true);
  });

  it('requires the Documentation section to link to vielzeug.dev', () => {
    const packagesDir = tempPackages();
    const readmePath = join(packagesDir, 'ripple', 'README.md');
    writeFileSync(readmePath, readFileSync(readmePath, 'utf8').replace('https://vielzeug.dev/ripple/', 'https://example.com/ripple'));

    const diagnostics = validateReadmeWorkspace(loadReadmes(packagesDir)).diagnostics;
    expect(diagnostics.some((d) => d.rule === 'readme/docs-link')).toBe(true);
  });

  it('applies the package filter and throws on an unknown package', () => {
    const packagesDir = tempPackages();
    expect(validateReadmeWorkspace(loadReadmes(packagesDir), 'ripple').checkedPackages).toEqual(['ripple']);
    expect(() => validateReadmeWorkspace(loadReadmes(packagesDir), 'nope')).toThrow('Unknown package: nope');
  });
});
