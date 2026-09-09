---
title: Migrate Sandbox to Version 3
description: Migrate from Sandbox 2 to the smaller Version 3 runtime API and explicit message trust boundary.
---

[[toc]]

## Sandbox 3 Changes

Sandbox 3 removes APIs that duplicated `render()` or represented internal document machinery. It also stops typing untrusted iframe messages as application payloads.

## Rename `namedStyles` to `styles`

```ts
// Sandbox 2
createSandbox(container, {
  namedStyles: { theme: 'body { color-scheme: dark; }' },
});

// Sandbox 3
createSandbox(container, {
  styles: { theme: 'body { color-scheme: dark; }' },
});
```

`updateStyle(id, css)` keeps the same behavior.

## Merge `setState()` and `setStateAll()`

Sandbox 3 accepts one partial state object. A single-key update and a batch use the same method.

```ts
// Sandbox 2
sandbox.setState('theme', 'dark');
sandbox.setStateAll({ locale: 'en', theme: 'dark' });

// Sandbox 3
sandbox.setState({ theme: 'dark' });
sandbox.setState({ locale: 'en', theme: 'dark' });
```

## Remove typed host events and validation hooks

Sandbox 2 allowed an `Events` generic and boolean validation callbacks. The generic asserted a payload type before runtime validation, while a boolean callback could not establish that TypeScript type.

```ts
// Sandbox 2
const sandbox = createSandbox<State, Events>(container, {
  validateEvent,
  validateState,
});

sandbox.onMessage((message) => {
  if (message.type === 'custom' && message.event === 'saved') {
    useId(message.detail.id);
  }
});
```

Narrow custom details where they cross into the host instead.

```ts
// Sandbox 3
const sandbox = createSandbox<State>(container);

sandbox.onMessage((message) => {
  if (message.type === 'custom' && message.event === 'saved' && isSavedDetail(message.detail)) {
    useId(message.detail.id);
  }
});
```

`SandboxBridge<State, Events>` still checks authored sandbox-side calls. It does not change the host trust boundary.

## Remove `SandboxHandle.ready`

`render()` already returns the Promise for the document being rendered. Await that Promise directly.

```ts
// Sandbox 2
sandbox.render(html);
await sandbox.ready;

// Sandbox 3
await sandbox.render(html);
```

## Remove render cancellation options

The previous `{ signal }` parameter only skipped calls when the signal was already aborted; it did not cancel an in-flight render. Sandbox 3 removes that misleading option.

```ts
// Sandbox 2
await sandbox.render(html, { signal });

// Sandbox 3
if (!signal.aborted) await sandbox.render(html);
```

Use `sandbox.disposalSignal` to tie external asynchronous work to the sandbox lifetime.

## Remove public document builders

`buildCsp()` and `buildDocument()` exposed internal document-generation details. `buildDocument()` also generated a placeholder channel rather than a managed runtime document.

```ts
// Sandbox 2
const html = buildDocument(fragment, options);
iframe.srcdoc = html;

// Sandbox 3
const sandbox = createSandbox(container, options);
await sandbox.render(fragment);
```

Use a separate document templating boundary when you need static HTML without a managed iframe.

## Removed Types

Remove imports of:

- `EventMap`
- `StateMap`
- `SandboxStateUpdateDetail`
- `Unsubscribe`
- `ValidateEvent`
- `ValidateState`

Use ordinary application interfaces, `SandboxMessage`, and `() => void` directly.

## Bridge Initialization

The generated bridge now installs in `<head>` before injected and user scripts. Error forwarding therefore captures failures during document initialization. The ready message is emitted on `DOMContentLoaded`.
