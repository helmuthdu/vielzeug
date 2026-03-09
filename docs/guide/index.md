---
title: Getting Started
description: Learn how to use Vielzeug — a collection of lightweight, framework-agnostic TypeScript utilities for modern web development.
---

# Welcome to Vielzeug

**Vielzeug** (German for "many tools") is a collection of lightweight, framework-agnostic TypeScript utilities for modern web development. Each package is designed to solve one problem exceptionally well, with minimal dependencies and maximum type safety.

## The Vielzeug Ecosystem

### 🔧 Core & Utilities

Perfect starting point for any project:

| Package                  | Description                                                                       | Size                                        |
| ------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------- |
| **[Toolkit](/toolkit/)** | 100+ utilities for arrays, objects, strings, math, async, and more — fully tree-shakeable | Tree-shakeable                              |
| **[Logit](/logit/)**     | Structured logging with log levels, scoped loggers, styled output, and remote logging     | <PackageInfo package="logit" type="size" /> |

### 💾 Data & State

Client-side data management made simple:

| Package                  | Description                                                                  | Size                                          |
| ------------------------ | ---------------------------------------------------------------------------- | --------------------------------------------- |
| **[Deposit](/deposit/)** | Schema-driven client-side storage with a rich query builder across LocalStorage and IndexedDB | <PackageInfo package="deposit" type="size" /> |
| **[Fetchit](/fetchit/)** | Modern HTTP client with smart caching, request deduplication, and a query layer            | <PackageInfo package="fetchit" type="size" /> |
| **[Stateit](/stateit/)** | Tiny reactive state management with computed values, transactions, and selective subscriptions | <PackageInfo package="stateit" type="size" /> |

### 🎨 Frontend & Forms

Build better user interfaces:

| Package                  | Description                                                             | Size                                          |
| ------------------------ | ----------------------------------------------------------------------- | --------------------------------------------- |
| **[Craftit](/craftit/)** | Web Components framework with reactive state and DOM reconciliation     | <PackageInfo package="craftit" type="size" /> |
| **[Formit](/formit/)**   | Form state management with validation, dirty tracking, and file uploads | <PackageInfo package="formit" type="size" />  |
| **[Validit](/validit/)** | Schema validation with async support and detailed error messages        | <PackageInfo package="validit" type="size" /> |
| **[i18nit](/i18nit/)**   | I18n with nested key lookup, variable interpolation, async locale loading, and reactive subscriptions | <PackageInfo package="i18nit" type="size" />  |

### 🏗️ Architecture & Security

Structure your application properly:

| Package                  | Description                                                              | Size                                          |
| ------------------------ | ------------------------------------------------------------------------ | --------------------------------------------- |
| **[Permit](/permit/)**   | RBAC with wildcard roles, dynamic permission functions, and anonymous user support                  | <PackageInfo package="permit" type="size" />  |
| **[Routeit](/routeit/)** | Hash/history router with middleware, async handlers, type-safe params, and View Transitions API     | <PackageInfo package="routeit" type="size" /> |
| **[Wireit](/wireit/)**   | Dependency injection with typed tokens, singleton/transient lifetimes, and scoped child containers  | <PackageInfo package="wireit" type="size" />  |

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
import { debounce, group } from '@vielzeug/toolkit';
import { createSnapshot } from '@vielzeug/stateit';
import { createHttpClient } from '@vielzeug/fetchit';

// Debounce search input
const search = debounce((query: string) => {
  console.log('Searching for:', query);
}, 300);

// Group items by a field
const users = [{ role: 'admin', name: 'Alice' }, { role: 'user', name: 'Bob' }];
const byRole = group(users, 'role'); // { admin: [Alice], user: [Bob] }

// Reactive state
const store = createSnapshot({ count: 0 });
store.subscribe((data) => console.log(data.count));
store.set((data) => ({ count: data.count + 1 }));

// HTTP client with deduplication
const http = createHttpClient({ baseUrl: '/api' });
const allUsers = await http.get<User[]>('/users');
```

## Common Use Cases

### Building a Form

```typescript
import { createForm } from '@vielzeug/formit';
import { v } from '@vielzeug/validit';

