import browserslist from 'browserslist';
import { browserslistToTargets } from 'lightningcss';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type DefaultTheme, type UserConfig } from 'vitepress';

import type { ThemeConfig } from './theme/types';

import { getPackagesData } from './theme/utils/packageData';

const __dirname = dirname(fileURLToPath(import.meta.url));

const NON_COLLAPSIBLE_PACKAGE_PATHS = new Set(['/buildit/']);

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
    '**MCP (AI agents):** `npx -y @vielzeug/mcpit` runs the Vielzeug MCP server in standalone stdio mode with bundled data,',
    'so no monorepo checkout is required. Use `npx -y @vielzeug/mcpit --port 3100` for Streamable HTTP with the same package discovery, docs lookup, source inspection, and Buildit component metadata tools.',
    '',
    '## Packages',
    '',
    ...packageLines,
    '',
    '## Integration guides',
    '',
    '- [Getting Started](/guide/): Installation and package overview',
    '- [Building a Typed Form Flow](/guide/building-a-typed-form-flow): Validit + Formit + Fetchit',
    '- [State and Routing](/guide/state-and-routing): Stateit + Routeit',
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
              { link: '/logit/', text: 'Logit' },
              { link: '/timit/', text: 'Timit' },
              { link: '/toolkit/', text: 'Toolkit' },
            ],
            text: 'Core & Utilities',
          },
          {
            items: [
              { link: '/deposit/', text: 'Deposit' },
              { link: '/eventit/', text: 'Eventit' },
              { link: '/fetchit/', text: 'Fetchit' },
              { link: '/sourceit/', text: 'Sourceit' },
              { link: '/stateit/', text: 'Stateit' },
            ],
            text: 'Data & State',
          },
          {
            items: [
              { link: '/craftit/', text: 'Craftit' },
              { link: '/dragit/', text: 'Dragit' },
              { link: '/floatit/', text: 'Floatit' },
              { link: '/formit/', text: 'Formit' },
              { link: '/i18nit/', text: 'i18nit' },
              { link: '/validit/', text: 'Validit' },
              { link: '/virtualit/', text: 'Virtualit' },
            ],
            text: 'Frontend & Logic',
          },
          {
            items: [
              { link: '/mcpit/', text: 'Mcpit' },
              { link: '/permit/', text: 'Permit' },
              { link: '/routeit/', text: 'Routeit' },
              { link: '/wireit/', text: 'Wireit' },
              { link: '/workit/', text: 'Workit' },
            ],
            text: 'Architecture & Security',
          },
        ],
        text: 'Packages',
      },
      { link: '/buildit/', text: 'Components' },
      { link: '/repl', text: 'REPL' },
    ],
    packages: getPackagesData(),
    search: {
      provider: 'local',
    },
    sidebar: makePackageSidebarsCollapsible({
      '/buildit/': [
        { link: '/buildit/', text: 'Overview' },
        {
          items: [
            {
              collapsed: true,
              items: [
                { link: '/buildit/usage#basic-usage', text: 'Basic Usage' },
                { link: '/buildit/usage#slots', text: 'Slots' },
                { link: '/buildit/usage#accessibility', text: 'Accessibility' },
              ],
              link: '/buildit/usage',
              text: 'Usage Guide',
            },
            {
              collapsed: true,
              items: [
                { link: '/buildit/frameworks#react', text: 'React' },
                { link: '/buildit/frameworks#vue-3', text: 'Vue 3' },
                { link: '/buildit/frameworks#svelte', text: 'Svelte' },
                { link: '/buildit/frameworks#angular', text: 'Angular' },
                { link: '/buildit/frameworks#ssr-considerations', text: 'SSR' },
              ],
              link: '/buildit/frameworks',
              text: 'Framework Integration',
            },
            {
              collapsed: true,
              items: [
                { link: '/buildit/theming#design-tokens', text: 'Design Tokens' },
                { link: '/buildit/theming#dark-mode', text: 'Dark Mode' },
                { link: '/buildit/theming#global-customization', text: 'Global Customization' },
                { link: '/buildit/theming#component-customization', text: 'Component Customization' },
              ],
              link: '/buildit/theming',
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
                { link: '/buildit/components/accordion', text: 'Accordion' },
                { link: '/buildit/components/tabs', text: 'Tabs' },
              ],
              text: 'Disclosure',
            },
            {
              collapsed: true,
              items: [
                { link: '/buildit/components/alert', text: 'Alert' },
                { link: '/buildit/components/async', text: 'Async' },
                { link: '/buildit/components/badge', text: 'Badge' },
                { link: '/buildit/components/chip', text: 'Chip' },
                { link: '/buildit/components/password-strength', text: 'Password Strength' },
                { link: '/buildit/components/progress', text: 'Progress' },
                { link: '/buildit/components/skeleton', text: 'Skeleton' },
                { link: '/buildit/components/toast', text: 'Toast' },
              ],
              text: 'Feedback',
            },
            {
              collapsed: true,
              items: [
                { link: '/buildit/components/avatar', text: 'Avatar' },
                { link: '/buildit/components/breadcrumb', text: 'Breadcrumb' },
                { link: '/buildit/components/card', text: 'Card' },
                { link: '/buildit/components/icon', text: 'Icon' },
                { link: '/buildit/components/pagination', text: 'Pagination' },
                { link: '/buildit/components/separator', text: 'Separator' },
                { link: '/buildit/components/table', text: 'Table' },
                { link: '/buildit/components/text', text: 'Text' },
              ],
              text: 'Content',
            },
            {
              collapsed: true,
              items: [
                { link: '/buildit/components/dialog', text: 'Dialog' },
                { link: '/buildit/components/drawer', text: 'Drawer' },
                { link: '/buildit/components/menu', text: 'Menu' },
                { link: '/buildit/components/popover', text: 'Popover' },
                { link: '/buildit/components/tooltip', text: 'Tooltip' },
              ],
              text: 'Overlay',
            },
            {
              collapsed: true,
              items: [
                { link: '/buildit/components/button', text: 'Button' },
                { link: '/buildit/components/checkbox', text: 'Checkbox' },
                { link: '/buildit/components/combobox', text: 'Combobox' },
                { link: '/buildit/components/file-input', text: 'File Input' },
                { link: '/buildit/components/form', text: 'Form' },
                { link: '/buildit/components/input', text: 'Input' },
                { link: '/buildit/components/number-input', text: 'Number Input' },
                { link: '/buildit/components/otp-input', text: 'OTP Input' },
                { link: '/buildit/components/radio', text: 'Radio' },
                { link: '/buildit/components/rating', text: 'Rating' },
                { link: '/buildit/components/select', text: 'Select' },
                { link: '/buildit/components/slider', text: 'Slider' },
                { link: '/buildit/components/switch', text: 'Switch' },
                { link: '/buildit/components/textarea', text: 'Textarea' },
              ],
              text: 'Inputs',
            },
            {
              collapsed: true,
              items: [
                { link: '/buildit/components/box', text: 'Box' },
                { link: '/buildit/components/grid', text: 'Grid' },
                { link: '/buildit/components/navbar', text: 'Navbar' },
                { link: '/buildit/components/sidebar', text: 'Sidebar' },
              ],
              text: 'Layout',
            },
          ],
          text: 'Components',
        },
        {
          items: [
            { link: '/buildit/api', text: 'API Reference' },
            { link: '/buildit/accessibility', text: 'Accessibility' },
            {
              items: [
                { link: '/buildit/examples/common-patterns', text: 'Common Patterns' },
                { link: '/buildit/examples/guideline-oriented-recipes', text: 'Guideline-Oriented Recipes' },
                { link: '/buildit/examples/settings-panel-with-switches', text: 'Settings Panel with Switches' },
              ],
              link: '/buildit/examples',
              text: 'Examples',
            },
          ],
          text: 'Reference',
        },
      ],
      '/craftit/': [
        { link: '/craftit/', text: 'Overview' },
        {
          collapsed: false,
          items: [
            { link: '/craftit/usage#define-and-component-structure', text: 'define()' },
            { link: '/craftit/usage#signals-and-effects', text: 'Signals' },
            { link: '/craftit/usage#onmounted-and-lifecycle', text: 'Lifecycle' },
            { link: '/craftit/usage#prop-definitions', text: 'Props' },
            { link: '/craftit/usage#template-bindings', text: 'Templates' },
            { link: '/craftit/usage#directives', text: 'Directives' },
            { link: '/craftit/usage#host-bindings', text: 'Host Bindings' },
            { link: '/craftit/usage#slots-and-emits', text: 'Slots & Emits' },
            { link: '/craftit/usage#context-provideinject', text: 'Context / DI' },
            { link: '/craftit/usage#form-associated-elements', text: 'Forms' },
            { link: '/craftit/usage#platform-observers', text: 'Observers' },
            { link: '/craftit/usage#controls', text: 'Controls' },
            { link: '/craftit/usage#testing-utilities', text: 'Testing' },
          ],
          link: '/craftit/usage',
          text: 'Usage Guide',
        },
        {
          collapsed: true,
          items: [
            {
              link: '/craftit/lifecycle-best-practices#prefer-setup-scope-reactivity',
              text: 'Setup-Scope Reactivity',
            },
            {
              link: '/craftit/lifecycle-best-practices#run-dom-initialization-with-onmounted',
              text: 'Deferred Initialization',
            },
            {
              link: '/craftit/lifecycle-best-practices#use-onelement-for-ref-driven-effects',
              text: 'Ref-Driven Effects',
            },
            { link: '/craftit/lifecycle-best-practices#keep-host-wiring-explicit', text: 'Host Wiring' },
            {
              link: '/craftit/lifecycle-best-practices#pick-the-right-cleanup-primitive',
              text: 'Cleanup Patterns',
            },
          ],
          link: '/craftit/lifecycle-best-practices',
          text: 'Lifecycle Best Practices',
        },
        {
          collapsed: true,
          items: [
            { link: '/craftit/controls#which-control-do-i-choose', text: 'Choosing a Control' },
            { link: '/craftit/controls#createlistcontrol', text: 'createListControl()' },
            { link: '/craftit/controls#createpresscontrol', text: 'createPressControl()' },
            { link: '/craftit/controls#createoverlaycontrol', text: 'createOverlayControl()' },
            { link: '/craftit/controls#createpopuplistcontrol', text: 'createPopupListControl()' },
            { link: '/craftit/controls#createslidercontrol', text: 'createSliderControl()' },
            { link: '/craftit/controls#createspinnercontrol', text: 'createSpinnerControl()' },
            { link: '/craftit/controls#createtextfield', text: 'createTextField()' },
            { link: '/craftit/controls#createchoicefield', text: 'createChoiceField()' },
            {
              link: '/craftit/controls#createcheckablefieldcontrol',
              text: 'createCheckableFieldControl()',
            },
          ],
          link: '/craftit/controls',
          text: 'Controls',
        },
        {
          collapsed: true,
          items: [
            { link: '/craftit/api#package-entry-points', text: 'Entry Points' },
            { link: '/craftit/api#core-component-api', text: 'Core API' },
            { link: '/craftit/api#runtime-helpers', text: 'Runtime' },
            { link: '/craftit/api#props-api', text: 'Props' },
            { link: '/craftit/api#template-and-directives', text: 'Templates & Directives' },
            { link: '/craftit/api#host-and-slots', text: 'Host & Slots' },
            { link: '/craftit/api#context-api', text: 'Context' },
            { link: '/craftit/api#form-associated-api', text: 'Forms' },
            { link: '/craftit/api#controls-apis', text: 'Controls' },
            { link: '/craftit/api#observer-apis', text: 'Observers' },
            { link: '/craftit/api#testing-apis', text: 'Testing' },
            { link: '/craftit/api#stateit-re-exports', text: 'Stateit Re-exports' },
          ],
          link: '/craftit/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/craftit/examples/propsof-builder-api', text: 'Prop Helpers and Raw PropDef' },
            { link: '/craftit/examples/context-provider-and-consumer', text: 'Context Provider and Consumer' },
            { link: '/craftit/examples/counter-component', text: 'Counter Component' },
            { link: '/craftit/examples/form-associated-rating-input', text: 'Form-Associated Rating Input' },
            { link: '/craftit/examples/observers-in-onmount', text: 'Observers in mount()' },
            { link: '/craftit/examples/search-list-with-directives', text: 'Search List with Directives' },
            {
              link: '/craftit/examples/test-example-at-vielzeug-craftit-testing',
              text: 'Testing with @vielzeug/craftit/testing',
            },
            { link: '/craftit/examples/typed-props-and-emits', text: 'Typed Props and Emits' },
          ],
          link: '/craftit/examples',
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
      '/dragit/': [
        { link: '/dragit/', text: 'Overview' },
        {
          items: [
            { link: '/dragit/usage#drop-zone', text: 'Drop Zone' },
            { link: '/dragit/usage#accept-filtering', text: 'Accept Filtering' },
            { link: '/dragit/usage#hover-state', text: 'Hover State' },
            { link: '/dragit/usage#dropeffect', text: 'dropEffect' },
            { link: '/dragit/usage#disabled-state', text: 'Disabled State' },
            { link: '/dragit/usage#sortable', text: 'Sortable' },
            { link: '/dragit/usage#drag-handles', text: 'Drag Handles' },
            { link: '/dragit/usage#dynamic-lists', text: 'Dynamic Lists' },
            { link: '/dragit/usage#styling-the-placeholder', text: 'Styling' },
            { link: '/dragit/usage#cleanup', text: 'Cleanup' },
          ],
          link: '/dragit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/dragit/api#types', text: 'Types' },
            { link: '/dragit/api#createdropzone', text: 'createDropZone()' },
            { link: '/dragit/api#dropzone-interface', text: 'DropZone Interface' },
            { link: '/dragit/api#createsortable', text: 'createSortable()' },
            { link: '/dragit/api#sortable-interface', text: 'Sortable Interface' },
            { link: '/dragit/api#dom-attributes', text: 'DOM Attributes' },
          ],
          link: '/dragit/api',
          text: 'API Reference',
        },
        {
          items: [
            {
              link: '/dragit/examples/combined-sortable-with-inline-editing',
              text: 'Combined: sortable with inline editing',
            },
            {
              link: '/dragit/examples/connected-kanban-keyboard-sorting',
              text: 'Connected kanban with keyboard sorting',
            },
            { link: '/dragit/examples/file-upload-drop-zone', text: 'File upload drop zone' },
            { link: '/dragit/examples/sortable-list', text: 'Sortable list' },
            { link: '/dragit/examples/using-using-for-scoped-cleanup', text: 'Using `using` for scoped cleanup' },
            { link: '/dragit/examples/web-component-with-craftit', text: 'Web Component with craftit' },
          ],
          link: '/dragit/examples',
          text: 'Examples',
        },
      ],
      '/eventit/': [
        { link: '/eventit/', text: 'Overview' },
        {
          items: [
            { link: '/eventit/usage#event-maps', text: 'Event Maps' },
            { link: '/eventit/usage#subscribing', text: 'Subscribing' },
            { link: '/eventit/usage#emitting-events', text: 'Emitting Events' },
            { link: '/eventit/usage#awaiting-events', text: 'Awaiting Events' },
            { link: '/eventit/usage#async-iteration', text: 'Async Iteration' },
            { link: '/eventit/usage#error-handling', text: 'Error Handling' },
            { link: '/eventit/usage#dispose--cleanup', text: 'Dispose & Cleanup' },
            { link: '/eventit/usage#testing', text: 'Testing' },
          ],
          link: '/eventit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/eventit/api#package-entry-points', text: 'Package Entry Points' },
            { link: '/eventit/api#types', text: 'Types' },
            { link: '/eventit/api#busdisposederror', text: 'BusDisposedError' },
            { link: '/eventit/api#createbus', text: 'createBus()' },
            { link: '/eventit/api#bus-interface', text: 'Bus Interface' },
            { link: '/eventit/api#buslistenercount', text: 'listenerCount()' },
            { link: '/eventit/api#testing-utilities', text: 'Testing Utilities' },
            { link: '/eventit/api#createtestbus', text: 'createTestBus()' },
          ],
          link: '/eventit/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/eventit/examples/awaiting-a-one-time-event', text: 'Awaiting a one-time event' },
            { link: '/eventit/examples/custom-error-boundary', text: 'Custom error boundary' },
            { link: '/eventit/examples/handling-disposal-in-async-code', text: 'Handling disposal in async code' },
            { link: '/eventit/examples/inspecting-listener-counts', text: 'Inspecting listener counts' },
            { link: '/eventit/examples/module-level-bus', text: 'Module-level bus' },
            { link: '/eventit/examples/request-scoping', text: 'Request scoping' },
            { link: '/eventit/examples/standalone-entry', text: 'Standalone entry' },
            { link: '/eventit/examples/streaming-with-events', text: 'Streaming with `events()`' },
            { link: '/eventit/examples/testing-with-createtestbus', text: 'Testing with `createTestBus`' },
          ],
          link: '/eventit/examples',
          text: 'Examples',
        },
      ],
      '/fetchit/': [
        { link: '/fetchit/', text: 'Overview' },
        {
          items: [
            { link: '/fetchit/usage#http-client', text: 'HTTP Client' },
            { link: '/fetchit/usage#cancelling-in-flight-requests', text: 'cancelAll' },
            { link: '/fetchit/usage#request-deduplication', text: 'Request Deduplication' },
            { link: '/fetchit/usage#interceptors', text: 'Interceptors' },
            { link: '/fetchit/usage#query-client', text: 'Query Client' },
            { link: '/fetchit/usage#prefetch', text: 'Prefetch' },
            { link: '/fetchit/usage#conditional-fetching', text: 'Conditional Fetching' },
            { link: '/fetchit/usage#seeding-cache-data', text: 'initialData / placeholderData' },
            { link: '/fetchit/usage#background-revalidation', text: 'refetchOnFocus / refetchOnReconnect' },
            { link: '/fetchit/usage#standalone-mutation', text: 'Standalone Mutation' },
            { link: '/fetchit/usage#lifecycle-callbacks', text: 'Lifecycle Callbacks' },
            { link: '/fetchit/usage#cancellation', text: 'Cancellation' },
            { link: '/fetchit/usage#error-handling', text: 'Error Handling' },
            { link: '/fetchit/usage#common-patterns', text: 'Common Patterns' },
          ],
          link: '/fetchit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/fetchit/api#createapi', text: 'createApi()' },
            { link: '/fetchit/api#createquery', text: 'createQuery()' },
            { link: '/fetchit/api#createmutation', text: 'createMutation()' },
            { link: '/fetchit/api#httperror', text: 'HttpError' },
            { link: '/fetchit/api#query-options', text: 'Query Options' },
            { link: '/fetchit/api#types', text: 'Types' },
          ],
          link: '/fetchit/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/fetchit/examples/authentication', text: 'Authentication' },
            { link: '/fetchit/examples/crud-operations', text: 'CRUD Operations' },
            { link: '/fetchit/examples/disposal', text: 'Disposal' },
            { link: '/fetchit/examples/error-handling-patterns', text: 'Error Handling Patterns' },
            { link: '/fetchit/examples/file-uploads', text: 'File Uploads' },
            { link: '/fetchit/examples/mutation-cancel', text: 'Mutation Cancellation' },
            { link: '/fetchit/examples/optimistic-updates', text: 'Optimistic Updates' },
            { link: '/fetchit/examples/polling', text: 'Polling' },
            { link: '/fetchit/examples/query-callbacks', text: 'Query Subscriptions' },
          ],
          link: '/fetchit/examples',
          text: 'Examples',
        },
      ],
      '/floatit/': [
        { link: '/floatit/', text: 'Overview' },
        {
          items: [
            { link: '/floatit/usage#positioning-apis', text: 'Positioning APIs' },
            { link: '/floatit/usage#float', text: 'float' },
            { link: '/floatit/usage#computeposition', text: 'computePosition' },
            { link: '/floatit/usage#middleware-model', text: 'Middleware Model' },
            { link: '/floatit/usage#built-in-middleware', text: 'Built-in Middleware' },
            { link: '/floatit/usage#middleware-order', text: 'Middleware Order' },
            { link: '/floatit/usage#virtual-references', text: 'Virtual References' },
            { link: '/floatit/usage#autoupdate', text: 'autoUpdate' },
          ],
          link: '/floatit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/floatit/api#core-functions', text: 'Core Functions' },
            { link: '/floatit/api#middlewares', text: 'Middlewares' },
            { link: '/floatit/api#types', text: 'Types' },
          ],
          link: '/floatit/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/floatit/examples/context-menu', text: 'Context Menu' },
            { link: '/floatit/examples/custom-middleware', text: 'Custom Middleware' },
            { link: '/floatit/examples/dropdown-select', text: 'Dropdown / Select' },
            { link: '/floatit/examples/popover-with-arrow', text: 'Popover with Arrow' },
            { link: '/floatit/examples/tooltip', text: 'Tooltip' },
            { link: '/floatit/examples/with-craftit-component', text: 'With Craftit Component' },
          ],
          link: '/floatit/examples',
          text: 'Examples',
        },
      ],
      '/formit/': [
        { link: '/formit/', text: 'Overview' },
        {
          items: [
            { link: '/formit/usage#basic-usage', text: 'Basic Usage' },
            { link: '/formit/usage#typed-paths', text: 'Typed Paths' },
            { link: '/formit/usage#validation', text: 'Validation' },
            { link: '/formit/usage#submission', text: 'Submission' },
            { link: '/formit/usage#subscriptions-and-watch', text: 'Subscriptions and Watch' },
            { link: '/formit/usage#bind', text: 'Bind' },
            { link: '/formit/usage#reset-replace-and-remove', text: 'Reset, Replace, and Remove' },
            { link: '/formit/usage#arrays-and-files', text: 'Arrays and Files' },
            { link: '/formit/usage#best-practices', text: 'Best Practices' },
          ],
          link: '/formit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/formit/api#api-at-a-glance', text: 'At a Glance' },
            { link: '/formit/api#package-entry-point', text: 'Entry Point' },
            { link: '/formit/api#createform', text: 'createForm()' },
            { link: '/formit/api#values', text: 'Values' },
            { link: '/formit/api#field-state', text: 'Field State' },
            { link: '/formit/api#error-management', text: 'Error Management' },
            { link: '/formit/api#touch', text: 'Touch' },
            { link: '/formit/api#validation', text: 'Validation' },
            { link: '/formit/api#validation-mode', text: 'Validation Mode' },
            { link: '/formit/api#submit', text: 'Submit' },
            { link: '/formit/api#subscriptions', text: 'Subscriptions' },
            { link: '/formit/api#watch', text: 'Watch' },
            { link: '/formit/api#bind', text: 'Bind' },
            { link: '/formit/api#arrays', text: 'Arrays' },
            { link: '/formit/api#reset-and-replace', text: 'Reset and Replace' },
            { link: '/formit/api#lifecycle', text: 'Lifecycle' },
            { link: '/formit/api#standalone-utilities', text: 'Standalone Utilities' },
            { link: '/formit/api#error-classes', text: 'Error Classes' },
            { link: '/formit/api#exported-types', text: 'Exported Types' },
          ],
          link: '/formit/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/formit/examples/contact-form-with-file-upload', text: 'Contact Form with File Upload' },
            { link: '/formit/examples/dynamic-form-fields', text: 'Dynamic Form Fields' },
            { link: '/formit/examples/form-with-conditional-fields', text: 'Form with Conditional Fields' },
            { link: '/formit/examples/login-form', text: 'Login Form' },
            { link: '/formit/examples/multi-step-wizard', text: 'Multi-Step Wizard' },
            { link: '/formit/examples/registration-form', text: 'Registration Form' },
            { link: '/formit/examples/search-form-with-debounce', text: 'Search Form with Debounce' },
          ],
          link: '/formit/examples',
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
      '/i18nit/': [
        { link: '/i18nit/', text: 'Overview' },
        {
          items: [
            { link: '/i18nit/usage#basic-usage', text: 'Basic Usage' },
            { link: '/i18nit/usage#message-shape', text: 'Message Shape' },
            { link: '/i18nit/usage#variable-interpolation', text: 'Interpolation' },
            { link: '/i18nit/usage#pluralisation', text: 'Pluralisation' },
            { link: '/i18nit/usage#fallback-resolution', text: 'Fallback Resolution' },
            { link: '/i18nit/usage#async-loading', text: 'Async Loading' },
            { link: '/i18nit/usage#catalog-management', text: 'Catalog Management' },
            { link: '/i18nit/usage#locale-and-catalog-metadata', text: 'Locale Metadata' },
            { link: '/i18nit/usage#formatting', text: 'Formatting' },
            { link: '/i18nit/usage#subscriptions', text: 'Subscriptions' },
            { link: '/i18nit/usage#diagnostics-and-missing-keys', text: 'Diagnostics' },
            { link: '/i18nit/usage#lifecycle-and-disposal', text: 'Lifecycle' },
            { link: '/i18nit/usage#server-side-and-request-scope', text: 'Server / SSR' },
            { link: '/i18nit/usage#best-practices', text: 'Best Practices' },
          ],
          link: '/i18nit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/i18nit/api#api-at-a-glance', text: 'At a Glance' },
            { link: '/i18nit/api#package-entry-point', text: 'Entry Point' },
            { link: '/i18nit/api#types', text: 'Types' },
            { link: '/i18nit/api#createi18n', text: 'createI18n()' },
            { link: '/i18nit/api#i18n-interface', text: 'I18n Interface' },
            { link: '/i18nit/api#type-guards', text: 'Type Guards' },
            { link: '/i18nit/api#runtime-semantics', text: 'Runtime Semantics' },
            { link: '/i18nit/api#message-shape', text: 'Message Shape' },
          ],
          link: '/i18nit/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/i18nit/examples/shared-instance-setup', text: 'Shared Instance Setup' },
            { link: '/i18nit/examples/locale-switcher', text: 'Locale Switcher' },
            { link: '/i18nit/examples/prefixed-translation-helper', text: 'Prefixed Translation Helper' },
            { link: '/i18nit/examples/per-request-locale-handling', text: 'Per-request Locale Handling' },
            { link: '/i18nit/examples/catalog-replacement', text: 'Catalog Replacement' },
            { link: '/i18nit/examples/async-loading-and-reload', text: 'Async Loading and Preload' },
            { link: '/i18nit/examples/ssr-rendering', text: 'SSR Rendering' },
            { link: '/i18nit/examples/diagnostics-hook', text: 'Diagnostics Hook' },
          ],
          link: '/i18nit/examples',
          text: 'Examples',
        },
      ],
      '/logit/': [
        { link: '/logit/', text: 'Overview' },
        {
          items: [
            { link: '/logit/usage#logger-instances', text: 'Logger Instances' },
            { link: '/logit/usage#configuration', text: 'Configuration' },
            { link: '/logit/usage#logging-methods', text: 'Logging Methods' },
            { link: '/logit/usage#scoped-loggers', text: 'Scoped Loggers' },
            { link: '/logit/usage#child-loggers', text: 'Child Loggers' },
            { link: '/logit/usage#remote-logging', text: 'Remote Logging' },
            { link: '/logit/usage#best-practices', text: 'Best Practices' },
            { link: '/logit/usage#testing', text: 'Testing' },
          ],
          link: '/logit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/logit/api#createloggerinitial', text: 'createLogger()' },
            { link: '/logit/api#logit-object', text: 'Logit Object' },
            { link: '/logit/api#types', text: 'Types' },
          ],
          link: '/logit/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/logit/examples/child-logger-overrides', text: 'Child Logger Overrides' },
            { link: '/logit/examples/module-logger-pattern', text: 'Module Logger Pattern' },
            { link: '/logit/examples/production-setup', text: 'Production Setup' },
            { link: '/logit/examples/react-integration', text: 'React Integration' },
            { link: '/logit/examples/request-middleware', text: 'Request Middleware' },
            { link: '/logit/examples/testing', text: 'Testing' },
            { link: '/logit/examples/timing-and-grouping', text: 'Timing and Grouping' },
          ],
          link: '/logit/examples',
          text: 'Examples',
        },
      ],
      '/mcpit/': [
        { link: '/mcpit/', text: 'Overview' },
        {
          items: [
            { link: '/mcpit/usage#quick-setup-from-a-monorepo-checkout', text: 'Setup' },
            { link: '/mcpit/usage#transport-modes', text: 'Transport' },
            { link: '/mcpit/usage#connecting-claude-desktop', text: 'Claude Desktop' },
            { link: '/mcpit/usage#connecting-github-copilot-chat', text: 'Copilot Chat' },
            { link: '/mcpit/usage#how-documentation-lookup-works', text: 'Docs Lookup' },
          ],
          link: '/mcpit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/mcpit/api#api-at-a-glance', text: 'At a Glance' },
            { link: '/mcpit/api#tools', text: 'Tools' },
            { link: '/mcpit/api#list-packages', text: 'list-packages' },
            { link: '/mcpit/api#search-packages', text: 'search-packages' },
            { link: '/mcpit/api#get-ai-context', text: 'get-ai-context' },
            { link: '/mcpit/api#list-docs-pages', text: 'list-docs-pages' },
            { link: '/mcpit/api#get-docs', text: 'get-docs' },
            { link: '/mcpit/api#get-package-api', text: 'get-package-api' },
            { link: '/mcpit/api#list-components', text: 'list-components' },
            { link: '/mcpit/api#get-component', text: 'get-component' },
            { link: '/mcpit/api#resources', text: 'Resources' },
            { link: '/mcpit/api#input-validation', text: 'Input Validation' },
            { link: '/mcpit/api#error-handling', text: 'Error Handling' },
          ],
          link: '/mcpit/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/mcpit/examples/listing-packages', text: 'Listing Packages' },
            { link: '/mcpit/examples/searching-packages', text: 'Searching Packages' },
            { link: '/mcpit/examples/ai-context', text: 'AI Context' },
            { link: '/mcpit/examples/looking-up-components', text: 'Looking Up Components' },
            { link: '/mcpit/examples/reading-docs', text: 'Reading Docs' },
            { link: '/mcpit/examples/inspector', text: 'Inspector' },
          ],
          link: '/mcpit/examples',
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
      '/routeit/': [
        { link: '/routeit/', text: 'Overview' },
        {
          items: [
            { link: '/routeit/usage#create-a-router', text: 'Create a Router' },
            { link: '/routeit/usage#define-routes-once', text: 'Define Routes Once' },
            { link: '/routeit/usage#route-context', text: 'Route Context' },
            { link: '/routeit/usage#middleware', text: 'Middleware' },
            { link: '/routeit/usage#guards', text: 'Guards' },
            { link: '/routeit/usage#data-loading', text: 'Data Loading' },
            { link: '/routeit/usage#error-boundaries', text: 'Error Boundaries' },
            { link: '/routeit/usage#navigation', text: 'Navigation' },
            { link: '/routeit/usage#same-url-deduplication', text: 'Same-URL Deduplication' },
            { link: '/routeit/usage#urls-and-active-state', text: 'URLs and Active State' },
            { link: '/routeit/usage#resolve-without-navigating', text: 'Resolve Without Navigating' },
            { link: '/routeit/usage#state-and-subscriptions', text: 'State and Subscriptions' },
            { link: '/routeit/usage#cleanup', text: 'Cleanup' },
          ],
          link: '/routeit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/routeit/api#createrouteroptions', text: 'createRouter()' },
            { link: '/routeit/api#route-table', text: 'Route Table' },
            { link: '/routeit/api#route-definition', text: 'Route Definition' },
            { link: '/routeit/api#createbrowserhistory', text: 'createBrowserHistory()' },
            { link: '/routeit/api#router', text: 'Router' },
            { link: '/routeit/api#core-types', text: 'Core Types' },
            { link: '/routeit/api#pattern-rules', text: 'Pattern Rules' },
            { link: '/routeit/api#design-notes', text: 'Design Notes' },
          ],
          link: '/routeit/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/routeit/examples/route-table-basics', text: 'Route Table Basics' },
            { link: '/routeit/examples/react-integration', text: 'React Integration' },
            { link: '/routeit/examples/vue-integration', text: 'Vue Integration' },
            { link: '/routeit/examples/svelte-integration', text: 'Svelte Integration' },
            { link: '/routeit/examples/auth-and-guards', text: 'Auth and Guards' },
            { link: '/routeit/examples/not-found-and-error-boundary', text: 'Not Found and Error Boundary' },
            { link: '/routeit/examples/base-path-deployment', text: 'Base Path Deployment' },
            { link: '/routeit/examples/raw-path-targets', text: 'Raw Path Targets' },
            { link: '/routeit/examples/same-url-deduplication', text: 'Same-URL Deduplication' },
            { link: '/routeit/examples/page-titles-from-meta', text: 'Page Titles from Meta' },
            { link: '/routeit/examples/view-transitions', text: 'View Transitions' },
          ],
          link: '/routeit/examples',
          text: 'Examples',
        },
      ],
      '/sourceit/': [
        { link: '/sourceit/', text: 'Overview' },
        {
          items: [
            { link: '/sourceit/usage#create-a-local-source', text: 'Local Source' },
            { link: '/sourceit/usage#create-a-remote-source', text: 'Remote Source' },
            { link: '/sourceit/usage#read-model', text: 'Read Model' },
            { link: '/sourceit/usage#url-query-param-sync', text: 'Query Param Sync' },
            { link: '/sourceit/usage#selector-subscriptions', text: 'Selector Subscriptions' },
            { link: '/sourceit/usage#framework-integration', text: 'Framework Integration' },
            { link: '/sourceit/usage#local-source-in-ui-state', text: 'Local Source in UI State' },
            { link: '/sourceit/usage#remote-source-with-async-lifecycle', text: 'Remote Source Async Lifecycle' },
            { link: '/sourceit/usage#best-practices', text: 'Best Practices' },
          ],
          link: '/sourceit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/sourceit/api#core-factories', text: 'Core Factories' },
            { link: '/sourceit/api#shared-source-shape', text: 'Shared Source Shape' },
            { link: '/sourceit/api#localsource-methods', text: 'LocalSource Methods' },
            { link: '/sourceit/api#remotesource-methods', text: 'RemoteSource Methods' },
            { link: '/sourceit/api#utilities', text: 'Utilities' },
            { link: '/sourceit/api#types', text: 'Types' },
          ],
          link: '/sourceit/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/sourceit/examples/local-pagination-and-filtering', text: 'Local Pagination and Filtering' },
            { link: '/sourceit/examples/sourceit-with-stateit', text: 'Reactive Controls with Stateit' },
            { link: '/sourceit/examples/remote-search-with-url-state', text: 'Remote Search with URL State' },
            { link: '/sourceit/examples/sourceit-with-fetchit', text: 'Remote Data with Fetchit' },
            { link: '/sourceit/examples/sourceit-with-routeit', text: 'URL-Synced List with Routeit' },
          ],
          link: '/sourceit/examples',
          text: 'Examples',
        },
      ],
      '/stateit/': [
        { link: '/stateit/', text: 'Overview' },
        {
          items: [
            { link: '/stateit/usage#signals', text: 'Signals' },
            { link: '/stateit/usage#effects', text: 'Effects' },
            { link: '/stateit/usage#computed', text: 'Computed' },
            { link: '/stateit/usage#derived', text: 'derived' },
            { link: '/stateit/usage#writable', text: 'writable' },
            { link: '/stateit/usage#watch-signals', text: 'watch' },
            { link: '/stateit/usage#batch-signals', text: 'batch' },
            { link: '/stateit/usage#stores', text: 'Stores' },
            { link: '/stateit/usage#derived-slices', text: 'Derived Slices' },
            { link: '/stateit/usage#watching-state', text: 'Watching State' },
            { link: '/stateit/usage#batching', text: 'Batching' },
            { link: '/stateit/usage#global-configuration', text: 'Configuration' },
            { link: '/stateit/usage#testing', text: 'Testing' },
          ],
          link: '/stateit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/stateit/api#signal-primitives', text: 'Signal Primitives' },
            { link: '/stateit/api#store-functions', text: 'Store Functions' },
            { link: '/stateit/api#signal-types', text: 'Signal Types' },
            { link: '/stateit/api#store-types', text: 'Store Types' },
            { link: '/stateit/api#notification-timing', text: 'Notification Timing' },
            { link: '/stateit/api#testing-utilities', text: 'Testing Utilities' },
          ],
          link: '/stateit/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/stateit/examples/signals', text: 'Signals' },
            { link: '/stateit/examples/stores', text: 'Stores' },
            {
              link: '/stateit/examples/pattern-batch-for-complex-mutations',
              text: 'Pattern: Batch for Complex Mutations',
            },
            {
              link: '/stateit/examples/pattern-nextvalue-in-async-workflows',
              text: 'Pattern: `nextValue` in Async Workflows',
            },
            { link: '/stateit/examples/pattern-shared-module-store', text: 'Pattern: Shared Module Store' },
          ],
          link: '/stateit/examples',
          text: 'Examples',
        },
      ],
      '/timit/': [
        { link: '/timit/', text: 'Overview' },
        {
          items: [
            { link: '/timit/usage#parsing-inputs', text: 'Parsing Inputs' },
            { link: '/timit/usage#time-zone-conversion', text: 'Time Zone Conversion' },
            { link: '/timit/usage#date-time-arithmetic', text: 'Date-Time Arithmetic' },
            { link: '/timit/usage#duration-differences', text: 'Duration Differences' },
            { link: '/timit/usage#formatting', text: 'Formatting' },
            { link: '/timit/usage#range-queries', text: 'Range Queries' },
            { link: '/timit/usage#current-time', text: 'Current Time' },
            { link: '/timit/usage#format-ranges', text: 'Format Ranges' },
            { link: '/timit/usage#best-practices', text: 'Best Practices' },
            { link: '/timit/usage#common-patterns', text: 'Common Patterns' },
          ],
          link: '/timit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/timit/api#at-a-glance', text: 'At a Glance' },
            { link: '/timit/api#namespace-import', text: 'Namespace Import' },
            { link: '/timit/api#conversion-functions', text: 'Conversion' },
            { link: '/timit/api#arithmetic-functions', text: 'Arithmetic' },
            { link: '/timit/api#query-functions', text: 'Queries' },
            { link: '/timit/api#formatting-functions', text: 'Formatting' },
            { link: '/timit/api#types', text: 'Types' },
          ],
          link: '/timit/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/timit/examples/timezone-conversion', text: 'Timezone Conversion' },
            { link: '/timit/examples/dst-safe-arithmetic', text: 'DST-safe Arithmetic' },
            { link: '/timit/examples/locale-formatting', text: 'Locale Formatting' },
          ],
          link: '/timit/examples',
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
                { link: '/sourceit/examples/local-pagination-and-filtering', text: 'Sourceit: local source' },
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
      '/validit/': [
        { link: '/validit/', text: 'Overview' },
        {
          items: [
            { link: '/validit/usage#basic-usage', text: 'Basic Usage' },
            { link: '/validit/usage#schema-factories', text: 'Schema Factories' },
            { link: '/validit/usage#primitive-schemas', text: 'Primitives' },
            { link: '/validit/usage#objects-arrays-tuples-and-records', text: 'Objects and Collections' },
            { link: '/validit/usage#union-intersect-and-variant', text: 'Union, Intersect, and Variant' },
            { link: '/validit/usage#parsing-and-validation-flow', text: 'Parsing Flow' },
            { link: '/validit/usage#optional-nullable-default-and-catch', text: 'Optional, Default, and Catch' },
            { link: '/validit/usage#transforms-preprocess-and-branding', text: 'Transforms and Preprocess' },
            { link: '/validit/usage#async-validation', text: 'Async Validation' },
            { link: '/validit/usage#error-handling', text: 'Error Handling' },
            { link: '/validit/usage#message-customization', text: 'Message Customization' },
            { link: '/validit/usage#type-inference', text: 'Type Inference' },
            { link: '/validit/usage#best-practices', text: 'Best Practices' },
          ],
          link: '/validit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/validit/api#most-used-first', text: 'Most Used First' },
            { link: '/validit/api#package-exports', text: 'Package Exports' },
            { link: '/validit/api#v-namespace', text: 'v Namespace' },
            { link: '/validit/api#schema', text: 'Schema' },
            { link: '/validit/api#stringschema', text: 'StringSchema' },
            { link: '/validit/api#numberschema', text: 'NumberSchema' },
            { link: '/validit/api#dateschema', text: 'DateSchema' },
            { link: '/validit/api#arrayschema', text: 'ArraySchema' },
            { link: '/validit/api#objectschema', text: 'ObjectSchema' },
            { link: '/validit/api#tupleschema', text: 'TupleSchema' },
            { link: '/validit/api#recordschema', text: 'RecordSchema' },
            { link: '/validit/api#unionschema', text: 'UnionSchema' },
            { link: '/validit/api#intersectschema', text: 'IntersectSchema' },
            { link: '/validit/api#variantschema', text: 'VariantSchema' },
            { link: '/validit/api#global-messages', text: 'Global Messages' },
            { link: '/validit/api#types', text: 'Types' },
            { link: '/validit/api#errors', text: 'Errors' },
          ],
          link: '/validit/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/validit/examples/forms', text: 'Forms' },
            { link: '/validit/examples/api', text: 'API' },
            { link: '/validit/examples/async', text: 'Async' },
            { link: '/validit/examples/unions', text: 'Unions & Variant' },
          ],
          link: '/validit/examples',
          text: 'Examples',
        },
      ],
      '/virtualit/': [
        { link: '/virtualit/', text: 'Overview' },
        {
          items: [
            { link: '/virtualit/usage#dom-layout-requirements', text: 'DOM Layout' },
            { link: '/virtualit/usage#fixed-heights', text: 'Fixed Heights' },
            { link: '/virtualit/usage#variable-heights-estimator', text: 'Variable Heights (Estimator)' },
            { link: '/virtualit/usage#variable-heights-measured', text: 'Variable Heights' },
            { link: '/virtualit/usage#overscan', text: 'Overscan' },
            { link: '/virtualit/usage#updating-the-count', text: 'Updating Count' },
            { link: '/virtualit/usage#switching-row-density', text: 'Row Density' },
            { link: '/virtualit/usage#programmatic-scrolling', text: 'Programmatic Scrolling' },
            { link: '/virtualit/usage#invalidating-measurements', text: 'Invalidating Measurements' },
            { link: '/virtualit/usage#lifecycle-attach-and-destroy', text: 'Lifecycle' },
            { link: '/virtualit/usage#explicit-resource-management', text: 'Resource Management' },
            { link: '/virtualit/usage#framework-integration', text: 'Framework Integration' },
          ],
          link: '/virtualit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/virtualit/api#package-exports', text: 'Package Exports' },
            { link: '/virtualit/api#core-functions', text: 'Core Functions' },
            { link: '/virtualit/api#virtualizer-class', text: 'Virtualizer Class' },
            { link: '/virtualit/api#properties', text: 'Properties' },
            { link: '/virtualit/api#methods', text: 'Methods' },
            { link: '/virtualit/api#types', text: 'Types' },
          ],
          link: '/virtualit/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/virtualit/examples/basic-fixed-height-list', text: 'Basic Fixed-Height List' },
            {
              link: '/virtualit/examples/density-toggle-compact-comfortable',
              text: 'Density Toggle (Compact / Comfortable)',
            },
            {
              link: '/virtualit/examples/explicit-resource-management-using',
              text: 'Explicit Resource Management (`using`)',
            },
            { link: '/virtualit/examples/grouped-list-headers-plus-rows', text: 'Grouped List (Headers + Rows)' },
            { link: '/virtualit/examples/infinite-scroll-load-more', text: 'Infinite Scroll (Load More)' },
            { link: '/virtualit/examples/keyboard-navigation', text: 'Keyboard Navigation' },
            { link: '/virtualit/examples/restore-scroll-position', text: 'Restore Scroll Position' },
            {
              link: '/virtualit/examples/using-virtualizer-directly-without-createvirtualizer',
              text: 'Using `Virtualizer` Directly (Without `createVirtualizer`)',
            },
            { link: '/virtualit/examples/variable-height-with-measurement', text: 'Variable Height with Measurement' },
          ],
          link: '/virtualit/examples',
          text: 'Examples',
        },
      ],
      '/wireit/': [
        { link: '/wireit/', text: 'Overview' },
        {
          items: [
            { link: '/wireit/usage#tokens', text: 'Tokens' },
            { link: '/wireit/usage#registration', text: 'Registration' },
            { link: '/wireit/usage#resolution', text: 'Resolution' },
            { link: '/wireit/usage#lifetimes', text: 'Lifetimes' },
            { link: '/wireit/usage#child-containers', text: 'Child Containers' },
            { link: '/wireit/usage#async-providers', text: 'Async Providers' },
            { link: '/wireit/usage#disposal', text: 'Disposal' },
          ],
          link: '/wireit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/wireit/api#createtokendescription', text: 'createToken()' },
            { link: '/wireit/api#createcontainer', text: 'createContainer()' },
            { link: '/wireit/api#container-registration', text: 'Registration' },
            { link: '/wireit/api#container-resolution', text: 'Resolution' },
            { link: '/wireit/api#container-lifecycle', text: 'Lifecycle' },
            { link: '/wireit/api#errors', text: 'Errors' },
            { link: '/wireit/api#types', text: 'Types' },
          ],
          link: '/wireit/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/wireit/examples/basic-setup', text: 'Basic Setup' },
            { link: '/wireit/examples/lifetimes', text: 'Lifetimes' },
            { link: '/wireit/examples/async-providers', text: 'Async Providers' },
            { link: '/wireit/examples/child-containers', text: 'Child Containers' },
            { link: '/wireit/examples/multi-providers', text: 'Multi Providers' },
            { link: '/wireit/examples/batch-resolution', text: 'Batch Resolution' },
            { link: '/wireit/examples/dispose-lifecycle', text: 'Dispose Lifecycle' },
          ],
          link: '/wireit/examples',
          text: 'Examples',
        },
      ],
      '/workit/': [
        { link: '/workit/', text: 'Overview' },
        {
          items: [
            { link: '/workit/usage#task-functions', text: 'Task Functions' },
            { link: '/workit/usage#single-worker', text: 'Single Worker' },
            { link: '/workit/usage#worker-pool', text: 'Worker Pool' },
            { link: '/workit/usage#timeouts', text: 'Timeouts' },
            { link: '/workit/usage#abortsignal', text: 'AbortSignal' },
            { link: '/workit/usage#transferables', text: 'Transferables' },
            { link: '/workit/usage#worker-status', text: 'Worker Status' },
            { link: '/workit/usage#isnative', text: 'isNative' },
            { link: '/workit/usage#fallback-mode', text: 'Fallback Mode' },
            { link: '/workit/usage#external-scripts', text: 'External Scripts' },
            { link: '/workit/usage#testing', text: 'Testing' },
          ],
          link: '/workit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/workit/api#package-exports', text: 'Package Exports' },
            { link: '/workit/api#types', text: 'Types' },
            { link: '/workit/api#createworker', text: 'createWorker()' },
            { link: '/workit/api#workerhandle-interface', text: 'WorkerHandle Interface' },
            { link: '/workit/api#error-classes', text: 'Error Classes' },
            { link: '/workit/api#testing-utilities', text: 'Testing Utilities' },
          ],
          link: '/workit/api',
          text: 'API Reference',
        },
        {
          items: [
            { link: '/workit/examples/cancellable-batch', text: 'Cancellable Batch' },
            { link: '/workit/examples/data-transformation-pipeline', text: 'Data Pipeline' },
            { link: '/workit/examples/fibonacci-with-pool-and-timeout', text: 'Fibonacci Pool' },
            { link: '/workit/examples/image-processing', text: 'Image Processing' },
            { link: '/workit/examples/react-integration', text: 'React Integration' },
            { link: '/workit/examples/testing-with-createtestworker', text: 'Testing' },
            { link: '/workit/examples/using-transferables', text: 'Using Transferables' },
          ],
          link: '/workit/examples',
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
        '@vielzeug/buildit': resolve(__dirname, '../../packages/buildit/src'),
        '@vielzeug/craftit': resolve(__dirname, '../../packages/craftit/src'),
        '@vielzeug/deposit': resolve(__dirname, '../../packages/deposit/src'),
        '@vielzeug/dragit': resolve(__dirname, '../../packages/dragit/src'),
        '@vielzeug/eventit': resolve(__dirname, '../../packages/eventit/src'),
        '@vielzeug/fetchit': resolve(__dirname, '../../packages/fetchit/src'),
        '@vielzeug/floatit': resolve(__dirname, '../../packages/floatit/src'),
        '@vielzeug/formit': resolve(__dirname, '../../packages/formit/src'),
        '@vielzeug/i18nit': resolve(__dirname, '../../packages/i18nit/src'),
        '@vielzeug/logit': resolve(__dirname, '../../packages/logit/src'),
        '@vielzeug/permit': resolve(__dirname, '../../packages/permit/src'),
        '@vielzeug/routeit': resolve(__dirname, '../../packages/routeit/src'),
        '@vielzeug/sourceit': resolve(__dirname, '../../packages/sourceit/src'),
        '@vielzeug/stateit': resolve(__dirname, '../../packages/stateit/src'),
        '@vielzeug/timit': resolve(__dirname, '../../packages/timit/src'),
        '@vielzeug/toolkit': resolve(__dirname, '../../packages/toolkit/src'),
        '@vielzeug/validit': resolve(__dirname, '../../packages/validit/src'),
        '@vielzeug/virtualit': resolve(__dirname, '../../packages/virtualit/src'),
        '@vielzeug/wireit': resolve(__dirname, '../../packages/wireit/src'),
        '@vielzeug/workit': resolve(__dirname, '../../packages/workit/src'),
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
