# @vielzeug/sentinel

Reactive browser and DOM observations with explicit ownership.

Sentinel exposes viewport, network, media query, element size, and intersection state as disposable Ripple readables.

## Install

```sh
pnpm add @vielzeug/sentinel @vielzeug/ripple
```

## Usage

```ts
import { createViewport } from '@vielzeug/sentinel';

function observeViewport(): () => void {
  const viewport = createViewport();
  const render = () => {
    console.log(`${viewport.value.width}×${viewport.value.height} at ${viewport.value.dpr}dpr`);
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

A Sentinel implements Ripple's `Readable<T>` contract:

```ts
import { computed, watch } from '@vielzeug/ripple';
import { createMediaQuery, createViewport } from '@vielzeug/sentinel';

const viewport = createViewport();
const mobileQuery = createMediaQuery('(max-width: 768px)');
const compact = computed(() => mobileQuery.value.matches || viewport.value.width < 400);
const watcher = watch(compact, console.log, { immediate: true });

watcher.dispose();
mobileQuery.dispose();
viewport.dispose();
```

Element observations start at `null` until the browser reports the first entry:

```ts
import { createElementSize } from '@vielzeug/sentinel';

const element = document.getElementById('panel');
if (!element) throw new Error('Panel not found');

const size = createElementSize(element);
const unsubscribe = size.subscribe(() => {
  console.log(size.value?.width);
});

unsubscribe();
size.dispose();
```

## Lifecycle

Every Sentinel provides `dispose()`, `disposed`, `disposalSignal`, and `[Symbol.dispose]()`. Pass an external signal when several observers share one lifetime:

```ts
const controller = new AbortController();
const viewport = createViewport({ signal: controller.signal });
const network = createNetwork({ signal: controller.signal });

controller.abort();
```

## Isolated Ripple Runtime

Pass an isolated Ripple runtime when Sentinel state must participate in that graph:

```ts
import { createRipple } from '@vielzeug/ripple';
import { createViewport } from '@vielzeug/sentinel';

const ripple = createRipple();
const viewport = createViewport({ runtime: ripple });

viewport.dispose();
ripple.dispose();
```

Dispose Sentinels before disposing their injected Ripple runtime.

## Unavailable APIs

`createMediaQuery()`, `createElementSize()`, and `createIntersection()` throw `SentinelUnavailableError` when the required browser API is absent. Window-based factories throw the same error when no browser window is available.

```ts
import { createMediaQuery, SentinelUnavailableError } from '@vielzeug/sentinel';

try {
  const media = createMediaQuery('(prefers-reduced-motion: reduce)');
  media.dispose();
} catch (error) {
  if (!(error instanceof SentinelUnavailableError)) throw error;
}
```
