---
title: Wireit Usage Guide
description: Practical usage for @vielzeug/wireit.
---

# Usage Guide

## Tokens

```ts
const ConfigToken = createToken<AppConfig>('Config');
const DbToken = createToken<IDatabase>('Database');
const ServiceToken = createToken<UserService>('UserService');
```

## Registration

```ts
container.value(ConfigToken, { dbUrl: 'postgres://...' });
container.factory(DbToken, (cfg) => new Database(cfg.dbUrl), { deps: [ConfigToken] });
container.bind(ServiceToken, UserService, { deps: [DbToken] });
```

Register multiple providers under one token with `multi: true`:

```ts
container.value(ValidatorToken, new EmailValidator(), { multi: true });
container.value(ValidatorToken, new PhoneValidator(), { multi: true });
```

Run post-construction logic with `init`, and cleanup with `dispose`:

```ts
container.factory(DbToken, () => new Database(process.env.DB_URL!), {
  init: (db) => db.connect(),
  dispose: (db) => db.close(),
});
```

## Resolution

```ts
const service = await container.resolve(ServiceToken);
const validators = await container.resolveMany(ValidatorToken);
```

`resolve()` is strict and throws if a token has multiple providers. Use `resolveMany()` for multi-provider tokens.

## Lifetimes

- `singleton`: one instance per container (default)
- `transient`: new instance per resolution
- `scoped`: one instance per child container

```ts
container.factory(RequestIdToken, () => crypto.randomUUID(), { lifetime: 'transient' });
container.bind(RequestContextToken, RequestContext, { lifetime: 'scoped' });
```

## Child Containers

```ts
const child = container.createChild();
child.value(UserToken, req.user);

const handler = await child.resolve(RequestHandlerToken);
```

## Async Providers

```ts
container.factory(DbToken, async () => {
  const db = new Database(process.env.DB_URL!);
  await db.connect();
  return db;
});

const db = await container.resolve(DbToken);
```

## Disposal

```ts
const container = createContainer();

container.factory(DbToken, () => new Database(process.env.DB_URL!), {
  init: (db) => db.connect(),
  dispose: (db) => db.close(),
});

await container.resolve(DbToken);
await container.dispose();
```
