---
title: 'Beacon Examples: Getting Started'
description: Wire a first beacon tour to a refine ore-tour card with persisted progress.
---

## Getting Started

### Problem

You want a first guided tour: a few steps anchored to your app's own buttons, a card that follows them, progress that survives a reload, and no tour framework dictating your markup. The APIs involved are `createTour`, `BeaconStorage`, and refine's `ore-tour` element.

### Solution

Define the tour as data and hand the handle to `card.bind()` — one call renders the `current` snapshot into the card and routes the card's actions back into the handle.

```ts
import { createTour, type BeaconTourConfig, type BeaconStorage } from '@vielzeug/beacon';
import type { OreTourElement } from '@vielzeug/refine/tour';

const storage: BeaconStorage = {
  get: (key) => JSON.parse(localStorage.getItem(key) ?? 'null'),
  remove: (key) => localStorage.removeItem(key),
  set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
};

const config = {
  id: 'first-tour',
  presentation: 'auto',
  steps: [
    { description: 'Two minutes, five stops.', id: 'welcome', presentation: 'modal', title: 'Welcome' },
    { id: 'nav', placement: 'bottom-start', target: '[data-tour="nav"]', title: 'Get around' },
    { id: 'share', placement: 'bottom-end', target: '[data-tour="share"]', title: 'Share your work' },
  ],
  storage,
} satisfies BeaconTourConfig;

const tour = createTour(config);

const card = document.querySelector<OreTourElement>('#tour-card')!;

// Renders `current` into the card and wires next/back/skip/finish/dismiss back.
// Beacon keeps the anchor rect fresh on scroll, resize, and layout changes, so no listeners here.
const unbind = card.bind(tour);

tour.start(); // no-op if this user already completed the tour

// On teardown: unbind(); tour.dispose();
```

The matching markup is one element plus your target hooks:

```html
<ore-tour id="tour-card" spotlight></ore-tour>
<nav data-tour="nav">…</nav>
<button data-tour="share">Share</button>
```

#### With a Replay control

```ts
function replay(): void {
  tour.reset(); // clears the persisted record
  tour.start();
}
```

### Pitfalls

- Setting `card.stepIndex` (camelCase) does nothing: ore exposes props under their literal kebab-case keys (`card['step-index']`). `bind()` writes them for you.
- `current.subscribe()` listeners take no arguments — read `tour.current.value` inside the listener; this is ripple's `Readable`, not an observable that passes values.
- A step's `target` selector that never mounts holds the tour open forever under the default `targetTimeoutMs: Infinity`; set a finite timeout and watch `tap()` for `target-missing`.
- `start()` after a completed tour is a silent no-op by design — call `reset()` first for replays.

### Related

- [Usage Guide](../usage.md)
- [API Reference](../api.md)
- [Refine tour component](/refine/components/tour)
