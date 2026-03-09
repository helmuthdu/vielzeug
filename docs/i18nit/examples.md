---
title: I18nit — Examples
description: Real-world i18n patterns and framework integrations for I18nit.
---

# I18nit Examples

::: tip
These are copy-paste ready recipes. See [Usage Guide](./usage.md) for detailed explanations.
:::

[[toc]]

## Framework Integration

Complete examples showing how to integrate i18nit with React, Vue, and Svelte. Each framework has two patterns: an inline approach and a reusable hook/composable.

### Inline Pattern

Directly create and use an i18n instance within components.

::: code-group

```tsx [React]
import { createI18n } from '@vielzeug/i18nit';
import { useEffect, useState } from 'react';

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: { welcome: 'Welcome!' },
    es: { welcome: '¡Bienvenido!' },
  },
});

function App() {
  const [, forceUpdate] = useState({});
  useEffect(() => i18n.subscribe(() => forceUpdate({})), []);

  return (
    <div>
      <h1>{i18n.t('welcome')}</h1>
      <button onClick={() => { i18n.locale = 'es'; }}>ES</button>
    </div>
  );
}
```

```vue [Vue 3]
<script setup lang="ts">
import { createI18n } from '@vielzeug/i18nit';
import { ref, onUnmounted } from 'vue';

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: { welcome: 'Welcome!' },
    es: { welcome: '¡Bienvenido!' },
  },
});

const locale = ref(i18n.locale);
const unsub = i18n.subscribe((l) => (locale.value = l));
onUnmounted(() => unsub());
</script>

<template>
  <div>
    <h1>{{ i18n.t('welcome') }}</h1>
    <button @click="i18n.locale = 'es'">ES</button>
  </div>
</template>
```

```svelte [Svelte]
<script lang="ts">
  import { createI18n } from '@vielzeug/i18nit';
  import { onDestroy } from 'svelte';

  const i18n = createI18n({
    locale: 'en',
    messages: {
      en: { welcome: 'Welcome!' },
      es: { welcome: '¡Bienvenido!' },
    },
  });

  let locale = i18n.locale;
  const unsub = i18n.subscribe((l) => { locale = l; });
  onDestroy(() => unsub());
</script>

<h1>{i18n.t('welcome')}</h1>
<button on:click={() => { i18n.locale = 'es'; }}>ES</button>
```

:::

### Hook / Composable Pattern

Encapsulate i18n logic into a reusable hook so any component can consume the same instance.

::: code-group

```tsx [React]
// i18n.ts — singleton
import { createI18n } from '@vielzeug/i18nit';
import { useEffect, useState } from 'react';

export const i18n = createI18n({
  locale: 'en',
  messages: {
    en: { welcome: 'Welcome, {name}!' },
    es: { welcome: '¡Bienvenido, {name}!' },
  },
});

export function useI18n() {
  const [, forceUpdate] = useState({});
  useEffect(() => i18n.subscribe(() => forceUpdate({})), []);
  return {
    t: i18n.t.bind(i18n),
    locale: i18n.locale,
    setLocale: async (l: string) => {
      await i18n.load(l);
      i18n.locale = l;
    },
  };
}

// App.tsx
export function App() {
  const { t, locale, setLocale } = useI18n();
  return (
    <div lang={locale}>
      <h1>{t('welcome', { name: 'Alice' })}</h1>
      <button onClick={() => setLocale('es')}>ES</button>
    </div>
  );
}
```

```ts [Vue 3]
// i18n.ts — singleton
import { createI18n } from '@vielzeug/i18nit';
import { ref, onUnmounted } from 'vue';

export const i18n = createI18n({
  locale: 'en',
  messages: {
    en: { welcome: 'Welcome, {name}!' },
    es: { welcome: '¡Bienvenido, {name}!' },
  },
});

export function useI18n() {
  const locale = ref(i18n.locale);
  const unsub = i18n.subscribe((l) => (locale.value = l));
  onUnmounted(() => unsub());

  return {
    t: i18n.t.bind(i18n),
    locale,
    async setLocale(l: string) {
      await i18n.load(l);
      i18n.locale = l;
    },
  };
}
```

```svelte [Svelte]
// i18n.ts — singleton + store
import { createI18n } from '@vielzeug/i18nit';
import { writable } from 'svelte/store';

export const i18n = createI18n({
  locale: 'en',
  messages: {
    en: { welcome: 'Welcome, {name}!' },
    es: { welcome: '¡Bienvenido, {name}!' },
  },
});

export const locale = writable(i18n.locale);
i18n.subscribe((l) => locale.set(l));

export async function setLocale(l: string) {
  await i18n.load(l);
  i18n.locale = l;
}
```

:::



## Async Loading

### Lazy-Loaded Locales

Register loaders upfront and call `load()` before switching locale:

