# Radio

A radio button and a group wrapper for mutually exclusive selections.

- **`bit-radio`** — standalone radio button for a single boolean choice within a named group.
- **`bit-radio-group`** — `<fieldset>` wrapper that manages a set of radios, propagates `color`, `size`, `name`, and `disabled` to all children, and handles roving keyboard navigation.

## Features

- ↕️ **2 Orientations** (group) — vertical & horizontal
- ♿ **Accessible** — ARIA roles, roving tabindex, arrow key nav
- 🌈 **6 Semantic Colors** — primary, secondary, info, success, warning, error
- 🎭 **States** — checked, unchecked, disabled
- 📏 **3 Sizes** — sm, md, lg
- 📝 **Helper & Error Text** (group) — inline validation feedback

## Source Code

::: details View Radio Source
<<< @/../packages/buildit/src/inputs/radio/radio.ts
:::

::: details View Radio Group Source
<<< @/../packages/buildit/src/inputs/radio-group/radio-group.ts
:::

---

## Standalone Radio

### Basic Usage

```html
<bit-radio name="choice" value="option1" checked>Option 1</bit-radio>
<bit-radio name="choice" value="option2">Option 2</bit-radio>

<script type="module">
  import '@vielzeug/buildit/radio';
</script>
```

::: tip Radio Groups
Radio buttons with the same `name` attribute form a group where only one can be selected at a time. The `name` attribute is required for proper radio button behavior.
:::

### Colors

Six semantic colors for different contexts. Defaults to neutral when no color is specified.

<ComponentPreview center>

```html
<bit-radio checked name="color">Default</bit-radio>
<bit-radio name="color" color="primary">Primary</bit-radio>
<bit-radio name="color" color="secondary">Secondary</bit-radio>
<bit-radio name="color" color="info">Info</bit-radio>
<bit-radio name="color" color="success">Success</bit-radio>
<bit-radio name="color" color="warning">Warning</bit-radio>
<bit-radio name="color" color="error">Error</bit-radio>
```

</ComponentPreview>

### Sizes

Three sizes for different contexts.

<ComponentPreview center>

```html
<bit-radio checked name="size" size="sm">Small</bit-radio>
<bit-radio name="size" size="md">Medium</bit-radio>
<bit-radio name="size" size="lg">Large</bit-radio>
```

</ComponentPreview>

### Disabled

Prevent interaction and reduce opacity for unavailable options.

<ComponentPreview center>

```html
<bit-radio name="disabled" disabled>Disabled unchecked</bit-radio>
<bit-radio name="disabled" checked disabled>Disabled checked</bit-radio>
```

</ComponentPreview>

---

## Radio Group

`bit-radio-group` wraps `bit-radio` elements in a semantic `<fieldset>`. Set `value` to the default selected option and `name` to share the field name across all children.

### Basic Usage

```html
<bit-radio-group name="size" label="T-shirt size" value="medium">
  <bit-radio value="small">Small</bit-radio>
  <bit-radio value="medium">Medium</bit-radio>
  <bit-radio value="large">Large</bit-radio>
</bit-radio-group>

<script type="module">
  import '@vielzeug/buildit/radio-group';
  import '@vielzeug/buildit/radio';
</script>
```

### Orientation

<ComponentPreview vertical>

```html
<bit-radio-group label="Notifications" name="notif">
  <bit-radio value="email">Email</bit-radio>
  <bit-radio value="push">Push</bit-radio>
  <bit-radio value="sms">SMS</bit-radio>
</bit-radio-group>

<bit-radio-group label="Priority" name="priority" orientation="horizontal">
  <bit-radio value="low">Low</bit-radio>
  <bit-radio value="medium">Medium</bit-radio>
  <bit-radio value="high">High</bit-radio>
</bit-radio-group>
```

</ComponentPreview>

### Colors & Sizes

Color and size set on the group are automatically propagated to all child radios.

<ComponentPreview vertical>

```html
<bit-radio-group label="Small · Primary" size="sm" color="primary" orientation="horizontal" name="c1" value="a">
  <bit-radio value="a">Option A</bit-radio>
  <bit-radio value="b">Option B</bit-radio>
</bit-radio-group>
<bit-radio-group label="Medium · Success" size="md" color="success" orientation="horizontal" name="c2" value="a">
  <bit-radio value="a">Option A</bit-radio>
  <bit-radio value="b">Option B</bit-radio>
</bit-radio-group>
<bit-radio-group label="Large · Warning" size="lg" color="warning" orientation="horizontal" name="c3" value="a">
  <bit-radio value="a">Option A</bit-radio>
  <bit-radio value="b">Option B</bit-radio>
</bit-radio-group>
```

</ComponentPreview>

### Helper & Error Text

<ComponentPreview vertical>

```html
<bit-radio-group label="Preferred contact" name="contact" helper="We'll only contact you for important updates.">
  <bit-radio value="email">Email</bit-radio>
  <bit-radio value="phone">Phone</bit-radio>
</bit-radio-group>

<bit-radio-group label="Agreement" name="agree" error="You must select an option." color="error">
  <bit-radio value="yes">Yes, I agree</bit-radio>
  <bit-radio value="no">No</bit-radio>
</bit-radio-group>
```

</ComponentPreview>

### Disabled

<ComponentPreview>

