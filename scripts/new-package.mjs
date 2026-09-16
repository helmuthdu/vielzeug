#!/usr/bin/env node
/**
 * Scaffold a new `@vielzeug/<name>` package in the standard shape.
 *
 * Usage:
 *   pnpm new:package <name> "<one-sentence description>"
 *
 * Creates `packages/<name>/` (manifest, README, config files, source and test stubs), the
 * four `docs/<name>/` pages plus one recipe that
 * `pnpm validate:docs` requires for every package directory, registers the project in
 * `rush.json`, and refreshes `.agents/reference/packages.md`. Everything the standard package
 * shape needs lives here — if the shape changes, change this script, not a checklist.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { isMain, parseArgs, run } from './lib/cli.mjs';
import { ROOT } from './lib/marker-sync.mjs';
import { normalizePackageManifest } from './lib/package-manifest.mjs';

const NAME_PATTERN = /^[a-z][a-z0-9-]*$/;
/** Package whose manifest supplies the shared `engines`, `publishConfig`, and `devDependencies`. */
const TEMPLATE = 'coins';

export function pascalCase(name) {
  return name.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());
}

function titleCase(name) {
  return name.replace(/(^|-)([a-z0-9])/g, (_, sep, c) => (sep ? ' ' : '') + c.toUpperCase());
}

function configFiles(name) {
  const header = `import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

`;
  return {
    'tsconfig.json': `{
  "exclude": ["node_modules"],
  "extends": "../../tsconfig.json",
  "include": ["src/**/*.d.ts", "src/**/*.ts"]
}
`,
    'tsconfig.declarations.json': `{
  "exclude": ["node_modules", "src/**/*.test.ts", "src/**/__tests__/**"],
  "extends": "../../tsconfig.declarations.json",
  "include": ["src/**/*.ts", "src/**/*.d.ts"]
}
`,
    'vitest.config.ts': `/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    name: '${name}',
  },
});
`,
    'vite.config.ts': `${header}import { getConfig, readWorkspaceDeps } from '../../vite.config.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(getConfig(__dirname, { external: readWorkspaceDeps(__dirname), name: '${name}' }));
`,
    'vite.bundle.config.ts': `${header}import { getBundleConfig, readWorkspaceDeps } from '../../vite.config.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  getBundleConfig(__dirname, { external: readWorkspaceDeps(__dirname), fileName: '${name}', name: '${pascalCase(name)}' }),
);
`,
  };
}

function manifest(name, description, templateManifest) {
  return normalizePackageManifest({
    name: `@vielzeug/${name}`,
    version: '0.1.0',
    description,
    type: 'module',
    engines: templateManifest.engines,
    files: ['dist'],
    main: './dist/index.cjs',
    module: './dist/index.js',
    types: 'dist/index.d.ts',
    exports: {
      '.': { import: './dist/index.js', require: './dist/index.cjs', types: './dist/index.d.ts' },
    },
    sideEffects: false,
    publishConfig: templateManifest.publishConfig,
    scripts: {
      build: 'vite build && pnpm --silent run build:bundle && pnpm --silent run build:types',
      'build:bundle': 'vite build --config vite.bundle.config.ts',
      'build:types': 'tsc -p tsconfig.declarations.json',
      fix: 'biome check --write src',
      lint: 'biome ci src',
      prepublishOnly: 'pnpm --silent run build',
      test: 'vitest',
    },
    devDependencies: templateManifest.devDependencies,
  });
}

function readme(name, description) {
  return `# @vielzeug/${name}

> ${description}

## Installation

\`\`\`sh
pnpm add @vielzeug/${name}
npm install @vielzeug/${name}
yarn add @vielzeug/${name}
\`\`\`

## Quick Start

\`\`\`ts
import {} from '@vielzeug/${name}';
\`\`\`

## Documentation

- [Overview](https://vielzeug.dev/${name}/)
- [Usage Guide](https://vielzeug.dev/${name}/usage)
- [API Reference](https://vielzeug.dev/${name}/api)
- [Examples](https://vielzeug.dev/${name}/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
`;
}

