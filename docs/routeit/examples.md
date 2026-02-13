# Routeit Examples

Real-world examples demonstrating common use cases and patterns with Routeit.

::: tip 💡 Complete Applications
These are complete, production-ready application examples. For API reference and basic usage, see [Usage Guide](./usage.md).
:::

## Table of Contents

[[toc]]

## Framework Integration

::: details 🎯 Why Two Patterns?
We provide both **inline** and **hook/composable** patterns because:

- **Inline**: Quick prototyping, global router instance
- **Hook/Composable**: Reactive integration, component-scoped state

Choose based on your project structure and team preferences.
:::

Complete examples showing how to integrate Routeit with React, Vue, Svelte, and Web Components.

### Basic Integration (Inline)

Directly create and use a router instance.

::: code-group

```tsx [React]
import { createRouter } from '@vielzeug/routeit';
import { useState, useEffect } from 'react';

const router = createRouter();

router
  .get('/', () => ({ view: 'home' }))
  .get('/about', () => ({ view: 'about' }))
  .get('/users/:id', ({ params }) => ({ view: 'user', id: params.id }))
  .start();

function App() {
  const [route, setRoute] = useState({ view: 'home' });

  useEffect(() => {
    return router.subscribe(() => {
      setRoute({ ...router.getState() });
    });
  }, []);

  return (
    <div>
      <nav>
        <button onClick={() => router.navigate('/')}>Home</button>
        <button onClick={() => router.navigate('/about')}>About</button>
        <button onClick={() => router.navigate('/users/123')}>User</button>
      </nav>
      <main>
        {route.view === 'home' && <h1>Home</h1>}
        {route.view === 'about' && <h1>About</h1>}
        {route.view === 'user' && <h1>User {route.id}</h1>}
      </main>
    </div>
  );
}
```

```vue [Vue 3]
<script setup lang="ts">
import { createRouter } from '@vielzeug/routeit';
import { ref, onMounted, onUnmounted } from 'vue';

const router = createRouter();

router
  .get('/', () => ({ view: 'home' }))
  .get('/about', () => ({ view: 'about' }))
  .get('/users/:id', ({ params }) => ({ view: 'user', id: params.id }))
  .start();

const currentView = ref('home');
const userId = ref('');

let unsubscribe;
onMounted(() => {
  unsubscribe = router.subscribe(() => {
    const state = router.getState();
    currentView.value = state.pathname === '/' ? 'home' 
      : state.pathname === '/about' ? 'about' : 'user';
    userId.value = state.params.id || '';
  });
});
onUnmounted(() => unsubscribe?.());
</script>

<template>
  <div>
    <nav>
      <button @click="router.navigate('/')">Home</button>
      <button @click="router.navigate('/about')">About</button>
      <button @click="router.navigate('/users/123')">User</button>
    </nav>
    <main>
      <h1 v-if="currentView === 'home'">Home</h1>
      <h1 v-else-if="currentView === 'about'">About</h1>
      <h1 v-else>User {{ userId }}</h1>
    </main>
  </div>
</template>
```

```svelte [Svelte]
<script lang="ts">
  import { createRouter } from '@vielzeug/routeit';
  import { onDestroy } from 'svelte';

  const router = createRouter();

  let currentView = 'home';
  let userId = '';

  router
    .get('/', () => { currentView = 'home'; })
    .get('/about', () => { currentView = 'about'; })
    .get('/users/:id', ({ params }) => { 
      currentView = 'user'; 
      userId = params.id;
    })
    .start();

  const unsubscribe = router.subscribe(() => {
    // Trigger reactivity
    currentView = currentView;
  });

  onDestroy(unsubscribe);
</script>

<div>
  <nav>
    <button on:click={() => router.navigate('/')}>Home</button>
    <button on:click={() => router.navigate('/about')}>About</button>
    <button on:click={() => router.navigate('/users/123')}>User</button>
  </nav>
  <main>
    {#if currentView === 'home'}
      <h1>Home</h1>
    {:else if currentView === 'about'}
      <h1>About</h1>
    {:else}
      <h1>User {userId}</h1>
    {/if}
  </main>
</div>
```

