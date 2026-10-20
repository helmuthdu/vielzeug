---
title: 'Beacon: API Reference'
description: Public API of @vielzeug/beacon.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `createTour(config)` | Runs a sequential, resumable walkthrough over the app's DOM | Sync (storage reads may be async) | `start()` is a no-op when the stored record says the tour is completed |
| `createCoachmark(config)` | Shows a single contextual hint anchored to one target | Sync (storage reads may be async) | `show()` is a no-op after `dismiss()` until `reset()` or a `version` bump |
| `resolveTarget(target)` | Resolves any target to a viewport-space rect or `null` | Sync | Call it per position update; a scrolled target's rect changes |
| `BeaconError` | Base class for all beacon-originated errors | — | Catch this to catch any beacon error |
| `BeaconConfigError` | Invalid tour/coachmark configuration | Thrown at creation | Empty `steps` or duplicate step ids fail at `createTour()` |
| `BeaconDisposedError` | Handle used after `dispose()` | Thrown on call | `dispose()` is idempotent; later method calls throw |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/beacon` | Complete public Beacon API |

---

## Core Functions

### createTour

```ts
function createTour(config: BeaconTourConfig): BeaconTourHandle
```

Returns a live handle for one guided tour. Throws `BeaconConfigError` when `id` is empty, `steps` is empty, or step ids are duplicated.

Parameters: see [`BeaconTourConfig`](#beacontourconfig).

**Returns:** a [`BeaconTourHandle`](#beacontourhandle) that is also `Disposable`.

**Example:**

```ts
import { createTour } from '@vielzeug/beacon';

const tour = createTour({
  id: 'release-tour',
  steps: [{ id: 'intro', title: 'What changed' }],
  autoStart: true,
});

tour.status.subscribe(() => console.log(tour.status.value));
```

Handle methods:

| Member | Behavior |
| --- | --- |
| `start()` | Begin or resume the tour. No-op when completed; throws after dispose. |
| `next()` | Advance; past the last step, finishes the tour. |
| `back()` | Return to the previous step. No-op on the first step. |
| `goto(step)` | Jump to a step by index or id. Unknown values warn and no-op. |
| `pause()` | Stop showing, keep progress so `start()` resumes it. |
| `skip()` | End from a "Skip" control. Persisted as dismissed, reported with reason `'skip'`. |
| `finish()` | Mark finished and stop showing. |
| `dismiss()` | End by closing (Escape, backdrop). Persisted as dismissed. |
| `reset()` | Discard persisted progress; the tour is eligible again. |
| `tap(handler, options?)` | Observe [`BeaconTourEvent`](#beacontourentype)s; returns an unsubscribe, honors `options.signal`. |
| `dispose()` / `[Symbol.dispose]()` | Release all listeners and observers. Idempotent. |
Handle properties:

| Member | Type | Notes |
| --- | --- | --- |
| `current` | `Readable<BeaconCurrentStep>` | The snapshot to render; `step` is `null` while closed. Beacon re-publishes the rect on scroll, resize, and target layout changes while a step is active. |
| `status` | `Readable<BeaconStatus>` | Lifecycle, persisted on every change. |
| `eligible` | `Readable<boolean>` | Whether the tour should be offered to this user. |
| `steps` | `readonly BeaconStep[]` | The configured steps, in order. |
| `id` | `string` | The configured id (also the storage key suffix). |
| `disposed` | `boolean` | Whether `dispose()` has run. |
| `disposalSignal` | `AbortSignal` | Aborted on dispose; pass it to your own listeners. |

---

### createCoachmark

```ts
function createCoachmark(config: BeaconCoachmarkConfig): BeaconCoachmarkHandle
```

Returns a handle for one contextual hint. Throws `BeaconConfigError` when `id` is empty.

Parameters: see [`BeaconCoachmarkConfig`](#beaconcoachmarkconfig).

**Returns:** a [`BeaconCoachmarkHandle`](#beaconcoachmarkhandle) that is also `Disposable`.

**Example:**

```ts
import { createCoachmark } from '@vielzeug/beacon';

const hint = createCoachmark({
  id: 'share-hint',
  target: '[data-tour="share"]',
  title: 'Share this board',
});

