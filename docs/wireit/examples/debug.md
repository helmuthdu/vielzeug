---
title: 'Wireit Examples — Debug'
description: 'Debug examples for wireit.'
---

## Debug

## Problem

Implement debug in a production-friendly way with `@vielzeug/wireit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/wireit` installed.

### Inspect all registered tokens

```ts
const container = createContainer();
container.value(ConfigToken, config);
container.bind(ServiceToken, UserService, { deps: [DbToken] });
container.alias(IUserServiceToken, ServiceToken);

const { tokens, aliases } = container.debug();
console.log(tokens); // ['AppConfig', 'UserService']
console.log(aliases); // [['IUserService', 'UserService']]
```

### Debugging parent chain

```ts
const root = createContainer();
root.value(ConfigToken, config);
root.bind(LoggerToken, ConsoleLogger);

const child = root.createChild();
child.bind(ServiceToken, UserService, { deps: [LoggerToken] });

// debug() on child walks the full hierarchy
const { tokens } = child.debug();
console.log(tokens); // ['UserService', 'AppConfig', 'Logger'] (child first)
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Aliases](./aliases.md)
- [Async Providers](./async-providers.md)
- [Basic Setup](./basic-setup.md)
