---
layout: home

hero:
  name: 'Vielzeug'
  text: 'The modular TypeScript toolkit'
  tagline: 'Type-safe utilities, blazing-fast storage, flexible logging, and more — all in one monorepo.'
  image:
    src: '/logo.svg'
    alt: 'Vielzeug Logo'
  actions:
    - theme: brand
      text: Get Started
      link: /guide/
    - theme: alt
      text: View on GitHub
      link: https://github.com/helmuthdu/vielzeug

features:
  - title: '@vielzeug/deposit'
    details: "<img src='/vielzeug/logo-deposit.svg' class='logo-highlight-smaller' alt='Deposit Logo' width='72'/>Type-safe local storage with schemas, expiration, and query building capabilities."
    link: /deposit/
  - title: '@vielzeug/fetchit'
    details: "<img src='/vielzeug/logo-fetchit.svg' class='logo-highlight-smaller' alt='Fetchit Logo' width='72'/>Advanced HTTP client with caching, retries and deduplication."
    link: /fetchit/
  - title: '@vielzeug/formit'
    details: "<img src='/vielzeug/logo-formit.svg' class='logo-highlight-smaller' alt='Formit Logo' width='72'/>Type-safe form state and validation with minimal code and maximum flexibility."
    link: /formit/
  - title: '@vielzeug/i18nit'
    details: "<img src='/vielzeug/logo-i18nit.svg' class='logo-highlight-smaller' alt='i18nit Logo' width='72'/>Lightweight, type-safe i18n with pluralization, async loading, and more."
    link: /i18nit/
  - title: '@vielzeug/logit'
    details: "<img src='/vielzeug/logo-logit.svg' class='logo-highlight-smaller' alt='Logit Logo' width='72'/>Beautiful console logging with styling and remote logging support."
    link: /logit/
  - title: '@vielzeug/permit'
    details: "<img src='/vielzeug/logo-permit.svg' class='logo-highlight-smaller' alt='Permit Logo' width='72'/>Role-based access control (RBAC) system for permissions."
    link: /permit/
  - title: '@vielzeug/routeit'
    details: "<img src='/vielzeug/logo-routeit.svg' class='logo-highlight-smaller' alt='Routeit Logo' width='72'/>Lightweight, type-safe client-side routing with middleware support."
    link: /routeit/
  - title: '@vielzeug/stateit'
    details: "<img src='/vielzeug/logo-stateit.svg' class='logo-highlight-smaller' alt='Stateit Logo' width='72'/>Tiny, framework-agnostic state management with reactive subscriptions."
    link: /stateit/
  - title: '@vielzeug/toolkit'
    details: "<img src='/vielzeug/logo-toolkit.svg' class='logo-highlight-smaller' alt='Utils Logo' width='72'/>A comprehensive utility library with 119+ functions for arrays, objects, strings, math, dates, and more."
    link: /toolkit/
  - title: '@vielzeug/validit'
    details: "<img src='/vielzeug/logo-validit.svg' class='logo-highlight-smaller' alt='Validit Logo' width='72'/>Type-safe schema validation with advanced error handling."
    link: /validit/
  - title: '@vielzeug/wireit'
    details: "<img src='/vielzeug/logo-wireit.svg' class='logo-highlight-smaller' alt='Wireit Logo' width='72'/>Lightweight dependency injection container with IoC principles."
    link: /wireit/
---

## 🚀 Why Vielzeug?

- **Type-safe**: Built with TypeScript from the ground up for the best DX.
- **Zero/Low Dependencies**: Keep your bundle size small and your supply chain secure.
- **Consistent API**: Learn one package, and you'll feel at home in all of them.
- **Modern**: Optimized for ES Modules, tree-shaking, and modern runtimes.

## 🏁 Quick Start

::: code-group

```bash [npm]
npm install @vielzeug/toolkit
```

```bash [pnpm]
pnpm add @vielzeug/toolkit
```

```bash [yarn]
yarn add @vielzeug/toolkit
```

:::

```typescript
import { chunk, debounce, formatCurrency } from '@vielzeug/toolkit';

// Utilities that just work
const batches = chunk([1, 2, 3, 4, 5], 2);
const search = debounce((query) => api.search(query), 300);
const price = formatCurrency(1234.56, 'USD'); // "$1,234.56"
```

## 💬 Community & Support

Have questions? Found a bug? Want to contribute?

- [GitHub Issues](https://github.com/helmuthdu/vielzeug/issues) — Report bugs or request features
- [GitHub Discussions](https://github.com/helmuthdu/vielzeug/discussions) — Ask questions and share ideas
- [Contributing Guide](https://github.com/helmuthdu/vielzeug/blob/main/CONTRIBUTING.md) — Learn how to contribute

---

<div style="text-align: center; color: var(--vp-c-text-2); font-size: 0.9em;">

Released under the [MIT License](https://github.com/helmuthdu/vielzeug/blob/main/LICENSE).  
[Vielzeug Contributors](https://github.com/helmuthdu/vielzeug/graphs/contributors).

</div>
