# i18nit Examples

Real-world examples demonstrating common use cases and patterns with i18nit.

::: tip 💡 Complete Applications
These are complete, production-ready application examples. For API reference and basic usage, see [Usage Guide](./usage.md).
:::

## Table of Contents

[[toc]]

## Framework Integration

::: details 🎯 Why Two Patterns?
We provide both **inline** and **hook/composable** patterns because:

- **Inline**: Quick prototyping, simple components
- **Hook/Composable**: Reusable across components, better separation of concerns

Choose based on your project structure and team preferences.
:::

Complete examples showing how to integrate i18nit with React, Vue, and Svelte. Each framework has two patterns: inline usage and reusable hook/composable.

### Basic Integration (Inline)

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
      <button onClick={() => i18n.setLocale('es')}>ES</button>
    </div>
  );
}
```

```vue [Vue 3]
<script setup lang="ts">
import { createI18n } from '@vielzeug/i18nit';
import { ref, onMounted, onUnmounted } from 'vue';

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: { welcome: 'Welcome!' },
    es: { welcome: '¡Bienvenido!' },
  },
});

const locale = ref(i18n.getLocale());
let unsubscribe;
onMounted(() => (unsubscribe = i18n.subscribe((l) => (locale.value = l))));
onUnmounted(() => unsubscribe?.());
</script>

<template>
  <div>
    <h1>{{ i18n.t('welcome') }}</h1>
    <button @click="i18n.setLocale('es')">ES</button>
  </div>
</template>
```

```svelte [Svelte]
<script lang="ts">
  import { createI18n } from '@vielzeug/i18nit';
  import { onMount, onDestroy } from 'svelte';

  const i18n = createI18n({
    locale: 'en',
    messages: {
      en: { welcome: 'Welcome!' },
      es: { welcome: '¡Bienvenido!' }
    }
  });

  let locale = i18n.getLocale();
  const unsubscribe = i18n.subscribe(l => locale = l);
  onDestroy(unsubscribe);
</script>

<h1>{i18n.t('welcome')}</h1>
<button on:click={() => i18n.setLocale('es')}>ES</button>
```

```ts [Web Component]
import { createI18n } from '@vielzeug/i18nit';

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: { welcome: 'Welcome!' },
    es: { welcome: '¡Bienvenido!' },
  },
});

class i18nWelcome extends HTMLElement {
  connectedCallback() {
    this.render();
    i18n.subscribe(() => this.render());
  }

  render() {
    this.innerHTML = `
      <h1>${i18n.t('welcome')}</h1>
      <button id="btn">ES</button>
    `;
    this.querySelector('#btn').onclick = () => i18n.setLocale('es');
  }
}
customElements.define('i18n-welcome', i18nWelcome);
```

:::

### Advanced Integration (Hook/Store)

Recommended singleton pattern for global scope or complex apps.

::: code-group

```tsx [React]
// useI18n.ts
import { createI18n } from '@vielzeug/i18nit';
import { useEffect, useState } from 'react';

const i18n = createI18n({
  locale: 'en',
  loaders: {
    en: () => fetch('/en.json').then((r) => r.json()),
  },
});

export function useI18n() {
  const [, forceUpdate] = useState({});
  useEffect(() => i18n.subscribe(() => forceUpdate({})), []);
  return { t: i18n.t, setLocale: (l) => i18n.load(l).then(() => i18n.setLocale(l)) };
}

// Component.tsx
function Label() {
  const { t } = useI18n();
  return <span>{t('key')}</span>;
}
```

```vue [Vue 3]
// useI18n.ts import { createI18n } from '@vielzeug/i18nit'; import { ref, onMounted, onUnmounted } from 'vue'; const
i18n = createI18n({ locale: 'en', loaders: { en: () => fetch('/en.json').then(r => r.json()) }}); export function
useI18n() { const locale = ref(i18n.getLocale()); let sub; onMounted(() => sub = i18n.subscribe(l => locale.value = l));
onUnmounted(() => sub?.()); return { t: i18n.t, setLocale: (l) => i18n.load(l).then(() => i18n.setLocale(l)) }; } //
Component.vue
<script setup>
const { t } = useI18n();
</script>
<template>
  <span>{{ t('key') }}</span>
