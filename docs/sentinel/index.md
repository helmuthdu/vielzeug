---
title: Sentinel — Reactive environment state
description: Reactive browser and DOM observations for viewport, network, media query, element size, and intersection state.
package: sentinel
category: Environment
keywords: [reactive, browser, viewport, network, media-query, resize-observer, intersection-observer]
related: [ripple, ore, focus, gesture]
exports: [createViewport, createNetwork, createMediaQuery, createElementSize, createIntersection, SentinelError, SentinelUnavailableError, Sentinel]
environments: [browser]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="sentinel" />

## Why Sentinel?

Browser environment APIs use different events, observer callbacks, initial states, and cleanup methods. Sentinel gives them one explicit handle shape and exposes current values as Ripple `Readable<T>` signals.

```ts
// Before
{
  const panel = document.querySelector<HTMLElement>('[data-panel]');
  if (!panel) throw new Error('Panel not found');

  const observer = new ResizeObserver(([entry]) => {
    console.log(entry?.contentRect.width);
  });
  observer.observe(panel);

  // Later
  observer.disconnect();
}

// After
import { createElementSize } from '@vielzeug/sentinel';

{
  const panel = document.querySelector<HTMLElement>('[data-panel]');
  if (!panel) throw new Error('Panel not found');

  const size = createElementSize(panel);
  const unsubscribe = size.subscribe(() => {
    console.log(size.value?.width);
  });

  // Later
  unsubscribe();
  size.dispose();
}
```

| Feature | Sentinel | Native observer APIs | Ad hoc event listeners |
| --- | --- | --- | --- |
| Bundle size | <PackageInfo package="sentinel" type="size" /> | Built in | Application-defined |
| Zero dependencies | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |
| Reactive current state | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |
| Consistent disposable handle | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="triangle-alert" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |
| Shared abort ownership | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="triangle-alert" size="16"></ore-icon> |
| Ripple composition | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |

<div class="decision-callout">

**Use Sentinel when** browser or DOM observations need reactive state, consistent ownership, and composition with Ripple.

**Consider native APIs when** one isolated observer is sufficient and adding Ripple as a peer dependency is not justified.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/sentinel @vielzeug/ripple
```

```sh [npm]
npm install @vielzeug/sentinel @vielzeug/ripple
```

```sh [yarn]
yarn add @vielzeug/sentinel @vielzeug/ripple
```

:::

## Quick Start

Create a viewport Sentinel, render its initial state, then react to changes until the page lifetime ends.

```ts
import { createViewport } from '@vielzeug/sentinel';

function observeViewport(): () => void {
  const viewport = createViewport();
  const render = () => {
    const { dpr, height, width } = viewport.value;
    console.log(`${width}×${height} at ${dpr}dpr`);
  };

  render();
  const unsubscribe = viewport.subscribe(render);

  return () => {
    unsubscribe();
    viewport.dispose();
  };
}

const stopObserving = observeViewport();
// Call stopObserving() when the owning view unmounts.
```

<div class="features-grid">

## Features

- `createViewport()` — Observe viewport dimensions and device pixel ratio.
- `createNetwork()` — Track online status and optional connection details.
- `createMediaQuery()` — Observe one media query.
- `createElementSize()` — Read content-box dimensions from `ResizeObserver`.
- `createIntersection()` — Track normalized intersection state.
- `dispose()` — Release owned browser observers and listeners.
- `SentinelOptions.signal` — Abort several Sentinels through one external lifetime.

</div>

<div class="doc-links">

## Documentation

- [**Usage Guide**](./usage.md)
- [**API Reference**](./api.md)
- [**Examples**](./examples.md)

</div>

<div class="see-also">

## See Also

- [@vielzeug/ripple](../ripple/) — Derive and watch values from Sentinel state.
- [@vielzeug/ore](../ore/) — Bind Sentinels to web-component mount and cleanup lifecycles.
- [@vielzeug/focus](../focus/) — Manage keyboard focus alongside observed UI state.
- [@vielzeug/gesture](../gesture/) — Handle pointer gestures alongside environmental observations.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
