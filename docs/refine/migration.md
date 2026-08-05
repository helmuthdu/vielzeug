---
title: Refine 2.0 Migration
---

# Refine 2.0 Migration

Refine 2.0 migrates component observers to Ripple's `watch` module.

## Update custom component observers

If custom components or extensions use Refine observer internals, migrate them to Ripple's `watch(source, callback)` contract. Keep each watcher owned by its component lifecycle and dispose it when the component disconnects.

## Recheck reactive extensions

Test custom elements, plugins, and wrappers that derive behavior from component state. Confirm their observer cleanup, update timing, and error handling match the Ripple watch contract.

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for supported component entry points. Refine consumers should use documented component APIs rather than internal observer implementation details.
