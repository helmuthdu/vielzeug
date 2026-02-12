# i18nit Usage Guide

Complete guide to installing and using i18nit in your projects.

::: tip 💡 API Reference
This guide covers API usage and basic patterns. For complete application examples, see [Examples](./examples.md).
:::

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/i18nit
```

```sh [npm]
npm install @vielzeug/i18nit
```

```sh [yarn]
yarn add @vielzeug/i18nit
```

:::

## Import

```ts
import { createI18n } from '@vielzeug/i18nit';

// Optional: Import types and errors
import type { I18n, I18nConfig, Messages, TranslateParams, MessageValue, PluralMessages } from '@vielzeug/i18nit';

import { MissingVariableError } from '@vielzeug/i18nit';
```

## Table of Contents

[[toc]]

## Basic Usage

### Creating an i18n Instance

```ts
import { createI18n } from '@vielzeug/i18nit';

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      greeting: 'Hello!',
      farewell: 'Goodbye!',
    },
    es: {
      greeting: '¡Hola!',
      farewell: '¡Adiós!',
    },
  },
});
```

### Basic Translation

```ts
// Simple translation
i18n.t('greeting'); // "Hello!"

// Change locale
i18n.setLocale('es');
i18n.t('greeting'); // "¡Hola!"

// Get current locale
const currentLocale = i18n.getLocale(); // "es"
```

### Using Specific Locale

```ts
// Override locale for single translation
i18n.t('greeting', undefined, { locale: 'es' }); // "¡Hola!"

// Current locale unchanged
i18n.getLocale(); // Still "en"
```

### Fallback Translations

```ts
const i18n = createI18n({
  locale: 'en-US',
  fallback: 'en', // or ['en', 'es'] for multiple fallbacks
  messages: {
    en: {
      greeting: 'Hello!',
      settings: 'Settings',
    },
    'en-US': {
      greeting: 'Howdy!',
    },
  },
});

// Found in en-US
i18n.t('greeting'); // "Howdy!"

// Falls back to en
i18n.t('settings'); // "Settings"

// Fallback chain: en-US → en → (base language)
```

### Nested Keys

```ts
const i18n = createI18n({
  messages: {
    en: {
      user: {
        profile: {
          name: 'Name',
          email: 'Email Address',
        },
        settings: {
          privacy: 'Privacy',
          security: 'Security',
        },
      },
    },
  },
});

// Access with dot notation
i18n.t('user.profile.name'); // "Name"
i18n.t('user.settings.privacy'); // "Privacy"
```

### Literal Keys with Dots

```ts
// Keys can contain dots as literals
const i18n = createI18n({
  messages: {
    en: {
      'errors.404': 'Page not found',
      'errors.500': 'Server error',
    },
  },
});

i18n.t('errors.404'); // "Page not found"
```

## Pluralization

### Basic Plural Forms

```ts
const i18n = createI18n({
  messages: {
    en: {
      items: {
        one: 'One item',
        other: '{count} items',
      },
    },
  },
});

