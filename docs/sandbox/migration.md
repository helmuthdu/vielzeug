---
title: Sandbox 2 Migration
description: Migrate incremental body updates and configuration handling to Sandbox 2.
---

[[toc]]

## Sandbox 2 Changes

Sandbox 2 keeps `createSandbox()`, `render()`, `ready`, state updates, style updates, and message subscriptions. It renames destructive body updates and rejects malformed document/CSP configuration instead of rewriting it.

Removed API:

- `sandbox.patch(html)`

Added error:

- `SandboxConfigurationError`

## Replace `patch()`

Use `replaceBody()` for streamed markup.

```ts
// Sandbox 1
sandbox.patch(html);
```

```ts
// Sandbox 2
sandbox.replaceBody(html);
```

`replaceBody()` does not navigate the iframe. Head scripts, named styles, document listeners, and window listeners remain. Body descendants, their listeners, references, form state, and scripts inside replacement HTML are replaced.

Accumulate streaming HTML on the host before replacement:

```ts
let html = '';

for await (const chunk of stream) {
  html += chunk;
  sandbox.replaceBody(html);
}
```

## Fix Invalid Configuration

Sandbox now validates configuration before creating a CSP or document.

```ts
// Sandbox 1: malformed value was modified internally
createSandbox(container, {
  allowedScriptOrigins: ['cdn.example.com/widgets'],
});
```

```ts
// Sandbox 2: use an absolute origin
createSandbox(container, {
  allowedScriptOrigins: ['https://cdn.example.com'],
  scripts: ['https://cdn.example.com/widgets.js'],
});
```

These values now throw `SandboxConfigurationError` when invalid:

- allowed origins with paths, credentials, query strings, fragments, unsupported schemes, or CSP syntax
- script URLs without absolute `http:` or `https:` URLs
- nonces outside base64/base64url token syntax
- language tags outside the supported basic form, such as `en`, `de`, or `zh-Hant`
- named style IDs that do not start with a letter or contain characters outside letters, digits, `_`, and `-`

```ts
import { SandboxConfigurationError } from '@vielzeug/sandbox';

try {
  createSandbox(container, { nonce: 'invalid nonce' });
} catch (error) {
  if (error instanceof SandboxConfigurationError) console.error(error.message);
}
```

## Testing Helpers

`createSandboxTestHelpers(container)` keeps its public methods. Create the helper after `render()` starts so it can bind to the live iframe protocol metadata. Direct `buildDocument()` output remains static markup; use `createSandbox()` when a host must manage state or lifecycle.

```ts
const sandbox = createSandbox(container);
const render = sandbox.render('<p>test</p>');
const helpers = createSandboxTestHelpers(container);

helpers.fireReady();
await render;
```
