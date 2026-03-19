---
title: Checkbox Group
---

# Checkbox Group

## Guideline Recipe: Onboard with Opt-In Feature Flags

**Guideline: onboard** — a checkbox group in a setup wizard lets users activate capabilities they want from day one, creating a sense of ownership and reducing later churn.

```html
<bit-checkbox-group label="Enable features for your workspace" name="features" orientation="vertical">
  <bit-checkbox value="analytics" checked>Usage analytics</bit-checkbox>
  <bit-checkbox value="integrations">Third-party integrations</bit-checkbox>
  <bit-checkbox value="api-access">API access</bit-checkbox>
  <bit-checkbox value="audit-log">Audit log</bit-checkbox>
</bit-checkbox-group>
```

**Tip:** Use `orientation="vertical"` when each option has a label longer than two words so the checkbox and label remain visually aligned.

::: tip See also
The `bit-checkbox-group` is documented in full under the [Checkbox](./checkbox.md) page together with `bit-checkbox`.
:::

The Checkbox Group documentation has been merged into the [Checkbox](./checkbox) page.