function docs(name, description) {
  const title = titleCase(name);
  const pkg = `@vielzeug/${name}`;
  return {
    'index.md': `---
title: ${title}
description: ${JSON.stringify(description)}
package: ${name}
category: utilities
keywords: []
exports: []
related: []
environments: [browser, node]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="${name}" />

## Why ${title}?

${description}

## Installation

::: code-group

\`\`\`sh [pnpm]
pnpm add ${pkg}
\`\`\`

\`\`\`sh [npm]
npm install ${pkg}
\`\`\`

\`\`\`sh [yarn]
yarn add ${pkg}
\`\`\`

:::

## Quick Start

\`\`\`ts
import {} from '${pkg}';
\`\`\`

## Features

<div class="features-grid">

- **TODO**: one line per public capability, API name first

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Arsenal](/arsenal/) — general-purpose utilities.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
`,
    'usage.md': `---
title: ${title} — Usage Guide
description: How to use ${pkg}.
---

[[toc]]

## Basic Usage

\`\`\`ts
import {} from '${pkg}';
\`\`\`

## Best Practices

- TODO
`,
    'api.md': `---
title: ${title} — API Reference
description: Public API of ${pkg}.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution | Common gotcha |
| --- | --- | --- | --- |
| TODO | | Sync | |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| \`${pkg}\` | Complete public ${title} API |
`,
    'examples.md': `---
title: ${title} — Examples
description: Practical examples and recipes for ${pkg}.
---

## Examples

- [Getting Started](./examples/getting-started.md)
`,
    'examples/getting-started.md': `---
title: ${title} Examples — Getting Started
description: First steps with ${pkg}.
---

## Getting Started

### Problem

TODO

### Solution

\`\`\`ts
import {} from '${pkg}';
\`\`\`

### Pitfalls

- TODO

### Related

- [Usage Guide](../usage.md)
`,
  };
}

/** Everything the scaffold writes, as `{ relPath: content }`, plus the patched `rush.json`.
 * Pure: reads only the template manifest and `rush.json` under `root`. */
export function planPackage(name, description, { root = ROOT } = {}) {
  if (!NAME_PATTERN.test(name)) throw new Error(`Package name must match ${NAME_PATTERN}: "${name}"`);
  if (typeof description !== 'string' || description.trim() === '' || /[\r\n]/.test(description)) {
    throw new Error('Description must be one non-empty line');
  }
  if (existsSync(path.join(root, 'packages', name))) throw new Error(`packages/${name} already exists`);
  if (existsSync(path.join(root, 'docs', name))) throw new Error(`docs/${name} already exists`);

  const rushPath = path.join(root, 'rush.json');
  const rush = JSON.parse(readFileSync(rushPath, 'utf8'));
  const packageName = `@vielzeug/${name}`;
  if (rush.projects.some((p) => p.packageName === packageName)) {
    throw new Error(`${packageName} is already registered in rush.json`);
  }
  rush.projects.push({
    packageName,
    projectFolder: `packages/${name}`,
    shouldPublish: true,
    versionPolicyName: rush.projects.find((p) => p.projectFolder === `packages/${TEMPLATE}`)?.versionPolicyName,
  });

  const templateManifest = JSON.parse(readFileSync(path.join(root, 'packages', TEMPLATE, 'package.json'), 'utf8'));

  const files = {
    [`packages/${name}/package.json`]: `${JSON.stringify(manifest(name, description, templateManifest), null, 2)}\n`,
    [`packages/${name}/README.md`]: readme(name, description),
    [`packages/${name}/src/index.ts`]: `// Public root surface of ${packageName}. Every public export goes through this file.\nexport {};\n`,
    [`packages/${name}/src/__tests__/${name}.test.ts`]: `describe('${packageName}', () => {\n  it.todo('names the first observable behavior of the public API');\n});\n`,
    'rush.json': `${JSON.stringify(rush, null, 2)}\n`,
  };
  for (const [file, content] of Object.entries(configFiles(name))) {
    files[`packages/${name}/${file}`] = content;
  }
  for (const [file, content] of Object.entries(docs(name, description))) {
    files[`docs/${name}/${file}`] = content;
  }
  return files;
}

export function writePlan(files, { root = ROOT } = {}) {
  for (const [relPath, content] of Object.entries(files)) {
    const abs = path.join(root, relPath);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, content);
    console.log(`[WRITE] ${relPath}`);
  }
}

export function nextSteps(name) {
  return `
Created @vielzeug/${name}. Next:
  1. pnpm install && rush update                       # refresh both lockfiles (root workspace + Rush)
  2. Implement src/index.ts and its tests; fill every TODO in docs/${name}/ and README.md
  3. Add a sidebar entry for /${name}/ in docs/.vitepress/config.ts
  4. pnpm --filter @vielzeug/${name} build && pnpm validate:docs -- --package=${name} && pnpm validate:readme -- --package=${name}
  5. node scripts/rush-change.mjs ${name} minor "feat(${name}): initial release"
`;
}

if (isMain(import.meta.url)) {
  const { positionals } = parseArgs(process.argv.slice(2));
  const [name, description] = positionals;
  try {
    if (!name || !description) throw new Error('Usage: pnpm new:package <name> "<description>"');
    writePlan(planPackage(name, description));
    run('node', ['scripts/sync-ai-data.mjs'], { cwd: ROOT, inherit: true });
    console.log(nextSteps(name));
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}
