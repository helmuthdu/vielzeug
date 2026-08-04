/**
 * Validates package-documentation structure.
 *
 * Usage:
 *   pnpm validate:docs
 *   pnpm validate:docs -- --package=ripple
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { type MarkdownDocument, parseMarkdownDocument } from './lib/markdown.ts';
import { isMain, parseArgs } from './lib/cli.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(__dirname, '..');
const DEFAULT_DOCS_DIR = join(ROOT, 'docs');
const DEFAULT_PACKAGES_DIR = join(ROOT, 'packages');
const DEFAULT_PACKAGE_DATA = join(ROOT, '.ai/data/packages.json');

type LinkScope = 'all' | 'root';
export type DocsContractName = 'catalog' | 'component-library' | 'standard';

interface HeadingRequirement {
  alternatives?: readonly string[];
  text: string;
  match?: 'exact' | 'prefix';
}

interface PageContract {
  components?: readonly string[];
  frontmatter?: readonly string[];
  headings?: readonly HeadingRequirement[];
  packageMustMatchSlug?: boolean;
  toc?: boolean;
}

export interface DocsContract {
  linkScope: LinkScope;
  pages: Readonly<Record<string, PageContract>>;
  recipes?: {
    directory: string;
    index: string;
    indexed: boolean;
    requiredHeadings: readonly string[];
  };
}

const INDEX_CONTRACT: PageContract = {
  components: ['PackageHero'],
  frontmatter: ['title', 'description', 'package', 'category', 'keywords', 'related', 'exports', 'environments'],
  headings: [
    { match: 'prefix', text: 'Why ' },
    { text: 'Installation' },
    { text: 'Quick Start' },
    { text: 'Features' },
    { text: 'Documentation' },
    { text: 'See Also' },
  ],
  packageMustMatchSlug: true,
};

const STANDARD_PAGE_CONTRACTS = {
  'api.md': {
    headings: [{ alternatives: ['Package Entry Point', 'Package Entry Points'], text: 'Package Entry Point' }, { text: 'API Overview' }],
    toc: true,
  },
  'examples.md': {},
  'index.md': INDEX_CONTRACT,
  'usage.md': {
    headings: [{ text: 'Basic Usage' }, { text: 'Best Practices' }],
    toc: true,
  },
} satisfies Record<string, PageContract>;

// Contracts describe each package documentation shape in one place; validators never infer policy from package kind.
export const DOCS_CONTRACTS = {
  catalog: {
    linkScope: 'root',
    pages: STANDARD_PAGE_CONTRACTS,
    recipes: { directory: 'examples', index: 'examples.md', indexed: false, requiredHeadings: [] },
  },
  'component-library': {
    linkScope: 'root',
    pages: {
      'api.md': { toc: true },
      'index.md': INDEX_CONTRACT,
      'usage.md': { toc: true },
    },
  },
  standard: {
    linkScope: 'all',
    pages: STANDARD_PAGE_CONTRACTS,
    recipes: {
      directory: 'examples',
      index: 'examples.md',
      indexed: true,
      requiredHeadings: ['Problem', 'Solution', 'Pitfalls', 'Related'],
    },
  },
} satisfies Record<DocsContractName, DocsContract>;

export interface Diagnostic {
  file: string;
  hint?: string;
  line?: number;
  message: string;
  package: string;
  rule: string;
}

export interface PackageDocs {
  docsDir: string;
  files: ReadonlyMap<string, MarkdownDocument>;
  slug: string;
}

export interface DocsWorkspace {
  contracts: ReadonlyMap<string, DocsContractName>;
  knownFiles: ReadonlySet<string>;
  packageDocs: ReadonlyMap<string, PackageDocs>;
  sourceDirectories: ReadonlyMap<string, string>;
}

export interface ValidationResult {
  checkedPackages: readonly string[];
  diagnostics: readonly Diagnostic[];
}

export interface LoadDocsWorkspaceOptions {
  docsDir?: string;
  packageDataPath?: string;
  packagesDir?: string;
}

function directoryNames(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function filesIn(dir: string): string[] {
  if (!existsSync(dir)) return [];

  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...filesIn(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

function toDocumentPath(docsDir: string, file: string): string {
  return relative(docsDir, file).replaceAll('\\', '/');
}

function loadPackageDocs(docsDir: string, slug: string): PackageDocs {
  const packageDir = join(docsDir, slug);
  const files = new Map<string, MarkdownDocument>();

  for (const file of filesIn(packageDir)) {
    if (extname(file) !== '.md') continue;
    files.set(toDocumentPath(packageDir, file), parseMarkdownDocument(file, readFileSync(file, 'utf8')));
  }

  return { docsDir: packageDir, files, slug };
}

function contractName(value: unknown): DocsContractName {
  if (value === 'catalog' || value === 'component-library') return value;
  return 'standard';
}

function loadContracts(packageDataPath: string): Map<string, DocsContractName> {
  if (!existsSync(packageDataPath)) return new Map();

  const data = JSON.parse(readFileSync(packageDataPath, 'utf8')) as {
    packages?: Array<{ docsContract?: unknown; slug?: unknown }>;
  };
  const contracts = new Map<string, DocsContractName>();
  for (const pkg of data.packages ?? []) {
    if (typeof pkg.slug === 'string') contracts.set(pkg.slug, contractName(pkg.docsContract));
  }
  return contracts;
}

export function loadDocsWorkspace({
  docsDir = DEFAULT_DOCS_DIR,
  packageDataPath = DEFAULT_PACKAGE_DATA,
  packagesDir = DEFAULT_PACKAGES_DIR,
}: LoadDocsWorkspaceOptions = {}): DocsWorkspace {
  const sourceDirectories = new Map(directoryNames(packagesDir).map((slug) => [slug, join(packagesDir, slug)]));
  const packageDocs = new Map<string, PackageDocs>();

  for (const slug of directoryNames(docsDir)) {
    const index = join(docsDir, slug, 'index.md');
    const isSourcePackage = sourceDirectories.has(slug);
    const declaresPackage = existsSync(index) && typeof parseMarkdownDocument(index, readFileSync(index, 'utf8')).frontmatter.package === 'string';
    if (isSourcePackage || declaresPackage) packageDocs.set(slug, loadPackageDocs(docsDir, slug));
  }

  return {
    contracts: loadContracts(packageDataPath),
    knownFiles: new Set(filesIn(docsDir).map((file) => normalize(file))),
    packageDocs,
    sourceDirectories,
  };
}

function diagnostic(
  packageName: string,
  file: string,
  rule: string,
  message: string,
  options: Pick<Diagnostic, 'hint' | 'line'> = {},
): Diagnostic {
  return { file, message, package: packageName, rule, ...options };
}

function hasHeading(document: MarkdownDocument, requirement: HeadingRequirement): boolean {
  const texts = requirement.alternatives ?? [requirement.text];
  return document.headings.some(
    (heading) =>
      heading.depth === 2 &&
      texts.some((text) => (requirement.match === 'prefix' ? heading.text.startsWith(text) : heading.text === text)),
  );
}

function validatePage(
  docs: PackageDocs,
  page: string,
  rule: PageContract,
  diagnostics: Diagnostic[],
): MarkdownDocument | null {
  const document = docs.files.get(page);
  if (!document) {
    diagnostics.push(
      diagnostic(docs.slug, join(docs.docsDir, page), 'page/missing', `Missing required page: ${page}`, {
        hint: `Create ${page} for ${docs.slug}.`,
      }),
    );
    return null;
  }

  for (const field of rule.frontmatter ?? []) {
    if (!(field in document.frontmatter)) {
      diagnostics.push(
        diagnostic(docs.slug, document.path, 'frontmatter/missing', `Missing required frontmatter field: ${field}`, {
          hint: `Add ${field} to ${page}.`,
        }),
      );
    }
  }
  if (rule.packageMustMatchSlug && document.frontmatter.package !== docs.slug) {
    diagnostics.push(
      diagnostic(docs.slug, document.path, 'frontmatter/package-mismatch', `Frontmatter package must be ${docs.slug}.`),
    );
  }
  if (rule.toc && !document.toc) {
    diagnostics.push(diagnostic(docs.slug, document.path, 'toc/missing', 'Missing [[toc]].'));
  }
  for (const component of rule.components ?? []) {
    if (!document.components.has(component)) {
      diagnostics.push(
        diagnostic(docs.slug, document.path, 'component/missing', `Missing required component: <${component}>.`, {
          hint: `Add <${component} ... /> to ${page}.`,
        }),
      );
    }
  }
  for (const heading of rule.headings ?? []) {
    if (!hasHeading(document, heading)) {
      diagnostics.push(
        diagnostic(docs.slug, document.path, 'heading/missing', `Missing required section: ${heading.text}`, {
          hint: `Add a level-two ${heading.match === 'prefix' ? 'section starting with' : 'section named'} ${heading.text}.`,
        }),
      );
    }
  }

  return document;
}

function isRelativeMarkdownLink(target: string): boolean {
  return !target.startsWith('#') && !/^(?:@|\/|[a-z][\w+.-]*:)/i.test(target);
}

export function resolveMarkdownTarget(file: string, target: string): string {
  const pathname = target.split(/[?#]/, 1)[0];
  if (pathname === '') return normalize(file);

  const resolved = normalize(resolve(dirname(file), pathname));
  if (pathname.endsWith('/')) return join(resolved, 'index.md');
  return extname(resolved) === '' ? `${resolved}.md` : resolved;
}

function validateRecipes(docs: PackageDocs, contract: NonNullable<DocsContract['recipes']>, diagnostics: Diagnostic[]): void {
  const recipes = [...docs.files.entries()].filter(([path]) => path.startsWith(`${contract.directory}/`));
  const index = docs.files.get(contract.index);
  const indexed =
    contract.indexed && index
      ? new Set(
          index.links
            .filter((link) => isRelativeMarkdownLink(link.target))
            .map((link) => resolveMarkdownTarget(index.path, link.target)),
        )
      : null;

  for (const [, recipe] of recipes) {
    if (indexed && !indexed.has(recipe.path)) {
      diagnostics.push(
        diagnostic(docs.slug, recipe.path, 'recipe/unindexed', `${relative(docs.docsDir, recipe.path)} is not linked by ${contract.index}.`),
      );
    }
    for (const heading of contract.requiredHeadings) {
      if (!recipe.headings.some((candidate) => candidate.depth === 3 && candidate.text === heading)) {
        diagnostics.push(
          diagnostic(docs.slug, recipe.path, 'recipe/heading-missing', `Missing recipe section: ${heading}.`, {
            hint: `Add a level-three ${heading} section.`,
          }),
        );
      }
    }
  }
}

export function validatePackageDocs(
  docs: PackageDocs,
  contract: DocsContract,
  knownFiles: ReadonlySet<string>,
): readonly Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const [page, rule] of Object.entries(contract.pages)) validatePage(docs, page, rule, diagnostics);
  if (contract.recipes) validateRecipes(docs, contract.recipes, diagnostics);

  const documents = [...docs.files.entries()]
    .filter(([path]) => contract.linkScope === 'all' || !path.includes('/'))
    .map(([, document]) => document);
  for (const document of documents) {
    for (const link of document.links) {
      if (!isRelativeMarkdownLink(link.target)) continue;
      const target = resolveMarkdownTarget(document.path, link.target);
      if (!knownFiles.has(target)) {
        diagnostics.push(
          diagnostic(docs.slug, document.path, 'link/broken', `Relative link target does not exist: ${link.target}`, {
            line: link.line,
          }),
        );
      }
    }
  }

  return diagnostics;
}

function selectedSlugs(workspace: DocsWorkspace, filterPackage: string | null): string[] {
  const slugs = new Set([...workspace.sourceDirectories.keys(), ...workspace.packageDocs.keys()]);
  if (filterPackage) {
    if (!slugs.has(filterPackage)) throw new Error(`Unknown package documentation: ${filterPackage}`);
    return [filterPackage];
  }
  return [...slugs].sort();
}

export function validateDocsWorkspace(workspace: DocsWorkspace, filterPackage: string | null = null): ValidationResult {
  const diagnostics: Diagnostic[] = [];
  const checkedPackages = selectedSlugs(workspace, filterPackage);

  for (const slug of checkedPackages) {
    const sourceDir = workspace.sourceDirectories.get(slug);
    const docs = workspace.packageDocs.get(slug);
    if (!sourceDir && docs) {
      diagnostics.push(
        diagnostic(slug, docs.docsDir, 'workspace/orphan-docs', `Documentation directory has no matching package source: ${slug}.`),
      );
      continue;
    }
    if (sourceDir && !docs) {
      diagnostics.push(
        diagnostic(slug, sourceDir, 'workspace/missing-docs', `Package source has no documentation directory: ${slug}.`, {
          hint: `Create docs/${slug}/index.md with package: ${slug} frontmatter.`,
        }),
      );
      continue;
    }
    if (docs) diagnostics.push(...validatePackageDocs(docs, DOCS_CONTRACTS[workspace.contracts.get(slug) ?? 'standard'], workspace.knownFiles));
  }

  return { checkedPackages, diagnostics };
}

function main(): void {
  const { flags } = parseArgs(process.argv.slice(2));
  const filterPackage = typeof flags.package === 'string' ? flags.package : null;
  const result = validateDocsWorkspace(loadDocsWorkspace(), filterPackage);

  if (result.diagnostics.length === 0) {
    console.log(`Validated documentation structure for ${result.checkedPackages.length} package${result.checkedPackages.length === 1 ? '' : 's'}.`);
    return;
  }

  for (const item of result.diagnostics) {
    const location = item.line ? `:${item.line}` : '';
    console.error(`[${item.rule}] ${relative(ROOT, item.file)}${location}: ${item.message}`);
    if (item.hint) console.error(`  hint: ${item.hint}`);
  }
  console.error(`${result.diagnostics.length} documentation validation failure${result.diagnostics.length === 1 ? '' : 's'}.`);
  process.exitCode = 1;
}

if (isMain(import.meta.url)) {
  try {
    main();
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
}
