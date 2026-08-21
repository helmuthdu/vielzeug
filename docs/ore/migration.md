---
title: Ore 2.0 Migration
---

# Ore 2.0 Migration

Ore 2.0 consolidates runtime APIs at the package root and removes sub-path runtime imports, `model()`, form-controller policy, `onError` recovery, colon bindings, asynchronous setup, and implicit HTML injection.

## Import runtime APIs from package root

Move browser-runtime imports to `@vielzeug/ore`. `@vielzeug/ore/testing` remains the only public sub-path.

## Use synchronous setup and explicit HTML sinks

Make component `setup()` synchronous. Replace implicit raw HTML rendering with explicit `unsafeHtml()` only after sanitizing untrusted content.

## Migrate observer APIs to @vielzeug/sentinel

Ore no longer exports observer factories (`intersectionObserver`, `mediaObserver`, `mutationObserver`, `resizeObserver`). Use Sentinel for stateful environment observations and the native MutationObserver API for mutation events.

### Before (Ore)

```ts
import { intersectionObserver, onCleanup, onMounted } from '@vielzeug/ore';
import { watch } from '@vielzeug/ripple';

onMounted(() => {
  const entry = intersectionObserver(element);

  const intersectionWatcher = watch(entry, (state) => {
    console.log('Intersecting:', state?.isIntersecting);
  });

  onCleanup(() => intersectionWatcher.dispose());
});
```

Ore owned the native observers and disconnected them automatically when the component disconnected.

### After (Sentinel)

```ts
import { onCleanup, onMounted } from '@vielzeug/ore';
import { watch } from '@vielzeug/ripple';
import { createIntersection } from '@vielzeug/sentinel';

onMounted(() => {
  const intersection = createIntersection(element);

  const intersectionWatcher = watch(intersection, (state) => {
    console.log('Intersecting:', state?.isIntersecting);
  });

  onCleanup(() => {
    intersectionWatcher.dispose();
    intersection.dispose();
  });
});
```

### Migration checklist

- Replace `intersectionObserver(el)` → `createIntersection(el)`
- Replace `resizeObserver(el)` → `createElementSize(el)`
- Replace `mediaObserver(query)` → `createMediaQuery(query)`
- Continue using `watch(observer, ...)`; Sentinel implements Ripple's `Readable<T>`
- Change `media.value` boolean reads to `media.value.matches`
- Handle the initial `null` value from `createElementSize()`
- Use `intersection.value?.isIntersecting` and `intersection.value?.intersectionRatio`; the native entry is no longer retained
- Register `sentinel.dispose()` with `onCleanup()` because Sentinel owns its browser resources explicitly
- Wrap `createMediaQuery()` in try/catch for feature detection:

```ts
import { onCleanup } from '@vielzeug/ore';
import { createMediaQuery, SentinelUnavailableError } from '@vielzeug/sentinel';

try {
  const mq = createMediaQuery('(min-width: 768px)');
  onCleanup(() => mq.dispose());
} catch (err) {
  if (err instanceof SentinelUnavailableError) {
    // Gracefully degrade when matchMedia unavailable
  }
}
```

See [Sentinel documentation](/sentinel/) for more details.

### Replace mutation observation with the native API

Mutation deliveries are event batches rather than current environment state, so Sentinel does not wrap `MutationObserver`.

```ts
import { onCleanup, onMounted } from '@vielzeug/ore';

onMounted(() => {
  const observer = new MutationObserver((records) => {
    console.log(records);
  });

  observer.observe(element, {
    childList: true,
    subtree: true,
  });

  onCleanup(() => observer.disconnect());
});
```

## Replace removed APIs

Remove `model()`, form-controller policy, `onError` recovery, and colon bindings. Use the 2.0 component, host-binding, lifecycle, and `useField` APIs instead.

## Update form and event integrations

Use `bind({ aria }, { target })` for reactive ARIA bindings. Replace removed `FormFieldHandle.setValidity()` calls with `setCustomValidity()` or `ElementInternals` handling.

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for current root API and component lifecycle contracts.
