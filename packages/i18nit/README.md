# @vielzeug/i18nit

Type-safe, lightweight internationalization (i18n) library for TypeScript applications. Simple, powerful translation management with zero dependencies.

## Features

- ✅ **Type-Safe** - Full TypeScript support with generic types
- ✅ **Lightweight** - 1.6 KB gzipped with zero dependencies
- ✅ **Universal Pluralization** - 100+ languages via Intl.PluralRules API
- ✅ **Smart Array Handling** - Auto-join with separators, length access, and safe indexing
- ✅ **Path Interpolation** - Support for nested objects and array indices
- ✅ **Lazy Loading** - Async locale loading with automatic caching
- ✅ **Namespaces** - Organize translations by feature or module
- ✅ **Fallback Chain** - Multiple fallback locales with automatic language variants
- ✅ **HTML Escaping** - Built-in XSS protection
- ✅ **Number & Date Formatting** - Locale-aware formatting with Intl API
- ✅ **Framework Agnostic** - Works with React, Vue, Svelte, or vanilla JS

## Installation

```bash
# pnpm
pnpm add @vielzeug/i18nit

# npm
npm install @vielzeug/i18nit

# yarn
yarn add @vielzeug/i18nit
```

## Quick Start

```typescript
import { createI18n } from '@vielzeug/i18nit';

// Create instance with messages
const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      greeting: 'Hello, {name}!',
      items: {
        zero: 'No items',
        one: 'One item',
        other: '{count} items',
      },
    },
    es: {
      greeting: '¡Hola, {name}!',
      items: {
        zero: 'Sin artículos',
        one: 'Un artículo',
        other: '{count} artículos',
      },
    },
  },
});

// Simple translation
i18n.t('greeting', { name: 'World' }); // "Hello, World!"

// Pluralization
i18n.t('items', { count: 0 }); // "No items"
i18n.t('items', { count: 1 }); // "One item"
i18n.t('items', { count: 5 }); // "5 items"

// Change locale
i18n.setLocale('es');
i18n.t('greeting', { name: 'Mundo' }); // "¡Hola, Mundo!"
```

## Core Concepts

### Translation Keys

Translation keys support dot notation for nested organization:

```typescript
const i18n = createI18n({
  messages: {
    en: {
      'user.profile.title': 'Profile',
      'user.settings.title': 'Settings',
      'admin.dashboard': 'Dashboard',
    },
  },
});

i18n.t('user.profile.title'); // "Profile"
```

### Variable Interpolation

#### Basic Interpolation

```typescript
i18n.t('greeting', { name: 'Alice' });
// Template: "Hello, {name}!"
// Result: "Hello, Alice!"
```

#### Nested Object Access

```typescript
i18n.t('message', { user: { name: 'Bob', role: 'Admin' } });
// Template: "User {user.name} is {user.role}"
// Result: "User Bob is Admin"
```

#### Array Index Access

```typescript
i18n.t('friends', { friends: [{ name: 'Charlie' }, { name: 'Dave' }] });
// Template: "First friend: {friends[0].name}"
// Result: "First friend: Charlie"
```

#### Array Handling

Arrays can be intelligently formatted with various separators:

```typescript
const i18n = createI18n({
  messages: {
    en: {
      shopping: 'Shopping list: {items}',
      guests: 'Invited: {names|and}',
      options: 'Choose: {choices|or}',
      path: 'Path: {folders| / }',
      count: 'You have {items.length} items',
    },
  },
});

// Default comma separator
i18n.t('shopping', { items: ['Apple', 'Banana', 'Orange'] });
// "Shopping list: Apple, Banana, Orange"

// Natural "and" lists (locale-aware via Intl.ListFormat - supports 100+ languages automatically)
i18n.t('guests', { names: ['Alice'] });
// "Invited: Alice"
i18n.t('guests', { names: ['Alice', 'Bob'] });
// "Invited: Alice and Bob"
i18n.t('guests', { names: ['Alice', 'Bob', 'Charlie'] });
// "Invited: Alice, Bob, and Charlie" (Oxford comma in English)

// Natural "or" lists (locale-aware via Intl.ListFormat - supports 100+ languages automatically)
i18n.t('options', { choices: ['Tea', 'Coffee', 'Juice'] });
// "Choose: Tea, Coffee, or Juice"

// Custom separators
i18n.t('path', { folders: ['home', 'user', 'documents'] });
// "Path: home / user / documents"

// Array length
i18n.t('count', { items: ['A', 'B', 'C'] });
// "You have 3 items"
```

