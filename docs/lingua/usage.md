---
title: Lingua — Usage Guide
description: Translate explicit catalogs, load feature resources, and connect locale snapshots to UI state.
---

[[toc]]

## Basic Usage

Create an i18n store from explicit core resources. Strings are text messages; plural messages use `{ plural: ... }`.

```ts
import { createI18n } from '@vielzeug/lingua';

const i18n = createI18n({
  locale: 'en',
  resources: {
    core: {
      en: {
        greeting: 'Hello, {name}!',
        inbox: { plural: { one: 'One message', other: '{count} messages' } },
      },
    },
  },
});

console.log(i18n.translate('greeting', { values: { name: 'Ada' } }));
console.log(i18n.translate('inbox', { count: 3 }));
```

Call `dispose()` when a store belongs to a temporary request, test, or route owner.

## Define Explicit Catalogs

Use nested objects only to group keys. A plural message always has a `plural` property, so regular objects containing `one` or `other` remain groups.

```ts
const catalog = {
  account: {
    greeting: 'Hello, {name}!',
    unread: {
      plural: {
        one: 'One unread message',
        other: '{count} unread messages',
      },
    },
  },
};
```

Use `{ values }` for text replacements. Pass `count` at top level for plural selection; Lingua injects it into the selected template.

## Render Framework Content

Use `segments()` when replacements are framework nodes, links, or other values that must not be stringified.

```ts
import { createTranslator } from '@vielzeug/lingua';

const translator = createTranslator(
  {
    en: {
      error: 'Try {retry} or {support}.',
      inbox: { plural: { one: 'One message from {sender}', other: '{count} messages from {sender}' } },
    },
  },
  { locale: 'en' },
);

const retry = { href: '/retry', label: 'retry' };
const support = { href: '/support', label: 'support' };
const sender = { id: 'ada', name: 'Ada' };

console.log(translator.segments('error', { values: { retry, support } }));
console.log(translator.segments('inbox', { count: 2, values: { sender } }));
```

Render the returned array with your framework's fragment or list primitive.

## Use Static Catalogs

Use `createTranslator()` when catalog data and locale selection are fixed for the translator lifetime.

```ts
import { createTranslator } from '@vielzeug/lingua';

const translator = createTranslator(
  {
    en: { save: 'Save' },
    fr: { save: 'Enregistrer' },
  },
  { locale: 'fr' },
);

console.log(translator.translate('save'));
```

## Load Resources and Switch Locales

Declare every resource at construction. Load optional features explicitly, or request them while changing locale.

```ts
import { createI18n } from '@vielzeug/lingua';

const i18n = createI18n({
  locale: 'en',
  resources: {
    core: {
      en: { navigation: { settings: 'Settings' } },
      fr: { navigation: { settings: 'Réglages' } },
    },
    settings: {
      en: async () => ({ title: 'Settings' }),
      fr: async () => ({ title: 'Réglages' }),
    },
  },
});

await i18n.load('settings');
console.log(i18n.translate('title'));

await i18n.setLocale('fr', { load: ['settings'] });
console.log(i18n.translate('title'));
```

Concurrent loads for one resource and locale share work. If resources define the same key, later resource declarations override earlier declarations regardless of async completion order.

## Subscribe to Immutable Snapshots

Subscribe when UI state must change with locale or loaded active-locale resources. Every callback receives a snapshot containing translator for that revision.

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

Serialize only resolved resource catalogs on server, then hydrate a client store from that payload.

```ts
import { createI18n, hydrateI18n } from '@vielzeug/lingua';

const serverI18n = createI18n({
  locale: 'en',
  resources: { core: { en: { title: 'Server title' } } },
});

const state = serverI18n.serialize();
const clientI18n = hydrateI18n(state, { fallback: 'en' });

console.log(clientI18n.translate('title'));
serverI18n.dispose();
clientI18n.dispose();
```

State contains raw loaded catalogs. It never contains loader functions.

## Formatting and Validation

Import formatting and catalog validation from their dedicated subpaths to keep translation state focused.

```ts
import { createFormatter } from '@vielzeug/lingua/format';
import { validateCatalog } from '@vielzeug/lingua/validate';

const formatter = createFormatter('en-US');
const catalog = { inbox: { plural: { one: 'One message', other: '{count} messages' } } };
const issues = validateCatalog(catalog, 'en');

console.log(formatter.currency(19.99, 'USD'));
console.log(issues);
```

## Framework Integration

Adapt `getSnapshot()` and `subscribe()` to your framework state primitive.

::: code-group

```ts [React]
import { useSyncExternalStore } from 'react';

import type { I18n } from '@vielzeug/lingua';

export function useTranslator(i18n: I18n) {
  return useSyncExternalStore(
    (notify) => i18n.subscribe(() => notify()),
    () => i18n.getSnapshot().translator,
  );
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
  return readable(i18n.getSnapshot().translator, (set) => {
    return i18n.subscribe(({ translator }) => set(translator));
  });
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

Use Courier loaders when locale catalogs come from HTTP rather than bundled modules; pass each loader's resolved `Catalog` to a declared Lingua resource.

## Best Practices

- Define plural messages with `{ plural: ... }`; never infer them from object keys.
- Declare resource precedence intentionally; later resource definitions override earlier keys.
- Call `load()` before rendering a feature that depends on its optional resource.
- Render `segments()` values with framework-native fragment support instead of coercing them to strings.
- Keep loader functions out of SSR payloads; use `serialize()` and `hydrateI18n()`.
- Pass an `AbortSignal` to subscriptions owned by a component or request.
- Import formatting and validation only from `/format` and `/validate`.
- Dispose temporary stores after requests, tests, and route lifetimes.
