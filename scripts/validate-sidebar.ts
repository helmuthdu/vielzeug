/**
 * Validates that the VitePress sidebar matches the documentation pages on disk.
 *
 * The sidebar in `docs/.vitepress/config.ts` is hand-authored, so it drifts from the
 * `docs/<name>/` tree in both directions: links survive after their page is renamed or
 * removed (the reader gets a dead route, and `ignoreDeadLinks` means the build never
 * complains), and new pages never get a link (the reader cannot navigate to them at all).
 *
 * Two rules:
 *   sidebar/link-missing  every internal sidebar link resolves to a documentation page.
 *   page/unlinked         every page of a `standard`-contract package is reachable from
 *                         that package's sidebar. Catalog and component-library packages
 *                         are exempt: their leaf pages are navigation, not destinations
 *                         (see DOCS_CONTRACT_OVERRIDES in validate-docs.ts).
 *
 * The sidebar is read by importing the real config, not by parsing its text: part of it is
 * generated (`refineComponentSidebarGroups` maps REFINE_CATEGORIES), so a text scan would
 * report every generated Refine component link as missing.
 *
 * Usage:
 *   pnpm validate:sidebar
 *   pnpm validate:sidebar -- --package=ripple
 */

import { dirname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isMain, parseArgs } from './lib/cli.mjs';
import { type DocsWorkspace, loadDocsWorkspace, type ValidationResult } from './validate-docs.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(__dirname, '..');
const DEFAULT_CONFIG_PATH = join(ROOT, 'docs/.vitepress/config.ts');
const DOCS_DIR = join(ROOT, 'docs');

export type SidebarItem = { items?: readonly SidebarItem[]; link?: string; text?: string };
export type SidebarMulti = Record<string, readonly SidebarItem[]>;

export interface SidebarDiagnostic {
  file: string;
  hint?: string;
  message: string;
  package: string;
  rule: string;
}

/**
 * Map a sidebar link to the docs page it should resolve to, or null for an external link.
 * Drops the anchor and maps a bare `/<slug>/` (or trailing-slash) link onto its index page.
 */
export function pagePathForLink(link: string): { page: string; slug: string } | null {
  if (!link.startsWith('/')) return null;
  const [, slug = '', ...rest] = link.split('#', 1)[0].split('/');
  if (!slug) return null;
  const tail = rest.join('/').replace(/\/$/, '');
  return { page: tail === '' ? 'index.md' : `${tail}.md`, slug };
}

function collectLinks(items: readonly SidebarItem[], found: string[]): string[] {
  for (const item of items) {
    if (typeof item.link === 'string') found.push(item.link);
    if (item.items) collectLinks(item.items, found);
  }
  return found;
}

/** Every internal sidebar link, normalised to `slug -> set of page paths`. */
export function indexSidebarLinks(sidebar: SidebarMulti): Map<string, Set<string>> {
  const linksBySlug = new Map<string, Set<string>>();
  for (const groups of Object.values(sidebar)) {
    for (const link of collectLinks(groups, [])) {
      const mapped = pagePathForLink(link);
      if (!mapped) continue;
      const existing = linksBySlug.get(mapped.slug);
      if (existing) existing.add(mapped.page);
      else linksBySlug.set(mapped.slug, new Set([mapped.page]));
    }
  }
  return linksBySlug;
}

/**
 * Import the real VitePress config to read its sidebar. The config imports VitePress and the
 * theme, so this runs under the same `node --import jiti/register` loader as validate-docs.
 */
export async function loadSidebar(configPath: string): Promise<SidebarMulti> {
  const loaded: { default?: unknown } = await import(configPath);
  // defineConfig may hand back the config, or a module with a nested default, depending on loader.
  const outer = loaded.default as { default?: unknown; themeConfig?: unknown } | undefined;
  const config = (typeof outer?.themeConfig === 'undefined' ? outer?.default : outer) as
    | { themeConfig?: { sidebar?: SidebarMulti } }
    | undefined;
  const sidebar = config?.themeConfig?.sidebar;
  if (!sidebar || typeof sidebar !== 'object') {
    throw new Error(`Could not read themeConfig.sidebar from ${configPath}`);
  }
  return sidebar;
}

export interface SidebarValidationInput {
  configPath?: string;
  /** Root of the docs tree the workspace was loaded from; defaults to the repo docs dir. */
  docsDir?: string;
  filterPackage?: string | null;
  workspace: DocsWorkspace;
}

export async function validateSidebar({
  configPath = DEFAULT_CONFIG_PATH,
  docsDir = DOCS_DIR,
  filterPackage = null,
  workspace,
}: SidebarValidationInput): Promise<ValidationResult> {
  const diagnostics: SidebarDiagnostic[] = [];
  const linksBySlug = indexSidebarLinks(await loadSidebar(configPath));
  const checkedPackages = [...workspace.packageDocs.keys()].filter((slug) => !filterPackage || slug === filterPackage).sort();

  // Rule 1: every internal sidebar link (any section) resolves to a page on disk.
  for (const [slug, pages] of linksBySlug) {
    if (filterPackage && slug !== filterPackage) continue;
    for (const page of pages) {
      if (workspace.knownFiles.has(normalize(join(docsDir, slug, page)))) continue;
      diagnostics.push(
        sidebarDiagnostic(slug, join(docsDir, slug, page), 'sidebar/link-missing', `Sidebar links /${slug}/${page}, but that page does not exist.`),
      );
    }
  }

  // Rule 2: every page of a standard-contract package is reachable from its sidebar.
  for (const slug of checkedPackages) {
    if ((workspace.contracts.get(slug) ?? 'standard') !== 'standard') continue;
    const docs = workspace.packageDocs.get(slug);
    if (!docs) continue;
    const linked = linksBySlug.get(slug) ?? new Set<string>();
    for (const page of docs.files.keys()) {
      if (linked.has(page)) continue;
      const link = `/${slug}/${page.replace(/\.md$/, '').replace(/index$/, '')}`;
      diagnostics.push(
        sidebarDiagnostic(
          slug,
          join(docsDir, slug, page),
          'page/unlinked',
          `Page is not reachable from the /${slug}/ sidebar.`,
          `Add { link: '${link}', text: ... } to the '/${slug}/' group in docs/.vitepress/config.ts.`,
        ),
      );
    }
  }

  return { checkedPackages, diagnostics };
}

function sidebarDiagnostic(pkg: string, file: string, rule: string, message: string, hint?: string): SidebarDiagnostic {
  return { file, hint, message, package: pkg, rule };
}

async function main(): Promise<void> {
  const { flags } = parseArgs(process.argv.slice(2));
  const filterPackage = typeof flags.package === 'string' ? flags.package : null;
  const result = await validateSidebar({ workspace: loadDocsWorkspace(), filterPackage });

  if (result.diagnostics.length === 0) {
    console.log(`Validated sidebar coverage for ${result.checkedPackages.length} package${result.checkedPackages.length === 1 ? '' : 's'}.`);
    return;
  }

  for (const item of result.diagnostics) {
    console.error(`[${item.rule}] ${item.file.replace(`${ROOT}/`, '')}: ${item.message}`);
    if (item.hint) console.error(`  hint: ${item.hint}`);
  }
  console.error(`${result.diagnostics.length} sidebar validation failure${result.diagnostics.length === 1 ? '' : 's'}.`);
  process.exitCode = 1;
}

if (isMain(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