```ts [Web Component]
import { createRouter } from '@vielzeug/routeit';

class SimpleRouter extends HTMLElement {
  #router = createRouter();
  #unsubscribe;

  connectedCallback() {
    this.innerHTML = `
      <nav>
        <button id="home">Home</button>
        <button id="about">About</button>
        <button id="user">User</button>
      </nav>
      <main id="content"></main>
    `;

    this.#router
      .get('/', () => this.render('<h1>Home</h1>'))
      .get('/about', () => this.render('<h1>About</h1>'))
      .get('/users/:id', ({ params }) => this.render(`<h1>User ${params.id}</h1>`))
      .start();

    this.querySelector('#home').onclick = () => this.#router.navigate('/');
    this.querySelector('#about').onclick = () => this.#router.navigate('/about');
    this.querySelector('#user').onclick = () => this.#router.navigate('/users/123');

    this.#unsubscribe = this.#router.subscribe(() => {
      // Router handles rendering via handlers
    });
  }

  render(html) {
    this.querySelector('#content').innerHTML = html;
  }

  disconnectedCallback() {
    this.#router.stop();
    this.#unsubscribe?.();
  }
}
customElements.define('simple-router', SimpleRouter);
```

:::

### Advanced Integration (Hook/Composable)

Create reusable router hooks for better component integration.

::: code-group

```tsx [React]
import { createRouter } from '@vielzeug/routeit';
import type { Router } from '@vielzeug/routeit';
import { useState, useEffect, createContext, useContext } from 'react';

// Create router instance
const router = createRouter();

// Router context
const RouterContext = createContext<Router>(router);

// Custom hook
function useRouter() {
  const router = useContext(RouterContext);
  const [state, setState] = useState({
    pathname: router.getCurrentPath(),
    params: router.getParams(),
    query: router.getCurrentQuery(),
  });

  useEffect(() => {
    return router.subscribe(() => {
      setState({
        pathname: router.getCurrentPath(),
        params: router.getParams(),
        query: router.getCurrentQuery(),
      });
    });
  }, [router]);

  return {
    ...state,
    navigate: router.navigate.bind(router),
    navigateTo: router.navigateTo.bind(router),
    isActive: router.isActive.bind(router),
  };
}

// Define routes
router
  .get('/', () => {})
  .get('/about', () => {})
  .get('/users/:id', () => {})
  .start();

// Components
function Home() {
  return <h1>Home</h1>;
}

function About() {
  return <h1>About</h1>;
}

function User() {
  const { params } = useRouter();
  return <h1>User {params.id}</h1>;
}

function App() {
  const { pathname, navigate, isActive } = useRouter();

  return (
    <RouterContext.Provider value={router}>
      <nav>
        <button
          onClick={() => navigate('/')}
          className={isActive('/') ? 'active' : ''}>
          Home
        </button>
        <button
          onClick={() => navigate('/about')}
          className={isActive('/about') ? 'active' : ''}>
          About
        </button>
        <button onClick={() => navigate('/users/123')}>User</button>
      </nav>
      <main>
        {pathname === '/' && <Home />}
        {pathname === '/about' && <About />}
        {pathname.startsWith('/users') && <User />}
      </main>
    </RouterContext.Provider>
  );
}
```

```vue [Vue 3]
<script setup lang="ts">
import { createRouter } from '@vielzeug/routeit';
import type { Router } from '@vielzeug/routeit';
import { ref, onMounted, onUnmounted, provide, inject } from 'vue';

// Create router
const router = createRouter();

// Composable
function useRouter() {
  const router = inject<Router>('router');
  const pathname = ref(router.getCurrentPath());
  const params = ref(router.getParams());
  const query = ref(router.getCurrentQuery());

  let unsubscribe;
  onMounted(() => {
    unsubscribe = router.subscribe(() => {
      pathname.value = router.getCurrentPath();
      params.value = router.getParams();
      query.value = router.getCurrentQuery();
    });
  });

  onUnmounted(() => unsubscribe?.());

  return {
    pathname,
    params,
    query,
    navigate: router.navigate.bind(router),
    navigateTo: router.navigateTo.bind(router),
    isActive: router.isActive.bind(router),
  };
}

// App setup
router
  .get('/', () => {})
  .get('/about', () => {})
  .get('/users/:id', () => {})
  .start();

provide('router', router);
const { pathname, params, navigate, isActive } = useRouter();
</script>

<template>
  <div>
    <nav>
      <button @click="navigate('/')" :class="{ active: isActive('/') }">
        Home
      </button>
      <button @click="navigate('/about')" :class="{ active: isActive('/about') }">
        About
      </button>
      <button @click="navigate('/users/123')">User</button>
    </nav>
    <main>
      <h1 v-if="pathname === '/'">Home</h1>
      <h1 v-else-if="pathname === '/about'">About</h1>
      <h1 v-else>User {{ params.id }}</h1>
    </main>
  </div>
</template>
```

