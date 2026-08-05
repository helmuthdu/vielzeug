# @vielzeug/conduit

Typed, dependency-first asynchronous dependency injection for TypeScript.

## Install

```sh
pnpm add @vielzeug/conduit
```

## Start Here

```ts
import { createContainer, token } from '@vielzeug/conduit';

const Config = token<{ baseUrl: string }>('Config');
const Client = token<{ url: string }>('Client');

const container = createContainer();
container.value(Config, { baseUrl: '/api' });
container.factory(Client, [Config], (config) => ({ url: `${config.baseUrl}/users` }));

console.log(await container.resolve(Client));
await container.dispose();
```

## Design

- Factory dependency tuples drive resolution and validation.
- Factory results default to singleton lifetime.
- Use `{ lifetime: 'transient' }` for a new value per resolution; add `dispose` only when Conduit must own its cleanup.
- Use `scope()` and `createScope()` for request/job ownership. A singleton cannot depend on a scoped factory.
- Disposal aborts `disposalSignal`, waits for in-flight factories, and releases dependents before dependencies.

```ts
import { createContainer, scope, token } from '@vielzeug/conduit';

const Request = scope('request');
const Session = token<{ id: string }>('Session');
const root = createContainer();

root.factory(Session, [], () => ({ id: crypto.randomUUID() }), { lifetime: Request });

const request = root.createScope(Request);
const session = await request.resolve(Session);
await request.dispose();
await root.dispose();
```

## Validation

Validate static dependencies before application startup completes.

```ts
container.validate();
```

`validate()` detects missing registrations and circular factory tuples.

## Errors

All errors extend `ConduitError`. Use `ConduitError.is(error)` for package-boundary guards.

- `ConduitError`
- `ConduitProviderNotFoundError`
- `ConduitCircularDependencyError`
- `ConduitScopedResolutionError`
- `ConduitDuplicateRegistrationError`
- `ConduitDisposedError`
- `ConduitDisposeError`

## Documentation

- [Overview](https://vielzeug.dev/conduit/)
- [Usage](https://vielzeug.dev/conduit/usage)
- [API](https://vielzeug.dev/conduit/api)
- [Examples](https://vielzeug.dev/conduit/examples)

## License

MIT © Helmuth Saatkamp
