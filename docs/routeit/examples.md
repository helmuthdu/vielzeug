---
title: Routeit — Examples
description: Real-world routing patterns and framework integrations for Routeit.
---

## Routeit Examples

::: tip
These are copy-paste ready recipes. See [Usage Guide](./usage.md) for detailed explanations and [API Reference](./api.md) for complete type signatures.
:::

[[toc]]

## Framework Integration

### Basic Integration

Integrate Routeit with your UI framework by subscribing to route state.

::: code-group

```tsx [React]
import { createRouter } from '@vielzeug/routeit';
import type { RouteState } from '@vielzeug/routeit';
import { useState, useEffect } from 'react';

const router = createRouter();

router
  .on('/', () => {})
  .on('/about', () => {})
  .on('/users/:id', () => {})
  .start();

function App() {
  const [state, setState] = useState<RouteState>(() => router.state);

  useEffect(() => router.subscribe(setState), []);

  const { pathname, params } = state;

  return (
    <div>
      <nav>
        <button onClick={() => router.navigate('/')}>Home</button>
        <button onClick={() => router.navigate('/about')}>About</button>
        <button onClick={() => router.navigate('/users/123')}>User</button>
      </nav>
      <main>
        {pathname === '/' && <h1>Home</h1>}
        {pathname === '/about' && <h1>About</h1>}
        {pathname.startsWith('/users/') && <h1>User {params.id}</h1>}
      </main>
    </div>
  );
}
```

```vue [Vue 3]
<script setup lang="ts">
import { createRouter } from '@vielzeug/routeit';
import type { RouteState } from '@vielzeug/routeit';
import { ref, onMounted, onUnmounted } from 'vue';

const router = createRouter();
router.on('/', () => {}).on('/about', () => {}).on('/users/:id', () => {}).start();

const state = ref<RouteState>(router.state);
let unsubscribe: () => void;

onMounted(() => { unsubscribe = router.subscribe((s) => { state.value = s; }); });
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
      <h1 v-if="state.pathname === '/'">Home</h1>
      <h1 v-else-if="state.pathname === '/about'">About</h1>
      <h1 v-else>User {{ state.params.id }}</h1>
    </main>
  </div>
</template>
```

```svelte [Svelte]
<script lang="ts">
  import { createRouter } from '@vielzeug/routeit';
  import { onDestroy } from 'svelte';
  import { writable } from 'svelte/store';

  const router = createRouter();
  const state = writable(router.state);

  router.on('/', () => {}).on('/about', () => {}).on('/users/:id', () => {}).start();

  const unsubscribe = router.subscribe((s) => state.set(s));
  onDestroy(unsubscribe);
</script>

<div>
  <nav>
    <button on:click={() => router.navigate('/')}>Home</button>
    <button on:click={() => router.navigate('/about')}>About</button>
    <button on:click={() => router.navigate('/users/123')}>User</button>
  </nav>
  <main>
    {#if $state.pathname === '/'}
      <h1>Home</h1>
    {:else if $state.pathname === '/about'}
      <h1>About</h1>
    {:else}
      <h1>User {$state.params.id}</h1>
    {/if}
  </main>
</div>
```

:::

### React Hook

```tsx
import { createRouter } from '@vielzeug/routeit';
import type { RouteState } from '@vielzeug/routeit';
import { useState, useEffect, createContext, useContext } from 'react';

const RouterContext = createContext<ReturnType<typeof createRouter> | null>(null);

export function useRouter() {
  const router = useContext(RouterContext);
  if (!router) throw new Error('useRouter must be used inside <RouterProvider>');
  const [state, setState] = useState<RouteState>(() => router.state);
  useEffect(() => router.subscribe(setState), [router]);
  return {
    state,
    navigate: (t: Parameters<typeof router.navigate>[0], o?: Parameters<typeof router.navigate>[1]) =>
      router.navigate(t, o),
    isActive: (p: string, exact?: boolean) => router.isActive(p, exact),
    url: (p: string, params?: Record<string, string>) => router.url(p, params),
  };
}

function RouterProvider({ children }: { children: React.ReactNode }) {
  return <RouterContext.Provider value={router}>{children}</RouterContext.Provider>;
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const { state, navigate } = useRouter();
  return (
    <a
      href={to}
      onClick={(e) => { e.preventDefault(); navigate(to); }}
      style={{ fontWeight: state.pathname === to ? 'bold' : 'normal' }}
    >
      {children}
    </a>
  );
}
```

