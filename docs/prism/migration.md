---
title: Prism 2.0 Migration
---

# Prism 2.0 Migration

Prism 2.0 moves chart effect ownership into Ripple scopes.

## Give chart effects a scope

Update chart integrations so reactive effects created for a chart belong to a Ripple scope. Dispose that scope with the chart lifetime to prevent effects surviving an unmounted chart.

## Retain chart-handle disposal

Continue to dispose the `ChartHandle` returned by chart factories. Review plugin and lifecycle integrations for ownership assumptions that changed with scoped effects.

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for current chart factory, handle, plugin, and Ripple integration contracts.
