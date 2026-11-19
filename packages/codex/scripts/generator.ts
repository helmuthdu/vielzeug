// Explicit .ts import extensions are the repo convention for these scripts (run directly under bun, never compiled by tsc).
/**
 * Builds the whole snapshot in memory: every docs page under `docs/<slug>/` (markup
 * stripped, keyed by its path relative to the package's docs folder), checker-resolved public
 * exports per package, REPL examples, projected Refine custom-element declarations, and the
 * theme tokens from `packages/refine/src/styles/theme.css`. Section offsets are computed against
 * the exact stripped string that ships, so the runtime can slice pages without re-parsing.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readDocFrontmatter, splitDocSections, stripDocMarkup, walkMarkdown } from '../../../scripts/lib/codex-markdown.ts';
import { listPackageDirs } from '../../../scripts/vielzeug-packages.ts';
import type {
  Example,
  ExportEntry,
  PackageEntry,
  PackageMeta,
  PageMap,
  RefineAttribute,
  RefineComponent,
  Section,
  Snapshot,
  ThemeToken,
} from '../src/types.ts';
import { readReplExamples } from './repl-examples.ts';
import { resolvePackageExports } from './type-signatures.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface CemShape {
  readonly attributes?: readonly {
    readonly default?: string;
    readonly description?: string;
    readonly name?: string;
    readonly type?: { readonly text?: string };
  }[];
  readonly cssProperties?: readonly { readonly default?: string; readonly description?: string; readonly name?: string }[];
  readonly cssParts?: readonly { readonly description?: string; readonly name?: string }[];
  readonly customElement?: boolean;
  readonly description?: string;
  readonly events?: readonly { readonly description?: string; readonly name?: string; readonly type?: { readonly text?: string } }[];
  readonly name?: string;
  readonly slots?: readonly { readonly description?: string; readonly name?: string }[];
  readonly tagName?: string;
}

function readJson(file: string): Record<string, unknown> {
  return JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
}

type CemAttributes = NonNullable<CemShape['attributes']>;

function projectAttributes(attributes: CemAttributes): RefineAttribute[] {
  return attributes
    .filter((attr): attr is { default?: string; description?: string; name: string; type?: { text?: string } } => typeof attr.name === 'string')
    .map((attr) => ({
      ...(attr.default !== undefined && { default: attr.default }),
      ...(attr.description && { description: attr.description }),
      name: attr.name,
      ...(attr.type?.text && { type: attr.type.text }),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

/** Project one CEM custom-element declaration down to the fields the tools answer with. */
function projectComponent(decl: CemShape, docsPages: ReadonlySet<string>): RefineComponent {
  const tag = decl.tagName ?? '';
  // docs/refine/components/<name>.md uses the tag without its `ore-` prefix.
  const docPage = tag.startsWith('ore-') ? `components/${tag.slice(4)}` : '';

  return {
    ...(decl.attributes?.length && { attributes: projectAttributes(decl.attributes) }),
    ...(decl.cssParts?.length && {
      cssParts: decl.cssParts
        .filter((part): part is { description?: string; name: string } => typeof part.name === 'string')
        .map((part) => ({ ...(part.description && { description: part.description }), name: part.name })),
    }),
    ...(decl.cssProperties?.length && {
      cssProperties: decl.cssProperties
        .filter((prop): prop is { default?: string; description?: string; name: string } => typeof prop.name === 'string')
        .map((prop) => ({
          ...(prop.default !== undefined && { default: prop.default }),
          ...(prop.description && { description: prop.description }),
          name: prop.name,
        })),
    }),
    ...(docPage && docsPages.has(docPage) && { docPage }),
    ...(decl.events?.length && {
      events: decl.events
        .filter((event): event is { description?: string; name: string; type?: { text?: string } } => typeof event.name === 'string')
        .map((event) => ({
          ...(event.description && { description: event.description }),
          name: event.name,
          ...(event.type?.text && { type: event.type.text }),
        })),
    }),
    ...(decl.slots?.length && {
      slots: decl.slots
        .filter((slot): slot is { description?: string; name: string } => typeof slot.name === 'string')
        .map((slot) => ({ ...(slot.description && { description: slot.description }), name: slot.name })),
    }),
    ...(decl.description && { summary: decl.description }),
    tag,
  };
}

/** Element declarations only, deduplicated by tag, sorted by tag. */
function readRefineComponents(repoRoot: string, refineDocsPages: ReadonlySet<string>): RefineComponent[] {
  const file = resolve(repoRoot, 'packages/refine/dist/custom-elements.json');

  if (!existsSync(file)) {
    throw new Error(`Missing ${file}: build @vielzeug/refine first (a codex workspace devDependency, so "bun run build" orders it).`);
  }

  const manifest = readJson(file);
  const modules = Array.isArray(manifest.modules) ? manifest.modules : [];
  const declarations = modules.flatMap((module) => {
    if (typeof module !== 'object' || module === null) return [];
    const entries = (module as Record<string, unknown>).declarations;

    return Array.isArray(entries) ? (entries as CemShape[]) : [];
  });
  const seen = new Set<string>();
  const components: RefineComponent[] = [];

  for (const decl of declarations) {
    if (!decl.tagName || decl.customElement !== true || seen.has(decl.tagName)) continue;
    seen.add(decl.tagName);
    components.push(projectComponent(decl, refineDocsPages));
  }

  return components.sort((left, right) => left.tag.localeCompare(right.tag));
}

