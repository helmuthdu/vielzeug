import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { nextSteps, pascalCase, planPackage, writePlan } from '../new-package.mjs';
import { loadDocsWorkspace, validateDocsWorkspace } from '../validate-docs.ts';
import { loadReadmes, validateReadmeWorkspace } from '../validate-readme.ts';

const REPO = path.resolve(import.meta.dirname, '../..');

function fixtureRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'new-package-test-'));
  const template = path.join(root, 'packages/coins');
  mkdirSync(template, { recursive: true });
  mkdirSync(path.join(root, 'docs'), { recursive: true });
  writeFileSync(path.join(template, 'package.json'), readFileSync(path.join(REPO, 'packages/coins/package.json')));
  writeFileSync(
    path.join(root, 'rush.json'),
    `${JSON.stringify(
      {
        projects: [
          {
            packageName: '@vielzeug/coins',
            projectFolder: 'packages/coins',
            shouldPublish: true,
            versionPolicyName: 'vielzeug-packages',
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
  return root;
}

describe('pascalCase()', () => {
  it('converts kebab-case package names', () => {
    expect(pascalCase('coins')).toBe('Coins');
    expect(pascalCase('safe-path2')).toBe('SafePath2');
  });
});

describe('planPackage()', () => {
  let root;

  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
    root = undefined;
  });

  it('rejects invalid names, bad descriptions, and existing packages', () => {
    root = fixtureRoot();
    expect(() => planPackage('Bad Name', 'x', { root })).toThrow(/must match/);
    expect(() => planPackage('ok', '', { root })).toThrow(/one non-empty line/);
    expect(() => planPackage('ok', 'two\nlines', { root })).toThrow(/one non-empty line/);
    expect(() => planPackage('coins', 'x', { root })).toThrow(/packages\/coins already exists/);
    mkdirSync(path.join(root, 'docs/ok'));
    expect(() => planPackage('ok', 'x', { root })).toThrow(/docs\/ok already exists/);
    const rushPath = path.join(root, 'rush.json');
    const rush = JSON.parse(readFileSync(rushPath, 'utf8'));
    rush.projects.push({ packageName: '@vielzeug/taken', projectFolder: 'packages/taken' });
    writeFileSync(rushPath, JSON.stringify(rush));
    expect(() => planPackage('taken', 'x', { root })).toThrow(/already registered in rush\.json/);
  });

  it('generates package-specific config files and registers the project in rush.json', () => {
    root = fixtureRoot();
    const files = planPackage('widget-kit', 'Widget utilities', { root });

    expect(files['packages/widget-kit/vitest.config.ts']).toContain("name: 'widget-kit'");
    expect(files['packages/widget-kit/vite.config.ts']).toContain("name: 'widget-kit'");
    expect(files['packages/widget-kit/vite.bundle.config.ts']).toContain("fileName: 'widget-kit', name: 'WidgetKit'");
    expect(JSON.parse(files['packages/widget-kit/tsconfig.json']).extends).toBe('../../tsconfig.json');
    expect(files['packages/widget-kit/src/__tests__/widget-kit.test.ts']).toContain("describe('@vielzeug/widget-kit'");

    const manifest = JSON.parse(files['packages/widget-kit/package.json']);
    expect(manifest.name).toBe('@vielzeug/widget-kit');
    expect(manifest.description).toBe('Widget utilities');
    expect(manifest.version).toBe('0.1.0');
    expect(manifest.repository.directory).toBe('packages/widget-kit');
    expect(manifest.devDependencies).toEqual(JSON.parse(readFileSync(path.join(REPO, 'packages/coins/package.json'), 'utf8')).devDependencies);

    const rush = JSON.parse(files['rush.json']);
    expect(rush.projects).toHaveLength(2);
    expect(rush.projects[0]).toEqual(JSON.parse(readFileSync(path.join(root, 'rush.json'), 'utf8')).projects[0]);
    expect(rush.projects.at(-1)).toEqual({
      packageName: '@vielzeug/widget-kit',
      projectFolder: 'packages/widget-kit',
      shouldPublish: true,
      versionPolicyName: 'vielzeug-packages',
    });
  });

  it('produces docs and a README that pass the structural validators', () => {
    root = fixtureRoot();
    const description = 'Widget utilities: signals, effects & more #1';
    const files = planPackage('widget-kit', description, { root });
    writePlan(files, { root });

    expect(files['docs/widget-kit/index.md']).toContain(`description: ${JSON.stringify(description)}\n`);

    const docs = validateDocsWorkspace(
      loadDocsWorkspace({ docsDir: path.join(root, 'docs'), packagesDir: path.join(root, 'packages') }),
      'widget-kit',
    );
    expect(docs.diagnostics).toEqual([]);

    const readmes = validateReadmeWorkspace(loadReadmes(path.join(root, 'packages')), 'widget-kit');
    expect(readmes.diagnostics).toEqual([]);
  });

  it('prints follow-up steps naming the package', () => {
    expect(nextSteps('widget-kit')).toMatch(/pnpm install && rush update/);
    expect(nextSteps('widget-kit')).toMatch(/rush-change\.mjs widget-kit minor/);
  });
});