```svelte [SvelteKit]
<script context="module" lang="ts">
  import { createRouter } from '@vielzeug/routeit';
  import { writable } from 'svelte/store';

  const router = createRouter();

  function createRouterStore() {
    const { subscribe, set } = writable({
      pathname: router.getCurrentPath(),
      params: router.getParams(),
      query: router.getCurrentQuery(),
    });

    router.subscribe(() => {
      set({
        pathname: router.getCurrentPath(),
        params: router.getParams(),
        query: router.getCurrentQuery(),
      });
    });

    return {
      subscribe,
      navigate: router.navigate.bind(router),
      navigateTo: router.navigateTo.bind(router),
      isActive: router.isActive.bind(router),
    };
  }

  export const routerStore = createRouterStore();

  router
    .get('/', () => {})
    .get('/about', () => {})
    .get('/users/:id', () => {})
    .start();
</script>

<script lang="ts">
  $: ({ pathname, params } = $routerStore);
</script>

<div>
  <nav>
    <button 
      on:click={() => routerStore.navigate('/')}
      class:active={routerStore.isActive('/')}>
      Home
    </button>
    <button 
      on:click={() => routerStore.navigate('/about')}
      class:active={routerStore.isActive('/about')}>
      About
    </button>
    <button on:click={() => routerStore.navigate('/users/123')}>
      User
    </button>
  </nav>
  <main>
    {#if pathname === '/'}
      <h1>Home</h1>
    {:else if pathname === '/about'}
      <h1>About</h1>
    {:else}
      <h1>User {params.id}</h1>
    {/if}
  </main>
</div>
```

```ts [Web Component with Store]
import { createRouter } from '@vielzeug/routeit';

class AdvancedRouter extends HTMLElement {
  static #router = createRouter();
  static #subscribers = new Set();

  static subscribe(callback) {
    this.#subscribers.add(callback);
    callback(this.getState());
    return () => this.#subscribers.delete(callback);
  }

  static getState() {
    return {
      pathname: this.#router.getCurrentPath(),
      params: this.#router.getParams(),
      query: this.#router.getCurrentQuery(),
    };
  }

  static navigate(path) {
    this.#router.navigate(path);
  }

  #unsubscribe;
  #routerUnsubscribe;

  connectedCallback() {
    // Set up routes (once)
    if (!AdvancedRouter.#router._started) {
      AdvancedRouter.#router
        .get('/', () => {})
        .get('/about', () => {})
        .get('/users/:id', () => {})
        .start();

      this.#routerUnsubscribe = AdvancedRouter.#router.subscribe(() => {
        AdvancedRouter.#subscribers.forEach(cb => cb(AdvancedRouter.getState()));
      });
    }

    this.#unsubscribe = AdvancedRouter.subscribe((state) => {
      this.render(state);
    });
  }

  render(state) {
    const { pathname, params } = state;
    let content = '';
    
    if (pathname === '/') content = '<h1>Home</h1>';
    else if (pathname === '/about') content = '<h1>About</h1>';
    else if (pathname.startsWith('/users')) content = `<h1>User ${params.id}</h1>`;

    this.innerHTML = `
      <nav>
        <button id="home">Home</button>
        <button id="about">About</button>
        <button id="user">User</button>
      </nav>
      <main>${content}</main>
    `;

    this.querySelector('#home').onclick = () => AdvancedRouter.navigate('/');
    this.querySelector('#about').onclick = () => AdvancedRouter.navigate('/about');
    this.querySelector('#user').onclick = () => AdvancedRouter.navigate('/users/123');
  }

  disconnectedCallback() {
    this.#unsubscribe?.();
  }
}
customElements.define('advanced-router', AdvancedRouter);
```

:::

## Authentication & Authorization

Complete authentication flow with protected routes.

