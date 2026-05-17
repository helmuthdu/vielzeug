# @vielzeug/i18nit

Minimal i18n runtime with typed keys, explicit locale sources, and framework-friendly subscriptions.

## Installation

```sh
pnpm add @vielzeug/i18nit
```

## Quick Start

```ts
import { createI18n } from '@vielzeug/i18nit';
import { createFormatter } from '@vielzeug/i18nit/format';

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

await i18n.preload('de');
await i18n.setLocale('de');

i18n.t('greeting', { name: 'Alice' });
i18n.tp('inbox', 3);

const fmt = createFormatter(i18n);
fmt.currency(19.99, 'EUR');
```

## Core API

- `createI18n(options?)`
- `i18n.t(key, vars?)`
- `i18n.tp(key, count, options?)`
- `i18n.preload(locale)`
- `i18n.setLocale(locale)`
- `i18n.register(locale, source)`
- `i18n.getSnapshot()`
- `i18n.subscribe(callback, options?)`
- `i18n.getSupportedLocales(options?)`
- `i18n.has(leafKey)`

## Translation options

```ts
type PluralTranslateOptions = {
  ordinal?: boolean;
  vars?: Record<string, unknown>;
};
```

- Leaf keys use `t('greeting', vars)`.
- Branch keys use `tp('inbox', 3, options?)`.

## Missing handling

A single callback handles missing keys and missing interpolation variables.

Default behavior:

- missing keys return the key string
- missing interpolation vars keep the original placeholder (for example `{name}`)

```ts
const i18n = createI18n({
  onMissing(info) {
    if (info.type === 'var') return `<${info.varName}>`;

    return `[missing:${info.key}]`;
  },
});
```

## Subscriber error handling

By default, exceptions thrown inside `subscribe` callbacks are swallowed so the store
stays stable. Provide `onSubscriberError` to observe or log those failures:

```ts
const i18n = createI18n({
  onSubscriberError(error) {
    console.error('[i18n] subscriber threw:', error);
  },
});
```

## Listing supported locales

`getSupportedLocales()` returns locales in registration order.
Pass `{ sorted: true }` for a deterministic code-point-sorted list:

```ts
i18n.getSupportedLocales();                // ['en', 'fr', 'de'] — insertion order
i18n.getSupportedLocales({ sorted: true }); // ['de', 'en', 'fr'] — code-point order
```

## Framework integration

`i18nit` is framework-agnostic and exposes a single subscription primitive:

- `subscribe(callback, options?)`
  - default: change-only notifications (React external store style)
  - `{ immediate: true }`: immediate callback + change notifications (Svelte/Vue/Solid friendly)

Use these directly rather than package-level framework adapters.

```ts
const unsubscribe = i18n.subscribe((snapshot) => {
  const { locale, version } = snapshot;
  console.log(locale, version);
});

unsubscribe();
```

::: code-group

```tsx [React]
import { useSyncExternalStore } from 'react';

export function useI18n() {
  const snapshot = useSyncExternalStore(i18n.subscribe, i18n.getSnapshot, i18n.getSnapshot);

  return {
    locale: snapshot.locale,
    t: i18n.t,
    setLocale: i18n.setLocale,
  };
}
```

```ts [Vue]
import { onUnmounted, shallowRef } from 'vue';

const snapshot = shallowRef(i18n.getSnapshot());

const stop = i18n.subscribe((next) => {
  snapshot.value = next;
}, { immediate: true });

onUnmounted(stop);
```

```ts [Svelte]
import type { Readable } from 'svelte/store';
import type { I18nSnapshot } from '@vielzeug/i18nit';

export const i18nStore: Readable<I18nSnapshot> = {
  subscribe: (run) => i18n.subscribe(run, { immediate: true }),
};
```

:::

For more complete framework samples, see:

- `docs/i18nit/examples/framework-integration.md`

## Formatting

Formatting lives in `@vielzeug/i18nit/format` and can bind to:

- a static locale string
- an i18n-like source with `locale`
- a getter function that returns a locale
