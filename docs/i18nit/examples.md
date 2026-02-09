# i18nit Examples

Real-world examples demonstrating common use cases and patterns with i18nit.

::: tip 💡 Complete Applications
These are complete, production-ready application examples. For API reference and basic usage, see [Usage Guide](./usage.md).
:::

## Table of Contents

- [Framework Integration Examples](#framework-integration-examples)
  - [React](#react)
  - [Vue 3](#vue-3)
  - [Svelte](#svelte)
- [E-commerce Application](#e-commerce-application)
- [Dashboard with Multi-Language](#dashboard-with-multi-language)
- [Authentication System](#authentication-system)
- [Blog Platform](#blog-platform)
- [Admin Panel](#admin-panel)
- [Real-time Chat](#real-time-chat)
- [Settings Page](#settings-page)

## Framework Integration Examples

::: details 🎯 Why Two Patterns?
We provide both **inline** and **hook/composable** patterns because:
- **Inline**: Quick prototyping, simple components
- **Hook/Composable**: Reusable across components, better separation of concerns

Choose based on your project structure and team preferences.
:::

Complete examples showing how to integrate i18nit with React, Vue, and Svelte. Each framework has two patterns: inline usage and reusable hook/composable.

### React

::: warning ⚠️ React-Specific Considerations
- Create i18n instance outside component to avoid re-creation
- Use `useEffect` to subscribe/unsubscribe properly
- Consider using Context API for larger applications
:::

#### Inline Component Usage

```tsx
import { createI18n } from '@vielzeug/i18nit';
import { useEffect, useState } from 'react';

// Create instance outside component
const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      title: 'Welcome to our App',
      description: 'This is a multilingual application',
      greeting: 'Hello, {name}!',
      items: {
        zero: 'No items',
        one: 'One item',
        other: '{count} items',
      },
      selectLanguage: 'Select Language:',
    },
    es: {
      title: 'Bienvenido a nuestra aplicación',
      description: 'Esta es una aplicación multilingüe',
      greeting: '¡Hola, {name}!',
      items: {
        zero: 'Sin artículos',
        one: 'Un artículo',
        other: '{count} artículos',
      },
      selectLanguage: 'Seleccionar idioma:',
    },
    fr: {
      title: 'Bienvenue dans notre application',
      description: 'Ceci est une application multilingue',
      greeting: 'Bonjour, {name}!',
      items: {
        zero: 'Aucun article',
        one: 'Un article',
        other: '{count} articles',
      },
      selectLanguage: 'Choisir la langue:',
    },
  },
});

function App() {
  const [locale, setLocale] = useState(i18n.getLocale());
  const [, forceUpdate] = useState({});
  const [itemCount, setItemCount] = useState(0);

  useEffect(() => {
    return i18n.subscribe((newLocale) => {
      setLocale(newLocale);
      forceUpdate({});
    });
  }, []);

  const handleLocaleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.setLocale(e.target.value);
  };

  return (
    <div className="app">
      <header>
        <h1>{i18n.t('title')}</h1>
        <p>{i18n.t('description')}</p>

        <div className="language-selector">
          <label>{i18n.t('selectLanguage')}</label>
          <select value={locale} onChange={handleLocaleChange}>
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
          </select>
        </div>
      </header>

      <main>
        <section>
          <h2>{i18n.t('greeting', { name: 'User' })}</h2>
          <p>{i18n.t('items', { count: itemCount })}</p>

          <div className="controls">
            <button onClick={() => setItemCount(itemCount + 1)}>+</button>
            <button onClick={() => setItemCount(Math.max(0, itemCount - 1))}>-</button>
            <button onClick={() => setItemCount(0)}>Reset</button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
```

#### Reusable Hook Pattern

```tsx
// hooks/useI18n.ts
import { createI18n } from '@vielzeug/i18nit';
import { useEffect, useState, useCallback } from 'react';

// Create singleton instance
const i18n = createI18n({
  locale: 'en',
  loaders: {
    en: async () => (await import('../locales/en.json')).default,
    es: async () => (await import('../locales/es.json')).default,
    fr: async () => (await import('../locales/fr.json')).default,
  },
});

export function useI18n() {
  const [locale, setLocaleState] = useState(i18n.getLocale());
  const [, forceUpdate] = useState({});

  useEffect(() => {
    return i18n.subscribe((newLocale) => {
      setLocaleState(newLocale);
      forceUpdate({});
    });
  }, []);

  const setLocale = useCallback(async (newLocale: string) => {
    await i18n.load(newLocale);
    i18n.setLocale(newLocale);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, unknown>, options?: any) => {
      return i18n.t(key, vars, options);
    },
    [locale] // Re-create when locale changes
  );

  return {
    t,
    locale,
    setLocale,
    i18n,
  };
}

// Component.tsx
import { useI18n } from './hooks/useI18n';

function ProductList() {
  const { t, locale, setLocale } = useI18n();
  const [products] = useState([
    { id: 1, name: 'Product 1', price: 29.99 },
    { id: 2, name: 'Product 2', price: 49.99 },
  ]);

  return (
    <div>
      <h2>{t('products.title')}</h2>
      <p>{t('products.count', { count: products.length })}</p>

      {products.map((product) => (
        <div key={product.id}>
          <h3>{product.name}</h3>
          <p>{t('products.price', { amount: product.price })}</p>
        </div>
      ))}

      <select value={locale} onChange={(e) => setLocale(e.target.value)}>
        <option value="en">English</option>
        <option value="es">Español</option>
      </select>
    </div>
  );
}
```

### Vue 3

::: warning ⚠️ Vue-Specific Considerations
- Use `ref` or `reactive` for locale state
- Use `computed` for reactive translations
- Consider using `provide/inject` for global access
:::

#### Inline Component Usage

```vue
<script setup lang="ts">
import { createI18n } from '@vielzeug/i18nit';
import { ref, onMounted, onUnmounted } from 'vue';

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      title: 'My Application',
      welcome: 'Welcome, {name}!',
      users: {
        zero: 'No users',
        one: 'One user',
        other: '{count} users',
      },
      status: {
        online: 'Online',
        offline: 'Offline',
      },
    },
    es: {
      title: 'Mi Aplicación',
      welcome: '¡Bienvenido, {name}!',
      users: {
        zero: 'Sin usuarios',
        one: 'Un usuario',
        other: '{count} usuarios',
      },
      status: {
        online: 'En línea',
        offline: 'Desconectado',
      },
    },
  },
});

const locale = ref(i18n.getLocale());
const userName = ref('Alice');
const userCount = ref(5);
const isOnline = ref(true);
let unsubscribe: (() => void) | undefined;

onMounted(() => {
  unsubscribe = i18n.subscribe((newLocale) => {
    locale.value = newLocale;
  });
});

onUnmounted(() => {
  unsubscribe?.();
});

const changeLocale = (newLocale: string) => {
  i18n.setLocale(newLocale);
};

const t = (key: string, vars?: Record<string, unknown>) => {
  return i18n.t(key, vars);
};
</script>

<template>
  <div class="app">
    <header>
      <h1>{{ t('title') }}</h1>

      <div class="language-selector">
        <button
          v-for="lang in ['en', 'es']"
          :key="lang"
          :class="{ active: locale === lang }"
          @click="changeLocale(lang)"
        >
          {{ lang.toUpperCase() }}
        </button>
      </div>
    </header>

    <main>
      <h2>{{ t('welcome', { name: userName }) }}</h2>
      <p>{{ t('users', { count: userCount }) }}</p>
      <p>
        {{ t('status.online') }} /
        {{ t('status.offline') }}
      </p>

      <div class="controls">
        <input v-model="userName" placeholder="Enter name" />
        <input v-model.number="userCount" type="number" min="0" />
        <label>
          <input v-model="isOnline" type="checkbox" />
          {{ isOnline ? t('status.online') : t('status.offline') }}
        </label>
      </div>
    </main>
  </div>
</template>
```

#### Reusable Composable Pattern

```ts
// composables/useI18n.ts
import { createI18n } from '@vielzeug/i18nit';
import { ref, onMounted, onUnmounted } from 'vue';

const i18n = createI18n({
  locale: 'en',
  loaders: {
    en: async () => (await import('../locales/en.json')).default,
    es: async () => (await import('../locales/es.json')).default,
    fr: async () => (await import('../locales/fr.json')).default,
  },
});

export function useI18n() {
  const locale = ref(i18n.getLocale());
  let unsubscribe: (() => void) | undefined;

  onMounted(() => {
    unsubscribe = i18n.subscribe((newLocale) => {
      locale.value = newLocale;
    });
  });

  onUnmounted(() => {
    unsubscribe?.();
  });

  const setLocale = async (newLocale: string) => {
    await i18n.load(newLocale);
    i18n.setLocale(newLocale);
  };

  const t = (key: string, vars?: Record<string, unknown>, options?: any) => {
    return i18n.t(key, vars, options);
  };

  const tl = async (key: string, vars?: Record<string, unknown>, options?: any) => {
    return i18n.tl(key, vars, options);
  };

  return {
    t,
    tl,
    locale,
    setLocale,
    i18n,
  };
}

// Component.vue
<script setup lang="ts">
import { useI18n } from './composables/useI18n';
import { ref } from 'vue';

const { t, locale, setLocale } = useI18n();
const products = ref([
  { id: 1, name: t('products.item1'), price: 29.99 },
  { id: 2, name: t('products.item2'), price: 49.99 },
]);
</script>

<template>
  <div>
    <h2>{{ t('products.title') }}</h2>
    <p>{{ t('products.count', { count: products.length }) }}</p>

    <div v-for="product in products" :key="product.id">
      <h3>{{ product.name }}</h3>
      <p>{{ t('products.price', { amount: product.price }) }}</p>
    </div>
  </div>
</template>
```

### Svelte

::: warning ⚠️ Svelte-Specific Considerations
- Use stores for reactive locale state
- Use `onMount` and `onDestroy` for lifecycle management
- Consider creating a custom store for i18n
:::

#### Inline Component Usage

```svelte
<script lang="ts">
  import { createI18n } from '@vielzeug/i18nit';
  import { onMount, onDestroy } from 'svelte';

  const i18n = createI18n({
    locale: 'en',
    messages: {
      en: {
        title: 'Todo Application',
        addTask: 'Add Task',
        tasks: {
          zero: 'No tasks',
          one: 'One task',
          other: '{count} tasks',
        },
        placeholder: 'Enter task description',
        completed: 'Completed',
        pending: 'Pending',
      },
      es: {
        title: 'Aplicación de Tareas',
        addTask: 'Agregar Tarea',
        tasks: {
          zero: 'Sin tareas',
          one: 'Una tarea',
          other: '{count} tareas',
        },
        placeholder: 'Ingrese descripción de la tarea',
        completed: 'Completado',
        pending: 'Pendiente',
      },
    },
  });

  let locale = i18n.getLocale();
  let unsubscribe: (() => void) | undefined;
  let taskText = '';
  let tasks: Array<{ id: number; text: string; completed: boolean }> = [];

  onMount(() => {
    unsubscribe = i18n.subscribe((newLocale) => {
      locale = newLocale;
    });
  });

  onDestroy(() => {
    unsubscribe?.();
  });

  function addTask() {
    if (taskText.trim()) {
      tasks = [...tasks, { id: Date.now(), text: taskText, completed: false }];
      taskText = '';
    }
  }

  function toggleTask(id: number) {
    tasks = tasks.map((task) =>
      task.id === id ? { ...task, completed: !task.completed } : task
    );
  }

  $: completedCount = tasks.filter((t) => t.completed).length;
  $: pendingCount = tasks.length - completedCount;
</script>

<div class="app">
  <header>
    <h1>{i18n.t('title')}</h1>

    <select bind:value={locale} on:change={(e) => i18n.setLocale(e.target.value)}>
      <option value="en">English</option>
      <option value="es">Español</option>
    </select>
  </header>

  <main>
    <div class="add-task">
      <input
        bind:value={taskText}
        placeholder={i18n.t('placeholder')}
        on:keypress={(e) => e.key === 'Enter' && addTask()}
      />
      <button on:click={addTask}>{i18n.t('addTask')}</button>
    </div>

    <div class="stats">
      <p>{i18n.t('tasks', { count: tasks.length })}</p>
      <p>{i18n.t('completed')}: {completedCount}</p>
      <p>{i18n.t('pending')}: {pendingCount}</p>
    </div>

    <ul>
      {#each tasks as task}
        <li class:completed={task.completed}>
          <input type="checkbox" checked={task.completed} on:change={() => toggleTask(task.id)} />
          <span>{task.text}</span>
        </li>
      {/each}
    </ul>
  </main>
</div>

<style>
  .completed {
    text-decoration: line-through;
    opacity: 0.6;
  }
</style>
```

#### Reusable Store Pattern

```ts
// stores/i18n.ts
import { createI18n } from '@vielzeug/i18nit';
import { writable } from 'svelte/store';

const i18nInstance = createI18n({
  locale: 'en',
  loaders: {
    en: async () => (await import('../locales/en.json')).default,
    es: async () => (await import('../locales/es.json')).default,
  },
});

function createI18nStore() {
  const { subscribe, set } = writable(i18nInstance.getLocale());

  i18nInstance.subscribe((locale) => {
    set(locale);
  });

  return {
    subscribe,
    setLocale: async (locale: string) => {
      await i18nInstance.load(locale);
      i18nInstance.setLocale(locale);
    },
    t: (key: string, vars?: Record<string, unknown>, options?: any) => {
      return i18nInstance.t(key, vars, options);
    },
    tl: async (key: string, vars?: Record<string, unknown>, options?: any) => {
      return i18nInstance.tl(key, vars, options);
    },
  };
}

export const i18n = createI18nStore();

// Component.svelte
<script lang="ts">
  import { i18n } from './stores/i18n';

  let products = [
    { id: 1, name: 'Product 1', price: 29.99 },
    { id: 2, name: 'Product 2', price: 49.99 },
  ];
</script>

<div>
  <h2>{$i18n.t('products.title')}</h2>
  <p>{$i18n.t('products.count', { count: products.length })}</p>

  {#each products as product}
    <div>
      <h3>{product.name}</h3>
      <p>{$i18n.t('products.price', { amount: product.price })}</p>
    </div>
  {/each}

  <select value={$i18n} on:change={(e) => i18n.setLocale(e.target.value)}>
    <option value="en">English</option>
    <option value="es">Español</option>
  </select>
</div>
```

---

## E-commerce Application

Complete e-commerce example with product listings, cart, and checkout.

```tsx
import { createI18n } from '@vielzeug/i18nit';
import { useEffect, useState } from 'react';

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      shop: {
        title: 'Our Products',
        search: 'Search products...',
        addToCart: 'Add to Cart',
        cart: 'Shopping Cart',
        items: {
          zero: 'Your cart is empty',
          one: '1 item in cart',
          other: '{count} items in cart',
        },
        total: 'Total: {amount}',
        checkout: 'Checkout',
        price: (vars, helpers) => {
          const amount = vars.amount as number;
          return helpers.number(amount, { style: 'currency', currency: 'USD' });
        },
      },
    },
    es: {
      shop: {
        title: 'Nuestros Productos',
        search: 'Buscar productos...',
        addToCart: 'Agregar al Carrito',
        cart: 'Carrito de Compras',
        items: {
          zero: 'Tu carrito está vacío',
          one: '1 artículo en el carrito',
          other: '{count} artículos en el carrito',
        },
        total: 'Total: {amount}',
        checkout: 'Finalizar Compra',
        price: (vars, helpers) => {
          const amount = vars.amount as number;
          return helpers.number(amount, { style: 'currency', currency: 'USD' });
        },
      },
    },
  },
});

interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
}

function EcommerceApp() {
  const [locale, setLocale] = useState(i18n.getLocale());
  const [, forceUpdate] = useState({});
  const [cart, setCart] = useState<Array<Product & { quantity: number }>>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const products: Product[] = [
    { id: 1, name: 'Laptop', price: 999.99, image: '/laptop.jpg' },
    { id: 2, name: 'Mouse', price: 29.99, image: '/mouse.jpg' },
    { id: 3, name: 'Keyboard', price: 79.99, image: '/keyboard.jpg' },
    { id: 4, name: 'Monitor', price: 299.99, image: '/monitor.jpg' },
  ];

  useEffect(() => {
    return i18n.subscribe((newLocale) => {
      setLocale(newLocale);
      forceUpdate({});
    });
  }, []);

  const shop = i18n.namespace('shop');

  const addToCart = (product: Product) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id);
      if (existing) {
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="ecommerce-app">
      <header>
        <h1>{shop.t('title')}</h1>
        <select value={locale} onChange={(e) => i18n.setLocale(e.target.value)}>
          <option value="en">English</option>
          <option value="es">Español</option>
        </select>
      </header>

      <div className="search">
        <input
          type="text"
          placeholder={shop.t('search')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="products-grid">
        {filteredProducts.map((product) => (
          <div key={product.id} className="product-card">
            <img src={product.image} alt={product.name} />
            <h3>{product.name}</h3>
            <p className="price">{shop.t('price', { amount: product.price })}</p>
            <button onClick={() => addToCart(product)}>{shop.t('addToCart')}</button>
          </div>
        ))}
      </div>

      <div className="cart-summary">
        <h2>{shop.t('cart')}</h2>
        <p>{shop.t('items', { count: totalItems })}</p>
        {totalItems > 0 && (
          <>
            <p className="total">{shop.t('total', { amount: totalAmount })}</p>
            <button className="checkout">{shop.t('checkout')}</button>
          </>
        )}
      </div>
    </div>
  );
}

export default EcommerceApp;
```

---

## Dashboard with Multi-Language

Dashboard with statistics and dynamic content.

```tsx
import { createI18n } from '@vielzeug/i18nit';
import { useEffect, useState } from 'react';

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      dashboard: {
        title: 'Analytics Dashboard',
        overview: 'Overview',
        stats: {
          users: 'Total Users',
          revenue: 'Revenue',
          orders: 'Orders',
          growth: 'Growth',
        },
        period: {
          today: 'Today',
          week: 'This Week',
          month: 'This Month',
          year: 'This Year',
        },
        updated: (vars, helpers) => {
          const date = vars.date as Date;
          return `Last updated: ${helpers.date(date, { dateStyle: 'medium', timeStyle: 'short' })}`;
        },
        revenue: (vars, helpers) => {
          const amount = vars.amount as number;
          return helpers.number(amount, { style: 'currency', currency: 'USD' });
        },
        percentage: (vars, helpers) => {
          const value = vars.value as number;
          return helpers.number(value / 100, { style: 'percent', maximumFractionDigits: 1 });
        },
      },
    },
    es: {
      dashboard: {
        title: 'Panel de Análisis',
        overview: 'Resumen',
        stats: {
          users: 'Usuarios Totales',
          revenue: 'Ingresos',
          orders: 'Pedidos',
          growth: 'Crecimiento',
        },
        period: {
          today: 'Hoy',
          week: 'Esta Semana',
          month: 'Este Mes',
          year: 'Este Año',
        },
        updated: (vars, helpers) => {
          const date = vars.date as Date;
          return `Última actualización: ${helpers.date(date, { dateStyle: 'medium', timeStyle: 'short' })}`;
        },
        revenue: (vars, helpers) => {
          const amount = vars.amount as number;
          return helpers.number(amount, { style: 'currency', currency: 'USD' });
        },
        percentage: (vars, helpers) => {
          const value = vars.value as number;
          return helpers.number(value / 100, { style: 'percent', maximumFractionDigits: 1 });
        },
      },
    },
  },
});

function Dashboard() {
  const [locale, setLocale] = useState(i18n.getLocale());
  const [, forceUpdate] = useState({});
  const [lastUpdate] = useState(new Date());

  const stats = {
    users: 12543,
    revenue: 284950.32,
    orders: 1847,
    growth: 12.5,
  };

  useEffect(() => {
    return i18n.subscribe((newLocale) => {
      setLocale(newLocale);
      forceUpdate({});
    });
  }, []);

  const dash = i18n.namespace('dashboard');

  return (
    <div className="dashboard">
      <header>
        <h1>{dash.t('title')}</h1>
        <select value={locale} onChange={(e) => i18n.setLocale(e.target.value)}>
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="fr">Français</option>
        </select>
      </header>

      <div className="overview">
        <h2>{dash.t('overview')}</h2>
        <p className="last-updated">{dash.t('updated', { date: lastUpdate })}</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>{dash.t('stats.users')}</h3>
          <p className="stat-value">{i18n.number(stats.users)}</p>
          <p className="stat-change positive">{dash.t('percentage', { value: stats.growth })}</p>
        </div>

        <div className="stat-card">
          <h3>{dash.t('stats.revenue')}</h3>
          <p className="stat-value">{dash.t('revenue', { amount: stats.revenue })}</p>
          <p className="stat-change positive">{dash.t('percentage', { value: stats.growth })}</p>
        </div>

        <div className="stat-card">
          <h3>{dash.t('stats.orders')}</h3>
          <p className="stat-value">{i18n.number(stats.orders)}</p>
          <p className="stat-change positive">{dash.t('percentage', { value: stats.growth })}</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
```

---

## Authentication System

Complete authentication flow with validation messages.

```tsx
import { createI18n } from '@vielzeug/i18nit';
import { useState, useEffect } from 'react';

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      auth: {
        login: {
          title: 'Sign In',
          email: 'Email',
          password: 'Password',
          submit: 'Login',
          forgotPassword: 'Forgot Password?',
          noAccount: "Don't have an account?",
          signUp: 'Sign Up',
        },
        register: {
          title: 'Create Account',
          name: 'Full Name',
          email: 'Email',
          password: 'Password',
          confirmPassword: 'Confirm Password',
          submit: 'Create Account',
          hasAccount: 'Already have an account?',
          signIn: 'Sign In',
        },
        errors: {
          required: '{field} is required',
          invalidEmail: 'Invalid email address',
          passwordLength: 'Password must be at least {min} characters',
          passwordMatch: 'Passwords do not match',
          loginFailed: 'Invalid email or password',
        },
        success: {
          login: 'Login successful!',
          register: 'Account created successfully!',
        },
      },
    },
    es: {
      auth: {
        login: {
          title: 'Iniciar Sesión',
          email: 'Correo Electrónico',
          password: 'Contraseña',
          submit: 'Iniciar Sesión',
          forgotPassword: '¿Olvidaste tu contraseña?',
          noAccount: '¿No tienes una cuenta?',
          signUp: 'Registrarse',
        },
        register: {
          title: 'Crear Cuenta',
          name: 'Nombre Completo',
          email: 'Correo Electrónico',
          password: 'Contraseña',
          confirmPassword: 'Confirmar Contraseña',
          submit: 'Crear Cuenta',
          hasAccount: '¿Ya tienes una cuenta?',
          signIn: 'Iniciar Sesión',
        },
        errors: {
          required: '{field} es requerido',
          invalidEmail: 'Dirección de correo inválida',
          passwordLength: 'La contraseña debe tener al menos {min} caracteres',
          passwordMatch: 'Las contraseñas no coinciden',
          loginFailed: 'Correo o contraseña inválidos',
        },
        success: {
          login: '¡Inicio de sesión exitoso!',
          register: '¡Cuenta creada exitosamente!',
        },
      },
    },
  },
});

function AuthForm() {
  const [locale, setLocale] = useState(i18n.getLocale());
  const [, forceUpdate] = useState({});
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    return i18n.subscribe((newLocale) => {
      setLocale(newLocale);
      forceUpdate({});
    });
  }, []);

  const auth = i18n.namespace('auth');
  const section = isLogin ? auth.namespace('login') : auth.namespace('register');
  const errorNs = auth.namespace('errors');

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!isLogin && !formData.name) {
      newErrors.name = errorNs.t('required', { field: section.t('name') });
    }

    if (!formData.email) {
      newErrors.email = errorNs.t('required', { field: section.t('email') });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = errorNs.t('invalidEmail');
    }

    if (!formData.password) {
      newErrors.password = errorNs.t('required', { field: section.t('password') });
    } else if (formData.password.length < 8) {
      newErrors.password = errorNs.t('passwordLength', { min: 8 });
    }

    if (!isLogin) {
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = errorNs.t('required', { field: section.t('confirmPassword') });
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = errorNs.t('passwordMatch');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (!validate()) return;

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const successKey = isLogin ? 'auth.success.login' : 'auth.success.register';
      setMessage(i18n.t(successKey));
      setFormData({ name: '', email: '', password: '', confirmPassword: '' });
      setErrors({});
    } catch (error) {
      setMessage(errorNs.t('loginFailed'));
    }
  };

  return (
    <div className="auth-container">
      <div className="language-selector">
        <button onClick={() => i18n.setLocale('en')} className={locale === 'en' ? 'active' : ''}>
          EN
        </button>
        <button onClick={() => i18n.setLocale('es')} className={locale === 'es' ? 'active' : ''}>
          ES
        </button>
      </div>

      <div className="auth-form">
        <h2>{section.t('title')}</h2>

        {message && <div className="message success">{message}</div>}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label>{section.t('name')}</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={errors.name ? 'error' : ''}
              />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>
          )}

          <div className="form-group">
            <label>{section.t('email')}</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={errors.email ? 'error' : ''}
            />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label>{section.t('password')}</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className={errors.password ? 'error' : ''}
            />
            {errors.password && <span className="error-text">{errors.password}</span>}
          </div>

          {!isLogin && (
            <div className="form-group">
              <label>{section.t('confirmPassword')}</label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className={errors.confirmPassword ? 'error' : ''}
              />
              {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
            </div>
          )}

          <button type="submit" className="submit-btn">
            {section.t('submit')}
          </button>
        </form>

        {isLogin && (
          <div className="auth-footer">
            <a href="#forgot">{section.t('forgotPassword')}</a>
            <p>
              {section.t('noAccount')}{' '}
              <a href="#signup" onClick={(e) => { e.preventDefault(); setIsLogin(false); }}>
                {section.t('signUp')}
              </a>
            </p>
          </div>
        )}

        {!isLogin && (
          <div className="auth-footer">
            <p>
              {section.t('hasAccount')}{' '}
              <a href="#signin" onClick={(e) => { e.preventDefault(); setIsLogin(true); }}>
                {section.t('signIn')}
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AuthForm;
```

---

For more API details, see [API Reference](./api.md). For usage patterns, see [Usage Guide](./usage.md).

