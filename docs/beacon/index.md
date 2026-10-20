---
title: 'Beacon: Product tours and coachmarks'
description: "Guided onboarding and contextual product tours for web applications"
package: beacon
category: ui-interaction
keywords: [onboarding, product-tour, coachmark, walkthrough, step-by-step, spotlight, headless]
related: [refine, orbit, ripple, vault]
exports: [createTour, createCoachmark, resolveTarget]
environments: [browser]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="beacon" />

## Why Beacon?

Product tours rot fast: hand-wired step sequences hard-code positioning, persistence, and target waiting into application code, and break the first time the UI moves. Beacon is the headless half of a tour — it owns step order, target waiting, resumable progress, and events — while your markup (or `@vielzeug/refine`'s `ore-tour` components) decides what a step looks like.

```ts
// Before: step logic tangled with rendering and storage
let step = Number(localStorage.getItem('tour-step') ?? 0);
function showStep() {
  const el = document.querySelector(steps[step].selector);
  card.style.top = `${el.getBoundingClientRect().bottom + 8}px`; // breaks on scroll
  card.innerHTML = steps[step].html;
}

// After: the engine owns order, persistence, and the anchor rect
import { createTour } from '@vielzeug/beacon';

const tour = createTour({ id: 'welcome', steps, storage });
tour.current.subscribe(() => renderCard(tour.current.value)); // rect is the live anchor
tour.start();
```

| Feature | Beacon | Shepherd.js | Intro.js |
| --- | --- | --- | --- |
| Bundle size | <PackageInfo package="beacon" type="size" /> | ~50 kB | ~25 kB |
| External dependencies | <ore-icon name="check" size="16"></ore-icon> (none) | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |
| Headless (you own the UI) | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |
| Resumable persisted progress | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="triangle-alert" size="16"></ore-icon> |
| Versioned re-offers | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |
| Coachmarks (single hints) | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="triangle-alert" size="16"></ore-icon> |

<div class="decision-callout">

**Use Beacon when** tours must survive UI changes: steps anchor to your real DOM, progress persists and resumes, and the card markup is yours (or refine's ready-made `ore-tour`).

**Consider Shepherd or Intro.js when** you want a fully-rendered, opinionated tour widget you never style yourself and can accept their DOM and CSS.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/beacon
```

```sh [npm]
npm install @vielzeug/beacon
```

```sh [yarn]
yarn add @vielzeug/beacon
```

:::

## Quick Start

Define the tour as data, run it, and render the current step wherever you like. The handle is disposable, so component teardown cleans everything up.

```ts
import { createTour, type BeaconTourConfig } from '@vielzeug/beacon';

const config = {
  id: 'getting-started',
  steps: [
    { id: 'welcome', title: 'Welcome', description: 'A two-minute look around.' },
    { id: 'nav', target: '[data-tour="nav"]', title: 'Navigation', placement: 'bottom-start' },
  ],
} satisfies BeaconTourConfig;

const tour = createTour(config);

// Render from the live snapshot: rect is the anchor, null centers the card.
const unsubscribe = tour.current.subscribe(() => {
  const { presentation, rect, step } = tour.current.value;
  console.log({ presentation, rect, step }); // drive your card from this
});

tour.start();

// On teardown:
unsubscribe();
tour.dispose();
```

## Features

<div class="features-grid">

- `createTour()` runs a sequential, resumable walkthrough over your own DOM.
- `createCoachmark()` shows a single contextual hint once per user per version.
- `current` is a live `Readable<BeaconCurrentStep>` snapshot: step, index, placement, presentation, and resolved anchor rect, kept fresh on scroll, resize, and layout changes.
- `target` accepts a selector, `Element`, rect, or lazy resolver, and beacon waits for lazily-mounted targets before showing the step.
- `storage` persists progress through any `BeaconStorage` bridge (localStorage, IndexedDB via `@vielzeug/vault`, a server API).
- `version` re-offers a finished tour when the product changes underneath it.
- `tap()` subscribes to lifecycle events (`step:start`, `tour:complete`, `target-missing`, ...) with `AbortSignal` support.
- `resolveTarget()` turns any target into a viewport rect compatible with `@vielzeug/orbit` positioners.
- `ore-tour`'s `bind()` in `@vielzeug/refine` renders a handle and routes its actions with zero glue code.

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)
- [Migration Guide](./migration.md)

</div>

## See Also

<div class="see-also">

- [Refine](/refine/): ships `ore-tour` and `ore-spotlight`, the ready-made dialog/popover/bottom-sheet presentation layer for a beacon handle.
- [Orbit](/orbit/): compute exact popover coordinates from `current.rect` when you build a custom presentation.
- [Vault](/vault/): durable storage backends that plug into `BeaconStorage` with a six-line bridge.
- [Ripple](/ripple/): the `Readable` signals every beacon handle exposes come from here.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
