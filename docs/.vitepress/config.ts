import browserslist from 'browserslist';
import { browserslistToTargets } from 'lightningcss';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type DefaultTheme, type UserConfig } from 'vitepress';

import type { ThemeConfig } from './theme/types';

import { getPackagesData } from './theme/utils/packageData';

const __dirname = dirname(fileURLToPath(import.meta.url));

const NON_COLLAPSIBLE_PACKAGE_PATHS = new Set(['/block/']);

const isPackageSidebarPath = (path: string): boolean => /^\/[a-z]+it\/$/.test(path);

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
    '**MCP (AI agents):** `npx -y /mcp` runs the Vielzeug MCP server in standalone stdio mode with bundled data,',
    'so no monorepo checkout is required. Use `npx -y /mcp --port 3100` for Streamable HTTP with the same package discovery, docs lookup, source inspection, and Block component metadata tools.',
    '',
    '## Packages',
    '',
    ...packageLines,
    '',
    '## Integration guides',
    '',
    '- [Getting Started](/guide/): Installation and package overview',
    '- [Building a Typed Form Flow](/guide/building-a-typed-form-flow): Sieve + Forge + Courier',
    '- [State and Routing](/guide/state-and-routing): Ripple + Route',
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
              { link: '/rune/', text: 'Rune' },
              { link: '/tempo/', text: 'Tempo' },
              { link: '/toolkit/', text: 'Toolkit' },
            ],
            text: 'Core & Utilities',
          },
          {
            items: [
              { link: '/deposit/', text: 'Deposit' },
              { link: '/relay/', text: 'Relay' },
              { link: '/courier/', text: 'Courier' },
              { link: '/machine/', text: 'Machine' },
              { link: '/sourcerer/', text: 'Sourcerer' },
              { link: '/ripple/', text: 'Ripple' },
            ],
            text: 'Data & State',
          },
          {
            items: [
              { link: '/craft/', text: 'Craft' },
              { link: '/grip/', text: 'Grip' },
              { link: '/orbit/', text: 'Orbit' },
              { link: '/forge/', text: 'Forge' },
              { link: '/lingua/', text: 'lingua' },
              { link: '/sieve/', text: 'Sieve' },
              { link: '/scroll/', text: 'Scroll' },
            ],
            text: 'Frontend & Logic',
          },
          {
            items: [
              { link: '/mcp/', text: 'Mcp' },
              { link: '/permit/', text: 'Permit' },
              { link: '/route/', text: 'Route' },
              { link: '/wired/', text: 'Wired' },
              { link: '/worker/', text: 'Worker' },
            ],
            text: 'Architecture & Security',
          },
        ],
        text: 'Packages',
      },
      { link: '/block/', text: 'Components' },
      { link: '/repl', text: 'REPL' },
    ],
    packages: getPackagesData(),
    search: {
      provider: 'local',
    },
    sidebar: makePackageSidebarsCollapsible({
      '/block/': [
        { link: '/block/', text: 'Overview' },
        {
          items: [
            {
              collapsed: true,
              items: [
                { link: '/block/usage#basic-usage', text: 'Basic Usage' },
                { link: '/block/usage#slots', text: 'Slots' },
                { link: '/block/usage#accessibility', text: 'Accessibility' },
              ],
              link: '/block/usage',
              text: 'Usage Guide',
            },
            {
              collapsed: true,
              items: [
                { link: '/block/frameworks#react', text: 'React' },
                { link: '/block/frameworks#vue-3', text: 'Vue 3' },
                { link: '/block/frameworks#svelte', text: 'Svelte' },
                { link: '/block/frameworks#angular', text: 'Angular' },
                { link: '/block/frameworks#ssr-considerations', text: 'SSR' },
              ],
              link: '/block/frameworks',
              text: 'Framework Integration',
            },
            {
              collapsed: true,
              items: [
                { link: '/block/theming#design-tokens', text: 'Design Tokens' },
                { link: '/block/theming#dark-mode', text: 'Dark Mode' },
                { link: '/block/theming#global-customization', text: 'Global Customization' },
                { link: '/block/theming#component-customization', text: 'Component Customization' },
              ],
              link: '/block/theming',
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
                { link: '/block/components/accordion', text: 'Accordion' },
                { link: '/block/components/tabs', text: 'Tabs' },
              ],
              text: 'Disclosure',
            },
            {
              collapsed: true,
              items: [
                { link: '/block/components/alert', text: 'Alert' },
                { link: '/block/components/async', text: 'Async' },
                { link: '/block/components/badge', text: 'Badge' },
                { link: '/block/components/chip', text: 'Chip' },
                { link: '/block/components/password-strength', text: 'Password Strength' },
                { link: '/block/components/progress', text: 'Progress' },
                { link: '/block/components/skeleton', text: 'Skeleton' },
                { link: '/block/components/toast', text: 'Toast' },
              ],
              text: 'Feedback',
            },
            {
              collapsed: true,
              items: [
                { link: '/block/components/avatar', text: 'Avatar' },
                { link: '/block/components/breadcrumb', text: 'Breadcrumb' },
                { link: '/block/components/card', text: 'Card' },
                { link: '/block/components/icon', text: 'Icon' },
                { link: '/block/components/pagination', text: 'Pagination' },
                { link: '/block/components/separator', text: 'Separator' },
                { link: '/block/components/table', text: 'Table' },
                { link: '/block/components/text', text: 'Text' },
              ],
              text: 'Content',
            },
            {
              collapsed: true,
              items: [
                { link: '/block/components/dialog', text: 'Dialog' },
                { link: '/block/components/drawer', text: 'Drawer' },
                { link: '/block/components/menu', text: 'Menu' },
                { link: '/block/components/popover', text: 'Popover' },
                { link: '/block/components/tooltip', text: 'Tooltip' },
              ],
              text: 'Overlay',
            },
            {
              collapsed: true,
              items: [
                { link: '/block/components/button', text: 'Button' },
                { link: '/block/components/checkbox', text: 'Checkbox' },
                { link: '/block/components/combobox', text: 'Combobox' },
                { link: '/block/components/file-input', text: 'File Input' },
                { link: '/block/components/form', text: 'Form' },
                { link: '/block/components/input', text: 'Input' },
                { link: '/block/components/number-input', text: 'Number Input' },
                { link: '/block/components/otp-input', text: 'OTP Input' },
                { link: '/block/components/radio', text: 'Radio' },
                { link: '/block/components/rating', text: 'Rating' },
                { link: '/block/components/select', text: 'Select' },
                { link: '/block/components/slider', text: 'Slider' },
                { link: '/block/components/switch', text: 'Switch' },
                { link: '/block/components/textarea', text: 'Textarea' },
              ],
              text: 'Inputs',
            },
            {
              collapsed: true,
              items: [
                { link: '/block/components/box', text: 'Box' },
                { link: '/block/components/grid', text: 'Grid' },
                { link: '/block/components/navbar', text: 'Navbar' },
                { link: '/block/components/sidebar', text: 'Sidebar' },
              ],
              text: 'Layout',
            },
          ],
          text: 'Components',
        },
        {
          items: [
            { link: '/block/api', text: 'API Reference' },
            { link: '/block/accessibility', text: 'Accessibility' },
            {
              items: [
                { link: '/block/examples/common-patterns', text: 'Common Patterns' },
                { link: '/block/examples/guideline-oriented-recipes', text: 'Guideline-Oriented Recipes' },
                { link: '/block/examples/settings-panel-with-switches', text: 'Settings Panel with Switches' },
              ],
              link: '/block/examples',
              text: 'Examples',
            },
          ],
          text: 'Reference',
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
            { link: '/craft/usage#controls', text: 'Controls' },
            { link: '/craft/usage#testing-utilities', text: 'Testing' },
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
            { link: '/craft/controls#which-control-do-i-choose', text: 'Choosing a Control' },
            { link: '/craft/controls#createlistcontrol', text: 'createListControl()' },
            { link: '/craft/controls#createpresscontrol', text: 'createPressControl()' },
            { link: '/craft/controls#createoverlaycontrol', text: 'createOverlayControl()' },
            { link: '/craft/controls#createpopuplistcontrol', text: 'createPopupListControl()' },
            { link: '/craft/controls#createslidercontrol', text: 'createSliderControl()' },
            { link: '/craft/controls#createspinnercontrol', text: 'createSpinnerControl()' },
            { link: '/craft/controls#createtextfield', text: 'createTextField()' },
            { link: '/craft/controls#createchoicefield', text: 'createChoiceField()' },
            {
              link: '/craft/controls#createcheckablefieldcontrol',
              text: 'createCheckableFieldControl()',
            },
          ],
          link: '/craft/controls',
          text: 'Controls',
        },
        {
          collapsed: true,
          items: [
            { link: '/craft/api#package-entry-points', text: 'Entry Points' },
            { link: '/craft/api#core-component-api', text: 'Core API' },
            { link: '/craft/api#runtime-helpers', text: 'Runtime' },
            { link: '/craft/api#props-api', text: 'Props' },
            { link: '/craft/api#template-and-directives', text: 'Templates & Directives' },
            { link: '/craft/api#host-and-slots', text: 'Host & Slots' },
            { link: '/craft/api#context-api', text: 'Context' },
            { link: '/craft/api#form-associated-api', text: 'Forms' },
            { link: '/craft/api#controls-apis', text: 'Controls' },
            { link: '/craft/api#observer-apis', text: 'Observers' },
            { link: '/craft/api#testing-apis', text: 'Testing' },
            { link: '/craft/api#ripple-re-exports', text: 'Ripple Re-exports' },
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
            { link: '/craft/examples/observers-in-onmount', text: 'Observers in mount()' },
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
      '/deposit/': [
        { link: '/deposit/', text: 'Overview' },
        {
          items: [
            { link: '/deposit/usage#define-a-schema', text: 'Define a Schema' },
            { link: '/deposit/usage#create-an-adapter', text: 'Create an Adapter' },
            { link: '/deposit/usage#sessionstorage', text: 'SessionStorage Adapter' },
            { link: '/deposit/usage#cookie-adapter', text: 'Cookie Adapter' },
            { link: '/deposit/usage#memory', text: 'Memory Adapter' },
            { link: '/deposit/usage#basic-crud', text: 'Basic CRUD' },
            { link: '/deposit/usage#use-ttl', text: 'Use TTL' },
            { link: '/deposit/usage#query-data', text: 'Query Data' },
            { link: '/deposit/usage#run-indexeddb-transactions', text: 'IndexedDB Transactions' },
            { link: '/deposit/usage#handle-schema-migrations', text: 'Schema Migrations' },
            { link: '/deposit/usage#operational-notes', text: 'Operational Notes' },
            { link: '/deposit/usage#testing-with-the-memory-adapter', text: 'Testing' },
          ],
          link: '/deposit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/deposit/api#package-entry-points', text: 'Package Entry Points' },
            { link: '/deposit/api#core-types', text: 'Core Types' },
            { link: '/deposit/api#schema-helper', text: 'Schema Helper' },
            { link: '/deposit/api#factories', text: 'Factories' },
            { link: '/deposit/api#createlocalstorage', text: 'createLocalStorage' },
            { link: '/deposit/api#createsessionstorage', text: 'createSessionStorage' },
            { link: '/deposit/api#createcookie', text: 'createCookie' },
            { link: '/deposit/api#createindexeddb', text: 'createIndexedDB' },
            { link: '/deposit/api#creatememory', text: 'createMemory' },
            { link: '/deposit/api#adapter-interface', text: 'Adapter Interface' },
            { link: '/deposit/api#indexeddbhandle', text: 'IndexedDBHandle' },
            { link: '/deposit/api#transactioncontext', text: 'TransactionContext' },
            { link: '/deposit/api#querybuilder', text: 'QueryBuilder' },
            { link: '/deposit/api#ttl-helper', text: 'TTL Helper' },
          ],
          link: '/deposit/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/deposit/examples/basic-examples', text: 'Basic Examples' },
            { link: '/deposit/examples/advanced-examples', text: 'Advanced Examples' },
          ],
          link: '/deposit/examples',
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
            { link: '/grip/usage#dropeffect', text: 'dropEffect' },
            { link: '/grip/usage#disabled-state', text: 'Disabled State' },
            { link: '/grip/usage#sortable', text: 'Sortable' },
            { link: '/grip/usage#drag-handles', text: 'Drag Handles' },
            { link: '/grip/usage#dynamic-lists', text: 'Dynamic Lists' },
            { link: '/grip/usage#styling-the-placeholder', text: 'Styling' },
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
            { link: '/grip/api#sortable-interface', text: 'Sortable Interface' },
            { link: '/grip/api#dom-attributes', text: 'DOM Attributes' },
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
      '/guide/': [
        { link: '/guide/', text: 'Getting Started' },
        {
          items: [
            { link: '/guide/docs-template', text: 'Documentation Template' },
            { link: '/guide/building-a-typed-form-flow', text: 'Building a Typed Form Flow' },
            { link: '/guide/state-and-routing', text: 'State and Routing' },
          ],
          text: 'Guides',
        },
      ],
      '/lingua/': [
        { link: '/lingua/', text: 'Overview' },
        {
          items: [
            { link: '/lingua/usage#basic-usage', text: 'Basic Usage' },
            { link: '/lingua/usage#message-shape', text: 'Message Shape' },
            { link: '/lingua/usage#variable-interpolation', text: 'Interpolation' },
            { link: '/lingua/usage#pluralisation', text: 'Pluralisation' },
            { link: '/lingua/usage#fallback-resolution', text: 'Fallback Resolution' },
            { link: '/lingua/usage#async-loading', text: 'Async Loading' },
            { link: '/lingua/usage#catalog-management', text: 'Catalog Management' },
            { link: '/lingua/usage#locale-and-catalog-metadata', text: 'Locale Metadata' },
            { link: '/lingua/usage#formatting', text: 'Formatting' },
            { link: '/lingua/usage#subscriptions', text: 'Subscriptions' },
            { link: '/lingua/usage#diagnostics-and-missing-keys', text: 'Diagnostics' },
            { link: '/lingua/usage#lifecycle-and-disposal', text: 'Lifecycle' },
            { link: '/lingua/usage#server-side-and-request-scope', text: 'Server / SSR' },
            { link: '/lingua/usage#best-practices', text: 'Best Practices' },
          ],
          link: '/lingua/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/lingua/api#api-at-a-glance', text: 'At a Glance' },
            { link: '/lingua/api#package-entry-point', text: 'Entry Point' },
            { link: '/lingua/api#types', text: 'Types' },
            { link: '/lingua/api#createi18n', text: 'createI18n()' },
            { link: '/lingua/api#i18n-interface', text: 'I18n Interface' },
            { link: '/lingua/api#type-guards', text: 'Type Guards' },
            { link: '/lingua/api#runtime-semantics', text: 'Runtime Semantics' },
            { link: '/lingua/api#message-shape', text: 'Message Shape' },
          ],
          link: '/lingua/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/lingua/examples/shared-instance-setup', text: 'Shared Instance Setup' },
            { link: '/lingua/examples/locale-switcher', text: 'Locale Switcher' },
            { link: '/lingua/examples/prefixed-translation-helper', text: 'Prefixed Translation Helper' },
            { link: '/lingua/examples/per-request-locale-handling', text: 'Per-request Locale Handling' },
            { link: '/lingua/examples/catalog-replacement', text: 'Catalog Replacement' },
            { link: '/lingua/examples/async-loading-and-reload', text: 'Async Loading and Preload' },
            { link: '/lingua/examples/ssr-rendering', text: 'SSR Rendering' },
            { link: '/lingua/examples/diagnostics-hook', text: 'Diagnostics Hook' },
          ],
          link: '/lingua/examples',
          text: 'Examples',
        },
      ],
      '/machine/': [
        { link: '/machine/', text: 'Overview' },
        {
          items: [
            { link: '/machine/usage#basic-usage', text: 'Basic Usage' },
            { link: '/machine/usage#transitions-and-guards', text: 'Transitions & Guards' },
            { link: '/machine/usage#actions', text: 'Actions' },
            { link: '/machine/usage#entry-and-exit-actions', text: 'Entry & Exit Actions' },
            { link: '/machine/usage#async-invokes', text: 'Async Invokes' },
            { link: '/machine/usage#context-validation', text: 'Context Validation' },
            { link: '/machine/usage#persistence', text: 'Persistence' },
            { link: '/machine/usage#debugging-and-tracing', text: 'Debugging & Tracing' },
            { link: '/machine/usage#testing', text: 'Testing' },
            { link: '/machine/usage#disposal', text: 'Disposal' },
            { link: '/machine/usage#common-patterns', text: 'Common Patterns' },
            { link: '/machine/usage#best-practices', text: 'Best Practices' },
          ],
          link: '/machine/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/machine/api#api-at-a-glance', text: 'At a Glance' },
            { link: '/machine/api#definitions', text: 'defineMachine()' },
            { link: '/machine/api#interpret', text: 'interpret()' },
            { link: '/machine/api#resolvetransition', text: 'resolveTransition()' },
            { link: '/machine/api#assign', text: 'assign()' },
            { link: '/machine/api#types', text: 'Types' },
            { link: '/machine/api#signals-and-reactivity', text: 'Signals & Reactivity' },
          ],
          link: '/machine/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/machine/examples/form-validation', text: 'Form with Validation' },
            { link: '/machine/examples/media-player', text: 'Media Player' },
            { link: '/machine/examples/fetch-retry', text: 'Fetch with Retry' },
            { link: '/machine/examples/checkout', text: 'Shopping Cart Checkout' },
            { link: '/machine/examples/wizard-with-routing', text: 'Multi-Step Wizard with Routing' },
            { link: '/machine/examples/paginated-data-loading', text: 'Paginated Data Loading with Search' },
            { link: '/machine/examples/permission-based-access', text: 'Permission-Based Access Control' },
            { link: '/machine/examples/multi-machine-coordination', text: 'Multi-Machine Coordination with Events' },
          ],
          link: '/machine/examples',
          text: 'Examples',
        },
      ],
      '/mcp/': [
        { link: '/mcp/', text: 'Overview' },
        {
          items: [
            { link: '/mcp/usage#quick-setup-from-a-monorepo-checkout', text: 'Setup' },
            { link: '/mcp/usage#transport-modes', text: 'Transport' },
            { link: '/mcp/usage#connecting-claude-desktop', text: 'Claude Desktop' },
            { link: '/mcp/usage#connecting-github-copilot-chat', text: 'Copilot Chat' },
            { link: '/mcp/usage#how-documentation-lookup-works', text: 'Docs Lookup' },
          ],
          link: '/mcp/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/mcp/api#api-at-a-glance', text: 'At a Glance' },
            { link: '/mcp/api#tools', text: 'Tools' },
            { link: '/mcp/api#list-packages', text: 'list-packages' },
            { link: '/mcp/api#search-packages', text: 'search-packages' },
            { link: '/mcp/api#get-ai-context', text: 'get-ai-context' },
            { link: '/mcp/api#list-docs-pages', text: 'list-docs-pages' },
            { link: '/mcp/api#get-docs', text: 'get-docs' },
            { link: '/mcp/api#get-package-api', text: 'get-package-api' },
            { link: '/mcp/api#list-components', text: 'list-components' },
            { link: '/mcp/api#get-component', text: 'get-component' },
            { link: '/mcp/api#resources', text: 'Resources' },
            { link: '/mcp/api#input-validation', text: 'Input Validation' },
            { link: '/mcp/api#error-handling', text: 'Error Handling' },
          ],
          link: '/mcp/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/mcp/examples/listing-packages', text: 'Listing Packages' },
            { link: '/mcp/examples/searching-packages', text: 'Searching Packages' },
            { link: '/mcp/examples/ai-context', text: 'AI Context' },
            { link: '/mcp/examples/looking-up-components', text: 'Looking Up Components' },
            { link: '/mcp/examples/reading-docs', text: 'Reading Docs' },
            { link: '/mcp/examples/inspector', text: 'Inspector' },
          ],
          link: '/mcp/examples',
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
      '/permit/': [
        { link: '/permit/', text: 'Overview' },
        {
          items: [
            { link: '/permit/usage#create-a-permit', text: 'Create Permit' },
            { link: '/permit/usage#check-permissions', text: 'Check Permissions' },
            { link: '/permit/usage#bind-a-user-with-foruser', text: 'forUser()' },
            { link: '/permit/usage#batch-decisions-with-checkall', text: 'checkAll()' },
            { link: '/permit/usage#inspect-rule-scope-with-rulesinscope', text: 'rulesInScope()' },
            { link: '/permit/usage#use-dynamic-conditions-with-when', text: 'Dynamic Predicates' },
            { link: '/permit/usage#anonymous-and-wildcards', text: 'Anonymous & Wildcards' },
            { link: '/permit/usage#logger-and-auditing', text: 'Logger / Auditing' },
            { link: '/permit/usage#decision-precedence', text: 'Decision Precedence' },
          ],
          link: '/permit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/permit/api#at-a-glance', text: 'At a Glance' },
            { link: '/permit/api#constants', text: 'Constants' },
            { link: '/permit/api#createpermit', text: 'createPermit()' },
            { link: '/permit/api#permit-interface', text: 'Permit Interface' },
            { link: '/permit/api#logger-context', text: 'Logger Context' },
            { link: '/permit/api#decision-model', text: 'Decision Model' },
            { link: '/permit/api#types', text: 'Types' },
          ],
          link: '/permit/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/permit/examples/blog-roles', text: 'Blog Roles' },
            { link: '/permit/examples/bound-guard-in-ui-layer', text: 'Bound Checker in UI Layer' },
            { link: '/permit/examples/disabling-wildcard-fallback', text: 'Rule Specificity' },
            { link: '/permit/examples/inheritance-and-overrides', text: 'Priority and Overrides' },
            { link: '/permit/examples/logger-for-auditing', text: 'Logger for Auditing' },
            {
              link: '/permit/examples/snapshot-restore-for-test-isolation',
              text: 'Rule Snapshot/Replace for Test Isolation',
            },
            { link: '/permit/examples/wildcard-action', text: 'Wildcard Action' },
          ],
          link: '/permit/examples',
          text: 'Examples',
        },
      ],
      '/relay/': [
        { link: '/relay/', text: 'Overview' },
        {
          items: [
            { link: '/relay/usage#event-maps', text: 'Event Maps' },
            { link: '/relay/usage#subscribing', text: 'Subscribing' },
            { link: '/relay/usage#emitting-events', text: 'Emitting Events' },
            { link: '/relay/usage#awaiting-events', text: 'Awaiting Events' },
            { link: '/relay/usage#async-iteration', text: 'Async Iteration' },
            { link: '/relay/usage#error-handling', text: 'Error Handling' },
            { link: '/relay/usage#dispose--cleanup', text: 'Dispose & Cleanup' },
            { link: '/relay/usage#testing', text: 'Testing' },
          ],
          link: '/relay/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/relay/api#package-entry-points', text: 'Package Entry Points' },
            { link: '/relay/api#types', text: 'Types' },
            { link: '/relay/api#busdisposederror', text: 'BusDisposedError' },
            { link: '/relay/api#createbus', text: 'createBus()' },
            { link: '/relay/api#bus-interface', text: 'Bus Interface' },
            { link: '/relay/api#buslistenercount', text: 'listenerCount()' },
            { link: '/relay/api#testing-utilities', text: 'Testing Utilities' },
            { link: '/relay/api#createtestbus', text: 'createTestBus()' },
          ],
          link: '/relay/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/relay/examples/awaiting-a-one-time-event', text: 'Awaiting a one-time event' },
            { link: '/relay/examples/custom-error-boundary', text: 'Custom error boundary' },
            { link: '/relay/examples/handling-disposal-in-async-code', text: 'Handling disposal in async code' },
            { link: '/relay/examples/inspecting-listener-counts', text: 'Inspecting listener counts' },
            { link: '/relay/examples/module-level-bus', text: 'Module-level bus' },
            { link: '/relay/examples/request-scoping', text: 'Request scoping' },
            { link: '/relay/examples/standalone-entry', text: 'Standalone entry' },
            { link: '/relay/examples/streaming-with-events', text: 'Streaming with `events()`' },
            { link: '/relay/examples/testing-with-createtestbus', text: 'Testing with `createTestBus`' },
          ],
          link: '/relay/examples',
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
      '/route/': [
        { link: '/route/', text: 'Overview' },
        {
          items: [
            { link: '/route/usage#create-a-router', text: 'Create a Router' },
            { link: '/route/usage#define-routes-once', text: 'Define Routes Once' },
            { link: '/route/usage#route-context', text: 'Route Context' },
            { link: '/route/usage#middleware', text: 'Middleware' },
            { link: '/route/usage#guards', text: 'Guards' },
            { link: '/route/usage#data-loading', text: 'Data Loading' },
            { link: '/route/usage#error-boundaries', text: 'Error Boundaries' },
            { link: '/route/usage#navigation', text: 'Navigation' },
            { link: '/route/usage#same-url-deduplication', text: 'Same-URL Deduplication' },
            { link: '/route/usage#urls-and-active-state', text: 'URLs and Active State' },
            { link: '/route/usage#resolve-without-navigating', text: 'Resolve Without Navigating' },
            { link: '/route/usage#state-and-subscriptions', text: 'State and Subscriptions' },
            { link: '/route/usage#cleanup', text: 'Cleanup' },
          ],
          link: '/route/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/route/api#createrouteroptions', text: 'createRouter()' },
            { link: '/route/api#route-table', text: 'Route Table' },
            { link: '/route/api#route-definition', text: 'Route Definition' },
            { link: '/route/api#createbrowserhistory', text: 'createBrowserHistory()' },
            { link: '/route/api#router', text: 'Router' },
            { link: '/route/api#core-types', text: 'Core Types' },
            { link: '/route/api#pattern-rules', text: 'Pattern Rules' },
            { link: '/route/api#design-notes', text: 'Design Notes' },
          ],
          link: '/route/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/route/examples/route-table-basics', text: 'Route Table Basics' },
            { link: '/route/examples/react-integration', text: 'React Integration' },
            { link: '/route/examples/vue-integration', text: 'Vue Integration' },
            { link: '/route/examples/svelte-integration', text: 'Svelte Integration' },
            { link: '/route/examples/auth-and-guards', text: 'Auth and Guards' },
            { link: '/route/examples/not-found-and-error-boundary', text: 'Not Found and Error Boundary' },
            { link: '/route/examples/base-path-deployment', text: 'Base Path Deployment' },
            { link: '/route/examples/raw-path-targets', text: 'Raw Path Targets' },
            { link: '/route/examples/same-url-deduplication', text: 'Same-URL Deduplication' },
            { link: '/route/examples/page-titles-from-meta', text: 'Page Titles from Meta' },
            { link: '/route/examples/view-transitions', text: 'View Transitions' },
          ],
          link: '/route/examples',
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
      '/sieve/': [
        { link: '/sieve/', text: 'Overview' },
        {
          items: [
            { link: '/sieve/usage#basic-usage', text: 'Basic Usage' },
            { link: '/sieve/usage#schema-factories', text: 'Schema Factories' },
            { link: '/sieve/usage#primitive-schemas', text: 'Primitives' },
            { link: '/sieve/usage#objects-arrays-tuples-and-records', text: 'Objects and Collections' },
            { link: '/sieve/usage#union-intersect-and-variant', text: 'Union, Intersect, and Variant' },
            { link: '/sieve/usage#parsing-and-validation-flow', text: 'Parsing Flow' },
            { link: '/sieve/usage#optional-nullable-default-and-catch', text: 'Optional, Default, and Catch' },
            { link: '/sieve/usage#transforms-preprocess-and-branding', text: 'Transforms and Preprocess' },
            { link: '/sieve/usage#async-validation', text: 'Async Validation' },
            { link: '/sieve/usage#error-handling', text: 'Error Handling' },
            { link: '/sieve/usage#message-customization', text: 'Message Customization' },
            { link: '/sieve/usage#type-inference', text: 'Type Inference' },
            { link: '/sieve/usage#best-practices', text: 'Best Practices' },
          ],
          link: '/sieve/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/sieve/api#most-used-first', text: 'Most Used First' },
            { link: '/sieve/api#package-exports', text: 'Package Exports' },
            { link: '/sieve/api#v-namespace', text: 'v Namespace' },
            { link: '/sieve/api#schema', text: 'Schema' },
            { link: '/sieve/api#stringschema', text: 'StringSchema' },
            { link: '/sieve/api#numberschema', text: 'NumberSchema' },
            { link: '/sieve/api#dateschema', text: 'DateSchema' },
            { link: '/sieve/api#arrayschema', text: 'ArraySchema' },
            { link: '/sieve/api#objectschema', text: 'ObjectSchema' },
            { link: '/sieve/api#tupleschema', text: 'TupleSchema' },
            { link: '/sieve/api#recordschema', text: 'RecordSchema' },
            { link: '/sieve/api#unionschema', text: 'UnionSchema' },
            { link: '/sieve/api#intersectschema', text: 'IntersectSchema' },
            { link: '/sieve/api#variantschema', text: 'VariantSchema' },
            { link: '/sieve/api#global-messages', text: 'Global Messages' },
            { link: '/sieve/api#types', text: 'Types' },
            { link: '/sieve/api#errors', text: 'Errors' },
          ],
          link: '/sieve/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/sieve/examples/forms', text: 'Forms' },
            { link: '/sieve/examples/api', text: 'API' },
            { link: '/sieve/examples/async', text: 'Async' },
            { link: '/sieve/examples/unions', text: 'Unions & Variant' },
          ],
          link: '/sieve/examples',
          text: 'Examples',
        },
      ],
      '/sourcerer/': [
        { link: '/sourcerer/', text: 'Overview' },
        {
          items: [
            { link: '/sourcerer/usage#create-a-local-source', text: 'Local Source' },
            { link: '/sourcerer/usage#create-a-remote-source', text: 'Remote Source' },
            { link: '/sourcerer/usage#read-model', text: 'Read Model' },
            { link: '/sourcerer/usage#url-query-param-sync', text: 'Query Param Sync' },
            { link: '/sourcerer/usage#selector-subscriptions', text: 'Selector Subscriptions' },
            { link: '/sourcerer/usage#framework-integration', text: 'Framework Integration' },
            { link: '/sourcerer/usage#local-source-in-ui-state', text: 'Local Source in UI State' },
            { link: '/sourcerer/usage#remote-source-with-async-lifecycle', text: 'Remote Source Async Lifecycle' },
            { link: '/sourcerer/usage#best-practices', text: 'Best Practices' },
          ],
          link: '/sourcerer/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/sourcerer/api#core-factories', text: 'Core Factories' },
            { link: '/sourcerer/api#shared-source-shape', text: 'Shared Source Shape' },
            { link: '/sourcerer/api#localsource-methods', text: 'LocalSource Methods' },
            { link: '/sourcerer/api#remotesource-methods', text: 'RemoteSource Methods' },
            { link: '/sourcerer/api#utilities', text: 'Utilities' },
            { link: '/sourcerer/api#types', text: 'Types' },
          ],
          link: '/sourcerer/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/sourcerer/examples/local-pagination-and-filtering', text: 'Local Pagination and Filtering' },
            { link: '/sourcerer/examples/sourcerer-with-ripple', text: 'Reactive Controls with Ripple' },
            { link: '/sourcerer/examples/remote-search-with-url-state', text: 'Remote Search with URL State' },
            { link: '/sourcerer/examples/sourcerer-with-courier', text: 'Remote Data with Courier' },
            { link: '/sourcerer/examples/sourcerer-with-route', text: 'URL-Synced List with Route' },
          ],
          link: '/sourcerer/examples',
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
      '/toolkit/': [
        { link: '/toolkit/', text: 'Overview' },
        {
          items: [
            { link: '/toolkit/usage#basic-usage', text: 'Basic Usage' },
            { link: '/toolkit/usage#common-patterns', text: 'Common Patterns' },
            { link: '/toolkit/usage#advanced-usage', text: 'Advanced Usage' },
            { link: '/toolkit/usage#framework-integration', text: 'Framework Integration' },
            { link: '/toolkit/usage#best-practices', text: 'Best Practices' },
            { link: '/toolkit/usage#performance-tips', text: 'Performance' },
          ],
          link: '/toolkit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/toolkit/api#array', text: 'Array' },
            { link: '/toolkit/api#async', text: 'Async' },
            { link: '/toolkit/api#date', text: 'Date' },
            { link: '/toolkit/api#function', text: 'Function' },
            { link: '/toolkit/api#math', text: 'Math' },
            { link: '/toolkit/api#money', text: 'Money' },
            { link: '/toolkit/api#object', text: 'Object' },
            { link: '/toolkit/api#random', text: 'Random' },
            { link: '/toolkit/api#string', text: 'String' },
            { link: '/toolkit/api#typed', text: 'Typed' },
          ],
          link: '/toolkit/api',
          text: 'API Reference',
        },
        {
          items: [
            {
              collapsed: true,
              items: [
                { link: '/toolkit/examples/array/chunk', text: 'chunk' },
                { link: '/toolkit/examples/array/compact', text: 'compact' },
                { link: '/toolkit/examples/array/contains', text: 'contains' },
                { link: '/toolkit/examples/array/countBy', text: 'countBy' },
                { link: '/toolkit/examples/array/difference', text: 'difference' },
                { link: '/toolkit/examples/array/drop', text: 'drop' },
                { link: '/toolkit/examples/array/dropLast', text: 'dropLast' },
                { link: '/toolkit/examples/array/select', text: 'filterMap' },
                { link: '/toolkit/examples/array/first', text: 'first' },
                { link: '/toolkit/examples/array/flatten', text: 'flatten' },
                { link: '/toolkit/examples/array/group', text: 'groupBy' },
                { link: '/toolkit/examples/array/intersection', text: 'intersection' },
                { link: '/toolkit/examples/array/keyBy', text: 'indexBy' },
                { link: '/toolkit/examples/array/last', text: 'last' },
                { link: '/toolkit/examples/array/partition', text: 'partition' },
                { link: '/sourcerer/examples/local-pagination-and-filtering', text: 'Sourcerer: local source' },
                { link: '/toolkit/examples/array/replace', text: 'replace' },
                { link: '/toolkit/examples/array/rotate', text: 'rotate' },
                { link: '/toolkit/examples/array/sampleSize', text: 'sample' },
                { link: '/toolkit/examples/array/search', text: 'search' },
                { link: '/toolkit/examples/array/sort', text: 'sort' },
                { link: '/toolkit/examples/array/take', text: 'take' },
                { link: '/toolkit/examples/array/takeLast', text: 'takeLast' },
                { link: '/toolkit/examples/array/toggle', text: 'toggle' },
                { link: '/toolkit/examples/array/union', text: 'union' },
                { link: '/toolkit/examples/array/uniq', text: 'uniq' },
                { link: '/toolkit/examples/array/unzip', text: 'unzip' },
                { link: '/toolkit/examples/array/zip', text: 'zip' },
              ],
              link: '/toolkit/examples/array',
              text: 'Array',
            },
            {
              collapsed: true,
              items: [
                { link: '/toolkit/examples/async/abortable', text: 'abortable' },
                { link: '/toolkit/examples/async/attempt', text: 'attempt' },
                { link: '/toolkit/examples/async/defer', text: 'defer' },
                { link: '/toolkit/examples/async/parallel', text: 'parallel' },
                { link: '/toolkit/examples/async/predict', text: 'predict' },
                { link: '/toolkit/examples/async/queue', text: 'queue' },
                { link: '/toolkit/examples/async/retry', text: 'retry' },
                { link: '/toolkit/examples/async/scheduler', text: 'scheduler' },
                { link: '/toolkit/examples/async/sleep', text: 'sleep' },
                { link: '/toolkit/examples/async/timeout', text: 'timeout' },
                { link: '/toolkit/examples/async/waitFor', text: 'waitFor' },
              ],
              link: '/toolkit/examples/async',
              text: 'Async',
            },
            {
              collapsed: true,
              items: [
                { link: '/toolkit/examples/string/camelCase', text: 'camelCase' },
                { link: '/toolkit/examples/string/endsWith', text: 'endsWith' },
                { link: '/toolkit/examples/string/escape', text: 'escape' },
                { link: '/toolkit/examples/string/kebabCase', text: 'kebabCase' },
                { link: '/toolkit/examples/string/pad', text: 'pad' },
                { link: '/toolkit/examples/string/pascalCase', text: 'pascalCase' },
                { link: '/toolkit/examples/string/similarity', text: 'similarity' },
                { link: '/toolkit/examples/string/snakeCase', text: 'snakeCase' },
                { link: '/toolkit/examples/string/startsWith', text: 'startsWith' },
                { link: '/toolkit/examples/string/titleCase', text: 'titleCase' },
                { link: '/toolkit/examples/string/truncate', text: 'truncate' },
                { link: '/toolkit/examples/string/unescape', text: 'unescape' },
                { link: '/toolkit/examples/string/words', text: 'words' },
              ],
              link: '/toolkit/examples/string',
              text: 'String',
            },
            {
              collapsed: true,
              items: [
                { link: '/toolkit/examples/object/deepClone', text: 'deepClone' },
                { link: '/toolkit/examples/object/defaults', text: 'defaults' },
                { link: '/toolkit/examples/object/diff', text: 'diff' },
                { link: '/toolkit/examples/object/entries', text: 'entries' },
                { link: '/toolkit/examples/object/filterValues', text: 'filterValues' },
                { link: '/toolkit/examples/object/fromEntries', text: 'fromEntries' },
                { link: '/toolkit/examples/object/has', text: 'has' },
                { link: '/toolkit/examples/object/invert', text: 'invert' },
                { link: '/toolkit/examples/object/keys', text: 'keys' },
                { link: '/toolkit/examples/object/mapKeys', text: 'mapKeys' },
                { link: '/toolkit/examples/object/mapValues', text: 'mapValues' },
                { link: '/toolkit/examples/object/merge', text: 'merge' },
                { link: '/toolkit/examples/object/omit', text: 'omit' },
                { link: '/toolkit/examples/object/parseJSON', text: 'parseJSON' },
                { link: '/toolkit/examples/object/path', text: 'path' },
                { link: '/toolkit/examples/object/pick', text: 'pick' },
                { link: '/toolkit/examples/object/prune', text: 'prune' },
                { link: '/toolkit/examples/object/seek', text: 'seek' },
                { link: '/toolkit/examples/object/stash', text: 'stash' },
                { link: '/toolkit/examples/object/values', text: 'values' },
              ],
              link: '/toolkit/examples/object',
              text: 'Object',
            },
            {
              collapsed: true,
              items: [
                { link: '/toolkit/examples/date/expires', text: 'expires' },
                { link: '/toolkit/examples/date/interval', text: 'interval' },
                { link: '/toolkit/examples/date/timeDiff', text: 'timeDiff' },
              ],
              link: '/toolkit/examples/date',
              text: 'Date',
            },
            {
              collapsed: true,
              items: [
                { link: '/toolkit/examples/function/assert', text: 'assert' },
                { link: '/toolkit/examples/function/compare', text: 'compare' },
                { link: '/toolkit/examples/function/compareBy', text: 'compareBy' },
                { link: '/toolkit/examples/function/compose', text: 'compose' },
                { link: '/toolkit/examples/function/configure', text: 'partial' },
                { link: '/toolkit/examples/function/constant', text: 'constant' },
                { link: '/toolkit/examples/function/curry', text: 'curry' },
                { link: '/toolkit/examples/function/debounce', text: 'debounce' },
                { link: '/toolkit/examples/function/identity', text: 'identity' },
                { link: '/toolkit/examples/function/memo', text: 'memo' },
                { link: '/toolkit/examples/function/negate', text: 'negate' },
                { link: '/toolkit/examples/function/once', text: 'once' },
                { link: '/toolkit/examples/function/pipe', text: 'pipe' },
                { link: '/toolkit/examples/function/tap', text: 'tap' },
                { link: '/toolkit/examples/function/throttle', text: 'throttle' },
              ],
              link: '/toolkit/examples/function',
              text: 'Function',
            },
            {
              collapsed: true,
              items: [
                { link: '/toolkit/examples/math/abs', text: 'abs' },
                { link: '/toolkit/examples/math/allocate', text: 'allocate' },
                { link: '/toolkit/examples/math/average', text: 'average' },
                { link: '/toolkit/examples/math/clamp', text: 'clamp' },
                { link: '/toolkit/examples/math/gcd', text: 'gcd' },
                { link: '/toolkit/examples/math/lcm', text: 'lcm' },
                { link: '/toolkit/examples/math/lerp', text: 'lerp' },
                { link: '/toolkit/examples/math/linspace', text: 'linspace' },
                { link: '/toolkit/examples/math/max', text: 'max' },
                { link: '/toolkit/examples/math/median', text: 'median' },
                { link: '/toolkit/examples/math/min', text: 'min' },
                { link: '/toolkit/examples/math/mod', text: 'mod' },
                { link: '/toolkit/examples/math/normalize', text: 'normalize' },
                { link: '/toolkit/examples/math/percent', text: 'percent' },
                { link: '/toolkit/examples/math/range', text: 'range' },
                { link: '/toolkit/examples/math/round', text: 'round' },
                { link: '/toolkit/examples/math/standardDeviation', text: 'standardDeviation' },
                { link: '/toolkit/examples/math/sum', text: 'sum' },
                { link: '/toolkit/examples/math/variance', text: 'variance' },
              ],
              link: '/toolkit/examples/math',
              text: 'Math',
            },
            {
              collapsed: true,
              items: [
                { link: '/toolkit/examples/money/currency', text: 'currency' },
                { link: '/toolkit/examples/money/exchange', text: 'exchange' },
              ],
              link: '/toolkit/examples/money',
              text: 'Money',
            },
            {
              collapsed: true,
              items: [
                { link: '/toolkit/examples/random/draw', text: 'draw' },
                { link: '/toolkit/examples/random/random', text: 'random' },
                { link: '/toolkit/examples/random/shuffle', text: 'shuffle' },
                { link: '/toolkit/examples/random/uuid', text: 'uuid' },
              ],
              link: '/toolkit/examples/random',
              text: 'Random',
            },
            {
              collapsed: true,
              items: [
                { link: '/toolkit/examples/typed/is', text: 'is' },
                { link: '/toolkit/examples/typed/isArray', text: 'is.array' },
                { link: '/toolkit/examples/typed/isBoolean', text: 'is.boolean' },
                { link: '/toolkit/examples/typed/isDate', text: 'is.date' },
                { link: '/toolkit/examples/typed/isDefined', text: 'is.defined' },
                { link: '/toolkit/examples/typed/isEmpty', text: 'is.empty' },
                { link: '/toolkit/examples/typed/isEqual', text: 'is.equal' },
                { link: '/toolkit/examples/typed/isFunction', text: 'is.fn' },
                { link: '/toolkit/examples/typed/isGreaterThan', text: 'isGreaterThan' },
                { link: '/toolkit/examples/typed/isGreaterThanOrEqual', text: 'isGreaterThanOrEqual' },
                { link: '/toolkit/examples/typed/isLessThan', text: 'isLessThan' },
                { link: '/toolkit/examples/typed/isLessThanOrEqual', text: 'isLessThanOrEqual' },
                { link: '/toolkit/examples/typed/isMatch', text: 'is.match' },
                { link: '/toolkit/examples/typed/isNil', text: 'is.nil' },
                { link: '/toolkit/examples/typed/isNumber', text: 'is.number' },
                { link: '/toolkit/examples/typed/isObject', text: 'is.object' },
                { link: '/toolkit/examples/typed/isPrimitive', text: 'is.primitive' },
                { link: '/toolkit/examples/typed/isPromise', text: 'is.promise' },
                { link: '/toolkit/examples/typed/isRegex', text: 'is.regex' },
                { link: '/toolkit/examples/typed/isString', text: 'is.string' },
                { link: '/toolkit/examples/typed/isWithin', text: 'isWithin' },
                { link: '/toolkit/examples/typed/typeOf', text: 'is.typeOf' },
              ],
              link: '/toolkit/examples/typed',
              text: 'Typed',
            },
          ],
          link: '/toolkit/examples',
          text: 'Examples',
        },
      ],
      '/wired/': [
        { link: '/wired/', text: 'Overview' },
        {
          items: [
            { link: '/wired/usage#tokens', text: 'Tokens' },
            { link: '/wired/usage#registration', text: 'Registration' },
            { link: '/wired/usage#resolution', text: 'Resolution' },
            { link: '/wired/usage#lifetimes', text: 'Lifetimes' },
            { link: '/wired/usage#child-containers', text: 'Child Containers' },
            { link: '/wired/usage#async-providers', text: 'Async Providers' },
            { link: '/wired/usage#disposal', text: 'Disposal' },
          ],
          link: '/wired/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/wired/api#createtokendescription', text: 'createToken()' },
            { link: '/wired/api#createcontainer', text: 'createContainer()' },
            { link: '/wired/api#container-registration', text: 'Registration' },
            { link: '/wired/api#container-resolution', text: 'Resolution' },
            { link: '/wired/api#container-lifecycle', text: 'Lifecycle' },
            { link: '/wired/api#errors', text: 'Errors' },
            { link: '/wired/api#types', text: 'Types' },
          ],
          link: '/wired/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/wired/examples/basic-setup', text: 'Basic Setup' },
            { link: '/wired/examples/lifetimes', text: 'Lifetimes' },
            { link: '/wired/examples/async-providers', text: 'Async Providers' },
            { link: '/wired/examples/child-containers', text: 'Child Containers' },
            { link: '/wired/examples/multi-providers', text: 'Multi Providers' },
            { link: '/wired/examples/batch-resolution', text: 'Batch Resolution' },
            { link: '/wired/examples/dispose-lifecycle', text: 'Dispose Lifecycle' },
          ],
          link: '/wired/examples',
          text: 'Examples',
        },
      ],
      '/worker/': [
        { link: '/worker/', text: 'Overview' },
        {
          items: [
            { link: '/worker/usage#task-functions', text: 'Task Functions' },
            { link: '/worker/usage#single-worker', text: 'Single Worker' },
            { link: '/worker/usage#worker-pool', text: 'Worker Pool' },
            { link: '/worker/usage#timeouts', text: 'Timeouts' },
            { link: '/worker/usage#abortsignal', text: 'AbortSignal' },
            { link: '/worker/usage#transferables', text: 'Transferables' },
            { link: '/worker/usage#worker-status', text: 'Worker Status' },
            { link: '/worker/usage#isnative', text: 'isNative' },
            { link: '/worker/usage#fallback-mode', text: 'Fallback Mode' },
            { link: '/worker/usage#external-scripts', text: 'External Scripts' },
            { link: '/worker/usage#testing', text: 'Testing' },
          ],
          link: '/worker/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/worker/api#package-exports', text: 'Package Exports' },
            { link: '/worker/api#types', text: 'Types' },
            { link: '/worker/api#createworker', text: 'createWorker()' },
            { link: '/worker/api#workerhandle-interface', text: 'WorkerHandle Interface' },
            { link: '/worker/api#error-classes', text: 'Error Classes' },
            { link: '/worker/api#testing-utilities', text: 'Testing Utilities' },
          ],
          link: '/worker/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/worker/examples/cancellable-batch', text: 'Cancellable Batch' },
            { link: '/worker/examples/data-transformation-pipeline', text: 'Data Pipeline' },
            { link: '/worker/examples/fibonacci-with-pool-and-timeout', text: 'Fibonacci Pool' },
            { link: '/worker/examples/image-processing', text: 'Image Processing' },
            { link: '/worker/examples/react-integration', text: 'React Integration' },
            { link: '/worker/examples/testing-with-createtestworker', text: 'Testing' },
            { link: '/worker/examples/using-transferables', text: 'Using Transferables' },
          ],
          link: '/worker/examples',
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
        '@vielzeug/block': resolve(__dirname, '../../packages/block/src'),
        '@vielzeug/courier': resolve(__dirname, '../../packages/courier/src'),
        '@vielzeug/craft': resolve(__dirname, '../../packages/craft/src'),
        '@vielzeug/deposit': resolve(__dirname, '../../packages/deposit/src'),
        '@vielzeug/forge': resolve(__dirname, '../../packages/forge/src'),
        '@vielzeug/grip': resolve(__dirname, '../../packages/grip/src'),
        '@vielzeug/lingua': resolve(__dirname, '../../packages/lingua/src'),
        '@vielzeug/machine': resolve(__dirname, '../../packages/machine/src'),
        '@vielzeug/orbit': resolve(__dirname, '../../packages/orbit/src'),
        '@vielzeug/permit': resolve(__dirname, '../../packages/permit/src'),
        '@vielzeug/relay': resolve(__dirname, '../../packages/relay/src'),
        '@vielzeug/ripple': resolve(__dirname, '../../packages/ripple/src'),
        '@vielzeug/route': resolve(__dirname, '../../packages/route/src'),
        '@vielzeug/rune': resolve(__dirname, '../../packages/rune/src'),
        '@vielzeug/scroll': resolve(__dirname, '../../packages/scroll/src'),
        '@vielzeug/sieve': resolve(__dirname, '../../packages/sieve/src'),
        '@vielzeug/sourcerer': resolve(__dirname, '../../packages/sourcerer/src'),
        '@vielzeug/tempo': resolve(__dirname, '../../packages/tempo/src'),
        '@vielzeug/toolkit': resolve(__dirname, '../../packages/toolkit/src'),
        '@vielzeug/wired': resolve(__dirname, '../../packages/wired/src'),
        '@vielzeug/worker': resolve(__dirname, '../../packages/worker/src'),
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