```ts
import { createRouter } from '@vielzeug/routeit';
import type { Middleware, RouteContext } from '@vielzeug/routeit';

// Types
interface User {
  id: string;
  name: string;
  roles: string[];
}

interface AuthContext extends RouteContext {
  user?: User;
}

// Auth service
const authService = {
  async getCurrentUser(): Promise<User | null> {
    const token = localStorage.getItem('authToken');
    if (!token) return null;

    try {
      const res = await fetch('/api/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  },

  async login(email: string, password: string): Promise<User> {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    localStorage.setItem('authToken', data.token);
    return data.user;
  },

  logout() {
    localStorage.removeItem('authToken');
  },
};

// Middleware
const requireAuth: Middleware<AuthContext> = async (ctx, next) => {
  const user = await authService.getCurrentUser();

  if (!user) {
    ctx.navigate('/login');
    return;
  }

  ctx.user = user;
  await next();
};

const requireRole = (role: string): Middleware<AuthContext> => {
  return async (ctx, next) => {
    const user = ctx.user;

    if (!user || !user.roles.includes(role)) {
      ctx.navigate('/forbidden');
      return;
    }

    await next();
  };
};

// Router setup
const router = createRouter();

router
  // Public routes
  .get('/', () => {
    document.getElementById('app').innerHTML = '<h1>Home</h1>';
  })
  .get('/login', () => {
    document.getElementById('app').innerHTML = `
      <form id="loginForm">
        <input name="email" type="email" placeholder="Email" required />
        <input name="password" type="password" placeholder="Password" required />
        <button type="submit">Login</button>
      </form>
    `;

    document.getElementById('loginForm').onsubmit = async (e) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const email = (form.email as HTMLInputElement).value;
      const password = (form.password as HTMLInputElement).value;

      try {
        await authService.login(email, password);
        router.navigate('/dashboard');
      } catch (error) {
        alert('Login failed');
      }
    };
  })

  // Protected routes
  .route({
    path: '/dashboard',
    middleware: requireAuth,
    handler: (ctx: AuthContext) => {
      document.getElementById('app').innerHTML = `
        <h1>Dashboard</h1>
        <p>Welcome, ${ctx.user?.name}!</p>
        <button id="logout">Logout</button>
      `;

      document.getElementById('logout').onclick = () => {
        authService.logout();
        router.navigate('/login');
      };
    },
  })
  .route({
    path: '/admin',
    middleware: [requireAuth, requireRole('admin')],
    handler: (ctx: AuthContext) => {
      document.getElementById('app').innerHTML = `
        <h1>Admin Panel</h1>
        <p>Hello, ${ctx.user?.name} (Admin)</p>
      `;
    },
  })
  .start();
```

## Permission Integration

Using @vielzeug/permit for fine-grained access control.

```ts
import { createRouter } from '@vielzeug/routeit';
import { Permit } from '@vielzeug/permit';
import type { Middleware, RouteContext } from '@vielzeug/routeit';
import type { BaseUser, PermissionAction } from '@vielzeug/permit';

// Define permissions
Permit.register('admin', 'posts', {
  read: true,
  create: true,
  update: true,
  delete: true,
});

Permit.register('editor', 'posts', {
  read: true,
  create: true,
  update: (user, data) => user.id === data.authorId,
  delete: false,
});

Permit.register('viewer', 'posts', {
  read: true,
  create: false,
  update: false,
  delete: false,
});

// Permission middleware factory
function requirePermission(
  resource: string,
  action: PermissionAction
): Middleware {
  return async (ctx, next) => {
    const user = ctx.user as BaseUser;

    if (!user) {
      ctx.navigate('/login');
      return;
    }

    if (!Permit.check(user, resource, action)) {
      ctx.navigate('/forbidden');
      return;
    }

    await next();
  };
}

// Router setup
const router = createRouter();

router
  .route({
    path: '/posts',
    middleware: requirePermission('posts', 'read'),
    handler: () => {
      // List posts
      console.log('Posts list');
    },
  })
  .route({
    path: '/posts/new',
    middleware: requirePermission('posts', 'create'),
    handler: () => {
      // Create post form
      console.log('Create post');
    },
  })
  .route({
    path: '/posts/:id/edit',
    middleware: requirePermission('posts', 'update'),
    handler: ({ params }) => {
      // Edit post form
      console.log('Edit post:', params.id);
    },
  })
  .route({
    path: '/posts/:id/delete',
    middleware: requirePermission('posts', 'delete'),
    handler: ({ params }) => {
      // Delete post
      console.log('Delete post:', params.id);
    },
  })
  .start();
```

## Lazy Loading

Load route modules on demand for better performance.

