import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, normalize } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { type DocsContractName } from '../validate-docs.ts';
import { type DocsWorkspace, indexSidebarLinks, pagePathForLink, type SidebarMulti, validateSidebar } from '../validate-sidebar.ts';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { force: true, recursive: true });
});

function tempDir(): string {
  const root = mkdtempSync(join(tmpdir(), 'vielzeug-sidebar-'));
  roots.push(root);
  return root;
}

/**
 * Build a DocsWorkspace by hand. validateSidebar only reads `knownFiles` (normalized absolute
 * paths) and each package's `files` keys, so the MarkdownDocument values are irrelevant here.
 */
function workspace({
  contracts = new Map<string, DocsContractName>(),
  docsDir,
  pagesBySlug,
}: {
  contracts?: ReadonlyMap<string, DocsContractName>;
  docsDir: string;
  pagesBySlug: Readonly<Record<string, readonly string[]>>;
}): DocsWorkspace {
  const packageDocs = new Map<string, { docsDir: string; files: Map<string, unknown>; slug: string }>();
  const knownFiles = new Set<string>();
  for (const [slug, pages] of Object.entries(pagesBySlug)) {
    packageDocs.set(slug, {
      docsDir: join(docsDir, slug),
      files: new Map(pages.map((page) => [page, {}])),
      slug,
    });
    for (const page of pages) knownFiles.add(normalize(join(docsDir, slug, page)));
  }
  return {
    contracts,
    knownFiles,
    packageDocs,
    sourceDirectories: new Map(),
  };
}

/** Write a stub config module whose default export carries the given sidebar, for loadSidebar to import. */
function stubConfig(sidebar: SidebarMulti): string {
  const path = join(tempDir(), 'config.mjs');
  writeFileSync(path, `export default ${JSON.stringify({ themeConfig: { sidebar } })};\n`);
  return path;
}

describe('pagePathForLink', () => {
  it('maps a bare slug link onto its index page', () => {
    expect(pagePathForLink('/ripple/')).toEqual({ page: 'index.md', slug: 'ripple' });
    expect(pagePathForLink('/ripple')).toEqual({ page: 'index.md', slug: 'ripple' });
  });

  it('maps a nested link onto its markdown page', () => {
    expect(pagePathForLink('/ripple/examples/async-resource')).toEqual({ page: 'examples/async-resource.md', slug: 'ripple' });
  });

  it('strips the anchor before mapping', () => {
    expect(pagePathForLink('/ripple/api#errors')).toEqual({ page: 'api.md', slug: 'ripple' });
  });

  it('returns null for external links', () => {
    expect(pagePathForLink('https://github.com/vielzeug')).toBeNull();
    expect(pagePathForLink('mailto:hi@example.com')).toBeNull();
  });
});

describe('indexSidebarLinks', () => {
  it('walks nested groups and groups links by slug', () => {
    const links = indexSidebarLinks({
      '/ripple/': [
        { link: '/ripple/', text: 'Overview' },
        {
          text: 'Examples',
          items: [{ link: '/ripple/examples/async-resource', text: 'Async' }],
        },
      ],
    });
    expect([...(links.get('ripple') ?? [])].sort()).toEqual(['examples/async-resource.md', 'index.md']);
  });

  it('ignores external links', () => {
    const links = indexSidebarLinks({ '/ripple/': [{ link: 'https://example.com', text: 'External' }] });
    expect(links.size).toBe(0);
  });
});

describe('validateSidebar', () => {
  it('flags a sidebar link whose page is missing', async () => {
    const docsDir = tempDir();
    const configPath = stubConfig({ '/ripple/': [{ link: '/ripple/', text: 'Overview' }, { link: '/ripple/ghost', text: 'Ghost' }] });
    const result = await validateSidebar({
      configPath,
      docsDir,
      workspace: workspace({ docsDir, pagesBySlug: { ripple: ['index.md'] } }),
    });
    const missing = result.diagnostics.filter((d) => d.rule === 'sidebar/link-missing');
    expect(missing).toHaveLength(1);
    expect(missing[0]?.package).toBe('ripple');
    expect(missing[0]?.message).toContain('/ripple/ghost.md');
  });

  it('flags a standard-contract page that no sidebar link reaches', async () => {
    const docsDir = tempDir();
    const configPath = stubConfig({ '/ripple/': [{ link: '/ripple/', text: 'Overview' }] });
    const result = await validateSidebar({
      configPath,
      docsDir,
      workspace: workspace({ docsDir, pagesBySlug: { ripple: ['index.md', 'usage.md'] } }),
    });
    const unlinked = result.diagnostics.filter((d) => d.rule === 'page/unlinked');
    expect(unlinked).toHaveLength(1);
    expect(unlinked[0]?.file).toContain(join('ripple', 'usage.md'));
    expect(unlinked[0]?.hint).toContain("{ link: '/ripple/usage'");
  });

  it('exempts catalog and component-library packages from the unlinked rule', async () => {
    const docsDir = tempDir();
    const configPath = stubConfig({ '/arsenal/': [{ link: '/arsenal/', text: 'Overview' }], '/refine/': [{ link: '/refine/', text: 'Overview' }] });
    const result = await validateSidebar({
      configPath,
      docsDir,
      workspace: workspace({
        contracts: new Map([
          ['arsenal', 'catalog'],
          ['refine', 'component-library'],
        ]),
        docsDir,
        pagesBySlug: { arsenal: ['index.md', 'examples/array/first.md'], refine: ['index.md', 'components/button.md'] },
      }),
    });
    expect(result.diagnostics.filter((d) => d.rule === 'page/unlinked')).toHaveLength(0);
  });

  it('passes when every page is linked and every link resolves', async () => {
    const docsDir = tempDir();
    const configPath = stubConfig({
      '/ripple/': [
        { link: '/ripple/', text: 'Overview' },
        { text: 'Examples', items: [{ link: '/ripple/examples/async-resource', text: 'Async' }] },
      ],
    });
    const result = await validateSidebar({
      configPath,
      docsDir,
      workspace: workspace({ docsDir, pagesBySlug: { ripple: ['index.md', 'examples/async-resource.md'] } }),
    });
    expect(result.diagnostics).toHaveLength(0);
    expect(result.checkedPackages).toEqual(['ripple']);
  });

  it('restricts both rules to the filter package', async () => {
    const docsDir = tempDir();
    const configPath = stubConfig({ '/ripple/': [{ link: '/ripple/ghost', text: 'Ghost' }], '/vault/': [{ link: '/vault/ghost', text: 'Ghost' }] });
    const result = await validateSidebar({
      configPath,
      docsDir,
      filterPackage: 'ripple',
      workspace: workspace({ docsDir, pagesBySlug: { ripple: ['index.md'], vault: ['index.md'] } }),
    });
    expect(result.checkedPackages).toEqual(['ripple']);
    expect(result.diagnostics.every((d) => d.package === 'ripple')).toBe(true);
  });
});