```html
<bit-radio-group label="Disabled group" name="disabled" disabled value="b">
  <bit-radio value="a">Option A</bit-radio>
  <bit-radio value="b">Option B</bit-radio>
  <bit-radio value="c">Option C</bit-radio>
</bit-radio-group>
```

</ComponentPreview>

### In a Form

The selected `value` attribute is submitted with the form under the `name` field name.

```html
<form id="survey">
  <bit-radio-group name="experience" label="How would you rate your experience?" required>
    <bit-radio value="1">Poor</bit-radio>
    <bit-radio value="2">Fair</bit-radio>
    <bit-radio value="3">Good</bit-radio>
    <bit-radio value="4">Excellent</bit-radio>
  </bit-radio-group>
  <bit-button type="submit">Submit</bit-button>
</form>

<script type="module">
  import '@vielzeug/buildit/radio-group';
  import '@vielzeug/buildit/radio';
  import '@vielzeug/buildit/button';

  document.getElementById('survey').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    console.log('Experience rating:', data.get('experience'));
  });
</script>
```

---

## API Reference

### `bit-radio` Attributes

| Attribute  | Type                                                                      | Default     | Description                             |
| ---------- | ------------------------------------------------------------------------- | ----------- | --------------------------------------- |
| `checked`  | `boolean`                                                                 | `false`     | Radio button checked state              |
| `disabled` | `boolean`                                                                 | `false`     | Disable the radio button                |
| `color`    | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | `'primary'` | Semantic color                          |
| `size`     | `'sm' \| 'md' \| 'lg'`                                                    | `'md'`      | Radio button size                       |
| `name`     | `string`                                                                  | —           | Form field name (required for grouping) |
| `value`    | `string`                                                                  | —           | Form field value when checked           |

### `bit-radio` Slots

| Slot      | Description                |
| --------- | -------------------------- |
| (default) | Radio button label content |

### `bit-radio` Events

| Event    | Detail                                                      | Description                                                     |
| -------- | ----------------------------------------------------------- | --------------------------------------------------------------- |
| `change` | `{ checked: boolean, value: string, originalEvent: Event }` | Emitted when checked state changes (only when becoming checked) |

### `bit-radio` CSS Custom Properties

| Property             | Description             | Default         |
| -------------------- | ----------------------- | --------------- |
| `--radio-size`       | Size of the circle      | Size-dependent  |
| `--radio-checked-bg` | Background when checked | Color-dependent |
| `--radio-color`      | Inner dot color         | `white`         |

### `bit-radio-group` Attributes

| Attribute     | Type                                                                      | Default      | Description                                      |
| ------------- | ------------------------------------------------------------------------- | ------------ | ------------------------------------------------ |
| `label`       | `string`                                                                  | `''`         | Legend text — required for accessibility         |
| `value`       | `string`                                                                  | `''`         | Currently selected value                         |
| `name`        | `string`                                                                  | `''`         | Form field name — propagated to all child radios |
| `orientation` | `'vertical' \| 'horizontal'`                                              | `'vertical'` | Layout direction                                 |
| `color`       | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | —            | Color theme — propagated to all child radios     |
| `size`        | `'sm' \| 'md' \| 'lg'`                                                    | —            | Size — propagated to all child radios            |
| `disabled`    | `boolean`                                                                 | `false`      | Disable all radios in the group                  |
| `error`       | `string`                                                                  | `''`         | Error message shown below the group              |
| `helper`      | `string`                                                                  | `''`         | Helper text (hidden when `error` is set)         |
| `required`    | `boolean`                                                                 | `false`      | Mark the group as required                       |

### `bit-radio-group` Slots

| Slot      | Description                     |
| --------- | ------------------------------- |
| (default) | Place `bit-radio` elements here |

### `bit-radio-group` Events

| Event    | Detail              | Description                      |
| -------- | ------------------- | -------------------------------- |
| `change` | `{ value: string }` | Emitted when a radio is selected |

### `bit-radio-group` CSS Custom Properties

| Property                  | Description                     | Default         |
| ------------------------- | ------------------------------- | --------------- |
| `--radio-group-gap`       | Spacing between options         | `var(--size-2)` |
| `--radio-group-direction` | Flex direction (`column`/`row`) | `column`        |

---

## Accessibility

The radio components follow WCAG 2.1 Level AA standards.

### `bit-radio`

✅ **Keyboard Navigation**

- `Space` / `Enter` select a radio; `Tab` moves focus in and out of the group.
- Arrow keys navigate between radios within a group using a roving tabindex.

✅ **Screen Readers**

- Uses `role="radio"` with `aria-checked` reflecting the current state.
- `aria-disabled` reflects the disabled state.

### `bit-radio-group`

✅ **Semantic Structure**

- Renders as a `<fieldset>` with a `<legend>` for the `label` attribute.

✅ **Screen Readers**

- `aria-required` and `aria-invalid` reflect the validation state; `aria-errormessage` and `aria-describedby` link the text nodes.

## Best Practices

- Always provide a meaningful `label` on the group — it is read before each option by screen readers.
- Always use the `name` attribute (or set it once on the group) so radios are mutually exclusive.
- Provide a default `value` when a sensible default exists.
- For non-mutually exclusive choices, use [`bit-checkbox-group`](./checkbox) instead.
