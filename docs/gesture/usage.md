---
title: Gesture — Usage Guide
description: Track unrestricted pointer dragging and axis-locked pans with application-owned rendering and completion.
---

[[toc]]

## Basic Usage

Create one handle for the element that owns the interaction. This example creates its surface, applies the required touch policy, and disposes the handle when the page unloads.

```ts
import { createPanGesture } from '@vielzeug/gesture';

const row = document.body.appendChild(document.createElement('div'));
row.textContent = 'Swipe to archive';
row.style.touchAction = 'pan-y';

const pan = createPanGesture(row, {
  axis: 'x',
  onMove: ({ distance }) => {
    row.style.transform = `translateX(${distance}px)`;
  },
  onEnd: ({ distance, reason }) => {
    row.style.transform = '';
    if (reason === 'release' && Math.abs(distance) >= 64) {
      pan.dispose();
      row.remove();
    }
  },
});

window.addEventListener('pagehide', () => pan.dispose(), { once: true });
```

## Track Two-Dimensional Dragging

Use `createDragGesture()` when movement must remain unrestricted in both dimensions:

```ts
import { createDragGesture } from '@vielzeug/gesture';

const card = document.querySelector<HTMLElement>('[data-draggable]');
if (!card) throw new Error('Missing [data-draggable] element');

const drag = createDragGesture(card, {
  activationDistance: 6,
  onMove: ({ delta }) => {
    card.style.translate = `${delta.x}px ${delta.y}px`;
  },
  onEnd: () => {
    card.style.translate = '';
  },
});

window.addEventListener('pagehide', () => drag.dispose(), { once: true });
```

`start`, `current`, and `delta` are readonly `{ x, y }` points. Set `touch-action: none` when the surface owns movement in both dimensions. Drag recognition does not provide previews, drop targets, DOM movement, or `DataTransfer`; use Dnd for those semantics.

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

The default `activationDistance` is 6 pixels. Tune direction-recognition slop for touch density or component-specific needs:

```ts
const pan = createPanGesture(row, {
  axis: 'x',
  activationDistance: 12,
  onMove,
  onEnd,
});
```

Set `activationDistance: 0` when the first pointer move with non-zero displacement should activate immediately. Zero-motion events remain pending.

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

Pointer capture is enabled by default. After axis intent is accepted, Gesture attempts to capture the pointer while continuing to track movement through document-level listeners. Capture failure—for example after target detachment or pointer termination—falls back to document tracking without stranding the session.

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

When the getter becomes `true`, the next pointer event cancels an active pan. Window blur or a hidden owner document also cancels active tracking so a lost release cannot block later gestures.

Gesture snapshots fixed callbacks and capture policy at construction. Use the `axis` and `disabled` functions for behavior that must remain dynamic instead of mutating the options object.

## Lifecycle

Dispose the target-bound handle when its owning UI scope unmounts.

```ts
const element = document.querySelector<HTMLElement>('[data-pan]');
if (!element) throw new Error('Missing [data-pan] element');

const owner = new AbortController();
const request = new AbortController();
const pan = createPanGesture(element, {
  axis: 'x',
  signal: owner.signal,
});

const childSignal = AbortSignal.any([pan.disposalSignal, request.signal]);
window.addEventListener('pagehide', () => owner.abort(), { once: true });
```

Pass `{ signal }` to dispose with an existing owner signal. `disposalSignal` always aborts when Gesture finishes teardown, so child work can compose with the handle regardless of how disposal starts.

Use `cancel()` to stop a pending or active interaction without disposing the handle. An active interaction emits `onEnd` with `reason: 'cancel'`. Call `cancel()` before `dispose()` when a connected surface needs its `onEnd` reset path; disposal itself does not invoke callbacks.

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

Gesture owns pointer recognition: unrestricted two-dimensional drag and one-axis pan. Dnd builds touch sorting on `createDragGesture()`, then owns `DataTransfer`, previews, hit-testing, file drop zones, keyboard sorting, DOM reordering, and connected-list transactions. Use Dnd when an item is picked up and dropped; use Gesture directly when application code owns rendering and completion.

## Best Practices

- **Set** `touch-action` for the axis the browser should continue scrolling.
- **Use** `shouldStart` to exclude nested interactive controls.
- **Disable** pointer capture when nested or newly revealed controls must keep native release targeting.
- **Apply** completion thresholds and direction rules in `onEnd`; use `activationDistance` only for recognition slop.
- **Treat** `reason: 'cancel'` as a reset path, never a commit path.
- **Keep** `onMove` rendering lightweight.
- **Dispose** the handle when its target leaves the UI.
