---
title: Orbit — Usage Guide
description: Position floating UI with lifecycle ownership, explicit coordinate strategy, middleware, and optional reactive state.
---

[[toc]]

## Basic Usage

Create a positioner after both elements mount, then dispose it with their owner.

```ts
import { createPositioner, flip, offset, shift } from '@vielzeug/orbit';

const positioner = createPositioner(trigger, tooltip, {
  middleware: [offset(8), flip(), shift({ padding: 6 })],
  placement: 'top',
});

positioner.start();
positioner.dispose();
```

`createPositioner()` owns clipping-boundary resolution, updates, CSS strategy, and cleanup.

## Coordinate Strategy

Use `fixed` for viewport-positioned overlays. Use `absolute` when the floating element should position within its offset parent.

```ts
const positioner = createPositioner(trigger, dropdown, {
  placement: 'bottom-start',
  strategy: 'absolute',
});

positioner.start();
```

Orbit resolves clipping ancestors by default. Pass an explicit `boundary` when your application owns a different visible region.

## Middleware

Pass middleware in the exact order it should execute.

```ts
const positioner = createPositioner(trigger, panel, {
  middleware: [
    offset(8),
    flip(),
    shift({ padding: 8 }),
    size(),
    arrow({ element: arrowElement }),
  ],
});
```

Use either `flip()` or `autoPlacement()` for one positioner. Custom middleware writes data into `result.middlewareData`.

## Virtual References

Use a virtual reference for cursor-anchored UI.

```ts
const reference = {
  getBoundingClientRect: () => ({ height: 0, width: 0, x: event.clientX, y: event.clientY }),
};

const positioner = createPositioner(reference, menu, { placement: 'bottom-start' });
positioner.start();
```

## Manual Positioning

Use `computePosition()` only when your application owns CSS application and lifecycle itself.

```ts
import { computePosition, offset } from '@vielzeug/orbit';

const result = computePosition(reference, floating, { middleware: [offset(8)] });
floating.style.left = `${result.x}px`;
floating.style.top = `${result.y}px`;
```

## Reactive Adapter

Install Ripple and import the optional adapter only when your UI needs a reactive position value.

```ts
import { createReactivePositioner } from '@vielzeug/orbit/reactive';
import { effect } from '@vielzeug/ripple';

const positioner = createReactivePositioner(trigger, tooltip);

effect(() => {
  const position = positioner.position.value;
  if (!position) return;

  tooltip.style.left = `${position.x}px`;
  tooltip.style.top = `${position.y}px`;
});
```

## Client Lifecycle

Orbit root imports are server-safe. Invoke geometry APIs only from a client mount lifecycle, where DOM elements exist.

```ts
onMounted(() => {
  const positioner = createPositioner(trigger, panel);
  positioner.start();
  onCleanup(() => positioner.dispose());
});
```

## Framework Integration

Create and dispose positioners with component lifecycle.

::: code-group

```tsx [React]
useEffect(() => {
  const positioner = createPositioner(trigger, panel);
  positioner.start();

  return () => positioner.dispose();
}, [trigger, panel]);
```

```vue [Vue 3]
<script setup lang="ts">
onMounted(() => {
  const positioner = createPositioner(trigger.value!, panel.value!);
  positioner.start();
  onUnmounted(() => positioner.dispose());
});
</script>
```

```ts [Svelte]
onMount(() => {
  const positioner = createPositioner(trigger, panel);
  positioner.start();

  return () => positioner.dispose();
});
```

:::

## Working with Other Vielzeug Libraries

### Orbit + Prism

Use `strategy: 'absolute'` for a tooltip rendered inside a chart container.

```ts
const positioner = createPositioner(cursorReference, tooltip, {
  autoUpdate: false,
  strategy: 'absolute',
});

positioner.start();
positioner.dispose();
```

## Best Practices

- **Start** a positioner after both DOM elements mount.
- **Dispose** it with its UI owner.
- **Choose** `fixed` or `absolute` intentionally.
- **Keep** middleware order explicit.
- **Use** `computePosition()` only for advanced platform-managed paths.
- **Install** Ripple only when importing `/reactive`.
- **Invoke** geometry APIs only on the client.
