<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-1.8_KB-success" alt="Size">
  <img src="https://img.shields.io/badge/TypeScript-100%25-blue" alt="TypeScript">
  <img src="https://img.shields.io/badge/dependencies-0-success" alt="Dependencies">
</div>

<img src="/logo-i18nit.svg" alt="i18nit Logo" width="156" class="logo-highlight"/>

# i18nit

**i18nit** is a lightweight, type-safe internationalization (i18n) library for TypeScript. It provides powerful features like pluralization, variable interpolation, async loading, and locale fallbacks with zero dependencies.

## What Problem Does i18nit Solve?

Internationalization in modern applications requires handling translations, pluralization rules, dynamic variables, and locale-specific formatting. i18nit provides all of this with a clean, framework-agnostic API.

**Traditional Approach**:

```ts
// Manual translation management
const translations = {
  en: {
    greeting: 'Hello, {name}!',
    itemCount: {
      one: '1 item',
      other: '{count} items'
    }
  }
};

function translate(key, locale, vars) {
  let text = translations[locale]?.[key];
  if (!text) return key;
  
  // Manual variable replacement
  Object.keys(vars).forEach(k => {
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
      items: { one: '1 item', other: '{count} items' }
    }
  }
});

i18n.t('greeting', { name: 'Alice' }); // "Hello, Alice!"
i18n.t('items', { count: 5 }); // "5 items"
```

### Comparison with Alternatives

| Feature             | i18nit       | i18next      | react-intl  |
| ------------------- | ------------ | ------------ | ----------- |
| Bundle Size         | **1.8 KB**   | ~30KB        | ~40KB       |
| Dependencies        | 0            | 3            | Multiple    |
| TypeScript          | Native       | Good         | Good        |
| Framework           | Agnostic     | Agnostic     | React only  |
| Pluralization       | ✅           | ✅           | ✅          |
| Async Loading       | ✅           | ✅           | ✅          |
| Nested Keys         | ✅           | ✅           | ✅          |
| Message Functions   | ✅           | Plugins      | ✅          |

## When to Use i18nit

✅ **Use i18nit when you need:**

- Lightweight, type-safe i18n solution
- Pluralization with complex language rules
- Async translation loading
- Framework-agnostic solution
- Variable interpolation with nested paths
- Minimal bundle size

❌ **Don't use i18nit when:**

- You need a full i18n ecosystem with plugins (use i18next)
- You need ICU message format (use FormatJS)
- You need advanced formatting (use Intl directly)

## 🚀 Key Features

- **Type-Safe**: Full TypeScript support with type inference
- **Pluralization**: Support for 50+ languages with complex plural rules
- **Variable Interpolation**: Dot notation and bracket notation for nested data
- **Async Loading**: Lazy-load translations with automatic caching
- **Locale Fallbacks**: Automatic fallback chain (e.g., en-US → en → fallback)
- **Message Functions**: Dynamic translations with helper functions
- **Namespaced Keys**: Organize translations with namespaces
- **Reactive Subscriptions**: Subscribe to locale changes
- **Zero Dependencies**: No external dependencies, fully self-contained
- **Tiny Bundle**: ~1.8KB minified
- **Framework Agnostic**: Works with React, Vue, Svelte, or vanilla JS

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
await i18n.tl('welcome', undefined, { locale: 'es' });

// Or load explicitly
await i18n.load('fr');
i18n.t('welcome', undefined, { locale: 'fr' });
```

### React Integration

```tsx
import { createI18n } from '@vielzeug/i18nit';
import { useEffect, useState } from 'react';

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: { greeting: 'Hello, {name}!' },
    es: { greeting: '¡Hola, {name}!' },
  },
});

function App() {
  const [locale, setLocale] = useState(i18n.getLocale());
  const [, forceUpdate] = useState({});

  useEffect(() => {
    return i18n.subscribe((newLocale) => {
      setLocale(newLocale);
      forceUpdate({});
    });
  }, []);

  return (
    <div>
      <select value={locale} onChange={(e) => i18n.setLocale(e.target.value)}>
        <option value="en">English</option>
        <option value="es">Español</option>
      </select>
      <h1>{i18n.t('greeting', { name: 'World' })}</h1>
    </div>
  );
}
```

## 📚 Core Concepts

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

Customize behavior for missing translations:

```ts
const i18n = createI18n({
  missingKey: (key, locale) => {
    console.warn(`Missing translation: ${key} for ${locale}`);
    return `[${key}]`;
  },
});

i18n.t('nonexistent'); // "[nonexistent]"
```

### Missing Variable Handling

Control what happens when variables are missing:

```ts
const i18n = createI18n({
  missingVar: 'preserve', // 'preserve' | 'empty' | 'error'
  messages: {
    en: { greeting: 'Hello, {name}!' },
  },
});

// 'preserve': Keep placeholder
i18n.t('greeting'); // "Hello, {name}!"

// 'empty': Replace with empty string (default)
// i18n.t('greeting'); // "Hello, !"

// 'error': Throw error
// i18n.t('greeting'); // throws Error: Missing variable: name
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
await i18n.tl(key, vars?, options?); // with loading

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

## 🛠️ Supported Languages

i18nit includes plural rules for:

- **English** (en) - one/other
- **French** (fr) - one (0-1)/other
- **Arabic** (ar) - zero/one/two/few/many/other
- **Polish** (pl) - one/few/many
- **Russian** (ru) - one/few/many/other

Additional languages can be added by extending the `PLURAL_RULES` object.

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
Use `tl()` instead of `t()` for automatic loading:

```ts
// ❌ Wrong - doesn't load
i18n.t('key', undefined, { locale: 'es' });

// ✅ Correct - loads automatically
await i18n.tl('key', undefined, { locale: 'es' });

// Or pre-load
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

// ❌ Wrong - flat structure
i18n.t('greeting', { 'user.name': 'Alice' });
```

:::

## 🤝 Contributing

Found a bug or want to contribute? Check our [GitHub repository](https://github.com/helmuthdu/vielzeug).

## 📄 License

MIT © [Helmuth Duarte](https://github.com/helmuthdu)

## 🔗 Useful Links

- [GitHub Repository](https://github.com/helmuthdu/vielzeug)
- [Issue Tracker](https://github.com/helmuthdu/vielzeug/issues)
- [NPM Package](https://www.npmjs.com/package/@vielzeug/i18nit)
- [Changelog](https://github.com/helmuthdu/vielzeug/blob/main/packages/i18nit/CHANGELOG.md)

---

> **Tip:** i18nit is part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) ecosystem, which includes utilities for forms, storage, HTTP clients, logging, and more.