const emailSchema = v.string().email();
const ageSchema = v.number().min(18);

const form = createForm({
  fields: {
    email: {
      value: '',
      validators: (val) => {
        const result = emailSchema.safeParse(val);
        return result.success ? undefined : result.error.message;
      },
    },
    age: {
      value: 0,
      validators: (val) => {
        const result = ageSchema.safeParse(Number(val));
        return result.success ? undefined : result.error.message;
      },
    },
  },
});

await form.submit(async (formData) => {
  await fetch('/api/users', { method: 'POST', body: formData });
});
```

### Fetching & Caching Data

```typescript
import { createHttpClient, createQueryClient } from '@vielzeug/fetchit';

const http = createHttpClient({ baseUrl: '/api' });
const queryClient = createQueryClient({ staleTime: 5000 });

// Cached and deduplicated — concurrent calls share one request
const userId = 'user-42';
const user = await queryClient.fetch({
  queryKey: ['user', userId],
  queryFn: () => http.get<User>(`/users/${userId}`),
});

// Invalidate after a mutation
await http.post(`/users/${userId}`, { body: { name: 'Bob' } });
queryClient.invalidate(['user', userId]);
```

### Permission Management

```typescript
import { createPermit } from '@vielzeug/permit';

const permit = createPermit();

permit.set('admin', 'posts', { create: true, update: true, delete: true });
permit.set('user', 'posts', { create: true });

const canDelete = permit.check(currentUser, 'posts', 'delete');
```

### Reactive State

```typescript
import { createSnapshot } from '@vielzeug/stateit';

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

## Package Pairings

These combinations complement each other particularly well:

| Pairing | Why it works |
|---|---|
| **Validit + Formit** | Use Validit schemas directly as field validators — one schema drives both API validation and form error messages |
| **Fetchit + Stateit** | Fetch remote data with caching, then push results into a snapshot for reactive UI state |
| **Craftit + Stateit** | Share global app state across multiple web components via snapshots |
| **Deposit + Fetchit** | Persist API responses in IndexedDB for offline-capable apps with a typed query layer |
| **Permit + Routeit** | Guard route navigation with permission checks in router middleware |
| **Wireit + Logit** | Register a scoped logger per service in your DI container for structured, context-aware logging |

## Design Philosophy

### 1. Simple Over Clever

We prefer straightforward, readable code over clever abstractions. If you can understand what's happening at a glance, we've done our job.

### 2. TypeScript First

Every package is built with TypeScript from the ground up. Type inference works out of the box — no extra config, no separate type packages.

### 3. Zero/Minimal Dependencies

Most packages have 0–1 dependencies. Smaller bundles, fewer security vulnerabilities, less supply chain risk, faster installs.

### 4. Framework Agnostic

Use Vielzeug with React, Vue, Svelte, Angular, or plain TypeScript. No framework assumptions anywhere in the API.

### 5. Consistent Conventions

Learn one package's patterns — `create*` factories, `on*` subscriptions, `safeParse` for fallible operations — and you'll feel at home in all of them.

## Getting Help

| | |
|---|---|
| [Documentation](/toolkit/) | Each package has detailed usage guides, API references, and examples |
| [Discussions](https://github.com/helmuthdu/vielzeug/discussions) | Ask questions and share what you're building |
| [Issues](https://github.com/helmuthdu/vielzeug/issues) | Report bugs or request features |
| [REPL](/repl.html) | Try any package in your browser without installing |

## Next Steps

| | |
|---|---|
| [Toolkit](/toolkit/) | Start here — 100+ utilities for arrays, objects, strings, and async |
| [Stateit](/stateit/) | Add reactive state management to your app |
| [Fetchit](/fetchit/) | HTTP client with caching, retries, and deduplication |
| [Deposit](/deposit/) | Type-safe client-side storage with IndexedDB or LocalStorage |
| [Formit](/formit/) | Form state management with validation and dirty tracking |
| [REPL](/repl.html) | Explore all packages interactively without any setup |
