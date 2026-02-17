<PackageBadges package="i18nit" />

<img src="/logo-i18nit.svg" alt="i18nit Logo" width="156" class="logo-highlight"/>

# i18nit

**i18nit** is a lightweight, type-safe internationalization (i18n) library for TypeScript. It provides powerful features like pluralization, variable interpolation with nested paths, async loading, locale fallbacks, and structured error handling with zero dependencies.

## What Problem Does i18nit Solve?

Internationalization in modern applications requires handling translations, pluralization rules, dynamic variables, and locale-specific formatting. i18nit provides all of this with a clean, framework-agnostic API and built-in safety features.

**Traditional Approach**:

```ts
// Manual translation management
const translations = {
  en: {
    greeting: 'Hello, {name}!',
    itemCount: {
      one: '1 item',
      other: '{count} items',
    },
  },
};

function translate(key, locale, vars) {
  let text = translations[locale]?.[key];
  if (!text) return key;

  // Manual variable replacement
  Object.keys(vars).forEach((k) => {
    text = text.replace(`{${k}}`, vars[k]);
  });

  // Manual pluralization
  if (typeof text === 'object') {
    const count = vars.count;
    text = count === 1 ? text.one : text.other;
    text = text.replace('{count}', count);
  }

  return text;
}
```

**With i18nit**:

```ts
import { createI18n } from '@vielzeug/i18nit';

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      greeting: 'Hello, {name}!',
      items: { one: '1 item', other: '{count} items' },
    },
  },
});

i18n.t('greeting', { name: 'Alice' }); // "Hello, Alice!"
i18n.t('items', { count: 5 }); // "5 items"
```

### Comparison with Alternatives

| Feature            | i18nit                                                   | i18next     | react-intl  |
| ------------------ | -------------------------------------------------------- | ----------- | ----------- |
| Bundle Size        | **<PackageInfo package="i18nit" type="size" />**         | ~13KB       | ~19KB       |
| Dependencies       | **<PackageInfo package="i18nit" type="dependencies" />** | 2+          | 10+         |
| TypeScript         | First-class                                              | Good        | Good        |
| Framework          | Agnostic                                                 | Agnostic    | React only  |
| Pluralization      | ✅ Built-in                                              | ✅ Plugin   | ✅ Built-in |
| Async Loading      | ✅ Built-in                                              | ✅ Built-in | ⚠️ Manual   |
| Path Interpolation | ✅ `{user.name}`                                         | ❌          | ❌          |
| Nested Keys        | ✅                                                       | ✅          | ✅          |
| HTML Escaping      | ✅ Built-in                                              | ⚠️ Manual   | ✅ Built-in |

## When to Use i18nit

✅ **Use i18nit when you need:**

- Lightweight, type-safe i18n solution
- Pluralization with complex language rules
- Async translation loading with automatic caching
- Framework-agnostic solution
- Variable interpolation with nested paths (`{user.name}`, `{items[0]}`)
- Minimal bundle size (<PackageInfo package="i18nit" type="size" /> gzipped)
- Built-in XSS protection with HTML escaping

❌ **Don't use i18nit when:**

- You need a full i18n ecosystem with extensive plugins (use i18next)
- You need ICU message format (use FormatJS)
- You require database-backed translations

## 🚀 Key Features