</template>
```

```svelte [Svelte]
// i18nStore.ts
import { createI18n } from '@vielzeug/i18nit';
import { writable } from 'svelte/store';

const i18n = createI18n({ locale: 'en', loaders: {
  en: () => fetch('/en.json').then(r => r.json())
}});

export const locale = writable(i18n.getLocale());
i18n.subscribe(l => locale.set(l));

export const t = i18n.t;
export const setLocale = (l) => i18n.load(l).then(() => i18n.setLocale(l));

// Component.svelte
<script>
  import { t } from './i18nStore';
</script>
<span>{$t('key')}</span>
```

```ts [Web Component]
// i18n.ts
import { createI18n } from '@vielzeug/i18nit';

export const i18n = createI18n({
  locale: 'en',
  loaders: {
    en: () => fetch('/en.json').then((r) => r.json()),
  },
});

// Component.ts
class i18nLabel extends HTMLElement {
  connectedCallback() {
    this.render();
    i18n.subscribe(() => this.render());
  }
  render() {
    this.textContent = i18n.t(this.getAttribute('key'));
  }
}
customElements.define('i18n-label', i18nLabel);
```

:::

## Array Handling

i18nit provides powerful array handling features for dynamic lists and collections using **Intl.ListFormat API** for automatic support of 100+ languages.

::: tip Intl.ListFormat
Array separators `{items|and}` and `{items|or}` use the browser's built-in Intl.ListFormat API which automatically handles proper grammar, conjunctions, and punctuation for 100+ languages. No manual configuration needed!
:::

### Shopping List Example

```ts
import { createI18n } from '@vielzeug/i18nit';

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      shopping: 'Shopping list: {items}',
      summary: 'You have {items.length} items in your cart',
      checkout: 'Ready to buy: {items|and}?',
    },
    es: {
      shopping: 'Lista de compras: {items}',
      summary: 'Tienes {items.length} artículos en tu carrito',
      checkout: '¿Listo para comprar: {items|and}?',
    },
  },
});

// Default comma separator
const cart = ['Apple', 'Banana', 'Orange'];
console.log(i18n.t('shopping', { items: cart }));
// "Shopping list: Apple, Banana, Orange"

// Array length
console.log(i18n.t('summary', { items: cart }));
// "You have 3 items in your cart"

// Natural "and" list (English uses Oxford comma)
console.log(i18n.t('checkout', { items: cart }));
// "Ready to buy: Apple, Banana, and Orange?"

// Spanish automatically uses "y"
i18n.setLocale('es');
console.log(i18n.t('checkout', { items: cart }));
// "¿Listo para comprar: Apple, Banana y Orange?"
```

### Guest List Example

```ts
const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      invited: 'Invited guests: {guests|and}',
      attending: '{attending.length} out of {invited.length} guests attending',
      empty: 'No guests invited yet',
    },
  },
});

// Multiple guests (with Oxford comma)
const guests = ['Alice', 'Bob', 'Charlie', 'Diana'];
console.log(i18n.t('invited', { guests }));
// "Invited guests: Alice, Bob, Charlie, and Diana"

// Two guests
console.log(i18n.t('invited', { guests: ['Alice', 'Bob'] }));
// "Invited guests: Alice and Bob"

// One guest
console.log(i18n.t('invited', { guests: ['Alice'] }));
// "Invited guests: Alice"

// Count comparison
console.log(
  i18n.t('attending', {
    invited: guests,
    attending: ['Alice', 'Charlie'],
  }),
);
// "2 out of 4 guests attending"
```

### File Path Example

```ts
const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      breadcrumb: '{path| > }',
      folder: 'Location: {folders| / }',
    },
  },
});

const folders = ['home', 'user', 'documents', 'work'];
console.log(i18n.t('breadcrumb', { path: folders }));
// "home > user > documents > work"