### Vue Composable

```ts
import { createRouter } from '@vielzeug/routeit';
import type { RouteState } from '@vielzeug/routeit';
import { ref, onMounted, onUnmounted } from 'vue';

const router = createRouter();

export function useRouter() {
  const state = ref<RouteState>(router.state);
  let unsubscribe: () => void;

  onMounted(() => { unsubscribe = router.subscribe((s) => { state.value = s; }); });
  onUnmounted(() => unsubscribe?.());

  return {
    state,
    navigate: router.navigate.bind(router),
    isActive: router.isActive.bind(router),
    url: router.url.bind(router),
  };
}
```

## Authentication

Protected routes with a middleware guard that loads the current user into `ctx.locals`:

```ts
import { createRouter } from '@vielzeug/routeit';
import type { Middleware } from '@vielzeug/routeit';

interface User { id: string; name: string; roles: string[] }

const authService = {
  async getCurrentUser(): Promise<User | null> {
    const token = localStorage.getItem('authToken');
    if (!token) return null;
    const res = await fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } });
    return res.ok ? res.json() : null;
  },
};

const requireAuth: Middleware = async (ctx, next) => {
  const user = await authService.getCurrentUser();
  if (!user) {
    await ctx.navigate('/login', { replace: true });
    return;
  }
  ctx.locals.user = user;
  await next();
};

const requireRole = (role: string): Middleware => async (ctx, next) => {
  const user = ctx.locals.user as User | undefined;
  if (!user?.roles.includes(role)) {
    await ctx.navigate('/forbidden', { replace: true });
    return;
  }
  await next();
};

const router = createRouter();

router
  .on('/', () => renderHome())
  .on('/login', () => renderLogin())
  .on('/forbidden', () => renderForbidden())

  .group('/dashboard', (r) => {
    r.on('/', (ctx) => renderDashboard(ctx.locals.user as User));
    r.on('/profile', (ctx) => renderProfile(ctx.locals.user as User));
  }, { middleware: requireAuth })

  .group('/admin', (r) => {
    r.on('/reports', () => renderReports());
    r.on('/users',   () => renderAdminUsers());
  }, { middleware: [requireAuth, requireRole('admin')] })

  .start();
```

## Role-based Access Control

Using `@vielzeug/permit` for fine-grained permissions:

```ts
import { createRouter } from '@vielzeug/routeit';
import { createPermit } from '@vielzeug/permit';
import type { Middleware } from '@vielzeug/routeit';
import type { BaseUser } from '@vielzeug/permit';

const permit = createPermit();
permit
  .register('admin',  'posts', { read: true, create: true, update: true, delete: true })
  .register('editor', 'posts', {
    read: true,
    create: true,
    update: (user, data) => user.id === data?.authorId,
    delete: false,
  });

const requireAuth: Middleware = async (ctx, next) => {
  const user = await getCurrentUser();
  if (!user) { await ctx.navigate('/login'); return; }
  ctx.locals.user = user;
  await next();
};

const requirePermission = (resource: string, action: string): Middleware =>
  async (ctx, next) => {
    const user = ctx.locals.user as BaseUser;
    if (!permit.check(user, resource, action)) {
      await ctx.navigate('/forbidden');
      return;
    }
    await next();
  };

const router = createRouter();

router
  .on('/posts',         () => renderPosts(),     { middleware: [requireAuth, requirePermission('posts', 'read')] })
  .on('/posts/new',     () => renderNewPost(),   { middleware: [requireAuth, requirePermission('posts', 'create')] })
  .on('/posts/:id/edit', ({ params }) => renderEditPost(params.id), {
    middleware: [requireAuth, requirePermission('posts', 'update')],
  })
  .start();
```

## Lazy Loading

Load route modules on demand:

```ts
import { createRouter } from '@vielzeug/routeit';
import type { Middleware, RouteContext } from '@vielzeug/routeit';

type RouteModule = { default: (ctx: RouteContext) => void };

const lazyLoad = (importFn: () => Promise<RouteModule>): Middleware =>
  async (ctx, next) => {
    const module = await importFn();
    ctx.locals.component = module.default;
    await next();
  };

const router = createRouter();

router
  .on('/dashboard',  (ctx) => (ctx.locals.component as RouteModule['default'])(ctx), {
    middleware: lazyLoad(() => import('./routes/dashboard')),
  })
  .on('/analytics',  (ctx) => (ctx.locals.component as RouteModule['default'])(ctx), {
    middleware: lazyLoad(() => import('./routes/analytics')),
  })
  .start();
```

