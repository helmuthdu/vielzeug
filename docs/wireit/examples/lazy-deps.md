---
title: 'Wireit Examples — Lazy Dependencies'
description: 'Deferred dependency resolution with lazy tokens.'
---

## Lazy Dependencies

Lazy dependencies let a provider receive a `() => Promise<T>` function instead of a fully resolved value. The dependency is only resolved on the first call to that function, not at container startup.

## Syntax

Wrap a token with `lazy()` in the `deps` array:

```ts
import { createToken, lazy, type LazyResolver } from '@vielzeug/wireit';

const HeavyToken = createToken<HeavyService>('HeavyService');
const ConsumerToken = createToken<Consumer>('Consumer');

container.factory(HeavyToken, async () => {
  // expensive initialization
  return new HeavyService();
});

container.factory(
  ConsumerToken,
  async (getHeavy: LazyResolver<HeavyService>) => new Consumer(getHeavy),
  { deps: [lazy(HeavyToken)] },
);
```

Inside `Consumer`, call `getHeavy()` only when needed:

```ts
class Consumer {
  constructor(private readonly getHeavy: LazyResolver<HeavyService>) {}

  async doWork() {
    const heavy = await this.getHeavy(); // resolved only here, on first call
    return heavy.compute();
  }
}
```

## Use cases

### Breaking optional dependencies

```ts
const AnalyticsToken = createToken<Analytics>('Analytics');
const AppToken = createToken<App>('App');

// Analytics may not be registered in all environments
container.factory(
  AppToken,
  async (getAnalytics: LazyResolver<Analytics>) => {
    return {
      async track(event: string) {
        const analytics = await getAnalytics().catch(() => null);
        analytics?.record(event);
      },
    };
  },
  { deps: [lazy(AnalyticsToken)] },
);
```

### Soft circular dependency

If two services need each other but one can be deferred, use `lazy` to resolve the cycle:

```ts
const AuthToken = createToken<AuthService>('AuthService');
const ApiToken = createToken<ApiService>('ApiService');

container.factory(
  AuthToken,
  async (getApi: LazyResolver<ApiService>) => new AuthService(getApi),
  { deps: [lazy(ApiToken)] },
);

container.factory(
  ApiToken,
  async (auth: AuthService) => new ApiService(auth),
  { deps: [AuthToken] },
);

// Resolves without CircularDependencyError because AuthToken's dep on ApiToken is lazy
const auth = await container.resolve(AuthToken);
```

### Startup performance

Heavy services (database connections, remote config fetchers) can be deferred to first use rather than eagerly initialized at container startup:

```ts
container.factory(
  ServiceToken,
  async (getDb: LazyResolver<IDatabase>) => new UserService(getDb),
  { deps: [lazy(DbToken)] },
);

// The service is created immediately; the DB connection is deferred until first query
const svc = await container.resolve(ServiceToken);
```

## Notes

- `LazyResolver<T>` is just `() => Promise<T>` — a plain zero-arg async function. No special proxy or magic.
- The resolved value is a singleton (or scoped/transient, per its registration) — calling `getHeavy()` multiple times does not re-run the factory.

## Related Recipes

- [Async Providers](./async-providers.md)
- [Modules](./modules.md)
- [Multi-Providers](./multi-providers.md)
