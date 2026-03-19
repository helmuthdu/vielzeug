---
title: 'Stateit Examples — Pattern: Shared Module Store'
description: 'Pattern: Shared Module Store examples for stateit.'
---

## Pattern: Shared Module Store

## Problem

Implement pattern: shared module store in a production-friendly way with `@vielzeug/stateit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/stateit` installed.

Structure stores as plain modules — no class registration or plugin needed:

```ts
// stores/auth.store.ts
import { store, computed, readonly } from '@vielzeug/stateit';

type AuthState = {
  token: string | null;
  user: User | null;
  loading: boolean;
};

const s = store<AuthState>({ token: null, user: null, loading: false });

// Computed signals for derived values
export const isAuthenticated = computed(() => !!s.value.token);
export const currentUser = computed(() => s.value.user);

// Public read-only view — callers can observe but not mutate
export const authStore = readonly(s);

// Mutations (exported as functions, not methods)
export async function login(credentials: Credentials) {
  s.patch({ loading: true });
  try {
    const { token, user } = await authenticate(credentials);
    s.value = { token, user, loading: false };
  } catch {
    s.patch({ loading: false });
  }
}

export function logout() {
  s.reset();
}
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Framework Integration](./framework-integration.md)
- [Pattern: Batch for Complex Mutations](./pattern-batch-for-complex-mutations.md)
- [Pattern: `nextValue` in Async Workflows](./pattern-nextvalue-in-async-workflows.md)
