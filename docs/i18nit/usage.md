---
title: I18nit — Usage Guide
description: Locale setup, interpolation, pluralisation, async loading, namespaces, formatting, and subscriptions for I18nit.
---

# I18nit Usage Guide

::: tip New to I18nit?
Start with the [Overview](./index.md) for a quick introduction and installation, then come back here for in-depth usage patterns.
:::

[[toc]]

## Import

```ts
import { createI18n } from '@vielzeug/i18nit';

// Optional: import types
import type { Messages, Locale, Loader, I18nConfig, I18nInstance } from '@vielzeug/i18nit';
```

## Basic Usage

### Creating an Instance

```ts
import { createI18n } from '@vielzeug/i18nit';

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: { greeting: 'Hello!', farewell: 'Goodbye!' },
    es: { greeting: '¡Hola!', farewell: '¡Adiós!' },
  },
});
```

### Translating Keys

```ts
i18n.t('greeting');   // "Hello!"
i18n.t('missing');    // "missing" — key itself is returned when not found
```

### Switching Locale

Use the `locale` property setter:

```ts
i18n.locale = 'es';
i18n.t('greeting'); // "¡Hola!"

console.log(i18n.locale); // "es"
```

Setting the same locale is a no-op — subscribers are not notified.

### Nested Keys

Both nested objects and flat dot-notation keys are accessed identically:

```ts
const i18n = createI18n({
  messages: {
    en: {
      nav: { home: 'Home', about: 'About' }, // nested
      'errors.required': 'Required',          // flat dot-notation
    },
  },
});

i18n.t('nav.home');        // "Home"
i18n.t('nav.about');       // "About"
i18n.t('errors.required'); // "Required"
```

You can mix both styles freely within the same messages object.

### Type-Safe Keys

When you pass a concrete messages shape, TypeScript enforces valid keys on `t()`:

```ts
const i18n = createI18n({
  messages: { en: { title: 'App', nav: { home: 'Home' } } },
});

i18n.t('title');    // ✅
i18n.t('nav.home'); // ✅
i18n.t('typo');     // ❌ TypeScript error
```

To use dynamic or runtime keys (e.g. after `replace()` / `add()`), widen the type:

```ts
const i18n = createI18n<Messages>({ messages: { en: { ... } } });
i18n.t('any.key'); // accepts any string
```

---

## Variable Interpolation

### Simple Variables

`{name}` placeholders are replaced by the matching key in `vars`:

```ts
const i18n = createI18n({
  messages: { en: { welcome: 'Welcome, {name}! You have {count} messages.' } },
});

i18n.t('welcome', { name: 'Alice', count: 5 });
// "Welcome, Alice! You have 5 messages."
```

`null` and `undefined` variables resolve to an empty string — no error is thrown.

### Nested Object Variables

Use dot-notation paths to access nested properties:

```ts
const i18n = createI18n({
  messages: { en: { info: 'User: {user.name} ({user.email})' } },
});

i18n.t('info', { user: { name: 'Alice', email: 'alice@example.com' } });
// "User: Alice (alice@example.com)"
```

### Array Variables

**Index access** (safe — returns empty string when out of bounds):
```ts
i18n.t('first', { items: ['Gold', 'Silver'] }); // {items[0]} → "Gold"
i18n.t('oob',   { items: ['Gold'] });            // {items[9]} → ""
```

**Comma join** (default):
```ts
i18n.t('list', { items: ['A', 'B', 'C'] }); // {items} → "A, B, C"
```

**Locale-aware conjunctions** via `Intl.ListFormat`:
```ts
i18n.t('and', { x: ['Alice', 'Bob', 'Charlie'] }); // {x|and} → "Alice, Bob, and Charlie"
i18n.t('or',  { x: ['Alice', 'Bob', 'Charlie'] }); // {x|or}  → "Alice, Bob, or Charlie"
```

Switch locale to get the correct conjunction automatically:
```ts
i18n.locale = 'es';
i18n.t('and', { x: ['A', 'B', 'C'] }); // "A, B y C"

i18n.locale = 'fr';
i18n.t('and', { x: ['A', 'B', 'C'] }); // "A, B et C"

i18n.locale = 'de';
i18n.t('and', { x: ['A', 'B', 'C'] }); // "A, B und C"
```

**Custom separator**:
```ts
i18n.t('path', { folders: ['home', 'user', 'docs'] }); // {folders| / } → "home / user / docs"
```

**Array length**:
```ts
i18n.t('count', { tags: ['A', 'B', 'C'] }); // {tags.length} → "3"
```

### Number Formatting

Number variables are auto-formatted using `Intl.NumberFormat` for the active locale:

```ts
const i18n = createI18n({
  locale: 'en',
  messages: { en: { price: 'Price: {amount}' } },
});

i18n.t('price', { amount: 1234.56 }); // "Price: 1,234.56"

i18n.locale = 'de';
i18n.t('price', { amount: 1234.56 }); // "Price: 1.234,56"
```

