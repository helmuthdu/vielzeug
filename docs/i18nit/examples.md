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
