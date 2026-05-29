---
title: 'Ripple Examples — Pattern: Shared Module Store'
description: 'Pattern: Shared Module Store examples for ripple.'
---

## Pattern: Shared Module Store

### Problem

Multiple components or modules need access to the same reactive state. You want a shared store without a global registry, a plugin system, or constructor injection.

### Solution

Structure stores as plain modules — no class registration or plugin needed:

```ts
// stores/auth.store.ts
import { computed, readonly, store } from '@vielzeug/ripple';
import type { ReadonlySignal } from '@vielzeug/ripple';

type User = { id: string; name: string };
type Credentials = { email: string; password: string };

async function authenticate(credentials: Credentials): Promise<{ token: string; user: User }> {
  void credentials;
  return { token: 'demo-token', user: { id: 'u1', name: 'Demo User' } };
}

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
export const authStore: ReadonlySignal<AuthState> = readonly(s);

// Mutations (exported as functions, not methods)
export async function login(credentials: Credentials) {
  s.patch({ loading: true });
  try {
    const { token, user } = await authenticate(credentials);
    s.update(() => ({ token, user, loading: false }));
  } catch {
    s.patch({ loading: false });
  }
}

export function logout() {
  s.reset();
}
```


### Pitfalls

- A module-level store is a singleton. Tests that import it share the same instance — reset signal values to initial state in `afterEach` to prevent cross-test contamination.
- Circular imports between the store module and a module that uses it can cause the store to be `undefined` during initialization. Keep the store in a leaf module with no upstream dependencies.
- Exporting individual writable signals directly allows external code to mutate internal state, breaking encapsulation. Export derived read-only values or explicit setter functions instead.

### Related
- [Shared Bus (Relay)](@vielzeug/relay/examples/module-level-bus)
- [DI Container (Wired)](/wired/)

- [Usage Guide](../usage.md#framework-integration)
- [Pattern: Batch for Complex Mutations](./pattern-batch-for-complex-mutations.md)
- [Pattern: Async Workflows with watch](./pattern-nextvalue-in-async-workflows.md)
