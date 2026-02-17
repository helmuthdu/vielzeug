# Welcome to Vielzeug

**Vielzeug** (German for "many tools") is a collection of lightweight, framework-agnostic TypeScript utilities for modern web development. Each package is designed to solve one problem exceptionally well, with minimal dependencies and maximum type safety.

## The Vielzeug Ecosystem

### 🔧 Core & Utilities

Perfect starting point for any project:

| Package                  | Description                                                                       | Size                                        |
| ------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------- |
| **[Toolkit](/toolkit/)** | 100+ essential utilities for arrays, objects, strings, async operations, and more | Tree-shakeable                              |
| **[Logit](/logit/)**     | Beautiful console logging with colors, timestamps, and log levels                 | <PackageInfo package="logit" type="size" /> |

### 💾 Data & State

Client-side data management made simple:

| Package                  | Description                                                                  | Size                                          |
| ------------------------ | ---------------------------------------------------------------------------- | --------------------------------------------- |
| **[Deposit](/deposit/)** | Type-safe IndexedDB & LocalStorage wrapper with schemas, TTL, and migrations | <PackageInfo package="deposit" type="size" /> |
| **[Fetchit](/fetchit/)** | Modern HTTP client with smart caching, deduplication, and query management   | <PackageInfo package="fetchit" type="size" /> |
| **[Snapit](/snapit/)** | Tiny reactive state management with subscriptions and async support          | <PackageInfo package="snapit" type="size" /> |

### 🎨 Frontend & Forms

Build better user interfaces:

| Package                  | Description                                                             | Size                                          |
| ------------------------ | ----------------------------------------------------------------------- | --------------------------------------------- |
| **[Craftit](/craftit/)** | Web Components framework with reactive state and DOM reconciliation     | <PackageInfo package="craftit" type="size" /> |
| **[Formit](/formit/)**   | Form state management with validation, dirty tracking, and file uploads | <PackageInfo package="formit" type="size" />  |
| **[Validit](/validit/)** | Schema validation with async support and detailed error messages        | <PackageInfo package="validit" type="size" /> |
| **[i18nit](/i18nit/)**   | Internationalization with pluralization and locale-aware formatting     | <PackageInfo package="i18nit" type="size" />  |

### 🏗️ Architecture & Security

Structure your application properly:

| Package                  | Description                                                              | Size                                          |
| ------------------------ | ------------------------------------------------------------------------ | --------------------------------------------- |
| **[Permit](/permit/)**   | Role-Based Access Control (RBAC) with dynamic rules and wildcards        | <PackageInfo package="permit" type="size" />  |
| **[Routeit](/routeit/)** | Client-side routing with middleware, nested routes, and type-safe params | <PackageInfo package="routeit" type="size" /> |
| **[Wireit](/wireit/)**   | Dependency injection container with async support and scoped instances   | <PackageInfo package="wireit" type="size" />  |

## Quick Start

### Installation

Each package can be installed independently:

::: code-group

```sh [pnpm]
pnpm add @vielzeug/toolkit
```

```sh [npm]
npm install @vielzeug/toolkit
```

```sh [yarn]
yarn add @vielzeug/toolkit
```

:::

### Your First Lines

```typescript
import { debounce, groupBy } from '@vielzeug/toolkit';
import { createSnapshot } from '@vielzeug/snapit';
import { createHttpClient } from '@vielzeug/fetchit';

// Debounce search input
const search = debounce((query: string) => {
  console.log('Searching for:', query);
}, 300);

// Reactive state management
const store = createSnapshot({ count: 0 });
store.subscribe((data) => console.log(data.count));
store.set((data) => ({ count: data.count + 1 }));

// HTTP client with caching
const http = createHttpClient({ baseUrl: '/api' });
const users = await http.get('/users');
```

## Common Use Cases

### Building a Form

```typescript
import { createForm } from '@vielzeug/formit';
import { v } from '@vielzeug/validit';

const userSchema = v.object({
  email: v.string().email(),
  age: v.number().min(18),
});

const form = createForm({
  fields: {
    email: { value: '', validators: (v) => userSchema.shape.email.parse(v) },
    age: { value: 0, validators: (v) => userSchema.shape.age.parse(v) },
  },
});

await form.submit(async (data) => {
  await fetch('/api/users', { method: 'POST', body: data });
});
```

### Fetching & Caching Data

```typescript
import { createHttpClient, createQueryClient } from '@vielzeug/fetchit';

const http = createHttpClient({ baseUrl: '/api' });
const queryClient = createQueryClient({ staleTime: 5000 });

// Cached and deduplicated
const user = await queryClient.fetch({
  queryKey: ['user', userId],
  queryFn: () => http.get(`/users/${userId}`),
});

// Invalidate cache when data changes
queryClient.invalidate(['user']);
```

### Permission Management

```typescript
import { createPermit } from '@vielzeug/permit';

const permit = createPermit();

permit.register('admin', 'posts', ['create', 'update', 'delete']);
permit.register('user', 'posts', ['create']);

const canDelete = permit.can(currentUser, 'posts', 'delete');
```

### Reactive State

```typescript
import { createSnapshot } from '@vielzeug/snapit';

const store = createSnapshot({ todos: [], filter: 'all' });

// Subscribe to specific values
store.subscribe(
  (state) => state.filter,
  (filter) => console.log('Filter changed:', filter),
);

// Update state
store.set((state) => ({
  todos: [...state.todos, { id: 1, text: 'Learn Vielzeug' }],
}));
```

## Design Philosophy

### 1. Simple Over Clever

We prefer straightforward, readable code over clever abstractions. If you can understand what's happening at a glance, we've done our job.

### 2. TypeScript First

Every package is built with TypeScript from the ground up. Type inference works out of the box, and you get autocomplete everywhere.

### 3. Zero/Minimal Dependencies

Most packages have 0-1 dependencies. This means:

- Smaller bundle sizes
- Fewer security vulnerabilities
- Less supply chain risk
- Faster installs

### 4. Framework Agnostic

Use Vielzeug with any framework (or no framework):

- ✅ React
- ✅ Vue
- ✅ Svelte
- ✅ Angular
- ✅ Vanilla JS/TS

### 5. Production Ready

All packages are:

- ✅ Battle-tested in production
- ✅ Fully tested (>95% coverage)
- ✅ Actively maintained
- ✅ Semantically versioned

## Getting Help

- 📖 **Documentation**: Each package has detailed docs with examples
- 💬 **Discussions**: [Ask questions on GitHub](https://github.com/helmuthdu/vielzeug/discussions)
- 🐛 **Issues**: [Report bugs](https://github.com/helmuthdu/vielzeug/issues)
- 🎮 **REPL**: [Try it online](/repl.html) without installing

## What's Next?

1. **Explore packages**: Browse the navigation to find packages that solve your problems
2. **Try examples**: Each package has real-world examples
3. **Check the REPL**: Test packages in your browser without setup
4. **Start building**: Install what you need and start coding

Ready to dive in? Start with [Toolkit](/toolkit/) for general utilities, or pick a specific package for your current needs! 🚀