## Named Routes & URL Builder

Keep navigation refactor-proof with named routes:

```ts
import { createRouter } from '@vielzeug/routeit';

const router = createRouter({ base: '/app' });

router
  .on('/',                                   () => renderHome(),                  { name: 'home' })
  .on('/users',                              () => renderUsers(),                 { name: 'userList' })
  .on('/users/:id',                          ({ params }) => renderUser(params.id), { name: 'userDetail' })
  .on('/users/:id/posts/:postId',            ({ params }) => renderPost(params),  { name: 'userPost' })
  .start();

// Navigate by name — paths never hard-coded
await router.navigate({ name: 'userDetail', params: { id: '42' } });
await router.navigate({ name: 'userDetail', params: { id: '42' }, hash: 'activity' });

// Build URLs for links
router.url('userDetail', { id: '42' });              // '/app/users/42'
router.url('userPost',   { id: '1', postId: '99' }); // '/app/users/1/posts/99'
router.url('userList',   undefined, { page: '2' });  // '/app/users?page=2'
```

## Navigation Tracking & Analytics

Log every navigation with route metadata using global middleware:

```ts
import { createRouter } from '@vielzeug/routeit';

type PageMeta = { page?: string };

const router = createRouter({
  middleware: async (ctx, next) => {
    const start = performance.now();
    await next();
    const meta = ctx.meta as PageMeta | undefined;
    analytics.track('page_view', {
      pathname: ctx.pathname,
      page: meta?.page,
      params: ctx.params,
      duration: performance.now() - start,
    });
  },
});

router
  .on('/',         () => renderHome(),              { meta: { page: 'home' } })
  .on('/pricing',  () => renderPricing(),           { meta: { page: 'pricing' } })
  .on('/users/:id', ({ params }) => renderUser(params.id), { meta: { page: 'user_detail' } })
  .start();
```

## Page Titles from Meta

Update `document.title` reactively from route metadata:

```ts
type RouteMeta = { title?: string };

const router = createRouter();

router
  .on('/',       () => renderHome(),   { name: 'home',  meta: { title: 'Home' } })
  .on('/about',  () => renderAbout(),  { name: 'about', meta: { title: 'About' } })
  .on('/users',  () => renderUsers(),  { name: 'users', meta: { title: 'Users' } })
  .start();

router.subscribe(({ meta }) => {
  const m = meta as RouteMeta | undefined;
  document.title = m?.title ? `${m.title} — My App` : 'My App';
});
```

## Error Handling

Global error handling with `onError` and `onNotFound`:

```ts
import { createRouter } from '@vielzeug/routeit';

const router = createRouter({
  onNotFound: ({ pathname }) => {
    document.getElementById('app')!.innerHTML = `
      <h1>404 – Not Found</h1>
      <p>The page "${pathname}" does not exist.</p>
    `;
  },
  onError: async (error, ctx) => {
    console.error('Route error at', ctx.pathname, error);
    await ctx.navigate('/error');
  },
});

router
  .on('/flaky', async () => {
    const data = await fetchData(); // may throw — caught by onError
    render(data);
  })
  .on('/error', () => render('<h1>Something went wrong</h1>'))
  .start();
```

## Hash Fragment Navigation

Navigate to in-page anchors via named routes:

```ts
const router = createRouter();

router.on('/docs/:page', ({ params, hash }) => {
  renderPage(params.page);
  if (hash) {
    requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
    });
  }
}, { name: 'docsPage' }).start();

// Navigate to a specific section
await router.navigate({ name: 'docsPage', params: { page: 'api' }, hash: 'navigate' });
// → /docs/api#navigate
```

## Hash Mode (SPA without server config)

```ts
const router = createRouter({ mode: 'hash' });

router
  .on('/', () => renderHome())
  .on('/users/:id', ({ params }) => renderUser(params.id))
  .start();

// URLs: https://example.com/#/users/42
await router.navigate('/users/42'); // sets location.hash = '/users/42'
```

## Scroll Restoration

Manually restore scroll position on navigation:

