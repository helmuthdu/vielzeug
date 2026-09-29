---
title: Sentinel — API Reference
description: Factory signatures, options, state types, lifecycle handles, and errors for Sentinel.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `createViewport()` | Observe layout viewport dimensions and device pixel ratio | Sync | Requires a browser Window |
| `createNetwork()` | Observe online status and optional connection information | Sync | `connection` is often `null` |
| `createMediaQuery()` | Observe one media query | Sync | Throws when `matchMedia` is unavailable |
| `createElementSize()` | Observe element content-box dimensions | Sync | Value is `null` before the first delivery |
| `createIntersection()` | Observe element intersection state | Sync | Value is `null` before the first delivery |
| `createWakeLock()` | Prevent the screen from sleeping | Async | Degrades silently when the Wake Lock API is unavailable |
| `createFullscreen()` | Track and drive document fullscreen state | Sync | Degrades silently when the Fullscreen API is unavailable |
| `Sentinel<T>` | Expose an external-store snapshot with explicit browser-resource ownership | Sync | Call `getSnapshot()` inside subscription listeners |
| `SentinelError` | Base class for package-defined errors | Sync | Catch a subtype when recovery is specific |
| `SentinelUnavailableError` | Report an unavailable browser API | Sync | Invalid observer inputs retain their native errors |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/sentinel` | All factories, state types, option types, and error classes |

## Factories

### `createViewport()`

```ts
function createViewport(options?: WindowSentinelOptions): Sentinel<ViewportState>;
```

Returns a Sentinel initialized from the layout viewport's `innerWidth`, `innerHeight`, and `devicePixelRatio`.

| Parameter | Type | Description |
| --- | --- | --- |
| `options.target` | `Window` | Window to observe instead of the global browser window |
| `options.signal` | `AbortSignal` | External signal that disposes the Sentinel |

**Returns:** `Sentinel<ViewportState>`.

**Example**

```ts
import { createViewport } from '@vielzeug/sentinel';

const viewport = createViewport();
console.log(viewport.getSnapshot().width);
viewport.dispose();
```

---

### `createNetwork()`

```ts
function createNetwork(options?: WindowSentinelOptions): Sentinel<NetworkState>;
```

Returns a Sentinel initialized from `navigator.onLine` and the optional Network Information API.

| Parameter | Type | Description |
| --- | --- | --- |
| `options.target` | `Window` | Window whose navigator and events are observed |
| `options.signal` | `AbortSignal` | External signal that disposes the Sentinel |

**Returns:** `Sentinel<NetworkState>`.

**Example**

```ts
import { createNetwork } from '@vielzeug/sentinel';

const network = createNetwork();
console.log(network.getSnapshot().online);
network.dispose();
```

---

### `createMediaQuery()`

```ts
function createMediaQuery(query: string, options?: WindowSentinelOptions): Sentinel<MediaQueryState>;
```

Returns a Sentinel initialized from `matchMedia(query).matches`.

| Parameter | Type | Description |
| --- | --- | --- |
| `query` | `string` | CSS media query to observe |
| `options.target` | `Window` | Window whose `matchMedia` method is used |
| `options.signal` | `AbortSignal` | External signal that disposes the Sentinel |

**Returns:** `Sentinel<MediaQueryState>`.

**Example**

```ts
import { createMediaQuery } from '@vielzeug/sentinel';

const darkMode = createMediaQuery('(prefers-color-scheme: dark)');
console.log(darkMode.getSnapshot().matches);
darkMode.dispose();
```

---

### `createElementSize()`

```ts
function createElementSize(element: Element, options?: SentinelOptions): Sentinel<ElementSizeState | null>;
```

Returns a Sentinel containing the latest `ResizeObserverEntry.contentRect` dimensions.

| Parameter | Type | Description |
| --- | --- | --- |
| `element` | `Element` | Element to observe |
| `options.signal` | `AbortSignal` | External signal that disposes the Sentinel |

**Returns:** `Sentinel<ElementSizeState | null>`. The initial value is `null`.

**Example**

```ts
import { createElementSize } from '@vielzeug/sentinel';

const size = createElementSize(document.body);
const unsubscribe = size.subscribe(() => {
  console.log(size.getSnapshot()?.width);
});

