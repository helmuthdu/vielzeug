import browserslist from 'browserslist';
import { browserslistToTargets } from 'lightningcss';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type DefaultTheme, type UserConfig } from 'vitepress';

import type { ThemeConfig } from './theme/types';

import { getPackagesData } from './theme/utils/packageData';

const __dirname = dirname(fileURLToPath(import.meta.url));

const NON_COLLAPSIBLE_PACKAGE_PATHS = new Set(['/sigil/']);

const isPackageSidebarPath = (path: string): boolean => /^\/[a-z]+\/$/.test(path);

const makePackageSidebarsCollapsible = (sidebar: DefaultTheme.SidebarMulti): DefaultTheme.SidebarMulti => {
  return Object.fromEntries(
    Object.entries(sidebar).map(([path, items]) => {
      if (!isPackageSidebarPath(path) || NON_COLLAPSIBLE_PACKAGE_PATHS.has(path)) {
        return [path, items];
      }

      const normalizedItems = items.map((item) => {
        if (!('items' in item)) return item;

        return {
          ...item,
          collapsed: item.collapsed ?? item.text === 'API Reference',
        };
      });

      return [path, normalizedItems];
    }),
  ) as DefaultTheme.SidebarMulti;
};

// ---------------------------------------------------------------------------
// llms.txt + llms-full.txt generator
// ---------------------------------------------------------------------------

interface RushProject {
  packageName: string;
  projectFolder: string;
}

type FrontmatterValue = string | string[];

