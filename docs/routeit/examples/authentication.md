---
title: 'Routeit Examples — Authentication'
description: 'Authentication examples for routeit.'
---

## Authentication

## Problem

Implement authentication in a production-friendly way with `@vielzeug/routeit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/routeit` installed.

Complete authentication flow with protected routes.

```ts
import { createRouter } from '@vielzeug/routeit';
import type { Middleware } from '@vielzeug/routeit';

interface User {
  id: string;
  name: string;
  roles: string[];
}

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
  logout() {
    localStorage.removeItem('authToken');
  },
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

const requireRole =
  (role: string): Middleware =>
  async (ctx, next) => {
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
  .group(
    '/dashboard',
    (r) => {
      r.on('/', (ctx) => {
        const user = ctx.locals.user as User;
        renderDashboard(user);
      });
      r.on('/profile', (ctx) => renderProfile(ctx.locals.user as User));
    },
    { middleware: requireAuth },
  )

  // Admin-only routes
  .group(
    '/admin',
    (r) => {
      r.on('/reports', renderReports);
      r.on('/users', renderAdminUsers);
    },
    { middleware: [requireAuth, requireRole('admin')] },
  )

  .start();
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [autoStart](./autostart.md)
- [Base Path Deployment](./base-path-deployment.md)
- [Error Handling](./error-handling.md)