i18n.t('items', { count: 1 }); // "One item"
i18n.t('items', { count: 5 }); // "5 items"
i18n.t('items', { count: 0 }); // "0 items"
```

### Zero Form

```ts
const i18n = createI18n({
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
i18n.t('notifications', { count: 10 }); // "10 notifications"
```

### Complex Plural Rules

i18nit automatically handles plural rules for **100+ languages** using the built-in `Intl.PluralRules` API. Different languages have different plural categories and rules:

::: tip Automatic Language Support
No configuration needed! i18nit uses the [Unicode CLDR](https://cldr.unicode.org/) plural rules via `Intl.PluralRules`, supporting all major languages including complex ones like Arabic, Russian, and Polish.
:::

#### French (0-1 is "one", rest is "other")

```ts
const i18n = createI18n({
  locale: 'fr',
  messages: {
    fr: {
      items: {
        one: 'Un article', // Used for 0 and 1
        other: '{count} articles',
      },
    },
  },
});

i18n.t('items', { count: 0 }); // "Un article"
i18n.t('items', { count: 1 }); // "Un article"
i18n.t('items', { count: 2 }); // "2 articles"
```

#### Russian (one/few/many/other)

```ts
const i18n = createI18n({
  locale: 'ru',
  messages: {
    ru: {
      items: {
        one: '{count} предмет', // 1, 21, 31, ...
        few: '{count} предмета', // 2-4, 22-24, ...
        many: '{count} предметов', // 0, 5-20, 25-30, ...
        other: '{count} предметов',
      },
    },
  },
});

i18n.t('items', { count: 1 }); // "1 предмет"
i18n.t('items', { count: 2 }); // "2 предмета"
i18n.t('items', { count: 5 }); // "5 предметов"
i18n.t('items', { count: 21 }); // "21 предмет"
```

#### Arabic (zero/one/two/few/many/other)

```ts
const i18n = createI18n({
  locale: 'ar',
  messages: {
    ar: {
      items: {
        zero: 'لا عناصر',
        one: 'عنصر واحد',
        two: 'عنصران',
        few: 'عدة عناصر', // 3-10
        many: 'عناصر كثيرة', // 11-99
        other: 'عناصر',
      },
    },
  },
});

i18n.t('items', { count: 0 }); // "لا عناصر"
i18n.t('items', { count: 1 }); // "عنصر واحد"
i18n.t('items', { count: 2 }); // "عنصران"
i18n.t('items', { count: 5 }); // "عدة عناصر"
i18n.t('items', { count: 15 }); // "عناصر كثيرة"
i18n.t('items', { count: 100 }); // "لا عناصر"
```

### Supported Languages

i18nit automatically handles plural rules for **100+ languages** using the `Intl.PluralRules` API, including:

**Simple (one/other):**

- English (en), German (de), Spanish (es), Italian (it), Portuguese (pt), Dutch (nl), Swedish (sv), Norwegian (no), Danish (da), Finnish (fi)

**Complex (multiple forms):**

- **French (fr)**: one (0-1), other
- **Arabic (ar)**: zero, one, two, few, many, other
- **Russian (ru)**: one, few, many, other
- **Polish (pl)**: one, few, many
- **Czech (cs)**: one, few, many
- **Croatian (hr)**: one, few, other
- **Ukrainian (uk)**: one, few, many

**No plural forms:**

- Chinese (zh), Japanese (ja), Korean (ko), Vietnamese (vi), Thai (th), Turkish (tr)

**And many more!** All languages supported by JavaScript's `Intl.PluralRules` are automatically supported.

::: tip Browser Compatibility
`Intl.PluralRules` is supported in Chrome 63+, Firefox 58+, Safari 13+, and Node.js 10+. For older environments, i18nit gracefully falls back to English-like behavior (one/other).
:::

## Variable Interpolation

### Simple Variables

```ts
const i18n = createI18n({
  messages: {
    en: {
      greeting: 'Hello, {name}!',
      welcome: 'Welcome, {firstName} {lastName}!',
    },
  },
});

i18n.t('greeting', { name: 'Alice' });
// "Hello, Alice!"

i18n.t('welcome', { firstName: 'John', lastName: 'Doe' });
// "Welcome, John Doe!"
```

### Nested Object Variables

```ts
const i18n = createI18n({
  messages: {
    en: {
      userInfo: 'User: {user.name} ({user.email})',
      address: 'Address: {user.address.street}, {user.address.city}',
    },
  },
});

i18n.t('userInfo', {
  user: {
    name: 'Alice',
    email: 'alice@example.com',
  },
});
// "User: Alice (alice@example.com)"

i18n.t('address', {
  user: {
    address: {
      street: '123 Main St',
      city: 'Boston',
    },
  },
});
// "Address: 123 Main St, Boston"
```

### Array Variables

#### Array Index Access (Safe)

```ts
const i18n = createI18n({
  messages: {
    en: {
      firstItem: 'First: {items[0]}',
      thirdItem: 'Third: {items[2]}',
      outOfBounds: 'Tenth: {items[10]}',
    },
  },
});

i18n.t('firstItem', { items: ['Apple', 'Banana', 'Orange'] });
// "First: Apple"

i18n.t('thirdItem', { items: ['Apple', 'Banana', 'Orange'] });
// "Third: Orange"

// Safe - returns empty string for out-of-bounds
i18n.t('outOfBounds', { items: ['Apple'] });
// "Tenth: "
```

#### Array Joining (Default Separator)

Arrays can be automatically joined with a comma and space:

```ts
const i18n = createI18n({
  messages: {
    en: {
      shopping: 'Shopping list: {items}',
      tags: 'Tags: {tags}',
    },
  },
});

i18n.t('shopping', { items: ['Apple', 'Banana', 'Orange'] });
// "Shopping list: Apple, Banana, Orange"

i18n.t('tags', { tags: ['typescript', 'javascript', 'node'] });
// "Tags: typescript, javascript, node"

// Works with any array length
i18n.t('shopping', { items: [] });
// "Shopping list: "

i18n.t('shopping', { items: ['Apple'] });
// "Shopping list: Apple"
```

#### Array with "and" Separator

Use `{array|and}` for natural language lists with **automatic locale-aware formatting via Intl.ListFormat**:

```ts
const i18n = createI18n({
  locale: 'en',
  messages: {
    en: { guests: 'Invited: {names|and}' },
    es: { guests: 'Invitados: {names|and}' },
    fr: { guests: 'Invités: {names|and}' },
    de: { guests: 'Gäste: {names|and}' },
  },
});

// English: uses "and" with Oxford comma
i18n.t('guests', { names: [] });
// "Invited: "

i18n.t('guests', { names: ['Alice'] });
// "Invited: Alice"

i18n.t('guests', { names: ['Alice', 'Bob'] });
// "Invited: Alice and Bob"

i18n.t('guests', { names: ['Alice', 'Bob', 'Charlie'] });
// "Invited: Alice, Bob, and Charlie"

// Spanish: automatically uses "y"
i18n.setLocale('es');
i18n.t('guests', { names: ['Alice', 'Bob', 'Charlie'] });
// "Invitados: Alice, Bob y Charlie"

// French: automatically uses "et"
i18n.setLocale('fr');
i18n.t('guests', { names: ['Alice', 'Bob', 'Charlie'] });
// "Invités: Alice, Bob et Charlie"

// German: automatically uses "und"
i18n.setLocale('de');
i18n.t('guests', { names: ['Alice', 'Bob', 'Charlie'] });
// "Gäste: Alice, Bob und Charlie"
```

::: tip Intl.ListFormat - Zero Configuration
The `and` separator uses the browser/runtime's built-in **Intl.ListFormat API** which automatically:

- **Supports 100+ languages** - All languages available in your environment
- **Handles proper grammar** - Oxford comma, locale-specific punctuation, RTL languages
- **Follows Unicode CLDR standards** - International standard for list formatting
- **Requires zero maintenance** - No manual language configuration needed

Works in all modern browsers (Chrome 72+, Firefox 78+, Safari 14.1+, Edge 79+, Node.js 12+).
:::

#### Array with "or" Separator

Use `{array|or}` for choices with **automatic locale-aware formatting via Intl.ListFormat**:

```ts
const i18n = createI18n({
  locale: 'en',
  messages: {
    en: { options: 'Choose: {choices|or}' },
    es: { options: 'Elige: {choices|or}' },
    fr: { options: 'Choisir: {choices|or}' },
  },
});

// English: uses "or" with Oxford comma
i18n.t('options', { choices: ['Tea'] });
// "Choose: Tea"

i18n.t('options', { choices: ['Tea', 'Coffee'] });
// "Choose: Tea or Coffee"

i18n.t('options', { choices: ['Tea', 'Coffee', 'Juice'] });
// "Choose: Tea, Coffee, or Juice"

// Spanish: automatically uses "o"
i18n.setLocale('es');
i18n.t('options', { choices: ['Té', 'Café', 'Jugo'] });
// "Elige: Té, Café o Jugo"

// French: automatically uses "ou"
i18n.setLocale('fr');
i18n.t('options', { choices: ['Thé', 'Café', 'Jus'] });
// "Choisir: Thé, Café ou Jus"
```

::: tip Automatic Language Support
The `or` separator automatically works with **100+ languages** including:

- European: English, Spanish, French, German, Italian, Portuguese, Russian, Polish, Dutch, Swedish, Danish, Norwegian, Finnish, Czech, and more
- Asian: Japanese, Chinese, Korean, Thai, Vietnamese, Indonesian, and more
- Middle Eastern: Arabic, Hebrew, Persian, Turkish, and more
- African: Swahili, Zulu, Afrikaans, and more
- And many others!

No manual configuration required - it just works! ✨
:::

#### Array with Custom Separators

Use `{array|separator}` for custom separators:

```ts
const i18n = createI18n({
  messages: {
    en: {
      path: 'Path: {folders| / }',
      items: 'Items: {list| - }',
      codes: 'Codes: {codes| | }',
      steps: 'Steps: {steps| → }',
    },
  },
});

i18n.t('path', { folders: ['home', 'user', 'documents'] });
// "Path: home / user / documents"

i18n.t('items', { list: ['A', 'B', 'C'] });
// "Items: A - B - C"

i18n.t('codes', { codes: ['X', 'Y', 'Z'] });
// "Codes: X | Y | Z"

i18n.t('steps', { steps: ['Open', 'Edit', 'Save'] });
// "Steps: Open → Edit → Save"
```

#### Array Length

Access array length with `{array.length}`:

```ts
const i18n = createI18n({
  messages: {
    en: {
      count: 'You have {items.length} items',
      summary: '{items.length} items in {categories.length} categories',
      results: 'Found {results.length} results',
    },
  },
});

i18n.t('count', { items: ['A', 'B', 'C'] });
// "You have 3 items"

i18n.t('count', { items: [] });
// "You have 0 items"

i18n.t('summary', {
  items: ['Book', 'Pen'],
  categories: ['Office', 'School', 'Home'],
});
// "2 items in 3 categories"
```

#### Complex Array Scenarios

Combine multiple array features:

```ts
const i18n = createI18n({
  messages: {
    en: {
      mixed: 'First: {items[0]}, Total: {items.length}, All: {items|and}',
      cart: 'Your cart ({cart.length}): {cart}',
      nested: '{users[0].name} has {users[0].items.length} items: {users[0].items}',
    },
  },
});

i18n.t('mixed', { items: ['Apple', 'Banana', 'Orange'] });
// "First: Apple, Total: 3, All: Apple, Banana and Orange"

i18n.t('cart', { cart: ['Book', 'Pen', 'Notebook'] });
// "Your cart (3): Book, Pen, Notebook"

i18n.t('nested', {
  users: [{ name: 'Alice', items: ['Book', 'Pen', 'Notebook'] }],
});
// "Alice has 3 items: Book, Pen, Notebook"
```

### Mixed Notation

```ts
const i18n = createI18n({
  messages: {
    en: {
      complex: 'Name: {data.users[0].profile.name}',
      nested: 'Value: {config.settings[2].value}',
    },
  },
});

i18n.t('complex', {
  data: {
    users: [{ profile: { name: 'Alice' } }, { profile: { name: 'Bob' } }],
  },
});
// "Name: Alice"
```

### Supported Path Formats

i18nit supports the following interpolation path formats:

- `{name}` - Simple variable
- `{user.name}` - Nested object property
- `{user.profile.email}` - Deep nested property
- `{items[0]}` - Array index (safe - returns empty if out of bounds)
- `{items}` - Array join with default separator (`, `)
- `{items|and}` - Array join with natural "and" (e.g., "A, B and C")
- `{items|or}` - Array join with natural "or" (e.g., "A, B or C")
- `{items| - }` - Array join with custom separator
- `{items.length}` - Array length
- `{data.items[0].value}` - Mixed notation

**Array Features Summary:**

| Syntax           | Description        | Example Output |
| ---------------- | ------------------ | -------------- |
| `{items}`        | Default join       | `"A, B, C"`    |
| `{items\|and}`   | Natural "and" list | `"A, B and C"` |
| `{items\|or}`    | Natural "or" list  | `"A, B or C"`  |
| `{items\| - }`   | Custom separator   | `"A - B - C"`  |
| `{items.length}` | Array length       | `"3"`          |
| `{items[0]}`     | Safe index         | `"A"` or `""`  |

**Limitations:**

- Only **numeric** bracket notation is supported: `[0]`, `[123]`
- **Quoted keys** are not supported: `["key"]`, `['key']`
- **Non-numeric brackets** are not supported: `[key]`, `[variableName]`
- Bracket notation only works with arrays, not as alternative property access

::: warning Path Syntax
Use dot notation for object properties and numeric brackets for arrays only. Complex dynamic property access is not supported.
:::

### Different Value Types

```ts
const i18n = createI18n({
  messages: {
    en: {
      status: 'Active: {isActive}',
      count: 'Count: {count}',
      updated: 'Updated: {date}',
    },
  },
});

// Boolean
i18n.t('status', { isActive: true });
// "Active: true"

// Number
i18n.t('count', { count: 42 });
// "Count: 42"

// Date
i18n.t('updated', { date: new Date('2024-01-15') });
// "Updated: Mon Jan 15 2024..."
```

### Number Formatting in Interpolation

```ts
const i18n = createI18n({
  locale: 'en-US',
  messages: {
    en: {
      price: 'Price: {amount}',
    },
  },
});

// Numbers are automatically formatted based on locale
i18n.t('price', { amount: 1234.56 });
// "Price: 1,234.56" (en-US formatting)

i18n.setLocale('de');
i18n.t('price', { amount: 1234.56 });
// "Price: 1.234,56" (German formatting)
```

### Missing Variable Handling

i18nit provides three strategies for handling missing variables:

#### Empty String (Default)

```ts
const i18n = createI18n({
  messages: {
    en: { greeting: 'Hello, {name}!' },
  },
  missingVar: 'empty', // Default
});

i18n.t('greeting'); // "Hello, !"
i18n.t('greeting', { name: undefined }); // "Hello, !"
```

#### Preserve Placeholders

```ts
const i18n = createI18n({
  messages: {
    en: { greeting: 'Hello, {name}!' },
  },
  missingVar: 'preserve',
});

i18n.t('greeting'); // "Hello, {name}!"
i18n.t('greeting', { name: undefined }); // "Hello, {name}!"
```

#### Throw Error with Structured Information

```ts
import { createI18n, MissingVariableError } from '@vielzeug/i18nit';

const i18n = createI18n({
  messages: {
    en: { greeting: 'Hello, {name}!' },
  },
  missingVar: 'error',
});

try {
  i18n.t('greeting');
} catch (error) {
  if (error instanceof MissingVariableError) {
    console.log(error.key); // 'greeting'
    console.log(error.variable); // 'name'
    console.log(error.locale); // 'en'
    console.log(error.message); // "Missing variable 'name' for key 'greeting' in locale 'en'"

    // Log to error tracking service
    trackError({
      type: 'missing_i18n_variable',
      key: error.key,
      variable: error.variable,
      locale: error.locale,
    });
  }
}
```

**Benefits of MissingVariableError:**

- Structured data (key, variable, locale) for debugging
- Can be caught specifically with `instanceof`
- Useful for error tracking and monitoring
- Better than generic Error for production debugging

## HTML Escaping

Protect against XSS attacks by escaping HTML in translations.

### Global Escaping

```ts
const i18n = createI18n({
  escape: true, // Enable for all translations
  messages: {
    en: {
      userContent: '<script>alert("xss")</script>',
      safeHtml: '<b>Bold text</b>',
    },
  },
});

i18n.t('userContent');
// "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"

i18n.t('safeHtml');
// "&lt;b&gt;Bold text&lt;/b&gt;"
```

### Per-Translation Escaping

```ts
const i18n = createI18n({
  messages: {
    en: {
      userComment: 'Comment: {content}',
    },
  },
});

// Escape for this translation only
i18n.t('userComment', { content: '<script>xss</script>' }, { escape: true });
// "Comment: &lt;script&gt;xss&lt;/script&gt;"

// No escaping
i18n.t('userComment', { content: '<b>Important</b>' }, { escape: false });
// "Comment: <b>Important</b>"
```

### With Interpolation

```ts
const i18n = createI18n({
  messages: {
    en: {
      greeting: 'Hello, {name}!',
    },
  },
});

// Variables are escaped when escape is enabled
i18n.t('greeting', { name: '<script>alert("xss")</script>' }, { escape: true });
// "Hello, &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;!"
```

**Escaped Characters:**

- `<` → `&lt;`
- `>` → `&gt;`
- `&` → `&amp;`
- `"` → `&quot;`
- `'` → `&#39;`

::: warning Security
Always escape user-generated content in translations to prevent XSS attacks. Use global escaping or per-translation escaping based on your needs.
:::

## Async Loading

### Registering Loaders

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
```

### Loading Translations

```ts
// Load explicitly
await i18n.load('es');
i18n.t('greeting', undefined, { locale: 'es' });

// Or use tl() for automatic loading
await i18n.tl('greeting', undefined, { locale: 'es' });
```

### Dynamic Loader Registration

```ts
// Register loader after creation
i18n.register('de', async () => {
  const response = await fetch('/locales/de.json');
  return response.json();
});

await i18n.load('de');
```

### Loading with Error Handling

```ts
try {
  await i18n.load('es');
  console.log('Spanish translations loaded');
} catch (error) {
  console.error('Failed to load translations:', error);
  // i18n will use fallback or missingKey handler
}
```

### Checking if Locale is Loaded

```ts
// Sync check
if (i18n.hasLocale('es')) {
  console.log('Spanish is loaded');
}

// Async check (loads if needed)
if (await i18n.hasAsync('greeting', 'es')) {
  console.log('Spanish greeting exists');
}
```

### Preloading Translations

```ts
// Preload multiple locales
await Promise.all([i18n.load('es'), i18n.load('fr'), i18n.load('de')]);

console.log('All translations loaded');
```

## Message Functions

### Basic Functions

```ts
const i18n = createI18n({
  messages: {
    en: {
      dynamic: (vars) => {
        const name = vars.name as string;
        const time = new Date().getHours();
        if (time < 12) return `Good morning, ${name}!`;
        if (time < 18) return `Good afternoon, ${name}!`;
        return `Good evening, ${name}!`;
      },
    },
  },
});

i18n.t('dynamic', { name: 'Alice' });
// "Good morning, Alice!" (depending on time)
```

### Using Helper Functions

```ts
const i18n = createI18n({
  messages: {
    en: {
      price: (vars, helpers) => {
        const amount = vars.amount as number;
        return `Total: ${helpers.number(amount, { style: 'currency', currency: 'USD' })}`;
      },
      timestamp: (vars, helpers) => {
        const date = vars.date as Date;
        return `Posted ${helpers.date(date, { dateStyle: 'medium', timeStyle: 'short' })}`;
      },
    },
  },
});

i18n.t('price', { amount: 99.99 });
// "Total: $99.99"

i18n.t('timestamp', { date: new Date() });
// "Posted Feb 9, 2026, 2:30 PM"
```

### Complex Logic

```ts
const i18n = createI18n({
  messages: {
    en: {
      scoreMessage: (vars, helpers) => {
        const score = vars.score as number;
        const maxScore = vars.maxScore as number;
        const percentage = (score / maxScore) * 100;
        const formattedScore = helpers.number(score);
        const formattedMax = helpers.number(maxScore);

        if (percentage >= 90) {
          return `Excellent! ${formattedScore}/${formattedMax} (${percentage.toFixed(1)}%)`;
        }
        if (percentage >= 70) {
          return `Good job! ${formattedScore}/${formattedMax} (${percentage.toFixed(1)}%)`;
        }
        return `Keep trying! ${formattedScore}/${formattedMax} (${percentage.toFixed(1)}%)`;
      },
    },
  },
});

i18n.t('scoreMessage', { score: 95, maxScore: 100 });
// "Excellent! 95/100 (95.0%)"
```

## Namespaces

### Creating Namespaces

```ts
const i18n = createI18n({
  messages: {
    en: {
      errors: {
        required: 'This field is required',
        invalid: 'Invalid value',
      },
      validation: {
        email: 'Please enter a valid email',
        password: 'Password must be at least 8 characters',
      },
    },
  },
});

// Create namespaced translators
const errors = i18n.namespace('errors');
const validation = i18n.namespace('validation');
```

### Using Namespaces

```ts
// Instead of:
i18n.t('errors.required');
i18n.t('validation.email');

// Use:
errors.t('required'); // "This field is required"
validation.t('email'); // "Please enter a valid email"
```

### Namespaces with Variables

```ts
const user = i18n.namespace('user');

user.t('greeting', { name: 'Alice' });
// Same as: i18n.t('user.greeting', { name: 'Alice' })
```

### Namespaces with Options

```ts
const common = i18n.namespace('common');

common.t('save', undefined, { locale: 'es' });
// Same as: i18n.t('common.save', undefined, { locale: 'es' })
```

### Async Namespaces

```ts
const auth = i18n.namespace('auth');

await auth.tl('loginError', undefined, { locale: 'fr' });
// Same as: await i18n.tl('auth.loginError', undefined, { locale: 'fr' })
```

## Formatting Helpers

### Number Formatting

```ts
// Basic number
i18n.number(1234.56); // "1,234.56" (en-US)

// Currency
i18n.number(99.99, { style: 'currency', currency: 'USD' });
// "$99.99"

// Percentage
i18n.number(0.856, { style: 'percent' });
// "85.6%"

// With specific locale
i18n.number(1234.56, undefined, 'de');
// "1.234,56" (German formatting)

// Currency with locale
i18n.number(99.99, { style: 'currency', currency: 'EUR' }, 'de');
// "99,99 €"
```

### Date Formatting

```ts
const date = new Date('2024-01-15');

// Basic date
i18n.date(date); // "1/15/2024" (en-US)

// Long format
i18n.date(date, { dateStyle: 'long' });
// "January 15, 2024"

// Full format with time
i18n.date(date, { dateStyle: 'full', timeStyle: 'short' });
// "Monday, January 15, 2024 at 12:00 AM"

// With specific locale
i18n.date(date, { dateStyle: 'long' }, 'fr');
// "15 janvier 2024"

// Using timestamp
i18n.date(Date.now(), { dateStyle: 'medium' });
// "Feb 9, 2026"
```

## HTML Escaping

### Global Escaping

```ts
const i18n = createI18n({
  escape: true, // Enable globally
  messages: {
    en: {
      userContent: 'Posted by: {username}',
    },
  },
});

i18n.t('userContent', { username: '<script>alert("xss")</script>' });
// "Posted by: &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
```

### Per-Translation Escaping

```ts
const i18n = createI18n({
  escape: false, // Disabled by default
  messages: {
    en: {
      safe: 'This is safe: {content}',
      html: 'This has HTML: {content}',
    },
  },
});

// Enable for specific translation
i18n.t('safe', { content: '<script>xss</script>' }, { escape: true });
// "This is safe: &lt;script&gt;xss&lt;/script&gt;"

// Disable for specific translation (if globally enabled)
i18n.t('html', { content: '<b>bold</b>' }, { escape: false });
// "This has HTML: <b>bold</b>"
```

## Message Management

### Adding Messages

```ts
// Add messages to existing locale
i18n.add('en', {
  newKey: 'New translation',
  another: 'Another one',
});

// Merges with existing messages
```

### Replacing Messages

```ts
// Replace all messages for a locale
i18n.set('en', {
  greeting: 'Hello!',
  // All previous messages for 'en' are removed
});
```

### Getting Messages

```ts
// Get all messages for a locale
const messages = i18n.getMessages('en');
console.log(messages);
// { greeting: 'Hello!', farewell: 'Goodbye!' }
```

### Checking Messages

```ts
// Check if key exists
if (i18n.has('greeting')) {
  console.log('Greeting translation exists');
}

// Check in specific locale
if (i18n.has('greeting', 'es')) {
  console.log('Spanish greeting exists');
}
```

## Subscriptions

### Basic Subscription

```ts
const unsubscribe = i18n.subscribe((locale) => {
  console.log('Locale changed to:', locale);
  // Update UI, re-render components, etc.
});

// Later...
unsubscribe();
```

### React Integration

```tsx
function useI18n() {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    return i18n.subscribe(() => {
      forceUpdate({});
    });
  }, []);

  return {
    t: i18n.t.bind(i18n),
    setLocale: i18n.setLocale.bind(i18n),
    locale: i18n.getLocale(),
  };
}
```

### Vue Integration

```vue
<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const locale = ref(i18n.getLocale());
let unsubscribe;

