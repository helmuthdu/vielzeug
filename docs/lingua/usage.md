---
title: Lingua — Usage Guide
description: Practical usage patterns for @vielzeug/lingua.
---

[[toc]]

## Basic Usage

```ts
import { createI18n } from '@vielzeug/lingua';

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

All locale strings must be valid BCP 47 tags. `createI18n`, `setLocale`, and `register` throw `[lingua/E004]` for unrecognised tags.

## Translate

```ts
i18n.t('greeting', { name: 'Alice' });
i18n.tp('inbox', 3);
i18n.tp('position', 2, { ordinal: true });
```

`t()` resolves leaf keys. `tp()` resolves plural branch keys (`.zero`, then CLDR category, then `.other`).
`count` is injected automatically — do not include it in `vars`.

## Scoped Helpers

`scope(prefix)` returns a `{ t, tp, has }` helper bound to a key prefix. Use it inside a component or module
to avoid repeating the same key segment.

```ts
const nav = i18n.scope('nav');
nav.t('home');          // resolves 'nav.home'
nav.t('menu.settings'); // resolves 'nav.menu.settings'
nav.has('logout');      // checks 'nav.logout'
```

`scope()` creates a new object on each call — do not compare references.

## Locale Lifecycle

```ts
await i18n.preload('de');
await i18n.setLocale('de');

i18n.register('fr', () => import('./locales/fr.json').then((m) => m.default));

const locales = i18n.getSupportedLocales();
```

- `preload(locale)` loads the catalog without switching the active locale. Use it to warm up a locale before the user requests it.
- `setLocale(locale)` loads if needed, then atomically switches and bumps the version.
- `register(locale, source)` replaces the full catalog for a locale at runtime. Existing subscribers are notified.

Locale lookup expands subtags automatically. If the active locale is `en-US`, lingua checks `en-US` and then `en`
before moving to explicit fallbacks.

## Partial Catalog Merging

`merge(locale, source)` overlays additional keys on top of an existing catalog without replacing it. This is useful
for loading route-level or feature-level translations lazily.

```ts
// In a route handler — load settings-specific keys on demand
async function onEnterSettings() {
  await i18n.merge('en', () => import('./routes/settings.i18n.json').then((m) => m.default));
  await i18n.merge('de', () => import('./routes/settings.i18n.de.json').then((m) => m.default));
}
```

Key characteristics:

- Additive: only new and overriding keys are written. Existing keys that are not in the merge source are preserved.
- Waits for any in-flight dynamic load on the target locale before merging.
- Notifies subscribers if the merged locale is part of the active fallback chain.
- Safe to call concurrently from multiple routes — merges are serialised per locale.
- `register(locale, source)` after a merge replaces the entire catalog (merge deltas are lost).

## Formatting

Import `createFormatter` from the separate `@vielzeug/lingua/format` entry point:

```ts
import { createFormatter } from '@vielzeug/lingua/format';

// Pass a getter that reads the current locale so the formatter follows locale changes
const fmt = createFormatter(() => i18n.locale);

fmt.number(1234567.89);
fmt.currency(19.99, 'EUR');
fmt.date(new Date(), { dateStyle: 'medium' });
fmt.relative(-3, 'day');
fmt.list(['a', 'b', 'c']);
```

Alternatively, access `i18n.fmt` which is a lazy-initialised formatter tied to the instance:

```ts
const price = i18n.fmt.currency(49.95, 'USD');
```

`i18n.fmt` invalidates its cached `Intl` objects when the locale changes.

## Missing Handling

Pass `onMissing` to `createI18n` to handle missing keys and unresolved interpolation variables.

```ts
const strictI18n = createI18n({
  onMissing(info) {
    if (info.type === 'var') return `<missing:${info.varName}>`;

    return `[missing:${info.key}]`;
  },
});
```

Without `onMissing`, missing keys return the key string and missing interpolation variables keep their placeholder text.

## Framework Integration

`i18n` is a plain object with `subscribe` / `getSnapshot` semantics. Wire it into any framework reactive system
without any additional packages.

::: code-group

```tsx [React]
import { useSyncExternalStore } from 'react';
import { createI18n } from '@vielzeug/lingua';

const i18n = createI18n({
  locale: 'en',
  catalogs: { en: { greeting: 'Hello, {name}!' }, de: () => import('./de.json').then((m) => m.default) },
});

function useI18nSnapshot() {
  return useSyncExternalStore(i18n.subscribe, i18n.getSnapshot, i18n.getSnapshot);
}

function Greeting({ name }: { name: string }) {
  useI18nSnapshot(); // re-renders when locale changes
  return <p>{i18n.t('greeting', { name })}</p>;
}
```

```ts [Vue 3]
import { shallowRef, onScopeDispose } from 'vue';
import { createI18n } from '@vielzeug/lingua';

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
  import { createI18n } from '@vielzeug/lingua';

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

### With Route

Use Route path params or query params as the source of truth for locale selection.

```ts
import { createI18n } from '@vielzeug/lingua';
import { createBrowserHistory, createRouter } from '@vielzeug/route';

const i18n = createI18n({ locale: 'en', catalogs: { en: { title: 'Home' }, de: { title: 'Startseite' } } });
const router = createRouter({ history: createBrowserHistory(), routes: [{ path: '/:locale/home', id: 'home' }] });

router.subscribe(() => {
  const locale = router.current.params.locale;
  if (locale) i18n.setLocale(locale);
});
```

## Best Practices

- Call `preload(locale)` before `setLocale(locale)` to avoid a render with missing translations.
- Use lazy catalog functions (`() => import('./locales/de.json')`) for locales not needed at startup.
- Keep translation keys flat or one level deep — deeply nested keys are harder to refactor.
- Set `fallback` to a locale that has 100% coverage so missing keys degrade gracefully.
- Register additional locales with `register()` at runtime rather than including them in the initial catalogs.
- Use `merge()` for per-route or per-feature key sets; call it in your route enter hook.
- Use `tp()` for pluralizable branch keys — `count` is injected automatically.
- Use `onMissing` in development to surface untranslated keys early; omit it in production.
- Share one `i18n` instance per app entry point; avoid creating separate instances per component.
