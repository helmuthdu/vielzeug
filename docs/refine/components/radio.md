# Radio

A radio button and a group wrapper for mutually exclusive selections.

- **`ore-radio`** — standalone radio button for a single boolean choice within a named group.
- **`ore-radio-group`** — `<fieldset>` wrapper that manages a set of radios, propagates `color`, `size`, `name`, and `disabled` to all children, and handles roving keyboard navigation.

## Standalone Radio

```html
<ore-radio name="choice" value="option1" checked>Option 1</ore-radio>
<ore-radio name="choice" value="option2">Option 2</ore-radio>
```

::: tip Radio Groups
Radio buttons with the same `name` attribute form a group where only one can be selected at a time. The `name` attribute is required for proper radio button behavior.
:::

### Colors

Six semantic colors for different contexts. Defaults to neutral when no color is specified.

<ComponentPreview center>

```html
<ore-radio checked name="color">Default</ore-radio>
<ore-radio name="color" color="primary">Primary</ore-radio>
<ore-radio name="color" color="secondary">Secondary</ore-radio>
<ore-radio name="color" color="info">Info</ore-radio>
<ore-radio name="color" color="success">Success</ore-radio>
<ore-radio name="color" color="warning">Warning</ore-radio>
<ore-radio name="color" color="error">Error</ore-radio>
```

</ComponentPreview>

### Sizes

Three sizes for different contexts.

<ComponentPreview center>

```html
<ore-radio checked name="size" size="sm">Small</ore-radio>
<ore-radio name="size" size="md">Medium</ore-radio>
<ore-radio name="size" size="lg">Large</ore-radio>
```

</ComponentPreview>

### Disabled

Prevent interaction and reduce opacity for unavailable options.

<ComponentPreview center>

```html
<ore-radio name="disabled" disabled>Disabled unchecked</ore-radio>
<ore-radio name="disabled" checked disabled>Disabled checked</ore-radio>
```

</ComponentPreview>

## Radio Group

`ore-radio-group` wraps `ore-radio` elements in a semantic `<fieldset>`. Set `value` to the default selected option and `name` to share the field name across all children. Always provide a meaningful `label` on the group — it is read before each option by screen readers. For non-mutually exclusive choices, use [`ore-checkbox-group`](./checkbox) instead.

### Basic Usage

```html
<ore-radio-group name="size" label="T-shirt size" value="medium">
  <ore-radio value="small">Small</ore-radio>
  <ore-radio value="medium">Medium</ore-radio>
  <ore-radio value="large">Large</ore-radio>
</ore-radio-group>
```

### Orientation

<ComponentPreview vertical>

```html
<ore-radio-group label="Notifications" name="notif">
  <ore-radio value="email">Email</ore-radio>
  <ore-radio value="push">Push</ore-radio>
  <ore-radio value="sms">SMS</ore-radio>
</ore-radio-group>

<ore-radio-group label="Priority" name="priority" orientation="horizontal">
  <ore-radio value="low">Low</ore-radio>
  <ore-radio value="medium">Medium</ore-radio>
  <ore-radio value="high">High</ore-radio>
</ore-radio-group>
```

</ComponentPreview>

### Colors & Sizes

Color and size set on the group are automatically propagated to all child radios.

<ComponentPreview vertical>

```html
<ore-radio-group label="Small · Primary" size="sm" color="primary" orientation="horizontal" name="c1" value="a">
  <ore-radio value="a">Option A</ore-radio>
  <ore-radio value="b">Option B</ore-radio>
</ore-radio-group>
<ore-radio-group label="Medium · Success" size="md" color="success" orientation="horizontal" name="c2" value="a">
  <ore-radio value="a">Option A</ore-radio>
  <ore-radio value="b">Option B</ore-radio>
</ore-radio-group>
<ore-radio-group label="Large · Warning" size="lg" color="warning" orientation="horizontal" name="c3" value="a">
  <ore-radio value="a">Option A</ore-radio>
  <ore-radio value="b">Option B</ore-radio>
</ore-radio-group>
```

</ComponentPreview>

### Helper & Error Text

<ComponentPreview vertical>

```html
<ore-radio-group label="Preferred contact" name="contact" helper="We'll only contact you for important updates.">
  <ore-radio value="email">Email</ore-radio>
  <ore-radio value="phone">Phone</ore-radio>
</ore-radio-group>

<ore-radio-group label="Agreement" name="agree" error="You must select an option." color="error">
  <ore-radio value="yes">Yes, I agree</ore-radio>
  <ore-radio value="no">No</ore-radio>
</ore-radio-group>
```

