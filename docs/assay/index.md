---
title: Assay — Framework-agnostic DOM testing primitives
description: Scoped element queries, synchronous event dispatchers, and deterministic async waiting for any DOM or custom-element code, with zero dependency on a specific UI framework.
package: assay
category: testing
keywords: [testing, dom, events, queries, waitfor, custom-elements, jsdom]
related: [ore, refine]
exports: [within, query, queryAll, queryByTestId, queryAllByTestId, queryByText, queryAllByText, queryInShadow, queryAllInShadow, queryPart, getSlotted, fire, createPointerEvent, waitFor, waitForEvent, nextTick, wait, AssayError, AssayTimeoutError]
environments: [browser]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="assay" />

## Why Assay?

Testing DOM-level code (custom elements, vanilla event handlers, framework-rendered output) usually means hand-rolling `dispatchEvent` boilerplate and ad-hoc polling loops, or pulling in a full testing-library dependency tied to one framework's rendering model. Assay extracts just the generic, framework-agnostic pieces — scoped queries, event dispatch, async waiting — as a standalone, zero-dependency package.

```ts
// Before — hand-rolled event dispatch and polling in every test file
const btn = panel.querySelector('button.submit')!;

btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

const deadline = Date.now() + 1000;
while (Date.now() < deadline && !panel.querySelector('.saved')) {
  await new Promise((r) => setTimeout(r, 50));
}

// After
import { fire, waitFor, within } from '@vielzeug/assay';

const { query, queryByText } = within(panel);

fire.click(query('button.submit')!);
await waitFor(() => queryByText('Saved') !== null);
```

| Feature                | Assay                                            | @testing-library/dom                    |
| ----------------------- | ------------------------------------------------ | ---------------------------------------- |
| Bundle size             | <PackageInfo package="assay" type="size" />       | ~15 kB                                   |
| Framework-agnostic      | <ore-icon name="check" size="16"></ore-icon>      | <ore-icon name="check" size="16"></ore-icon> |
| Scoped queries          | <ore-icon name="check" size="16"></ore-icon> `within()` | <ore-icon name="check" size="16"></ore-icon> |
| Low-level event dispatch| <ore-icon name="check" size="16"></ore-icon> `fire.*` | Partial (`fireEvent`)               |
| Deterministic `waitFor` | <ore-icon name="check" size="16"></ore-icon>      | <ore-icon name="check" size="16"></ore-icon> |
| Zero dependencies       | <ore-icon name="check" size="16"></ore-icon>      | <ore-icon name="x" size="16"></ore-icon>     |

<div class="decision-callout">

**Use Assay when** you're testing custom elements or vanilla DOM code and want scoped queries, synchronous event dispatch, and async waiting without adopting a framework-specific testing library.

**Consider alternatives when** you're already standardized on `@testing-library/dom` (or a framework-specific wrapper around it) and don't need to avoid that dependency.

</div>

## Installation

Assay is a testing dependency — install it alongside your test runner.

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

## Quick Start

```ts
import { fire, waitFor, within } from '@vielzeug/assay';

const panel = document.querySelector('.panel')!;
const { query, queryByText } = within(panel);

fire.click(query('button.submit')!);

await waitFor(() => queryByText('Saved') !== null);
```

## Features

<div class="features-grid">

- `within(element)` — scoped `query`/`queryAll`/`queryByText`/`queryAllByText`/`queryByTestId`/`queryAllByTestId` for any element or shadow root, each also available as a free function (`query(root, selector)`, etc.) for when you already have a root.
- `queryInShadow`/`queryAllInShadow`/`queryPart` — shadow-DOM-aware queries that return `null`/`[]` instead of throwing when the host has no shadow root.
- `getSlotted(host, slotName?)` — light-DOM children assigned to a named slot, or every slotted child.
- `fire.*` — low-level synchronous DOM event dispatchers (`click`, `input`, `keyDown`, `pointerDown`/`pointerMove`/`pointerCancel`, `custom`, and more), each with sensible `bubbles`/`cancelable` defaults and a consistent `boolean` return value — no exceptions.
- `waitFor(fn, options?)` — polls until a callback returns truthy or a bare `expect()` call doesn't throw; always rejects with `AssayTimeoutError` on timeout, with the original failure preserved as `.cause`.
- `waitForEvent(element, name, timeout?)` — resolves with the next matching event, or rejects with `AssayTimeoutError`.
- `nextTick()`/`wait(ms?)` — microtask and macrotask timing helpers for reactive updates and debounced code.
- `AssayError` / `AssayTimeoutError` — a single error hierarchy for every timeout this package raises.
- No DOM-framework coupling — works with vanilla custom elements, `@vielzeug/ore` components, or any other DOM output.

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)

</div>

## See Also

<div class="see-also">

- [Ore](/ore/) — web-component authoring library whose `@vielzeug/ore/testing` sub-path re-exports Assay's query/event/wait primitives
- [Refine](/refine/) — accessible component library built on Ore, testable with the same Assay primitives

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
