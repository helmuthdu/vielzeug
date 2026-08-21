---
title: Gesture — Usage Guide
description: Integrate pointer swipe recognition with component state and lifecycle.
---

[[toc]]

## Basic Usage

Create one swipe handle per interactive surface and mount it on that element.

```ts
import { createSwipeGesture } from '@vielzeug/gesture';

const swipe = createSwipeGesture({
  axis: 'x',
  onCommit: ({ distance }) => {
    if (distance > 0) archive();
    else openDetails();
  },
});

swipe.mount(row);
```

## Commit Thresholds

Set an explicit threshold or a dynamic getter when layout changes at runtime.

```ts
const swipe = createSwipeGesture({
  threshold: () => Math.max(40, panel.offsetWidth * 0.18),
});
```

## Custom Commit Rules

Use `shouldCommit` when commitment should depend on more than absolute distance.

```ts
const swipe = createSwipeGesture({
  shouldCommit: ({ distance, threshold }) => distance < 0 && Math.abs(distance) >= threshold,
});
```

## Pointer Capture Control

Disable capture when child actions must remain clickable mid-gesture.

```ts
const swipe = createSwipeGesture({
  captureTarget: () => null,
});
```

## Disabled behavior

Choose how the gesture reacts when `disabled` flips true while a swipe is already active.

```ts
const swipe = createSwipeGesture({
  disabled: () => isLocked,
  disabledBehavior: 'cancel-active',
  onCancel: () => resetStyles(),
});
```

## Lifecycle

Dispose the handle when the owning UI scope unmounts.

```ts
const swipe = createSwipeGesture({ onCommit });

onCleanup(() => swipe.dispose());
```

## Framework Integration

Create the swipe handle once per interactive surface and dispose it on unmount. Pointer listeners live on the element that owns the gesture.

::: code-group

```tsx [React]
import { useEffect, useRef } from 'react';
import { createSwipeGesture } from '@vielzeug/gesture';

function SwipeRow({ onSwipeLeft, onSwipeRight }: {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  // Persist callbacks across renders so the gesture handle stays stable.
  const handlersRef = useRef({ onSwipeLeft, onSwipeRight });
  handlersRef.current = { onSwipeLeft, onSwipeRight };

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;

    const swipe = createSwipeGesture({
      axis: 'x',
      onCommit: ({ distance }) => {
        if (distance < 0) handlersRef.current.onSwipeLeft();
        else handlersRef.current.onSwipeRight();
      },
    });
    const unmountSwipe = swipe.mount(row);

    return () => {
      unmountSwipe();
      swipe.dispose();
    };
  }, []);

  return <div ref={rowRef}>Swipe me</div>;
}
```

```vue [Vue 3]
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { createSwipeGesture } from '@vielzeug/gesture';

const emit = defineEmits<{ swipeLeft: []; swipeRight: [] }>();

const rowEl = ref<HTMLDivElement | null>(null);
let swipe: ReturnType<typeof createSwipeGesture> | undefined;

onMounted(() => {
  if (!rowEl.value) return;

  swipe = createSwipeGesture({
    axis: 'x',
    onCommit: ({ distance }) => {
      if (distance < 0) emit('swipeLeft');
      else emit('swipeRight');
    },
  });
  swipe.mount(rowEl.value);
});

onUnmounted(() => {
  if (!swipe) return;

  swipe.dispose();
});
</script>

<template>
  <div ref="rowEl">Swipe me</div>
</template>
```

```svelte [Svelte]
<script lang="ts">
  import { onMount } from 'svelte';
  import { createSwipeGesture } from '@vielzeug/gesture';

  let {
    onswipeleft = () => {},
    onswiperight = () => {},
  }: { onswipeleft: () => void; onswiperight: () => void } = $props();

  let rowEl: HTMLDivElement;

  onMount(() => {
    const swipe = createSwipeGesture({
      axis: 'x',
      onCommit: ({ distance }) => {
        if (distance < 0) onswipeleft();
        else onswiperight();
      },
    });
    const unmountSwipe = swipe.mount(rowEl);

    return () => {
      unmountSwipe();
      swipe.dispose();
    };
  });
</script>

<div bind:this={rowEl}>Swipe me</div>
```

:::

## Working with Other Vielzeug Libraries

### Gesture + Refine

Refine's `ore-carousel`, `ore-drawer`, `ore-toast`, and `ore-list-item` use Gesture internally for swipe recognition. When building custom swipe-driven surfaces alongside Refine components, use `createSwipeGesture` for input and keep visual transitions in your own code.

```ts
import { createSwipeGesture } from '@vielzeug/gesture';

// Custom swipe-to-reveal panel alongside ore-list
const swipe = createSwipeGesture({
  axis: 'x',
  captureTarget: () => null,
  onMove: ({ distance }) => {
    panel.style.transform = `translateX(${distance}px)`;
  },
  onCommit: ({ distance }) => {
    if (Math.abs(distance) > 80) revealActions();
    else resetPanel();
  },
  onRelease: () => resetPanel(),
});
```

### Gesture + Dnd

Gesture handles single-axis swipe recognition; Dnd handles multi-directional drag-and-drop with drop zones. Use them separately — a swipe-to-dismiss row and a sortable list are different interaction models.

```ts
import { createSwipeGesture } from '@vielzeug/gesture';
import { createDropZone } from '@vielzeug/dnd';

const swipe = createSwipeGesture({ axis: 'x', onCommit: dismissRow });
const dropZone = createDropZone({ onDrop: handleReorder });

swipe.mount(row);
// Dnd manages its own pointer listeners on the drag handle
```

## Best Practices

- **Scope** one swipe handle to one interaction surface.
- **Choose** threshold values from measured component dimensions.
- **Keep** `onMove` rendering lightweight.
- **Disable** capture for interactions containing nested actionable controls.
- **Dispose** on unmount to prevent stale gesture state.
- **Use** `shouldStart` for fast admission checks.
