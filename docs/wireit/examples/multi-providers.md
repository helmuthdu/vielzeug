---
title: 'Wireit Examples — Multi-Providers'
description: 'Registering and resolving multiple providers for a single token.'
---

## Multi-Providers

Register multiple implementations under a single token — useful for middleware chains, validator pipelines, event handlers, and plugin systems.

## Registration

Use `{ multi: true }` on any registration method. Each call appends to the list rather than replacing it:

```ts
const ValidatorToken = createToken<Validator>('Validator');

container.bind(ValidatorToken, EmailValidator, { multi: true });
container.bind(ValidatorToken, PhoneValidator, { multi: true });
container.bind(ValidatorToken, LengthValidator, { multi: true });
```

All three registration methods (`value`, `factory`, `bind`) support `multi`. You can mix them freely under one token:

```ts
const MiddlewareToken = createToken<Middleware>('Middleware');

container.factory(MiddlewareToken, () => new CorsMiddleware(), { multi: true });
container.bind(MiddlewareToken, AuthMiddleware, { deps: [JwtToken], multi: true });
container.factory(MiddlewareToken, (logger) => new LoggingMiddleware(logger), {
  deps: [LoggerToken],
  multi: true,
});
```

## Resolution

Use `resolveMany(token)` to get an array of all registered instances in registration order:

```ts
const validators = await container.resolveMany(ValidatorToken);
// [EmailValidator, PhoneValidator, LengthValidator]

// Run all validators in sequence
for (const validator of validators) {
  await validator.validate(input);
}
```

Calling `resolve(token)` on a multi-provider token throws `MultipleProvidersError`. This is intentional — it forces deliberate use of `resolveMany` to avoid accidentally ignoring extra providers.

```ts
// throws MultipleProvidersError — use resolveMany instead
const validator = await container.resolve(ValidatorToken);
```

## Plugin system

```ts
const PluginToken = createToken<Plugin>('Plugin');

// Core plugins
container.bind(PluginToken, LogPlugin, { multi: true });
container.bind(PluginToken, MetricsPlugin, { multi: true });

// Feature plugins added conditionally
if (process.env.FEATURE_ANALYTICS) {
  container.bind(PluginToken, AnalyticsPlugin, { multi: true });
}

const plugins = await container.resolveMany(PluginToken);
await Promise.all(plugins.map((p) => p.initialize()));
```

## Child containers

Multi-provider tokens work with child containers. A child uses the provider list it can see, starting from its own registry:

```ts
const child = container.createChild();
// child inherits parent providers; additional ones can be registered per child
child.bind(PluginToken, DebugPlugin, { multi: true });

const plugins = await child.resolveMany(PluginToken);
// [LogPlugin, MetricsPlugin, DebugPlugin] — parent providers + child's own
```

> Note: if the child has *any* local registration for a token, the parent's registrations for that token are shadowed entirely. To extend, not replace, register all providers in the same container level.

## Related Recipes

- [Batch Resolution](./batch-resolution.md)
- [Modules](./modules.md)
- [Aliases](./aliases.md)
