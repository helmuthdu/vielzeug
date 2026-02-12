# i18nit API Reference

Complete API documentation for i18nit.

## Table of Contents

[[toc]]

## Types

### Locale

```ts
type Locale = string;
```

A string representing a locale identifier (e.g., `'en'`, `'es'`, `'fr-FR'`).

### PluralForm

```ts
type PluralForm = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
```

Plural category used for pluralization rules. These categories are determined automatically using the `Intl.PluralRules` API, which supports 100+ languages with proper plural rules from the [Unicode CLDR](https://cldr.unicode.org/).

**Plural categories by language:**

- **Simple (one/other)**: English, German, Spanish, etc.
- **Complex (zero/one/two/few/many/other)**: Arabic
- **Complex (one/few/many)**: Russian, Polish, Czech
- **No plurals (other only)**: Chinese, Japanese, Korean

### PluralMessages

```ts
type PluralMessages = Partial<Record<PluralForm, string>> & { other: string };
```

Object defining plural forms for a message. The `other` form is required.

**Example:**

```ts
const messages = {
  items: {
    zero: 'No items',
    one: 'One item',
    other: '{count} items',
  },
};
```

### MessageFunction

```ts
type MessageFunction = (
  vars: Record<string, unknown>,
  helpers: {
    number: (value: number, options?: Intl.NumberFormatOptions) => string;
    date: (value: Date | number, options?: Intl.DateTimeFormatOptions) => string;
  },
) => string;
```

A function that returns a dynamic translation string.

**Example:**

```ts
const messages = {
  timestamp: (vars, helpers) => {
    const date = vars.date as Date;
    return `Updated: ${helpers.date(date, { dateStyle: 'short' })}`;
  },
};
```

### MessageValue

```ts
type MessageValue = string | PluralMessages | MessageFunction;
```

A translation can be a string, plural messages object, or a function.

### Messages

```ts
type Messages = Record<string, MessageValue>;
```

Collection of translations for a locale.

## Errors

### MissingVariableError

```ts
class MissingVariableError extends Error {
  readonly key: string;
  readonly variable: string;
  readonly locale: Locale;
}
```

Error thrown when `missingVar: 'error'` is configured and a required variable is missing during interpolation.

**Properties:**

- `key` - The translation key being processed
- `variable` - The name of the missing variable
- `locale` - The locale being used
- `message` - Formatted error message with all context

**Example:**

```ts
import { createI18n, MissingVariableError } from '@vielzeug/i18nit';

const i18n = createI18n({
  messages: { en: { greeting: 'Hello, {name}!' } },
  missingVar: 'error',
});

try {
  i18n.t('greeting');
} catch (error) {
  if (error instanceof MissingVariableError) {
    console.log(error.key); // 'greeting'
    console.log(error.variable); // 'name'
    console.log(error.locale); // 'en'
    console.log(error.message);
    // "Missing variable 'name' for key 'greeting' in locale 'en'"
  }
}
```

### TranslateParams

```ts
type TranslateParams = {
  locale?: Locale;
  fallback?: string;
  escape?: boolean;
};
```

Options for translation methods.

- **locale**: Override the current locale for this translation
- **fallback**: Custom fallback string if translation not found
- **escape**: Enable/disable HTML escaping for this translation

### I18nConfig

```ts
type I18nConfig = {
  locale?: Locale;
  fallback?: Locale | Locale[];
  messages?: Record<Locale, Messages>;
  loaders?: Record<Locale, () => Promise<Messages>>;
  escape?: boolean;
  missingKey?: (key: string, locale: Locale) => string;
  missingVar?: 'preserve' | 'empty' | 'error';
};
```

Configuration object for creating an i18n instance.

## createI18n()

Create a new i18n instance.

### Signature

```ts
function createI18n(config?: I18nConfig): I18n;
```

### Parameters

- **config** (`I18nConfig`, optional): Configuration object

### Returns

- **I18n**: A new i18n instance

### Example

```ts
import { createI18n } from '@vielzeug/i18nit';

const i18n = createI18n({
  locale: 'en',
  fallback: 'en',
  messages: {
    en: {
      greeting: 'Hello!',
    },
    es: {
      greeting: '¡Hola!',
    },
  },
  escape: false,
  missingKey: (key) => `[${key}]`,
  missingVar: 'empty',
});
```

## I18n Instance

### Translation Methods

#### t()

Translate a message key with optional variables and options.

```ts
t(key: string, vars?: Record<string, unknown>, options?: TranslateParams): string
```

**Parameters:**

- **key**: Translation key (supports dot notation)
- **vars**: Variables for interpolation
- **options**: Translation options

**Returns:** Translated string

**Example:**

```ts
i18n.t('greeting'); // "Hello!"
i18n.t('welcome', { name: 'Alice' }); // "Welcome, Alice!"
i18n.t('hello', undefined, { locale: 'es' }); // "¡Hola!"
i18n.t('user.name'); // "Name"
```

**Notes:**

- Use `undefined` for vars if you only want to pass options
- Supports nested keys with dot notation
- Variables are interpolated using `{varName}` syntax
- Numbers are automatically formatted based on locale

---

#### tl()

Translate with automatic async loading (if loader registered).

```ts
async tl(key: string, vars?: Record<string, unknown>, options?: TranslateParams): Promise<string>
```

**Parameters:**

- **key**: Translation key
- **vars**: Variables for interpolation
- **options**: Translation options

**Returns:** Promise resolving to translated string

**Example:**

```ts
// Automatically loads Spanish if not yet loaded
await i18n.tl('greeting', undefined, { locale: 'es' });

// With variables
await i18n.tl('welcome', { name: 'Bob' }, { locale: 'fr' });
```

---

### Locale Management

#### getLocale()

Get the current locale.

```ts
getLocale(): Locale
```

**Returns:** Current locale string

**Example:**

```ts
const currentLocale = i18n.getLocale(); // "en"
```

---

#### setLocale()

Set the current locale and notify subscribers.

```ts
setLocale(locale: Locale): void
```

**Parameters:**

- **locale**: Locale to set

**Example:**

```ts
i18n.setLocale('es');
i18n.setLocale('fr-FR');
```

**Notes:**

- Triggers subscriber callbacks
- Does nothing if locale is already set

---

### Message Management

#### add()

Add messages to a locale (merges with existing).

```ts
add(locale: Locale, messages: Messages): void
```

**Parameters:**

- **locale**: Target locale
- **messages**: Messages to add

**Example:**

```ts
i18n.add('en', {
  newKey: 'New translation',
  another: 'Another one',
});

// Merges with existing messages
```

---

#### set()

Replace all messages for a locale.

```ts
set(locale: Locale, messages: Messages): void
```

**Parameters:**

- **locale**: Target locale
- **messages**: Messages to set

**Example:**

```ts
i18n.set('en', {
  greeting: 'Hello!',
  // All previous messages are replaced
});
```

---

#### getMessages()

Get all messages for a locale.

```ts
getMessages(locale: Locale): Messages | undefined
```

**Parameters:**

- **locale**: Target locale

**Returns:** Messages object or undefined if locale not found

**Example:**

```ts
const messages = i18n.getMessages('en');
console.log(messages); // { greeting: 'Hello!', ... }
```

---

#### hasLocale()

Check if a locale is loaded.

```ts
hasLocale(locale: Locale): boolean
```

**Parameters:**

- **locale**: Locale to check

**Returns:** True if locale exists

**Example:**

```ts
if (i18n.hasLocale('es')) {
  console.log('Spanish is loaded');
}
```

---

#### has()

Check if a translation key exists.

```ts
has(key: string, locale?: Locale): boolean
```

**Parameters:**

- **key**: Translation key
- **locale**: Locale to check (uses current if not provided)

**Returns:** True if key exists

**Example:**

```ts
if (i18n.has('greeting')) {
  console.log('Greeting exists');
}

if (i18n.has('greeting', 'es')) {
  console.log('Spanish greeting exists');
}
```

---

### Async Loading

#### register()

Register a loader function for a locale.

```ts
register(locale: Locale, loader: () => Promise<Messages>): void
```

**Parameters:**

- **locale**: Target locale
- **loader**: Async function that returns messages

**Example:**

```ts
i18n.register('es', async () => {
  const response = await fetch('/locales/es.json');
  return response.json();
});

// Or with dynamic import
i18n.register('fr', () => import('./locales/fr.json'));
```

---

#### load()

Load translations for a locale.

```ts
async load(locale: Locale): Promise<void>
```

**Parameters:**

- **locale**: Locale to load

**Returns:** Promise that resolves when loaded

**Example:**

```ts
await i18n.load('es');
console.log('Spanish loaded');

// Load multiple
await Promise.all([i18n.load('es'), i18n.load('fr')]);
```

**Notes:**

- Does nothing if locale already loaded
- Caches loading promise to prevent duplicate requests
- Calls `add()` internally to merge loaded messages

---

#### hasAsync()

Check if a key exists, loading locale if needed.

```ts
async hasAsync(key: string, locale?: Locale): Promise<boolean>
```

**Parameters:**

- **key**: Translation key
- **locale**: Locale to check (uses current if not provided)

**Returns:** Promise resolving to true if key exists

**Example:**

```ts
if (await i18n.hasAsync('greeting', 'es')) {
  console.log('Spanish greeting exists');
}
```

---

### Formatting Helpers

#### number()

Format a number with locale-specific formatting.

```ts
number(value: number, options?: Intl.NumberFormatOptions, locale?: Locale): string
```

**Parameters:**

- **value**: Number to format
- **options**: Intl.NumberFormat options
- **locale**: Locale to use (uses current if not provided)

**Returns:** Formatted number string

**Example:**

```ts
i18n.number(1234.56); // "1,234.56" (en-US)
i18n.number(1234.56, { style: 'currency', currency: 'USD' }); // "$1,234.56"
i18n.number(0.856, { style: 'percent' }); // "85.6%"
i18n.number(1234.56, undefined, 'de'); // "1.234,56"
```

---

#### date()

Format a date with locale-specific formatting.

```ts
date(value: Date | number, options?: Intl.DateTimeFormatOptions, locale?: Locale): string
```

**Parameters:**

- **value**: Date object or timestamp
- **options**: Intl.DateTimeFormat options
- **locale**: Locale to use (uses current if not provided)

**Returns:** Formatted date string

**Example:**

```ts
const date = new Date('2024-01-15');

i18n.date(date); // "1/15/2024" (en-US)
i18n.date(date, { dateStyle: 'long' }); // "January 15, 2024"
i18n.date(date, { dateStyle: 'full', timeStyle: 'short' });
// "Monday, January 15, 2024 at 12:00 AM"

// With timestamp
i18n.date(Date.now(), { dateStyle: 'medium' });
```

---

### Namespaces

#### namespace()

Create a namespaced translator.

```ts
namespace(ns: string): {
  t: (key: string, vars?: Record<string, unknown>, options?: TranslateParams) => string;
  tl: (key: string, vars?: Record<string, unknown>, options?: TranslateParams) => Promise<string>;
}
```

**Parameters:**

- **ns**: Namespace prefix

**Returns:** Object with `t` and `tl` methods

**Example:**

```ts
const errors = i18n.namespace('errors');
const user = i18n.namespace('user');

errors.t('required'); // Same as i18n.t('errors.required')
user.t('profile.name'); // Same as i18n.t('user.profile.name')

// With async loading
await errors.tl('validation', undefined, { locale: 'es' });
```

---

### Subscriptions

#### subscribe()

Subscribe to locale changes.

```ts
subscribe(handler: (locale: Locale) => void): () => void
```

**Parameters:**

- **handler**: Callback function called when locale changes

**Returns:** Unsubscribe function

**Example:**

```ts
const unsubscribe = i18n.subscribe((locale) => {
  console.log('Locale changed to:', locale);
  // Update UI, trigger re-renders, etc.
});

// Later...
unsubscribe();
```

**Notes:**

- Handler is called immediately upon subscription
- Handler errors are caught and ignored
- Multiple subscribers are supported

## Configuration

### locale

```ts
locale?: Locale
```

**Default:** `'en'`

Initial locale for the instance.

**Example:**

```ts
createI18n({ locale: 'es' });
```

---

### fallback

```ts
fallback?: Locale | Locale[]
```

**Default:** `[]`

Fallback locale(s) used when translation not found.

**Example:**

```ts
// Single fallback
createI18n({ locale: 'en-US', fallback: 'en' });

// Multiple fallbacks
createI18n({ locale: 'pt-BR', fallback: ['pt', 'es', 'en'] });
```

**Fallback chain example:**

```ts
// locale: 'en-US', fallback: ['en', 'es']
// Chain: en-US → en → es
```

---

### messages

```ts
messages?: Record<Locale, Messages>
```

**Default:** `{}`

Initial translation messages.

**Example:**

```ts
createI18n({
  messages: {
    en: {
      greeting: 'Hello!',
      user: {
        name: 'Name',
      },
    },
    es: {
      greeting: '¡Hola!',
      user: {
        name: 'Nombre',
      },
    },
  },
});
```

---

### loaders

```ts
loaders?: Record<Locale, () => Promise<Messages>>
```

**Default:** `{}`

Async loader functions for lazy-loading translations.

**Example:**

```ts
createI18n({
  loaders: {
    es: async () => {
      const response = await fetch('/locales/es.json');
      return response.json();
    },
    fr: () => import('./locales/fr.json'),
  },
});
```

---

### escape

```ts
escape?: boolean
```

**Default:** `false`

Enable HTML escaping globally.

**Example:**

```ts
createI18n({ escape: true });

// Can be overridden per translation
i18n.t('key', { html: '<b>bold</b>' }, { escape: false });
```

---

### missingKey

```ts
missingKey?: (key: string, locale: Locale) => string
```

**Default:** `(key) => key`

Custom handler for missing translation keys.

**Example:**

```ts
createI18n({
  missingKey: (key, locale) => {
    console.warn(`Missing: ${key} (${locale})`);
    return `[${key}]`;
  },
});
```

---

### missingVar

```ts
missingVar?: 'preserve' | 'empty' | 'error'
```

**Default:** `'empty'`

Strategy for handling missing variables in interpolation.

- **`'preserve'`**: Keep the placeholder (e.g., `{name}`)
- **`'empty'`**: Replace with empty string
- **`'error'`**: Throw `MissingVariableError` with structured information

**Example:**

```ts
// Preserve placeholders
createI18n({
  missingVar: 'preserve',
  messages: { en: { greeting: 'Hello, {name}!' } },
});
i18n.t('greeting'); // "Hello, {name}!"

// Empty string (default)
createI18n({
  missingVar: 'empty',
  messages: { en: { greeting: 'Hello, {name}!' } },
});
i18n.t('greeting'); // "Hello, !"

// Throw structured error
import { MissingVariableError } from '@vielzeug/i18nit';

createI18n({
  missingVar: 'error',
  messages: { en: { greeting: 'Hello, {name}!' } },
});

try {
  i18n.t('greeting');
} catch (error) {
  if (error instanceof MissingVariableError) {
    console.log(error.key); // 'greeting'
    console.log(error.variable); // 'name'
    console.log(error.locale); // 'en'
  }
}
```

::: tip Error Tracking
When using `missingVar: 'error'`, you can catch `MissingVariableError` specifically and send structured error data to your error tracking service (Sentry, Bugsnag, etc.).
:::
i18n.t('Hello, {name}!'); // "Hello, {name}!"

// Empty (default)
createI18n({ missingVar: 'empty' });
i18n.t('Hello, {name}!'); // "Hello, !"

// Error
createI18n({ missingVar: 'error' });
i18n.t('Hello, {name}!'); // throws Error: Missing variable: name

````

## Message Types

### String Messages

Simple string translations.

```ts
const messages = {
  greeting: 'Hello!',
  welcome: 'Welcome to our app',
};
````

---

### String with Variables

Strings with interpolation using `{varName}` syntax.

```ts
const messages = {
  greeting: 'Hello, {name}!',
  info: 'You have {count} new messages',
};

i18n.t('greeting', { name: 'Alice' }); // "Hello, Alice!"
i18n.t('info', { count: 5 }); // "You have 5 new messages"
```

**Nested variables:**

```ts
const messages = {
  userInfo: 'User: {user.name} ({user.email})',
};

i18n.t('userInfo', { user: { name: 'Bob', email: 'bob@example.com' } });
// "User: Bob (bob@example.com)"
```

**Array variables:**

```ts
const messages = {
  list: 'Items: {items[0]}, {items[1]}',
};

i18n.t('list', { items: ['apple', 'banana'] });
// "Items: apple, banana"
```

---

### Plural Messages

Object with plural forms based on language rules.

```ts
const messages = {
  items: {
    zero: 'No items',
    one: 'One item',
    other: '{count} items',
  },
};

i18n.t('items', { count: 0 }); // "No items"
i18n.t('items', { count: 1 }); // "One item"
i18n.t('items', { count: 5 }); // "5 items"
```

**Required forms by language:**

- **English**: `one`, `other`
- **French**: `one` (0-1), `other`
- **Arabic**: `zero`, `one`, `two`, `few`, `many`, `other`
- **Russian**: `one`, `few`, `many`, `other`
- **Polish**: `one`, `few`, `many`

---

### Function Messages

Dynamic messages with custom logic.

```ts
const messages = {
  greeting: (vars) => {
    const hour = new Date().getHours();
    const name = vars.name as string;
    if (hour < 12) return `Good morning, ${name}!`;
    if (hour < 18) return `Good afternoon, ${name}!`;
    return `Good evening, ${name}!`;
  },

  price: (vars, helpers) => {
    const amount = vars.amount as number;
    return helpers.number(amount, { style: 'currency', currency: 'USD' });
  },

  timestamp: (vars, helpers) => {
    const date = vars.date as Date;
    return `Posted ${helpers.date(date, { dateStyle: 'medium' })}`;
  },
};

i18n.t('greeting', { name: 'Alice' }); // "Good morning, Alice!"
i18n.t('price', { amount: 99.99 }); // "$99.99"
i18n.t('timestamp', { date: new Date() }); // "Posted Feb 9, 2026"
```

## Best Practices

### 1. Type Safety

```ts
// Define message keys as types
type MessageKeys = 'greeting' | 'farewell';

// Use with TypeScript
const i18n = createI18n<Record<MessageKeys, string>>({
  messages: {
    en: {
      greeting: 'Hello',
      farewell: 'Goodbye',
    },
  },
});
```

### 2. Organize by Feature

```ts
const messages = {
  en: {
    auth: { ... },
    user: { ... },
    products: { ... },
  },
};
```

### 3. Use Namespaces

```ts
const auth = i18n.namespace('auth');
const user = i18n.namespace('user');

auth.t('login');
user.t('profile.name');
```

### 4. Lazy Load Translations

```ts
createI18n({
  loaders: {
    es: () => import('./locales/es.json'),
    fr: () => import('./locales/fr.json'),
  },
});
```

### 5. Handle Missing Keys

```ts
createI18n({
  missingKey: (key, locale) => {
    console.warn(`Missing: ${key} (${locale})`);
    return key.split('.').pop() || key;
  },
});
```

---

For complete usage examples, see [Usage Guide](./usage.md) and [Examples](./examples.md).