```ts
import { createRouter } from '@vielzeug/routeit';

const scrollPositions = new Map<string, number>();

const router = createRouter({
  middleware: async (ctx, next) => {
    // Save current scroll before navigating away
    scrollPositions.set(router.state.pathname, window.scrollY);
    await next();
    // Restore after handler renders new content
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollPositions.get(ctx.pathname) ?? 0);
    });
  },
});

router.on('/', () => renderHome()).on('/about', () => renderAbout()).start();
```

## Middleware-only Routes

Register route-wide hooks without a terminal handler — useful for analytics, auth guards on a broad path prefix:

```ts
const router = createRouter();

// Log every navigation under /dashboard without a separate handler
router.on('/dashboard/*', { middleware: async (ctx, next) => {
  console.log('[analytics]', ctx.pathname);
  await next();
}});

// Then register the actual handlers — middleware runs first
router.group('/dashboard', (r) => {
  r.on('/',      () => renderDashboard());
  r.on('/users', () => renderUsers());
}).start();
```

## View Transitions

Animate page changes with the View Transition API:

```ts
import { createRouter } from '@vielzeug/routeit';

// Enable globally
const router = createRouter({ viewTransition: true });

router
  .on('/', () => renderHome())
  .on('/about', () => renderAbout())
  .start();

// Or per navigation
await router.navigate('/about', { viewTransition: true });
```

CSS to animate the transition:

```css
::view-transition-old(root) { animation: fade-out 150ms ease; }
::view-transition-new(root) { animation: fade-in  150ms ease; }

@keyframes fade-out { from { opacity: 1 } to { opacity: 0 } }
@keyframes fade-in  { from { opacity: 0 } to { opacity: 1 } }
```

## `using` — Explicit Resource Management

Automatically clean up the router when leaving a scope:

```ts
async function renderPage() {
  using router = createRouter();
  router.on('/', () => renderHome()).start();

  await doWork();
  // router.dispose() is called automatically here
  // → subscribers cleared, popstate listener removed
}
```

::: tip
These are copy-paste ready recipes. See [Usage Guide](./usage.md) for detailed explanations and [API Reference](./api.md) for complete type signatures.
:::

[[toc]]

## Framework Integration

### Basic Integration

Integrate Routeit with your framework by subscribing to route state.

::: code-group

```tsx [React]
import { createRouter } from '@vielzeug/routeit';
import { useState, useEffect } from 'react';

const router = createRouter();

router
  .on('/', () => {})
  .on('/about', () => {})
  .on('/users/:id', () => {})
  .start();

function App() {
  const [state, setState] = useState(() => router.state);

  useEffect(() => router.subscribe(setState), []);

  const { pathname, params } = state;

  return (
    <div>
      <nav>
        <button onClick={() => router.navigate('/')}>Home</button>
        <button onClick={() => router.navigate('/about')}>About</button>
        <button onClick={() => router.navigate('/users/123')}>User</button>
      </nav>
      <main>
        {pathname === '/' && <h1>Home</h1>}
        {pathname === '/about' && <h1>About</h1>}
        {pathname.startsWith('/users') && <h1>User {params.id}</h1>}
      </main>
    </div>
  );
}
```

```vue [Vue 3]
<script setup lang="ts">
import { createRouter } from '@vielzeug/routeit';
import type { RouteState } from '@vielzeug/routeit';
import { ref, onMounted, onUnmounted } from 'vue';

const router = createRouter();

router
  .on('/', () => {})
  .on('/about', () => {})
  .on('/users/:id', () => {})
  .start();

const state = ref(router.state);
let unsubscribe: () => void;

onMounted(() => {
  unsubscribe = router.subscribe((s) => { state.value = s; });
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
      <h1 v-if="state.pathname === '/'">Home</h1>
      <h1 v-else-if="state.pathname === '/about'">About</h1>
      <h1 v-else>User {{ state.params.id }}</h1>
    </main>
  </div>
</template>
```

