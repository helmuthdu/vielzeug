---
title: I18nit — Examples
description: Real-world i18n recipes for i18nit — framework adapters, async loading, locale switchers, SSR, and more.
---

# I18nit Examples

::: tip
These are copy-paste ready recipes. See the [Usage Guide](./usage.md) for detailed explanations and the [API Reference](./api.md) for type signatures.
:::

[[toc]]

## React Integration

A lightweight custom hook that triggers re-renders on locale changes.

```ts
// useI18n.ts
import { useEffect, useReducer, useCallback } from 'react';
import { createI18n } from '@vielzeug/i18nit';

export const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      greeting: 'Hello, {name}!',
      nav: { home: 'Home', about: 'About' },
      files: { zero: 'No files', one: 'One file', other: '{count} files' },
    },
    de: {
      greeting: 'Hallo, {name}!',
      nav: { home: 'Startseite', about: 'Über uns' },
      files: { zero: 'Keine Dateien', one: 'Eine Datei', other: '{count} Dateien' },
    },
  },
  loaders: {
    fr: () => import('./locales/fr.json'),
    ja: () => import('./locales/ja.json'),
  },
});

export function useI18n() {
  const [, rerender] = useReducer((n) => n + 1, 0);

  useEffect(() => {
    return i18n.subscribe(() => rerender());
  }, []);

  const setLocale = useCallback(
    (locale: string) => i18n.setLocale(locale),
    [],
  );

  return { t: i18n.t.bind(i18n), locale: i18n.locale, locales: i18n.locales, setLocale };
}
```

```tsx
// App.tsx
import { useI18n } from './useI18n';

export function App() {
  const { t, locale, locales, setLocale } = useI18n();

  return (
    <div>
      <h1>{t('greeting', { name: 'Alice' })}</h1>
      <nav>
        <a href="/">{t('nav.home')}</a>
        <a href="/about">{t('nav.about')}</a>
      </nav>
      <select value={locale} onChange={(e) => setLocale(e.target.value)}>
        {locales.map((loc) => (
          <option key={loc} value={loc}>{loc}</option>
        ))}
      </select>
    </div>
  );
}
```

## Vue Integration

A composable that provides reactive translations in Vue 3.

```ts
// useI18n.ts
import { ref, readonly } from 'vue';
import { createI18n } from '@vielzeug/i18nit';

export const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      greeting: 'Hello, {name}!',
      files: { zero: 'No files', one: 'One file', other: '{count} files' },
    },
  },
  loaders: {
    de: () => import('./locales/de.json'),
    fr: () => import('./locales/fr.json'),
  },
});

const locale = ref(i18n.locale);
i18n.subscribe((l) => { locale.value = l; });

export function useI18n() {
  return {
    locale: readonly(locale),
    locales: i18n.locales,
    t: (key: string, vars?: Record<string, unknown>) => i18n.t(key, vars),
    setLocale: (l: string) => i18n.setLocale(l),
  };
}
```

```vue
<!-- App.vue -->
<script setup lang="ts">
import { useI18n } from './useI18n';
const { t, locale, locales, setLocale } = useI18n();
</script>

<template>
  <h1>{{ t('greeting', { name: 'Alice' }) }}</h1>
  <select :value="locale" @change="setLocale(($event.target as HTMLSelectElement).value)">
    <option v-for="loc in locales" :key="loc" :value="loc">{{ loc }}</option>
  </select>
</template>
```

## Svelte Integration

Use Svelte's writable store to wire up locale reactivity.

```ts
// i18n.ts
import { writable, derived } from 'svelte/store';
import { createI18n } from '@vielzeug/i18nit';

export const i18n = createI18n({
  locale: 'en',
  messages: {
    en: { greeting: 'Hello, {name}!' },
  },
  loaders: {
    de: () => import('./locales/de.json'),
  },
});

const locale = writable(i18n.locale);
i18n.subscribe((l) => locale.set(l));

// A derived store that re-computes whenever locale changes
export const t = derived(locale, () => i18n.t.bind(i18n));
export const setLocale = (l: string) => i18n.setLocale(l);
export { locale };
```

```svelte
<!-- App.svelte -->
<script lang="ts">
  import { t, locale, setLocale } from './i18n';
</script>

<h1>{$t('greeting', { name: 'Alice' })}</h1>
<select bind:value={$locale} on:change={(e) => setLocale(e.target.value)}>
  <option value="en">English</option>
  <option value="de">Deutsch</option>
</select>
```

## Locale Switcher with `locales` Getter

Build a dynamic locale selector from the loaded catalogs without maintaining a separate list:

