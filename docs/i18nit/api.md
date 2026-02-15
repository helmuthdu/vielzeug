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
### TranslateOptions

```ts
type TranslateOptions = {
  locale?: Locale;
  escape?: boolean;
};
```

Options for translation methods.

- **locale**: Override the current locale for this translation
- **escape**: Enable/disable HTML escaping for this translation

### I18nConfig

```ts
type I18nConfig = {
  locale?: Locale;
  fallback?: Locale | Locale[];
  messages?: Record<Locale, Messages>;
  loaders?: Record<Locale, () => Promise<Messages>>;
  escape?: boolean;
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

**Returns:** Object with `t` method

**Example:**

```ts
const errors = i18n.namespace('errors');
const user = i18n.namespace('user');

errors.t('required'); // Same as i18n.t('errors.required')
user.t('profile.name'); // Same as i18n.t('user.profile.name')

// With locale override
errors.t('validation', undefined, { locale: 'es' });
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
  first: 'First: {items[0]}',
  outOfBounds: 'Tenth: {items[10]}', // Safe - returns empty if out of bounds
};

i18n.t('first', { items: ['apple', 'banana'] });
// "First: apple"

i18n.t('outOfBounds', { items: ['apple'] });
// "Tenth: " (empty, no error)
```

**Array joining:**

```ts
const messages = {
  // Default comma separator
  shopping: 'Shopping list: {items}',

  // Natural "and" list
  guests: 'Invited: {names|and}',

  // Natural "or" list
  options: 'Choose: {choices|or}',

  // Custom separator
  path: 'Path: {folders| / }',

  // Array length
  count: 'You have {items.length} items',

  // Combined features
  summary: 'First: {items[0]}, Total: {items.length}, All: {items|and}',
};

// Default comma
i18n.t('shopping', { items: ['Apple', 'Banana', 'Orange'] });
// "Shopping list: Apple, Banana, Orange"

// "and" separator
i18n.t('guests', { names: ['Alice', 'Bob', 'Charlie'] });
// "Invited: Alice, Bob and Charlie"

// "or" separator
i18n.t('options', { choices: ['Tea', 'Coffee', 'Juice'] });
// "Choose: Tea, Coffee or Juice"

// Custom separator
i18n.t('path', { folders: ['home', 'user', 'documents'] });
// "Path: home / user / documents"

// Array length
i18n.t('count', { items: ['A', 'B', 'C'] });
// "You have 3 items"

// Combined
i18n.t('summary', { items: ['Apple', 'Banana', 'Orange'] });
// "First: Apple, Total: 3, All: Apple, Banana and Orange"
```

**Array handling summary:**

| Syntax              | Description                                             | Example Output            |
| ------------------- | ------------------------------------------------------- | ------------------------- |
| `{items}`           | Default join (`, `)                                     | `"A, B, C"`               |
| `{items\|and}`      | Locale-aware "and" via Intl.ListFormat (100+ languages) | `"A, B, and C"` (English) |
| `{items\|or}`       | Locale-aware "or" via Intl.ListFormat (100+ languages)  | `"A, B, or C"` (English)  |
| `{items\| - }`      | Custom separator                                        | `"A - B - C"`             |
| `{items.length}`    | Array length                                            | `"3"`                     |
| `{items[0]}`        | Safe index (empty if bounds)                            | `"A"` or `""`             |
| `{items[0].name}`   | Nested array access                                     | Accesses nested object    |
| `{user.items}`      | Nested array join                                       | `"A, B, C"`               |
| `{user.items\|and}` | Nested array with separator                             | `"A, B, and C"` (English) |

**Intl.ListFormat - Automatic Language Support:**

The `and` and `or` separators use the browser/runtime's built-in **Intl.ListFormat API** which automatically handles list formatting for **100+ languages** with:

- ✅ **Automatic conjunctions** - Correct "and"/"or" word for each language
- ✅ **Proper grammar** - Oxford comma, locale-specific punctuation
- ✅ **Unicode CLDR standards** - International standard for list formatting
- ✅ **Right-to-left languages** - Arabic, Hebrew, etc.
- ✅ **Zero maintenance** - No manual language configuration required

**Examples across languages:**

| Language   | Locale | "and" Example                | "or" Example                |
| ---------- | ------ | ---------------------------- | --------------------------- |
| English    | en     | "A, B, and C" (Oxford comma) | "A, B, or C" (Oxford comma) |
| Spanish    | es     | "A, B y C"                   | "A, B o C"                  |
| French     | fr     | "A, B et C"                  | "A, B ou C"                 |
| German     | de     | "A, B und C"                 | "A, B oder C"               |
| Italian    | it     | "A, B e C"                   | "A, B o C"                  |
| Portuguese | pt     | "A, B e C"                   | "A, B ou C"                 |
| Russian    | ru     | "A, B и C"                   | "A, B или C"                |
| Japanese   | ja     | "A、B、C" (Japanese comma)   | "A、B、または C"            |
| Chinese    | zh     | "A、B和C"                    | "A、B或C"                   |
| Arabic     | ar     | Proper RTL with "و"          | Proper RTL with "أو"        |

And **90+ more languages** automatically supported!

**Browser Support:**

- Chrome 72+ (2019)
- Firefox 78+ (2020)
- Safari 14.1+ (2021)
- Edge 79+ (2020)
- Node.js 12+ (2019)

For older environments, gracefully falls back to English formatting.

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
// Preload at app startup
await i18n.loadAll(['en', 'es', 'fr']);

// Or configure loaders and load on-demand
createI18n({
  loaders: {
    es: () => import('./locales/es.json'),
    fr: () => import('./locales/fr.json'),
  },
});

// Load when needed
await i18n.load('es');
```

---

For complete usage examples, see [Usage Guide](./usage.md) and [Examples](./examples.md).
