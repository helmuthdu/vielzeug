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

`debug()` returns structured per-token metadata including provider kind, lifetime, and whether the instance has been resolved yet.

```ts
const container = createContainer();
container.value(ConfigToken, config);
container.bind(ServiceToken, UserService, { lifetime: 'singleton', deps: [DbToken] });
container.alias(IUserServiceToken, ServiceToken);

const { tokens, aliases } = container.debug();

// tokens: Array<{ name: string; provider: 'value'|'class'|'factory'; lifetime: Lifetime; resolved: boolean }>
console.log(tokens);
// [
//   { name: 'AppConfig', provider: 'value',  lifetime: 'singleton', resolved: false },
//   { name: 'UserService', provider: 'class', lifetime: 'singleton', resolved: false },
// ]

// aliases: Array<[aliasName: string, sourceName: string]>
console.log(aliases);
// [['IUserService', 'UserService']]
```

### Debugging parent chain

`debug()` on a child walks the full hierarchy, with child entries taking precedence over parent entries for the same token.

```ts
const root = createContainer();
root.value(ConfigToken, config);
root.bind(LoggerToken, ConsoleLogger);

const child = root.createChild();
child.bind(ServiceToken, UserService, { deps: [LoggerToken] });

const { tokens } = child.debug();
// child-local tokens first, then inherited
console.log(tokens.map((t) => t.name)); // ['UserService', 'AppConfig', 'Logger']
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