console.log(i18n.t('folder', { folders }));
// "Location: home / user / documents / work"
```

### Tags and Categories Example

```ts
const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      tags: 'Tags: {tags| • }',
      filter: 'Filtering by: {filters|or}',
      categories: '{categories.length} categories available',
    },
  },
});

// Custom separator
const tags = ['typescript', 'javascript', 'react', 'node'];
console.log(i18n.t('tags', { tags }));
// "Tags: typescript • javascript • react • node"

// "or" separator for choices (with Oxford comma)
const filters = ['Color: Red', 'Size: Large', 'Brand: Nike'];
console.log(i18n.t('filter', { filters }));
// "Filtering by: Color: Red, Size: Large, or Brand: Nike"

// Array length
const categories = ['Electronics', 'Clothing', 'Food', 'Books'];
console.log(i18n.t('categories', { categories }));
// "4 categories available"
```

### Safe Index Access

```ts
const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      firstItem: 'First: {items[0]}',
      lastItem: 'Last: {items[2]}',
      missing: 'Tenth: {items[10]}',
      mixed: 'Winner: {winners[0]}, Total: {winners.length}, All: {winners}',
    },
  },
});

const items = ['Gold', 'Silver', 'Bronze'];

// Safe access
console.log(i18n.t('firstItem', { items }));
// "First: Gold"

console.log(i18n.t('lastItem', { items }));
// "Last: Bronze"

// Out of bounds returns empty string (safe)
console.log(i18n.t('missing', { items }));
// "Tenth: "

// Combined features
console.log(i18n.t('mixed', { winners: items }));
// "Winner: Gold, Total: 3, All: Gold, Silver, Bronze"
```

### Complex Nested Arrays

```ts
const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      userItems: '{user.name} has {user.items.length} items: {user.items}',
      orderSummary: 'Order #{order.id}: {order.items|and} (Total: {order.items.length} items)',
    },
  },
});

// Nested object with array
const data = {
  user: {
    name: 'Alice',
    items: ['Book', 'Pen', 'Notebook', 'Laptop'],
  },
};

console.log(i18n.t('userItems', data));
// "Alice has 4 items: Book, Pen, Notebook, Laptop"

// Order summary
const order = {
  order: {
    id: '12345',
    items: ['Laptop', 'Mouse', 'Keyboard'],
  },
};

console.log(i18n.t('orderSummary', order));
// "Order #12345: Laptop, Mouse, and Keyboard (Total: 3 items)"
```

## E-commerce Application

Complete e-commerce example with product listings, cart, and checkout.

::: code-group

```tsx [React]
import { createI18n } from '@vielzeug/i18nit';
import { useState, useEffect } from 'react';

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: { title: 'Shop', cart: 'Cart ({count})' },
    es: { title: 'Tienda', cart: 'Carrito ({count})' },
  },
});

function EcommerceApp() {
  const [cart, setCart] = useState([]);
  const [, forceUpdate] = useState({});
  useEffect(() => i18n.subscribe(() => forceUpdate({})), []);

  return (
    <div>
      <h1>{i18n.t('title')}</h1>
      <p>{i18n.t('cart', { count: cart.length })}</p>
      <button onClick={() => setCart([...cart, {}])}>Add to Cart</button>
      <button onClick={() => i18n.setLocale('es')}>ES</button>
    </div>
  );
}
```

```vue [Vue 3]
<script setup lang="ts">
import { createI18n } from '@vielzeug/i18nit';
import { ref, onMounted, onUnmounted } from 'vue';

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: { title: 'Shop', cart: 'Cart ({count})' },
    es: { title: 'Tienda', cart: 'Carrito ({count})' },
  },
});

const cart = ref([]);
const locale = ref(i18n.getLocale());
let unsubscribe;
onMounted(() => (unsubscribe = i18n.subscribe((l) => (locale.value = l))));
onUnmounted(() => unsubscribe?.());
</script>

