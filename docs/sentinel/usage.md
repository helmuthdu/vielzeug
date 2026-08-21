---
title: Sentinel — Usage Guide
description: Observe browser and DOM state with explicit reactive lifecycles.
---

[[toc]]

## Basic Usage

Create a Sentinel, read its current state, subscribe to invalidations, and release both resources when the owner ends.

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

`subscribe()` notifies you that the value changed; read the new snapshot from `.value` inside the listener. Disposing a Sentinel stops its browser observer or event listeners. It does not unsubscribe consumers from the Ripple readable.

## Observe Window State

Use `createViewport()` for viewport dimensions and device pixel ratio.

```ts
import { createViewport } from '@vielzeug/sentinel';

const viewport = createViewport();
console.log(viewport.value.width);
console.log(viewport.value.height);
console.log(viewport.value.dpr);
```

Use `createNetwork()` for online status and the optional Network Information API snapshot.

```ts
import { createNetwork } from '@vielzeug/sentinel';

const network = createNetwork();
console.log(network.value.online);
console.log(network.value.connection);
```

`connection` is `null` when `navigator.connection` is unavailable.

## Observe Media Queries

Use `createMediaQuery()` to react to a browser media query.

```ts
import { createMediaQuery, SentinelUnavailableError } from '@vielzeug/sentinel';

function observeReducedMotion(): () => void {
  try {
    const reducedMotion = createMediaQuery('(prefers-reduced-motion: reduce)');

    const applyPreference = () => {
      document.documentElement.classList.toggle('reduce-motion', reducedMotion.value.matches);
    };

    applyPreference();
    const unsubscribe = reducedMotion.subscribe(applyPreference);

    return () => {
      unsubscribe();
      reducedMotion.dispose();
    };
  } catch (error) {
    if (!(error instanceof SentinelUnavailableError)) throw error;
    return () => {};
  }
}

const stopObserving = observeReducedMotion();
// Call stopObserving() when the owning view unmounts.
```

`createMediaQuery()` throws `SentinelUnavailableError` when `matchMedia` is unavailable.

## Observe Elements

### Element Size

Use `createElementSize()` after the target element exists.

```ts
import { createElementSize } from '@vielzeug/sentinel';

const panel = document.querySelector<HTMLElement>('[data-panel]');
if (!panel) throw new Error('Panel not found');

const size = createElementSize(panel);
const unsubscribe = size.subscribe(() => {
  const current = size.value;
  if (current) panel.dataset.width = String(current.width);
});
```

The initial state is `null` until `ResizeObserver` reports its first measurement.

### Intersection

Use `createIntersection()` to observe visibility relative to the viewport or a custom root.

```ts
import { createIntersection } from '@vielzeug/sentinel';

const target = document.querySelector<HTMLElement>('[data-lazy-section]');
if (!target) throw new Error('Section not found');

const intersection = createIntersection(target, {
  rootMargin: '100px',
  threshold: [0, 0.5, 1],
});

const unsubscribe = intersection.subscribe(() => {
  target.hidden = !intersection.value?.isIntersecting;
});
```

The initial state is `null` until `IntersectionObserver` reports its first entry.

## Control Ownership

Call `dispose()` to stop observation. Disposal is idempotent.

```ts
const viewport = createViewport();

viewport.dispose();
viewport.dispose();
```

Pass an `AbortSignal` when several Sentinels share one lifetime.

```ts
const controller = new AbortController();
const viewport = createViewport({ signal: controller.signal });
const network = createNetwork({ signal: controller.signal });

controller.abort();
```

An injected Ripple runtime creates the state signal. Runtime disposal and Sentinel disposal remain separate responsibilities.

```ts
import { createRipple } from '@vielzeug/ripple';
import { createViewport } from '@vielzeug/sentinel';

const ripple = createRipple();
const viewport = createViewport({ runtime: ripple });

viewport.dispose();
ripple.dispose();
```

## Handle Unavailable APIs

`createMediaQuery()`, `createElementSize()`, and `createIntersection()` report unavailable platform APIs with `SentinelUnavailableError`.

```ts
import { createElementSize, SentinelUnavailableError } from '@vielzeug/sentinel';

try {
  const size = createElementSize(document.body);
  size.dispose();
} catch (error) {
  if (error instanceof SentinelUnavailableError) {
    console.warn(error.message);
  } else {
    throw error;
  }
}
```

