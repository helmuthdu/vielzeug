# <img src='/logo-permit.svg' alt='Permit Logo' width='156' style='float: left; padding: 1rem; margin: 1rem;'/> Permit

**Permit** is a flexible, type-safe permission and role management utility for modern web apps. It provides a simple API for registering, checking, and managing permissions and roles, with support for dynamic rules and full TypeScript support.

## 🚀 Features

- Role-based and resource-based permissions
- Dynamic permission checks (functions)
- Type-safe API and extensible user/data types
- Wildcard roles and resources
- Simple registration and clearing of permissions
- Zero dependencies (except for optional logger)

## 🏁 Getting Started

```ts
import { Permit } from '@vielzeug/permit';

Permit.register('admin', 'posts', { view: true, create: true });
const user = { id: '1', roles: ['admin'] };
const canView = Permit.check(user, 'posts', 'view');
```

## 📚 Documentation

- [API Reference](./api.md): Full API details for all methods and types.
- [Usage](./usage.md): How to install, set up, and use Permit in your project.
- [Examples](./examples.md): Practical code samples for all major features.

## 💡 Why Permit?

- No more ad-hoc permission checks
- Centralized, testable permission logic
- Works with any user model
- Built for modern web apps

---

> **Tip:** Permit is part of the [Vielzeug](https://github.com/vielzeug) toolkit for modern web development.