**Array Features:**

- `{items}` - Join with comma (`, `)
- `{items|and}` - Natural "and" list with locale-aware conjunction (uses Intl.ListFormat - supports 100+ languages)
- `{items|or}` - Natural "or" list with locale-aware conjunction (uses Intl.ListFormat - supports 100+ languages)
- `{items| - }` - Custom separator (e.g., "A - B - C")
- `{items.length}` - Array length
- `{items[0]}` - Safe index access (returns empty if out of bounds)

**Locale-Aware List Formatting:**  
The `and` and `or` separators use the built-in **Intl.ListFormat API** which automatically handles:

- **100+ languages** - Supports all languages available in the browser/runtime
- **Proper grammar** - Oxford comma, locale-specific punctuation
- **Right-to-left languages** - Arabic, Hebrew, etc.
- **Unicode CLDR standards** - International standard for list formatting
- **No manual configuration** - Zero maintenance required

Examples across languages:

- **English**: "A, B, and C" (with Oxford comma)
- **Spanish**: "A, B y C" (uses "y")
- **French**: "A, B et C" (uses "et")
- **German**: "A, B und C" (uses "und")
- **Japanese**: "A、B、C" (uses Japanese comma)
- **Arabic**: Proper RTL formatting with "و"
- And 90+ more languages automatically!

#### Supported Path Formats

- `{name}` - Simple variable
- `{user.name}` - Nested object property
- `{items[0]}` - Array index (safe - returns empty if out of bounds)
- `{items}` - Array join with default separator
- `{items|and}` - Array join with "and"
- `{items.length}` - Array length
- `{data.items[0].value}` - Mixed notation

**Limitations:**

- Only numeric bracket notation `[0]`, `[123]`
- Quoted keys not supported `["key"]`
- Non-numeric brackets not supported `[key]`

### Missing Variable Handling

Missing variables are automatically replaced with empty strings:

```typescript
const i18n = createI18n({
  messages: { en: { msg: 'Hello, {name}!' } },
});

i18n.t('msg'); // "Hello, !"
i18n.t('msg', { name: 'Alice' }); // "Hello, Alice!"
```

### Pluralization

Support for multiple plural forms based on locale-specific rules:

```typescript
const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      notifications: {
        zero: 'No notifications',
        one: 'One notification',
        other: '{count} notifications',
      },
    },
  },
});

i18n.t('notifications', { count: 0 }); // "No notifications"
i18n.t('notifications', { count: 1 }); // "One notification"
i18n.t('notifications', { count: 5 }); // "5 notifications"
```

#### Supported Plural Rules

i18nit uses the browser's built-in `Intl.PluralRules` API to automatically support pluralization for **100+ languages**, including:

- **English (en)**: one, other
- **French (fr)**: one (0-1), other
- **Arabic (ar)**: zero, one, two, few, many, other
- **Polish (pl)**: one, few, many
- **Russian (ru)**: one, few, many, other
- **German (de)**: one, other
- **Chinese (zh)**: other
- **Japanese (ja)**: other
- And 90+ more languages...

## Advanced Features

### Fallback Locales

Define fallback locales for missing translations:

```typescript
const i18n = createI18n({
  locale: 'de-CH',
  fallback: ['de', 'en'],
  messages: {
    'de-CH': { greeting: 'Grüezi!' },
    de: { greeting: 'Hallo!', goodbye: 'Auf Wiedersehen!' },
    en: { greeting: 'Hello!', goodbye: 'Goodbye!', welcome: 'Welcome!' },
  },
});

i18n.t('greeting'); // "Grüezi!" (de-CH)
i18n.t('goodbye'); // "Auf Wiedersehen!" (de fallback)
i18n.t('welcome'); // "Welcome!" (en fallback)
```

**Fallback Chain:**

1. Primary locale (e.g., `de-CH`)
2. Base language (e.g., `de` from `de-CH`)
3. First fallback locale
4. Base of first fallback
5. Continue through all fallbacks

### Async Locale Loading

Load translations on-demand for better performance:

```typescript
const i18n = createI18n({
  locale: 'en',
  loaders: {
    fr: async () => {
      const response = await fetch('/locales/fr.json');
      return response.json();
    },
    de: async () => import('./locales/de.json'),
  },
});

// Preload at app startup
await i18n.loadAll(['en', 'fr', 'de']);

// Or load explicitly
await i18n.load('fr');
i18n.setLocale('fr');
i18n.t('greeting'); // Now uses French

// Register loader dynamically
i18n.register('es', async () => {
  const module = await import('./locales/es.json');
  return module.default;
});

// Load and use
await i18n.load('es');
i18n.t('greeting', undefined, { locale: 'es' });
```

**Features:**

- Concurrent requests are deduplicated
- Failed loads throw errors (can be caught)
- Locale is cached after loading
- Use `loadAll()` to preload multiple locales at once

### Namespaces

Organize translations by feature or module:

```typescript
const i18n = createI18n({
  messages: {
    en: {
      'auth.login.title': 'Login',
      'auth.login.button': 'Sign In',
      'auth.register.title': 'Register',
      'dashboard.welcome': 'Welcome back!',
    },
  },
});

// Create namespaced translator
const auth = i18n.namespace('auth.login');
auth.t('title'); // "Login"
auth.t('button'); // "Sign In"

const dashboard = i18n.namespace('dashboard');
dashboard.t('welcome'); // "Welcome back!"
```

### HTML Escaping

Protect against XSS attacks with automatic HTML escaping:

```typescript
const i18n = createI18n({
  messages: {
    en: {
      userContent: 'Comment: {content}',
    },
  },
});

// Enable escaping globally
const safeI18n = createI18n({
  escape: true,
  messages: { en: { html: '<script>alert("xss")</script>' } },
});

safeI18n.t('html');
// "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"

// Or per translation
i18n.t('userContent', { content: '<b>Bold</b>' }, { escape: true });
// "Comment: &lt;b&gt;Bold&lt;/b&gt;"
```

### Number & Date Formatting

Locale-aware formatting using the Intl API:

```typescript
const i18n = createI18n({ locale: 'en-US' });

// Number formatting
i18n.number(1234.56); // "1,234.56"
i18n.number(99.99, { style: 'currency', currency: 'USD' }); // "$99.99"
i18n.number(0.15, { style: 'percent' }); // "15%"

// Date formatting
const date = new Date('2024-01-15');
i18n.date(date); // "1/15/2024"
i18n.date(date, { dateStyle: 'long' }); // "January 15, 2024"
i18n.date(date, { timeStyle: 'short' }); // "12:00 AM"

// Timestamps
i18n.date(Date.now(), { dateStyle: 'medium' }); // "Jan 15, 2024"

// Custom locale
i18n.number(1234.56, undefined, 'de-DE'); // "1.234,56"
i18n.date(date, { dateStyle: 'short' }, 'fr'); // "15/01/2024"
```

### Subscriptions

React to locale changes:

```typescript
const i18n = createI18n({ locale: 'en' });

// Subscribe to locale changes
const unsubscribe = i18n.subscribe((locale) => {
  console.log('Locale changed to:', locale);
  // Update UI, reload data, etc.
});

i18n.setLocale('fr'); // Logs: "Locale changed to: fr"

// Unsubscribe when done
unsubscribe();
```

**Use Cases:**

- Update UI when locale changes
- Reload locale-specific data
- Analytics/tracking
- State management integration

### Subscriptions

### createI18n(config?)

Creates a new i18n instance.

```typescript
type I18nConfig = {
  locale?: string; // Default: 'en'
  fallback?: string | string[]; // Fallback locale(s)
  messages?: Record<string, Messages>; // Initial translations
  loaders?: Record<string, () => Promise<Messages>>; // Async loaders
  escape?: boolean; // Global HTML escaping (default: false)
};
```

### Translation Methods

#### `t(key, vars?, options?)`

Translate a key synchronously.

```typescript
i18n.t('greeting'); // Simple
i18n.t('greeting', { name: 'Alice' }); // With variables
i18n.t('greeting', { name: 'Bob' }, { locale: 'fr', escape: true }); // With options
```

**Options:**

- `locale?: string` - Override locale for this translation
- `escape?: boolean` - Override HTML escaping

### Locale Management

```typescript
i18n.setLocale('fr'); // Change locale
i18n.getLocale(); // Get current locale
i18n.hasLocale('es'); // Check if locale exists
i18n.has('key'); // Check if key exists
i18n.has('key', 'fr'); // Check if key exists in locale
await i18n.hasAsync('key', 'es'); // Check with async loading
```

### Message Management

```typescript
// Add messages (merge)
i18n.add('en', { newKey: 'New value' });

// Set messages (replace)
i18n.set('en', { key: 'Value' });

// Get messages for locale
const messages = i18n.getMessages('en');
```

### Async Loading

```typescript
// Register loader
i18n.register('de', async () => import('./locales/de.json'));

// Load locale
await i18n.load('de');
```

### Formatting

```typescript
i18n.number(value, options?, locale?);
i18n.date(value, options?, locale?);
```

### Namespace

```typescript
const ns = i18n.namespace('auth');
ns.t('login.title');
```

### Subscriptions

```typescript
const unsubscribe = i18n.subscribe((locale) => {
  console.log('Locale changed:', locale);
});
```

## Framework Integration

### React

```tsx
import { createI18n } from '@vielzeug/i18nit';
import { createContext, useContext, useState, useEffect } from 'react';

const I18nContext = createContext(null);

export function I18nProvider({ children, config }) {
  const [i18n] = useState(() => createI18n(config));
  const [locale, setLocale] = useState(i18n.getLocale());

  useEffect(() => {
    return i18n.subscribe(setLocale);
  }, [i18n]);

  return <I18nContext.Provider value={{ i18n, locale }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
}

export function useTranslation(namespace?: string) {
  const { i18n } = useI18n();
  const ns = namespace ? i18n.namespace(namespace) : i18n;

  return {
    t: ns.t.bind(ns),
    locale: i18n.getLocale(),
    setLocale: i18n.setLocale.bind(i18n),
  };
}

// Usage
function MyComponent() {
  const { t, locale, setLocale } = useTranslation('dashboard');

  return (
    <div>
      <h1>{t('welcome')}</h1>
      <button onClick={() => setLocale('fr')}>Français</button>
    </div>
  );
}
```

### Vue 3