```ts
import { createI18n } from '@vielzeug/i18nit';

const i18n = createI18n({
  locale: 'en',
  messages: { en: await import('./locales/en.json').then((m) => m.default) },
  loaders: {
    es: () => import('./locales/es.json').then((m) => m.default),
    fr: () => import('./locales/fr.json').then((m) => m.default),
    de: () => import('./locales/de.json').then((m) => m.default),
  },
});

async function switchLocale(locale: string) {
  await i18n.load(locale);
  i18n.locale = locale;
}
```

### Route-Based Loading

```ts
const i18n = createI18n({
  locale: 'en',
  messages: { en: baseMessages },
  loaders: {
    fr: async () => {
      const [base, routes] = await Promise.all([
        import('./locales/fr/base.json'),
        import('./locales/fr/routes.json'),
      ]);
      return { ...base.default, ...routes.default };
    },
  },
});
```

### Preloading Multiple Locales

```ts
// Preload everything before rendering
await Promise.all([i18n.load('es'), i18n.load('fr'), i18n.load('de')]);
```



## Array Handling

### Grocery List

```ts
const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      groceries: {
        list:    'Shopping list: {items}',
        andList: 'Buy {items|and}',
        orList:  '{items|or}?',
        count:   '{items.length} items to buy',
        first:   "Don't forget: {items[0]}",
      },
    },
  },
});

const items = ['Milk', 'Eggs', 'Bread', 'Butter'];

i18n.t('groceries.list',    { items }); // "Shopping list: Milk, Eggs, Bread, Butter"
i18n.t('groceries.andList', { items }); // "Buy Milk, Eggs, Bread, and Butter"
i18n.t('groceries.orList',  { items }); // "Milk, Eggs, Bread, or Butter?"
i18n.t('groceries.count',   { items }); // "4 items to buy"
i18n.t('groceries.first',   { items }); // "Don't forget: Milk"
```

### Price List with Formatting

```ts
const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      cart: { total: 'Total: {amount}', items: 'Items: {items}' },
    },
  },
});

const prices = [9.99, 24.99, 4.99];
i18n.t('cart.total', { amount: prices.reduce((s, p) => s + p, 0) });
// "Total: 39.97"

i18n.t('cart.items', { items: prices });
// "Items: 9.99, 24.99, 4.99"
```



## E-Commerce

```ts
const i18n = createI18n({
  locale: 'en',
  fallback: 'en',
  messages: {
    en: {
      product: {
        price:    '{price}',
        inStock:  { one: 'Last item!', other: '{count} in stock', zero: 'Out of stock' },
        addCart:  'Add to cart',
        checkout: 'Checkout ({count})',
      },
      cart: {
        empty:  'Your cart is empty',
        total:  'Total: {total}',
        items:  '{count, plural, one {# item} other {# items}}',
      },
      order: {
        placed:   'Order #{id} placed',
        shipping: 'Ships by {date}',
        summary:  '{items|and} will ship on {date}',
      },
    },
    es: {
      product: {
        price:    '{price}',
        inStock:  { one: '¡Último artículo!', other: '{count} en stock', zero: 'Agotado' },
        addCart:  'Añadir al carrito',
        checkout: 'Pagar ({count})',
      },
    },
  },
  loaders: {
    es: () => import('./locales/es.json').then((m) => m.default),
    fr: () => import('./locales/fr.json').then((m) => m.default),
  },
});

// Product page
i18n.t('product.inStock', { count: 0 }); // "Out of stock"
i18n.t('product.inStock', { count: 1 }); // "Last item!"
i18n.t('product.inStock', { count: 5 }); // "5 in stock"

i18n.number(29.99, { style: 'currency', currency: 'USD' }); // "$29.99"

// Order confirmation
i18n.t('order.placed', { id: '12345' });
i18n.t('order.shipping', { date: i18n.date(new Date('2024-02-01'), { dateStyle: 'long' }) });

// Switch to Spanish
async function goSpanish() {
  await i18n.load('es');
  i18n.locale = 'es';
}
```



## Dashboard

```ts
import { createI18n } from '@vielzeug/i18nit';

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      dashboard: {
        title:   'Dashboard',
        metrics: {
          users:   { zero: 'No users', one: 'One user', other: '{count} users' },
          revenue: 'Revenue: {amount}',
          growth:  '{percent} growth',
        },
        charts: {
          title:  '{name} Chart',
          noData: 'No data available',
          legend: '{series|and}',
        },
        alerts: {
          none:     'No alerts',
          critical: 'Critical: {message}',
          warning:  'Warning: {message}',
        },
      },
    },
  },
  loaders: {
    de: () => import('./locales/de.json').then((m) => m.default),
    fr: () => import('./locales/fr.json').then((m) => m.default),
  },
});

const metrics = i18n.namespace('dashboard.metrics');
const charts  = i18n.namespace('dashboard.charts');
const alerts  = i18n.namespace('dashboard.alerts');

metrics.t('users',   { count: 1250 }); // "1,250 users"
metrics.t('revenue', { amount: i18n.number(98765.43, { style: 'currency', currency: 'USD' }) });
metrics.t('growth',  { percent: i18n.number(0.156, { style: 'percent' }) });

charts.t('title',  { name: 'Sales' }); // "Sales Chart"
charts.t('legend', { series: ['Revenue', 'Users', 'Sessions'] }); // "Revenue, Users, and Sessions"

alerts.t('critical', { message: 'Database connection lost' });

async function setDashboardLocale(locale: string) {
  await i18n.load(locale);
  i18n.locale = locale;
}
```