```svelte [Svelte]
<script lang="ts">
  import { createRouter } from '@vielzeug/routeit';
  import { onDestroy } from 'svelte';
  import { writable } from 'svelte/store';

  const router = createRouter();
  const state = writable(router.state);

  router
    .on('/', () => {})
    .on('/about', () => {})
    .on('/users/:id', () => {})
    .start();

  const unsubscribe = router.subscribe((s) => state.set(s));
  onDestroy(unsubscribe);
</script>

<div>
  <nav>
    <button on:click={() => router.navigate('/')}>Home</button>
    <button on:click={() => router.navigate('/about')}>About</button>
    <button on:click={() => router.navigate('/users/123')}>User</button>
  </nav>
  <main>
    {#if $state.pathname === '/'}
      <h1>Home</h1>
    {:else if $state.pathname === '/about'}
      <h1>About</h1>
    {:else}
      <h1>User {$state.params.id}</h1>
    {/if}
  </main>
</div>
```

:::

### React Hook

A reusable hook exposing router state reactively:

```tsx
import { createRouter } from '@vielzeug/routeit';
import type { RouteState } from '@vielzeug/routeit';
import { useState, useEffect, createContext, useContext } from 'react';

const RouterContext = createContext<ReturnType<typeof createRouter> | null>(null);

export function useRouter() {
  const router = useContext(RouterContext);
  if (!router) throw new Error('useRouter must be used inside <RouterProvider>');
  const [state, setState] = useState<RouteState>(() => router.state);
  useEffect(() => router.subscribe(setState), [router]);
  return { state, navigate: router.navigate.bind(router), isActive: router.isActive.bind(router) };
}

// App setup
const router = createRouter();
router.on('/', () => {}).on('/about', () => {}).start();

function RouterProvider({ children }: { children: React.ReactNode }) {
  return <RouterContext.Provider value={router}>{children}</RouterContext.Provider>;
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const { state, navigate } = useRouter();
  return (
    <a
      href={to}
      onClick={(e) => { e.preventDefault(); navigate(to); }}
      style={{ fontWeight: state.pathname === to ? 'bold' : 'normal' }}
    >
      {children}
    </a>
  );
}
```

### Vue Composable

```ts
import { createRouter } from '@vielzeug/routeit';
import type { RouteState } from '@vielzeug/routeit';
import { ref, onMounted, onUnmounted } from 'vue';

const router = createRouter();

export function useRouter() {
  const state = ref<RouteState>(router.state);
  let unsubscribe: () => void;

  onMounted(() => {
    unsubscribe = router.subscribe((s) => { state.value = s; });
  });
  onUnmounted(() => unsubscribe?.());

  return {
    state,
    navigate: router.navigate.bind(router),
    isActive: router.isActive.bind(router),
    url: router.url.bind(router),
  };
}
```

## Authentication

Complete authentication flow with protected routes.

```ts
import { createRouter } from '@vielzeug/routeit';
import type { Middleware } from '@vielzeug/routeit';

interface User { id: string; name: string; roles: string[] }

const authService = {
  async getCurrentUser(): Promise<User | null> {
    const token = localStorage.getItem('authToken');
    if (!token) return null;
    const res = await fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } });
    return res.ok ? res.json() : null;
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
  logout() { localStorage.removeItem('authToken'); },
};

const router = createRouter();

// Load authenticated user into ctx.locals so downstream handlers can read it
const requireAuth: Middleware = async (ctx, next) => {
  const user = await authService.getCurrentUser();
  if (!user) {
    await ctx.navigate('/login', { replace: true });
    return;
  }
  ctx.locals.user = user;
  await next();
};

const requireRole = (role: string): Middleware => async (ctx, next) => {
  const user = ctx.locals.user as User | undefined;
  if (!user?.roles.includes(role)) {
    await ctx.navigate('/forbidden', { replace: true });
    return;
  }
  await next();
};

router
  .on('/', () => renderHome())
  .on('/login', () => renderLogin())
  .on('/forbidden', () => renderForbidden())

  // Protected routes
  .group('/dashboard', (r) => {
    r.on('/', (ctx) => {
      const user = ctx.locals.user as User;
      renderDashboard(user);
    });
    r.on('/profile', (ctx) => renderProfile(ctx.locals.user as User));
  }, { middleware: requireAuth })

  // Admin-only routes
  .group('/admin', (r) => {
    r.on('/reports', renderReports);
    r.on('/users', renderAdminUsers);
  }, { middleware: [requireAuth, requireRole('admin')] })

  .start();
```

## Role-based Access Control

Using `@vielzeug/permit` for fine-grained permissions:

