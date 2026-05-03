---
title: 'I18nit Examples — Framework Integration'
description: 'React and Vue integration examples for the current i18nit runtime.'
---

## Framework Integration

Start with [Shared Instance Setup](./shared-instance-setup.md), then bridge the runtime into your UI framework through subscriptions.

## Example

::: code-group

```tsx [React]
import { useEffect, useReducer } from 'react';
import { i18n } from './i18n';

export function useI18n() {
  const [, rerender] = useReducer((n) => n + 1, 0);

  useEffect(() => i18n.subscribe(() => rerender(), true), []);

  return {
    locale: i18n.locale,
    setLocale: (locale: string) => i18n.setLocale(locale),
    t: i18n.t,
    tp: i18n.tp,
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
  }, true);

  onScopeDispose(stop);

  return {
    locale,
    setLocale: (next: string) => i18n.setLocale(next),
    t: (key: string, vars?: Record<string, unknown>) => i18n.t(key, vars),
    tp: (key: string, count: number, vars?: Record<string, unknown>) => i18n.tp(key, count, vars),
  };
}
```

:::

## Notes

- Keep one framework boundary that subscribes and triggers rerenders.
- Wrap `t()` and `tp()` close to the UI layer instead of spreading raw instance access everywhere.
- For SSR, create an i18n instance per request instead of using a module singleton.

## Related Recipes

- [Shared Instance Setup](./shared-instance-setup.md)
- [Per-request Locale Handling](./per-request-locale-handling.md)
- [Diagnostics Hook](./diagnostics-hook.md)
