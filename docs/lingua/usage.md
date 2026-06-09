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
i18n.tp('position', 2, { ordinal: true }); // ordinal
i18n.tp('position', 1, { vars: { name: 'Alice' }, ordinal: true }); // ordinal with vars
```

`t()` resolves leaf keys. `tp()` resolves plural branch keys (`.zero`, then CLDR category, then `.other`).
`count` is injected automatically — do not include it in `vars`.

## Scoped Helpers

`scope(prefix)` returns a `{ fmt, t, tp, has }` helper bound to a key prefix. Use it inside a component or module
to avoid repeating the same key segment.

```ts
const nav = i18n.scope('nav');
nav.t('home'); // resolves 'nav.home'
nav.t('menu.settings'); // resolves 'nav.menu.settings'
nav.has('logout'); // checks 'nav.logout'
nav.fmt.number(1234); // same as i18n.fmt.number(1234)
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

Alternatively, access `i18n.fmt` which is a formatter pre-wired to the instance locale:

```ts
const price = i18n.fmt.currency(49.95, 'USD');
```

`i18n.fmt` creates fresh `Intl` instances on each locale change because it reads locale lazily via a getter.

## Namespace-based Lazy Loading

Namespaces let you load partial catalogs on demand (e.g. per-route or per-feature translations) without using `merge()` manually for each locale.

```ts
// Register once at startup
i18n.registerNamespace(
  'settings',
  (locale) => () => import(`./locales/${locale}/settings.json`).then((m) => m.default),
);

// Load when entering the settings route
async function onEnterSettings() {
  await i18n.loadNamespace('settings');
  // Keys from settings.json are now merged into the active locale catalog
}

// Pre-load a specific locale
await i18n.loadNamespace('settings', 'de');
```

Key characteristics:

- `loadNamespace(ns)` resolves for the active locale by default.
- Concurrent calls for the same `ns + locale` pair are deduplicated — the source is loaded at most once.
- Subsequent calls after a successful load are no-ops.
- Throws `[lingua/E005]` if the namespace was not registered with `registerNamespace()` first.

## Validating Catalogs

Use `validateCatalog()` during development or CI to detect plural branches that are missing CLDR forms for a target locale. Import it from the dedicated `@vielzeug/lingua/validate` entry — do not import it from the main entry or it will end up in your production bundle.

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

The function inspects the catalog for keys that look like plural branches (i.e. have at least one CLDR form as a child) and compares the present forms against the full CLDR set for the given locale. It uses `Intl.PluralRules` internally.

## Bound Translation Functions

`bind(key)` returns a function permanently bound to one translation key. The function caches the catalog lookup and
invalidates automatically whenever the locale or catalog changes. Use it in render loops where you call the same
translation many times.

```ts
const greet = i18n.bind('greeting');

// Cached lookup — no repeated key resolution
users.forEach((u) => greet({ name: u.name }));

// Re-resolves automatically after locale switch
await i18n.setLocale('de');
greet({ name: 'Alice' }); // => German greeting
```

## Bound Plural Functions

`bindPlural(key)` is the plural counterpart to `bind()`. It returns a function permanently bound to one plural branch key.
Unlike `bind()`, there is no per-key caching — plural form resolution requires the `count` value at call time.
Use it for reactive counts, notification badges, or any hot-path plural render.

```ts
const inbox = i18n.bindPlural('inbox');

inbox(0); // => 'No messages'
inbox(1); // => 'One message'
inbox(5); // => '5 messages'
inbox(1, { ordinal: true }); // => '1st'

// Follows locale changes automatically
await i18n.setLocale('de');
inbox(3); // => '3 Nachrichten'
```

Works with pipe-plural shorthand:

```ts
const alerts = i18n.bindPlural('alerts'); // catalog: 'One alert|{count} alerts'
alerts(3); // => '3 alerts'
```

## Forking for SSR and Testing

`fork(overrides?)` creates a child instance that inherits the parent's current catalog snapshot, loaders, and
namespace registry, but has its own locale, fallback chain, and subscribers. Use it to isolate per-request locale
state in SSR without re-creating and re-registering everything from scratch.

```ts
// SSR: share catalog setup; one fork per request
const reqI18n = i18n.fork({ locale: req.locale });
await reqI18n.setLocale(req.locale);
const html = `<h1>${reqI18n.t('title')}</h1>`;

// Tests: custom missing-key handler without polluting the shared instance
const testI18n = i18n.fork({ onMissingKey: (k) => `MISSING:${k}` });
```

Key characteristics of forks:

- Catalog mutations (register, merge) on the fork do not affect the parent, and vice versa.
- The namespace registry is copied at fork time. Post-fork registrations are not shared.
- Forks do not inherit subscribers.

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
- Set `fallback` to a locale that has 100% coverage so missing keys degrade gracefully.
- Register additional locales with `register()` at runtime rather than including them in the initial catalogs.
- Use `registerNamespace` + `loadNamespace` for per-route key sets instead of calling `merge()` manually.
- Use `subscribe({ signal })` for lifecycle-safe subscriptions in components; use `subscribe()` when you need the `Unsubscribe` return value.
- Use `getState()` / `restoreState()` for SSR hydration instead of re-fetching catalogs on the client.
- Enable `compile: true` for hot render paths (e.g. high-frequency reactive lists) where regex overhead is measurable.
- Use `tp()` for pluralizable branch keys — `count` is injected automatically. Pass `{ ordinal: true }` for ordinal plural forms.
- Use `onMissingKey` and `onMissingVar` in development to surface untranslated keys early; omit them in production.
- Import `validateCatalog` from `@vielzeug/lingua/validate` in CI scripts; never import it in application code.
- Share one `i18n` instance per app entry point; avoid creating separate instances per component.

## SSR Hydration

Use `getState()` on the server and `restoreState()` on the client to avoid re-fetching catalogs:

```ts
// Server (Node.js / Deno)
const i18n = createI18n({ catalogs: { de: deMessages, en: enMessages }, locale: 'de' });
const state = i18n.getState();
// Embed state in the HTML response:
// <script>window.__I18N__ = ${JSON.stringify(state)}</script>

// Client
const i18n = createI18n({ catalogs: { en: enMessages, de: () => import('./de.json').then((m) => m.default) } });
i18n.restoreState(window.__I18N__);
// Catalogs from state are immediately available; no network request needed.
```

`restoreState()` stores all catalogs as flat dot-notation maps. It notifies subscribers once and switches the active locale.

## Template Pre-compilation

For high-frequency render paths, enable `compile: true` to parse message templates once at registration time instead of re-running the regex on every `t()` call:

```ts
const i18n = createI18n({
  catalogs: { en: { greeting: 'Hello, {name}!' } },
  compile: true,
});

// Regex is never run at render time
i18n.t('greeting', { name: 'Alice' }); // => 'Hello, Alice!'
```

Output is identical to non-compile mode. The flag is transparent — switch it on or off without changing call sites.

## Using subscribe() with AbortController

Pass `{ signal }` to `subscribe()` to unsubscribe automatically when an `AbortController` fires. If the signal is already aborted at call time, no subscription is created and the callback is never invoked:

```ts
// React
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

// Svelte (onDestroy)
const controller = new AbortController();
i18n.subscribe(
  ({ locale }) => {
    snapshot = locale;
  },
  { signal: controller.signal },
);
onDestroy(() => controller.abort());
```