</ComponentPreview>

### Disabled

<ComponentPreview>

```html
<ore-radio-group label="Disabled group" name="disabled" disabled value="b">
  <ore-radio value="a">Option A</ore-radio>
  <ore-radio value="b">Option B</ore-radio>
  <ore-radio value="c">Option C</ore-radio>
</ore-radio-group>
```

</ComponentPreview>

### In a Form

The selected `value` attribute is submitted with the form under the `name` field name. Provide a default `value` when a sensible default exists.

```html
<form id="survey">
  <ore-radio-group name="experience" label="How would you rate your experience?" required>
    <ore-radio value="1">Poor</ore-radio>
    <ore-radio value="2">Fair</ore-radio>
    <ore-radio value="3">Good</ore-radio>
    <ore-radio value="4">Excellent</ore-radio>
  </ore-radio-group>
  <ore-button type="submit">Submit</ore-button>
</form>

<script type="module">
  import '@vielzeug/refine/radio-group';
  import '@vielzeug/refine/radio';
  import '@vielzeug/refine/button';

  document.getElementById('survey').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    console.log('Experience rating:', data.get('experience'));
  });
</script>
```

## API Reference

**`ore-radio` Attributes**

| Attribute  | Type                                                                      | Default     | Description                             |
| ---------- | ------------------------------------------------------------------------- | ----------- | --------------------------------------- |
| `checked`  | `boolean`                                                                 | `false`     | Radio button checked state              |
| `disabled` | `boolean`                                                                 | `false`     | Disable the radio button                |
| `color`    | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | `'primary'` | Semantic color                          |
| `size`     | `'sm' \| 'md' \| 'lg'`                                                    | `'md'`      | Radio button size                       |
| `name`     | `string`                                                                  | —           | Form field name (required for grouping) |
| `value`    | `string`                                                                  | —           | Form field value when checked           |

**`ore-radio` Slots**

| Slot      | Description                |
| --------- | -------------------------- |
| (default) | Radio button label content |

**`ore-radio` Events**

| Event    | Detail                                                      | Description                                                     |
| -------- | ----------------------------------------------------------- | --------------------------------------------------------------- |
| `change` | `{ checked: boolean, value: string, originalEvent: Event }` | Emitted when checked state changes (only when becoming checked) |

**`ore-radio` CSS Custom Properties**

| Property               | Description                         | Default         |
| ---------------------- | ----------------------------------- | --------------- |
| `--radio-size`         | Control size (width and height)     | Size-dependent  |
| `--radio-bg`           | Unchecked background color          | Theme-dependent |
| `--radio-border-color` | Unchecked border color              | Theme-dependent |
| `--radio-checked-bg`   | Selected indicator background color | Color-dependent |
| `--radio-color`        | Selected indicator dot color        | Theme-dependent |
| `--radio-font-size`    | Label font size                     | Size-dependent  |

**`ore-radio-group` Attributes**

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

**`ore-radio-group` Slots**

| Slot      | Description                    |
| --------- | ------------------------------ |
| (default) | Place `ore-radio` elements here |

**`ore-radio-group` Events**

| Event    | Detail              | Description                      |
| -------- | ------------------- | -------------------------------- |
| `change` | `{ value: string }` | Emitted when a radio is selected |

**`ore-radio-group` CSS Custom Properties**

| Property                  | Description                     | Default         |
| ------------------------- | ------------------------------- | --------------- |
| `--radio-group-gap`       | Spacing between options         | `var(--size-2)` |
| `--radio-group-direction` | Flex direction (`column`/`row`) | `column`        |

## Accessibility

The radio components follow WCAG 2.1 Level AA standards.

`ore-radio` uses `role="radio"` with `aria-checked` reflecting the current state, and `aria-disabled` reflecting the disabled state. Keyboard navigation uses `Space` or `Enter` to select a radio and `Tab` to move focus in and out of the group. Arrow keys navigate between radios within a group using a roving tabindex.

`ore-radio-group` renders as a `<fieldset>` with a `<legend>` for the `label` attribute, ensuring screen readers announce the group label before each option. `aria-required` and `aria-invalid` reflect the validation state; `aria-errormessage` and `aria-describedby` link the text nodes.
