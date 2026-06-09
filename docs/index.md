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
  - title: '@vielzeug/arsenal'
    details: "<img src='/logo-arsenal.svg' class='logo-highlight-smaller' alt='Arsenal Logo' width='72'/>A comprehensive utility library for arrays, objects, strings, math, dates, and more."
    link: /arsenal/
  - title: '@vielzeug/clockwork'
    details: "<img src='/logo-clockwork.svg' class='logo-highlight-smaller' alt='Clockwork Logo' width='72'/>Typed finite state machines with reactive signals, invokes, and more."
    link: /clockwork/
  - title: '@vielzeug/coins'
    details: "<img src='/logo-coins.svg' class='logo-highlight-smaller' alt='Coins Logo' width='72'/>Bigint-based monetary arithmetic, formatting, and currency conversion."
    link: /coins/
  - title: '@vielzeug/codex'
    details: "<img src='/logo-codex.svg' class='logo-highlight-smaller' alt='Codex Logo' width='72'/>MCP server for exposing Vielzeug package docs, APIs, and metadata to AI clients."
    link: /codex/
  - title: '@vielzeug/conduit'
    details: "<img src='/logo-conduit.svg' class='logo-highlight-smaller' alt='Conduit Logo' width='72'/>Lightweight dependency injection container with IoC principles."
    link: /conduit/
  - title: '@vielzeug/courier'
    details: "<img src='/logo-courier.svg' class='logo-highlight-smaller' alt='Courier Logo' width='72'/>Advanced HTTP client with caching, retries and deduplication."
    link: /courier/
  - title: '@vielzeug/craft'
    details: "<img src='/logo-craft.svg' class='logo-highlight-smaller' alt='Craft Logo' width='72'/>Lightweight, type-safe web component creation with reactive state."
    link: /craft/
  - title: '@vielzeug/familiar'
    details: "<img src='/logo-familiar.svg' class='logo-highlight-smaller' alt='Familiar Logo' width='72'/>Web Worker abstraction with pooling, queuing, timeouts, and more."
    link: /familiar/
  - title: '@vielzeug/forge'
    details: "<img src='/logo-forge.svg' class='logo-highlight-smaller' alt='Forge Logo' width='72'/>Type-safe form state and validation with minimal code and maximum flexibility."
    link: /forge/
  - title: '@vielzeug/grip'
    details: "<img src='/logo-grip.svg' class='logo-highlight-smaller' alt='Grip Logo' width='72'/>File drop zones with MIME filtering and sortable lists."
    link: /grip/
  - title: '@vielzeug/herald'
    details: "<img src='/logo-herald.svg' class='logo-highlight-smaller' alt='Herald Logo' width='72'/>Typed event bus for decoupled, reactive inter-module communication."
    link: /herald/
  - title: '@vielzeug/lingua'
    details: "<img src='/logo-lingua.svg' class='logo-highlight-smaller' alt='Lingua Logo' width='72'/>Lightweight, type-safe i18n with pluralization, async loading, and more."
    link: /lingua/
  - title: '@vielzeug/orbit'
    details: "<img src='/logo-orbit.svg' class='logo-highlight-smaller' alt='Orbit Logo' width='72'/>Floating-element positioning for tooltips, popovers, and dropdowns."
    link: /orbit/
  - title: '@vielzeug/prism'
    details: "<img src='/logo-prism.svg' class='logo-highlight-smaller' alt='Prism Logo' width='72'/>Charting library — line, bar, and area charts with signal support and CSS theming."
    link: /prism/
  - title: '@vielzeug/ripple'
    details: "<img src='/logo-ripple.svg' class='logo-highlight-smaller' alt='Ripple Logo' width='72'/>Tiny, framework-agnostic state management with reactive subscriptions."
    link: /ripple/
  - title: '@vielzeug/rune'
    details: "<img src='/logo-rune.svg' class='logo-highlight-smaller' alt='Rune Logo' width='72'/>Beautiful console logging with styling and remote logging support."
    link: /rune/
  - title: '@vielzeug/scroll'
    details: "<img src='/logo-scroll.svg' class='logo-highlight-smaller' alt='Scroll Logo' width='72'/>Lightweight virtual list engine that renders only visible items."
    link: /scroll/
  - title: '@vielzeug/sigil'
    details: "<img src='/logo-sigil.svg' class='logo-highlight-smaller' alt='Sigil Logo' width='72'/>A library of ready-made web components, accessible, themeable, built on craft."
    link: /sigil/
  - title: '@vielzeug/sourcerer'
    details: "<img src='/logo-sourcerer.svg' class='logo-highlight-smaller' alt='Sourcerer Logo' width='72'/>Reactive query sources with pagination, filtering, sorting, and search."
    link: /sourcerer/
  - title: '@vielzeug/spell'
    details: "<img src='/logo-spell.svg' class='logo-highlight-smaller' alt='Spell Logo' width='72'/>Type-safe schema validation with advanced error handling."
    link: /spell/
  - title: '@vielzeug/tempo'
    details: "<img src='/logo-tempo.svg' class='logo-highlight-smaller' alt='Tempo Logo' width='72'/>Temporal-powered date and time utilities for modern TypeScript apps."
    link: /tempo/
  - title: '@vielzeug/vault'
    details: "<img src='/logo-vault.svg' class='logo-highlight-smaller' alt='Vault Logo' width='72'/>Type-safe local storage with schemas, expiration, and query building capabilities."
    link: /vault/
  - title: '@vielzeug/ward'
    details: "<img src='/logo-ward.svg' class='logo-highlight-smaller' alt='Ward Logo' width='72'/>Role-based access control (RBAC) system for permissions."
    link: /ward/
  - title: '@vielzeug/wayfinder'
    details: "<img src='/logo-wayfinder.svg' class='logo-highlight-smaller' alt='Wayfinder Logo' width='72'/>Lightweight, type-safe client-side routing with middleware support."
    link: /wayfinder/