function parseFrontmatter(md: string): Record<string, FrontmatterValue> {
  const match = md.match(/^---\n([\s\S]*?)\n---/);

  if (!match) return {};

  const out: Record<string, FrontmatterValue> = {};

  for (const line of match[1].split('\n')) {
    const colon = line.indexOf(':');

    if (colon < 1) continue;

    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim();

    if (val.startsWith('[') && val.endsWith(']')) {
      out[key] = val
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
    } else {
      out[key] = val.replace(/^['"]|['"]$/g, '');
    }
  }

  return out;
}

function stripDocMarkup(md: string): string {
  return md
    .replace(/^---\n[\s\S]*?\n---\n?/, '') // frontmatter
    .replace(/<!--[\s\S]*?-->/g, '') // HTML comments
    .replace(/<[^>]+>/g, '') // HTML tags
    .replace(/^\[\[toc]]\s*$/gm, '') // VitePress TOC directive
    .replace(/^:::[\s\S]*?:::\s*$/gm, (m) => m.replace(/^:::[^\n]*\n?|^:::\s*$/gm, '')) // containers
    .replace(/^\s*\n{2,}/gm, '\n\n') // normalise blank lines
    .trim();
}

async function generateLlmsTxt(siteConfig: { outDir: string }): Promise<void> {
  const root = resolve(__dirname, '../..');
  const docsDir = resolve(__dirname, '..');
  const outDir = siteConfig.outDir;

  const rushJson = JSON.parse(readFileSync(resolve(root, 'rush.json'), 'utf8')) as { projects: RushProject[] };
  const DOC_PAGES = ['index', 'api', 'usage', 'examples'] as const;
  const totalPackages = rushJson.projects.length;

  const packageLines: string[] = [];
  const fullSections: string[] = [];

  for (const project of rushJson.projects) {
    const slug = project.projectFolder.replace('packages/', '');
    const indexPath = resolve(docsDir, `${slug}/index.md`);

    if (!existsSync(indexPath)) continue;

    const indexContent = readFileSync(indexPath, 'utf8');
    const fm = parseFrontmatter(indexContent);
    const description = (fm['description'] as string) || '';
    const category = (fm['category'] as string) || '';
    const keywords = Array.isArray(fm['keywords']) ? fm['keywords'].join(', ') : '';

    const availablePages = DOC_PAGES.filter((p) => existsSync(resolve(docsDir, `${slug}/${p}.md`)));

    const pageLinks = availablePages
      .filter((p) => p !== 'index')
      .map((p) => `[${p}](/${slug}/${p})`)
      .join(' · ');

    let line = `- [${project.packageName}](/${slug}/): ${description}`;

    if (pageLinks) line += ` → ${pageLinks}`;

    packageLines.push(line);

    // full section: index content only (stripped)
    let section = `\n\n---\n\n## ${project.packageName}`;

    section += `\n\n**Category:** ${category || 'general'}`;

    if (keywords) section += `  \n**Keywords:** ${keywords}`;

    section += `\n\n${stripDocMarkup(indexContent)}`;
    fullSections.push(section);
  }

  const llmsTxt = [
    '# Vielzeug',
    '',
    `> ${totalPackages} focused TypeScript packages for state, UI, data, storage, routing, utilities, and AI tooling.`,
    '',
    'Vielzeug is a monorepo of focused TypeScript packages — from low-level utilities to UI primitives,',
    'routing, storage, validation, workers, and an MCP server for AI assistants. Packages are designed',
    'to be independently consumable, ship ESM + CJS output, and target ES2022.',
    '',
    'Install any package independently: `pnpm add @vielzeug/<name>`',
    '',
    '**MCP (AI agents):** `npx -y @vielzeug/codex` runs the Vielzeug MCP server in standalone stdio mode with bundled data,',
    'so no monorepo checkout is required. Use `npx -y @vielzeug/codex --port 3100` for Streamable HTTP with the same package discovery, docs lookup, source inspection, and Sigil component metadata tools.',
    '',
    '## Packages',
    '',
    ...packageLines,
    '',
    '## Getting Started',
    '',
    '- [Getting Started](/guide/): Installation and package overview',
  ].join('\n');

  const llmsFullTxt = [
    '# Vielzeug — Full documentation',
    '',
    `> Complete index documentation for all ${totalPackages} Vielzeug packages.`,
    ...fullSections,
  ].join('\n');

  writeFileSync(resolve(outDir, 'llms.txt'), llmsTxt, 'utf8');
  writeFileSync(resolve(outDir, 'llms-full.txt'), llmsFullTxt, 'utf8');
}

// ---------------------------------------------------------------------------

export default defineConfig({
  base: '/',
  async buildEnd(siteConfig) {
    await generateLlmsTxt(siteConfig);
  },
  description: 'Documentation for the Vielzeug monorepo',
  head: [
    // Favicons
    ['link', { href: '/favicon/favicon.svg', rel: 'icon', type: 'image/svg+xml' }],
    ['link', { href: '/favicon/favicon-96x96.png', rel: 'icon', sizes: '96x96', type: 'image/png' }],
    ['link', { href: '/favicon/favicon.ico', rel: 'icon', type: 'image/x-icon' }],
    ['link', { href: '/favicon/apple-touch-icon.png', rel: 'apple-touch-icon', sizes: '180x180' }],
    ['link', { href: '/favicon/site.webmanifest', rel: 'manifest' }],
    [
      'link',
      {
        href: 'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200',
        rel: 'stylesheet',
      },
    ],
    // Theme and mobile app configuration
    ['meta', { content: '#f6ac2c', name: 'theme-color' }],
    ['meta', { content: 'yes', name: 'mobile-web-app-capable' }],
    ['meta', { content: 'black', name: 'mobile-web-app-status-bar-style' }],
  ],
  ignoreDeadLinks: true,
  sitemap: {
    hostname: 'https://vielzeug.dev',
    transformItems: (items) => {
      return items.map((item) => {
        return {
          ...item,
          url: `vielzeug/${item.url}`,
        };
      });
    },
  },
  themeConfig: {
    logo: '/logo-main.svg',
    nav: [
      { link: '/guide/', text: 'Guide' },
      {
        items: [
          {
            items: [
              { link: '/arsenal/', text: 'Arsenal' },
              { link: '/coins/', text: 'Coins' },
              { link: '/rune/', text: 'Rune' },
              { link: '/tempo/', text: 'Tempo' },
            ],
            text: 'Core & Utilities',
          },
          {
            items: [
              { link: '/clockwork/', text: 'Clockwork' },
              { link: '/courier/', text: 'Courier' },
              { link: '/herald/', text: 'Herald' },
              { link: '/ripple/', text: 'Ripple' },
              { link: '/sourcerer/', text: 'Sourcerer' },
              { link: '/spell/', text: 'Spell' },
              { link: '/vault/', text: 'Vault' },
            ],
            text: 'Data & State',
          },
          {
            items: [
              { link: '/craft/', text: 'Craft' },
              { link: '/forge/', text: 'Forge' },
              { link: '/grip/', text: 'Grip' },
              { link: '/lingua/', text: 'Lingua' },
              { link: '/orbit/', text: 'Orbit' },
              { link: '/scroll/', text: 'Scroll' },
            ],
            text: 'Frontend & Logic',
          },
          {
            items: [
              { link: '/codex/', text: 'Codex' },
              { link: '/conduit/', text: 'Conduit' },
              { link: '/familiar/', text: 'Familiar' },
              { link: '/ward/', text: 'Ward' },
              { link: '/wayfinder/', text: 'Wayfinder' },
            ],
            text: 'Architecture & Security',
          },
        ],
        text: 'Packages',
      },
      { link: '/sigil/', text: 'Components' },
      { link: '/repl', text: 'REPL' },
    ],
    packages: getPackagesData(),
    search: {
      provider: 'local',
    },
    sidebar: makePackageSidebarsCollapsible({
      '/arsenal/': [
        { link: '/arsenal/', text: 'Overview' },
        {
          items: [
            { link: '/arsenal/usage#basic-usage', text: 'Basic Usage' },
            { link: '/arsenal/usage#common-patterns', text: 'Common Patterns' },
            { link: '/arsenal/usage#advanced-usage', text: 'Advanced Usage' },
            { link: '/arsenal/usage#framework-integration', text: 'Framework Integration' },
            { link: '/arsenal/usage#best-practices', text: 'Best Practices' },
            { link: '/arsenal/usage#performance-tips', text: 'Performance' },
          ],
          link: '/arsenal/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/arsenal/api#array', text: 'Array' },
            { link: '/arsenal/api#async', text: 'Async' },
            { link: '/arsenal/api#date', text: 'Date' },
            { link: '/arsenal/api#function', text: 'Function' },
            { link: '/arsenal/api#math', text: 'Math' },
            { link: '/arsenal/api#object', text: 'Object' },
            { link: '/arsenal/api#random', text: 'Random' },
            { link: '/arsenal/api#string', text: 'String' },
            { link: '/arsenal/api#typed', text: 'Typed' },
          ],
          link: '/arsenal/api',
          text: 'API Reference',
        },
        {
          items: [
            {
              collapsed: true,
              items: [
                { link: '/arsenal/examples/array/chunk', text: 'chunk' },
                { link: '/arsenal/examples/array/compact', text: 'compact' },
                { link: '/arsenal/examples/array/contains', text: 'contains' },
                { link: '/arsenal/examples/array/countBy', text: 'countBy' },
                { link: '/arsenal/examples/array/difference', text: 'difference' },
                { link: '/arsenal/examples/array/drop', text: 'drop' },
                { link: '/arsenal/examples/array/dropLast', text: 'dropLast' },
                { link: '/arsenal/examples/array/select', text: 'filterMap' },
                { link: '/arsenal/examples/array/first', text: 'first' },
                { link: '/arsenal/examples/array/flatten', text: 'flatten' },
                { link: '/arsenal/examples/array/group', text: 'groupBy' },
                { link: '/arsenal/examples/array/intersection', text: 'intersection' },
                { link: '/arsenal/examples/array/keyBy', text: 'indexBy' },
                { link: '/arsenal/examples/array/last', text: 'last' },
                { link: '/arsenal/examples/array/partition', text: 'partition' },
                { link: '/sourcerer/examples/local-pagination-and-filtering', text: 'Sourcerer: local source' },
                { link: '/arsenal/examples/array/replace', text: 'replace' },
                { link: '/arsenal/examples/array/rotate', text: 'rotate' },
                { link: '/arsenal/examples/array/sampleSize', text: 'sample' },
                { link: '/arsenal/examples/array/search', text: 'search' },
                { link: '/arsenal/examples/array/sort', text: 'sort' },
                { link: '/arsenal/examples/array/take', text: 'take' },
                { link: '/arsenal/examples/array/takeLast', text: 'takeLast' },
                { link: '/arsenal/examples/array/toggle', text: 'toggle' },
                { link: '/arsenal/examples/array/union', text: 'union' },
                { link: '/arsenal/examples/array/uniq', text: 'uniq' },
                { link: '/arsenal/examples/array/unzip', text: 'unzip' },
                { link: '/arsenal/examples/array/zip', text: 'zip' },
              ],
              link: '/arsenal/examples/array',
              text: 'Array',
            },
            {
              collapsed: true,
              items: [
                { link: '/arsenal/examples/async/abortable', text: 'abortable' },
                { link: '/arsenal/examples/async/abortError', text: 'abortError' },
                { link: '/arsenal/examples/async/attempt', text: 'attempt' },
                { link: '/arsenal/examples/async/parallel', text: 'parallel' },
                { link: '/arsenal/examples/async/queue', text: 'queue' },
                { link: '/arsenal/examples/async/retry', text: 'retry' },
                { link: '/arsenal/examples/async/sleep', text: 'sleep' },
                { link: '/arsenal/examples/async/waitFor', text: 'waitFor' },
              ],
              link: '/arsenal/examples/async',
              text: 'Async',
            },
            {
              collapsed: true,
              items: [
                { link: '/arsenal/examples/string/camelCase', text: 'camelCase' },
                { link: '/arsenal/examples/string/endsWith', text: 'endsWith' },
                { link: '/arsenal/examples/string/escape', text: 'escape' },
                { link: '/arsenal/examples/string/kebabCase', text: 'kebabCase' },
                { link: '/arsenal/examples/string/pad', text: 'pad' },
                { link: '/arsenal/examples/string/pascalCase', text: 'pascalCase' },
                { link: '/arsenal/examples/string/similarity', text: 'similarity' },
                { link: '/arsenal/examples/string/snakeCase', text: 'snakeCase' },
                { link: '/arsenal/examples/string/startsWith', text: 'startsWith' },
                { link: '/arsenal/examples/string/titleCase', text: 'titleCase' },
                { link: '/arsenal/examples/string/truncate', text: 'truncate' },
                { link: '/arsenal/examples/string/unescape', text: 'unescape' },
                { link: '/arsenal/examples/string/words', text: 'words' },
              ],
              link: '/arsenal/examples/string',
              text: 'String',
            },
            {
              collapsed: true,
              items: [
                { link: '/arsenal/examples/object/cache', text: 'cache' },
                { link: '/arsenal/examples/object/defaults', text: 'defaults' },
                { link: '/arsenal/examples/object/diff', text: 'diff' },
                { link: '/arsenal/examples/object/entries', text: 'entries' },
                { link: '/arsenal/examples/object/filterValues', text: 'filterValues' },
                { link: '/arsenal/examples/object/flattenPaths', text: 'flattenPaths' },
                { link: '/arsenal/examples/object/fromEntries', text: 'fromEntries' },
                { link: '/arsenal/examples/object/getOrCreate', text: 'getOrCreate' },
                { link: '/arsenal/examples/object/has', text: 'has' },
                { link: '/arsenal/examples/object/invert', text: 'invert' },
                { link: '/arsenal/examples/object/keys', text: 'keys' },
                { link: '/arsenal/examples/object/mapKeys', text: 'mapKeys' },
                { link: '/arsenal/examples/object/mapValues', text: 'mapValues' },
                { link: '/arsenal/examples/object/merge', text: 'merge' },
                { link: '/arsenal/examples/object/omit', text: 'omit' },
                { link: '/arsenal/examples/object/parseJSON', text: 'parseJSON' },
                { link: '/arsenal/examples/object/path', text: 'path' },
                { link: '/arsenal/examples/object/pick', text: 'pick' },
                { link: '/arsenal/examples/object/prune', text: 'prune' },
                { link: '/arsenal/examples/object/stableStringify', text: 'stableStringify' },
                { link: '/arsenal/examples/object/stash', text: 'stash' },
                { link: '/arsenal/examples/object/values', text: 'values' },
              ],
              link: '/arsenal/examples/object',
              text: 'Object',
            },

            {
              collapsed: true,
              items: [
                { link: '/arsenal/examples/function/allOf', text: 'allOf / anyOf / noneOf' },
                { link: '/arsenal/examples/function/assert', text: 'assert' },
                { link: '/arsenal/examples/function/compare', text: 'compare' },
                { link: '/arsenal/examples/function/compareBy', text: 'compareBy' },
                { link: '/arsenal/examples/function/compose', text: 'compose' },
                { link: '/arsenal/examples/function/constant', text: 'constant' },
                { link: '/arsenal/examples/function/curry', text: 'curry' },
                { link: '/arsenal/examples/function/debounce', text: 'debounce' },
                { link: '/arsenal/examples/function/identity', text: 'identity' },
                { link: '/arsenal/examples/function/memo', text: 'memo' },
                { link: '/arsenal/examples/function/once', text: 'once' },
                { link: '/arsenal/examples/function/partial', text: 'partial' },
                { link: '/arsenal/examples/function/pipe', text: 'pipe' },
                { link: '/arsenal/examples/function/runAll', text: 'runAll' },
                { link: '/arsenal/examples/function/tap', text: 'tap' },
                { link: '/arsenal/examples/function/throttle', text: 'throttle' },
              ],
              link: '/arsenal/examples/function',
              text: 'Function',
            },
            {
              collapsed: true,
              items: [
                { link: '/arsenal/examples/math/abs', text: 'abs' },
                { link: '/arsenal/examples/math/allocate', text: 'allocate' },
                { link: '/arsenal/examples/math/average', text: 'average' },
                { link: '/arsenal/examples/math/clamp', text: 'clamp' },
                { link: '/arsenal/examples/math/gcd', text: 'gcd' },
                { link: '/arsenal/examples/math/lcm', text: 'lcm' },
                { link: '/arsenal/examples/math/lerp', text: 'lerp' },
                { link: '/arsenal/examples/math/linspace', text: 'linspace' },
                { link: '/arsenal/examples/math/max', text: 'max' },
                { link: '/arsenal/examples/math/median', text: 'median' },
                { link: '/arsenal/examples/math/min', text: 'min' },
                { link: '/arsenal/examples/math/mod', text: 'mod' },
                { link: '/arsenal/examples/math/normalize', text: 'normalize' },
                { link: '/arsenal/examples/math/percent', text: 'percent' },
                { link: '/arsenal/examples/math/range', text: 'range' },
                { link: '/arsenal/examples/math/round', text: 'round' },
                { link: '/arsenal/examples/math/standardDeviation', text: 'standardDeviation' },
                { link: '/arsenal/examples/math/sum', text: 'sum' },
                { link: '/arsenal/examples/math/variance', text: 'variance' },
              ],
              link: '/arsenal/examples/math',
              text: 'Math',
            },
            {
              collapsed: true,
              items: [
                { link: '/arsenal/examples/random/draw', text: 'draw' },
                { link: '/arsenal/examples/random/random', text: 'random' },
                { link: '/arsenal/examples/random/shuffle', text: 'shuffle' },
                { link: '/arsenal/examples/random/uuid', text: 'uuid' },
              ],
              link: '/arsenal/examples/random',
              text: 'Random',
            },
            {
              collapsed: true,
              items: [
                { link: '/arsenal/examples/typed/isAbortError', text: 'isAbortError' },
                { link: '/arsenal/examples/typed/isArray', text: 'isArray' },
                { link: '/arsenal/examples/typed/isBoolean', text: 'isBoolean' },
                { link: '/arsenal/examples/typed/isDate', text: 'isDate' },
                { link: '/arsenal/examples/typed/isDefined', text: 'isDefined' },
                { link: '/arsenal/examples/typed/isEmpty', text: 'isEmpty' },
                { link: '/arsenal/examples/typed/isEqual', text: 'isEqual' },
                { link: '/arsenal/examples/typed/isError', text: 'isError' },
                { link: '/arsenal/examples/typed/isFunction', text: 'isFunction' },
                { link: '/arsenal/examples/typed/isMatch', text: 'isMatch' },
                { link: '/arsenal/examples/typed/isNil', text: 'isNil' },
                { link: '/arsenal/examples/typed/isNumber', text: 'isNumber' },
                { link: '/arsenal/examples/typed/isPlainObject', text: 'isPlainObject' },
                { link: '/arsenal/examples/typed/isPrimitive', text: 'isPrimitive' },
                { link: '/arsenal/examples/typed/isPromise', text: 'isPromise' },
                { link: '/arsenal/examples/typed/isRegex', text: 'isRegex' },
                { link: '/arsenal/examples/typed/isString', text: 'isString' },
              ],
              link: '/arsenal/examples/typed',
              text: 'Typed',
            },
          ],
          link: '/arsenal/examples',
          text: 'Examples',
        },
      ],
      '/clockwork/': [
        { link: '/clockwork/', text: 'Overview' },
        {
          items: [
            { link: '/clockwork/usage#basic-usage', text: 'Basic Usage' },
            { link: '/clockwork/usage#transitions-and-guards', text: 'Transitions & Guards' },
            { link: '/clockwork/usage#actions', text: 'Actions' },
            { link: '/clockwork/usage#entry-and-exit-actions', text: 'Entry & Exit Actions' },
            { link: '/clockwork/usage#async-invokes', text: 'Async Invokes' },
            { link: '/clockwork/usage#context-validation', text: 'Context Validation' },
            { link: '/clockwork/usage#persistence', text: 'Persistence' },
            { link: '/clockwork/usage#debugging-and-tracing', text: 'Debugging & Tracing' },
            { link: '/clockwork/usage#testing', text: 'Testing' },
            { link: '/clockwork/usage#disposal', text: 'Disposal' },
            { link: '/clockwork/usage#common-patterns', text: 'Common Patterns' },
            { link: '/clockwork/usage#best-practices', text: 'Best Practices' },
          ],
          link: '/clockwork/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/clockwork/api#api-at-a-glance', text: 'At a Glance' },
            { link: '/clockwork/api#definitions', text: 'defineMachine()' },
            { link: '/clockwork/api#interpret', text: 'interpret()' },
            { link: '/clockwork/api#resolvetransition', text: 'resolveTransition()' },
            { link: '/clockwork/api#assign', text: 'assign()' },
            { link: '/clockwork/api#types', text: 'Types' },
            { link: '/clockwork/api#signals-and-reactivity', text: 'Signals & Reactivity' },
          ],
          link: '/clockwork/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/clockwork/examples/form-validation', text: 'Form with Validation' },
            { link: '/clockwork/examples/media-player', text: 'Media Player' },
            { link: '/clockwork/examples/fetch-retry', text: 'Fetch with Retry' },
            { link: '/clockwork/examples/checkout', text: 'Shopping Cart Checkout' },
            { link: '/clockwork/examples/wizard-with-routing', text: 'Multi-Step Wizard with Routing' },
            { link: '/clockwork/examples/paginated-data-loading', text: 'Paginated Data Loading with Search' },
            { link: '/clockwork/examples/permission-based-access', text: 'Permission-Based Access Control' },
            { link: '/clockwork/examples/multi-machine-coordination', text: 'Multi-Machine Coordination with Events' },
          ],
          link: '/clockwork/examples',
          text: 'Examples',
        },
      ],
      '/codex/': [
        { link: '/codex/', text: 'Overview' },
        {
          items: [
            { link: '/codex/usage#quick-setup-from-a-monorepo-checkout', text: 'Setup' },
            { link: '/codex/usage#transport-modes', text: 'Transport' },
            { link: '/codex/usage#connecting-claude-desktop', text: 'Claude Desktop' },
            { link: '/codex/usage#connecting-github-copilot-chat', text: 'Copilot Chat' },
            { link: '/codex/usage#how-documentation-lookup-works', text: 'Docs Lookup' },
          ],
          link: '/codex/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/codex/api#api-at-a-glance', text: 'At a Glance' },
            { link: '/codex/api#tools', text: 'Tools' },
            { link: '/codex/api#list-packages', text: 'list-packages' },
            { link: '/codex/api#search-packages', text: 'search-packages' },
            { link: '/codex/api#get-ai-context', text: 'get-ai-context' },
            { link: '/codex/api#list-docs-pages', text: 'list-docs-pages' },
            { link: '/codex/api#get-docs', text: 'get-docs' },
            { link: '/codex/api#get-package-api', text: 'get-package-api' },
            { link: '/codex/api#list-components', text: 'list-components' },
            { link: '/codex/api#get-component', text: 'get-component' },
            { link: '/codex/api#resources', text: 'Resources' },
            { link: '/codex/api#input-validation', text: 'Input Validation' },
            { link: '/codex/api#error-handling', text: 'Error Handling' },
          ],
          link: '/codex/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/codex/examples/listing-packages', text: 'Listing Packages' },
            { link: '/codex/examples/searching-packages', text: 'Searching Packages' },
            { link: '/codex/examples/ai-context', text: 'AI Context' },
            { link: '/codex/examples/looking-up-components', text: 'Looking Up Components' },
            { link: '/codex/examples/reading-docs', text: 'Reading Docs' },
            { link: '/codex/examples/inspector', text: 'Inspector' },
          ],
          link: '/codex/examples',
          text: 'Examples',
        },
      ],
      '/coins/': [
        { link: '/coins/', text: 'Overview' },
        {
          items: [
            { link: '/coins/usage#creating-money-values', text: 'Creating Money Values' },
            { link: '/coins/usage#arithmetic', text: 'Arithmetic' },
            { link: '/coins/usage#allocation', text: 'Allocation' },
            { link: '/coins/usage#formatting', text: 'Formatting' },
            { link: '/coins/usage#currency-exchange', text: 'Currency Exchange' },
          ],
          link: '/coins/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/coins/api#factories', text: 'Factories' },
            { link: '/coins/api#arithmetic', text: 'Arithmetic' },
            { link: '/coins/api#allocation', text: 'Allocation' },
            { link: '/coins/api#aggregates', text: 'Aggregates' },
            { link: '/coins/api#comparison', text: 'Comparison' },
            { link: '/coins/api#serialization', text: 'Serialization' },
            { link: '/coins/api#formatting', text: 'Formatting' },
            { link: '/coins/api#exchange', text: 'Exchange' },
          ],
          link: '/coins/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/coins/examples/formatting', text: 'Formatting' },
            { link: '/coins/examples/exchange', text: 'Exchange' },
          ],
          link: '/coins/examples',
          text: 'Examples',
        },
      ],
      '/conduit/': [
        { link: '/conduit/', text: 'Overview' },
        {
          items: [
            { link: '/conduit/usage#tokens', text: 'Tokens' },
            { link: '/conduit/usage#registration', text: 'Registration' },
            { link: '/conduit/usage#resolution', text: 'Resolution' },
            { link: '/conduit/usage#lifetimes', text: 'Lifetimes' },
            { link: '/conduit/usage#child-containers', text: 'Child Containers' },
            { link: '/conduit/usage#async-providers', text: 'Async Providers' },
            { link: '/conduit/usage#disposal', text: 'Disposal' },
          ],
          link: '/conduit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/conduit/api#createtokendescription', text: 'createToken()' },
            { link: '/conduit/api#createcontainer', text: 'createContainer()' },
            { link: '/conduit/api#container-registration', text: 'Registration' },
            { link: '/conduit/api#container-resolution', text: 'Resolution' },
            { link: '/conduit/api#container-lifecycle', text: 'Lifecycle' },
            { link: '/conduit/api#errors', text: 'Errors' },
            { link: '/conduit/api#types', text: 'Types' },
          ],
          link: '/conduit/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/conduit/examples/basic-setup', text: 'Basic Setup' },
            { link: '/conduit/examples/lifetimes', text: 'Lifetimes' },
            { link: '/conduit/examples/async-providers', text: 'Async Providers' },
            { link: '/conduit/examples/child-containers', text: 'Child Containers' },
            { link: '/conduit/examples/multi-providers', text: 'Multi Providers' },
            { link: '/conduit/examples/batch-resolution', text: 'Batch Resolution' },
            { link: '/conduit/examples/dispose-lifecycle', text: 'Dispose Lifecycle' },
          ],
          link: '/conduit/examples',
          text: 'Examples',
        },
      ],
      '/courier/': [
        { link: '/courier/', text: 'Overview' },
        {
          items: [
            { link: '/courier/usage#unified-client', text: 'Unified Client' },
            { link: '/courier/usage#http-client', text: 'HTTP Client' },
            { link: '/courier/usage#interceptors', text: 'Interceptors' },
            { link: '/courier/usage#query-client', text: 'Query Client' },
            { link: '/courier/usage#mutation', text: 'Mutations' },
            { link: '/courier/usage#server-sent-events', text: 'Server-Sent Events' },
            { link: '/courier/usage#http-streaming', text: 'HTTP Streaming' },
            { link: '/courier/usage#framework-store-integration', text: 'Framework Integration' },
            { link: '/courier/usage#error-handling', text: 'Error Handling' },
          ],
          link: '/courier/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/courier/api#createfetchit', text: 'createCourier()' },
            { link: '/courier/api#createapi', text: 'createApi()' },
            { link: '/courier/api#createquery', text: 'createQuery()' },
            { link: '/courier/api#createmutation', text: 'createMutation()' },
            { link: '/courier/api#createstream', text: 'createStream()' },
            { link: '/courier/api#httperror', text: 'HttpError' },
          ],
          link: '/courier/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/courier/examples/ai-token-stream', text: 'AI Token Stream' },
            { link: '/courier/examples/authentication', text: 'Authentication' },
            { link: '/courier/examples/crud-operations', text: 'CRUD Operations' },
            { link: '/courier/examples/disposal', text: 'Disposal' },
            { link: '/courier/examples/error-handling-patterns', text: 'Error Handling Patterns' },
            { link: '/courier/examples/file-uploads', text: 'File Uploads' },
            { link: '/courier/examples/mutation-cancel', text: 'Mutation Cancellation' },
            { link: '/courier/examples/optimistic-updates', text: 'Optimistic Updates' },
            { link: '/courier/examples/polling', text: 'Polling' },
            { link: '/courier/examples/query-callbacks', text: 'Query Subscriptions' },
            { link: '/courier/examples/sse-events', text: 'SSE Events' },
          ],
          link: '/courier/examples',
          text: 'Examples',
        },
      ],
      '/craft/': [
        { link: '/craft/', text: 'Overview' },
        {
          collapsed: false,
          items: [
            { link: '/craft/usage#define-and-component-structure', text: 'define()' },
            { link: '/craft/usage#signals-and-effects', text: 'Signals' },
            { link: '/craft/usage#onmounted-and-lifecycle', text: 'Lifecycle' },
            { link: '/craft/usage#prop-definitions', text: 'Props' },
            { link: '/craft/usage#template-bindings', text: 'Templates' },
            { link: '/craft/usage#directives', text: 'Directives' },
            { link: '/craft/usage#host-bindings', text: 'Host Bindings' },
            { link: '/craft/usage#slots-and-emits', text: 'Slots & Emits' },
            { link: '/craft/usage#context-provideinject', text: 'Context / DI' },
            { link: '/craft/usage#form-associated-elements', text: 'Forms' },
            { link: '/craft/usage#platform-observers', text: 'Observers' },
            { link: '/craft/usage#suspend', text: 'Suspend' },
            { link: '/craft/usage#testing-utilities', text: 'Testing' },
            { link: '/craft/usage#framework-integration', text: 'Framework Integration' },
            { link: '/craft/usage#working-with-other-vielzeug-libraries', text: 'Vielzeug Integration' },
            { link: '/craft/usage#best-practices', text: 'Best Practices' },
          ],
          link: '/craft/usage',
          text: 'Usage Guide',
        },
        {
          collapsed: true,
          items: [
            {
              link: '/craft/lifecycle-best-practices#prefer-setup-scope-reactivity',
              text: 'Setup-Scope Reactivity',
            },
            {
              link: '/craft/lifecycle-best-practices#run-dom-initialization-with-onmounted',
              text: 'Deferred Initialization',
            },
            {
              link: '/craft/lifecycle-best-practices#use-onelement-for-ref-driven-effects',
              text: 'Ref-Driven Effects',
            },
            { link: '/craft/lifecycle-best-practices#keep-host-wiring-explicit', text: 'Host Wiring' },
            {
              link: '/craft/lifecycle-best-practices#pick-the-right-cleanup-primitive',
              text: 'Cleanup Patterns',
            },
          ],
          link: '/craft/lifecycle-best-practices',
          text: 'Lifecycle Best Practices',
        },
        {
          collapsed: true,
          items: [
            { link: '/craft/api#package-entry-points', text: 'Entry Points' },
            { link: '/craft/api#core-component-api', text: 'Core API' },
            { link: '/craft/api#runtime-helpers', text: 'Runtime' },
            { link: '/craft/api#props-api', text: 'Props' },
            { link: '/craft/api#template-and-directives', text: 'Templates & Directives' },
            { link: '/craft/api#host-bindings', text: 'Host Bindings' },
            { link: '/craft/api#slots', text: 'Slots' },
            { link: '/craft/api#context-api', text: 'Context' },
            { link: '/craft/api#form-associated-api', text: 'Forms' },
            { link: '/craft/api#observer-apis', text: 'Observers' },
            { link: '/craft/api#testing-apis', text: 'Testing' },
            { link: '/craft/api#ripple-re-exports', text: 'Ripple Re-exports' },
            { link: '/craft/api#lifecycle-events', text: 'Lifecycle Events' },
            { link: '/craft/api#types', text: 'Types' },
            { link: '/craft/api#errors', text: 'Errors' },
          ],
          link: '/craft/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/craft/examples/propsof-builder-api', text: 'Prop Helpers and Raw PropDef' },
            { link: '/craft/examples/context-provider-and-consumer', text: 'Context Provider and Consumer' },
            { link: '/craft/examples/counter-component', text: 'Counter Component' },
            { link: '/craft/examples/form-associated-rating-input', text: 'Form-Associated Rating Input' },
            { link: '/craft/examples/observers-in-onmount', text: 'Observers in onMounted()' },
            { link: '/craft/examples/search-list-with-directives', text: 'Search List with Directives' },
            {
              link: '/craft/examples/test-example-at-vielzeug-craft-testing',
              text: 'Testing with /craft/testing',
            },
            { link: '/craft/examples/typed-props-and-emits', text: 'Typed Props and Emits' },
          ],
          link: '/craft/examples',
          text: 'Examples',
        },
      ],
      '/familiar/': [
        { link: '/familiar/', text: 'Overview' },
        {
          items: [
            { link: '/familiar/usage#task-functions', text: 'Task Functions' },
            { link: '/familiar/usage#single-worker', text: 'Single Worker' },
            { link: '/familiar/usage#worker-pool', text: 'Worker Pool' },
            { link: '/familiar/usage#timeouts', text: 'Timeouts' },
            { link: '/familiar/usage#abortsignal', text: 'AbortSignal' },
            { link: '/familiar/usage#transferables', text: 'Transferables' },
            { link: '/familiar/usage#worker-status', text: 'Worker Status' },
            { link: '/familiar/usage#isnative', text: 'isNative' },
            { link: '/familiar/usage#fallback-mode', text: 'Fallback Mode' },
            { link: '/familiar/usage#external-scripts', text: 'External Scripts' },
            { link: '/familiar/usage#testing', text: 'Testing' },
          ],
          link: '/familiar/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/familiar/api#package-exports', text: 'Package Exports' },
            { link: '/familiar/api#types', text: 'Types' },
            { link: '/familiar/api#createworker', text: 'createWorker()' },
            { link: '/familiar/api#workerhandle-interface', text: 'WorkerHandle Interface' },
            { link: '/familiar/api#error-classes', text: 'Error Classes' },
            { link: '/familiar/api#testing-utilities', text: 'Testing Utilities' },
          ],
          link: '/familiar/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/familiar/examples/cancellable-batch', text: 'Cancellable Batch' },
            { link: '/familiar/examples/data-transformation-pipeline', text: 'Data Pipeline' },
            { link: '/familiar/examples/fibonacci-with-pool-and-timeout', text: 'Fibonacci Pool' },
            { link: '/familiar/examples/image-processing', text: 'Image Processing' },
            { link: '/familiar/examples/react-integration', text: 'React Integration' },
            { link: '/familiar/examples/testing-with-createtestworker', text: 'Testing' },
            { link: '/familiar/examples/using-transferables', text: 'Using Transferables' },
          ],
          link: '/familiar/examples',
          text: 'Examples',
        },
      ],
      '/forge/': [
        { link: '/forge/', text: 'Overview' },
        {
          items: [
            { link: '/forge/usage#basic-usage', text: 'Basic Usage' },
            { link: '/forge/usage#typed-paths', text: 'Typed Paths' },
            { link: '/forge/usage#validation', text: 'Validation' },
            { link: '/forge/usage#submission', text: 'Submission' },
            { link: '/forge/usage#subscriptions-and-watch', text: 'Subscriptions and Watch' },
            { link: '/forge/usage#bind', text: 'Bind' },
            { link: '/forge/usage#reset-replace-and-remove', text: 'Reset, Replace, and Remove' },
            { link: '/forge/usage#arrays-and-files', text: 'Arrays and Files' },
            { link: '/forge/usage#best-practices', text: 'Best Practices' },
          ],
          link: '/forge/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/forge/api#api-at-a-glance', text: 'At a Glance' },
            { link: '/forge/api#package-entry-point', text: 'Entry Point' },
            { link: '/forge/api#createform', text: 'createForm()' },
            { link: '/forge/api#values', text: 'Values' },
            { link: '/forge/api#field-state', text: 'Field State' },
            { link: '/forge/api#error-management', text: 'Error Management' },
            { link: '/forge/api#touch', text: 'Touch' },
            { link: '/forge/api#validation', text: 'Validation' },
            { link: '/forge/api#validation-mode', text: 'Validation Mode' },
            { link: '/forge/api#submit', text: 'Submit' },
            { link: '/forge/api#subscriptions', text: 'Subscriptions' },
            { link: '/forge/api#watch', text: 'Watch' },
            { link: '/forge/api#bind', text: 'Bind' },
            { link: '/forge/api#arrays', text: 'Arrays' },
            { link: '/forge/api#reset-and-replace', text: 'Reset and Replace' },
            { link: '/forge/api#lifecycle', text: 'Lifecycle' },
            { link: '/forge/api#standalone-utilities', text: 'Standalone Utilities' },
            { link: '/forge/api#error-classes', text: 'Error Classes' },
            { link: '/forge/api#exported-types', text: 'Exported Types' },
          ],
          link: '/forge/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/forge/examples/contact-form-with-file-upload', text: 'Contact Form with File Upload' },
            { link: '/forge/examples/dynamic-form-fields', text: 'Dynamic Form Fields' },
            { link: '/forge/examples/form-with-conditional-fields', text: 'Form with Conditional Fields' },
            { link: '/forge/examples/login-form', text: 'Login Form' },
            { link: '/forge/examples/multi-step-wizard', text: 'Multi-Step Wizard' },
            { link: '/forge/examples/registration-form', text: 'Registration Form' },
            { link: '/forge/examples/search-form-with-debounce', text: 'Search Form with Debounce' },
          ],
          link: '/forge/examples',
          text: 'Examples',
        },
      ],
      '/grip/': [
        { link: '/grip/', text: 'Overview' },
        {
          items: [
            { link: '/grip/usage#drop-zone', text: 'Drop Zone' },
            { link: '/grip/usage#accept-filtering', text: 'Accept Filtering' },
            { link: '/grip/usage#hover-state', text: 'Hover State' },
            { link: '/grip/usage#drop-effect', text: 'dropEffect' },
            { link: '/grip/usage#disabled-state', text: 'Disabled State' },
            { link: '/grip/usage#sortable', text: 'Sortable' },
            { link: '/grip/usage#drag-handles', text: 'Drag Handles' },
            { link: '/grip/usage#dynamic-lists', text: 'Dynamic Lists' },
            { link: '/grip/usage#placeholder-styling', text: 'Styling' },
            { link: '/grip/usage#cleanup', text: 'Cleanup' },
          ],
          link: '/grip/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/grip/api#types', text: 'Types' },
            { link: '/grip/api#createdropzone', text: 'createDropZone()' },
            { link: '/grip/api#dropzone-interface', text: 'DropZone Interface' },
            { link: '/grip/api#createsortable', text: 'createSortable()' },
            { link: '/grip/api#createsortablescope', text: 'createSortableScope()' },
            { link: '/grip/api#sortable-interface', text: 'Sortable Interface' },
            { link: '/grip/api#dom-attributes', text: 'DOM Attributes' },
            { link: '/grip/api#applyreorder', text: 'applyReorder()' },
          ],
          link: '/grip/api',
          text: 'API Reference',
        },
        {
          items: [
            {
              link: '/grip/examples/combined-sortable-with-inline-editing',
              text: 'Combined: sortable with inline editing',
            },
            {
              link: '/grip/examples/connected-kanban-keyboard-sorting',
              text: 'Connected kanban with keyboard sorting',
            },
            { link: '/grip/examples/file-upload-drop-zone', text: 'File upload drop zone' },
            { link: '/grip/examples/sortable-list', text: 'Sortable list' },
            { link: '/grip/examples/using-using-for-scoped-cleanup', text: 'Using `using` for scoped cleanup' },
            { link: '/grip/examples/web-component-with-craft', text: 'Web Component with craft' },
          ],
          link: '/grip/examples',
          text: 'Examples',
        },
      ],
      '/guide/': [{ link: '/guide/', text: 'Getting Started' }],
      '/herald/': [
        { link: '/herald/', text: 'Overview' },
        {
          items: [
            { link: '/herald/usage#event-maps', text: 'Event Maps' },
            { link: '/herald/usage#subscribing', text: 'Subscribing' },
            { link: '/herald/usage#emitting-events', text: 'Emitting Events' },
            { link: '/herald/usage#awaiting-events', text: 'Awaiting Events' },
            { link: '/herald/usage#async-iteration', text: 'Async Iteration' },
            { link: '/herald/usage#error-handling', text: 'Error Handling' },
            { link: '/herald/usage#dispose--cleanup', text: 'Dispose & Cleanup' },
            { link: '/herald/usage#event-piping', text: 'Event Piping' },
            { link: '/herald/usage#debug-mode', text: 'Debug Mode' },
            { link: '/herald/usage#testing', text: 'Testing' },
          ],
          link: '/herald/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/herald/api#package-entry-points', text: 'Package Entry Points' },
            { link: '/herald/api#types', text: 'Types' },
            { link: '/herald/api#createbus', text: 'createBus()' },
            { link: '/herald/api#pipeevents', text: 'pipeEvents()' },
            { link: '/herald/api#bus-interface', text: 'Bus Interface' },
            { link: '/herald/api#busdisposalsignal', text: 'disposalSignal' },
            { link: '/herald/api#testing-utilities', text: 'Testing Utilities' },
            { link: '/herald/api#createtestbus', text: 'createTestBus()' },
            { link: '/herald/api#errors', text: 'Errors' },
          ],
          link: '/herald/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/herald/examples/awaiting-a-one-time-event', text: 'Awaiting a one-time event' },
            { link: '/herald/examples/bus-bridging-with-pipeevents', text: 'Bus bridging with pipeEvents()' },
            { link: '/herald/examples/custom-error-boundary', text: 'Custom error boundary' },
            { link: '/herald/examples/handling-disposal-in-async-code', text: 'Handling disposal in async code' },
            { link: '/herald/examples/inspecting-listener-counts', text: 'Inspecting listener counts' },
            { link: '/herald/examples/module-level-bus', text: 'Module-level bus' },
            { link: '/herald/examples/request-scoping', text: 'Request scoping' },
            { link: '/herald/examples/standalone-entry', text: 'Standalone entry' },
            { link: '/herald/examples/streaming-with-events', text: 'Streaming with `events()`' },
            { link: '/herald/examples/testing-with-createtestbus', text: 'Testing with `createTestBus`' },
          ],
          link: '/herald/examples',
          text: 'Examples',
        },
      ],
      '/lingua/': [
        { link: '/lingua/', text: 'Overview' },
        {
          items: [
            { link: '/lingua/usage#basic-usage', text: 'Basic Usage' },
            { link: '/lingua/usage#translate', text: 'Translate' },
            { link: '/lingua/usage#scoped-helpers', text: 'Scoped Helpers' },
            { link: '/lingua/usage#locale-lifecycle', text: 'Locale Lifecycle' },
            { link: '/lingua/usage#partial-catalog-merging', text: 'Partial Merge' },
            { link: '/lingua/usage#formatting', text: 'Formatting' },
            { link: '/lingua/usage#namespace-based-lazy-loading', text: 'Namespaces' },
            { link: '/lingua/usage#validating-catalogs', text: 'Validation' },
            { link: '/lingua/usage#bound-translation-functions', text: 'Bound Functions' },
            { link: '/lingua/usage#forking-for-ssr-and-testing', text: 'Forking (SSR)' },
            { link: '/lingua/usage#missing-handling', text: 'Missing Handling' },
            { link: '/lingua/usage#framework-integration', text: 'Framework Integration' },
            { link: '/lingua/usage#ssr-hydration', text: 'SSR Hydration' },
            { link: '/lingua/usage#template-pre-compilation', text: 'Pre-compilation' },
            { link: '/lingua/usage#best-practices', text: 'Best Practices' },
          ],
          link: '/lingua/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/lingua/api#api-at-a-glance', text: 'At a Glance' },
            { link: '/lingua/api#package-entry-points', text: 'Entry Points' },
            { link: '/lingua/api#createi18n', text: 'createI18n()' },
            { link: '/lingua/api#i18n-interface', text: 'I18n Interface' },
            { link: '/lingua/api#validatecatalog', text: 'validateCatalog()' },
            { link: '/lingua/api#createformatter', text: 'createFormatter()' },
            { link: '/lingua/api#types', text: 'Types' },
            { link: '/lingua/api#errors', text: 'Errors' },
          ],
          link: '/lingua/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/lingua/examples/shared-instance-setup', text: 'Shared Instance Setup' },
            { link: '/lingua/examples/locale-switcher', text: 'Locale Switcher' },
            { link: '/lingua/examples/prefixed-translation-helper', text: 'Prefixed Translation Helper' },
            { link: '/lingua/examples/async-loading-and-reload', text: 'Async Loading and Reload' },
            { link: '/lingua/examples/route-based-merge', text: 'Route-based Merge' },
            { link: '/lingua/examples/catalog-replacement', text: 'Catalog Replacement' },
            { link: '/lingua/examples/diagnostics-hook', text: 'Diagnostics Hook' },
            { link: '/lingua/examples/per-request-locale-handling', text: 'Per-request Locale Handling' },
            { link: '/lingua/examples/ssr-rendering', text: 'SSR Rendering' },
          ],
          link: '/lingua/examples',
          text: 'Examples',
        },
      ],
      '/orbit/': [
        { link: '/orbit/', text: 'Overview' },
        {
          items: [
            { link: '/orbit/usage#positioning-apis', text: 'Positioning APIs' },
            { link: '/orbit/usage#float', text: 'float' },
            { link: '/orbit/usage#computeposition', text: 'computePosition' },
            { link: '/orbit/usage#middleware-model', text: 'Middleware Model' },
            { link: '/orbit/usage#built-in-middleware', text: 'Built-in Middleware' },
            { link: '/orbit/usage#middleware-order', text: 'Middleware Order' },
            { link: '/orbit/usage#virtual-references', text: 'Virtual References' },
            { link: '/orbit/usage#autoupdate', text: 'autoUpdate' },
          ],
          link: '/orbit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/orbit/api#core-functions', text: 'Core Functions' },
            { link: '/orbit/api#middlewares', text: 'Middlewares' },
            { link: '/orbit/api#types', text: 'Types' },
          ],
          link: '/orbit/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/orbit/examples/context-menu', text: 'Context Menu' },
            { link: '/orbit/examples/custom-middleware', text: 'Custom Middleware' },
            { link: '/orbit/examples/dropdown-select', text: 'Dropdown / Select' },
            { link: '/orbit/examples/popover-with-arrow', text: 'Popover with Arrow' },
            { link: '/orbit/examples/tooltip', text: 'Tooltip' },
            { link: '/orbit/examples/with-craft-component', text: 'With Craft Component' },
          ],
          link: '/orbit/examples',
          text: 'Examples',
        },
      ],
      '/ripple/': [
        { link: '/ripple/', text: 'Overview' },
        {
          items: [
            { link: '/ripple/usage#signals', text: 'Signals' },
            { link: '/ripple/usage#effects', text: 'Effects' },
            { link: '/ripple/usage#computed', text: 'Computed' },
            { link: '/ripple/usage#derived', text: 'derived' },
            { link: '/ripple/usage#writable', text: 'writable' },
            { link: '/ripple/usage#watch-signals', text: 'watch' },
            { link: '/ripple/usage#batch-signals', text: 'batch' },
            { link: '/ripple/usage#stores', text: 'Stores' },
            { link: '/ripple/usage#derived-slices', text: 'Derived Slices' },
            { link: '/ripple/usage#watching-state', text: 'Watching State' },
            { link: '/ripple/usage#batching', text: 'Batching' },
            { link: '/ripple/usage#global-configuration', text: 'Configuration' },
            { link: '/ripple/usage#testing', text: 'Testing' },
          ],
          link: '/ripple/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/ripple/api#signal-primitives', text: 'Signal Primitives' },
            { link: '/ripple/api#store-functions', text: 'Store Functions' },
            { link: '/ripple/api#signal-types', text: 'Signal Types' },
            { link: '/ripple/api#store-types', text: 'Store Types' },
            { link: '/ripple/api#notification-timing', text: 'Notification Timing' },
            { link: '/ripple/api#testing-utilities', text: 'Testing Utilities' },
          ],
          link: '/ripple/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/ripple/examples/signals', text: 'Signals' },
            { link: '/ripple/examples/stores', text: 'Stores' },
            {
              link: '/ripple/examples/pattern-batch-for-complex-mutations',
              text: 'Pattern: Batch for Complex Mutations',
            },
            {
              link: '/ripple/examples/pattern-nextvalue-in-async-workflows',
              text: 'Pattern: `nextValue` in Async Workflows',
            },
            { link: '/ripple/examples/pattern-shared-module-store', text: 'Pattern: Shared Module Store' },
          ],
          link: '/ripple/examples',
          text: 'Examples',
        },
      ],
      '/rune/': [
        { link: '/rune/', text: 'Overview' },
        {
          items: [
            { link: '/rune/usage#logger-instances', text: 'Logger Instances' },
            { link: '/rune/usage#configuration', text: 'Configuration' },
            { link: '/rune/usage#logging-methods', text: 'Logging Methods' },
            { link: '/rune/usage#scoped-loggers', text: 'Scoped Loggers' },
            { link: '/rune/usage#child-loggers', text: 'Child Loggers' },
            { link: '/rune/usage#remote-logging', text: 'Remote Logging' },
            { link: '/rune/usage#best-practices', text: 'Best Practices' },
            { link: '/rune/usage#testing', text: 'Testing' },
          ],
          link: '/rune/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/rune/api#createloggerinitial', text: 'createLogger()' },
            { link: '/rune/api#rune-object', text: 'Rune Object' },
            { link: '/rune/api#types', text: 'Types' },
          ],
          link: '/rune/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/rune/examples/child-logger-overrides', text: 'Child Logger Overrides' },
            { link: '/rune/examples/module-logger-pattern', text: 'Module Logger Pattern' },
            { link: '/rune/examples/production-setup', text: 'Production Setup' },
            { link: '/rune/examples/react-integration', text: 'React Integration' },
            { link: '/rune/examples/request-middleware', text: 'Request Middleware' },
            { link: '/rune/examples/testing', text: 'Testing' },
            { link: '/rune/examples/timing-and-grouping', text: 'Timing and Grouping' },
          ],
          link: '/rune/examples',
          text: 'Examples',
        },
      ],
      '/scroll/': [
        { link: '/scroll/', text: 'Overview' },
        {
          items: [
            { link: '/scroll/usage#dom-layout-requirements', text: 'DOM Layout' },
            { link: '/scroll/usage#fixed-heights', text: 'Fixed Heights' },
            { link: '/scroll/usage#variable-heights-estimator', text: 'Variable Heights (Estimator)' },
            { link: '/scroll/usage#variable-heights-measured', text: 'Variable Heights' },
            { link: '/scroll/usage#overscan', text: 'Overscan' },
            { link: '/scroll/usage#updating-the-count', text: 'Updating Count' },
            { link: '/scroll/usage#switching-row-density', text: 'Row Density' },
            { link: '/scroll/usage#programmatic-scrolling', text: 'Programmatic Scrolling' },
            { link: '/scroll/usage#invalidating-measurements', text: 'Invalidating Measurements' },
            { link: '/scroll/usage#lifecycle-attach-and-destroy', text: 'Lifecycle' },
            { link: '/scroll/usage#explicit-resource-management', text: 'Resource Management' },
            { link: '/scroll/usage#framework-integration', text: 'Framework Integration' },
          ],
          link: '/scroll/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/scroll/api#package-exports', text: 'Package Exports' },
            { link: '/scroll/api#core-functions', text: 'Core Functions' },
            { link: '/scroll/api#virtualizer-class', text: 'Virtualizer Class' },
            { link: '/scroll/api#properties', text: 'Properties' },
            { link: '/scroll/api#methods', text: 'Methods' },
            { link: '/scroll/api#types', text: 'Types' },
          ],
          link: '/scroll/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/scroll/examples/basic-fixed-height-list', text: 'Basic Fixed-Height List' },
            {
              link: '/scroll/examples/density-toggle-compact-comfortable',
              text: 'Density Toggle (Compact / Comfortable)',
            },
            {
              link: '/scroll/examples/explicit-resource-management-using',
              text: 'Explicit Resource Management (`using`)',
            },
            { link: '/scroll/examples/grouped-list-headers-plus-rows', text: 'Grouped List (Headers + Rows)' },
            { link: '/scroll/examples/infinite-scroll-load-more', text: 'Infinite Scroll (Load More)' },
            { link: '/scroll/examples/keyboard-navigation', text: 'Keyboard Navigation' },
            { link: '/scroll/examples/restore-scroll-position', text: 'Restore Scroll Position' },
            {
              link: '/scroll/examples/using-virtualizer-directly-without-createvirtualizer',
              text: 'Using `Virtualizer` Directly (Without `createVirtualizer`)',
            },
            { link: '/scroll/examples/variable-height-with-measurement', text: 'Variable Height with Measurement' },
          ],
          link: '/scroll/examples',
          text: 'Examples',
        },
      ],
      '/sigil/': [
        { link: '/sigil/', text: 'Overview' },
        {
          items: [
            {
              collapsed: true,
              items: [
                { link: '/sigil/usage#basic-usage', text: 'Basic Usage' },
                { link: '/sigil/usage#slots', text: 'Slots' },
                { link: '/sigil/usage#accessibility', text: 'Accessibility' },
              ],
              link: '/sigil/usage',
              text: 'Usage Guide',
            },
            {
              collapsed: true,
              items: [
                { link: '/sigil/frameworks#react', text: 'React' },
                { link: '/sigil/frameworks#vue-3', text: 'Vue 3' },
                { link: '/sigil/frameworks#svelte', text: 'Svelte' },
                { link: '/sigil/frameworks#angular', text: 'Angular' },
                { link: '/sigil/frameworks#ssr-considerations', text: 'SSR' },
              ],
              link: '/sigil/frameworks',
              text: 'Framework Integration',
            },
            {
              collapsed: true,
              items: [
                { link: '/sigil/theming#design-tokens', text: 'Design Tokens' },
                { link: '/sigil/theming#dark-mode', text: 'Dark Mode' },
                { link: '/sigil/theming#global-customization', text: 'Global Customization' },
                { link: '/sigil/theming#component-customization', text: 'Component Customization' },
              ],
              link: '/sigil/theming',
              text: 'Theming',
            },
          ],
          text: 'Getting Started',
        },
        {
          items: [
            {
              collapsed: true,
              items: [
                { link: '/sigil/components/accordion', text: 'Accordion' },
                { link: '/sigil/components/tabs', text: 'Tabs' },
              ],
              text: 'Disclosure',
            },
            {
              collapsed: true,
              items: [
                { link: '/sigil/components/alert', text: 'Alert' },
                { link: '/sigil/components/async', text: 'Async' },
                { link: '/sigil/components/badge', text: 'Badge' },
                { link: '/sigil/components/chip', text: 'Chip' },
                { link: '/sigil/components/password-strength', text: 'Password Strength' },
                { link: '/sigil/components/progress', text: 'Progress' },
                { link: '/sigil/components/skeleton', text: 'Skeleton' },
                { link: '/sigil/components/toast', text: 'Toast' },
              ],
              text: 'Feedback',
            },
            {
              collapsed: true,
              items: [
                { link: '/sigil/components/avatar', text: 'Avatar' },
                { link: '/sigil/components/breadcrumb', text: 'Breadcrumb' },
                { link: '/sigil/components/card', text: 'Card' },
                { link: '/sigil/components/icon', text: 'Icon' },
                { link: '/sigil/components/pagination', text: 'Pagination' },
                { link: '/sigil/components/separator', text: 'Separator' },
                { link: '/sigil/components/table', text: 'Table' },
                { link: '/sigil/components/text', text: 'Text' },
              ],
              text: 'Content',
            },
            {
              collapsed: true,
              items: [
                { link: '/sigil/components/dialog', text: 'Dialog' },
                { link: '/sigil/components/drawer', text: 'Drawer' },
                { link: '/sigil/components/menu', text: 'Menu' },
                { link: '/sigil/components/popover', text: 'Popover' },
                { link: '/sigil/components/tooltip', text: 'Tooltip' },
              ],
              text: 'Overlay',
            },
            {
              collapsed: true,
              items: [
                { link: '/sigil/components/button', text: 'Button' },
                { link: '/sigil/components/checkbox', text: 'Checkbox' },
                { link: '/sigil/components/combobox', text: 'Combobox' },
                { link: '/sigil/components/file-input', text: 'File Input' },
                { link: '/sigil/components/form', text: 'Form' },
                { link: '/sigil/components/input', text: 'Input' },
                { link: '/sigil/components/number-input', text: 'Number Input' },
                { link: '/sigil/components/otp-input', text: 'OTP Input' },
                { link: '/sigil/components/radio', text: 'Radio' },
                { link: '/sigil/components/rating', text: 'Rating' },
                { link: '/sigil/components/select', text: 'Select' },
                { link: '/sigil/components/slider', text: 'Slider' },
                { link: '/sigil/components/switch', text: 'Switch' },
                { link: '/sigil/components/textarea', text: 'Textarea' },
              ],
              text: 'Inputs',
            },
            {
              collapsed: true,
              items: [
                { link: '/sigil/components/box', text: 'Box' },
                { link: '/sigil/components/grid', text: 'Grid' },
                { link: '/sigil/components/navbar', text: 'Navbar' },
                { link: '/sigil/components/sidebar', text: 'Sidebar' },
              ],
              text: 'Layout',
            },
          ],
          text: 'Components',
        },
        {
          items: [
            { link: '/sigil/api', text: 'API Reference' },
            { link: '/sigil/testing', text: 'Testing Utilities' },
            { link: '/sigil/accessibility', text: 'Accessibility' },
            {
              items: [
                { link: '/sigil/examples/common-patterns', text: 'Common Patterns' },
                { link: '/sigil/examples/guideline-oriented-recipes', text: 'Guideline-Oriented Recipes' },
                { link: '/sigil/examples/settings-panel-with-switches', text: 'Settings Panel with Switches' },
              ],
              link: '/sigil/examples',
              text: 'Examples',
            },
          ],
          text: 'Reference',
        },
      ],
      '/sourcerer/': [
        { link: '/sourcerer/', text: 'Overview' },
        {
          items: [
            { link: '/sourcerer/usage#local-source', text: 'Local Source' },
            { link: '/sourcerer/usage#remote-source', text: 'Remote Source' },
            { link: '/sourcerer/usage#cursor-source', text: 'Cursor Source' },
            { link: '/sourcerer/usage#infinite-source', text: 'Infinite Source' },
            { link: '/sourcerer/usage#read-model', text: 'Read Model' },
            { link: '/sourcerer/usage#url-query-param-sync', text: 'Query Param Sync' },
            { link: '/sourcerer/usage#framework-integration', text: 'Framework Integration' },
            { link: '/sourcerer/usage#working-with-other-vielzeug-libraries', text: 'With Other Libraries' },
            { link: '/sourcerer/usage#best-practices', text: 'Best Practices' },
          ],
          link: '/sourcerer/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/sourcerer/api#api-at-a-glance', text: 'API At a Glance' },
            { link: '/sourcerer/api#core-factories', text: 'Core Factories' },
            { link: '/sourcerer/api#localsourcet-methods', text: 'LocalSource Methods' },
            { link: '/sourcerer/api#remotesourcet-tfilter-tsort-methods', text: 'RemoteSource Methods' },
            { link: '/sourcerer/api#cursorsourcet-methods', text: 'CursorSource Methods' },
            { link: '/sourcerer/api#infinitesourcet-methods', text: 'InfiniteSource Methods' },
            { link: '/sourcerer/api#signal-adapters', text: 'Signal Adapters' },
            { link: '/sourcerer/api#codec-utilities', text: 'Codec Utilities' },
            { link: '/sourcerer/api#types', text: 'Types' },
          ],
          link: '/sourcerer/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/sourcerer/examples/local-pagination-and-filtering', text: 'Local Pagination and Filtering' },
            { link: '/sourcerer/examples/remote-search-with-url-state', text: 'Remote Search with URL State' },
            { link: '/sourcerer/examples/sourcerer-with-ripple', text: 'Reactive Controls with Ripple' },
            { link: '/sourcerer/examples/sourcerer-with-courier', text: 'Remote Data with Courier' },
            { link: '/sourcerer/examples/sourcerer-with-wayfinder', text: 'URL-Synced List with Wayfinder' },
          ],
          link: '/sourcerer/examples',
          text: 'Examples',
        },
      ],
      '/spell/': [
        { link: '/spell/', text: 'Overview' },
        {
          items: [
            { link: '/spell/usage#basic-usage', text: 'Basic Usage' },
            { link: '/spell/usage#building-schemas', text: 'Building Schemas' },
            { link: '/spell/usage#wrapper-modes-defaults-and-fallbacks', text: 'Wrappers, Defaults & Fallbacks' },
            { link: '/spell/usage#refinements-and-async-checks', text: 'Refinements & Async Checks' },
            { link: '/spell/usage#strings-numbers-and-safe-regex-usage', text: 'Strings, Numbers & Regex' },
            { link: '/spell/usage#coercion-and-transforms', text: 'Coercion & Transforms' },
            { link: '/spell/usage#introspection-round-trips-and-json-schema', text: 'Introspection & JSON Schema' },
            { link: '/spell/usage#messages-and-locales', text: 'Messages & Locales' },
            { link: '/spell/usage#working-with-validation-errors', text: 'Validation Errors' },
            { link: '/spell/usage#framework-integration', text: 'Framework Integration' },
            { link: '/spell/usage#best-practices', text: 'Best Practices' },
          ],
          link: '/spell/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/spell/api#api-at-a-glance', text: 'At a Glance' },
            { link: '/spell/api#export-inventory', text: 'Export Inventory' },
            { link: '/spell/api#factories-and-namespace', text: 'Factories & Namespace' },
            { link: '/spell/api#core-classes', text: 'Core Classes' },
            { link: '/spell/api#descriptor-locale-and-helper-functions', text: 'Descriptor, Locale & Helpers' },
            { link: '/spell/api#standalone-validators', text: 'Standalone Validators' },
            { link: '/spell/api#types', text: 'Types' },
            { link: '/spell/api#errors', text: 'Errors' },
          ],
          link: '/spell/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/spell/examples/api', text: 'Validating API Payloads' },
            { link: '/spell/examples/forms', text: 'Form-Safe Parsing' },
            { link: '/spell/examples/async', text: 'Async Business Rules' },
            { link: '/spell/examples/introspection', text: 'Schema Introspection & Round-Trips' },
            { link: '/spell/examples/unions', text: 'Unions, Intersections & Variants' },
          ],
          link: '/spell/examples',
          text: 'Examples',
        },
      ],
      '/tempo/': [
        { link: '/tempo/', text: 'Overview' },
        {
          items: [
            { link: '/tempo/usage#parsing-inputs', text: 'Parsing Inputs' },
            { link: '/tempo/usage#time-zone-conversion', text: 'Time Zone Conversion' },
            { link: '/tempo/usage#date-time-arithmetic', text: 'Date-Time Arithmetic' },
            { link: '/tempo/usage#duration-differences', text: 'Duration Differences' },
            { link: '/tempo/usage#formatting', text: 'Formatting' },
            { link: '/tempo/usage#range-queries', text: 'Range Queries' },
            { link: '/tempo/usage#current-time', text: 'Current Time' },
            { link: '/tempo/usage#format-ranges', text: 'Format Ranges' },
            { link: '/tempo/usage#best-practices', text: 'Best Practices' },
            { link: '/tempo/usage#common-patterns', text: 'Common Patterns' },
          ],
          link: '/tempo/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/tempo/api#at-a-glance', text: 'At a Glance' },
            { link: '/tempo/api#namespace-import', text: 'Namespace Import' },
            { link: '/tempo/api#conversion-functions', text: 'Conversion' },
            { link: '/tempo/api#arithmetic-functions', text: 'Arithmetic' },
            { link: '/tempo/api#query-functions', text: 'Queries' },
            { link: '/tempo/api#formatting-functions', text: 'Formatting' },
            { link: '/tempo/api#types', text: 'Types' },
          ],
          link: '/tempo/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/tempo/examples/timezone-conversion', text: 'Timezone Conversion' },
            { link: '/tempo/examples/dst-safe-arithmetic', text: 'DST-safe Arithmetic' },
            { link: '/tempo/examples/locale-formatting', text: 'Locale Formatting' },
          ],
          link: '/tempo/examples',
          text: 'Examples',
        },
      ],
      '/vault/': [
        { link: '/vault/', text: 'Overview' },
        {
          items: [
            { link: '/vault/usage#define-a-schema', text: 'Define a Schema' },
            { link: '/vault/usage#create-an-adapter', text: 'Create an Adapter' },
            { link: '/vault/usage#basic-crud', text: 'Basic CRUD' },
            { link: '/vault/usage#use-ttl', text: 'Use TTL' },
            { link: '/vault/usage#query-data', text: 'Query Data' },
            { link: '/vault/usage#reactive-reads', text: 'Reactive Reads' },
            { link: '/vault/usage#batch-writes', text: 'Batch Writes' },
            { link: '/vault/usage#plugins', text: 'Plugins' },
            { link: '/vault/usage#framework-integration', text: 'Framework Integration' },
            { link: '/vault/usage#best-practices', text: 'Best Practices' },
          ],
          link: '/vault/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/vault/api#api-at-a-glance', text: 'At a Glance' },
            { link: '/vault/api#schema-helper', text: 'Schema Helper' },
            { link: '/vault/api#ttl-helper', text: 'TTL Helper' },
            { link: '/vault/api#factories', text: 'Factories' },
            { link: '/vault/api#indexeddbadapter', text: 'IndexedDbAdapter' },
            { link: '/vault/api#adapter-interface', text: 'Adapter Interface' },
            { link: '/vault/api#transactioncontext', text: 'TransactionContext' },
            { link: '/vault/api#querybuilder', text: 'QueryBuilder' },
            { link: '/vault/api#types', text: 'Types' },
            { link: '/vault/api#errors', text: 'Errors' },
          ],
          link: '/vault/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/vault/examples/crud', text: 'CRUD' },
            { link: '/vault/examples/querying', text: 'Querying' },
            { link: '/vault/examples/ttl', text: 'TTL and Pruning' },
            { link: '/vault/examples/reactive', text: 'Reactive Tables' },
            { link: '/vault/examples/batch', text: 'Batch Writes' },
            { link: '/vault/examples/iterate', text: 'Lazy Iteration' },
            { link: '/vault/examples/plugins', text: 'Plugins and Error Handling' },
          ],
          link: '/vault/examples',
          text: 'Examples',
        },
      ],
      '/ward/': [
        { link: '/ward/', text: 'Overview' },
        {
          items: [
            { link: '/ward/usage#create-a-ward', text: 'Create Ward' },
            { link: '/ward/usage#check-permissions', text: 'Check Permissions' },
            { link: '/ward/usage#bind-a-user-with-foruser', text: 'forUser()' },
            { link: '/ward/usage#batch-decisions-with-checkall', text: 'checkAll()' },
            { link: '/ward/usage#inspect-rule-scope-with-rulesinscope', text: 'rulesInScope()' },
            { link: '/ward/usage#use-dynamic-conditions-with-when', text: 'Dynamic Predicates' },
            { link: '/ward/usage#anonymous-and-wildcards', text: 'Anonymous & Wildcards' },
            { link: '/ward/usage#logger-and-auditing', text: 'Logger / Auditing' },
            { link: '/ward/usage#decision-precedence', text: 'Decision Precedence' },
          ],
          link: '/ward/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/ward/api#at-a-glance', text: 'At a Glance' },
            { link: '/ward/api#constants', text: 'Constants' },
            { link: '/ward/api#createward', text: 'createWard()' },
            { link: '/ward/api#ward-interface', text: 'Ward Interface' },
            { link: '/ward/api#logger-context', text: 'Logger Context' },
            { link: '/ward/api#decision-model', text: 'Decision Model' },
            { link: '/ward/api#types', text: 'Types' },
          ],
          link: '/ward/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/ward/examples/blog-roles', text: 'Blog Roles' },
            { link: '/ward/examples/bound-guard-in-ui-layer', text: 'Bound Checker in UI Layer' },
            { link: '/ward/examples/disabling-wildcard-fallback', text: 'Rule Specificity' },
            { link: '/ward/examples/inheritance-and-overrides', text: 'Priority and Overrides' },
            { link: '/ward/examples/logger-for-auditing', text: 'Logger for Auditing' },
            {
              link: '/ward/examples/snapshot-restore-for-test-isolation',
              text: 'Rule Snapshot/Replace for Test Isolation',
            },
            { link: '/ward/examples/wildcard-action', text: 'Wildcard Action' },
          ],
          link: '/ward/examples',
          text: 'Examples',
        },
      ],
      '/wayfinder/': [
        { link: '/wayfinder/', text: 'Overview' },
        {
          items: [
            { link: '/wayfinder/usage#create-a-router', text: 'Create a Router' },
            { link: '/wayfinder/usage#define-routes-once', text: 'Define Routes Once' },
            { link: '/wayfinder/usage#route-context', text: 'Route Context' },
            { link: '/wayfinder/usage#middleware', text: 'Middleware' },
            { link: '/wayfinder/usage#guards', text: 'Guards' },
            { link: '/wayfinder/usage#data-loading', text: 'Data Loading' },
            { link: '/wayfinder/usage#error-boundaries', text: 'Error Boundaries' },
            { link: '/wayfinder/usage#navigation', text: 'Navigation' },
            { link: '/wayfinder/usage#same-url-deduplication', text: 'Same-URL Deduplication' },
            { link: '/wayfinder/usage#urls-and-active-state', text: 'URLs and Active State' },
            { link: '/wayfinder/usage#resolve-without-navigating', text: 'Resolve Without Navigating' },
            { link: '/wayfinder/usage#state-and-subscriptions', text: 'State and Subscriptions' },
            { link: '/wayfinder/usage#cleanup', text: 'Cleanup' },
          ],
          link: '/wayfinder/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/wayfinder/api#createrouteroptions', text: 'createRouter()' },
            { link: '/wayfinder/api#route-table', text: 'Route Table' },
            { link: '/wayfinder/api#route-definition', text: 'Route Definition' },
            { link: '/wayfinder/api#createbrowserhistory', text: 'createBrowserHistory()' },
            { link: '/wayfinder/api#router', text: 'Router' },
            { link: '/wayfinder/api#core-types', text: 'Core Types' },
            { link: '/wayfinder/api#pattern-rules', text: 'Pattern Rules' },
            { link: '/wayfinder/api#design-notes', text: 'Design Notes' },
          ],
          link: '/wayfinder/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/wayfinder/examples/route-table-basics', text: 'Route Table Basics' },
            { link: '/wayfinder/examples/react-integration', text: 'React Integration' },
            { link: '/wayfinder/examples/vue-integration', text: 'Vue Integration' },
            { link: '/wayfinder/examples/svelte-integration', text: 'Svelte Integration' },
            { link: '/wayfinder/examples/auth-and-guards', text: 'Auth and Guards' },
            { link: '/wayfinder/examples/not-found-and-error-boundary', text: 'Not Found and Error Boundary' },
            { link: '/wayfinder/examples/base-path-deployment', text: 'Base Path Deployment' },
            { link: '/wayfinder/examples/raw-path-targets', text: 'Raw Path Targets' },
            { link: '/wayfinder/examples/same-url-deduplication', text: 'Same-URL Deduplication' },
            { link: '/wayfinder/examples/page-titles-from-meta', text: 'Page Titles from Meta' },
            { link: '/wayfinder/examples/view-transitions', text: 'View Transitions' },
          ],
          link: '/wayfinder/examples',
          text: 'Examples',
        },
      ],
    }),
    socialLinks: [{ icon: 'github', link: 'https://github.com/helmuthdu/vielzeug' }],
  },
  title: 'Vielzeug',
  vite: {
    build: {
      cssMinify: 'lightningcss',
    },
    css: {
      lightningcss: {
        targets: browserslistToTargets(browserslist('>= 0.25%')),
      },
      transformer: 'lightningcss',
    },
    resolve: {
      alias: {
        '@vielzeug/arsenal': resolve(__dirname, '../../packages/arsenal/src'),
        '@vielzeug/clockwork': resolve(__dirname, '../../packages/clockwork/src'),
        '@vielzeug/coins': resolve(__dirname, '../../packages/coins/src'),
        '@vielzeug/conduit': resolve(__dirname, '../../packages/conduit/src'),
        '@vielzeug/courier': resolve(__dirname, '../../packages/courier/src'),
        '@vielzeug/craft': resolve(__dirname, '../../packages/craft/src'),
        '@vielzeug/familiar': resolve(__dirname, '../../packages/familiar/src'),
        '@vielzeug/forge': resolve(__dirname, '../../packages/forge/src'),
        '@vielzeug/grip': resolve(__dirname, '../../packages/grip/src'),
        '@vielzeug/herald': resolve(__dirname, '../../packages/herald/src'),
        '@vielzeug/lingua': resolve(__dirname, '../../packages/lingua/src'),
        '@vielzeug/orbit': resolve(__dirname, '../../packages/orbit/src'),
        '@vielzeug/ripple': resolve(__dirname, '../../packages/ripple/src'),
        '@vielzeug/rune': resolve(__dirname, '../../packages/rune/src'),
        '@vielzeug/scroll': resolve(__dirname, '../../packages/scroll/src'),
        '@vielzeug/sigil': resolve(__dirname, '../../packages/sigil/src'),
        '@vielzeug/sourcerer': resolve(__dirname, '../../packages/sourcerer/src'),
        '@vielzeug/spell': resolve(__dirname, '../../packages/spell/src'),
        '@vielzeug/tempo': resolve(__dirname, '../../packages/tempo/src'),
        '@vielzeug/vault': resolve(__dirname, '../../packages/vault/src'),
        '@vielzeug/ward': resolve(__dirname, '../../packages/ward/src'),
        '@vielzeug/wayfinder': resolve(__dirname, '../../packages/wayfinder/src'),
      },
    },
  },
  vue: {
    template: {
      compilerOptions: {
        isCustomElement: (tag) => tag.startsWith('bit-'),
      },
    },
  },
} as UserConfig<ThemeConfig>);
