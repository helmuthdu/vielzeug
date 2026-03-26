---
title: 'I18nit Examples — Framework Integration'
description: 'React and Vue integration examples for I18nit.'
---

## Framework Integration

## Problem

Implement framework integration in a production-friendly way with `@vielzeug/i18nit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/i18nit` installed.

Start with [Shared Instance Setup](./shared-instance-setup.md), then expose the shared translator through framework-specific hooks or composables.

::: code-group

```tsx [React]
import { useEffect, useReducer } from 'react';
import { i18n } from './i18n';

export function useI18n() {
  const [, rerender] = useReducer((n) => n + 1, 0);

  useEffect(() => i18n.subscribe(() => rerender()), []);

  return {
    locale: i18n.locale,
    switchLocale: (locale: string) => i18n.switchLocale(locale),
    t: i18n.t,
  };
}
```

```ts [Vue 3]
import { onScopeDispose, ref } from 'vue';
import { i18n } from './i18n';

export function useI18n() {
  const locale = ref(i18n.locale);

  const stop = i18n.subscribe(({ locale: next }) => {
    locale.value = next;
  });

  onScopeDispose(stop);

  return {
    locale,
    switchLocale: (next: string) => i18n.switchLocale(next),
    t: (key: string, vars?: Record<string, unknown>) => i18n.t(key, vars),
  };
}
```

:::

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Async Loading and Reload](./async-loading-and-reload.md)
- [Batched Catalog Updates](./batched-catalog-updates.md)
- [Diagnostics Hook](./diagnostics-hook.md)
