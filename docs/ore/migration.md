---
title: Ore 2.0 Migration
---

# Ore 2.0 Migration

Ore 2.0 consolidates runtime APIs at the package root and removes sub-path runtime imports, `model()`, form-controller policy, `onError` recovery, colon bindings, asynchronous setup, and implicit HTML injection.

## Import runtime APIs from package root

Move browser-runtime imports to `@vielzeug/ore`. `@vielzeug/ore/testing` remains the only public sub-path.

## Use synchronous setup and explicit HTML sinks

Make component `setup()` synchronous. Replace implicit raw HTML rendering with explicit `unsafeHtml()` only after sanitizing untrusted content.

## Replace removed APIs

Remove `model()`, form-controller policy, `onError` recovery, and colon bindings. Use the 2.0 component, host-binding, lifecycle, and `useField` APIs instead.

## Update form and event integrations

Use `bind({ aria }, { target })` for reactive ARIA bindings. Replace removed `FormFieldHandle.setValidity()` calls with `setCustomValidity()` or `ElementInternals` handling.

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for current root API and component lifecycle contracts.
