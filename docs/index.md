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
      link: /toolkit/
    - theme: alt
      text: API Reference
      link: /toolkit/api
    - theme: alt
      text: View on GitHub
      link: https://github.com/helmuthdu/vielzeug

features:
  - title: '@vielzeug/toolkit'
    details: "<img src='/vielzeug/logo-utils.svg' class='logo-highlight-smaller' alt='Utils Logo' width='72'/>100+ type-safe, dependency-free utilities for arrays, objects, strings, dates, math, random, and more."
    link: /toolkit/
  - title: '@vielzeug/deposit'
    details: "<img src='/vielzeug/logo-depot.svg' class='logo-highlight-smaller' alt='Depot Logo' width='72'/>Unified, type-safe IndexedDB & LocalStorage with advanced querying, transactions, and migrations."
    link: /deposit/
  - title: '@vielzeug/fetchit'
    details: "<img src='/vielzeug/logo-http.svg' class='logo-highlight-smaller' alt='Http Logo' width='72'/>Modern, type-safe HTTP client for browser & Node.js. Unified API, caching, cancellation, and more."
    link: /fetchit/
  - title: '@vielzeug/formit'
    details: "<img src='/vielzeug/logo-formit.svg' class='logo-highlight-smaller' alt='Formit Logo' width='72'/>Agnostic, type-safe form state and validation with minimal code and maximum flexibility."
    link: /formit/
  - title: '@vielzeug/i18nit'
    details: "<img src='/vielzeug/logo-i18nit.svg' class='logo-highlight-smaller' alt='i18nit Logo' width='72'/>Lightweight, type-safe i18n with pluralization, async loading, and framework-agnostic design."
    link: /i18nit/
  - title: '@vielzeug/logit'
    details: "<img src='/vielzeug/logo-logger.svg' class='logo-highlight-smaller' alt='Logit Logo' width='72'/>Flexible, zero-dependency logger for browser & Node.js. Log levels, color themes, remote logging, and more."
    link: /logit/
  - title: '@vielzeug/permit'
    details: "<img src='/vielzeug/logo-permit.svg' class='logo-highlight-smaller' alt='Permit Logo' width='72'/>Type-safe, extensible permission & role management for any app. Centralized, testable, and dynamic."
    link: /permit/
---

## 🚀 Why Vielzeug?

- **Type-safe**: Built with TypeScript from the ground up for the best DX.
- **Zero/Low Dependencies**: Keep your bundle size small and your supply chain secure.
- **Consistent API**: Learn one package, and you'll feel at home in all of them.
- **Modern**: Optimized for ES Modules, tree-shaking, and modern runtimes.

## 🎓 Quick Start

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