onMounted(() => {
  unsubscribe = i18n.subscribe((newLocale) => {
    locale.value = newLocale;
  });
});

onUnmounted(() => {
  unsubscribe?.();
});
</script>
```

## Best Practices

### 1. Organize Translations by Feature

```ts
const messages = {
  en: {
    auth: {
      login: 'Log in',
      logout: 'Log out',
      register: 'Register',
    },
    user: {
      profile: 'Profile',
      settings: 'Settings',
    },
    errors: {
      required: 'Required field',
      invalid: 'Invalid value',
    },
  },
};
```

### 2. Use Constants for Keys

```ts
// keys.ts
export const KEYS = {
  AUTH: {
    LOGIN: 'auth.login',
    LOGOUT: 'auth.logout',
  },
  ERRORS: {
    REQUIRED: 'errors.required',
  },
} as const;

// usage
i18n.t(KEYS.AUTH.LOGIN);
i18n.t(KEYS.ERRORS.REQUIRED);
```

### 3. Lazy Load Translations

```ts
// Only load translations when needed
const i18n = createI18n({
  locale: 'en',
  loaders: {
    es: () => import('./locales/es.json'),
    fr: () => import('./locales/fr.json'),
    de: () => import('./locales/de.json'),
  },
});
```

### 4. Extract Common Strings

```ts
const common = {
  actions: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
  },
  states: {
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
  },
};
```

### 5. Validate Translations

```ts
// Ensure all locales have same keys
const validateTranslations = (messages: Record<string, Messages>) => {
  const keys = Object.keys(messages);
  const baseKeys = new Set(Object.keys(messages[keys[0]]));

  for (const locale of keys.slice(1)) {
    const localeKeys = new Set(Object.keys(messages[locale]));
    const missing = [...baseKeys].filter((k) => !localeKeys.has(k));
    if (missing.length > 0) {
      console.warn(`Missing keys in ${locale}:`, missing);
    }
  }
};
```

### 6. Use Type Safety

```ts
// Define message keys as types
type MessageKeys = 'greeting' | 'farewell' | 'welcome';

