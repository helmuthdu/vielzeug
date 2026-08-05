---
title: Flux 2.0 Migration
---

# Flux 2.0 Migration

Flux 2.0 redesigns streams around returned teardowns, `pipe()`, explicit buffers, channels, adapter sub-paths, and terminal consumer names.

## Replace subscription cleanup

Update stream consumers to retain and invoke the teardown returned by the 2.0 subscription contract. Do not rely on removed subscription-lifecycle shapes.

## Compose with `pipe()`

Build stream transformations through `pipe()` and current operators. Update creation, transformation, filtering, and terminal consumption to their 2.0 names.

## Make buffering explicit

Configure buffering and overflow behavior through the 2.0 stream and channel APIs. Review every source that can outpace its consumer.

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for current streams, adapters, operators, and teardown contracts.