<template>
  <div>
    <h1>{{ i18n.t('title') }}</h1>
    <p>{{ i18n.t('cart', { count: cart.length }) }}</p>
    <button @click="cart.push({})">Add to Cart</button>
    <button @click="i18n.setLocale('es')">ES</button>
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
      en: { title: 'Shop', cart: 'Cart ({count})' },
      es: { title: 'Tienda', cart: 'Carrito ({count})' }
    }
  });

  let cart = [];
  let locale = i18n.getLocale();
  const unsubscribe = i18n.subscribe(l => locale = l);
  onDestroy(unsubscribe);
</script>

<h1>{i18n.t('title')}</h1>
<p>{i18n.t('cart', { count: cart.length })}</p>
<button on:click={() => cart = [...cart, {}]}>Add to Cart</button>
<button on:click={() => i18n.setLocale('es')}>ES</button>
```

```ts [Web Component]
import { createI18n } from '@vielzeug/i18nit';

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: { title: 'Shop', cart: 'Cart ({count})' },
    es: { title: 'Tienda', cart: 'Carrito ({count})' },
  },
});

class EcommerceApp extends HTMLElement {
  #cart = [];
  connectedCallback() {
    this.render();
    i18n.subscribe(() => this.render());
  }
  render() {
    this.innerHTML = `
      <h1>${i18n.t('title')}</h1>
      <p>${i18n.t('cart', { count: this.#cart.length })}</p>
      <button id="add">Add to Cart</button>
      <button id="es">ES</button>
    `;
    this.querySelector('#add').onclick = () => {
      this.#cart.push({});
      this.render();
    };
    this.querySelector('#es').onclick = () => i18n.setLocale('es');
  }
}
customElements.define('ecommerce-app', EcommerceApp);
```

:::

## Dashboard with Multi-Language

Dashboard with statistics and dynamic content.

::: code-group

```tsx [React]
import { createI18n } from '@vielzeug/i18nit';
import { useState, useEffect } from 'react';

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: { title: 'Dashboard', stats: 'Users: {count}' },
    es: { title: 'Panel', stats: 'Usuarios: {count}' },
  },
});

function Dashboard() {
  const [, forceUpdate] = useState({});
  useEffect(() => i18n.subscribe(() => forceUpdate({})), []);

  return (
    <div>
      <h1>{i18n.t('title')}</h1>
      <p>{i18n.t('stats', { count: 1234 })}</p>
      <button onClick={() => i18n.setLocale('es')}>ES</button>
    </div>
  );
}
```

```vue [Vue 3]
<script setup lang="ts">
import { createI18n } from '@vielzeug/i18nit';
import { ref, onMounted, onUnmounted } from 'vue';

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: { title: 'Dashboard', stats: 'Users: {count}' },
    es: { title: 'Panel', stats: 'Usuarios: {count}' },
  },
});

const locale = ref(i18n.getLocale());
let unsubscribe;
onMounted(() => (unsubscribe = i18n.subscribe((l) => (locale.value = l))));
onUnmounted(() => unsubscribe?.());
</script>

<template>
  <div>
    <h1>{{ i18n.t('title') }}</h1>
    <p>{{ i18n.t('stats', { count: 1234 }) }}</p>
    <button @click="i18n.setLocale('es')">ES</button>
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
      en: { title: 'Dashboard', stats: 'Users: {count}' },
      es: { title: 'Panel', stats: 'Usuarios: {count}' }
    }
  });

  let locale = i18n.getLocale();
  const unsubscribe = i18n.subscribe(l => locale = l);
  onDestroy(unsubscribe);
</script>

<h1>{i18n.t('title')}</h1>
<p>{i18n.t('stats', { count: 1234 })}</p>
<button on:click={() => i18n.setLocale('es')}>ES</button>
```

```ts [Web Component]
import { createI18n } from '@vielzeug/i18nit';

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: { title: 'Dashboard', stats: 'Users: {count}' },
    es: { title: 'Panel', stats: 'Usuarios: {count}' },
  },
});

