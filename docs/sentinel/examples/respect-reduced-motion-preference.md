---
title: 'Sentinel Examples — Respect Reduced Motion Preference'
description: Keep a document class synchronized with the reduced-motion media query.
---

## Respect Reduced Motion Preference

### Problem

Animation behavior must respond when the operating-system motion preference changes. `createMediaQuery()` exposes the current match as reactive state.

### Solution

Synchronize a document class and handle environments without `matchMedia`.

```ts
import { createMediaQuery, SentinelUnavailableError } from '@vielzeug/sentinel';

function observeReducedMotion(): () => void {
  try {
    const reducedMotion = createMediaQuery('(prefers-reduced-motion: reduce)');
    const render = () => {
      document.documentElement.classList.toggle('reduce-motion', reducedMotion.value.matches);
    };

    render();
    const unsubscribe = reducedMotion.subscribe(render);

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

### Pitfalls

- Keep the default experience usable when `matchMedia` is unavailable.
- Apply the initial state before waiting for the first change.
- Prefer CSS `@media (prefers-reduced-motion: reduce)` when JavaScript does not need the value.

### Related

- [Media Query API](../api.md#createmediaquery)
- [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
