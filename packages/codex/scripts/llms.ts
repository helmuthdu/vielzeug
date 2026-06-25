// .ts extension required: this file runs under node --experimental-strip-types (scripts only, never compiled by tsc).
import type { BundledData, BundledPackage, DocPage } from '../src/types.ts';

// ---------------------------------------------------------------------------
// Markup stripping
// ---------------------------------------------------------------------------

export function stripDocMarkup(md: string): string {
  return md
    .replace(/^---\n[\s\S]*?\n---\n?/, '') // frontmatter
    .replace(/<!--[\s\S]*?-->/g, '') // HTML comments
    .replace(/<[^>]+>/g, '') // HTML tags
    .replace(/^\[\[toc]]\s*$/gm, '') // VitePress TOC directive
    .replace(/^:::[\s\S]*?:::\s*$/gm, (m) => m.replace(/^:::[^\n]*\n?|^:::\s*$/gm, '')) // containers
    .replace(/\n{3,}/g, '\n\n') // normalise consecutive blank lines
    .trim();
}

// ---------------------------------------------------------------------------
// Category ordering
// ---------------------------------------------------------------------------

const CATEGORY_ORDER = [
  'state',
  'ui',
  'ui-components',
  'ui-primitives',
  'ui-interaction',
  'ui-performance',
  'forms',
  'data',
  'http',
  'websockets',
  'events',
  'workers',
  'storage',
  'auth',
  'routing',
  'i18n',
  'di',
  'validation',
  'utilities',
  'time',
  'logging',
  'ai-tooling',
];

function groupByCategory(packages: BundledPackage[]): Map<string, BundledPackage[]> {
  const map = new Map<string, BundledPackage[]>();

  for (const pkg of packages) {
    const cat = pkg.category || 'general';

    if (!map.has(cat)) map.set(cat, []);

    map.get(cat)!.push(pkg);
  }

  return map;
}

function sortedCategories(grouped: Map<string, BundledPackage[]>): string[] {
  return [...grouped.keys()].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);

    if (ai !== -1 && bi !== -1) return ai - bi;

    if (ai !== -1) return -1;

    if (bi !== -1) return 1;

    return a.localeCompare(b);
  });
}

// ---------------------------------------------------------------------------
// llms.txt — summary file
// ---------------------------------------------------------------------------

function buildLlmsTxt(packages: BundledPackage[], version: string): string {
  const grouped = groupByCategory(packages);
  const categories = sortedCategories(grouped);

  const lines: string[] = [
    '# Vielzeug',
    '',
    `> ${packages.length} focused TypeScript packages for state, UI, data, storage, routing, utilities, and AI tooling. Version: ${version}`,
    '',
    'Vielzeug is a monorepo of focused TypeScript packages — from low-level utilities to UI primitives,',
    'routing, storage, validation, workers, and an MCP server for AI assistants. Packages are designed',
    'to be independently consumable, ship ESM + CJS output, and target ES2022.',
    '',
    'Install any package independently: `pnpm add @vielzeug/<name>`',
    '',
    '**MCP (AI agents):** `npx -y @vielzeug/codex` runs the Vielzeug MCP server in standalone stdio mode',
    'with bundled data — no monorepo checkout required. Use `npx -y @vielzeug/codex --port 3100`',
    'for Streamable HTTP with package discovery, docs lookup, source inspection, and Refine component metadata.',
    '',
    '## Packages',
    '',
  ];

  for (const cat of categories) {
    const pkgs = grouped.get(cat)!;

    lines.push(`### ${cat}`);
    lines.push('');

    for (const pkg of pkgs) {
      const pageLinks = pkg.availableDocPages
        .filter((p) => p !== 'index')
        .map((p) => `[${p}](/${pkg.slug}/${p})`)
        .join(' · ');

      let line = `- [${pkg.name}](/${pkg.slug}/): ${pkg.description}`;

      if (pageLinks) line += ` → ${pageLinks}`;

      lines.push(line);
    }

    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}

// ---------------------------------------------------------------------------
// llms-full.txt — complete documentation
// ---------------------------------------------------------------------------

const PAGE_LABELS: Record<DocPage, string> = {
  api: 'API Reference',
  examples: 'Examples',
  index: 'Overview',
  usage: 'Usage Guide',
};

const PAGE_ORDER: DocPage[] = ['index', 'api', 'usage', 'examples'];

function buildLlmsFullTxt(packages: BundledPackage[], version: string): string {
  const lines: string[] = [
    '# Vielzeug — Full Documentation',
    '',
    `> Complete documentation for all ${packages.length} Vielzeug packages. Version: ${version}`,
  ];

  for (const pkg of packages) {
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push(`## ${pkg.name}`);
    lines.push('');
    lines.push(`**Category:** ${pkg.category || 'general'}`);

    if (pkg.keywords.length > 0) {
      lines.push(`**Keywords:** ${pkg.keywords.join(', ')}`);
    }

    if (pkg.exports.length > 0) {
      const shown = pkg.exports.slice(0, 12);
      const overflow = pkg.exports.length > 12 ? ` (+${pkg.exports.length - 12} more)` : '';

      lines.push(`**Key exports:** ${shown.join(', ')}${overflow}`);
    }

    if (pkg.related.length > 0) {
      lines.push(`**Related:** ${pkg.related.join(', ')}`);
    }

    lines.push('');

    for (const page of PAGE_ORDER) {
      const content = pkg.docs[page];

      if (!content) continue;

      const stripped = stripDocMarkup(content);

      if (!stripped) continue;

      lines.push(`### ${PAGE_LABELS[page]}`);
      lines.push('');
      lines.push(stripped);
      lines.push('');
    }
  }

  return lines.join('\n').trimEnd() + '\n';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface LlmsResult {
  llmsFullTxt: string;
  llmsTxt: string;
}

export function generateLlmsTxt(data: BundledData): LlmsResult {
  return {
    llmsFullTxt: buildLlmsFullTxt(data.packages, data.version),
    llmsTxt: buildLlmsTxt(data.packages, data.version),
  };
}