class Dashboard extends HTMLElement {
  connectedCallback() {
    this.render();
    i18n.subscribe(() => this.render());
  }
  render() {
    this.innerHTML = `
      <h1>${i18n.t('title')}</h1>
      <p>${i18n.t('stats', { count: 1234 })}</p>
      <button id="es">ES</button>
    `;
    this.querySelector('#es').onclick = () => i18n.setLocale('es');
  }
}
customElements.define('dashboard-view', Dashboard);
```

:::

## Authentication System

Complete authentication flow with validation messages.

::: code-group

```tsx [React]
import { createI18n } from '@vielzeug/i18nit';
import { useState, useEffect } from 'react';

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: { login: 'Login', error: 'Invalid credentials' },
    es: { login: 'Iniciar sesión', error: 'Credenciales inválidas' },
  },
});

function AuthForm() {
  const [error, setError] = useState('');
  const [, forceUpdate] = useState({});
  useEffect(() => i18n.subscribe(() => forceUpdate({})), []);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(i18n.t('error'));
      }}>
      <h1>{i18n.t('login')}</h1>
      {error && <p>{error}</p>}
      <button type="submit">{i18n.t('login')}</button>
      <button type="button" onClick={() => i18n.setLocale('es')}>
        ES
      </button>
    </form>
  );
}
```

```vue [Vue 3]
<script setup lang="ts">
import { createI18n } from '@vielzeug/i18nit';
import { ref, onMounted, onUnmounted } from 'vue';

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: { login: 'Login', error: 'Invalid credentials' },
    es: { login: 'Iniciar sesión', error: 'Credenciales inválidas' },
  },
});

const error = ref('');
const locale = ref(i18n.getLocale());
let unsubscribe;
onMounted(() => (unsubscribe = i18n.subscribe((l) => (locale.value = l))));
onUnmounted(() => unsubscribe?.());
</script>

<template>
  <form @submit.prevent="error = i18n.t('error')">
    <h1>{{ i18n.t('login') }}</h1>
    <p v-if="error">{{ error }}</p>
    <button type="submit">{{ i18n.t('login') }}</button>
    <button type="button" @click="i18n.setLocale('es')">ES</button>
  </form>
</template>
```

```svelte [Svelte]
<script lang="ts">
  import { createI18n } from '@vielzeug/i18nit';
  import { onDestroy } from 'svelte';

  const i18n = createI18n({
    locale: 'en',
    messages: {
      en: { login: 'Login', error: 'Invalid credentials' },
      es: { login: 'Iniciar sesión', error: 'Credenciales inválidas' }
    }
  });

  let error = '';
  let locale = i18n.getLocale();
  const unsubscribe = i18n.subscribe(l => locale = l);
  onDestroy(unsubscribe);
</script>

<form on:submit|preventDefault={() => error = i18n.t('error')}>
  <h1>{i18n.t('login')}</h1>
  {#if error}<p>{error}</p>{/if}
  <button type="submit">{i18n.t('login')}</button>
  <button type="button" on:click={() => i18n.setLocale('es')}>ES</button>
</form>
```

```ts [Web Component]
import { createI18n } from '@vielzeug/i18nit';

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: { login: 'Login', error: 'Invalid credentials' },
    es: { login: 'Iniciar sesión', error: 'Credenciales inválidas' },
  },
});

class AuthForm extends HTMLElement {
  #error = '';
  connectedCallback() {
    this.render();
    i18n.subscribe(() => this.render());
  }
  render() {
    this.innerHTML = `
      <form>
        <h1>${i18n.t('login')}</h1>
        ${this.#error ? `<p>${this.#error}</p>` : ''}
        <button type="submit">${i18n.t('login')}</button>
        <button type="button" id="es">ES</button>
      </form>
    `;
    this.querySelector('form').onsubmit = (e) => {
      e.preventDefault();
      this.#error = i18n.t('error');
      this.render();
    };
    this.querySelector('#es').onclick = () => i18n.setLocale('es');
  }
}
customElements.define('auth-form', AuthForm);
```

:::

---

For more API details, see [API Reference](./api.md). For usage patterns, see [Usage Guide](./usage.md).
