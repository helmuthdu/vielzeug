import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { parseFrontmatter, parseMarkdownDocument } from '../lib/markdown.ts';
import {
  DOCS_CONTRACTS,
  loadDocsWorkspace,
  resolveMarkdownTarget,
  validateDocsWorkspace,
  validatePackageDocs,
} from '../validate-docs.ts';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { force: true, recursive: true });
});

interface Fixture {
  docsDir: string;
  packagesDir: string;
}

function write(file: string, source: string): void {
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, source);
}

function fixture(): Fixture {
  const root = mkdtempSync(join(tmpdir(), 'vielzeug-docs-'));
  roots.push(root);
  const docsDir = join(root, 'docs');
  const packagesDir = join(root, 'packages');
  mkdirSync(join(packagesDir, 'widget'), { recursive: true });

  write(
    join(docsDir, 'widget', 'index.md'),
    `---
title: Widget
description: Widget docs
package: widget
category: Utilities
keywords: [widget]
related: []
exports: [createWidget]
environments: [node]
---
<PackageHero package="widget" />

## Why Widget?

## Installation

## Quick Start

## Features

## Documentation

## See Also
`,
  );
  write(
    join(docsDir, 'widget', 'usage.md'),
    `---
title: Usage
description: Use widget
---
[[toc]]

## Basic Usage

## Best Practices
`,
  );
  write(
    join(docsDir, 'widget', 'api.md'),
    `---
title: API
description: Widget API
---
[[toc]]

## API Overview

## Package Entry Point
`,
  );
  write(join(docsDir, 'widget', 'examples.md'), '[Create](./examples/create.md)\n');
  write(
    join(docsDir, 'widget', 'examples', 'create.md'),
    `---
title: Create
description: Create widget
---

## Create

### Problem

### Solution

### Pitfalls

### Related
`,
  );

  return { docsDir, packagesDir };
}

function validate(paths: Fixture, filterPackage: string | null = null) {
  return validateDocsWorkspace(loadDocsWorkspace(paths), filterPackage);
}

describe('shared Markdown parser', () => {
  it('uses one frontmatter parser for scalar, array, and safe values', () => {
    expect(parseFrontmatter("---\ntitle: 'Widget'\nexports:\n  - createWidget\n__proto__: unsafe\n---")).toEqual({
      exports: ['createWidget'],
      title: 'Widget',
    });
  });

  it('collects document structure while ignoring fenced code', () => {
    const document = parseMarkdownDocument(
      '/docs/widget/usage.md',
      `[[toc]]

## Real heading
[Working](./real.md)

\`\`\`md
## Fake heading
[Broken](./missing.md)
<PackageHero />
\`\`\`
`,
    );

    expect(document.toc).toBe(true);
    expect(document.headings).toEqual([{ depth: 2, line: 3, text: 'Real heading' }]);
    expect(document.links).toEqual([{ line: 4, target: './real.md' }]);
    expect(document.components).not.toContain('PackageHero');
  });
});

describe('documentation contracts', () => {
  it('accepts a complete standard package document shape', () => {
    const paths = fixture();
    expect(validate(paths)).toEqual({ checkedPackages: ['widget'], diagnostics: [] });
  });

  it('selects explicit contracts from package metadata', () => {
    const paths = fixture();
    const packageDataPath = join(paths.docsDir, '..', 'packages.json');
    writeFileSync(packageDataPath, JSON.stringify({ packages: [{ docsContract: 'component-library', slug: 'widget' }] }));
    rmSync(join(paths.docsDir, 'widget', 'examples.md'));
    rmSync(join(paths.docsDir, 'widget', 'examples'), { recursive: true });
    writeFileSync(join(paths.docsDir, 'widget', 'usage.md'), '[[toc]]\n');
    writeFileSync(join(paths.docsDir, 'widget', 'api.md'), '[[toc]]\n');

    const result = validateDocsWorkspace(loadDocsWorkspace({ ...paths, packageDataPath }));
    expect(result.diagnostics).toEqual([]);
  });

  it('reports independent missing-page and page-content defects together', () => {
    const paths = fixture();
    writeFileSync(join(paths.docsDir, 'widget', 'usage.md'), '## Basic Usage\n');
    rmSync(join(paths.docsDir, 'widget', 'api.md'));

    const diagnostics = validate(paths).diagnostics;
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: 'page/missing', file: join(paths.docsDir, 'widget', 'api.md') }),
        expect.objectContaining({ rule: 'toc/missing', file: join(paths.docsDir, 'widget', 'usage.md') }),
        expect.objectContaining({ rule: 'heading/missing', message: 'Missing required section: Best Practices' }),
      ]),
    );
  });

  it('reports missing docs, orphan docs, and malformed package frontmatter', () => {
    const paths = fixture();
    mkdirSync(join(paths.packagesDir, 'undocumented'));
    mkdirSync(join(paths.docsDir, 'orphan'));
    write(join(paths.docsDir, 'orphan', 'index.md'), '---\npackage: wrong\n---\n');
    writeFileSync(join(paths.docsDir, 'widget', 'index.md'), '---\npackage: other\n---\n');

    const diagnostics = validate(paths).diagnostics;
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ package: 'undocumented', rule: 'workspace/missing-docs' }),
        expect.objectContaining({ package: 'orphan', rule: 'workspace/orphan-docs' }),
        expect.objectContaining({ package: 'widget', rule: 'frontmatter/package-mismatch' }),
      ]),
    );
  });

  it('validates links with line locations and ignores nested catalog recipes', () => {
    const paths = fixture();
    writeFileSync(join(paths.docsDir, 'widget', 'usage.md'), '[[toc]]\n\n## Basic Usage\n\n## Best Practices\n[Missing](./missing.md)\n');
    writeFileSync(join(paths.docsDir, 'widget', 'examples', 'create.md'), '[Missing](./also-missing.md)\n');

    const standard = validate(paths).diagnostics;
    expect(standard).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ line: 6, rule: 'link/broken', message: 'Relative link target does not exist: ./missing.md' }),
        expect.objectContaining({ rule: 'link/broken', message: 'Relative link target does not exist: ./also-missing.md' }),
      ]),
    );

    const workspace = loadDocsWorkspace(paths);
    const docs = workspace.packageDocs.get('widget');
    expect(docs).toBeDefined();
    expect(validatePackageDocs(docs!, DOCS_CONTRACTS.catalog, workspace.knownFiles)).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ message: 'Relative link target does not exist: ./also-missing.md' })]),
    );
  });

  it('requires recipe index parity and every required recipe section', () => {
    const paths = fixture();
    writeFileSync(join(paths.docsDir, 'widget', 'examples.md'), '');
    writeFileSync(join(paths.docsDir, 'widget', 'examples', 'create.md'), '### Problem\n');

    const diagnostics = validate(paths).diagnostics;
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: 'recipe/unindexed' }),
        expect.objectContaining({ rule: 'recipe/heading-missing', message: 'Missing recipe section: Solution.' }),
      ]),
    );
  });

  it('resolves extensions, directory indexes, queries, and anchors', () => {
    expect(resolveMarkdownTarget('/docs/widget/index.md', './usage#basic-usage')).toBe('/docs/widget/usage.md');
    expect(resolveMarkdownTarget('/docs/widget/index.md', './examples/?tab=one')).toBe('/docs/widget/examples/index.md');
  });

  it('rejects unknown filtered packages', () => {
    const paths = fixture();
    expect(() => validate(paths, 'missing')).toThrow('Unknown package documentation: missing');
  });
});
