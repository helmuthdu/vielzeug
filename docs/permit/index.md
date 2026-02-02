# <img src="/logo-permit.svg" alt="Permit" width="40" style="display: inline-block; vertical-align: middle; margin-right: 10px;"> Permit

<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-6.5_KB-success" alt="Size">
</div>

**Permit** is a flexible, type-safe permission and role management utility for modern web apps. It provides a simple API for registering, checking, and managing permissions and roles, with support for dynamic rules and full TypeScript support.

## 🚀 Key Features

- **Role & Resource Based**: Powerful permission model using roles, resources, and actions.
- **Dynamic Rules**: Support for functional rules for complex, context-aware permission checks.
- **Type-safe**: Built with TypeScript for full autocompletion and type safety.
- **Wildcards**: Easily handle broad permissions with wildcard support for roles and resources.
- **Zero Dependencies**: Lightweight and fast, perfect for both client and server.
- **Isomorphic**: Works everywhere JavaScript runs.

## 🏁 Quick Start

```sh
pnpm add @vielzeug/permit
```

### Basic Setup

```ts
import { Permit } from '@vielzeug/permit';

// 1. Register permissions
Permit.register('admin', 'posts', { view: true, create: true, edit: true });
Permit.register('editor', 'posts', { view: true, edit: true });

// 2. Check permissions
const user = { id: 'u1', roles: ['editor'] };

if (Permit.check(user, 'posts', 'create')) {
  // This won't run for editor
}

if (Permit.check(user, 'posts', 'view')) {
  // This will run
}
```

## 📚 Documentation

- **[Usage Guide](./usage.md)**: Installation, configuration, and basic concepts.
- **[API Reference](./api.md)**: Detailed documentation of all methods and types.
- **[Examples](./examples.md)**: Advanced patterns for dynamic rules and wildcards.

## 💡 Why Permit?

Managing permissions manually with `if/else` chains is error-prone and hard to maintain. Permit provides a centralized, declarative way to define your application's security policy, making it easier to audit, test, and evolve as your app grows.

---

> **Tip:** Permit is part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) ecosystem.

<style>
.badges {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
}
</style>