## Auth Flow

```ts
const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      auth: {
        login:    { title: 'Sign In', submit: 'Sign In', link: 'Sign in' },
        register: { title: 'Create Account', submit: 'Create Account' },
        logout:   { title: 'Sign Out', confirm: 'Are you sure?' },
        errors: {
          invalid:   'Invalid email or password',
          locked:    'Account locked. Try again in {minutes} minutes.',
          expired:   'Session expired. Please sign in again.',
          attempts:  { one: 'One attempt remaining', other: '{count} attempts remaining' },
        },
        success: {
          login:    'Welcome back, {name}!',
          register: 'Welcome, {name}! Check your email.',
          logout:   'You have been signed out.',
        },
        validation: {
          email:       'Enter a valid email address',
          password:    'Password must be at least {min} characters',
          required:    '{field} is required',
          mismatch:    'Passwords do not match',
        },
      },
    },
    es: {
      auth: {
        login:    { title: 'Iniciar sesión', submit: 'Iniciar sesión', link: 'Entrar' },
        register: { title: 'Crear cuenta', submit: 'Crear cuenta' },
        logout:   { title: 'Cerrar sesión', confirm: '¿Estás seguro?' },
        errors: {
          invalid:  'Correo o contraseña incorrectos',
          locked:   'Cuenta bloqueada. Inténtalo de nuevo en {minutes} minutos.',
          expired:  'Sesión expirada. Por favor inicia sesión de nuevo.',
          attempts: { one: 'Un intento restante', other: '{count} intentos restantes' },
        },
        success: {
          login:    '¡Bienvenido de nuevo, {name}!',
          register: '¡Bienvenido, {name}! Revisa tu correo.',
          logout:   'Has cerrado sesión.',
        },
      },
    },
  },
});

const auth = i18n.namespace('auth');

auth.t('errors.locked',   { minutes: 5 });          // "Account locked. Try again in 5 minutes."
auth.t('errors.attempts', { count: 2 });             // "2 attempts remaining"
auth.t('success.login',   { name: 'Alice' });        // "Welcome back, Alice!"
auth.t('validation.required', { field: 'Email' });   // "Email is required"

i18n.locale = 'es';
auth.t('errors.locked', { minutes: 5 }); // "Cuenta bloqueada. Inténtalo de nuevo en 5 minutos."
```



## Multi-Tenant App

Serve multiple languages simultaneously using `scoped()` — the active locale never changes:

```ts
import { createI18n } from '@vielzeug/i18nit';

const i18n = createI18n({
  locale: 'en',
  fallback: 'en',
  messages: {
    en: { greeting: 'Hello, {name}!', goodbye: 'Goodbye, {name}!' },
    es: { greeting: '¡Hola, {name}!', goodbye: '¡Adiós, {name}!' },
    fr: { greeting: 'Bonjour, {name}!', goodbye: 'Au revoir, {name}!' },
  },
});

// SSR: render the same page for different locales in parallel
function renderForLocale(locale: string, name: string) {
  const scoped = i18n.scoped(locale);
  return {
    greeting: scoped.t('greeting', { name }),
    goodbye:  scoped.t('goodbye',  { name }),
    since:    scoped.date(new Date(), { dateStyle: 'long' }),
  };
}

console.log(i18n.locale); // still 'en' — scoped() never changes it

renderForLocale('en', 'Alice'); // { greeting: 'Hello, Alice!', ... }
renderForLocale('es', 'Bob');   // { greeting: '¡Hola, Bob!', ... }
renderForLocale('fr', 'Carol'); // { greeting: 'Bonjour, Carol!', ... }
```



## Subscriptions & Reactivity

### Document Metadata

```ts
i18n.subscribe((locale) => {
  document.documentElement.lang = locale;
  document.documentElement.dir  = ['ar', 'he', 'fa', 'ur'].includes(locale) ? 'rtl' : 'ltr';
});
```

### Persistent Locale

```ts
const saved = localStorage.getItem('locale') ?? 'en';
i18n.locale = saved;

i18n.subscribe((locale) => {
  localStorage.setItem('locale', locale);
});
```

### Multiple Subscribers

```ts
const unsub1 = i18n.subscribe((l) => { document.documentElement.lang = l; });
const unsub2 = i18n.subscribe((l) => { localStorage.setItem('locale', l); });
const unsub3 = i18n.subscribe((l) => { analytics.track('locale_change', { locale: l }); });

// Unsubscribe any one independently
unsub2();
```