- **Async Loading**: Lazy-load translations with [automatic caching and deduplication](./usage.md#async-loading). Loaders receive locale as parameter for reusable functions.
- **Framework Agnostic**: Works with React, Vue, Svelte, or vanilla JS.
- **HTML Escaping**: Built-in XSS protection with automatic or per-translation escaping.
- **Lightweight & Fast**: <PackageInfo package="i18nit" type="dependencies" /> dependencies and only **<PackageInfo package="i18nit" type="size" /> gzipped**.
- **Loader Error Logging**: Failed locale loads are logged for visibility while maintaining a graceful fallback.
- **Locale Fallbacks**: Automatic [fallback chain](./usage.md#fallback-translations) (e.g., de-CH → de → en).
- **Namespaced Keys**: Organize translations by [feature or module](./usage.md#namespaces).
- **Nested Message Objects**: Organize messages with [nested objects](./usage.md#nested-keys--objects) or flat keys with dot notation.
- **Path Interpolation**: Dot notation and bracket notation for [nested data](./usage.md#variable-interpolation).
- **Reactive Subscriptions**: Subscribe to [locale changes](./usage.md#subscriptions) for UI updates.
- **Smart Array Handling**: Auto-join with locale-aware separators via [Intl.ListFormat](./usage.md#array-variables).
- **Type-Safe**: Full TypeScript support with generic types and type inference.
- **Universal Pluralization**: Support for 100+ languages via [Intl.PluralRules API](./usage.md#pluralization).

## 🏁 Quick Start

```ts
import { createI18n } from '@vielzeug/i18nit';

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      welcome: 'Welcome!',
      greeting: 'Hello, {name}!',
      items: { one: 'One item', other: '{count} items' },
    },
    es: {
      welcome: '¡Bienvenido!',
      greeting: '¡Hola, {name}!',
      items: { one: 'Un artículo', other: '{count} artículos' },
    },
  },
});

// Simple translation
i18n.t('welcome'); // "Welcome!"

// With variables
i18n.t('greeting', { name: 'Alice' }); // "Hello, Alice!"

// Pluralization
i18n.t('items', { count: 5 }); // "5 items"

// Change locale
i18n.setLocale('es');
i18n.t('welcome'); // "¡Bienvenido!"
```

::: tip Next Steps

- See [Usage Guide](./usage.md) for variable interpolation, pluralization, async loading, and more
- Check [Examples](./examples.md) for framework integrations
  :::

## 📚 Core Concepts

### Initialization

Three ways to define translations:

```ts
// 1. Inline messages (small apps)
const i18n = createI18n({
  locale: 'en',
  messages: {
    en: { welcome: 'Welcome!' },
    es: { welcome: '¡Bienvenido!' },
  },
});

// 2. With fallback chain
const i18n = createI18n({
  locale: 'de-CH', // Swiss German
  fallback: ['de', 'en'], // Falls through if key missing
  messages: {
    /* ... */
  },
});

// 3. With async loaders (large apps)
const i18n = createI18n({
  locale: 'en',
  loaders: {
    es: async (locale) => fetch(`/locales/${locale}.json`).then((r) => r.json()),
    fr: async (locale) => fetch(`/locales/${locale}.json`).then((r) => r.json()),
  },
});
```

### Translation

```ts
i18n.t('welcome'); // "Welcome!"
i18n.t('greeting', { name: 'Alice' }); // "Hello, Alice!"
i18n.t('items', { count: 5 }); // "5 items" (pluralization)
i18n.t('message', { user: { name: 'Bob' } }); // "Welcome Bob" (nested: {user.name})

// Override locale per-call
i18n.t('welcome', {}, { locale: 'es' }); // "¡Bienvenido!"

// Disable HTML escaping for safe content
i18n.t('html', { content: '<b>bold</b>' }, { escape: false });
```

### Locale Management

```ts
i18n.getLocale(); // "en"
i18n.setLocale('es'); // Change locale (triggers subscriptions)

// Load translations dynamically
await i18n.load('fr'); // Loads and caches
i18n.setLocale('fr');

// Preload multiple locales
await i18n.loadAll(['en', 'es', 'fr']);
```

### Message Structure

Organize translations with nested objects:

```ts
messages: {
  en: {
    auth: {
      login: 'Log in',
      logout: 'Log out',
      errors: {
        invalidEmail: 'Invalid email',
        weakPassword: 'Password too weak'
      }
    },
    items: {
      zero: 'No items',
      one: 'One item',
      other: '{count} items'
    }
  }
}

// Access with dot notation
i18n.t('auth.login'); // "Log in"
i18n.t('auth.errors.invalidEmail'); // "Invalid email"
i18n.t('items', { count: 3 }); // "3 items"

// Or use namespaces for cleaner code
const auth = i18n.namespace('auth');
auth.t('login'); // "Log in"
auth.t('errors.invalidEmail'); // "Invalid email"
```

### Pluralization

Automatic pluralization using `Intl.PluralRules` (supports 100+ languages):

```ts
messages: {
  en: {
    notifications: {
      zero: 'No notifications',
      one: 'One notification',
      other: '{count} notifications'
    }
  },
  ru: {
    // Russian has different plural forms
    notifications: {
      one: '{count} уведомление',    // 1, 21, 31...
      few: '{count} уведомления',     // 2-4, 22-24...
      many: '{count} уведомлений',    // 0, 5-20, 25-30...
      other: '{count} уведомлений'
    }
  }
}

i18n.t('notifications', { count: 0 });  // "No notifications"
i18n.t('notifications', { count: 1 });  // "One notification"
i18n.t('notifications', { count: 5 });  // "5 notifications"
```

See [Pluralization](./usage.md#pluralization) for more complex scenarios.

### Subscriptions

React to locale changes:

```ts
const unsubscribe = i18n.subscribe((newLocale, prevLocale) => {
  console.log(`Locale changed: ${prevLocale} → ${newLocale}`);
  // Update UI, fetch locale-specific data, etc.
});

// Clean up when done
unsubscribe();
```

### Formatting Helpers

Built-in number and date formatting:

```ts
// Numbers
i18n.number(1234.56); // "1,234.56" (en-US)
i18n.number(1234.56, { style: 'currency', currency: 'EUR' }, 'de');
// "1.234,56 €"

// Dates
i18n.date(new Date(), { dateStyle: 'long' }); // "February 17, 2026"
i18n.date(new Date(), { timeStyle: 'short' }); // "2:30 PM"
```

See [Formatting Helpers](./usage.md#formatting-helpers) for all options.

## ❓ FAQ

### How do I add a new language?

Add translations to the messages object and i18nit will handle the rest:

```ts
const i18n = createI18n({
  locale: 'en',
  messages: {
    en: { hello: 'Hello' },
    de: { hello: 'Hallo' },
    ja: { hello: 'こんにちは' },
  },
});
```

### Can I use i18nit with React/Vue/Svelte?

Yes! i18nit is framework-agnostic. See the [Examples](./examples.md) page for integration patterns with React, Vue, and Svelte.

### How do I handle missing translations?

Set a `fallback` locale to use when a translation is missing:

```ts
const i18n = createI18n({
  locale: 'fr',
  fallback: 'en',
  messages: { en: { hello: 'Hello' }, fr: {} },
});

i18n.t('hello'); // Returns 'Hello' (fallback)
```

### Can I load translations dynamically?

Yes, use loaders for async loading:

```ts
const loadLocale = async (locale: string) => {
  const res = await fetch(`/locales/${locale}.json`);
  return res.json();
};

const i18n = createI18n({
  loaders: { es: loadLocale, fr: loadLocale },
});

await i18n.load('es');
```

### How do I handle pluralization?

Use the count variable and define plural forms:

```ts
const i18n = createI18n({
  messages: {
    en: {
      items: {
        one: '{count} item',
        other: '{count} items',
      },
    },
  },
});

i18n.t('items', { count: 1 }); // "1 item"
i18n.t('items', { count: 5 }); // "5 items"
```

## 🐛 Troubleshooting

### Translation not updating after locale change

::: danger Problem
UI doesn't reflect new locale after calling `setLocale()`.
:::

::: tip Solution
Subscribe to locale changes and trigger re-renders:

```ts
// React
useEffect(() => i18n.subscribe(() => forceUpdate({})), []);

// Vue
let unsubscribe;
onMounted(() => (unsubscribe = i18n.subscribe((l) => (locale.value = l))));
onUnmounted(() => unsubscribe?.());
```

:::

### Async translations not loading

::: danger Problem
Translations show key instead of translated text after changing locale.
:::

::: tip Solution
Load the locale before using it:

```ts
// ❌ Wrong – locale not loaded
i18n.t('key', undefined, { locale: 'es' });

// ✅ Correct – preload at startup
await i18n.loadAll(['en', 'es']);
i18n.t('key', undefined, { locale: 'es' });

// Or load on-demand
await i18n.load('es');
i18n.t('key', undefined, { locale: 'es' });
```

:::

### Plural forms not working correctly

::: danger Problem
Wrong plural form used for certain counts.
:::

::: tip Solution
Ensure you're passing `count` in variables:

```ts
// ❌ Wrong
i18n.t('items'); // Always uses 'other'

// ✅ Correct
i18n.t('items', { count: 5 });
```

:::

### Nested variable interpolation fails

::: danger Problem
Variables like `{user.name}` not being replaced.
:::

::: tip Solution
Ensure the variable path matches your data structure:

```ts
// Template: "Hello, {user.name}!"
// ✅ Correct data structure
i18n.t('greeting', { user: { name: 'Alice' } });

// ❌ Wrong – flat structure
i18n.t('greeting', { 'user.name': 'Alice' });
```

:::

## 🤝 Contributing

Found a bug or want to contribute? Check our [GitHub repository](https://github.com/helmuthdu/vielzeug).

## 📄 License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu)

## 🔗 Useful Links

- [GitHub Repository](https://github.com/helmuthdu/vielzeug)
- [Issue Tracker](https://github.com/helmuthdu/vielzeug/issues)
- [NPM Package](https://www.npmjs.com/package/@vielzeug/i18nit)
- [Changelog](https://github.com/helmuthdu/vielzeug/blob/main/packages/i18nit/CHANGELOG.md)

---

> **Tip:** i18nit is part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) ecosystem, which includes utilities for forms, storage, HTTP clients, logging, and more.
