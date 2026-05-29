---
title: 'Wired Examples — Multi Providers'
description: 'Multi providers example for @vielzeug/wired.'
---

## Multi Providers

### Problem

Multiple implementations need to be registered under the same token — for a plugin system, a collection of middleware, or a set of event handlers — and all of them must be retrieved together.

### Solution

Pass `{ multi: true }` when registering each provider and use `container.resolveMany()` to retrieve the full list.

```ts
import { createContainer, createToken } from '@vielzeug/wired';

interface Plugin {
  name: string;
  activate(): void;
}

const Plugin = createToken<Plugin>('Plugin');
const container = createContainer();

container.value(Plugin, { name: 'analytics', activate() { console.log('analytics on'); } }, { multi: true });
container.value(Plugin, { name: 'devtools',  activate() { console.log('devtools on');  } }, { multi: true });
container.value(Plugin, { name: 'logger',    activate() { console.log('logger on');    } }, { multi: true });

const plugins = await container.resolveMany(Plugin);
plugins.forEach((p) => p.activate());
// logs: "analytics on", "devtools on", "logger on"
```

#### Multi providers with factories

```ts
import { createContainer, createToken } from '@vielzeug/wired';

interface Middleware { handle(req: Request): Request }

const Middleware = createToken<Middleware>('Middleware');
const container = createContainer();

container.factory(Middleware, () => ({ handle: (req) => { /* add auth header */ return req; } }), { multi: true });
container.factory(Middleware, () => ({ handle: (req) => { /* add trace id  */ return req; } }), { multi: true });

const middlewares = await container.resolveMany(Middleware);
const processed = middlewares.reduce((req, mw) => mw.handle(req), new Request('/'));
```

### Pitfalls

- Calling `container.resolve()` on a multi token throws `MultipleProvidersError`. Use `resolveMany()` for tokens registered with `{ multi: true }`.
- `resolveMany()` returns `[]` when no providers are registered for the token — it does not throw. Guard on an empty array if at least one provider is required.
- Registering a provider without `{ multi: true }` after already registering one for the same token with `{ multi: true }` will add to the multi list. There is no distinction between multi and non-multi after the fact — use consistent options for a given token.

### Related

- [Batch Resolution](./batch-resolution.md)
- [Basic Setup](./basic-setup.md)
- [Async Providers](./async-providers.md)