### Interpolation Path Reference

| Syntax | Description |
|---|---|
| `{name}` | Simple variable |
| `{user.name}` | Nested property |
| `{items[0]}` | Array index — empty string when out of bounds |
| `{items}` | Array joined with `', '` |
| `{items\|and}` | Locale-aware "and" list (`Intl.ListFormat`) |
| `{items\|or}` | Locale-aware "or" list (`Intl.ListFormat`) |
| `{items\| – }` | Custom separator |
| `{items.length}` | Array length |

---

## Pluralisation

Pluralised messages are objects with one or more plural-form keys. The `other` key is required; all others are optional.

```ts
const i18n = createI18n({
  messages: {
    en: {
      items: {
        zero: 'No items',
        one:  'One item',
        other: '{count} items',
      },
    },
  },
});

i18n.t('items', { count: 0 }); // "No items"   — explicit zero form
i18n.t('items', { count: 1 }); // "One item"
i18n.t('items', { count: 5 }); // "5 items"
```

The plural form is selected by `Intl.PluralRules` based on the `count` variable and the active locale. The `zero` form is checked separately: when `count === 0` and a `zero` form exists, it is always used regardless of what `Intl.PluralRules` returns.

### Locale-Specific Forms

**French** — 0 and 1 use the `one` form:
```ts
const fr = createI18n({
  locale: 'fr',
  messages: { fr: { n: { one: 'un article', other: '{count} articles' } } },
});

fr.t('n', { count: 0 }); // "un article"
fr.t('n', { count: 1 }); // "un article"
fr.t('n', { count: 2 }); // "2 articles"
```

**Arabic** — all six forms are used:
```ts
const ar = createI18n({
  locale: 'ar',
  messages: {
    ar: {
      n: {
        zero:  'صفر',
        one:   'واحد',
        two:   'اثنان',
        few:   'عدة',     // 3–10
        many:  'كثيرة',   // 11–99
        other: 'أخرى',
      },
    },
  },
});
```

When a matched form doesn't exist in the message object, `other` is used as the fallback.

---

## Locale Chain & Fallbacks

When a key is missing in the active locale, i18nit walks a fallback chain:

1. The exact locale (`'en-US'`)
2. The language root, if locale contains a region (`'en'`)
3. Each fallback locale, in order
4. The language root of each fallback

This means `locale: 'en-US', fallback: ['fr', 'en']` produces the chain:
`en-US → en → fr → en` (already visited locales are skipped).

```ts
const i18n = createI18n({
  locale: 'es',
  fallback: ['fr', 'en'],
  messages: {
    en: { a: 'A(en)', b: 'B(en)', c: 'C(en)' },
    es: { a: 'A(es)' },
    fr: { b: 'B(fr)' },
  },
});

i18n.t('a'); // "A(es)"  — found in 'es'
i18n.t('b'); // "B(fr)"  — not in 'es', found in 'fr'
i18n.t('c'); // "C(en)"  — found at the end of the chain
i18n.t('d'); // "d"      — not found anywhere, key returned
```

---

## Scoped Translation

`scoped(locale)` returns a locale-bound `ScopedI18n` object that doesn't change the active locale. Useful for SSR and multi-locale rendering.

```ts
const i18n = createI18n({
  locale: 'en',
  fallback: 'en',
  messages: {
    en: { msg: 'Hello' },
    fr: { msg: 'Bonjour' },
  },
});

i18n.scoped('fr').t('msg');    // "Bonjour"
console.log(i18n.locale);      // "en" — unchanged

// Scoped also exposes number(), date(), and namespace()
i18n.scoped('de').number(1234.56);                // German number format
i18n.scoped('fr').namespace('nav').t('home');      // French nav.home
```

The scoped instance resolves through the fallback chain starting from the given locale.

---

## Async Loading

### Registering Loaders

Loaders are registered in `I18nConfig` or dynamically via `addLoader()`. Each loader receives the locale string and returns a `Promise<Messages>`.

```ts
// At creation time
const i18n = createI18n({
  loaders: {
    es: async () => import('./locales/es.json').then((m) => m.default),
    fr: async (locale) => fetch(`/locales/${locale}.json`).then((r) => r.json()),
  },
});

// Dynamically after creation
i18n.addLoader('de', async () => import('./locales/de.json').then((m) => m.default));
```

### Loading a Locale

```ts
await i18n.load('es');
i18n.locale = 'es';
i18n.t('greeting'); // Spanish translation
```

`load()` deduplicates concurrent calls — multiple simultaneous `load('es')` invocations trigger the loader only once. It is a no-op when the catalog is already populated.

### Parallel Preloading

