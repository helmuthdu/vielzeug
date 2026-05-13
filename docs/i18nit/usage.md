---
title: I18nit — Usage Guide
description: Practical usage patterns for @vielzeug/i18nit.
---

[[toc]]

## Setup

```ts
import { createI18n } from '@vielzeug/i18nit';

const i18n = createI18n({
  locale: 'en',
  fallback: 'en',
  catalogs: {
    en: {
      greeting: 'Hello, {name}!',
      inbox: {
        zero: 'No messages',
        one: 'One message',
        other: '{count} messages',
      },
    },
    de: () => import('./locales/de.json').then((m) => m.default),
  },
});
```

## Translate

```ts
i18n.t('greeting', { name: 'Alice' });
i18n.tp('inbox', 3);
i18n.tp('position', 2, { ordinal: true });
```

## Locale lifecycle

```ts
await i18n.preload('de');
await i18n.setLocale('de');

i18n.register('fr', () => import('./locales/fr.json').then((m) => m.default));

const locales = i18n.getSupportedLocales();
```

Locale lookup also expands subtags automatically. For example, if the active locale is `en-US`, i18nit checks
`en-US` and then `en` before moving to explicit fallbacks.

## Framework Integration

::: code-group

```tsx [React]
import { useSyncExternalStore } from 'react';
import { createI18n } from '@vielzeug/i18nit';

const i18n = createI18n({
  locale: 'en',
  catalogs: { en: { greeting: 'Hello, {name}!' }, de: () => import('./de.json').then((m) => m.default) },
});

function useI18nSnapshot() {
  return useSyncExternalStore(i18n.subscribe, i18n.getSnapshot, i18n.getSnapshot);
}

function Greeting({ name }: { name: string }) {
  useI18nSnapshot();
  return <p>{i18n.t('greeting', { name })}</p>;
}
```

```ts [Vue 3]
import { shallowRef, onScopeDispose } from 'vue';
import { createI18n } from '@vielzeug/i18nit';

const i18n = createI18n({
  locale: 'en',
  catalogs: { en: { greeting: 'Hello, {name}!' } },
});

function useI18n() {
  const snapshot = shallowRef(i18n.getSnapshot());
  const stop = i18n.subscribe(
    (s) => {
      snapshot.value = s;
    },
    { immediate: true },
  );
  onScopeDispose(stop);
  return snapshot;
}
```

```svelte [Svelte]
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { createI18n } from '@vielzeug/i18nit';

  const i18n = createI18n({
    locale: 'en',
    catalogs: { en: { greeting: 'Hello, {name}!' } },
  });

  let snapshot = i18n.getSnapshot();
  const stop = i18n.subscribe(
    (s) => {
      snapshot = s;
    },
    { immediate: true },
  );
  onDestroy(() => stop());
</script>

<p>{i18n.t('greeting', { name: 'Alice' })}</p>
```

:::

## Working with Other Vielzeug Libraries

### With Routeit

Use Routeit path params or query params as the source of truth for locale selection.

```ts
import { createI18n } from '@vielzeug/i18nit';
import { createBrowserHistory, createRouter } from '@vielzeug/routeit';

const i18n = createI18n({ locale: 'en', catalogs: { en: { title: 'Home' }, de: { title: 'Startseite' } } });
const router = createRouter({ history: createBrowserHistory(), routes: [{ path: '/:locale/home', id: 'home' }] });

router.subscribe(() => {
  const locale = router.current.params.locale;
  if (locale) i18n.setLocale(locale);
});
```

## Missing handling

```ts
const strictI18n = createI18n({
  onMissing(info) {
    if (info.type === 'var') return `<missing:${info.varName}>`;

    return `[missing:${info.key}]`;
  },
});
```

Without `onMissing`, missing keys return the key string and missing interpolation variables keep their placeholder text.

## Best Practices

- Call `preload(locale)` before `setLocale(locale)` to avoid a render with missing translations.
- Use lazy catalog functions (`() => import('./locales/de.json')`) for locales not needed at startup.
- Keep translation keys flat or one level deep — deeply nested keys are harder to refactor.
- Set `fallback` to a locale that has 100% coverage so missing keys degrade gracefully.
- Register additional locales with `register()` at runtime rather than including them in the initial catalogs.
- Use `tp()` for pluralizable branch keys and reserve `{count}` for automatic count injection.
- Use `onMissing` in development to surface untranslated keys early; omit it in production.
- Share one `i18n` instance per app entry point; avoid creating separate instances per component.
