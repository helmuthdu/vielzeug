---
title: Clockwork 2.0 Migration
---

# Clockwork 2.0 Migration

Clockwork 2.0 redesigns state machines around pure transitions and actors.

## Separate transition logic from execution

Define state transitions as pure machine behavior. Move effects, asynchronous work, and lifecycle ownership into actors rather than embedding them in transition logic.

## Adopt actor-based runtime ownership

Update integrations to use the 2.0 `Actor`, `Machine`, and `MachineSnapshot` contracts. Treat actor creation, dispatch, and disposal as the boundary between application effects and pure transition results.

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) before upgrading. They define the current `defineMachine` configuration and actor contracts.
