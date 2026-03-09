import browserslist from 'browserslist';
import { browserslistToTargets } from 'lightningcss';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type UserConfig } from 'vitepress';
import type { ThemeConfig } from './theme/types';
import { getPackagesData } from './theme/utils/packageData';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: '/',
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
          url: `vielzeug/${item.url}`, // Fix sitemap URLs
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
              { link: '/toolkit/', text: 'Toolkit' },
            ],
            text: 'Core & Utilities',
          },
          {
            items: [
              { link: '/deposit/', text: 'Deposit' },
              { link: '/eventit/', text: 'Eventit' },
              { link: '/fetchit/', text: 'Fetchit' },
              { link: '/stateit/', text: 'Stateit' },
            ],
            text: 'Data & State',
          },
          {
            items: [
              { link: '/craftit/', text: 'Craftit' },
              { link: '/floatit/', text: 'Floatit' },
              { link: '/formit/', text: 'Formit' },
              { link: '/i18nit/', text: 'i18nit' },
              { link: '/validit/', text: 'Validit' },
            ],
            text: 'Frontend & Logic',
          },
          {
            items: [
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
    sidebar: {
      '/buildit/': [
        { link: '/buildit/', text: 'Overview' },
        {
          items: [
            {
              link: '/buildit/usage',
              text: 'Usage Guide',
              collapsed: true,
              items: [
                { link: '/buildit/usage#import', text: 'Import' },
                { link: '/buildit/usage#basic-usage', text: 'Basic Usage' },
                { link: '/buildit/usage#slots', text: 'Slots' },
                { link: '/buildit/usage#accessibility', text: 'Accessibility' },
              ],
            },
            {
              link: '/buildit/frameworks',
              text: 'Framework Integration',
              collapsed: true,
              items: [
                { link: '/buildit/frameworks#react', text: 'React' },
                { link: '/buildit/frameworks#vue-3', text: 'Vue 3' },
                { link: '/buildit/frameworks#svelte', text: 'Svelte' },
                { link: '/buildit/frameworks#angular', text: 'Angular' },
                { link: '/buildit/frameworks#ssr-considerations', text: 'SSR' },
              ],
            },
            {
              link: '/buildit/theming',
              text: 'Theming',
              collapsed: true,
              items: [
                { link: '/buildit/theming#design-tokens', text: 'Design Tokens' },
                { link: '/buildit/theming#dark-mode', text: 'Dark Mode' },
                { link: '/buildit/theming#global-customization', text: 'Global Customization' },
                { link: '/buildit/theming#component-customization', text: 'Component Customization' },
              ],
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
                { link: '/buildit/components/badge', text: 'Badge' },
                { link: '/buildit/components/chip', text: 'Chip' },
                { link: '/buildit/components/progress', text: 'Progress' },
                { link: '/buildit/components/skeleton', text: 'Skeleton' },
                { link: '/buildit/components/toast', text: 'Toast' },
              ],
              text: 'Feedback',
            },
            {
              collapsed: true,
              items: [{ link: '/buildit/components/button', text: 'Button' }],
              text: 'Actions',
            },
            {
              collapsed: true,
              items: [
                { link: '/buildit/components/avatar', text: 'Avatar' },
                { link: '/buildit/components/breadcrumb', text: 'Breadcrumb' },
                { link: '/buildit/components/card', text: 'Card' },
                { link: '/buildit/components/pagination', text: 'Pagination' },
                { link: '/buildit/components/separator', text: 'Separator' },
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
              text: 'Form',
            },
            {
              collapsed: true,
              items: [
                { link: '/buildit/components/box', text: 'Box' },
                { link: '/buildit/components/grid', text: 'Grid' },
              ],
              text: 'Layout',
            },
          ],
          text: 'Components',
        },
        {
          items: [
            { link: '/buildit/api', text: 'API Reference' },
            { link: '/buildit/examples', text: 'Examples' },
          ],
          text: 'Reference',
        },
      ],
      '/craftit/': [
        { link: '/craftit/', text: 'Overview' },
        {
          items: [
            { link: '/craftit/usage#basic-usage', text: 'Basic Usage' },
            { link: '/craftit/usage#signals', text: 'Signals' },
            { link: '/craftit/usage#computed-signals', text: 'Computed Signals' },
            { link: '/craftit/usage#effects', text: 'Effects' },
            { link: '/craftit/usage#lifecycle-hooks', text: 'Lifecycle' },
            { link: '/craftit/usage#form-integration', text: 'Forms' },
          ],
          link: '/craftit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/craftit/api#core-functions', text: 'Core Functions' },
            { link: '/craftit/api#signals', text: 'Signals API' },
            { link: '/craftit/api#typescript-types', text: 'Types' },
          ],
          link: '/craftit/api',
          text: 'API Reference',
        },
        { link: '/craftit/examples', text: 'Examples' },
      ],
      '/deposit/': [
        { link: '/deposit/', text: 'Overview' },
        {
          items: [
            { link: '/deposit/usage#defining-a-schema', text: 'Defining a Schema' },
            { link: '/deposit/usage#creating-an-adapter', text: 'Creating an Adapter' },
            { link: '/deposit/usage#crud-operations', text: 'CRUD Operations' },
            { link: '/deposit/usage#query-builder', text: 'Query Builder' },
            { link: '/deposit/usage#ttl', text: 'TTL' },
            { link: '/deposit/usage#transactions', text: 'Transactions' },
            { link: '/deposit/usage#schema-migrations', text: 'Schema Migrations' },
          ],
          link: '/deposit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/deposit/api#factory-functions', text: 'Factory Functions' },
            { link: '/deposit/api#adapter-interface', text: 'Adapter Interface' },
            { link: '/deposit/api#indexeddbhandle', text: 'IndexedDBHandle' },
            { link: '/deposit/api#querybuilder', text: 'QueryBuilder' },
            { link: '/deposit/api#types', text: 'Types' },
          ],
          link: '/deposit/api',
          text: 'API Reference',
        },
        { link: '/deposit/examples', text: 'Examples' },
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
            { link: '/eventit/api#types', text: 'Types' },
            { link: '/eventit/api#createbus', text: 'createBus()' },
            { link: '/eventit/api#bus-interface', text: 'Bus Interface' },
            { link: '/eventit/api#testing-utilities', text: 'Testing Utilities' },
          ],
          link: '/eventit/api',
          text: 'API Reference',
        },
        { link: '/eventit/examples', text: 'Examples' },
      ],
      '/fetchit/': [
        { link: '/fetchit/', text: 'Overview' },
        {
          items: [
            { link: '/fetchit/usage#http-client', text: 'HTTP Client' },
            { link: '/fetchit/usage#interceptors', text: 'Interceptors' },
            { link: '/fetchit/usage#query-client', text: 'Query Client' },
            { link: '/fetchit/usage#standalone-mutation', text: 'Standalone Mutation' },
            { link: '/fetchit/usage#error-handling', text: 'Error Handling' },
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
            { link: '/fetchit/api#types', text: 'Types' },
          ],
          link: '/fetchit/api',
          text: 'API Reference',
        },
        { link: '/fetchit/examples', text: 'Examples' },
      ],
      '/floatit/': [
        { link: '/floatit/', text: 'Overview' },
        {
          items: [
            { link: '/floatit/usage#placement', text: 'Placement' },
            { link: '/floatit/usage#positionfloat', text: 'positionFloat' },
            { link: '/floatit/usage#computeposition', text: 'computePosition' },
            { link: '/floatit/usage#middleware', text: 'Middleware' },
            { link: '/floatit/usage#autoupdate', text: 'autoUpdate' },
            { link: '/floatit/usage#common-patterns', text: 'Common Patterns' },
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
        { link: '/floatit/examples', text: 'Examples' },
      ],
      '/formit/': [
        { link: '/formit/', text: 'Overview' },
        {
          items: [
            { link: '/formit/usage#basic-usage', text: 'Basic Usage' },
            { link: '/formit/usage#validation', text: 'Validation' },
            { link: '/formit/usage#submission', text: 'Submission' },
            { link: '/formit/usage#subscriptions', text: 'Subscriptions' },
            { link: '/formit/usage#bind', text: 'Bind' },
            { link: '/formit/usage#reset', text: 'Reset' },
            { link: '/formit/usage#file-uploads', text: 'File Uploads' },
            { link: '/formit/usage#advanced-patterns', text: 'Advanced Patterns' },
            { link: '/formit/usage#best-practices', text: 'Best Practices' },
          ],
          link: '/formit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/formit/api#createform-init', text: 'createForm()' },
            { link: '/formit/api#values', text: 'Values' },
            { link: '/formit/api#validation', text: 'Validation' },
            { link: '/formit/api#submit', text: 'Submit' },
            { link: '/formit/api#subscriptions', text: 'Subscriptions' },
            { link: '/formit/api#exported-types', text: 'Types' },
          ],
          link: '/formit/api',
          text: 'API Reference',
        },
        { link: '/formit/examples', text: 'Examples' },
      ],
      '/i18nit/': [
        { link: '/i18nit/', text: 'Overview' },
        {
          items: [
            { link: '/i18nit/usage#basic-usage', text: 'Basic Usage' },
            { link: '/i18nit/usage#variable-interpolation', text: 'Interpolation' },
            { link: '/i18nit/usage#pluralisation', text: 'Pluralisation' },
            { link: '/i18nit/usage#async-loading', text: 'Async Loading' },
            { link: '/i18nit/usage#scoping', text: 'Scope & withLocale' },
            { link: '/i18nit/usage#formatting-helpers', text: 'Formatting' },
            { link: '/i18nit/usage#subscriptions', text: 'Subscriptions' },
          ],
          link: '/i18nit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/i18nit/api#types', text: 'Types' },
            { link: '/i18nit/api#createi18n', text: 'createI18n()' },
            { link: '/i18nit/api#i18n-instance', text: 'I18n Instance' },
            { link: '/i18nit/api#boundi18n', text: 'BoundI18n' },
          ],
          link: '/i18nit/api',
          text: 'API Reference',
        },
        { link: '/i18nit/examples', text: 'Examples' },
      ],
      '/logit/': [
        { link: '/logit/', text: 'Overview' },
        {
          items: [
            { link: '/logit/usage#configuration', text: 'Configuration' },
            { link: '/logit/usage#logging-methods', text: 'Logging Methods' },
            { link: '/logit/usage#scoped-loggers', text: 'Scoped Loggers' },
            { link: '/logit/usage#remote-logging', text: 'Remote Logging' },
          ],
          link: '/logit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/logit/api#logit-object', text: 'Logit Object' },
            { link: '/logit/api#types', text: 'Types' },
          ],
          link: '/logit/api',
          text: 'API Reference',
        },
        { link: '/logit/examples', text: 'Examples' },
      ],
      '/permit/': [
        { link: '/permit/', text: 'Overview' },
        {
          items: [
            { link: '/permit/usage#import', text: 'Import' },
            { link: '/permit/usage#basic-setup', text: 'Basic Setup' },
            { link: '/permit/usage#registering-permissions-with-define', text: 'define()' },
            { link: '/permit/usage#wildcards', text: 'Wildcards' },
          ],
          link: '/permit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/permit/api#createpermit', text: 'createPermit()' },
            { link: '/permit/api#permit-t-d-class', text: 'Permit Class' },
            { link: '/permit/api#constants', text: 'Constants' },
            { link: '/permit/api#types', text: 'Types' },
          ],
          link: '/permit/api',
          text: 'API Reference',
        },
        { link: '/permit/examples', text: 'Examples' },
      ],
      '/routeit/': [
        { link: '/routeit/', text: 'Overview' },
        {
          items: [
            { link: '/routeit/usage#why-routeit', text: 'Why Routeit?' },
            { link: '/routeit/usage#basic-usage', text: 'Basic Usage' },
            { link: '/routeit/usage#route-groups', text: 'Route Groups' },
            { link: '/routeit/usage#middleware', text: 'Middleware' },
            { link: '/routeit/usage#navigation', text: 'Navigation' },
            { link: '/routeit/usage#named-routes', text: 'Named Routes' },
            { link: '/routeit/usage#error-handling', text: 'Error Handling' },
          ],
          link: '/routeit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/routeit/api#createrouter-options', text: 'createRouter()' },
            { link: '/routeit/api#router', text: 'Router' },
            { link: '/routeit/api#types', text: 'Types' },
            { link: '/routeit/api#pattern-matching', text: 'Pattern Matching' },
          ],
          link: '/routeit/api',
          text: 'API Reference',
        },
        { link: '/routeit/examples', text: 'Examples' },
      ],
      '/stateit/': [
        { link: '/stateit/', text: 'Overview' },
        {
          items: [
            { link: '/stateit/usage#signals', text: 'Signals' },
            { link: '/stateit/usage#effects', text: 'Effects' },
            { link: '/stateit/usage#computed', text: 'Computed' },
            { link: '/stateit/usage#writable', text: 'writable' },
            { link: '/stateit/usage#watch', text: 'watch' },
            { link: '/stateit/usage#batch', text: 'batch' },
            { link: '/stateit/usage#stores', text: 'Stores' },
            { link: '/stateit/usage#derived-slices', text: 'Derived Slices' },
            { link: '/stateit/usage#watching-state', text: 'Watching State' },
            { link: '/stateit/usage#batching', text: 'Batching' },
            { link: '/stateit/usage#disposing', text: 'Disposing' },
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
          ],
          link: '/stateit/api',
          text: 'API Reference',
        },
        { link: '/stateit/examples', text: 'Examples' },
      ],
      '/toolkit/': [
        { link: '/toolkit/', text: 'Overview' },
        {
          items: [
            { link: '/toolkit/usage#basic-usage', text: 'Basic Usage' },
            { link: '/toolkit/usage#advanced-usage', text: 'Advanced Usage' },
            { link: '/toolkit/usage#performance-tips', text: 'Performance' },
          ],
          link: '/toolkit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/toolkit/api#array-utilities', text: 'Array' },
            { link: '/toolkit/api#object-utilities', text: 'Object' },
            { link: '/toolkit/api#string-utilities', text: 'String' },
            { link: '/toolkit/api#function-utilities', text: 'Function' },
            { link: '/toolkit/api#math-utilities', text: 'Math' },
            { link: '/toolkit/api#typed-utilities', text: 'Typed' },
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
                { link: '/toolkit/examples/array/contains', text: 'contains' },
                { link: '/toolkit/examples/array/fold', text: 'fold' },
                { link: '/toolkit/examples/array/group', text: 'group' },
                { link: '/toolkit/examples/array/keyBy', text: 'keyBy' },
                { link: '/toolkit/examples/array/list', text: 'list' },
                { link: '/toolkit/examples/array/pick', text: 'pick' },
                { link: '/toolkit/examples/array/remoteList', text: 'remoteList' },
                { link: '/toolkit/examples/array/replace', text: 'replace' },
                { link: '/toolkit/examples/array/rotate', text: 'rotate' },
                { link: '/toolkit/examples/array/search', text: 'search' },
                { link: '/toolkit/examples/array/select', text: 'select' },
                { link: '/toolkit/examples/array/sort', text: 'sort' },
                { link: '/toolkit/examples/array/toggle', text: 'toggle' },
                { link: '/toolkit/examples/array/uniq', text: 'uniq' },
              ],
              link: '/toolkit/examples/array',
              text: 'Array',
            },
            {
              collapsed: true,
              items: [
                { link: '/toolkit/examples/async/attempt', text: 'attempt' },
                { link: '/toolkit/examples/async/defer', text: 'defer' },
                { link: '/toolkit/examples/async/parallel', text: 'parallel' },
                { link: '/toolkit/examples/async/pool', text: 'pool' },
                { link: '/toolkit/examples/async/queue', text: 'queue' },
                { link: '/toolkit/examples/async/race', text: 'race' },
                { link: '/toolkit/examples/async/retry', text: 'retry' },
                { link: '/toolkit/examples/async/sleep', text: 'sleep' },
                { link: '/toolkit/examples/async/waitFor', text: 'waitFor' },
              ],
              link: '/toolkit/examples/async',
              text: 'Async',
            },
            {
              collapsed: true,
              items: [
                { link: '/toolkit/examples/string/camelCase', text: 'camelCase' },
                { link: '/toolkit/examples/string/kebabCase', text: 'kebabCase' },
                { link: '/toolkit/examples/string/pascalCase', text: 'pascalCase' },
                { link: '/toolkit/examples/string/similarity', text: 'similarity' },
                { link: '/toolkit/examples/string/snakeCase', text: 'snakeCase' },
                { link: '/toolkit/examples/string/truncate', text: 'truncate' },
              ],
              link: '/toolkit/examples/string',
              text: 'String',
            },
            {
              collapsed: true,
              items: [
                { link: '/toolkit/examples/object/cache', text: 'cache' },
                { link: '/toolkit/examples/object/diff', text: 'diff' },
                { link: '/toolkit/examples/object/merge', text: 'merge' },
                { link: '/toolkit/examples/object/parseJSON', text: 'parseJSON' },
                { link: '/toolkit/examples/object/path', text: 'path' },
                { link: '/toolkit/examples/object/proxy', text: 'proxy' },
                { link: '/toolkit/examples/object/prune', text: 'prune' },
                { link: '/toolkit/examples/object/seek', text: 'seek' },
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
                { link: '/toolkit/examples/function/assertParams', text: 'assertParams' },
                { link: '/toolkit/examples/function/compare', text: 'compare' },
                { link: '/toolkit/examples/function/compareBy', text: 'compareBy' },
                { link: '/toolkit/examples/function/compose', text: 'compose' },
                { link: '/toolkit/examples/function/curry', text: 'curry' },
                { link: '/toolkit/examples/function/debounce', text: 'debounce' },
                { link: '/toolkit/examples/function/fp', text: 'fp' },
                { link: '/toolkit/examples/function/memo', text: 'memo' },
                { link: '/toolkit/examples/function/once', text: 'once' },
                { link: '/toolkit/examples/function/pipe', text: 'pipe' },
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
                { link: '/toolkit/examples/math/distribute', text: 'distribute' },
                { link: '/toolkit/examples/math/linspace', text: 'linspace' },
                { link: '/toolkit/examples/math/max', text: 'max' },
                { link: '/toolkit/examples/math/median', text: 'median' },
                { link: '/toolkit/examples/math/min', text: 'min' },
                { link: '/toolkit/examples/math/percent', text: 'percent' },
                { link: '/toolkit/examples/math/range', text: 'range' },
                { link: '/toolkit/examples/math/round', text: 'round' },
                { link: '/toolkit/examples/math/sum', text: 'sum' },
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
                { link: '/toolkit/examples/typed/isEven', text: 'is.even' },
                { link: '/toolkit/examples/typed/isFunction', text: 'is.fn' },
                { link: '/toolkit/examples/typed/isMatch', text: 'is.match' },
                { link: '/toolkit/examples/typed/isNegative', text: 'is.negative' },
                { link: '/toolkit/examples/typed/isNil', text: 'is.nil' },
                { link: '/toolkit/examples/typed/isNumber', text: 'is.number' },
                { link: '/toolkit/examples/typed/isObject', text: 'is.object' },
                { link: '/toolkit/examples/typed/isOdd', text: 'is.odd' },
                { link: '/toolkit/examples/typed/isPositive', text: 'is.positive' },
                { link: '/toolkit/examples/typed/isPrimitive', text: 'is.primitive' },
                { link: '/toolkit/examples/typed/isPromise', text: 'is.promise' },
                { link: '/toolkit/examples/typed/isRegex', text: 'is.regex' },
                { link: '/toolkit/examples/typed/isString', text: 'is.string' },
                { link: '/toolkit/examples/typed/isWithin', text: 'is.within' },
                { link: '/toolkit/examples/typed/isZero', text: 'is.zero' },
                { link: '/toolkit/examples/typed/typeOf', text: 'is.typeOf' },
              ],
              link: '/toolkit/examples/typed',
              text: 'Typed',
            },
          ],
          text: 'Examples',
        },
      ],
      '/validit/': [
        { link: '/validit/', text: 'Overview' },
        {
          items: [
            { link: '/validit/usage#basic-usage', text: 'Basic Usage' },
            { link: '/validit/usage#primitive-schemas', text: 'Primitives' },
            { link: '/validit/usage#complex-schemas', text: 'Complex Schemas' },
            { link: '/validit/usage#modifiers', text: 'Modifiers' },
            { link: '/validit/usage#custom-refinements', text: 'Custom Validation' },
            { link: '/validit/usage#error-handling', text: 'Error Handling' },
            { link: '/validit/usage#type-inference', text: 'Type Inference' },
          ],
          link: '/validit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/validit/api#factory-object-v', text: 'v (Factory)' },
            { link: '/validit/api#schema-methods', text: 'Schema Methods' },
            { link: '/validit/api#types', text: 'Types' },
          ],
          link: '/validit/api',
          text: 'API Reference',
        },
        { link: '/validit/examples', text: 'Examples' },
      ],
      '/wireit/': [
        { link: '/wireit/', text: 'Overview' },
        {
          items: [
            { link: '/wireit/usage#tokens', text: 'Tokens' },
            { link: '/wireit/usage#providers', text: 'Providers' },
            { link: '/wireit/usage#lifetimes', text: 'Lifetimes' },
            { link: '/wireit/usage#async-resolution', text: 'Async Resolution' },
            { link: '/wireit/usage#child-containers-and-hierarchy', text: 'Child Containers' },
            { link: '/wireit/usage#scoped-execution', text: 'Scoped Execution' },
            { link: '/wireit/usage#aliases', text: 'Aliases' },
            { link: '/wireit/usage#testing', text: 'Testing' },
          ],
          link: '/wireit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/wireit/api#createtoken-description', text: 'createToken()' },
            { link: '/wireit/api#createcontainer', text: 'createContainer()' },
            { link: '/wireit/api#container-registration', text: 'Registration' },
            { link: '/wireit/api#container-resolution', text: 'Resolution' },
            { link: '/wireit/api#container-lifecycle', text: 'Lifecycle' },
            { link: '/wireit/api#container-testing', text: 'Testing' },
            { link: '/wireit/api#types', text: 'Types' },
            { link: '/wireit/api#errors', text: 'Errors' },
          ],
          link: '/wireit/api',
          text: 'API Reference',
        },
        { link: '/wireit/examples', text: 'Examples' },
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
            { link: '/workit/api#types', text: 'Types' },
            { link: '/workit/api#createworker', text: 'createWorker()' },
            { link: '/workit/api#workerhandle-interface', text: 'WorkerHandle Interface' },
            { link: '/workit/api#error-classes', text: 'Error Classes' },
            { link: '/workit/api#testing-utilities', text: 'Testing Utilities' },
          ],
          link: '/workit/api',
          text: 'API Reference',
        },
        { link: '/workit/examples', text: 'Examples' },
      ],
    },
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
        '@vielzeug/eventit': resolve(__dirname, '../../packages/eventit/src'),
        '@vielzeug/fetchit': resolve(__dirname, '../../packages/fetchit/src'),
        '@vielzeug/formit': resolve(__dirname, '../../packages/formit/src'),
        '@vielzeug/i18nit': resolve(__dirname, '../../packages/i18nit/src'),
        '@vielzeug/logit': resolve(__dirname, '../../packages/logit/src'),
        '@vielzeug/permit': resolve(__dirname, '../../packages/permit/src'),
        '@vielzeug/routeit': resolve(__dirname, '../../packages/routeit/src'),
        '@vielzeug/stateit': resolve(__dirname, '../../packages/stateit/src'),
        '@vielzeug/toolkit': resolve(__dirname, '../../packages/toolkit/src'),
        '@vielzeug/validit': resolve(__dirname, '../../packages/validit/src'),
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
