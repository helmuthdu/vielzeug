---
title: 'Color Picker: Refine'
description: A swatch palette for picking a single color, as a form-associated radiogroup.
---

# Color Picker

A palette of color swatches for picking a single color — a product paint configurator, a theme picker, a label color chooser. It renders as a `radiogroup`: arrow keys move through the swatches, and the selection is form-associated so it submits with a `<form>`.

Options are passed as JSON. Each option needs a `color` (any CSS color); `value` and `label` default to it when omitted.

## Basic Usage

<ComponentPreview center>

```html
<ore-color-picker
  label="Paint"
  value="midnight"
  options='[
    { "value": "midnight", "color": "#19202b", "label": "Midnight Black" },
    { "value": "pearl", "color": "#f2efe9", "label": "Pearl White" },
    { "value": "crimson", "color": "#7a1f2b", "label": "Crimson" }
  ]'>
</ore-color-picker>
```

</ComponentPreview>

Listen for the selection:

```html
<ore-color-picker id="paint" label="Paint" options='[{ "color": "#19202b" }, { "color": "#f2efe9" }]'></ore-color-picker>

<script type="module">
  document.getElementById('paint').addEventListener('change', (event) => {
    console.log('Selected:', event.detail.values[0], event.detail.labels[0]);
  });
</script>
```

## Raw Colors

When an option has only a `color`, the color doubles as the value and the accessible name. This is the shortest form, good for a plain palette.

<ComponentPreview center>

```html
<ore-color-picker
  label="Accent"
  value="#7c3aed"
  options='[{ "color": "#19202b" }, { "color": "#7c3aed" }, { "color": "#0891b2" }, { "color": "#059669" }]'>
</ore-color-picker>
```

</ComponentPreview>

## Disabled Options

Mark an individual option `disabled` to render it without allowing selection — a sold-out paint, for instance.

<ComponentPreview center>

```html
<ore-color-picker
  label="Finish"
  value="graphite"
  options='[
    { "value": "graphite", "color": "#3f3f46", "label": "Graphite" },
    { "value": "cobalt", "color": "#1d4ed8", "label": "Cobalt", "disabled": true },
    { "value": "sand", "color": "#d6c7a1", "label": "Sand" }
  ]'>
</ore-color-picker>
```

</ComponentPreview>

## Sizes

<ComponentPreview center>

```html
<ore-color-picker size="sm" options='[{ "color": "#19202b" }, { "color": "#7c3aed" }]' label="Small"></ore-color-picker>
<ore-color-picker size="md" options='[{ "color": "#19202b" }, { "color": "#7c3aed" }]' label="Medium"></ore-color-picker>
<ore-color-picker size="lg" options='[{ "color": "#19202b" }, { "color": "#7c3aed" }]' label="Large"></ore-color-picker>
```

</ComponentPreview>

## Helper and Error Text

Pass `helper` for a hint below the swatches, or `error` to mark the field invalid. `error` takes precedence and is announced with `role="alert"`.

<ComponentPreview center>

```html
<ore-color-picker
  label="Wall color"
  helper="Sample swatches ship in every finish."
  options='[{ "color": "#e7e5e4" }, { "color": "#a8a29e" }, { "color": "#57534e" }]'>
</ore-color-picker>

<ore-color-picker
  label="Pick a color"
  error="Choose a color to continue."
  options='[{ "color": "#dc2626" }, { "color": "#2563eb" }]'>
</ore-color-picker>
```

</ComponentPreview>

## Disabled

<ComponentPreview center>

```html
<ore-color-picker
  label="Locked selection"
  value="#19202b"
  disabled
  options='[{ "color": "#19202b" }, { "color": "#f2efe9" }]'>
</ore-color-picker>
```

</ComponentPreview>

## API Reference

### Attributes

| Attribute  | Type                     | Default | Description                                                               |
| ---------- | ------------------------ | ------- | ------------------------------------------------------------------------- |
| `options`  | `OreColorPickerOption[]` | N/A     | Selectable colors (JSON)                                                  |
| `value`    | `string`                 | N/A     | Value of the selected option                                              |
| `label`    | `string`                 | N/A     | Group label, shown as the fieldset legend and used as the accessible name |
| `name`     | `string`                 | N/A     | Form field name                                                           |
| `disabled` | `boolean`                | `false` | Disables every swatch                                                     |
| `size`     | `'sm' \| 'md' \| 'lg'`   | `'md'`  | Swatch diameter                                                           |
| `helper`   | `string`                 | N/A     | Helper text shown below the swatches                                      |
| `error`    | `string`                 | N/A     | Error message below the swatches (takes precedence over `helper`)         |

### Option shape

| Field      | Type      | Description                                        |
| ---------- | --------- | -------------------------------------------------- |
| `color`    | `string`  | CSS color painted as the swatch (required)         |
| `value`    | `string`  | Value reported on selection; defaults to `color`   |
| `label`    | `string`  | Accessible name; defaults to `value`, then `color` |
| `disabled` | `boolean` | Render the swatch but block selection              |

### Events

| Event    | Detail                                                          | Description                    |
| -------- | --------------------------------------------------------------- | ------------------------------ |
| `change` | `{ values: string[]; labels: string[]; originalEvent?: Event }` | Fired when a color is selected |

### Parts

| Part          | Description                   |
| ------------- | ----------------------------- |
| `swatches`    | Swatch container              |
| `swatch`      | A swatch button               |
| `legend`      | Group label                   |
| `helper-text` | The helper/error text element |

### CSS Custom Properties

| Property                       | Default         | Description          |
| ------------------------------ | --------------- | -------------------- |
| `--color-picker-swatch-size`   | size preset     | Swatch diameter      |
| `--color-picker-swatch-radius` | a circle        | Swatch corner radius |
| `--color-picker-gap`           | `var(--size-2)` | Gap between swatches |

## Accessibility

The control is a `radiogroup` and each swatch is a `role="radio"` with `aria-checked` reflecting the selection. The group's accessible name comes from `label`.

Exactly one swatch is a tab stop at a time (roving tabindex). When `value` is unset, or names an option that does not exist or is disabled, the tab stop falls back to the first enabled swatch — matching a native radio group, so the control is never unreachable by keyboard. `↑`/`←` and `↓`/`→` move and commit the selection; `Home`/`End` jump to the first/last enabled swatch.

## Related Components

- [Radio Group](./radio): grouped native radio inputs
- [Rating](./rating): a star-based value picker with the same radiogroup semantics
