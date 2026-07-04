---
title: Lingua — Usage Guide
description: Practical usage patterns for @vielzeug/lingua.
---

[[toc]]

## Setup

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

All locale strings must be valid BCP 47 tags. `createI18n`, `setLocale`, and `register` throw `LinguaInvalidLocaleError` for unrecognised tags.

## Locale Lifecycle

```ts
await i18n.preload('de');
await i18n.setLocale('de');

await i18n.register('fr', () => import('./locales/fr.json').then((m) => m.default));

const locales = i18n.getSupportedLocales();
```

- `preload(locale)` loads the catalog without switching the active locale. Use it to warm up a locale before the user requests it.
- `setLocale(locale)` loads if needed, then atomically switches and bumps the version.
- `register(locale, source)` returns `Promise<void>`. For async loaders it resolves when the catalog is loaded. For static objects it resolves immediately. Subscribers are notified after the catalog is available.

Locale lookup expands subtags automatically — `en-US` checks `en-US` then `en` before moving to explicit fallbacks.

## Translation

```ts
i18n.t('greeting', { name: 'Alice' });
i18n.tp('inbox', 3);
i18n.tp('position', 2, { ordinal: true });
i18n.tp('position', 1, { vars: { name: 'Alice' }, ordinal: true });
```

`t()` resolves leaf keys. `tp()` resolves plural branch keys (`.zero`, then CLDR category, then `.other`).
`count` is injected automatically — do not include it in `vars`.

## Key Inspection

Use `has(key)` to check whether a key exists in the active fallback chain. It returns `true` for leaf keys, branch keys, and pipe-plural base keys.

```ts
// catalog: { inbox: 'One message|{count} messages' }  (expands to inbox.one, inbox.other)
i18n.has('inbox'); // true  — branch exists after pipe-plural expansion
i18n.has('inbox.one'); // true  — explicit sub-key
i18n.has('missing'); // false
```

`has()` walks the full fallback chain, so it returns `true` if any fallback locale provides the key.

## Scoped Helpers

`scope(prefix)` returns a `{ fmt, t, tp, has }` helper bound to a key prefix. Use it inside a component or module to avoid repeating the same key segment.

```ts
const nav = i18n.scope('nav');
nav.t('home'); // resolves 'nav.home'
nav.t('menu.settings'); // resolves 'nav.menu.settings'
nav.has('logout'); // checks 'nav.logout'
nav.fmt.number(1234); // same as i18n.fmt.number(1234)
```

`scope()` is memoized per prefix — repeated calls with the same prefix string return the same object reference.

## Formatting

Import `createFormatter` from the main entry:

```ts
import { createFormatter } from '@vielzeug/lingua';

// Pass a getter so the formatter follows locale changes
const fmt = createFormatter(() => i18n.locale);

fmt.number(1234567.89);
fmt.currency(19.99, 'EUR');
fmt.date(new Date(), { dateStyle: 'medium' });
fmt.relative(-3, 'day');
fmt.list(['a', 'b', 'c']);
```

Alternatively, access `i18n.fmt` which is a formatter pre-wired to the instance locale:

```ts
const price = i18n.fmt.currency(49.95, 'USD');
```

## Namespace-based Lazy Loading

There are two ways to load namespaces. Use `extend()` as a one-call convenience, or split the steps with `registerNamespace()` + `loadNamespace()` when you want to defer loading.

**`extend(ns, factory, locale?)`** — register and load in one call:

```ts
// Load when entering the settings route
async function onEnterSettings() {
  await i18n.extend('settings', (locale) => import(`./locales/${locale}/settings.json`).then((m) => m.default));
  // Keys from settings.json are now merged into the active locale catalog
}

// Pre-load for a specific locale
await i18n.extend('settings', (locale) => import(`./locales/${locale}/settings.json`).then((m) => m.default), 'de');
```

**`registerNamespace()` + `loadNamespace()`** — register eagerly, load on demand:

```ts
const settingsFactory = (locale: string) =>
  import(`./locales/${locale}/settings.json`).then((m) => m.default);

// Register at startup — no network request yet
i18n.registerNamespace('settings', settingsFactory);

// Load lazily when the route is activated
async function onEnterSettings() {
  await i18n.loadNamespace('settings'); // deduplicates concurrent calls
}
```

Key characteristics:

- All three methods (`extend`, `registerNamespace`, `loadNamespace`) deduplicate per `ns + locale` — the factory runs at most once.
- `isNamespaceRegistered(ns)` returns `true` after `registerNamespace()` or `extend()`.
- `isNamespaceLoaded(ns, locale?)` returns `true` only after a successful load for that locale.

## Missing Handling

Pass `onMissingKey` and/or `onMissingVar` to `createI18n` to handle missing keys and unresolved interpolation variables.

```ts
const strictI18n = createI18n({
  onMissingKey(key, locale) {
    return `[missing:${key}]`;
  },
  onMissingVar(varName, key, locale) {
    return `<missing:${varName}>`;
  },
});
```

Without `onMissingKey`, missing keys return the key string. Without `onMissingVar`, missing variables keep their `{placeholder}` text.

## Validating Catalogs

Use `validateCatalog()` during development or CI to detect plural branches that are missing CLDR forms for a target locale. Import it from the dedicated `@vielzeug/lingua/validate` entry — never from the main entry or it will end up in your production bundle.

