---
title: 'I18nit Examples — Diagnostics Hook'
description: 'Capture loader failures and subscriber errors through the i18nit diagnostics hook.'
---

## Diagnostics Hook

The diagnostics hook is the central place for observability and error reporting.

## Example

```ts
import { createI18n, isLoaderError, isSubscriberError, type DiagnosticEvent } from '@vielzeug/i18nit';

const i18nWithDiagnostics = createI18n({
  locale: 'en',
  loaders: {
    fr: () => fetch('/api/locales/fr').then((r) => r.json()),
  },
  onDiagnostic: (event) => {
    if (event.kind === 'loader-error') {
      console.warn('Loader failed:', event.locale, event.error);
    } else {
      console.error('Subscriber failed:', event.error);
    }
  },
});

function report(event: DiagnosticEvent) {
  if (isLoaderError(event)) {
    console.warn('Loader failed for locale', event.locale, event.error);
    return;
  }

  if (isSubscriberError(event)) {
    console.error('Subscriber threw', event.error);
  }
}
```

## Notes

- Loader failures from `preload()` are reported here and then swallowed.
- Subscriber failures are isolated so one broken listener does not break the others.
- Forward diagnostics into your logger, metrics system, or error tracker.

## Related Recipes

- [Async Loading and Preload](./async-loading-and-reload.md)
- [Catalog Replacement](./catalog-replacement.md)
- [Framework Integration](./framework-integration.md)