```ts
await Promise.all([i18n.load('es'), i18n.load('fr'), i18n.load('de')]);
// All three catalogs are now loaded
```

### Error Handling

If a loader throws, `load()` re-throws the error and removes the in-flight promise so a subsequent call will retry the loader.

```ts
try {
  await i18n.load('es');
} catch (error) {
  console.error('Failed to load Spanish:', error);
  // 'es' can be retried on the next call to load('es')
}
```

---

## Namespaces

`namespace(ns)` returns a `NamespacedI18n` with `t` and `has` methods that automatically prepend `ns + '.'` to every key:

```ts
const i18n = createI18n({
  messages: {
    en: {
      errors: { required: 'Required', minLength: 'Too short' },
      nav:    { home: 'Home', about: 'About' },
    },
  },
});

const errors = i18n.namespace('errors');
const nav    = i18n.namespace('nav');

errors.t('required');      // "Required"
errors.t('minLength');     // "Too short"
errors.has('required');    // true
nav.t('home');             // "Home"
```

Sub-namespaces work the same way — just continue the dot-path:

```ts
const user = i18n.namespace('user');
user.t('profile.name');  // i18n.t('user.profile.name')
```

---

## Message Management

### Deep-Merge with `add()`

Merges new messages into an existing catalog without removing any already-loaded keys:

```ts
i18n.add('en', { user: { title: 'Profile' } });
// Existing keys under 'user' remain intact
```

### Catalog Replacement with `replace()`

Completely replaces the catalog for a locale. All previous keys for that locale are gone:

```ts
i18n.replace('en', { greeting: 'Greetings!' });
// Only 'greeting' exists in 'en' now
```

### Key & Locale Checks

```ts
i18n.has('nav.home');        // true if key resolves in active locale chain
i18n.has('nav.home', 'fr'); // true if key resolves in 'fr' chain
i18n.hasLocale('es');        // true if 'es' catalog is loaded
```

---

## Formatting Helpers

Both `number()` and `date()` accept an optional third `locale` argument to format in a specific locale without changing the active one.

### `number()`

```ts
i18n.number(1234.56);                                            // "1,234.56"
i18n.number(99.99, { style: 'currency', currency: 'USD' });     // "$99.99"
i18n.number(0.856, { style: 'percent' });                       // "85.6%"
i18n.number(1234.56, undefined, 'de');                          // "1.234,56"
i18n.number(99.99, { style: 'currency', currency: 'EUR' }, 'de'); // "99,99 €"
```

### `date()`

Accepts a `Date` object **or** a numeric timestamp:

```ts
const d = new Date('2024-01-15');

i18n.date(d);                                // "1/15/2024"
i18n.date(d, { dateStyle: 'long' });         // "January 15, 2024"
i18n.date(d, { dateStyle: 'full', timeStyle: 'short' });
                                             // "Monday, January 15, 2024 at 12:00 AM"
i18n.date(d.getTime());                      // numeric timestamp works
i18n.date(d, { dateStyle: 'long' }, 'fr');  // "15 janvier 2024"
```

---

## Subscriptions

`subscribe()` fires immediately with the current locale and then on every subsequent locale change. It returns an unsubscribe function.

```ts
const unsub = i18n.subscribe((locale) => {
  document.documentElement.lang = locale;
  rerender();
});

// Stop listening
unsub();
```

Subscriber errors are silently swallowed, so a broken handler doesn't prevent other subscribers from being called.

To remove all subscribers at once:

```ts
i18n.dispose();
```

---

## Best Practices

### Organise by Feature

```ts
const messages = {
  en: {
    auth:   { login: 'Log in', logout: 'Log out', register: 'Register' },
    user:   { profile: 'Profile', settings: 'Settings' },
    errors: { required: 'Required', invalid: 'Invalid value' },
  },
};
```

### Single Instance

```ts
// ✅ create once outside components
const i18n = createI18n({ ... });

// ❌ don't create inside render functions
function render() {
  const i18n = createI18n({ ... }); // new instance every render!
}
```

### Lazy-Load Large Bundles

```ts
const i18n = createI18n({
  locale: 'en',
  messages: { en: { /* baseline */ } },
  loaders: {
    es: () => import('./locales/es.json').then((m) => m.default),
    // ...
  },
});
```

### Guard Dynamic Lookups

```ts
const key = getKeyFromSomewhere(); // unknown at compile time

if (i18n.has(key)) {
  return i18n.t(key);
}
return fallbackString;
```

### React Integration

```tsx
function useI18n() {
  const [, forceUpdate] = useState({});
  useEffect(() => i18n.subscribe(() => forceUpdate({})), []);
  return i18n;
}
```

### Vue Integration

```ts
const locale = ref(i18n.locale);
const unsub  = i18n.subscribe((l) => (locale.value = l));
onUnmounted(() => unsub());
```
