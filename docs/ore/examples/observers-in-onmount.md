---
title: 'Ore Examples — Sentinels in onMounted()'
description: Observe browser and element state within an Ore component lifecycle.
---

## Sentinels in onMounted()

### Problem

Element observation requires mounted DOM nodes, and its browser resources must be released when the component disconnects. Ore provides the lifecycle boundary while Sentinel provides the reactive observation.

### Solution

Create Sentinels in `onMounted()`, consume them through `watchEffect()`, and dispose them through `onCleanup()`.

```ts
import { define, html, onCleanup, onMounted, ref, watchEffect } from '@vielzeug/ore';
import { createElementSize, SentinelUnavailableError } from '@vielzeug/sentinel';

define('observed-panel', {
  setup() {
    const panel = ref<HTMLDivElement>();

    onMounted(() => {
      const element = panel.value;
      if (!element) return;

      try {
        const size = createElementSize(element);

        watchEffect(() => {
          console.log('panel width', size.value?.width);
        });

        onCleanup(() => size.dispose());
      } catch (error) {
        if (!(error instanceof SentinelUnavailableError)) throw error;
      }
    });

    return html`<div ref=${panel}>Resize me</div>`;
  },
});
```

### Pitfalls

- Create element-dependent Sentinels only after refs resolve.
- Handle the initial `null` element-size value.
- Dispose every Sentinel created by the component.
- Catch `SentinelUnavailableError` when the required observer API may be unavailable.

### Related

- [Sentinel Usage](/sentinel/usage)
- [Lifecycle Best Practices](../lifecycle-best-practices.md)
- [Counter Component](./counter-component.md)