unsubscribe();
size.dispose();
```

---

### `createIntersection()`

```ts
function createIntersection(
  element: Element,
  options?: CreateIntersectionOptions,
): Sentinel<IntersectionState | null>;
```

Returns a Sentinel containing normalized fields from the latest IntersectionObserver entry.

| Parameter | Type | Description |
| --- | --- | --- |
| `element` | `Element` | Element to observe |
| `options.root` | `Element \| Document \| null` | Intersection root |
| `options.rootMargin` | `string` | Margin applied to the root |
| `options.scrollMargin` | `string` | Margin applied to nested scroll containers |
| `options.threshold` | `number \| number[]` | Intersection ratio threshold or thresholds |
| `options.signal` | `AbortSignal` | External signal that disposes the Sentinel |

**Returns:** `Sentinel<IntersectionState | null>`. The initial value is `null`.

**Example**

```ts
import { createIntersection } from '@vielzeug/sentinel';

const intersection = createIntersection(document.body, { threshold: 0.5 });
const unsubscribe = intersection.subscribe(() => {
  console.log(intersection.getSnapshot()?.isIntersecting);
});

unsubscribe();
intersection.dispose();
```

---

### `createWakeLock()`

```ts
function createWakeLock(options?: SentinelOptions & { readonly target?: Window }): WakeLockSentinel;
```

Returns a Sentinel-backed screen wake lock. `request()` acquires the lock; `release()` frees it. When the tab is hidden the browser auto-releases the lock; the Sentinel re-acquires it automatically on `visibilitychange` if the lock was active. Degrades silently when the Screen Wake Lock API is unavailable.

| Parameter | Type | Description |
| --- | --- | --- |
| `options.target` | `Window` | Window whose document and navigator are used |
| `options.signal` | `AbortSignal` | External signal that disposes the Sentinel |

**Returns:** `WakeLockSentinel`.

**Example**

```ts
import { createWakeLock } from '@vielzeug/sentinel';

const wakeLock = createWakeLock();
wakeLock.request();

const unsubscribe = wakeLock.subscribe(() => {
  console.log('Wake lock active:', wakeLock.getSnapshot().active);
});

// Later
wakeLock.release();
unsubscribe();
wakeLock.dispose();
```

---

### `createFullscreen()`

```ts
function createFullscreen(options?: SentinelOptions & { readonly target?: Window }): FullscreenSentinel;
```

Returns a Sentinel-backed fullscreen view. `request()` enters fullscreen for an element (default: the document element), `exit()` leaves it, and `toggle()` flips it. All degrade silently when the Fullscreen API is missing or the browser refuses (user-activation requirements). Disposing the sentinel exits fullscreen and stops tracking `fullscreenchange`.

| Parameter | Type | Description |
| --- | --- | --- |
| `options.target` | `Window` | Window whose document is tracked |
| `options.signal` | `AbortSignal` | External signal that disposes the Sentinel |

**Returns:** `FullscreenSentinel`.

**Example**

```ts
import { createFullscreen } from '@vielzeug/sentinel';

const fullscreen = createFullscreen();
fullscreen.request();

const unsubscribe = fullscreen.subscribe(() => {
  console.log('Fullscreen active:', fullscreen.getSnapshot().active);
});

// Later
fullscreen.toggle();
unsubscribe();
fullscreen.dispose();
```

## Types

### `Sentinel<T>`

```ts
interface Sentinel<T> extends Subscribable<T>, Disposable {
  tap(handler: (event: SentinelEvent) => void, options?: { signal?: AbortSignal }): () => void;
}

