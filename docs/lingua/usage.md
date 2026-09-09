---
title: Lingua — Usage Guide
description: Translate explicit catalogs, load lazy locales, and connect locale snapshots to UI state.
---

[[toc]]

## Basic Usage

Create an i18n instance with eager locale catalogs. Strings are text messages; plural messages use `{ plural: ... }`.

```ts
import { createI18n } from '@vielzeug/lingua';

const i18n = createI18n({
  catalogs: {
    en: {
      greeting: 'Hello, {name}!',
      inbox: { plural: { one: 'One message', other: '{count} messages' } },
    },
  },
  locale: 'en',
});

console.log(i18n.translate('greeting', { values: { name: 'Ada' } }));
console.log(i18n.translate('inbox', { count: 3 }));
```

Call `dispose()` when the instance belongs to a temporary request, test, or route owner.

## Define Explicit Catalogs

Use nested objects only to group keys. A plural message always has `plural`, so regular objects containing `one` or `other` remain groups.

```ts
const catalog = {
  account: {
    greeting: 'Hello, {name}!',
    unread: { plural: { one: 'One unread message', other: '{count} unread messages' } },
  },
};
```

Use `{ values }` for text replacements. Pass `count` at top level for plural selection; Lingua injects it into selected template.

Catalogs contain strings, grouping objects, and explicit `{ plural: ... }` messages only. Keep application data outside catalog, then translate display labels while constructing it.

```ts
import { createTranslator } from '@vielzeug/lingua';

const messages = {
  status: { blocked: 'Blocked', done: 'Done', inProgress: 'In progress' },
};
const statusDefinitions = [
  { labelKey: 'status.inProgress', value: 'in-progress' },
  { labelKey: 'status.blocked', value: 'blocked' },
  { labelKey: 'status.done', value: 'done' },
] as const;
const translator = createTranslator(messages, { locale: 'en' });
const statusOptions = statusDefinitions.map(({ labelKey, value }) => ({ label: translator.translate(labelKey), value }));
```

## Missing Keys and Values

Missing keys and values do not silently echo placeholders by default — Lingua warns in development and returns the key or `{name}`. Control failure behaviour with the `missing` option:

| `missing` | Behaviour |
| --- | --- |
| `undefined` (default) | Warn in development; return key / `{name}` |
| `'key'` | Return key / `{name}` silently |
| `'throw'` | Throw `LinguaMissingKeyError` / `LinguaMissingValueError` |
| `handler` | Call `({ key, locale, name? }) => string` |

```ts
const translator = createTranslator(messages, { locale: 'en', missing: 'throw' });
```

## Enumerate Catalog Keys

Use `catalogKeys()` to derive key arrays from the catalog itself instead of maintaining a parallel list that can go stale. It traverses nested grouping objects and explicit `{ plural: ... }` messages, returning the same dotted paths that `MessageKey<C>` represents at the type level.

Pass an `I18n` instance to enumerate keys from its current locale catalog without specifying a locale explicitly.

```ts
import { catalogKeys, createI18n } from '@vielzeug/lingua';

const i18n = createI18n({
  catalogs: {
    en: {
      greeting: 'Hello, {name}!',
      inbox: { plural: { one: 'One message', other: '{count} messages' } },
      nav: { home: 'Home', settings: 'Settings' },
    },
  },
  locale: 'en',
});

const allKeys = catalogKeys(i18n);
// ['greeting', 'inbox', 'nav.home', 'nav.settings']
```

Pass a raw catalog object to enumerate keys directly. Call `catalogKeys()` on a nested subtree to get exactly the keys in that group — no filtering, no casts.

```ts
import { catalogKeys } from '@vielzeug/lingua';

const messages = {
  nav: { home: 'Home', settings: 'Settings' },
} as const;

const allKeys = catalogKeys(messages);
// ['nav.home', 'nav.settings']

const navKeys = catalogKeys(messages.nav);
// ['home', 'settings']
```

## Render Framework Content

Use `parts()` when replacements are framework nodes, links, or other values that must not be stringified. `parts()` returns a discriminated union: `{ type: 'text', value: string }` for literal text and `{ type: 'value', value: V }` for interpolated values.

```ts
import { createTranslator } from '@vielzeug/lingua';

const translator = createTranslator({ error: 'Try {retry} or {support}.' }, { locale: 'en' });

const retry = { href: '/retry', label: 'retry' };
const support = { href: '/support', label: 'support' };

const result = translator.parts('error', { values: { retry, support } });
// [
//   { type: 'text', value: 'Try ' },
//   { type: 'value', value: { href: '/retry', label: 'retry' } },
//   { type: 'text', value: ' or ' },
//   { type: 'value', value: { href: '/support', label: 'support' } },
//   { type: 'text', value: '.' },
// ]
```

Render returned array with framework fragment or list primitive. Give UI values consumer-owned keys before passing them to `parts()`; Lingua preserves value identity and never clones or mutates them.

## Use a Fixed-Locale Translator

Use `createTranslator()` when one catalog and locale stay fixed for the translator's lifetime. It defaults locale to `en`; pass `locale` when plural rules or diagnostics need another locale. Lingua snapshots catalog messages during construction. Do not mutate source catalog objects afterward.

