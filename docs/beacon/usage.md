---
title: 'Beacon: Usage Guide'
description: How to use @vielzeug/beacon.
---

[[toc]]

## Basic Usage

A tour is a config object plus a handle you drive from your own UI. The handle never renders anything: it publishes a `current` snapshot, and your card (or refine's `ore-tour`) renders it.

```ts
import { createTour } from '@vielzeug/beacon';

const tour = createTour({
  id: 'product-tour',
  steps: [
    { id: 'welcome', title: 'Welcome', description: 'See what changed in this release.' },
    { id: 'nav', target: '[data-tour="nav"]', title: 'Find everything', placement: 'bottom-start' },
    { id: 'share', target: '[data-tour="share"]', title: 'Share the board', placement: 'bottom-end' },
  ],
  autoStart: true,
});

// Readable<T> from @vielzeug/ripple: the listener takes no arguments;
// read .value inside it.
const unsubscribe = tour.current.subscribe(() => {
  const current = tour.current.value;
  if (!current.step) {
    hideCard();
    return;
  }
  renderCard({
    anchor: current.rect, // viewport rect of the target, null for centered steps
    index: current.stepIndex,
    placement: current.placement,
    presentation: current.presentation,
    title: current.step.title,
    total: current.totalSteps,
  });
});

// Wire your card's controls back to the handle.
cardEl.addEventListener('next', () => tour.next());
cardEl.addEventListener('back', () => tour.back());
cardEl.addEventListener('skip', () => tour.skip());

// On teardown:
unsubscribe();
tour.dispose();
```

`start()` is a no-op when the stored record says this user already completed the tour, so calling it on every page load is safe.

## Steps and Targets

A step without a `target` centers (intro/outro copy). A step with one anchors, and beacon waits for the target to exist before publishing the step — a tour can walk through lazily-mounted routes without any coordination code.

```ts
const tour = createTour({
  id: 'deep-tour',
  steps: [
    // Selector: resolved with document.querySelector on activation.
    { id: 'sidebar', target: '[data-tour="sidebar"]', title: 'Your libraries' },
    // Element: a ref your framework already holds.
    { id: 'editor', target: editorEl, title: 'The editor' },
    // Rect: geometry with no element, such as a canvas region.
    { id: 'chart', target: { height: 120, width: 240, x: 400, y: 300 }, title: 'This trend' },
    // Resolver: computed on every activation, and on scroll/resize while the step is active.
    { id: 'selection', target: () => window.getSelection()?.getRangeAt(0).getBoundingClientRect() ?? null, title: 'Your selection' },
  ],
  // Give up waiting after 4s and skip the step instead of hanging the tour.
  targetTimeoutMs: 4000,
});
```

With the default `targetTimeoutMs: Infinity`, a step whose target never mounts simply waits: the tour resumes the moment the user navigates to it. Set `0` to publish immediately with a `null` rect instead of waiting.

## Persisting Progress

Without `storage`, progress lives in memory for the handle's lifetime only. Any object matching `BeaconStorage` makes it durable — values are JSON, keys are namespaced under `@vielzeug/beacon:`.

```ts
import type { BeaconStorage } from '@vielzeug/beacon';

const storage: BeaconStorage = {
  get: (key) => JSON.parse(localStorage.getItem(key) ?? 'null'),
  remove: (key) => localStorage.removeItem(key),
  set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
};

const tour = createTour({ id: 'product-tour', steps, storage });
```

Async storage works too: `get` may return a promise, and the tour boots as soon as it resolves. A `set` that rejects is reported through `tap()` as a `warning` event, never thrown.

Records are validated on read, so a hand-edited or stale record falls back to a fresh tour instead of crashing.

### Re-offering a finished tour

Bump `version` when the product changes and every user who finished the old tour becomes eligible again — users mid-tour on the old version keep their progress.

```ts
const tour = createTour({
  id: 'product-tour',
  steps: newSteps,
  version: 2, // stored records at version 1 no longer block the tour
});
```

`reset()` clears the persisted record for the current user, which is what a "Replay tour" or "Reset onboarding" control should call before `start()`.

## Driving a Refine Presentation

`@vielzeug/refine` ships `ore-tour` (a dialog with step footer, progress, and focus handling) and `ore-spotlight` (a decorative cutout that dims everything but the target). A beacon handle satisfies `ore-tour`'s `TourController` shape, so one call wires both directions:

```ts
import type { OreTourElement } from '@vielzeug/refine/tour';

const card = document.querySelector<OreTourElement>('#tour-card');

const tour = createTour({ id: 'product-tour', presentation: 'auto', steps });

// bind() renders `current` into the card's props and routes the card's
// next/back/skip/finish/dismiss actions back into the handle.
const unbind = card.bind(tour);

tour.start();

// On teardown:
unbind();
tour.dispose();
```

`presentation: 'auto'` maps to a popover on wide viewports and a bottom sheet on narrow ones; ore-tour makes that switch itself and freezes the choice while the card is open, so a mid-step resize never rebuilds the card. Beacon keeps `current.rect` fresh on scroll, resize, and layout changes, so the anchored card follows the layout with no app-side listeners.

Apps that render their own markup read `current` directly instead (see [Basic Usage](#basic-usage)).

## Coachmarks

A coachmark is one hint anchored to one target, shown the first time the target appears and dismissed permanently after. Use it for the "explain this button once" moment a tour would be too heavy for — or as the follow-up a tour hands off to.

```ts
import { createCoachmark } from '@vielzeug/beacon';

const share = createCoachmark({
  id: 'share-hint',
  target: '[data-tour="share"]',
  title: 'Share this board',
  description: 'Send a link that opens straight into this view.',
  storage,
});

// Render from `current` — the same single-step snapshot a tour publishes.
share.current.subscribe(() => console.log(share.current.value.step !== null, share.current.value.rect));

// The target may never appear on this page; show() waits for it.
share.show();

// "Got it" button:
share.dismiss(); // records it as seen; never shows again for this version
```

`hide()` closes the hint without recording it, so it can appear again later; `dismiss()` is permanent until `reset()` or a `version` bump.

## Events and Analytics

`tap()` observes everything the engine considers notable. It returns an unsubscribe function and accepts an `AbortSignal`, so one controller can tear down every subscription.

```ts
const controller = new AbortController();

tour.tap((event) => {
  switch (event.type) {
    case 'step:start':
      analytics.track('tour_step', { id: tour.id, step: event.step.id });
      break;
    case 'tour:complete':
      analytics.track('tour_complete', { id: tour.id, reason: event.reason });
      break;
    case 'target-missing':
      // A step's target never mounted: your selector drifted from the DOM.
      console.warn(event.message);
      break;
    case 'warning':
      console.warn(event.message, event.error);
      break;
  }
}, { signal: controller.signal });
```

`target-missing` is the event to alert on: it means a step was skipped because its target did not appear within `targetTimeoutMs`, which is exactly how stale tours announce themselves.

## Testing

Beacon runs without a rendering layer, so plain DOM tests are enough. The default in-memory storage keeps each handle's progress isolated, and `jsdom`'s `getBoundingClientRect()` returns zero-sized rects, which is fine for step-order assertions.

```ts
import { createTour } from '@vielzeug/beacon';
import { expect, test } from 'vitest';

test('walks steps in order and completes', () => {
  const tour = createTour({
    id: 'test-tour',
    steps: [{ id: 'a' }, { id: 'b' }],
    targetTimeoutMs: 0, // publish immediately even without targets
  });

  tour.start();
  expect(tour.current.value.step?.id).toBe('a');

  tour.next();
  expect(tour.current.value.step?.id).toBe('b');

  tour.next(); // past the last step finishes
  expect(tour.status.value).toBe('completed');
});
```

For persistence assertions, pass a `Map`-backed `BeaconStorage` and a second handle with the same `id` to check it resumes where the first stopped.

## Framework Integration

Beacon is framework-neutral: bridge the `Readable` snapshot with whatever primitive your framework already has.

::: code-group

```tsx [React]
import { useEffect, useState } from 'react';
import { createTour } from '@vielzeug/beacon';

function useTourState(tour: ReturnType<typeof createTour>) {
  const [current, setCurrent] = useState(tour.current.value);
  useEffect(() => tour.current.subscribe(() => setCurrent(tour.current.value)), [tour]);
  return current;
}
```

```vue [Vue 3]
<script setup lang="ts">
import { onScopeDispose, shallowRef } from 'vue';
import { createTour } from '@vielzeug/beacon';

const current = shallowRef(tour.current.value);
const unsubscribe = tour.current.subscribe(() => (current.value = tour.current.value));
onScopeDispose(unsubscribe);
</script>
```

```svelte [Svelte]
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { readable } from 'svelte/store';

  const current = readable(tour.current.value, (set) => {
    set(tour.current.value);
    return tour.current.subscribe(() => set(tour.current.value));
  });
  onDestroy(() => tour.dispose());
</script>
```

:::

## Working with Other Vielzeug Libraries

- **Refine**: `ore-tour` and `ore-spotlight` are the intended presentation layer; see [Driving a Refine Presentation](#driving-a-refine-presentation).
- **Orbit**: `current.rect` matches orbit's `Rect` shape, so a custom card positions with `computePosition({ getBoundingClientRect: () => current.rect ?? ZERO_RECT }, floatingEl, middleware)`.
- **Vault**: any vault store becomes a `BeaconStorage` with a six-line bridge (see the `BeaconStorage` docs in [API Reference](./api.md)).
- **Ripple**: every handle exposes ripple `Readable`s; `createRipple().isBatchingObservable` semantics apply when you subscribe from effects.

## Best Practices

- Give every tour and coachmark a stable `id` — it is the storage key; treat renames as data migrations.
- Keep tour configs in their own modules as plain data checked with `satisfies BeaconTourConfig`, so steps stay reviewable data, not component code.
- Prefer `data-tour="..."` attributes as target selectors: they survive class renames and read as intent.
- Set a finite `targetTimeoutMs` in production and alert on `target-missing` to catch stale selectors.
- Call `reset()` before `start()` for replay controls; never delete storage keys by hand.
- Bump `version` when a tour's meaning changes, not when its copy is typo-fixed.
- Dispose handles on teardown; `tap()` subscriptions with a shared `AbortSignal` clean up in one call.