Invoke all factories only in a browser client lifecycle. Package imports are safe during SSR, but factories require browser or DOM APIs.

## Framework Integration

Create the Sentinel after the component mounts, mirror its current value into framework state, and unsubscribe and dispose on unmount.

::: code-group

```tsx [React]
import { createViewport, type ViewportState } from '@vielzeug/sentinel';
import { useEffect, useState } from 'react';

export function ViewportSize() {
  const [viewportState, setViewportState] = useState<ViewportState | null>(null);

  useEffect(() => {
    const viewport = createViewport();
    const update = () => setViewportState(viewport.value);

    update();
    const unsubscribe = viewport.subscribe(update);

    return () => {
      unsubscribe();
      viewport.dispose();
    };
  }, []);

  return <output>{viewportState ? `${viewportState.width}×${viewportState.height}` : 'Measuring…'}</output>;
}
```

```vue [Vue 3]
<script setup lang="ts">
import { createViewport, type Sentinel, type ViewportState } from '@vielzeug/sentinel';
import { onMounted, onUnmounted, ref } from 'vue';

const viewportState = ref<ViewportState | null>(null);
let viewport: Sentinel<ViewportState> | undefined;
let unsubscribe: (() => void) | undefined;

onMounted(() => {
  viewport = createViewport();
  const update = () => {
    viewportState.value = viewport?.value ?? null;
  };

  update();
  unsubscribe = viewport.subscribe(update);
});

onUnmounted(() => {
  unsubscribe?.();
  viewport?.dispose();
});
</script>

<template>
  <output>
    {{ viewportState ? `${viewportState.width}×${viewportState.height}` : 'Measuring…' }}
  </output>
</template>
```

```svelte [Svelte]
<script lang="ts">
  import { createViewport, type ViewportState } from '@vielzeug/sentinel';
  import { onMount } from 'svelte';

  let viewportState: ViewportState | null = null;

  onMount(() => {
    const viewport = createViewport();
    const update = () => {
      viewportState = viewport.value;
    };

    update();
    const unsubscribe = viewport.subscribe(update);

    return () => {
      unsubscribe();
      viewport.dispose();
    };
  });
</script>

<output>
  {viewportState ? `${viewportState.width}×${viewportState.height}` : 'Measuring…'}
</output>
```

:::

## Working with Other Vielzeug Libraries

### Sentinel + Ripple

Use Ripple to derive values from one or more Sentinel states. Dispose the watcher separately from the Sentinels.

```ts
import { computed, watch } from '@vielzeug/ripple';
import { createMediaQuery, createViewport } from '@vielzeug/sentinel';

const viewport = createViewport();
const mobileQuery = createMediaQuery('(max-width: 768px)');
const compact = computed(() => mobileQuery.value.matches || viewport.value.width < 400);
const compactWatcher = watch(compact, (value) => console.log('Compact layout:', value), { immediate: true });

compactWatcher.dispose();
mobileQuery.dispose();
viewport.dispose();
```

### Sentinel + Ore

Create DOM-dependent Sentinels in `onMounted()` and register both subscription and Sentinel cleanup with the component.

```ts
import { define, html, onCleanup, onMounted, ref } from '@vielzeug/ore';
import { createElementSize } from '@vielzeug/sentinel';

define('measured-panel', {
  setup() {
    const panel = ref<HTMLElement>();

    onMounted(() => {
      const element = panel.value;
      if (!element) return;

      const size = createElementSize(element);
      const update = () => {
        element.dataset.width = String(size.value?.width ?? 0);
      };
      const unsubscribe = size.subscribe(update);

      onCleanup(() => {
        unsubscribe();
        size.dispose();
      });
    });

    return html`<section ref=${panel}>Measured panel</section>`;
  },
});
```

## Best Practices

- **Create** DOM-dependent Sentinels only after their target elements exist.
- **Read** the latest snapshot from `.value` inside subscription listeners.
- **Unsubscribe** Ripple listeners when their owner ends.
- **Dispose** every Sentinel to release browser observers and event listeners.
- **Share** an `AbortSignal` when multiple Sentinels have the same lifetime.
- **Guard** APIs that can throw `SentinelUnavailableError`.
- **Treat** `NetworkState.connection` as optional browser enhancement data.
- **Invoke** factories only in browser client lifecycles.
