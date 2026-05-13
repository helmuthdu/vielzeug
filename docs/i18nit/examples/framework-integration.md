---
title: 'I18nit Examples — Framework Integration'
description: 'Framework adapters built on getSnapshot()/subscribe().' 
---

## Framework Integration

::: code-group

```tsx [React]
import { useSyncExternalStore } from 'react';
import { i18n } from './i18n';

export function useI18n() {
  const snapshot = useSyncExternalStore(i18n.subscribe, i18n.getSnapshot, i18n.getSnapshot);

  return {
    locale: snapshot.locale,
    setLocale: (locale: string) => i18n.setLocale(locale),
    t: i18n.t,
  };
}
```

```ts [Vue 3]
import { onScopeDispose, ref } from 'vue';
import { i18n } from './i18n';

export function useI18n() {
  const snapshot = ref(i18n.getSnapshot());

  const stop = i18n.subscribe(() => {
    snapshot.value = i18n.getSnapshot();
  }, { immediate: true });

  onScopeDispose(stop);

  return {
    locale: snapshot,
    setLocale: (next: string) => i18n.setLocale(next),
    t: i18n.t,
  };
}
```

:::