hint.show(); // waits for the target to mount if it is not on screen yet
```

Handle members:

| Member | Behavior |
| --- | --- |
| `show()` | Show the hint. No-op once dismissed without a newer version. |
| `hide()` | Hide without recording it as seen; it can show again. |
| `dismiss()` | Hide and record as seen permanently (until `reset()`/`version`). |
| `reset()` | Discard the persisted record; the hint is eligible again. |
| `tap(handler, options?)` | Observe `coachmark:show`, `coachmark:dismiss`, and common events. |
| `current` | `Readable<BeaconCurrentStep>` — the hint as a single-step snapshot: `step` is the hint while visible, `null` while hidden. The rect stays live on scroll, resize, and target layout changes. |
| `eligible` | `Readable<boolean>` — never seen, or superseded by a newer version. |

---

### resolveTarget

```ts
function resolveTarget(target: BeaconTarget): BeaconRect | null
```

Resolves a target to a viewport-space rect, or `null` when it is not available yet. Strings resolve through `document.querySelector`; functions are called and their result normalized.

| Parameter | Type | Description |
| --- | --- | --- |
| `target` | `BeaconTarget` | Selector, `Element`, rect, or lazy resolver. |

**Returns:** `BeaconRect | null` — shape-compatible with `getBoundingClientRect()` and `@vielzeug/orbit`'s `Rect`.

**Example:**

```ts
import { resolveTarget } from '@vielzeug/beacon';

const rect = resolveTarget('[data-tour="share"]');
// Anchor an orbit positioner from a virtual reference:
const reference = { getBoundingClientRect: () => resolveTarget('[data-tour="share"]') ?? ZERO_RECT };
```

---

## Types

### BeaconTourConfig

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `id` | `string` | required | Unique identity; used as the storage key. |
| `steps` | `readonly BeaconStep[]` | required | Every step, in order. At least one. |
| `autoScroll` | `boolean` | `true` | Scroll each anchored step's target into view when it activates. |
| `autoStart` | `boolean` | `false` | Start on the next microtask when eligible. |
| `placement` | `BeaconPlacement` | `'auto'` | Default placement handed to the presentation layer. |
| `presentation` | `BeaconPresentation` | `'auto'` | Default presentation handed to the presentation layer. |
| `scrollOffset` | `number \| (() => number)` | `0` | Pixels kept clear at the viewport top for a sticky header, read at scroll time. |
| `storage` | `BeaconStorage` | memory-only | Progress persistence. |
| `targetTimeoutMs` | `number` | `Infinity` | How long to wait for a step's target before skipping that step. `0` publishes immediately with a `null` rect. |
| `version` | `number` | `1` | Bump to re-show a finished tour. |

### BeaconCoachmarkConfig

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `id` | `string` | required | Unique identity; used as the storage key. |
| `target` | `BeaconTarget` | required | Where the hint points. |
| `autoShow` | `boolean` | `true` | Show automatically when not yet seen. |
| `data` | `unknown` | — | Free-form data for the presentation layer. |
| `description` | `string` | — | Supporting copy. |
| `placement` | `BeaconPlacement` | `'auto'` | Preferred side. |
| `presentation` | `BeaconPresentation` | `'auto'` | Preferred presentation. |
| `storage` | `BeaconStorage` | memory-only | Seen-record persistence. |
| `title` | `string` | — | Headline copy. |
| `version` | `number` | `1` | Bump to re-show a seen coachmark. |

### BeaconStep

```ts
interface BeaconStep {
  readonly data?: unknown;
  readonly description?: string;
  readonly id: string;
  readonly placement?: BeaconPlacement;
  readonly presentation?: BeaconPresentation;
  readonly target?: BeaconTarget;
  readonly title?: string;
}
```

One stop in a tour. `id` is stable and persisted — renaming it resets progress for that step. Omit `target` for a centered intro/outro step. `placement`/`presentation` override the tour-level defaults.

### BeaconTarget

```ts
type BeaconTarget = BeaconTargetResolver | BeaconRect | Element | string;
```

What a step points at. Selectors and elements anchor to real DOM; rects (or resolvers returning one) anchor to element-less geometry such as a canvas region.

### BeaconTargetResolver

```ts
type BeaconTargetResolver = () => Element | BeaconRect | null;
```

Resolves a target lazily; `null` means "not available yet".

### BeaconRect

```ts
interface BeaconRect {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}
```

A viewport-space rectangle in CSS pixels. Matches `@vielzeug/orbit`'s `Rect` shape.

### BeaconPlacement

```ts
type BeaconPlacement =
  | 'auto'
  | 'bottom' | 'bottom-end' | 'bottom-start'
  | 'left' | 'left-end' | 'left-start'
  | 'right' | 'right-end' | 'right-start'
  | 'top' | 'top-end' | 'top-start';