interface Subscribable<T> {
  getSnapshot(): T;
  subscribe(listener: () => void): () => void;
}
```

`Sentinel<T>` follows the standard external-store snapshot/subscription contract and owns the underlying browser resource. `getSnapshot()`, `subscribe()`, and `dispose()` are stable callback-safe functions. `dispose()` stops observation, clears listeners, and aborts `disposalSignal`.

| Member | Type | Description |
| --- | --- | --- |
| `getSnapshot()` | `() => T` | Return the current immutable snapshot |
| `subscribe(listener)` | `(listener: () => void) => () => void` | Subscribe to snapshot changes and return an unsubscribe function |
| `disposed` | `boolean` | Whether observation has ended |
| `disposalSignal` | `AbortSignal` | Aborts when observation ends |
| `dispose()` | `() => void` | Stop observation and release owned browser resources |
| `tap(handler, options?)` | `(handler: (event: SentinelEvent) => void, options?: { signal?: AbortSignal }) => () => void` | Observe `{ type: 'error' }` when a listener throws and `{ type: 'dispose' }` on disposal; handler errors are swallowed |
| `[Symbol.dispose]()` | `() => void` | Dispose through the explicit resource-management protocol |

---

### `SentinelOptions`

```ts
interface SentinelOptions {
  readonly signal?: AbortSignal;
}
```

`options.signal` disposes the Sentinel when it aborts. Passing an already-aborted signal throws `SentinelError` instead of constructing a dead handle.

---

### `createSentinel()`

```ts
function createSentinel<T>(
  options: CreateSentinelOptions<T>,
  setup: (update: (value: T) => void) => () => void,
): Sentinel<T>
```

The generic primitive every built-in sensor is built on. `setup` starts observing and returns its cleanup; it calls `update(value)` whenever the underlying source changes. Use it for platform sensors the built-ins do not cover (for example `prefers-reduced-motion`).

---

### `WindowSentinelOptions`

```ts
interface WindowSentinelOptions extends SentinelOptions {
  readonly target?: Window;
}
```

---

### `CreateIntersectionOptions`

```ts
interface CreateIntersectionOptions extends SentinelOptions {
  readonly root?: Element | Document | null;
  readonly rootMargin?: string;
  readonly scrollMargin?: string;
  readonly threshold?: number | number[];
}
```

---

### `ViewportState`

```ts
interface ViewportState {
  readonly dpr: number;
  readonly height: number;
  readonly width: number;
}
```

---

### `NetworkConnectionSnapshot`

```ts
interface NetworkConnectionSnapshot {
  readonly downlink?: number;
  readonly effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  readonly rtt?: number;
  readonly saveData?: boolean;
}
```

---

### `NetworkState`

```ts
interface NetworkState {
  readonly connection: NetworkConnectionSnapshot | null;
  readonly online: boolean;
}
```

---

### `MediaQueryState`

```ts
interface MediaQueryState {
  readonly matches: boolean;
}
```

---

### `ElementSizeState`

```ts
interface ElementSizeState {
  readonly height: number;
  readonly width: number;
}
```

---

### `IntersectionState`

```ts
interface IntersectionState {
  readonly intersectionRatio: number;
  readonly isIntersecting: boolean;
}
```

---

### `WakeLockState`

```ts
interface WakeLockState {
  readonly active: boolean;
  readonly supported: boolean;
}
```

| Field | Type | Description |
| --- | --- | --- |
| `active` | `boolean` | Whether a wake lock is currently held |
| `supported` | `boolean` | Whether the Screen Wake Lock API is available in this environment |

---

### `WakeLockSentinel`

```ts
interface WakeLockSentinel extends Sentinel<WakeLockState> {
  request(): void;
  release(): void;
}
```

A `Sentinel<WakeLockState>` with two additional methods:

| Member | Type | Description |
| --- | --- | --- |
| `request()` | `() => void` | Acquire the screen wake lock. No-op if already active or unsupported |
| `release()` | `() => void` | Release the wake lock. No-op if not active |

---

### `FullscreenState`

```ts
interface FullscreenState {
  readonly active: boolean;
  readonly supported: boolean;
}
```

| Property | Type | Description |
| --- | --- | --- |
| `active` | `boolean` | Whether an element is currently shown fullscreen |
| `supported` | `boolean` | Whether the Fullscreen API is available in this environment |

---

### `FullscreenSentinel`

```ts
interface FullscreenSentinel extends Sentinel<FullscreenState> {
  request(element?: Element): void;
  exit(): void;
  toggle(element?: Element): void;
}
```

A `Sentinel<FullscreenState>` with three additional methods:

| Member | Type | Description |
| --- | --- | --- |
| `request(element?)` | `() => void` | Enter fullscreen for `element` (default: the document element). No-op when already active or unsupported |
| `exit()` | `() => void` | Leave fullscreen. No-op when not active |
| `toggle(element?)` | `() => void` | Flip fullscreen for `element` (default: the document element) |

## Errors

### `SentinelError`

```ts
class SentinelError extends Error {
  constructor(message: string, options?: ErrorOptions);
}
```

Base class for package-defined errors.

---

### `SentinelUnavailableError`

```ts
class SentinelUnavailableError extends SentinelError {}
```

Thrown when a required browser API or Window is unavailable:

- `createViewport()` and `createNetwork()` when no browser Window is available.
- `createMediaQuery()` when `matchMedia` is unavailable.
- `createElementSize()` when the element has no Window or `ResizeObserver` is unavailable.
- `createIntersection()` when the element has no Window or `IntersectionObserver` is unavailable.
- `createWakeLock()` when no browser Window is available.
- `createFullscreen()` when no browser Window is available.

Native setup errors remain unchanged, including invalid observer options or targets.