---

## <sg-icon name="rocket" size="16"></sg-icon> Why Vielzeug?

- **Type-safe**: Built with TypeScript from the ground up for the best DX.
- **Zero/Low Dependencies**: Keep your bundle size small and your supply chain secure.
- **Consistent API**: Learn one package, and you'll feel at home in all of them.
- **Modern**: Optimized for ES Modules, tree-shaking, and modern runtimes.

## <sg-icon name="flag" size="16"></sg-icon> Quick Start

::: code-group

```bash [npm]
npm install @vielzeug/arsenal
```

```bash [pnpm]
pnpm add @vielzeug/arsenal
```

```bash [yarn]
yarn add @vielzeug/arsenal
```

:::

```typescript
import { chunk, debounce, currency } from '@vielzeug/arsenal';

// Utilities that just work
const batches = chunk([1, 2, 3, 4, 5], 2);
const search = debounce((query) => api.search(query), 300);
const price = currency({ amount: 123456n, currency: 'USD' }); // "$1,234.56"
```

## <sg-icon name="message-circle" size="16"></sg-icon> Community & Support

Have questions? Found a bug? Want to contribute?

- [GitHub Issues](https://github.com/helmuthdu/vielzeug/issues) — Report bugs or request features
- [GitHub Discussions](https://github.com/helmuthdu/vielzeug/discussions) — Ask questions and share ideas
- [Contributing Guide](https://github.com/helmuthdu/vielzeug/blob/main/CONTRIBUTING.md) — Learn how to contribute

---

<div style="text-align: center; color: var(--vp-c-text-2); font-size: 0.9em;">

Released under the [MIT License](https://github.com/helmuthdu/vielzeug/blob/main/LICENSE).
[Vielzeug Contributors](https://github.com/helmuthdu/vielzeug/graphs/contributors).

</div>