```ts
import { createI18n } from '@vielzeug/i18nit';

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: { flag: '🇬🇧', name: 'English' },
    de: { flag: '🇩🇪', name: 'Deutsch' },
    fr: { flag: '🇫🇷', name: 'Français' },
    ja: { flag: '🇯🇵', name: '日本語' },
  },
});

// Render a switcher from whatever locales are loaded
function renderSwitcher() {
  const switcher = document.getElementById('locale-switcher')!;
  switcher.innerHTML = i18n.locales
    .map((loc) => {
      const bound = i18n.withLocale(loc);
      return `<button data-locale="${loc}">${bound.t('flag')} ${bound.t('name')}</button>`;
    })
    .join('');
}

document.addEventListener('click', async (e) => {
  const btn = (e.target as HTMLElement).closest('[data-locale]');
  if (btn) {
    await i18n.setLocale(btn.getAttribute('data-locale')!);
    renderSwitcher();
  }
});
```

## Server-Side Rendering with `withLocale()`

On the server, multiple requests may need different locales simultaneously. Use `withLocale()` to translate without touching the global active locale:

```ts
import { createI18n } from '@vielzeug/i18nit';

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: { welcome: 'Welcome, {name}!', title: 'My App' },
    de: { welcome: 'Willkommen, {name}!', title: 'Meine App' },
    fr: { welcome: 'Bienvenue, {name} !', title: 'Mon Application' },
  },
});

// Each request gets its own locale-bound translator — no shared state mutation
async function handleRequest(req: Request) {
  const locale = req.headers.get('Accept-Language')?.split(',')[0] ?? 'en';
  const t = i18n.withLocale(locale).t;

  return new Response(`
    <html>
      <head><title>${t('title')}</title></head>
      <body><h1>${t('welcome', { name: 'Guest' })}</h1></body>
    </html>
  `);
}
```

## Async Locale Loading with Suspense

Load locale bundles on demand and show a loading indicator:

```ts
import { createI18n } from '@vielzeug/i18nit';

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: { loading: 'Loading…', greeting: 'Hello!' },
  },
  loaders: {
    de: () => import('./locales/de.json'),
    fr: () => import('./locales/fr.json'),
    ja: () => import('./locales/ja.json'),
  },
});

async function switchLocale(locale: string) {
  const spinner = document.getElementById('spinner')!;
  spinner.hidden = false;
  try {
    await i18n.setLocale(locale);
  } finally {
    spinner.hidden = true;
  }
}

// Pre-load common locales in the background
i18n.load('de', 'fr').catch(console.error);
```

## Scoped Translations in a Component

Use `scope()` to keep component translation code clean and DRY:

```ts
import { createI18n } from '@vielzeug/i18nit';

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      auth: {
        form: {
          username: 'Username',
          password: 'Password',
          submit: 'Log in',
          error: { required: 'This field is required', invalid: 'Invalid credentials' },
        },
      },
    },
  },
});

class LoginForm {
  // Scope once at construction — no 'auth.form' prefix repeated throughout
  #t = i18n.scope('auth.form').t;

  render() {
    return `
      <form>
        <label>${this.#t('username')}</label>
        <label>${this.#t('password')}</label>
        <button>${this.#t('submit')}</button>
      </form>
    `;
  }

  showError(type: 'required' | 'invalid') {
    alert(this.#t(`error.${type}`));
  }
}
```

## Pluralisation with Dynamic Count

```ts
import { createI18n } from '@vielzeug/i18nit';

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      cart: {
        items: { zero: 'Your cart is empty', one: 'One item in cart', other: '{count} items in cart' },
        saved: { zero: 'No saved items', one: 'One saved item', other: '{count} saved items' },
      },
    },
    ar: {
      // Arabic uses all six plural forms
      cart: {
        items: {
          zero: 'سلة التسوق فارغة',
          one: 'عنصر واحد في السلة',
          two: 'عنصران في السلة',
          few: '{count} عناصر في السلة',
          many: '{count} عنصرًا في السلة',
          other: '{count} عنصر في السلة',
        },
      },
    },
  },
});

const cart = i18n.scope('cart');

cart.t('items', { count: 0 }); // "Your cart is empty"
cart.t('items', { count: 1 }); // "One item in cart"
cart.t('items', { count: 5 }); // "5 items in cart"

i18n.locale = 'ar';
cart.t('items', { count: 2 }); // "عنصران في السلة"
```

## Custom `onMissing` Handler

Log missing keys in development and surface them in CI:

```ts
import { createI18n } from '@vielzeug/i18nit';

const i18n = createI18n({
  locale: 'en',
  messages: { en: {} },
  onMissing: (key, locale) => {
    if (import.meta.env.DEV) {
      console.warn(`[i18n] Missing key "${key}" for locale "${locale}"`);
      return `⚠ ${key}`;
    }
    // In CI / production: throw so missing keys are caught early
    throw new Error(`Missing translation key "${key}" for locale "${locale}"`);
  },
});
```