```

Preferred side for an anchored presentation; `'auto'` asks the positioning layer to choose.

### BeaconPresentation

```ts
type BeaconPresentation = 'auto' | 'bottom-sheet' | 'modal' | 'popover';
```

How a step should be presented. `'auto'` lets the presentation layer pick by available space.

### BeaconStatus

```ts
type BeaconStatus = 'active' | 'completed' | 'dismissed' | 'idle' | 'paused';
```

Tour lifecycle, persisted across visits. `'idle'` means never started.

### BeaconProgress

```ts
interface BeaconProgress {
  readonly status: BeaconStatus;
  readonly stepIndex: number;
  readonly version: number;
}
```

The persisted record for one tour or coachmark. `stepIndex` is `-1` before the first step. Records are validated on read; invalid records fall back to a fresh tour.

### BeaconStorage

```ts
interface BeaconStorage {
  get(key: string): Promise<BeaconProgress | null | undefined> | BeaconProgress | null | undefined;
  remove(key: string): Promise<unknown> | unknown;
  set(key: string, value: BeaconProgress): Promise<unknown> | unknown;
}
```

Minimal storage contract; sync or async. Values are JSON. Keys arrive namespaced (`@vielzeug/beacon:<id>`). A `@vielzeug/vault` store plugs in with:

```ts
const storage: BeaconStorage = {
  get: (key) => store.get('progress', key),
  remove: (key) => store.delete('progress', key),
  set: (key, value) => store.put('progress', { id: key, ...value }),
};
```

### BeaconCurrentStep

```ts
interface BeaconCurrentStep {
  readonly placement: BeaconPlacement;
  readonly presentation: BeaconPresentation;
  readonly rect: BeaconRect | null;
  readonly step: BeaconStep | null;
  readonly stepIndex: number;
  readonly totalSteps: number;
}
```

The snapshot a presentation layer renders from. `step` is `null` before start and after the tour ends; `rect` is `null` for centered steps and unresolved targets. While a step is active, Beacon keeps `rect` fresh on scroll, resize, and target layout changes — no app-side refresh call is needed.

### BeaconTourEvent

```ts
type BeaconTourEvent =
  | { readonly index: number; readonly step: BeaconStep; readonly type: 'step:start' }
  | { readonly index: number; readonly step: BeaconStep; readonly type: 'step:complete' }
  | { readonly reason: 'finish' | 'skip'; readonly type: 'tour:complete' }
  | { readonly type: 'tour:dismiss' }
  | { readonly status: BeaconStatus; readonly type: 'status-change' }
  | { readonly message: string; readonly type: 'target-missing' }
  | { readonly index: number; readonly message: string; readonly step: BeaconStep; readonly type: 'target-waiting' }
  | { readonly error: unknown; readonly message: string; readonly type: 'warning' }
  | { readonly type: 'dispose' };
```

Notable moments a tour reports through `tap()`. `target-missing` means a step was skipped because its target did not appear in time; `target-waiting` fires when a step begins waiting for its target to mount; `warning` carries storage or handler failures.

### BeaconCoachmarkEvent

```ts
type BeaconCoachmarkEvent =
  | { readonly type: 'coachmark:show' }
  | { readonly type: 'coachmark:dismiss' }
  | { readonly type: 'target-waiting' }
  | { readonly error: unknown; readonly message: string; readonly type: 'warning' }
  | { readonly type: 'dispose' };
```

Notable moments a coachmark reports through `tap()`.

### BeaconTourHandle / BeaconCoachmarkHandle

The objects returned by `createTour()` and `createCoachmark()`, documented in [Core Functions](#core-functions). Both expose `disposalSignal`, `disposed`, `tap()`, `dispose()`, and `[Symbol.dispose]()`.

## Errors

| Error | Triggered by | Notes |
| --- | --- | --- |
| `BeaconError` | Base for all beacon errors | `name` is the subclass name; `cause` supported via `ErrorOptions`. |
| `BeaconConfigError` | Empty `id`, empty `steps`, missing/duplicate step ids | Thrown synchronously from `createTour()`/`createCoachmark()`. |
| `BeaconDisposedError` | Calling handle methods after `dispose()` | `dispose()` itself never throws. |