```ts
import { validateCatalog } from '@vielzeug/lingua/validate';
import ar from './locales/ar.json';

const warnings = validateCatalog(ar, 'ar');
// Arabic requires: zero, one, two, few, many, other
// warnings = [{ key: 'inbox', locale: 'ar', form: 'zero' }, ...]

if (warnings.length > 0) {
  throw new Error(`Missing plural forms:\n${JSON.stringify(warnings, null, 2)}`);
}
```

The function compares present plural forms against the full CLDR set for the given locale using `Intl.PluralRules`. It also warns when a `other`, `two`, `few`, or `many` form template does not contain `{count}` — these warnings carry `form: '<form>:missing-count'`. The `zero` and `one` forms are exempt.

## Forking

`fork(overrides?)` creates a child instance that inherits the parent's current catalog snapshot and namespace registry, but has its own locale, fallback chain, and subscribers. Use it to isolate per-request locale state in SSR, or to create a test instance without polluting the shared one.

```ts
// SSR: share catalog setup; one fork per request
const reqI18n = i18n.fork({ locale: req.locale });
await reqI18n.setLocale(req.locale);
const html = `<h1>${reqI18n.t('title')}</h1>`;

// Tests: custom missing-key handler without polluting the shared instance
const testI18n = i18n.fork({ onMissingKey: (k) => `MISSING:${k}` });
```

Key characteristics:

- Catalog mutations on the fork do not affect the parent, and vice versa.
- Namespace dedup markers are copied at fork time. Calling `extend()` on a fork for an already-loaded `ns + locale` pair is a no-op.
- Forks do not inherit subscribers.

## SSR Hydration

Prefer the instance methods `getState()` and `restoreState()` — they are equivalent to `serializeI18n` / `hydrateI18n` but require no extra imports:

```ts
import { createI18n } from '@vielzeug/lingua';

// Server (Node.js / Deno)
const i18n = createI18n({ catalogs: { de: deMessages, en: enMessages }, locale: 'de' });
const state = i18n.getState();
// Embed state in the HTML response:
// <script>window.__I18N__ = ${JSON.stringify(state)}</script>

// Client
const i18n = createI18n();
i18n.restoreState(window.__I18N__);
// Catalogs from state are immediately available; no network request needed.
```

`restoreState()` replaces all catalogs, switches the active locale, clears namespace loaded-markers, and notifies subscribers once. The free functions `serializeI18n()` and `hydrateI18n()` are equivalent alternatives.

**Warning:** `getState()` silently omits locales registered as async loaders but not yet preloaded. Use `isLoaded()` to guard:

```ts
const locales = i18n.getSupportedLocales();
await Promise.all(locales.filter((l) => !i18n.isLoaded(l)).map((l) => i18n.preload(l)));
const state = i18n.getState(); // all locales guaranteed to be present
```

## Subscriptions

`subscribe(callback, options?)` fires on every locale or catalog change. It returns an `Unsubscribe` function.

```ts
const unsubscribe = i18n.subscribe(
  ({ locale }) => {
    document.documentElement.lang = locale;
  },
  { immediate: true },
);

// Later
unsubscribe();
```

Pass `{ signal }` to tie the subscription lifetime to an `AbortController` — useful in component lifecycle hooks:

```ts
// React useEffect
useEffect(() => {
  const controller = new AbortController();
  i18n.subscribe(
    ({ locale }) => {
      document.documentElement.lang = locale;
    },
    { immediate: true, signal: controller.signal },
  );
  return () => controller.abort();
}, []);

// Svelte onDestroy
const controller = new AbortController();
i18n.subscribe(
  ({ locale }) => {
    snapshot = locale;
  },
  { signal: controller.signal },
);
onDestroy(() => controller.abort());
```

If the signal is already aborted when `subscribe()` is called, no subscription is created and the callback is never invoked.

## Framework Integration

`i18n` exposes `subscribe` / `getSnapshot` semantics and wires directly into any framework reactive system.

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
    (s) => { snapshot = s; },
    { immediate: true },
  );
  onDestroy(() => stop());
</script>

<p>{i18n.t('greeting', { name: 'Alice' })}</p>
```

:::

## Working with Other Vielzeug Libraries

### With Wayfinder

Use Wayfinder path params or query params as the source of truth for locale selection.

```ts
import { createI18n } from '@vielzeug/lingua';
import { createBrowserHistory, createRouter } from '@vielzeug/wayfinder';

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
- Set `fallback` to a locale with 100% coverage so missing keys degrade gracefully.
- Use `extend(ns, factory, locale?)` or `registerNamespace()` + `loadNamespace()` for per-route or per-feature key sets.
- Use `isLoaded(locale)` before `getState()` / `serializeI18n()` in SSR to avoid silently omitting async-loader locales.
- Use `isRegistered(locale)` to check if a locale is configured; use `isLoaded(locale)` to check if it is ready.
- Call `dispose()` on route-level or request-scoped `fork()` instances when they are no longer needed.
- Use `{ signal }` in `subscribe()` for lifecycle-safe subscriptions; use the returned `Unsubscribe` otherwise.
- Use `onMissingKey` and `onMissingVar` in development to surface authoring errors early; omit them in production.
- Import `validateCatalog` from `@vielzeug/lingua/validate` in CI only — never in application code.
- Share one `i18n` instance per app entry point; avoid creating separate instances per component.
