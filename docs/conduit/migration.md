---
title: Conduit Migration
---

# Conduit 3.0 Migration

Conduit 3.0 moves registration to immutable provider arrays and validates static graphs during container construction. Typed provider builders preserve token/value and dependency inference. Direct resolution, transient lifetime, and child-container overrides remain available.

## Adopt immutable provider builders

Replace mutable `value()` and `factory()` calls with `valueProvider()` and `factoryProvider()` entries passed to `createContainer()`:

```ts
// Before
const container = createContainer();
container.value(Config, { baseUrl: '/api' });
container.factory(Client, [Config], (config) => ({ url: `${config.baseUrl}/users` }));
container.validate();

// After
const container = createContainer([
  valueProvider(Config, { baseUrl: '/api' }),
  factoryProvider(Client, [Config], (config) => ({ url: `${config.baseUrl}/users` })),
]);
```

Use the builders for inline definitions. They infer factory arguments from the dependency tuple and verify values, results, and disposers against the token type. Explicit `ValueProvider` and `FactoryProvider` annotations remain available for reusable declarations.

Construction validates provider shape, duplicate local tokens, missing static dependencies, cycles, and captive singleton dependencies. There is no separate `validate()` step. Ownership of disposable value providers transfers only after construction succeeds.

## Resolve one service or a composition map

Composition-root maps remain the recommended application boundary, while direct token resolution remains useful for one root service and focused tests:

```ts
const client = await container.resolve(Client);
const services = await container.resolve({ client: Client, config: Config });
```

Top-level tokens that are not static factory dependencies cannot be checked during construction and fail when resolved.

## Keep transient lifetime and child-container ownership

`'transient'` creates one value per resolution and assigns cleanup to the requesting container. A child container caches its own singletons, which is how request, job, and test ownership is spelled.

```ts
const root = createContainer([
  factoryProvider(Attempt, [], () => ({}), { lifetime: 'transient' }),
]);

const request = root.createScope({
  providers: [factoryProvider(RequestId, [], () => ({ id: crypto.randomUUID() }))],
});
const requestId = await request.resolve(RequestId);
await request.dispose();
```

Singletons cannot depend on transient factories. Add `disposalSignalToken` to a dependency tuple when a factory needs its owning container's cancellation signal.

## Add immutable child-container overrides

Pass local providers when creating a child container instead of mutating it after construction:

```ts
const test = root.createScope({
  name: 'test',
  providers: [valueProvider(Clock, fakeClock)],
});
```

Local providers shadow parent registrations for that child and its descendants. Their graph is validated before the child is returned.

## Recheck disposal

Disposal now waits for the complete creation path, including async cleanup of factories that finish after disposal begins. Every cleanup failure is collected in readonly `ConduitDisposeError.errors`. Error names remain stable in ESM and CJS artifacts.

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for current contracts.
