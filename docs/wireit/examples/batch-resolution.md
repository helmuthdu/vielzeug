---
title: 'Wireit Examples — Batch Resolution'
description: 'Batch Resolution examples for wireit.'
---

## Batch Resolution

## Problem

Implement batch resolution in a production-friendly way with `@vielzeug/wireit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/wireit` installed.

### Resolve multiple dependencies with `Promise.all`

```ts
const [db, config, logger] = await Promise.all([
  container.resolve(DbToken),
  container.resolve(ConfigToken),
  container.resolve(LoggerToken),
]);
```

### Resolve all providers on a multi-provider token

For tokens registered with `{ multi: true }`, use `resolveMany` instead of `resolveAll`:

```ts
const ValidatorToken = createToken<Validator>('Validator');

container.bind(ValidatorToken, EmailValidator, { multi: true });
container.bind(ValidatorToken, PhoneValidator, { multi: true });
container.bind(ValidatorToken, LengthValidator, { multi: true });

// resolveMany returns an array — one value per registered provider in order
const validators = await container.resolveMany(ValidatorToken);
// [EmailValidator, PhoneValidator, LengthValidator]

for (const validator of validators) {
  await validator.validate(input);
}
```

### Bootstrap function

```ts
async function bootstrap() {
  const container = createContainer();
  // ... register all providers ...

  const [db, cache, queue] = await Promise.all([
    container.resolve(DbToken),
    container.resolve(CacheToken),
    container.resolve(QueueToken),
  ]);

  await Promise.all([db.migrate(), cache.warm(), queue.start()]);

  return container.resolve(AppToken);
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

- [Basic Setup](./basic-setup.md)
- [Async Providers](./async-providers.md)
- [Child Containers](./child-containers.md)
