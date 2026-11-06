/**
 * Validates that the VitePress sidebar matches the documentation pages on disk.
 *
 * The sidebar in `docs/.vitepress/config.ts` is hand-authored, so it drifts from the
 * `docs/<name>/` tree in both directions: links survive after their page is renamed or
 * removed (the reader gets a dead route, and `ignoreDeadLinks` means the build never
 * complains), and new pages never get a link (the reader cannot navigate to them at all).
 *
 * Three rules:
 *   sidebar/link-missing  every internal sidebar link resolves to a documentation page.
 *   sidebar/anchor-missing a sidebar link's #anchor matches a heading that page renders.
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
 *   bun run validate:sidebar
 *   bun run validate:sidebar -- --package=ripple
 */

import { readFileSync } from 'node:fs';
import { dirname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isMain } from './lib/cli.mjs';
import { headingSlugs, parseMarkdownDocument } from './lib/markdown.ts';
import { type Diagnostic, runValidator, type ValidationResult } from './lib/validator.ts';
import { type DocsWorkspace, loadDocsWorkspace } from './validate-docs.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(__dirname, '..');
const DEFAULT_CONFIG_PATH = join(ROOT, 'docs/.vitepress/config.ts');
const DOCS_DIR = join(ROOT, 'docs');

export type SidebarItem = { items?: readonly SidebarItem[]; link?: string; text?: string };
export type SidebarMulti = Record<string, readonly SidebarItem[]>;



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

/**
 * The `#anchor` on a sidebar link, or null when it has none. Kept separate from
 * `pagePathForLink` (which drops it) so the page rules stay anchor-agnostic.
 */
function linkAnchor(link: string): string | null {
  const hash = link.indexOf('#');
  return hash === -1 ? null : link.slice(hash + 1);
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
 * theme, so this runs under Bun (`bun scripts/validate-sidebar.ts`), which imports the
 * VitePress-flavored `.ts` config natively.
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
  const diagnostics: Diagnostic[] = [];
  const sidebar = await loadSidebar(configPath);
  const linksBySlug = indexSidebarLinks(sidebar);
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

  // Rule 1b: a sidebar link's #anchor must match a heading the page actually renders.
  // pagePathForLink drops the anchor, so without this a renamed or removed heading leaves a
  // link that loads the page but never scrolls, and the build never complains.
  const anchorsByPage = new Map<string, ReadonlySet<string>>();
  for (const groups of Object.values(sidebar)) {
    for (const link of collectLinks(groups, [])) {
      const anchor = linkAnchor(link);
      const mapped = pagePathForLink(link);
      if (!anchor || !mapped) continue;
      if (filterPackage && mapped.slug !== filterPackage) continue;
      const path = normalize(join(docsDir, mapped.slug, mapped.page));
      if (!workspace.knownFiles.has(path)) continue;
      let anchors = anchorsByPage.get(path);
      if (!anchors) {
        anchors = headingSlugs(pageHeadings(workspace, docsDir, mapped.slug, mapped.page));
        anchorsByPage.set(path, anchors);
      }
      if (anchors.has(anchor)) continue;
      diagnostics.push(
        sidebarDiagnostic(
          mapped.slug,
          path,
          'sidebar/anchor-missing',
          `Sidebar links /${mapped.slug}/${mapped.page}#${anchor}, but that page has no heading producing #${anchor}.`,
          `Point the link at an existing heading's anchor on /${mapped.slug}/${mapped.page}, or add a heading that slugs to ${anchor}.`,
        ),
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

/**
 * A page's headings: reuse the workspace's parsed document when it owns the page (every
 * package doc), else read the file so non-package sections like /guide/ still validate.
 */
function pageHeadings(workspace: DocsWorkspace, docsDir: string, slug: string, page: string) {
  const headings = workspace.packageDocs.get(slug)?.files.get(page)?.headings;
  if (headings) return headings;
  const path = join(docsDir, slug, page);
  return parseMarkdownDocument(path, readFileSync(path, 'utf8')).headings;
}

function sidebarDiagnostic(pkg: string, file: string, rule: string, message: string, hint?: string): Diagnostic {
  return { file, hint, message, package: pkg, rule };
}

if (isMain(import.meta.url)) {
  void runValidator({
    label: 'sidebar coverage',
    root: ROOT,
    validate: (filterPackage) => validateSidebar({ workspace: loadDocsWorkspace(), filterPackage }),
  });
}