```ts
import { createRouter } from '@vielzeug/routeit';
import type { Middleware } from '@vielzeug/routeit';

// Lazy loading middleware
const lazyLoad = (
  importFn: () => Promise<{ default: (ctx: any) => void }>
): Middleware => {
  return async (ctx, next) => {
    try {
      ctx.meta = ctx.meta || {};
      ctx.meta.loading = true;

      const module = await importFn();
      ctx.meta.loading = false;
      
      await module.default(ctx);
      await next();
    } catch (error) {
      console.error('Failed to load route:', error);
      ctx.navigate('/error');
    }
  };
};

// Router setup
const router = createRouter();

router
  .route({
    path: '/dashboard',
    middleware: lazyLoad(() => import('./routes/dashboard')),
    handler: () => {
      // Handler called after module loads
      console.log('Dashboard loaded');
    },
  })
  .route({
    path: '/analytics',
    middleware: lazyLoad(() => import('./routes/analytics')),
    handler: () => {
      console.log('Analytics loaded');
    },
  })
  .start();

// routes/dashboard.ts
export default function dashboard(ctx) {
  document.getElementById('app').innerHTML = `
    <h1>Dashboard</h1>
    <p>User: ${ctx.user?.name}</p>
  `;
}

// routes/analytics.ts
export default function analytics(ctx) {
  document.getElementById('app').innerHTML = `
    <h1>Analytics</h1>
    <div id="charts"></div>
  `;
  
  // Load charts library lazily
  import('./charts').then(({ renderCharts }) => {
    renderCharts('#charts');
  });
}
```

## SPA with Layouts

Build a complete SPA with nested layouts.

```ts
import { createRouter } from '@vielzeug/routeit';

// Layout components
const layouts = {
  default: (content: string) => `
    <div class="layout">
      <header>
        <nav>
          <a href="/" onclick="event.preventDefault(); router.navigate('/')">Home</a>
          <a href="/about" onclick="event.preventDefault(); router.navigate('/about')">About</a>
        </nav>
      </header>
      <main>${content}</main>
      <footer>© 2024 My App</footer>
    </div>
  `,
  
  dashboard: (content: string) => `
    <div class="dashboard-layout">
      <aside class="sidebar">
        <nav>
          <a href="/dashboard" onclick="event.preventDefault(); router.navigate('/dashboard')">Overview</a>
          <a href="/dashboard/profile" onclick="event.preventDefault(); router.navigate('/dashboard/profile')">Profile</a>
          <a href="/dashboard/settings" onclick="event.preventDefault(); router.navigate('/dashboard/settings')">Settings</a>
        </nav>
      </aside>
      <main>${content}</main>
    </div>
  `,
};

// Render helper
function render(content: string, layout: 'default' | 'dashboard' = 'default') {
  document.getElementById('app').innerHTML = layouts[layout](content);
}

// Router
const router = createRouter();

router
  // Public pages with default layout
  .get('/', () => {
    render('<h1>Home</h1><p>Welcome to our app!</p>');
  })
  .get('/about', () => {
    render('<h1>About</h1><p>Learn more about us.</p>');
  })

  // Dashboard with custom layout
  .route({
    path: '/dashboard',
    handler: () => {
      render('<h1>Dashboard</h1><p>Overview content</p>', 'dashboard');
    },
    children: [
      {
        path: '/profile',
        handler: () => {
          render('<h1>Profile</h1><p>User profile</p>', 'dashboard');
        },
      },
      {
        path: '/settings',
        handler: () => {
          render('<h1>Settings</h1><p>App settings</p>', 'dashboard');
        },
      },
    ],
  })
  .start();
```

## Error Handling

Comprehensive error handling with error boundaries.

```ts
import { createRouter } from '@vielzeug/routeit';
import type { Middleware } from '@vielzeug/routeit';

// Error handler middleware
const errorHandler: Middleware = async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    console.error('Route error:', error);
    
    // Log to error tracking service
    logError(error, {
      pathname: ctx.pathname,
      params: ctx.params,
      query: ctx.query,
    });
    
    // Show error page
    document.getElementById('app').innerHTML = `
      <div class="error">
        <h1>Oops! Something went wrong</h1>
        <p>${error.message}</p>
        <button onclick="router.navigate('/')">Go Home</button>
      </div>
    `;
  }
};

// 404 handler
const notFoundHandler = ({ pathname }) => {
  document.getElementById('app').innerHTML = `
    <div class="not-found">
      <h1>404 - Page Not Found</h1>
      <p>The page "${pathname}" does not exist.</p>
      <button onclick="router.navigate('/')">Go Home</button>
    </div>
  `;
};

// Router with error handling
const router = createRouter({
  middleware: [errorHandler],
  notFound: notFoundHandler,
});

router
  .get('/error-test', () => {
    throw new Error('Test error');
  })
  .start();

function logError(error, context) {
  // Send to error tracking service
  fetch('/api/errors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    }),
  });
}
```

