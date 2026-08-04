/**
 * Validates mechanical package-documentation contracts without judging prose.
 *
 * Usage:
 *   pnpm validate:docs
 *   pnpm validate:docs -- --package=ripple
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isMain, parseArgs } from './lib/cli.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(__dirname, '..');
const DEFAULT_DOCS_DIR = join(ROOT, 'docs');
const DEFAULT_PACKAGES_DIR = join(ROOT, 'packages');
const STANDARD_PAGES = ['index.md', 'usage.md', 'api.md', 'examples.md'] as const;
const INDEX_FRONTMATTER = [
  'title',
  'description',
  'package',
  'category',
  'keywords',
  'related',
  'exports',
  'environments',
];

type DocsProfile = 'catalog' | 'cli-tool' | 'component-library' | 'standard';
const DEFAULT_PACKAGE_DATA = join(ROOT, '.ai/data/packages.json');

export function docsProfileFor(slug: string, packageDataPath = DEFAULT_PACKAGE_DATA): DocsProfile {
  if (!existsSync(packageDataPath)) return 'standard';

  const data = JSON.parse(readFileSync(packageDataPath, 'utf8')) as {
    packages?: Array<{ docsProfile?: DocsProfile; slug: string }>;
  };
  const profile = data.packages?.find((pkg) => pkg.slug === slug)?.docsProfile;
  return profile ?? 'standard';
}

export interface DocsValidationFailure {
  file: string;
  message: string;
}

function markdownFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...markdownFiles(path));
    else if (entry.isFile() && extname(entry.name) === '.md') files.push(path);
  }
  return files;
}

export function parseFrontmatter(source: string): Record<string, string> {
  if (!source.startsWith('---\n')) return {};
  const end = source.indexOf('\n---', 4);
  if (end === -1) return {};

  return Object.fromEntries(
    source
      .slice(4, end)
      .split('\n')
      .flatMap((line) => {
        const match = /^([\w-]+):\s*(.*)$/.exec(line);
        return match ? [[match[1], match[2]]] : [];
      }),
  );
}

export function hasHeading(source: string, heading: string): boolean {
  return new RegExp(`^## ${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm').test(source);
}

export function relativeMarkdownLinks(source: string): string[] {
  const links = [...source.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map((match) => match[1]);
  return links.filter((link) => !link.startsWith('#') && !/^(?:@|https?:|mailto:|tel:|\/)/.test(link));
}

export function resolveMarkdownTarget(file: string, target: string): string {
  const path = target.split('#', 1)[0];
  if (path === '') return file;
  const resolved = normalize(resolve(dirname(file), path));
  return extname(resolved) === '' ? `${resolved}.md` : resolved;
}

function addFailure(failures: DocsValidationFailure[], file: string, message: string): void {
  failures.push({ file, message });
}

function validateSidebar(slug: string, docsDir: string, sidebarFile: string, failures: DocsValidationFailure[]): void {
  if (!existsSync(sidebarFile)) return;

  const pattern = new RegExp(`link:\\s*['\"](\\/${slug}\\/[^'\"]*)['\"]`, 'g');
  for (const match of readFileSync(sidebarFile, 'utf8').matchAll(pattern)) {
    const route = match[1];
    const [pathname] = route.split('#', 1);
    const relativePath = pathname.slice(1).replace(/\/$/, '');
    const target = relativePath === slug ? join(docsDir, slug, 'index.md') : join(docsDir, `${relativePath}.md`);
    if (!existsSync(target)) {
      addFailure(failures, sidebarFile, `sidebar target does not exist: ${route}`);
      continue;
    }
  }
}

function validateIndex(
  slug: string,
  file: string,
  source: string,
  profile: DocsProfile,
  failures: DocsValidationFailure[],
): void {
  const frontmatter = parseFrontmatter(source);
  for (const field of INDEX_FRONTMATTER) {
    if (!(field in frontmatter)) addFailure(failures, file, `missing index frontmatter field: ${field}`);
  }
  if (frontmatter.package && frontmatter.package !== slug)
    addFailure(failures, file, `frontmatter package must be ${slug}`);

  const requiredOverview = ['<PackageHero', 'Why ', 'Installation', 'Features', 'Documentation', 'See Also'];
  requiredOverview.splice(3, 0, 'Quick Start');

  for (const value of requiredOverview) {
    const found =
      value === '<PackageHero'
        ? source.includes(value)
        : value === 'Why '
          ? /^## Why /m.test(source)
          : hasHeading(source, value);
    if (!found) addFailure(failures, file, `missing required overview structure: ${value}`);
  }
}

function validateUsage(file: string, source: string, profile: DocsProfile, failures: DocsValidationFailure[]): void {
  if (!source.includes('[[toc]]')) addFailure(failures, file, 'missing [[toc]]');
  if (profile === 'component-library') return;
  if (!hasHeading(source, 'Basic Usage')) addFailure(failures, file, 'missing Basic Usage section');
  if (!hasHeading(source, 'Best Practices')) addFailure(failures, file, 'missing Best Practices section');
}

function validateApi(file: string, source: string, profile: DocsProfile, failures: DocsValidationFailure[]): void {
  if (!source.includes('[[toc]]')) addFailure(failures, file, 'missing [[toc]]');
  if (profile === 'component-library') return;
  if (!hasHeading(source, 'API Overview')) addFailure(failures, file, 'missing API Overview section');
  if (!hasHeading(source, 'Package Entry Point') && !hasHeading(source, 'Package Entry Points')) {
    addFailure(failures, file, 'missing Package Entry Point section');
  }
}

function validateRecipes(
  pkgDir: string,
  examples: string,
  profile: DocsProfile,
  failures: DocsValidationFailure[],
): void {
  if (profile === 'component-library' || !existsSync(examples)) return;

  const recipeFiles = markdownFiles(examples);
  const examplesIndex = join(pkgDir, 'examples.md');
  const indexed =
    profile === 'catalog'
      ? null
      : new Set(
          relativeMarkdownLinks(readFileSync(examplesIndex, 'utf8')).map((link) =>
            resolveMarkdownTarget(examplesIndex, link),
          ),
        );

  for (const recipe of recipeFiles) {
    const source = readFileSync(recipe, 'utf8');
    if (indexed && !indexed.has(recipe)) addFailure(failures, recipe, 'recipe is not linked by examples.md');
    if (profile === 'catalog') continue;
    for (const heading of ['Problem', 'Solution', 'Pitfalls', 'Related']) {
      if (!new RegExp(`^### ${heading}$`, 'm').test(source)) addFailure(failures, recipe, `missing ${heading} section`);
    }
  }
}

export function validateDocsPackage(
  slug: string,
  {
    docsDir = DEFAULT_DOCS_DIR,
    packagesDir = DEFAULT_PACKAGES_DIR,
    sidebarFile = docsDir === DEFAULT_DOCS_DIR ? join(docsDir, '.vitepress/config.ts') : null,
  } = {},
): DocsValidationFailure[] {
  const failures: DocsValidationFailure[] = [];
  const pkgDir = join(docsDir, slug);
  const sourceDir = join(packagesDir, slug);
  const profile = docsProfileFor(slug);
  const standardPages =
    profile === 'component-library' ? STANDARD_PAGES.filter((page) => page !== 'examples.md') : STANDARD_PAGES;

  if (!existsSync(sourceDir)) return [{ file: sourceDir, message: 'package source directory does not exist' }];
  if (!existsSync(pkgDir)) return [{ file: pkgDir, message: 'package documentation directory does not exist' }];

  for (const page of standardPages) {
    if (!existsSync(join(pkgDir, page))) addFailure(failures, join(pkgDir, page), 'missing standard package page');
  }
  if (failures.length > 0) return failures;

  const index = join(pkgDir, 'index.md');
  const usage = join(pkgDir, 'usage.md');
  const api = join(pkgDir, 'api.md');
  validateIndex(slug, index, readFileSync(index, 'utf8'), profile, failures);
  validateUsage(usage, readFileSync(usage, 'utf8'), profile, failures);
  validateApi(api, readFileSync(api, 'utf8'), profile, failures);
  validateRecipes(pkgDir, join(pkgDir, 'examples'), profile, failures);
  if (sidebarFile && profile !== 'catalog') {
    validateSidebar(slug, docsDir, sidebarFile, failures);
  }

  const filesForLinkValidation =
    profile === 'standard'
      ? markdownFiles(pkgDir)
      : readdirSync(pkgDir, { withFileTypes: true })
          .filter((entry) => entry.isFile() && extname(entry.name) === '.md')
          .map((entry) => join(pkgDir, entry.name));
  for (const file of filesForLinkValidation) {
    const source = readFileSync(file, 'utf8');
    for (const link of relativeMarkdownLinks(source)) {
      const target = resolveMarkdownTarget(file, link);
      if (!existsSync(target)) addFailure(failures, file, `relative link target does not exist: ${link}`);
    }
  }

  return failures;
}

export function discoverDocsPackages(
  docsDir: string,
  filterPackage: string | null,
  packagesDir = DEFAULT_PACKAGES_DIR,
): string[] {
  const slugs = readdirSync(docsDir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        existsSync(join(docsDir, entry.name, 'index.md')) &&
        existsSync(join(packagesDir, entry.name)),
    )
    .map((entry) => entry.name)
    .sort();

  if (!filterPackage) return slugs;
  if (!slugs.includes(filterPackage)) throw new Error(`No package documentation for: ${filterPackage}`);
  return [filterPackage];
}

function main(): void {
  const { flags } = parseArgs(process.argv.slice(2));
  const filterPackage = typeof flags.package === 'string' ? flags.package : null;
  const packages = discoverDocsPackages(DEFAULT_DOCS_DIR, filterPackage);
  const failures = packages.flatMap((slug) => validateDocsPackage(slug));

  if (failures.length === 0) {
    console.log(`Validated documentation structure for ${packages.length} package${packages.length === 1 ? '' : 's'}.`);
    return;
  }

  for (const failure of failures) console.error(`[FAIL] ${relative(ROOT, failure.file)}: ${failure.message}`);
  throw new Error(`${failures.length} documentation validation failure${failures.length === 1 ? '' : 's'}`);
}

if (isMain(import.meta.url)) {
  try {
    main();
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
}