```ts
import { createRouter } from '@vielzeug/routeit';
import { createPermit } from '@vielzeug/permit';
import type { Middleware } from '@vielzeug/routeit';
import type { BaseUser, PermissionAction } from '@vielzeug/permit';

const permit = createPermit();

permit.set('admin', 'posts', { read: true, create: true, update: true, delete: true });
permit.set('editor', 'posts', {
  read: true,
  create: true,
  update: (user, data) => user.id === data.authorId,
  delete: false,
});

const router = createRouter();

const requireAuth: Middleware = async (ctx, next) => {
  const user = await getCurrentUser();
  if (!user) { await ctx.navigate('/login'); return; }
  ctx.locals.user = user;
  await next();
};

const requirePermission = (resource: string, action: PermissionAction): Middleware =>
  async (ctx, next) => {
    const user = ctx.locals.user as BaseUser;
    if (!permit.check(user, resource, action)) {
      await ctx.navigate('/forbidden');
      return;
    }
    await next();
  };

router
  .on('/posts', renderPosts, { middleware: [requireAuth, requirePermission('posts', 'read')] })
  .on('/posts/new', renderNewPost, { middleware: [requireAuth, requirePermission('posts', 'create')] })
  .on('/posts/:id/edit', ({ params }) => renderEditPost(params.id), {
    middleware: [requireAuth, requirePermission('posts', 'update')],
  })
  .start();
```

## Lazy Loading

Load route modules on demand:

```ts
import { createRouter } from '@vielzeug/routeit';
import type { Middleware, RouteContext } from '@vielzeug/routeit';

const router = createRouter();

type RouteModule = { default: (ctx: RouteContext) => void | Promise<void> };

const lazyLoad = (importFn: () => Promise<RouteModule>): Middleware =>
  async (ctx, next) => {
    const module = await importFn();
    ctx.locals.component = module.default;
    await next();
  };

router
  .on('/dashboard', (ctx) => {
    (ctx.locals.component as RouteModule['default'])(ctx);
  }, { middleware: lazyLoad(() => import('./routes/dashboard')) })

  .on('/analytics', (ctx) => {
    (ctx.locals.component as RouteModule['default'])(ctx);
  }, { middleware: lazyLoad(() => import('./routes/analytics')) })

  .start();
```

## Navigation Tracking & Analytics

Log every navigation with route metadata:

```ts
import { createRouter } from '@vielzeug/routeit';

type PageMeta = { page?: string };

const router = createRouter({
  middleware: async (ctx, next) => {
    const start = performance.now();
    await next();
    const meta = ctx.meta as PageMeta | undefined;
    analytics.track('page_view', {
      pathname: ctx.pathname,
      page: meta?.page,
      params: ctx.params,
      duration: performance.now() - start,
    });
  },
});

router.routes([
  { path: '/', meta: { page: 'home' }, handler: renderHome },
  { path: '/pricing', meta: { page: 'pricing' }, handler: renderPricing },
  { path: '/users/:id', meta: { page: 'user_detail' }, handler: ({ params }) => renderUser(params.id) },
]);
router.start();
```

## Error Handling

Global error handling with `onError` and `onNotFound`:

```ts
import { createRouter } from '@vielzeug/routeit';

const router = createRouter({
  onError: async (error, ctx) => {
    console.error('Route error at', ctx.pathname, error);
    await ctx.navigate('/error');
  },
  onNotFound: ({ pathname }) => {
    document.getElementById('app')!.innerHTML = `
      <h1>404 – Not Found</h1>
      <p>The page "${pathname}" does not exist.</p>
    `;
  },
});

router
  .on('/flaky', async () => {
    const data = await fetchData(); // may throw — caught by onError
    render(data);
  })
  .on('/error', () => render('<h1>Something went wrong</h1>'))
  .start();
```

## Named Routes & URL Builder

Keep navigation refactor-proof with named routes:

```ts
import { createRouter } from '@vielzeug/routeit';

const router = createRouter({ base: '/app' });

router.routes([
  { path: '/', name: 'home', handler: renderHome },
  { path: '/users', name: 'userList', handler: renderUsers },
  { path: '/users/:id', name: 'userDetail', handler: ({ params }) => renderUser(params.id) },
  { path: '/users/:id/posts/:postId', name: 'userPost', handler: ({ params }) => renderPost(params) },
]);
router.start();

// Navigate by name — never hard-code paths
router.navigate({ name: 'userDetail', params: { id: '42' } });
router.navigate({ name: 'userDetail', params: { id: '42' }, hash: 'activity' });

// Build URLs for links
router.url('userDetail', { id: '42' });             // '/app/users/42'
router.url('userPost', { id: '1', postId: '99' });  // '/app/users/1/posts/99'
router.url('userList', undefined, { page: '2' });   // '/app/users?page=2'
```