const i18n = createI18n<Record<MessageKeys, string>>({
  messages: {
    en: {
      greeting: 'Hello',
      farewell: 'Goodbye',
      welcome: 'Welcome',
    },
  },
});

// TypeScript will ensure keys are valid
i18n.t('greeting'); // ✅
i18n.t('invalid'); // ❌ Type error
```

### 7. Handle Missing Translations Gracefully

```ts
const i18n = createI18n({
  missingKey: (key, locale) => {
    // Log to monitoring service
    console.warn(`Missing translation: ${key} (${locale})`);

    // Return user-friendly fallback
    return key.split('.').pop() || key;
  },
});
```

### 8. Optimize for Performance

```ts
// Avoid creating new instances
// ❌ Don't do this
function Component() {
  const i18n = createI18n({ ... }); // New instance each render!
}

// ✅ Do this
const i18n = createI18n({ ... }); // Single instance

function Component() {
  const { t } = useI18n(); // Reuse instance
}
```

## Migration Guide

### From i18next

```ts
// i18next
import i18next from 'i18next';
i18next.t('greeting', { name: 'Alice' });

// i18nit
import { createI18n } from '@vielzeug/i18nit';
const i18n = createI18n({ ... });
i18n.t('greeting', { name: 'Alice' });
```

### From react-intl

```tsx
// react-intl
import { FormattedMessage } from 'react-intl';
<FormattedMessage id="greeting" values={{ name: 'Alice' }} />

// i18nit
const i18n = createI18n({ ... });
{i18n.t('greeting', { name: 'Alice' })}
```

### Key Differences

- **No Context**: i18nit doesn't have context feature (use different keys instead)
- **No ICU**: i18nit doesn't support ICU message format (use functions instead)
- **Simpler API**: Less configuration, more straightforward
- **Smaller Bundle**: Much lighter weight

---

For complete application examples, see [Examples](./examples.md). For detailed API reference, see [API Reference](./api.md).
