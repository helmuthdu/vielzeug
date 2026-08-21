---
title: Gesture — Usage Guide
description: Track one-axis pointer movement and apply application-specific completion rules.
---

[[toc]]

## Basic Usage

Create one pan handle for the element that owns the interaction.

```ts
import { createPanGesture } from '@vielzeug/gesture';

const pan = createPanGesture(row, {
  axis: 'x',
  onMove: ({ distance }) => {
    row.style.transform = `translateX(${distance}px)`;
  },
  onEnd: ({ distance, reason }) => {
    row.style.transform = '';

    if (reason === 'release' && Math.abs(distance) >= 64) archive();
  },
});
```

## Completion Rules

Gesture reports movement and terminal state but does not decide what constitutes a swipe. Apply thresholds and allowed directions in `onEnd`.

```ts
const pan = createPanGesture(panel, {
  axis: 'x',
  onEnd: ({ distance, reason }) => {
    if (reason === 'release' && distance <= -80) {
      openNext();
    } else {
      resetPanel();
    }
  },
});
```

## Direction Recognition

The gesture remains pending during small movement. It activates only after movement favors the configured axis. Cross-axis movement ends the pending interaction without invoking callbacks.

Use the corresponding `touch-action` value so the browser retains native scrolling on the other axis.

```css
.swipe-row {
  touch-action: pan-y;
}
```

```ts
const pan = createPanGesture(row, { axis: 'x', onMove });
```

## Pointer Capture

Pointer capture is enabled by default. After axis intent is accepted, Gesture captures the pointer on the bound target while continuing to track movement through document-level listeners. This is the reliable default for ordinary drag surfaces.

Disable capture when nested or newly revealed controls must retain native pointer-up and click targeting:

```ts
const pan = createPanGesture(row, {
  axis: 'x',
  pointerCapture: false,
  onMove: renderReveal,
  onEnd: settleReveal,
});
```

Document-level tracking still keeps the pan active outside the target. Disabling capture changes event targeting, not gesture tracking.

## Interactive Descendants

Use `shouldStart` when buttons, links, or form controls inside the surface must not start a pan.

```ts
const pan = createPanGesture(notification, {
  axis: 'x',
  pointerCapture: false,
  shouldStart: (event) =>
    !event
      .composedPath()
      .some((node) => node instanceof Element && node.matches('button, a, input, select, textarea')),
  onMove,
  onEnd,
});
```

`shouldStart` protects controls under the initial pointer. `pointerCapture: false` additionally protects controls that appear beneath the pointer during a reveal interaction.

## Disabled State

A boolean disables the recognizer permanently. A getter supports state that changes while the handle is alive.

```ts
const pan = createPanGesture(row, {
  disabled: () => isLocked,
  onEnd: ({ reason }) => {
    if (reason === 'cancel') resetRow();
  },
});
```

When the getter becomes `true`, the next pointer event cancels an active pan.

## Lifecycle

Dispose the target-bound handle when its owning UI scope unmounts.

```ts
const pan = createPanGesture(element, { onEnd, onMove });

onCleanup(() => pan.dispose());
```

Use `cancel()` to stop a pending or active interaction without disposing the handle. An active interaction emits `onEnd` with `reason: 'cancel'`.

## Framework Integration

Create the handle after the target element exists and dispose it on unmount.

::: code-group

```tsx [React]
import { useEffect, useRef } from 'react';
import { createPanGesture } from '@vielzeug/gesture';

function SwipeRow({ onDismiss }: { onDismiss: () => void }) {
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;

    const pan = createPanGesture(row, {
      axis: 'x',
      onMove: ({ distance }) => {
        row.style.transform = `translateX(${distance}px)`;
      },
      onEnd: ({ distance, reason }) => {
        row.style.transform = '';
        if (reason === 'release' && Math.abs(distance) >= 64) onDismiss();
      },
    });

    return () => pan.dispose();
  }, [onDismiss]);

  return <div ref={rowRef}>Swipe me</div>;
}
```

```vue [Vue 3]
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { createPanGesture, type PanGesture } from '@vielzeug/gesture';

const emit = defineEmits<{ dismiss: [] }>();
const rowEl = ref<HTMLDivElement | null>(null);
let pan: PanGesture | undefined;

onMounted(() => {
  const row = rowEl.value;
  if (!row) return;

  pan = createPanGesture(row, {
    axis: 'x',
    onEnd: ({ distance, reason }) => {
      if (reason === 'release' && Math.abs(distance) >= 64) emit('dismiss');
    },
  });
});

onUnmounted(() => pan?.dispose());
</script>

<template>
  <div ref="rowEl">Swipe me</div>
</template>
```

```svelte [Svelte]
<script lang="ts">
  import { onMount } from 'svelte';
  import { createPanGesture } from '@vielzeug/gesture';

  let { ondismiss = () => {} }: { ondismiss: () => void } = $props();
  let rowEl: HTMLDivElement;

  onMount(() => {
    const pan = createPanGesture(rowEl, {
      axis: 'x',
      onEnd: ({ distance, reason }) => {
        if (reason === 'release' && Math.abs(distance) >= 64) ondismiss();
      },
    });

    return () => pan.dispose();
  });
</script>

<div bind:this={rowEl}>Swipe me</div>
```

:::

## Working with Other Vielzeug Libraries

### Gesture + Refine

Refine uses Gesture internally for carousel, drawer, toast, and list-item pointer interactions. Custom surfaces can use the same pan lifecycle while keeping visual state local.

```ts
import { createPanGesture } from '@vielzeug/gesture';

const pan = createPanGesture(panel, {
  axis: 'x',
  onMove: ({ distance }) => {
    panel.style.transform = `translateX(${distance}px)`;
  },
  onEnd: ({ distance, reason }) => {
    panel.style.transform = '';
    if (reason === 'release' && Math.abs(distance) >= 80) revealActions();
  },
});
```

### Gesture + Dnd

Gesture tracks a constrained pointer pan. Dnd owns draggable items, sortable lists, and drop targets. Keep them separate.

## Best Practices

- **Set** `touch-action` for the axis the browser should continue scrolling.
- **Use** `shouldStart` to exclude nested interactive controls.
- **Disable** pointer capture when nested or newly revealed controls must keep native release targeting.
- **Apply** thresholds and direction rules in `onEnd`.
- **Treat** `reason: 'cancel'` as a reset path, never a commit path.
- **Keep** `onMove` rendering lightweight.
- **Dispose** the handle when its target leaves the UI.
