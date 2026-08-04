---
title: Assay — Framework-agnostic DOM testing primitives
description: Scoped DOM queries, exact event dispatch, and cancellable async waiting for browser tests.
package: assay
category: testing
keywords: [testing, dom, events, queries, custom-elements]
related: [ore, refine]
exports:
  [
    within,
    queryInShadow,
    queryAllInShadow,
    queryPart,
    getSlotted,
    dispatch,
    fireBlur,
    fireChange,
    fireClick,
    fireCustom,
    fireFocus,
    fireInput,
    fireKeyDown,
    fireKeyUp,
    fireSubmit,
    waitUntil,
    retry,
    waitForEvent,
    delay,
    nextTick,
    AssayError,
    AssayQueryError,
    AssayTimeoutError,
  ]
environments: [browser]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="assay" />

## Why Assay?

Assay provides focused DOM test primitives that work with vanilla elements, custom elements, and framework-rendered output. It scopes queries, dispatches exact browser event classes, and waits on explicit conditions without imposing a renderer or browser automation stack.

```ts
// Before
button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
await new Promise((resolve) => setTimeout(resolve, 100));

// After
fireClick(view.get('button.submit'));
await waitUntil(() => view.queryByText('Saved') !== null);
```

| Feature             | Assay                                        | Testing Library DOM                      | Browser automation                       |
| ------------------- | -------------------------------------------- | ---------------------------------------- | ---------------------------------------- |
| Bundle size         | <PackageInfo package="assay" type="size" />  | Larger query layer                       | Browser runtime required                 |
| Zero dependencies   | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |
| Scoped DOM queries  | `within()` and shadow helpers                | Renderer-oriented queries                | Manual selectors                         |
| Deterministic waits | `waitUntil()` and `waitForEvent()`           | Framework-dependent                      | Full browser timing                      |

<div class="decision-callout">

**Use Assay when** a DOM unit test needs readable queries, dispatched events, or a bounded async wait without adopting a rendering framework.

**Consider browser integration tests when** correctness depends on browser default actions, focus behavior, pointer capture, layout, or accessibility-tree behavior.

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

## Quick Start

Scope a test fixture, dispatch an event, and wait for resulting DOM state.

```ts
import { fireClick, waitUntil, within } from '@vielzeug/assay';

const panel = document.createElement('section');
panel.innerHTML = '<button>Save</button><output></output>';
panel.querySelector('button')!.addEventListener('click', () => {
  panel.querySelector('output')!.textContent = 'Saved';
});

const view = within(panel);
fireClick(view.get('button'));
await waitUntil(() => view.queryByText('Saved') !== null);
```

## Features

<div class="features-grid">

- `within(root)` scopes nullable and required DOM queries.
- `queryInShadow`, `queryPart`, and `getSlotted` cross custom-element boundaries explicitly.
- `fireClick`, `fireInput`, `fireKeyDown`, and peers dispatch exact synchronous events.
- `waitUntil`, `retry`, and `waitForEvent` provide bounded, abortable async waiting.
- `delay` and `nextTick` model explicit timer and microtask scheduling.
- `AssayError`, `AssayQueryError`, and `AssayTimeoutError` provide typed failures.

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Ore](/ore/) — component authoring and test fixtures that pair with Assay DOM helpers.
- [Refine](/refine/) — accessible components with component-specific test assertions.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