## Hash Fragment Navigation

Navigate to in-page anchors via named routes:

```ts
const router = createRouter();

router.on('/docs/:page', ({ params, hash }) => {
  renderPage(params.page);
  if (hash) {
    requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
    });
  }
}, { name: 'docs' });

router.start();

// Navigate to a section
router.navigate({ name: 'docs', params: { page: 'api' }, hash: 'createrouter' });
// → /docs/api#createrouter
```

## Wildcard Routes

Capture the rest of a path as a named param:

```ts
const router = createRouter();

// Named wildcard — ctx.params.rest = 'guide/getting-started'
router.on('/docs/:rest*', ({ params }) => {
  renderDoc(params.rest);
}, { name: 'doc' });

// Catch-all 404
router.on('*', () => render404());

router.start();

// URL builder works with named wildcard params
router.url('doc', { rest: 'api/createrouter' });  // → '/docs/api/createrouter'
```

## SPA with Layout Selection

Use route `meta` to select layouts without repeating middleware:

```ts
import { createRouter } from '@vielzeug/routeit';

type LayoutMeta = { layout?: 'default' | 'dashboard' | 'fullscreen' };

const router = createRouter({
  middleware: async (ctx, next) => {
    await next();
    const layout = (ctx.meta as LayoutMeta | undefined)?.layout ?? 'default';
    document.body.dataset.layout = layout;
  },
});

router.routes([
  { path: '/',                  meta: { layout: 'default' },    handler: renderHome },
  { path: '/about',             meta: { layout: 'default' },    handler: renderAbout },
  { path: '/dashboard',         meta: { layout: 'dashboard' },  handler: renderDashboard },
  { path: '/dashboard/settings',meta: { layout: 'dashboard' },  handler: renderSettings },
  { path: '/preview/:id',       meta: { layout: 'fullscreen' }, handler: ({ params }) => renderPreview(params.id) },
]);
router.start();
```

## Redirects

Permanent and temporary URL redirects:

```ts
const router = createRouter();

// Redirect old paths to new canonical ones (replaces history entry by default)
router.redirect('/old-about', '/about');
router.redirect('/legacy/users/:id', '/users/:id');

// Temporary redirect — push a new history entry
router.redirect('/beta', '/dashboard', { replace: false });

router
  .on('/about', renderAbout)
  .on('/users/:id', ({ params }) => renderUser(params.id))
  .on('/dashboard', renderDashboard)
  .start();
```

## Same-URL Deduplication

By default, navigating to the current URL is a no-op. Use `force: true` to bypass this:

```ts
const router = createRouter();
router.on('/feed', () => refreshFeed()).start();

// No-op if already at /feed
router.navigate('/feed');

// Force re-run even if already at /feed
document.getElementById('refreshBtn')!.onclick = () => {
  router.navigate('/feed', { force: true });
};
```

## Base Path Deployment

Deploy at a subdirectory without changing route definitions:

```ts
const router = createRouter({ mode: 'history', base: '/my-app' });

router.routes([
  { path: '/',          handler: renderHome },
  { path: '/about',     handler: renderAbout },
  { path: '/users/:id', name: 'user', handler: ({ params }) => renderUser(params.id) },
]);
router.start();

// Navigation and URL building automatically prepend /my-app
router.navigate('/about');         // pushes /my-app/about
router.url('user', { id: '7' });  // → '/my-app/users/7'
router.isActive('/about');         // true when at /my-app/about
```

## autoStart

Skip the `.start()` call using the `autoStart` option:

```ts
import { createRouter } from '@vielzeug/routeit';

const router = createRouter({ autoStart: true });

// Routes registered before the first tick are matched automatically on load
router
  .on('/', renderHome)
  .on('/about', renderAbout);
```

## View Transitions API

Enable browser-native page transitions:

```ts
const router = createRouter({ viewTransition: true });

router
  .on('/', renderHome)
  .on('/gallery', renderGallery)
  .start();

// Override per-navigation
router.navigate('/gallery', { viewTransition: false });
```
