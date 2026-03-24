---
title: 'Eventit Examples — Custom error boundary'
description: 'Custom error boundary examples for eventit.'
---

## Custom error boundary

## Problem

Implement custom error boundary in a production-friendly way with `@vielzeug/eventit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/eventit` installed.

Collect errors across an event bus session with typed context:

Use `onError` to collect listener failures while allowing remaining listeners to continue.
For each failure, Eventit passes `err`, the emitted `event`, and that event's `payload`.

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Awaiting a one-time event](./awaiting-a-one-time-event.md)
- [Framework Integration](./framework-integration.md)
- [Handling disposal in async code](./handling-disposal-in-async-code.md)
