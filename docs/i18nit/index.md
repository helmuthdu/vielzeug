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
| Bundle Size        | **<PackageInfo package="i18nit" type="size" />**         | ~12KB       | ~15KB       |
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

- **Async Loading**: Lazy-load translations with [automatic caching and deduplication](./usage.md#async-loading).
- **Framework Agnostic**: Works with React, Vue, Svelte, or vanilla JS.
- **HTML Escaping**: Built-in XSS protection with automatic or per-translation escaping.
- **Lightweight & Fast**: <PackageInfo package="i18nit" type="dependencies" /> dependencies and only **<PackageInfo package="i18nit" type="size" /> gzipped**.
- **Loader Error Logging**: Failed locale loads are logged for visibility while maintaining a graceful fallback.
- **Locale Fallbacks**: Automatic [fallback chain](./usage.md#fallback-translations) (e.g., de-CH → de → en).
- **Namespaced Keys**: Organize translations by [feature or module](./usage.md#namespaces).
- **Path Interpolation**: Dot notation and bracket notation for [nested data](./usage.md#variable-interpolation).
- **Reactive Subscriptions**: Subscribe to [locale changes](./usage.md#subscriptions) for UI updates.
- **Smart Array Handling**: Auto-join with locale-aware separators via [Intl.ListFormat](./usage.md#array-variables).
- **Type-Safe**: Full TypeScript support with generic types and type inference.
- **Universal Pluralization**: Support for 100+ languages via [Intl.PluralRules API](./usage.md#pluralization).

## 🏁 Quick Start

### Installation

::: code-group

```sh [npm]
npm install @vielzeug/i18nit
```

```sh [yarn]
yarn add @vielzeug/i18nit
```

```sh [pnpm]
pnpm add @vielzeug/i18nit
```

:::

### Basic Translation

```ts
import { createI18n } from '@vielzeug/i18nit';

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      welcome: 'Welcome!',
      greeting: 'Hello, {name}!',
    },
    es: {
      welcome: '¡Bienvenido!',
      greeting: '¡Hola, {name}!',
    },
  },
});

// Simple translation
i18n.t('welcome'); // "Welcome!"

// With variables
i18n.t('greeting', { name: 'Alice' }); // "Hello, Alice!"

// Change locale
i18n.setLocale('es');
i18n.t('welcome'); // "¡Bienvenido!"
```

### With Pluralization

```ts
const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      items: {
        zero: 'No items',
        one: 'One item',
        other: '{count} items',
      },
      notifications: {
        one: 'You have 1 notification',
        other: 'You have {count} notifications',
      },
    },
  },
});

i18n.t('items', { count: 0 }); // "No items"
i18n.t('items', { count: 1 }); // "One item"
i18n.t('items', { count: 5 }); // "5 items"
i18n.t('notifications', { count: 3 }); // "You have 3 notifications"
```

### With Array Handling

```ts
const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      shopping: 'Shopping list: {items}',
      guests: 'Invited: {names|and}',
      options: 'Choose: {choices|or}',
      count: 'You have {items.length} items',
    },
    es: {
      shopping: 'Lista de compras: {items}',
      guests: 'Invitados: {names|and}', // Automatically uses "y" via Intl.ListFormat
      options: 'Elige: {choices|or}', // Automatically uses "o" via Intl.ListFormat
      count: 'Tienes {items.length} artículos',
    },
  },
});

// Default comma separator
i18n.t('shopping', { items: ['Apple', 'Banana', 'Orange'] });
// "Shopping list: Apple, Banana, Orange"

// Locale-aware "and" lists (English uses "and" with Oxford comma)
i18n.t('guests', { names: ['Alice', 'Bob', 'Charlie'] });
// "Invited: Alice, Bob, and Charlie"

// Locale-aware "or" lists (English uses "or" with Oxford comma)
i18n.t('options', { choices: ['Tea', 'Coffee', 'Juice'] });
// "Choose: Tea, Coffee, or Juice"

// Spanish automatically uses "y" and "o" (powered by Intl.ListFormat)
i18n.setLocale('es');
i18n.t('guests', { names: ['Alice', 'Bob', 'Charlie'] });
// "Invitados: Alice, Bob y Charlie"

i18n.t('options', { choices: ['Té', 'Café', 'Jugo'] });
// "Elige: Té, Café o Jugo"

// Array length
i18n.t('count', { items: ['A', 'B', 'C'] });
// "Tienes 3 artículos"
```

::: tip 100+ Languages Supported
Array formatting uses **Intl.ListFormat API** for automatic support of 100+ languages with proper grammar, conjunctions, and punctuation. No manual configuration needed!
:::

### Async Translation Loading

```ts
const i18n = createI18n({
  locale: 'en',
  loaders: {
    es: async () => {
      const response = await fetch('/locales/es.json');
      return response.json();
    },
    fr: async () => {
      const response = await fetch('/locales/fr.json');
      return response.json();
    },
  },
});

// Automatically loads and translates
// Preload locales at app startup
await i18n.loadAll(['en', 'fr', 'es']);

// Or load individually
await i18n.load('es');
i18n.setLocale('es');
i18n.t('welcome'); // Now uses Spanish

// Or load explicitly
await i18n.load('fr');
i18n.t('welcome', undefined, { locale: 'fr' });
```

## 🎓 Core Concepts

### Translation Keys

Access translations using dot notation or nested objects:

```ts
const i18n = createI18n({
  messages: {
    en: {
      user: {
        profile: {
          name: 'Name',
          email: 'Email',
        },
      },
      'settings.privacy': 'Privacy Settings',
    },
  },
});

i18n.t('user.profile.name'); // "Name"
i18n.t('settings.privacy'); // "Privacy Settings"
```

### Variable Interpolation

Interpolate variables with curly braces:

```ts
i18n.t('greeting', { name: 'Alice', time: 'morning' });
// "Good morning, Alice!"

// Nested variables
i18n.t('message', { user: { name: 'Bob', role: 'admin' } });
// Template: "Welcome {user.name}, you are {user.role}"
// Result: "Welcome Bob, you are admin"

// Array access
i18n.t('list', { items: ['apple', 'banana'] });
// Template: "First item: {items[0]}"
// Result: "First item: apple"
```

### Pluralization

Support for complex plural forms across languages:

```ts
// English (one/other)
{ one: '1 item', other: '{count} items' }

// Russian (one/few/many/other)
{
  one: '{count} предмет',
  few: '{count} предмета',
  many: '{count} предметов',
  other: '{count} предметов'
}

// Arabic (zero/one/two/few/many/other)
{
  zero: 'لا عناصر',
  one: 'عنصر واحد',
  two: 'عنصران',
  few: 'عدة عناصر',
  many: 'عناصر كثيرة',
  other: 'عناصر'
}
```

### Message Functions

Create dynamic translations with functions:

```ts
const i18n = createI18n({
  messages: {
    en: {
      timestamp: (vars, helpers) => {
        const date = vars.date as Date;
        return `Updated on ${helpers.date(date, { dateStyle: 'short' })}`;
      },
      price: (vars, helpers) => {
        const amount = vars.amount as number;
        return `Price: ${helpers.number(amount, { style: 'currency', currency: 'USD' })}`;
      },
    },
  },
});

i18n.t('timestamp', { date: new Date() });
// "Updated on 2/9/26"

i18n.t('price', { amount: 99.99 });
// "Price: $99.99"
```

### Locale Fallbacks

Automatic fallback chain for missing translations:

```ts
const i18n = createI18n({
  locale: 'en-US',
  fallback: ['en', 'es'],
  messages: {
    es: { greeting: '¡Hola!' },
    en: { greeting: 'Hello!', welcome: 'Welcome!' },
    'en-US': { welcome: 'Welcome to the US!' },
  },
});

// Locale chain: en-US → en → es
i18n.t('welcome'); // "Welcome to the US!" (from en-US)
i18n.t('greeting'); // "Hello!" (fallback to en)
```

### Namespaces

Organize translations with namespaces:

```ts
const errors = i18n.namespace('errors');
const user = i18n.namespace('user');

errors.t('required'); // Same as i18n.t('errors.required')
user.t('profile.name'); // Same as i18n.t('user.profile.name')
```

## 🎯 Advanced Features

### HTML Escaping

Protect against XSS with automatic HTML escaping:

```ts
const i18n = createI18n({
  escape: true, // Enable globally
  messages: {
    en: {
      userInput: 'Hello, {name}!',
    },
  },
});

i18n.t('userInput', { name: '<script>alert("xss")</script>' });
// "Hello, &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;!"

// Override per translation
i18n.t('safeHtml', { content: '<b>bold</b>' }, { escape: false });
```

### Custom Missing Key Handler

Missing translations return the key itself, and missing variables are replaced with empty strings:

```ts
const i18n = createI18n({
  messages: {
    en: {
      hello: 'Hello!',
      greeting: 'Hello, {name}!',
    },
  },
});

// Missing key returns the key
i18n.t('nonexistent'); // "nonexistent"

// Missing variable returns empty string
i18n.t('greeting'); // "Hello, !"
i18n.t('greeting', { name: 'Alice' }); // "Hello, Alice!"
```

### Number and Date Formatting

Built-in helpers for locale-aware formatting:

```ts
// Number formatting
i18n.number(1234.56); // "1,234.56" (en-US)
i18n.number(1234.56, { style: 'currency', currency: 'EUR' }, 'de');
// "1.234,56 €" (German formatting)

// Date formatting
i18n.date(new Date(), { dateStyle: 'long' });
// "February 9, 2026"

i18n.date(new Date(), { dateStyle: 'long' }, 'fr');
// "9 février 2026"
```

## 🔍 API Overview

```ts
// Create instance
const i18n = createI18n(config);

// Translation
i18n.t(key, vars?, options?);

// Locale management
i18n.setLocale(locale);
i18n.getLocale();

// Message management
i18n.add(locale, messages);
i18n.set(locale, messages);
i18n.has(key, locale?);

// Async loading
i18n.register(locale, loader);
await i18n.load(locale);

// Formatting
i18n.number(value, options?, locale?);
i18n.date(value, options?, locale?);

// Namespaces
const ns = i18n.namespace('namespace');
ns.t(key, vars?, options?);

// Subscriptions
const unsubscribe = i18n.subscribe(handler);
```

## 📚 Documentation

Explore comprehensive guides and references:

- **[Usage Guide](./usage.md)** – Complete guide to all i18n features
- **[API Reference](./api.md)** – Detailed API documentation with all methods
- **[Examples](./examples.md)** – Real-world examples and framework integrations
- **[Interactive REPL](/repl)**: Try it in your browser

## ❓ FAQ

### **Q: How do I add a new language?**

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

### **Q: Can I use i18nit with React/Vue/Svelte?**

Yes! i18nit is framework-agnostic. Subscribe to locale changes and trigger re-renders when the locale updates.

### **Q: How do I handle missing translations?**

Set a `fallbackLocale` to use when a translation is missing:

```ts
const i18n = createI18n({
  locale: 'fr',
  fallbackLocale: 'en',
  messages: { en: { hello: 'Hello' }, fr: {} },
});

i18n.t('hello'); // Returns 'Hello' (fallback)
```

### **Q: Can I load translations dynamically?**

Yes, use loaders for async loading:

```ts
const i18n = createI18n({
  loaders: {
    es: async () => {
      const res = await fetch('/locales/es.json');
      return res.json();
    },
  },
});

await i18n.load('es');
```

### **Q: How do I handle pluralization?**

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
useEffect(() => {
  return i18n.subscribe(() => forceUpdate({}));
}, []);

// Vue
onMounted(() => {
  i18n.subscribe(() => {
    // Trigger reactivity
  });
});
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
