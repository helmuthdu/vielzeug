---
title: 'Routeit Examples — Typed Group Prefix Params'
description: 'Typed Group Prefix Params examples for routeit.'
---

## Typed Group Prefix Params

## Problem

Implement typed group prefix params in a production-friendly way with `@vielzeug/routeit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/routeit` installed.

When a group prefix contains path params, they are typed inside every `on()` handler in the group — no runtime casting required:

```ts
import { createRouter } from '@vielzeug/routeit';
import type { Middleware } from '@vielzeug/routeit';

interface Project {
  id: string;
  name: string;
}
interface Task {
  id: string;
  title: string;
}

const requireAuth: Middleware = async (ctx, next) => {
  if (!isLoggedIn()) {
    await ctx.navigate('/login');
    return;
  }
  await next();
};

const router = createRouter();

router.group(
  '/orgs/:orgId',
  (r) => {
    r.on('/overview', ({ params }) => {
      params.orgId; // ✓ typed string
      renderOrgOverview(params.orgId);
    });

    r.group('/projects/:projectId', (inner) => {
      inner.on('/', ({ params }) => {
        params.orgId; // ✓ typed string — from outer prefix
        params.projectId; // ✓ typed string — from inner prefix
        renderProject(params.orgId, params.projectId);
      });

      inner.on('/tasks/:taskId', ({ params }) => {
        params.orgId; // ✓ typed string
        params.projectId; // ✓ typed string
        params.taskId; // ✓ typed string
        renderTask(params.orgId, params.projectId, params.taskId);
      });
    });
  },
  { middleware: requireAuth },
);

router.start();
```

This eliminates parameter casting entirely in deeply-nested route groups.

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Authentication](./authentication.md)
- [autoStart](./autostart.md)
- [Base Path Deployment](./base-path-deployment.md)
