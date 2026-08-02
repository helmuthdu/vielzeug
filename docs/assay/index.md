---
title: Assay — Framework-agnostic DOM testing primitives
description: Scoped DOM queries, exact event dispatch, and cancellable async waiting for any DOM code.
package: assay
category: testing
keywords: [testing, dom, events, queries, custom-elements]
related: [ore, refine]
exports: [within, queryInShadow, queryAllInShadow, queryPart, getSlotted, dispatch, fireBlur, fireChange, fireClick, fireCustom, fireFocus, fireInput, fireKeyDown, fireKeyUp, fireSubmit, waitUntil, retry, waitForEvent, delay, nextTick, AssayError, AssayQueryError, AssayTimeoutError]
environments: [browser]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="assay" />

## Why Assay?

Assay provides the small set of DOM-level test primitives that stay useful across vanilla code, custom elements, and
framework-rendered output: scoped queries, exact event dispatch, and deterministic cancellation-aware waits. It has no
renderer, browser-automation layer, or runtime dependencies.

```ts
import { fireClick, waitUntil, within } from '@vielzeug/assay';

const view = within(panel);

fireClick(view.get('button.submit'));
await waitUntil(() => view.queryByText('Saved') !== null);
```

<div class="decision-callout">

**Use Assay when** a DOM unit test needs readable queries, dispatched events, or a bounded async wait without adopting
a rendering framework.

**Use browser integration tests when** correctness depends on browser default actions, focus behavior, pointer
capture, layout, or accessibility-tree behavior.

</div>

## Features

<div class="features-grid">

- `within(root)` — one scoped API for nullable `query*` and diagnostic required `get*` queries.
- `queryInShadow`, `queryPart`, and `getSlotted` — explicit custom-element boundary helpers.
- `fireClick`, `fireInput`, `fireKeyDown`, and named peers — exact synchronous event dispatch.
- `waitUntil`, `retry`, and `waitForEvent` — separate condition, assertion, and event waiting contracts with
  `AbortSignal` support.
- `delay` and `nextTick` — explicit timer and microtask scheduling helpers.
- `AssayError`, `AssayQueryError`, and `AssayTimeoutError` — typed failures for direct diagnosis.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add -D @vielzeug/assay
```

```sh [npm]
npm install -D @vielzeug/assay
```

```sh [yarn]
yarn add -D @vielzeug/assay
```

:::

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)

</div>

## See Also

<div class="see-also">

- [Ore](/ore/) — component authoring and test fixtures
- [Refine](/refine/) — accessible components with Refine-specific test assertions

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