```ts
import { createTranslator } from '@vielzeug/lingua';

const translator = createTranslator(
  { save: 'Enregistrer' },
  { locale: 'fr' },
);

console.log(translator.translate('save'));
```

## Load Catalogs and Switch Locales

Provide eager catalogs for translations needed immediately and a `loadCatalog` function for other locales. `setLocale()` loads the selected locale and configured fallbacks before it commits the change.

```ts
import { createI18n } from '@vielzeug/lingua';

const i18n = createI18n({
  catalogs: { en: { navigation: { settings: 'Settings' } } },
  fallback: 'en',
  locale: 'en',
  loadCatalog: (locale) => import(`./locales/${locale}.ts`).then((m) => m.default),
});

await i18n.setLocale('fr');
console.log(i18n.translate('navigation.settings'));
```

Use loader-only configuration when every locale is lazy, and call `load()` before the first translation. Concurrent loads for the same locale share work. A failed or superseded locale selection never changes the current snapshot.

## Subscribe to Immutable Snapshots

Subscribe when UI state must change with locale or loaded active/fallback catalog. Every callback receives a snapshot containing the translator for that revision.

```ts
const unsubscribe = i18n.subscribe(
  ({ locale, translator }) => {
    console.log(locale, translator.translate('navigation.settings'));
  },
  { immediate: true },
);

unsubscribe();
```

Pass `{ signal }` when an `AbortController` owns subscription lifetime.

## SSR State

Serialize resolved catalogs on the server, then hydrate a client instance from the same payload via the `state` option. `getSnapshot()` stays referentially stable until the store revision changes, so use the same hydrated instance throughout initial client render.

```ts
import { createI18n } from '@vielzeug/lingua';

const serverI18n = createI18n({
  catalogs: { en: { title: 'Server title' } },
  locale: 'en',
});

const state = serverI18n.serialize();
const clientI18n = createI18n({ state });

console.log(clientI18n.translate('title'));
serverI18n.dispose();
clientI18n.dispose();
```

State contains raw loaded catalogs and the active locale. It never contains loader functions. Pass an explicit `locale` only when the client should override the serialized locale.

## Validation

Import catalog validation from the dedicated subpath to keep translation state focused.

```ts
import { compareCatalogs, validateCatalog } from '@vielzeug/lingua/validate';

const catalog = { inbox: { plural: { one: 'One message', other: '{count} messages' } } };

console.log(validateCatalog(catalog, 'en'));
```

Use `compareCatalogs()` to catch missing or extra keys across locales — the most common i18n defect. First locale is the base.

```ts
import { compareCatalogs } from '@vielzeug/lingua/validate';

const result = compareCatalogs({
  en: { greeting: 'Hello', farewell: 'Goodbye' },
  de: { greeting: 'Hallo' },
});
// { missing: [{ key: 'farewell', locale: 'de' }], extra: [] }
```

## Framework Integration

Pass stable `getSnapshot()` and `subscribe()` methods to framework state primitives. For SSR, create client instance from the same serialized state used by the server before calling `useSyncExternalStore`.

::: code-group

```ts [React]
import { useSyncExternalStore } from 'react';

import type { I18n } from '@vielzeug/lingua';

export function useTranslator(i18n: I18n) {
  const snapshot = useSyncExternalStore(i18n.subscribe, i18n.getSnapshot, i18n.getSnapshot);

  return snapshot.translator;
}
```

```ts [Vue 3]
import { onUnmounted, shallowRef } from 'vue';

import type { I18n } from '@vielzeug/lingua';

export function useTranslator(i18n: I18n) {
  const snapshot = shallowRef(i18n.getSnapshot());
  const unsubscribe = i18n.subscribe((next) => {
    snapshot.value = next;
  });

  onUnmounted(unsubscribe);
  return snapshot;
}
```

```ts [Svelte]
import { readable } from 'svelte/store';

import type { I18n } from '@vielzeug/lingua';

export function translatorStore(i18n: I18n) {
  return readable(i18n.getSnapshot().translator, (set) => i18n.subscribe(({ translator }) => set(translator)));
}
```

:::

## Working with Other Vielzeug Libraries

Bridge Lingua's structural snapshot directly when templates need reactive locale reads.

```ts
import { createRipple } from '@vielzeug/ripple';

const ripple = createRipple();
const i18nState = ripple.fromSubscribable(i18n);
export const locale = ripple.computed(() => i18nState.value.locale);

export const disposeLocaleBridge = () => ripple.dispose();
```

Use Courier loaders when locale catalogs come from HTTP rather than bundled modules; pass each loader to `loadCatalog`.

## Best Practices

- Define plural messages with `{ plural: ... }` and no sibling metadata.
- Keep arrays and application metadata outside catalogs.
- Treat source catalog objects as immutable after construction.
- Use `translateDynamic()` only for runtime-generated keys.
- Provide eager catalogs for translations required during initial render.
- Give UI values keys before passing them to `parts()`.
- Keep loader functions out of SSR payloads.
- Dispose temporary instances after requests, tests, and route lifetimes.
- Use `missing: 'throw'` in development to catch missing keys and values early.
