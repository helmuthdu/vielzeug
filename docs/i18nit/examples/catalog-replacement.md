---
title: 'I18nit Examples — Source Replacement'
description: 'Replace locale sources at runtime and react via store snapshots.'
---

## Source Replacement

```ts
import { createI18n } from '@vielzeug/i18nit';

const i18n = createI18n({
  fallback: 'en',
  locale: 'en',
  catalogs: {
    en: {
      dashboard: { heading: 'Dashboard' },
    },
  },
});

i18n.subscribe(() => {
  renderApp(i18n.getSnapshot());
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
- Subscribers re-read state from `getSnapshot()`.
