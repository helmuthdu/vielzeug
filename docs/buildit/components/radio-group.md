---
title: Radio Group
---

# Radio Group

## Guideline Recipe: Clarify Mutually Exclusive Choices

**Guideline: clarify** — a radio group makes it immediately obvious that only one option can be selected, removing ambiguity that checkboxes would introduce.

```html
<bit-radio-group
  label="Default view"
  name="default-view"
  value="kanban"
  orientation="vertical"
>
  <bit-radio value="kanban">Kanban board</bit-radio>
  <bit-radio value="list">List</bit-radio>
  <bit-radio value="timeline">Timeline</bit-radio>
  <bit-radio value="calendar">Calendar</bit-radio>
</bit-radio-group>
```

**Tip:** If the user might reasonably want to select multiple options (e.g., multiple notification channels), use `bit-checkbox-group` instead.

::: tip See also
The `bit-radio-group` is documented in full under the [Radio](./radio.md) page together with `bit-radio`.
:::

The Radio Group documentation has been merged into the [Radio](./radio) page.
