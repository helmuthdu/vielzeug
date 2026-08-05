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

Use `{ values }` for text replacements. Pass `count` at top level for plural selection; Lingua injects it into selected template.

## Render Framework Content

Use `segments()` when replacements are framework nodes, links, or other values that must not be stringified.

```ts
import { createTranslator } from '@vielzeug/lingua';

const translator = createTranslator(
  { en: { error: 'Try {retry} or {support}.' } },
  { locale: 'en' },
);

const retry = { href: '/retry', label: 'retry' };
const support = { href: '/support', label: 'support' };

console.log(translator.segments('error', { values: { retry, support } }));
```

Render returned array with framework fragment or list primitive.

## Use Static Catalogs

Use `createTranslator()` when catalog data and locale selection are fixed for translator lifetime.

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

Serialize only resolved catalogs on server, then hydrate client store from payload.

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
import { validateCatalog } from '@vielzeug/lingua/validate';

const formatter = createFormatter('en-US');
const catalog = { inbox: { plural: { one: 'One message', other: '{count} messages' } } };

console.log(formatter.currency(19.99, 'USD'));
console.log(validateCatalog(catalog, 'en'));
```

## Framework Integration

Adapt `getSnapshot()` and `subscribe()` to framework state primitive.

::: code-group

```ts [React]
import { useSyncExternalStore } from 'react';

import type { TranslationStore } from '@vielzeug/lingua';

export function useTranslator(i18n: TranslationStore) {
  return useSyncExternalStore(
    (notify) => i18n.subscribe(() => notify()),
    () => i18n.getSnapshot().translator,
    () => i18n.getSnapshot().translator,
  );
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

- Define plural messages with `{ plural: ... }`.
- Keep every locale catalog complete for required keys.
- Use `translateDynamic()` only for runtime-generated keys.
- Load a lazy catalog before rendering it.
- Render `segments()` values with framework-native fragment support.
- Keep loader functions out of SSR payloads.
- Pass an `AbortSignal` to subscriptions owned by component or request.
- Dispose temporary stores after requests, tests, and route lifetimes.
