---
title: 'Lingua Examples — Source Replacement'
description: 'Replace locale sources at runtime and react via store snapshots.'
---

## Source Replacement

```ts
import { createI18n } from '@vielzeug/lingua';

const i18n = createI18n({
  fallback: 'en',
  locale: 'en',
  catalogs: {
    en: {
      dashboard: { heading: 'Dashboard' },
    },
  },
});

i18n.subscribe((snapshot) => {
  renderApp(snapshot);
});

i18n.register('en', {
  dashboard: {
    heading: 'Workspace',
    subtitle: 'Everything in one place',
  },
});
```

## Notes

- `register()` is the single runtime source mutation API.
- Subscribers receive the current snapshot directly.
