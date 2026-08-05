---
title: Pulse 2.0 Migration
---

# Pulse 2.0 Migration

Pulse 2.0 aligns reactive channel state with Ripple signals.

## Read channel state as signals

Replace prior reactive channel-state integrations with the 2.0 signal-based contract. Read channel and connection state through the exposed reactive values rather than duplicating it in application state.

## Recheck channel cleanup

Retain explicit cleanup for Pulse clients and channels. Revisit reconnect, presence, buffering, and error handling after moving consumers to the new reactive state shape.

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for current `createPulse`, channel, presence, and state contracts.
