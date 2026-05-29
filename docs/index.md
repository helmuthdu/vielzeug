---
layout: home

hero:
  name: 'Vielzeug'
  text: 'Many tools. One good decision.'
  tagline: 'Each tool does one thing well. All of them play nicely together. TypeScript-first, zero dependencies.'
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
  - title: '@vielzeug/block'
    details: "<img src='/logo-block.svg' class='logo-highlight-smaller' alt='Block Logo' width='72'/>A library of ready-made web components, accessible, themeable, built on craft."
    link: /block/
  - title: '@vielzeug/craft'
    details: "<img src='/logo-craft.svg' class='logo-highlight-smaller' alt='Craft Logo' width='72'/>Lightweight, type-safe web component creation with reactive state."
    link: /craft/
  - title: '@vielzeug/deposit'
    details: "<img src='/logo-deposit.svg' class='logo-highlight-smaller' alt='Deposit Logo' width='72'/>Type-safe local storage with schemas, expiration, and query building capabilities."
    link: /deposit/
  - title: '@vielzeug/grip'
    details: "<img src='/logo-grip.svg' class='logo-highlight-smaller' alt='Grip Logo' width='72'/>File drop zones with MIME filtering and sortable lists."
    link: /grip/
  - title: '@vielzeug/relay'
    details: "<img src='/logo-relay.svg' class='logo-highlight-smaller' alt='Relay Logo' width='72'/>Typed event bus for decoupled, reactive inter-module communication."
    link: /relay/
  - title: '@vielzeug/courier'
    details: "<img src='/logo-courier.svg' class='logo-highlight-smaller' alt='Courier Logo' width='72'/>Advanced HTTP client with caching, retries and deduplication."
    link: /courier/
  - title: '@vielzeug/orbit'
    details: "<img src='/logo-orbit.svg' class='logo-highlight-smaller' alt='Orbit Logo' width='72'/>Floating-element positioning for tooltips, popovers, and dropdowns."
    link: /orbit/
  - title: '@vielzeug/forge'
    details: "<img src='/logo-forge.svg' class='logo-highlight-smaller' alt='Forge Logo' width='72'/>Type-safe form state and validation with minimal code and maximum flexibility."
    link: /forge/
  - title: '@vielzeug/lingua'
    details: "<img src='/logo-lingua.svg' class='logo-highlight-smaller' alt='Lingua Logo' width='72'/>Lightweight, type-safe i18n with pluralization, async loading, and more."
    link: /lingua/
  - title: '@vielzeug/rune'
    details: "<img src='/logo-rune.svg' class='logo-highlight-smaller' alt='Rune Logo' width='72'/>Beautiful console logging with styling and remote logging support."
    link: /rune/
  - title: '@vielzeug/machine'
    details: "<img src='/logo-machine.svg' class='logo-highlight-smaller' alt='Machine Logo' width='72'/>Typed finite state machines with reactive signals, guards, async invokes, and persistence."
    link: /machine/
  - title: '@vielzeug/mcp'
    details: "<img src='/logo-mcp.svg' class='logo-highlight-smaller' alt='MCP Logo' width='72'/>MCP server for exposing Vielzeug package docs, APIs, and metadata to AI clients."
    link: /mcp/
  - title: '@vielzeug/permit'
    details: "<img src='/logo-permit.svg' class='logo-highlight-smaller' alt='Permit Logo' width='72'/>Role-based access control (RBAC) system for permissions."
    link: /permit/
  - title: '@vielzeug/route'
    details: "<img src='/logo-route.svg' class='logo-highlight-smaller' alt='Route Logo' width='72'/>Lightweight, type-safe client-side routing with middleware support."
    link: /route/
  - title: '@vielzeug/ripple'
    details: "<img src='/logo-ripple.svg' class='logo-highlight-smaller' alt='Ripple Logo' width='72'/>Tiny, framework-agnostic state management with reactive subscriptions."
    link: /ripple/
  - title: '@vielzeug/sourcerer'
    details: "<img src='/logo-sourcerer.svg' class='logo-highlight-smaller' alt='Sourcerer Logo' width='72'/>Reactive local and remote query sources with pagination, filtering, sorting, and search."
    link: /sourcerer/
  - title: '@vielzeug/tempo'
    details: "<img src='/logo-tempo.svg' class='logo-highlight-smaller' alt='Tempo Logo' width='72'/>Temporal-powered date and time utilities for modern TypeScript apps."
    link: /tempo/
  - title: '@vielzeug/toolkit'
    details: "<img src='/logo-toolkit.svg' class='logo-highlight-smaller' alt='Toolkit Logo' width='72'/>A comprehensive utility library for arrays, objects, strings, math, dates, and more."
    link: /toolkit/
  - title: '@vielzeug/sieve'
    details: "<img src='/logo-sieve.svg' class='logo-highlight-smaller' alt='Sieve Logo' width='72'/>Type-safe schema validation with advanced error handling."
    link: /sieve/
  - title: '@vielzeug/scroll'
    details: "<img src='/logo-scroll.svg' class='logo-highlight-smaller' alt='Scroll Logo' width='72'/>Lightweight virtual list engine that renders only visible items."
    link: /scroll/
  - title: '@vielzeug/wired'
    details: "<img src='/logo-wired.svg' class='logo-highlight-smaller' alt='Wired Logo' width='72'/>Lightweight dependency injection container with IoC principles."
    link: /wired/
  - title: '@vielzeug/worker'
    details: "<img src='/logo-worker.svg' class='logo-highlight-smaller' alt='Worker Logo' width='72'/>Web Worker abstraction with pooling, queuing, timeouts, and more."
    link: /worker/
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
import { chunk, debounce, currency } from '@vielzeug/toolkit';

// Utilities that just work
const batches = chunk([1, 2, 3, 4, 5], 2);
const search = debounce((query) => api.search(query), 300);
const price = currency({ amount: 123456n, currency: 'USD' }); // "$1,234.56"
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