```typescript
import { createI18n } from '@vielzeug/i18nit';
import { ref, onUnmounted, Plugin } from 'vue';

const i18n = createI18n({ locale: 'en' });
const locale = ref(i18n.getLocale());

const unsubscribe = i18n.subscribe((newLocale) => {
  locale.value = newLocale;
});

export const i18nPlugin: Plugin = {
  install(app) {
    app.config.globalProperties.$t = i18n.t.bind(i18n);
    app.config.globalProperties.$i18n = i18n;

    app.provide('i18n', i18n);
    app.provide('locale', locale);
  },
};

// Composable
export function useI18n() {
  return {
    t: i18n.t.bind(i18n),
    locale,
    setLocale: (newLocale: string) => i18n.setLocale(newLocale),
  };
}

// Usage in component
<script setup>
import { useI18n } from './i18n';

const { t, locale, setLocale } = useI18n();
</script>

<template>
  <div>
    <h1>{{ t('welcome') }}</h1>
    <button @click="setLocale('fr')">Français</button>
  </div>
</template>
```

### Svelte

```typescript
import { createI18n } from '@vielzeug/i18nit';
import { writable } from 'svelte/store';

const i18n = createI18n({ locale: 'en' });
export const locale = writable(i18n.getLocale());

i18n.subscribe((newLocale) => {
  locale.set(newLocale);
});

export const t = i18n.t.bind(i18n);
export const setLocale = i18n.setLocale.bind(i18n);

// Usage
<script>
  import { t, setLocale } from './i18n';
</script>

<h1>{$t('welcome')}</h1>
<button on:click={() => setLocale('fr')}>Français</button>
```

## Best Practices

### 1. Organize Translations by Feature

```typescript
const messages = {
  en: {
    'auth.login.title': 'Login',
    'auth.register.title': 'Register',
    'dashboard.stats.users': 'Users',
    'dashboard.stats.revenue': 'Revenue',
  },
};
```

### 2. Use Namespaces for Large Apps

```typescript
const authTranslations = i18n.namespace('auth');
const dashboardTranslations = i18n.namespace('dashboard');
```

### 3. Lazy Load Translations

```typescript
const i18n = createI18n({
  loaders: {
    'en-US': () => import('./locales/en-US.json'),
    'es-ES': () => import('./locales/es-ES.json'),
  },
});
```

### 4. Type-Safe Translation Keys

```typescript
type TranslationKeys = 'auth.login.title' | 'auth.register.title' | 'dashboard.welcome';

function t(key: TranslationKeys, vars?: Record<string, unknown>) {
  return i18n.t(key, vars);
}
```

## TypeScript Support

Full TypeScript support with type inference:

```typescript
import { createI18n, type Messages, type I18nConfig } from '@vielzeug/i18nit';

// Define your messages type
interface MyMessages extends Messages {
  greeting: string;
  items: {
    zero: string;
    one: string;
    other: string;
  };
}

const config: I18nConfig = {
  locale: 'en',
  messages: {
    en: {
      greeting: 'Hello!',
      items: { zero: 'No items', one: 'One item', other: '{count} items' },
    } satisfies MyMessages,
  },
};

const i18n = createI18n(config);
```

## Comparison

| Feature            | i18nit           | i18next     | react-intl    |
| ------------------ | ---------------- | ----------- | ------------- |
| Bundle Size        | **~1.6 KB**      | ~12KB       | ~15KB         |
| Dependencies       | **0**            | 2+          | 10+           |
| TypeScript         | ✅ First-class   | ✅ Good     | ✅ Good       |
| Pluralization      | ✅ Built-in      | ✅ Plugin   | ✅ Built-in   |
| Async Loading      | ✅ Built-in      | ✅ Built-in | ⚠️ Manual     |
| Path Interpolation | ✅ `{user.name}` | ❌          | ❌            |
| HTML Escaping      | ✅ Built-in      | ⚠️ Manual   | ✅ Built-in   |
| Framework Agnostic | ✅               | ✅          | ❌ React only |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu)

## Links

- [GitHub Repository](https://github.com/helmuthdu/vielzeug)
- [Documentation](https://vielzeug.dev)
- [NPM Package](https://www.npmjs.com/package/@vielzeug/i18nit)
- [Issue Tracker](https://github.com/helmuthdu/vielzeug/issues)

---

Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) ecosystem - A collection of type-safe utilities for modern web development.
