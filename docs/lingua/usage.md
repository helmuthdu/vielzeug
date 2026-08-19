---
title: Lingua — Usage Guide
description: Translate explicit catalogs, load lazy locales, and connect locale snapshots to UI state.
---

[[toc]]

## Basic Usage

Create i18n store from locale-keyed catalogs. Strings are text messages; plural messages use `{ plural: ... }`.

```ts
import { createTranslationStore } from '@vielzeug/lingua';

const i18n = createTranslationStore({
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

Call `dispose()` when store belongs to temporary request, test, or route owner.

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

Use `{ values }` for text replacements. Pass `count` at top level for plural selection; Lingua injects it into selected template. Absent replacements render as `{name}` by default. `segments()` preserves an own `undefined` or `null` value; omit property to receive `{name}`.

Catalogs contain strings, grouping objects, and explicit `{ plural: ... }` messages only. Keep application data outside catalog, then translate display labels while constructing it.

```ts
import { createCatalogTranslator } from '@vielzeug/lingua';

const messages = {
  status: { blocked: 'Blocked', done: 'Done', inProgress: 'In progress' },
};
const statusDefinitions = [
  { labelKey: 'status.inProgress', value: 'in-progress' },
  { labelKey: 'status.blocked', value: 'blocked' },
  { labelKey: 'status.done', value: 'done' },
] as const;
const translator = createCatalogTranslator(messages);
const statusOptions = statusDefinitions.map(({ labelKey, value }) => ({ label: translator.translate(labelKey), value }));
```

## Enumerate Catalog Keys

Use `catalogKeys()` to derive key arrays from the catalog itself instead of maintaining a parallel list that can go stale. It traverses nested grouping objects and explicit `{ plural: ... }` messages, returning the same dotted paths that `TextKey<C>` represents at the type level.

Pass a `TranslationStore` to enumerate keys from its current locale catalog without specifying a locale explicitly.

```ts
import { catalogKeys, createTranslationStore } from '@vielzeug/lingua';

const i18n = createTranslationStore({
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

Use this for random message selection, cycling, or validation without a stale parallel array.

## Render Framework Content

Use `segments()` when replacements are framework nodes, links, or other values that must not be stringified.

```ts
import { createCatalogTranslator } from '@vielzeug/lingua';

const translator = createCatalogTranslator({ error: 'Try {retry} or {support}.' });

const retry = { href: '/retry', label: 'retry' };
const support = { href: '/support', label: 'support' };

console.log(translator.segments('error', { values: { retry, support } }));
```

Render returned array with framework fragment or list primitive. Give UI values consumer-owned keys before passing them to `segments()`; Lingua preserves value identity and never clones or mutates them.

## Use Static Catalogs

Use `createCatalogTranslator()` when one catalog and locale stay fixed for translator lifetime. It defaults locale to `en`; pass `locale` when plural rules or diagnostics need another locale. Lingua snapshots catalog messages during construction. Do not mutate source catalog objects afterward.

```ts
import { createCatalogTranslator } from '@vielzeug/lingua';

const translator = createCatalogTranslator(
  { save: 'Enregistrer' },
  { locale: 'fr' },
);

console.log(translator.translate('save'));
```

Use `createTranslator()` when fixed translation requires locale-keyed catalogs and fallback resolution.

```ts
import { createTranslator } from '@vielzeug/lingua';

const translator = createTranslator(
  { en: { save: 'Save' }, fr: { save: 'Enregistrer' } },
  { locale: 'fr' },
);

console.log(translator.translate('save'));
```

## Load Catalogs and Switch Locales

Declare one static catalog or lazy loader per locale. Switch locale, then load it explicitly when source is lazy.

```ts
import { createTranslationStore } from '@vielzeug/lingua';

const i18n = createTranslationStore({
  catalogs: {
    en: { navigation: { settings: 'Settings' } },
    fr: async () => ({ navigation: { settings: 'Réglages' } }),
  },
  locale: 'en',
});

await i18n.setLocale('fr');
await i18n.load();
console.log(i18n.translate('navigation.settings'));
```

Concurrent loads for same locale share work. `setLocale()` never triggers hidden loads.

## Subscribe to Immutable Snapshots

Subscribe when UI state must change with locale or loaded active/fallback catalog. Every callback receives snapshot containing translator for that revision.

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

Serialize resolved catalogs on server, then hydrate client store from same payload. `getSnapshot()` stays referentially stable until store revision changes, so use same hydrated store throughout initial client render.

```ts
import { createTranslationStore, hydrateTranslationStore } from '@vielzeug/lingua';

const serverTranslationStore = createTranslationStore({
  catalogs: { en: { title: 'Server title' } },
  locale: 'en',
});

const state = serverTranslationStore.serialize();
const clientTranslationStore = hydrateTranslationStore(state, { fallback: 'en' });

console.log(clientTranslationStore.translate('title'));
serverTranslationStore.dispose();
clientTranslationStore.dispose();
```

State contains raw loaded catalogs. It never contains loader functions.

## Formatting and Validation

Import formatting and catalog validation from dedicated subpaths to keep translation state focused.

```ts
import { createFormatter } from '@vielzeug/lingua/format';
import { compareCatalogs, validateCatalog } from '@vielzeug/lingua/validate';

const formatter = createFormatter('en-US');
const catalog = { inbox: { plural: { one: 'One message', other: '{count} messages' } } };

console.log(formatter.currency(19.99, 'USD'));
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

Pass stable `getSnapshot()` and `subscribe()` methods to framework state primitives. For SSR, create client store from same serialized state used by server before calling `useSyncExternalStore`.

::: code-group

```ts [React]
import { useSyncExternalStore } from 'react';

import type { TranslationStore } from '@vielzeug/lingua';

export function useTranslator(i18n: TranslationStore) {
  const snapshot = useSyncExternalStore(i18n.subscribe, i18n.getSnapshot, i18n.getSnapshot);

  return snapshot.translator;
}
```

```ts [Vue 3]
import { onUnmounted, shallowRef } from 'vue';

import type { TranslationStore } from '@vielzeug/lingua';

export function useTranslator(i18n: TranslationStore) {
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

import type { TranslationStore } from '@vielzeug/lingua';

export function translatorStore(i18n: TranslationStore) {
  return readable(i18n.getSnapshot().translator, (set) => i18n.subscribe(({ translator }) => set(translator)));
}
```

:::

## Working with Other Vielzeug Libraries

Bridge Lingua subscriptions into Ripple through Flux when templates need reactive locale reads.

```ts
import { stream } from '@vielzeug/flux';
import { toSignal } from '@vielzeug/flux/ripple';
import { computed } from '@vielzeug/ripple';

const localeBinding = toSignal(
  stream<string>((observer) => {
    observer.next(i18n.locale);
    return i18n.subscribe(({ locale }) => observer.next(locale));
  }),
  { initial: i18n.locale },
);

export const locale = computed(() => localeBinding.value);
```

Use Courier loaders when locale catalogs come from HTTP rather than bundled modules; pass each loader to `catalogs`.

## Best Practices

- Define plural messages with `{ plural: ... }` and no sibling metadata.
- Keep arrays and application metadata outside catalogs.
- Treat source catalog objects as immutable after construction.
- Use `translateDynamic()` only for runtime-generated keys.
- Load a lazy catalog before rendering it.
- Give UI values keys before passing them to `segments()`.
- Keep loader functions out of SSR payloads.
- Dispose temporary stores after requests, tests, and route lifetimes.
