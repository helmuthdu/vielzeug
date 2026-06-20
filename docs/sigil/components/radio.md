# Radio

A radio button and a group wrapper for mutually exclusive selections.

- **`sg-radio`** — standalone radio button for a single boolean choice within a named group.
- **`sg-radio-group`** — `<fieldset>` wrapper that manages a set of radios, propagates `color`, `size`, `name`, and `disabled` to all children, and handles roving keyboard navigation.

## Standalone Radio

```html
<sg-radio name="choice" value="option1" checked>Option 1</sg-radio>
<sg-radio name="choice" value="option2">Option 2</sg-radio>
```

::: tip Radio Groups
Radio buttons with the same `name` attribute form a group where only one can be selected at a time. The `name` attribute is required for proper radio button behavior.
:::

### Colors

Six semantic colors for different contexts. Defaults to neutral when no color is specified.

<ComponentPreview center>

```html
<sg-radio checked name="color">Default</sg-radio>
<sg-radio name="color" color="primary">Primary</sg-radio>
<sg-radio name="color" color="secondary">Secondary</sg-radio>
<sg-radio name="color" color="info">Info</sg-radio>
<sg-radio name="color" color="success">Success</sg-radio>
<sg-radio name="color" color="warning">Warning</sg-radio>
<sg-radio name="color" color="error">Error</sg-radio>
```

</ComponentPreview>

### Sizes

Three sizes for different contexts.

<ComponentPreview center>

```html
<sg-radio checked name="size" size="sm">Small</sg-radio>
<sg-radio name="size" size="md">Medium</sg-radio>
<sg-radio name="size" size="lg">Large</sg-radio>
```

</ComponentPreview>

### Disabled

Prevent interaction and reduce opacity for unavailable options.

<ComponentPreview center>

```html
<sg-radio name="disabled" disabled>Disabled unchecked</sg-radio>
<sg-radio name="disabled" checked disabled>Disabled checked</sg-radio>
```

</ComponentPreview>

## Radio Group

`sg-radio-group` wraps `sg-radio` elements in a semantic `<fieldset>`. Set `value` to the default selected option and `name` to share the field name across all children. Always provide a meaningful `label` on the group — it is read before each option by screen readers. For non-mutually exclusive choices, use [`sg-checkbox-group`](./checkbox) instead.

### Basic Usage

```html
<sg-radio-group name="size" label="T-shirt size" value="medium">
  <sg-radio value="small">Small</sg-radio>
  <sg-radio value="medium">Medium</sg-radio>
  <sg-radio value="large">Large</sg-radio>
</sg-radio-group>
```

### Orientation

<ComponentPreview vertical>

```html
<sg-radio-group label="Notifications" name="notif">
  <sg-radio value="email">Email</sg-radio>
  <sg-radio value="push">Push</sg-radio>
  <sg-radio value="sms">SMS</sg-radio>
</sg-radio-group>

<sg-radio-group label="Priority" name="priority" orientation="horizontal">
  <sg-radio value="low">Low</sg-radio>
  <sg-radio value="medium">Medium</sg-radio>
  <sg-radio value="high">High</sg-radio>
</sg-radio-group>
```

</ComponentPreview>

### Colors & Sizes

Color and size set on the group are automatically propagated to all child radios.

<ComponentPreview vertical>

```html
<sg-radio-group label="Small · Primary" size="sm" color="primary" orientation="horizontal" name="c1" value="a">
  <sg-radio value="a">Option A</sg-radio>
  <sg-radio value="b">Option B</sg-radio>
</sg-radio-group>
<sg-radio-group label="Medium · Success" size="md" color="success" orientation="horizontal" name="c2" value="a">
  <sg-radio value="a">Option A</sg-radio>
  <sg-radio value="b">Option B</sg-radio>
</sg-radio-group>
<sg-radio-group label="Large · Warning" size="lg" color="warning" orientation="horizontal" name="c3" value="a">
  <sg-radio value="a">Option A</sg-radio>
  <sg-radio value="b">Option B</sg-radio>
</sg-radio-group>
```

</ComponentPreview>

### Helper & Error Text

<ComponentPreview vertical>

```html
<sg-radio-group label="Preferred contact" name="contact" helper="We'll only contact you for important updates.">
  <sg-radio value="email">Email</sg-radio>
  <sg-radio value="phone">Phone</sg-radio>
</sg-radio-group>

<sg-radio-group label="Agreement" name="agree" error="You must select an option." color="error">
  <sg-radio value="yes">Yes, I agree</sg-radio>
  <sg-radio value="no">No</sg-radio>
</sg-radio-group>
```

