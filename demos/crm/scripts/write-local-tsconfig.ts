#!/usr/bin/env node --experimental-strip-types
import { globSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { collectLocalPackageMap } from './local-packages.ts';

const demoRoot = path.resolve(import.meta.dirname, '..');
const packageMap = collectLocalPackageMap(demoRoot);
if (Object.keys(packageMap).length === 0) throw new Error('No sibling Vielzeug packages found.');
const packageNames = new Set(Object.keys(packageMap).map((specifier) => specifier.split('/')[1]));
const declarations = [...packageNames].flatMap((name) =>
  globSync('src/**/*.d.ts', { cwd: path.join(demoRoot, '../../packages', name) }).map((file) =>
    path.join(demoRoot, '../../packages', name, file),
  ),
);
const config = JSON.parse(readFileSync(path.join(demoRoot, 'tsconfig.json'), 'utf8')) as {
  compilerOptions?: Record<string, unknown>;
  include?: string[];
};
writeFileSync(
  path.join(demoRoot, 'tsconfig.local-dev.json'),
  `${JSON.stringify({
    compilerOptions: {
      ...config.compilerOptions,
      paths: Object.fromEntries(Object.entries(packageMap).map(([specifier, file]) => [specifier, [file]])),
    },
    include: [...(config.include ?? []), ...declarations],
  }, null, 2)}\n`,
);
