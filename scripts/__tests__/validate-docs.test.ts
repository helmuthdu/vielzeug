import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  docsProfileFor,
  parseFrontmatter,
  relativeMarkdownLinks,
  resolveMarkdownTarget,
  validateDocsPackage,
} from '../validate-docs';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { force: true, recursive: true });
});

function fixture(): { docsDir: string; packagesDir: string } {
  const root = mkdtempSync(join(tmpdir(), 'vielzeug-docs-'));
  roots.push(root);
  const docsDir = join(root, 'docs');
  const packagesDir = join(root, 'packages');
  mkdirSync(join(docsDir, 'widget', 'examples'), { recursive: true });
  mkdirSync(join(packagesDir, 'widget'), { recursive: true });

  writeFileSync(
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
  writeFileSync(
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
  writeFileSync(
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
  writeFileSync(join(docsDir, 'widget', 'examples.md'), `[Create](./examples/create.md)\n`);
  writeFileSync(
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

describe('documentation helpers', () => {
  it('selects explicit structural profiles for non-standard packages', () => {
    expect(docsProfileFor('arsenal')).toBe('catalog');
    expect(docsProfileFor('assay')).toBe('standard');
    expect(docsProfileFor('codex')).toBe('cli-tool');
    expect(docsProfileFor('keymap')).toBe('standard');
    expect(docsProfileFor('prism')).toBe('standard');
    expect(docsProfileFor('refine')).toBe('component-library');
    expect(docsProfileFor('sandbox')).toBe('standard');
    expect(docsProfileFor('spell')).toBe('standard');
    expect(docsProfileFor('ward')).toBe('standard');
    expect(docsProfileFor('ripple')).toBe('standard');
  });

  it('parses simple frontmatter and local markdown links', () => {
    expect(parseFrontmatter('---\ntitle: Test\n---\n')).toEqual({ title: 'Test' });
    expect(relativeMarkdownLinks('[Local](./guide.md) [External](https://example.test)')).toEqual(['./guide.md']);
    expect(resolveMarkdownTarget('/docs/pkg/index.md', './guide')).toBe('/docs/pkg/guide.md');
  });
});

describe('validateDocsPackage()', () => {
  it('accepts a complete standard package document shape', () => {
    const paths = fixture();
    expect(validateDocsPackage('widget', paths)).toEqual([]);
  });

  it('reports missing structural requirements', () => {
    const paths = fixture();
    writeFileSync(join(paths.docsDir, 'widget', 'usage.md'), '## Basic Usage\n');

    expect(validateDocsPackage('widget', paths).map((failure) => failure.message)).toContain('missing [[toc]]');
  });

  it('reports sidebar routes with missing documents', () => {
    const paths = fixture();
    const sidebarFile = join(paths.docsDir, 'sidebar.ts');
    writeFileSync(sidebarFile, "const sidebar = [{ link: '/widget/missing', text: 'Missing' }];\n");

    expect(validateDocsPackage('widget', { ...paths, sidebarFile }).map((failure) => failure.message)).toContain(
      'sidebar target does not exist: /widget/missing',
    );
  });
});