/** Custom properties declared in refine's theme.css, with their value and trailing comment. */
function readThemeTokens(repoRoot: string): ThemeToken[] {
  const file = resolve(repoRoot, 'packages/refine/src/styles/theme.css');

  if (!existsSync(file)) return [];

  const css = readFileSync(file, 'utf8');
  const tokens: ThemeToken[] = [];
  // Matches `--name: value;` optionally followed by `/* comment */` on the same line.
  const pattern = /--[\w-]+:[^;]+;/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(css)) !== null) {
    const statement = match[0];
    const colon = statement.indexOf(':');
    const name = statement.slice(0, colon).trim();
    const rest = statement.slice(colon + 1, statement.length - 1).trim();
    const comment = /\/\*\s*([\s\S]*?)\s*\*\/\s*$/.exec(rest);
    const value = (comment ? rest.slice(0, comment.index) : rest).trim();

    tokens.push({ ...(comment?.[1] ? { comment: comment[1] } : {}), name, value });
  }

  return tokens;
}

function buildPackage(repoRoot: string, slug: string, exports: readonly ExportEntry[]): PackageEntry {
  const manifest = readJson(resolve(repoRoot, 'packages', slug, 'package.json'));
  const docsRoot = resolve(repoRoot, 'docs', slug);
  const readme = resolve(repoRoot, 'packages', slug, 'README.md');
  const pages: Record<string, string> = {};
  const titles: Record<string, string> = {};
  const sections: Section[] = [];
  // Package metadata comes from the raw index page's frontmatter, before markup stripping removes it.
  let indexRaw = '';

  for (const page of walkMarkdown(docsRoot)) {
    const raw = readFileSync(resolve(docsRoot, `${page}.md`), 'utf8');
    const fallbackTitle = page === 'index' ? slug : page.split('/').pop() ?? page;
    const markdown = stripDocMarkup(raw, `${slug}/${page}.md`);

    pages[page] = markdown;
    titles[page] = readDocFrontmatter(raw, fallbackTitle).title;
    if (page === 'index') indexRaw = raw;

    for (const section of splitDocSections(markdown, titles[page])) {
      sections.push({ end: section.end, heading: section.heading, level: section.level as 2 | 3, page, start: section.start });
    }
  }

  // A package without docs/<slug>/index.md falls back to its README as the overview page.
  if (!pages.index && existsSync(readme)) {
    const raw = readFileSync(readme, 'utf8');
    const markdown = stripDocMarkup(raw, '');

    pages.index = markdown;
    titles.index = readDocFrontmatter(raw, slug).title;
    indexRaw = raw;
    for (const section of splitDocSections(markdown, titles.index)) {
      sections.push({ end: section.end, heading: section.heading, level: section.level as 2 | 3, page: 'index', start: section.start });
    }
  }

  const examples: Example[] = readReplExamples(repoRoot, slug);
  const indexFrontmatter = readDocFrontmatter(indexRaw, slug);
  const meta: PackageMeta = {
    category: indexFrontmatter.category,
    description:
      typeof manifest.description === 'string' && manifest.description.length > 0
        ? manifest.description
        : indexFrontmatter.description,
    keywords: indexFrontmatter.keywords,
    name: String(manifest.name),
    related: indexFrontmatter.related,
    slug,
    version: typeof manifest.version === 'string' ? manifest.version : '0.0.0',
  };

  return { examples, exports, meta, pages: Object.freeze(pages) as PageMap, sections, titles: Object.freeze(titles) };
}

export interface GeneratorOptions {
  repoRoot?: string;
  slugs?: string[];
}

export function generatorWatchRoots(repoRoot: string): string[] {
  return [resolve(repoRoot, 'docs'), resolve(repoRoot, 'packages')];
}

export function generateSnapshot(options: GeneratorOptions = {}): Snapshot {
  const packageRoot = resolve(__dirname, '..');
  const repoRoot = options.repoRoot ?? resolve(packageRoot, '../..');
  const slugs = (options.slugs ?? listPackageDirs(resolve(repoRoot, 'packages'))).sort();
  const exportsBySlug = new Map(resolvePackageExports(repoRoot, slugs).map((entry) => [entry.slug, entry.exports]));
  const packages = slugs.map((slug) =>
    buildPackage(repoRoot, slug, exportsBySlug.get(slug) ?? []),
  );

  const packageManifest = readJson(resolve(packageRoot, 'package.json'));
  const version = typeof packageManifest.version === 'string' ? packageManifest.version : '0.0.0';
  const refinePages = new Set(walkMarkdown(resolve(repoRoot, 'docs', 'refine')));

  return {
    components: readRefineComponents(repoRoot, refinePages),
    packages,
    tokens: readThemeTokens(repoRoot),
    version,
  };
}

/** Relative path of the snapshot file inside a snapshot root, used by writer and loader alike. */
export const SNAPSHOT_FILE = 'snapshot.json';
