import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type UserConfig } from 'vitepress';
import { getPackagesData } from './theme/utils/packageData';
import type { ThemeConfig } from './theme/types';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: '/vielzeug',
  description: 'Documentation for the Vielzeug monorepo',
  head: [
    ['meta', { content: '#008dfc', name: 'theme-color' }],
    ['meta', { content: 'yes', name: 'apple-mobile-web-app-capable' }],
    ['meta', { content: 'black', name: 'apple-mobile-web-app-status-bar-style' }],
  ],
  ignoreDeadLinks: true,
  sitemap: {
    hostname: 'https://helmuthdu.github.io/vielzeug',
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
    packages: getPackagesData(),
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
              { link: '/fetchit/', text: 'Fetchit' },
              { link: '/stateit/', text: 'Stateit' },
            ],
            text: 'Data & State',
          },
          {
            items: [
              { link: '/craftit/', text: 'Craftit' },
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
            ],
            text: 'Architecture & Security',
          },
        ],
        text: 'Packages',
      },
      { link: '/repl', text: 'REPL' },
    ],
    search: {
      provider: 'local',
    },
    sidebar: {
      '/deposit/': [
        { link: '/deposit/', text: 'Overview' },
        {
          items: [
            { link: '/deposit/usage#basic-usage', text: 'Basic Usage' },
            { link: '/deposit/usage#advanced-features', text: 'Advanced Features' },
            { link: '/deposit/usage#bulk-operations', text: 'Bulk Operations' },
            { link: '/deposit/usage#schema-migrations', text: 'Schema Migrations' },
          ],
          link: '/deposit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/deposit/api#core-classes', text: 'Core Classes' },
            { link: '/deposit/api#deposit-methods', text: 'Deposit Methods' },
            { link: '/deposit/api#querybuilder-methods', text: 'QueryBuilder' },
          ],
          link: '/deposit/api',
          text: 'API Reference',
        },
        { link: '/deposit/examples', text: 'Examples' },
      ],
      '/fetchit/': [
        { link: '/fetchit/', text: 'Overview' },
        {
          items: [
            { link: '/fetchit/usage#basic-usage', text: 'Basic Usage' },
            { link: '/fetchit/usage#advanced-features', text: 'Advanced Features' },
            { link: '/fetchit/usage#configuration-options', text: 'Configuration' },
          ],
          link: '/fetchit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/fetchit/api#query-client-methods', text: 'Query Client API' },
            { link: '/fetchit/api#http-client-methods', text: 'HTTP Client API' },
            { link: '/fetchit/api#type-safe-query-keys', text: 'Query Keys' },
          ],
          link: '/fetchit/api',
          text: 'API Reference',
        },
        { link: '/fetchit/examples', text: 'Examples' },
      ],
      '/craftit/': [
        { link: '/craftit/', text: 'Overview' },
        {
          items: [
            { link: '/craftit/usage#basic-usage', text: 'Basic Usage' },
            { link: '/craftit/usage#reactive-state', text: 'Reactive State' },
            { link: '/craftit/usage#event-handling', text: 'Event Handling' },
            { link: '/craftit/usage#lifecycle-hooks', text: 'Lifecycle' },
            { link: '/craftit/usage#form-associated-elements', text: 'Forms' },
          ],
          link: '/craftit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/craftit/api#core-functions', text: 'Core Functions' },
            { link: '/craftit/api#web-component-instance', text: 'Component API' },
            { link: '/craftit/api#type-definitions', text: 'Types' },
          ],
          link: '/craftit/api',
          text: 'API Reference',
        },
        { link: '/craftit/examples', text: 'Examples' },
      ],
      '/formit/': [
        { link: '/formit/', text: 'Overview' },
        {
          items: [
            { link: '/formit/usage#basic-usage', text: 'Basic Usage' },
            { link: '/formit/usage#validation', text: 'Validation' },
            { link: '/formit/usage#file-uploads', text: 'File Uploads' },
            { link: '/formit/usage#arrays-and-multi-select', text: 'Arrays & Multi-Select' },
            { link: '/formit/usage#framework-integration', text: 'Framework Integration' },
            { link: '/formit/usage#advanced-patterns', text: 'Advanced Patterns' },
            { link: '/formit/usage#best-practices', text: 'Best Practices' },
          ],
          link: '/formit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/formit/api#createform-init', text: 'createForm()' },
            { link: '/formit/api#form-instance-methods', text: 'Form Instance Methods' },
            { link: '/formit/api#types', text: 'Types' },
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
            { link: '/i18nit/usage#pluralization', text: 'Pluralization' },
            { link: '/i18nit/usage#variable-interpolation', text: 'Interpolation' },
            { link: '/i18nit/usage#async-loading', text: 'Async Loading' },
          ],
          link: '/i18nit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/i18nit/api#createi18n', text: 'createI18n()' },
            { link: '/i18nit/api#i18n-instance', text: 'I18n Instance' },
            { link: '/i18nit/api#configuration', text: 'Configuration' },
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
            { link: '/logit/usage#basic-usage', text: 'Basic Usage' },
            { link: '/logit/usage#scoped-loggers', text: 'Scoped Loggers' },
            { link: '/logit/usage#remote-logging', text: 'Remote Logging' },
          ],
          link: '/logit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/logit/api#core-logging-methods', text: 'Logging Methods' },
            { link: '/logit/api#scoped-logger-methods', text: 'Scoped Loggers' },
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
            { link: '/permit/usage#basic-usage', text: 'Basic Usage' },
            { link: '/permit/usage#advanced-features', text: 'Wildcards & more' },
            { link: '/permit/usage#permission-patterns', text: 'Patterns' },
          ],
          link: '/permit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/permit/api#core-methods', text: 'Core Methods' },
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
            { link: '/routeit/usage#basic-usage', text: 'Basic Usage' },
            { link: '/routeit/usage#middleware', text: 'Middleware' },
            { link: '/routeit/usage#navigation', text: 'Navigation' },
            { link: '/routeit/usage#named-routes', text: 'Named Routes' },
          ],
          link: '/routeit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/routeit/api#router-methods', text: 'Router Methods' },
            { link: '/routeit/api#navigation-methods', text: 'Navigation' },
            { link: '/routeit/api#middleware', text: 'Middleware' },
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
            { link: '/stateit/usage#basic-usage', text: 'Basic Usage' },
            { link: '/stateit/usage#subscriptions', text: 'Subscriptions' },
            { link: '/stateit/usage#scoped-stores', text: 'Scoped Stores' },
          ],
          link: '/stateit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/stateit/api#store-class', text: 'Store Class' },
            { link: '/stateit/api#utility-functions', text: 'Utilities' },
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
            { link: '/toolkit/usage#import-strategies', text: 'Import Strategies' },
            { link: '/toolkit/usage#performance-tips', text: 'Performance' },
          ],
          link: '/toolkit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/toolkit/api#array-utilities', text: 'Array' },
            { link: '/toolkit/api#async-utilities', text: 'Async' },
            { link: '/toolkit/api#object-utilities', text: 'Object' },
            { link: '/toolkit/api#string-utilities', text: 'String' },
            { link: '/toolkit/api#math-utilities', text: 'Math' },
            { link: '/toolkit/api#function-utilities', text: 'Function' },
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
                { link: '/toolkit/examples/array/aggregate', text: 'aggregate' },
                { link: '/toolkit/examples/array/alternate', text: 'alternate' },
                { link: '/toolkit/examples/array/arrange', text: 'arrange' },
                { link: '/toolkit/examples/array/chunk', text: 'chunk' },
                { link: '/toolkit/examples/array/compact', text: 'compact' },
                { link: '/toolkit/examples/array/contains', text: 'contains' },
                { link: '/toolkit/examples/array/every', text: 'every' },
                { link: '/toolkit/examples/array/filter', text: 'filter' },
                { link: '/toolkit/examples/array/find', text: 'find' },
                { link: '/toolkit/examples/array/findIndex', text: 'findIndex' },
                { link: '/toolkit/examples/array/findLast', text: 'findLast' },
                { link: '/toolkit/examples/array/flatten', text: 'flatten' },
                { link: '/toolkit/examples/array/group', text: 'group' },
                { link: '/toolkit/examples/array/list', text: 'list' },
                { link: '/toolkit/examples/array/map', text: 'map' },
                { link: '/toolkit/examples/array/pick', text: 'pick' },
                { link: '/toolkit/examples/array/reduce', text: 'reduce' },
                { link: '/toolkit/examples/array/remoteList', text: 'remoteList' },
                { link: '/toolkit/examples/array/search', text: 'search' },
                { link: '/toolkit/examples/array/select', text: 'select' },
                { link: '/toolkit/examples/array/shift', text: 'shift' },
                { link: '/toolkit/examples/array/some', text: 'some' },
                { link: '/toolkit/examples/array/sort', text: 'sort' },
                { link: '/toolkit/examples/array/substitute', text: 'substitute' },
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
                { link: '/toolkit/examples/async/delay', text: 'delay' },
                { link: '/toolkit/examples/async/parallel', text: 'parallel' },
                { link: '/toolkit/examples/async/pool', text: 'pool' },
                { link: '/toolkit/examples/async/predict', text: 'predict' },
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
                { link: '/toolkit/examples/object/clone', text: 'clone' },
                { link: '/toolkit/examples/object/diff', text: 'diff' },
                { link: '/toolkit/examples/object/entries', text: 'entries' },
                { link: '/toolkit/examples/object/keys', text: 'keys' },
                { link: '/toolkit/examples/object/merge', text: 'merge' },
                { link: '/toolkit/examples/object/parseJSON', text: 'parseJSON' },
                { link: '/toolkit/examples/object/path', text: 'path' },
                { link: '/toolkit/examples/object/seek', text: 'seek' },
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
                { link: '/toolkit/examples/function/proxy', text: 'proxy' },
                { link: '/toolkit/examples/function/prune', text: 'prune' },
                { link: '/toolkit/examples/function/throttle', text: 'throttle' },
                { link: '/toolkit/examples/function/worker', text: 'worker' },
              ],
              link: '/toolkit/examples/function',
              text: 'Function',
            },
            {
              collapsed: true,
              items: [
                { link: '/toolkit/examples/math/abs', text: 'abs' },
                { link: '/toolkit/examples/math/add', text: 'add' },
                { link: '/toolkit/examples/math/allocate', text: 'allocate' },
                { link: '/toolkit/examples/math/average', text: 'average' },
                { link: '/toolkit/examples/math/boil', text: 'boil' },
                { link: '/toolkit/examples/math/clamp', text: 'clamp' },
                { link: '/toolkit/examples/math/distribute', text: 'distribute' },
                { link: '/toolkit/examples/math/divide', text: 'divide' },
                { link: '/toolkit/examples/math/max', text: 'max' },
                { link: '/toolkit/examples/math/median', text: 'median' },
                { link: '/toolkit/examples/math/min', text: 'min' },
                { link: '/toolkit/examples/math/multiply', text: 'multiply' },
                { link: '/toolkit/examples/math/range', text: 'range' },
                { link: '/toolkit/examples/math/rate', text: 'rate' },
                { link: '/toolkit/examples/math/round', text: 'round' },
                { link: '/toolkit/examples/math/subtract', text: 'subtract' },
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
                { link: '/toolkit/examples/typed/ge', text: 'ge' },
                { link: '/toolkit/examples/typed/gt', text: 'gt' },
                { link: '/toolkit/examples/typed/is', text: 'is' },
                { link: '/toolkit/examples/typed/isArray', text: 'isArray' },
                { link: '/toolkit/examples/typed/isBoolean', text: 'isBoolean' },
                { link: '/toolkit/examples/typed/isDate', text: 'isDate' },
                { link: '/toolkit/examples/typed/isDefined', text: 'isDefined' },
                { link: '/toolkit/examples/typed/isEmpty', text: 'isEmpty' },
                { link: '/toolkit/examples/typed/isEqual', text: 'isEqual' },
                { link: '/toolkit/examples/typed/isEven', text: 'isEven' },
                { link: '/toolkit/examples/typed/isFunction', text: 'isFunction' },
                { link: '/toolkit/examples/typed/isMatch', text: 'isMatch' },
                { link: '/toolkit/examples/typed/isNegative', text: 'isNegative' },
                { link: '/toolkit/examples/typed/isNil', text: 'isNil' },
                { link: '/toolkit/examples/typed/isNumber', text: 'isNumber' },
                { link: '/toolkit/examples/typed/isObject', text: 'isObject' },
                { link: '/toolkit/examples/typed/isOdd', text: 'isOdd' },
                { link: '/toolkit/examples/typed/isPositive', text: 'isPositive' },
                { link: '/toolkit/examples/typed/isPrimitive', text: 'isPrimitive' },
                { link: '/toolkit/examples/typed/isPromise', text: 'isPromise' },
                { link: '/toolkit/examples/typed/isRegex', text: 'isRegex' },
                { link: '/toolkit/examples/typed/isString', text: 'isString' },
                { link: '/toolkit/examples/typed/isWithin', text: 'isWithin' },
                { link: '/toolkit/examples/typed/isZero', text: 'isZero' },
                { link: '/toolkit/examples/typed/le', text: 'le' },
                { link: '/toolkit/examples/typed/lt', text: 'lt' },
                { link: '/toolkit/examples/typed/typeOf', text: 'typeOf' },
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
            { link: '/validit/usage#complex-schemas', text: 'Complex' },
            { link: '/validit/usage#async-validation', text: 'Async' },
          ],
          link: '/validit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/validit/api#factory-object-v', text: 'v (Factory)' },
            { link: '/validit/api#schema-methods', text: 'Schema Methods' },
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
            { link: '/wireit/usage#basic-usage', text: 'Basic Usage' },
            { link: '/wireit/usage#tokens', text: 'Tokens' },
            { link: '/wireit/usage#providers', text: 'Providers' },
            { link: '/wireit/usage#lifetimes', text: 'Lifetimes' },
          ],
          link: '/wireit/usage',
          text: 'Usage Guide',
        },
        {
          items: [
            { link: '/wireit/api#container', text: 'Container API' },
            { link: '/wireit/api#testing-utilities', text: 'Testing' },
          ],
          link: '/wireit/api',
          text: 'API Reference',
        },
        { link: '/wireit/examples', text: 'Examples' },
      ],
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/helmuthdu/vielzeug' }],
  },
  title: 'Vielzeug',
  vite: {
    resolve: {
      alias: {
        '@vielzeug/deposit': resolve(__dirname, '../../packages/deposit/src'),
        '@vielzeug/craftit': resolve(__dirname, '../../packages/craftit/src'),
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
      },
    },
  },
} as UserConfig<ThemeConfig>);