</ComponentPreview>

### Disabled

<ComponentPreview>

```html
<sg-radio-group label="Disabled group" name="disabled" disabled value="b">
  <sg-radio value="a">Option A</sg-radio>
  <sg-radio value="b">Option B</sg-radio>
  <sg-radio value="c">Option C</sg-radio>
</sg-radio-group>
```

</ComponentPreview>

### In a Form

The selected `value` attribute is submitted with the form under the `name` field name. Provide a default `value` when a sensible default exists.

```html
<form id="survey">
  <sg-radio-group name="experience" label="How would you rate your experience?" required>
    <sg-radio value="1">Poor</sg-radio>
    <sg-radio value="2">Fair</sg-radio>
    <sg-radio value="3">Good</sg-radio>
    <sg-radio value="4">Excellent</sg-radio>
  </sg-radio-group>
  <sg-button type="submit">Submit</sg-button>
</form>

<script type="module">
  import '@vielzeug/sigil/radio-group';
  import '@vielzeug/sigil/radio';
  import '@vielzeug/sigil/button';

  document.getElementById('survey').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    console.log('Experience rating:', data.get('experience'));
  });
</script>
```

## API Reference

**`sg-radio` Attributes**

| Attribute  | Type                                                                      | Default     | Description                             |
| ---------- | ------------------------------------------------------------------------- | ----------- | --------------------------------------- |
| `checked`  | `boolean`                                                                 | `false`     | Radio button checked state              |
| `disabled` | `boolean`                                                                 | `false`     | Disable the radio button                |
| `color`    | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | `'primary'` | Semantic color                          |
| `size`     | `'sm' \| 'md' \| 'lg'`                                                    | `'md'`      | Radio button size                       |
| `name`     | `string`                                                                  | —           | Form field name (required for grouping) |
| `value`    | `string`                                                                  | —           | Form field value when checked           |

**`sg-radio` Slots**

| Slot      | Description                |
| --------- | -------------------------- |
| (default) | Radio button label content |

**`sg-radio` Events**

| Event    | Detail                                                      | Description                                                     |
| -------- | ----------------------------------------------------------- | --------------------------------------------------------------- |
| `change` | `{ checked: boolean, value: string, originalEvent: Event }` | Emitted when checked state changes (only when becoming checked) |

**`sg-radio` CSS Custom Properties**

| Property               | Description                         | Default         |
| ---------------------- | ----------------------------------- | --------------- |
| `--radio-size`         | Control size (width and height)     | Size-dependent  |
| `--radio-bg`           | Unchecked background color          | Theme-dependent |
| `--radio-border-color` | Unchecked border color              | Theme-dependent |
| `--radio-checked-bg`   | Selected indicator background color | Color-dependent |
| `--radio-color`        | Selected indicator dot color        | Theme-dependent |
| `--radio-font-size`    | Label font size                     | Size-dependent  |

**`sg-radio-group` Attributes**

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

**`sg-radio-group` Slots**

| Slot      | Description                    |
| --------- | ------------------------------ |
| (default) | Place `sg-radio` elements here |

**`sg-radio-group` Events**

| Event    | Detail              | Description                      |
| -------- | ------------------- | -------------------------------- |
| `change` | `{ value: string }` | Emitted when a radio is selected |

**`sg-radio-group` CSS Custom Properties**

| Property                  | Description                     | Default         |
| ------------------------- | ------------------------------- | --------------- |
| `--radio-group-gap`       | Spacing between options         | `var(--size-2)` |
| `--radio-group-direction` | Flex direction (`column`/`row`) | `column`        |

## Accessibility

The radio components follow WCAG 2.1 Level AA standards.

`sg-radio` uses `role="radio"` with `aria-checked` reflecting the current state, and `aria-disabled` reflecting the disabled state. Keyboard navigation uses `Space` or `Enter` to select a radio and `Tab` to move focus in and out of the group. Arrow keys navigate between radios within a group using a roving tabindex.

`sg-radio-group` renders as a `<fieldset>` with a `<legend>` for the `label` attribute, ensuring screen readers announce the group label before each option. `aria-required` and `aria-invalid` reflect the validation state; `aria-errormessage` and `aria-describedby` link the text nodes.
