# Checkbox

A customizable boolean form control with indeterminate state support, plus a group wrapper for managing multi-selection lists.

- **`sg-checkbox`** — standalone checkbox for a single boolean value.
- **`sg-checkbox-group`** — form-associated `<fieldset>` wrapper that manages a set of checkboxes, propagates `color`, `size`, and `disabled` to all children, and tracks checked values as a comma-separated `values` string.

## Features

**Checkbox**

- ♿ **Accessible** — `aria-checked` including `"mixed"` for indeterminate; keyboard toggle
- 🌈 **6 Semantic Colors** — primary, secondary, info, success, warning, error
- 🎛️ **Indeterminate State** — partial selection indicator for "select all" patterns
- 🎭 **States** — checked, unchecked, indeterminate, disabled
- 📏 **3 Sizes** — sm, md, lg
- 🔧 **Customizable** — CSS custom properties for size, radius, and colors

**Checkbox Group**

- ↕️ **2 Orientations** — vertical & horizontal
- 💬 **Validation Feedback** — `helper` and `error` text with ARIA wiring
- 📝 **Form Integration** — comma-separated `values` submit through the group's `name` with any `<form>` or `sg-form`
- 📡 **Context Propagation** — `color`, `size`, and `disabled` propagate to all child checkboxes
- 🗂️ **Semantic Markup** — renders as `<fieldset>` + `<legend>` for proper screen reader grouping

## Source Code

::: details View Checkbox Source
<<< @/../packages/sigil/src/inputs/checkbox/checkbox.ts
:::

::: details View Checkbox Group Source
<<< @/../packages/sigil/src/inputs/checkbox-group/checkbox-group.ts
:::

## Checkbox

### Basic Usage

```html
<sg-checkbox>Accept terms and conditions</sg-checkbox>

<script type="module">
  import '@vielzeug/sigil/checkbox';
</script>
```

### Colors

Six semantic colors to match your design language or validation state.

<ComponentPreview center>

```html
<sg-checkbox checked>Default</sg-checkbox>
<sg-checkbox checked color="primary">Primary</sg-checkbox>
<sg-checkbox checked color="secondary">Secondary</sg-checkbox>
<sg-checkbox checked color="info">Info</sg-checkbox>
<sg-checkbox checked color="success">Success</sg-checkbox>
<sg-checkbox checked color="warning">Warning</sg-checkbox>
<sg-checkbox checked color="error">Error</sg-checkbox>
```

</ComponentPreview>

### Sizes

<ComponentPreview center>

```html
<sg-checkbox checked size="sm">Small</sg-checkbox>
<sg-checkbox checked size="md">Medium</sg-checkbox>
<sg-checkbox checked size="lg">Large</sg-checkbox>
```

</ComponentPreview>

### Indeterminate

Use the indeterminate state for "select all" controls where only some items in a sub-list are checked. First click resolves to checked; subsequent clicks toggle normally.

<ComponentPreview center>

```html
<sg-checkbox indeterminate>Select all (partial)</sg-checkbox>
```

</ComponentPreview>

### States

#### Disabled

<ComponentPreview center>

```html
<sg-checkbox disabled>Disabled (unchecked)</sg-checkbox>
<sg-checkbox checked disabled>Disabled (checked)</sg-checkbox>
<sg-checkbox indeterminate disabled>Disabled (indeterminate)</sg-checkbox>
```

</ComponentPreview>

### Helper & Error Text

Provide contextual feedback directly below the checkbox.

<ComponentPreview vertical>

```html
<sg-checkbox helper="You can change this at any time in settings."> Send me marketing emails </sg-checkbox>

<sg-checkbox color="error" error="You must accept the terms to continue.">
  I accept the terms of service
</sg-checkbox>
```

</ComponentPreview>

### Listening for Changes

```js
const checkbox = document.querySelector('sg-checkbox');
checkbox.addEventListener('change', (e) => {
  console.log('checked:', e.detail.checked);
  console.log('value:', e.detail.value);
});
```

## Checkbox Group

`sg-checkbox-group` wraps `sg-checkbox` elements in a `<fieldset>`. Set `values` to a comma-separated string to pre-select options, and set `name` when you want the group to submit with a form.

### Basic Usage

```html
<sg-checkbox-group label="Interests" values="sport,music">
  <sg-checkbox value="sport">Sport</sg-checkbox>
  <sg-checkbox value="music">Music</sg-checkbox>
  <sg-checkbox value="travel">Travel</sg-checkbox>
</sg-checkbox-group>

<script type="module">
  import '@vielzeug/sigil/checkbox-group';
  import '@vielzeug/sigil/checkbox';
</script>
```

### Orientation

<ComponentPreview vertical>

```html
<sg-checkbox-group label="Notifications (vertical)">
  <sg-checkbox value="email">Email</sg-checkbox>
  <sg-checkbox value="push">Push</sg-checkbox>
  <sg-checkbox value="sms">SMS</sg-checkbox>
</sg-checkbox-group>

<sg-checkbox-group label="Working days (horizontal)" orientation="horizontal">
  <sg-checkbox value="mon">Mon</sg-checkbox>
  <sg-checkbox value="tue">Tue</sg-checkbox>
  <sg-checkbox value="wed">Wed</sg-checkbox>
  <sg-checkbox value="thu">Thu</sg-checkbox>
  <sg-checkbox value="fri">Fri</sg-checkbox>
</sg-checkbox-group>
```

</ComponentPreview>

### Colors & Sizes

`color` and `size` set on the group propagate automatically to all child checkboxes.

<ComponentPreview vertical>

```html
<sg-checkbox-group label="Small · Primary" size="sm" color="primary" orientation="horizontal" values="a">
  <sg-checkbox value="a">Option A</sg-checkbox>
  <sg-checkbox value="b">Option B</sg-checkbox>
</sg-checkbox-group>
<sg-checkbox-group label="Medium · Success" size="md" color="success" orientation="horizontal" values="a">
  <sg-checkbox value="a">Option A</sg-checkbox>
  <sg-checkbox value="b">Option B</sg-checkbox>
</sg-checkbox-group>
<sg-checkbox-group label="Large · Warning" size="lg" color="warning" orientation="horizontal" values="a">
  <sg-checkbox value="a">Option A</sg-checkbox>
  <sg-checkbox value="b">Option B</sg-checkbox>
</sg-checkbox-group>
```

</ComponentPreview>

### Validation Feedback

<ComponentPreview vertical>

```html
<sg-checkbox-group label="Interests" helper="Select all that apply.">
  <sg-checkbox value="sport">Sport</sg-checkbox>
  <sg-checkbox value="music">Music</sg-checkbox>
  <sg-checkbox value="travel">Travel</sg-checkbox>
</sg-checkbox-group>

<sg-checkbox-group label="Agreements" error="Please accept all required policies." color="error">
  <sg-checkbox value="terms">I accept the terms of service</sg-checkbox>
  <sg-checkbox value="privacy">I accept the privacy policy</sg-checkbox>
</sg-checkbox-group>
```

</ComponentPreview>

### Disabled

Disabling the group propagates to all child checkboxes.

<ComponentPreview>

```html
<sg-checkbox-group label="Disabled group" disabled values="a,c">
  <sg-checkbox value="a">Option A</sg-checkbox>
  <sg-checkbox value="b">Option B</sg-checkbox>
  <sg-checkbox value="c">Option C</sg-checkbox>
</sg-checkbox-group>
```

</ComponentPreview>

### Form Integration

The group's checked values are stored in the `values` attribute and submitted under the group's `name` as a comma-separated string with any `<form>` or `sg-form`.

<ComponentPreview vertical>

```html
<sg-form id="prefs-form" novalidate>
  <sg-checkbox-group name="contact" label="Preferred contact" required>
    <sg-checkbox value="email">Email</sg-checkbox>
    <sg-checkbox value="phone">Phone</sg-checkbox>
    <sg-checkbox value="sms">SMS</sg-checkbox>
  </sg-checkbox-group>
  <sg-button type="submit">Save Preferences</sg-button>
</sg-form>

<script type="module">
  import '@vielzeug/sigil/form';
  import '@vielzeug/sigil/checkbox-group';
  import '@vielzeug/sigil/checkbox';
  import '@vielzeug/sigil/button';

  document.getElementById('prefs-form').addEventListener('submit', (e) => {
    console.log('contact:', e.detail.formData.get('contact'));
  });

  document.querySelector('sg-checkbox-group').addEventListener('change', (e) => {
    console.log('Checked values:', e.detail.values);
  });
</script>
```

</ComponentPreview>

### Select All Pattern

Combine indeterminate state on a parent checkbox with a `sg-checkbox-group` to build a "select all" control.

<ComponentPreview vertical>

```html
<sg-checkbox id="select-all" indeterminate>Select all</sg-checkbox>
<sg-checkbox-group id="options" label="Options" values="a">
  <sg-checkbox value="a">Option A</sg-checkbox>
  <sg-checkbox value="b">Option B</sg-checkbox>
  <sg-checkbox value="c">Option C</sg-checkbox>
</sg-checkbox-group>

<script type="module">
  import '@vielzeug/sigil/checkbox';
  import '@vielzeug/sigil/checkbox-group';

  const all = document.getElementById('select-all');
  const group = document.getElementById('options');
  const options = ['a', 'b', 'c'];

  function syncParent() {
    const checked = group.getAttribute('values')?.split(',').filter(Boolean) ?? [];
    if (checked.length === 0) {
      all.removeAttribute('checked');
      all.removeAttribute('indeterminate');
    } else if (checked.length === options.length) {
      all.setAttribute('checked', '');
      all.removeAttribute('indeterminate');
    } else {
      all.removeAttribute('checked');
      all.setAttribute('indeterminate', '');
    }
  }

  all.addEventListener('change', (e) => {
    if (e.detail.checked) {
      group.setAttribute('values', options.join(','));
    } else {
      group.setAttribute('values', '');
    }
    syncParent();
  });

  group.addEventListener('change', syncParent);
  syncParent();
</script>
```

</ComponentPreview>

## API Reference

### `sg-checkbox` Attributes

| Attribute       | Type                                                                      | Default | Description                             |
| --------------- | ------------------------------------------------------------------------- | ------- | --------------------------------------- |
| `checked`       | `boolean`                                                                 | `false` | Checked state                           |
| `indeterminate` | `boolean`                                                                 | `false` | Indeterminate (partially checked) state |
| `disabled`      | `boolean`                                                                 | `false` | Disable interaction                     |
| `value`         | `string`                                                                  | `'on'`  | Value submitted with the form           |
| `name`          | `string`                                                                  | `''`    | Form field name                         |
| `color`         | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | —       | Semantic color for the checked state    |
| `size`          | `'sm' \| 'md' \| 'lg'`                                                    | `'md'`  | Checkbox size                           |
| `helper`        | `string`                                                                  | `''`    | Helper text displayed below             |
| `error`         | `string`                                                                  | `''`    | Error message (marks field invalid)     |

### `sg-checkbox` Slots

| Slot      | Description         |
| --------- | ------------------- |
| (default) | Checkbox label text |

### `sg-checkbox` Parts

| Part       | Description                  |
| ---------- | ---------------------------- |
| `checkbox` | The checkbox wrapper element |
| `box`      | The visual checkbox square   |
| `label`    | The label text element       |

### `sg-checkbox` Events

| Event    | Detail                                | Description                            |
| -------- | ------------------------------------- | -------------------------------------- |
| `change` | `{ checked: boolean, value: string }` | Emitted when the checked state changes |

### `sg-checkbox` CSS Custom Properties

| Property                  | Description                        |
| ------------------------- | ---------------------------------- |
| `--checkbox-size`         | Checkbox dimensions                |
| `--checkbox-radius`       | Border radius                      |
| `--checkbox-bg`           | Background color (unchecked state) |
| `--checkbox-checked-bg`   | Background color (checked state)   |
| `--checkbox-border-color` | Border color                       |
| `--checkbox-color`        | Checkmark icon color               |
| `--checkbox-font-size`    | Label font size                    |

---

### `sg-checkbox-group` Attributes

| Attribute     | Type                                                                      | Default      | Description                                                  |
| ------------- | ------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------ |
| `label`       | `string`                                                                  | `''`         | Legend text — required for accessibility                     |
| `values`      | `string`                                                                  | `''`         | Comma-separated currently checked values (e.g. `"a,b"`)      |
| `name`        | `string`                                                                  | `''`         | Form field name                                              |
| `orientation` | `'vertical' \| 'horizontal'`                                              | `'vertical'` | Layout direction of options                                  |
| `color`       | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | —            | Color propagated to all child checkboxes                     |
| `size`        | `'sm' \| 'md' \| 'lg'`                                                    | —            | Size propagated to all child checkboxes                      |
| `disabled`    | `boolean`                                                                 | `false`      | Disable all checkboxes in the group                          |
| `required`    | `boolean`                                                                 | `false`      | Mark the group as required                                   |
| `error`       | `string`                                                                  | `''`         | Error message shown below the group (also sets ARIA invalid) |
| `helper`      | `string`                                                                  | `''`         | Helper text (hidden when `error` is set)                     |

### `sg-checkbox-group` Slots

| Slot      | Description                        |
| --------- | ---------------------------------- |
| (default) | Place `sg-checkbox` elements here |

### `sg-checkbox-group` Events

| Event    | Detail                 | Description                                             |
| -------- | ---------------------- | ------------------------------------------------------- |
| `change` | `{ values: string[] }` | Full array of currently checked values after any toggle |

## Accessibility

The checkbox components follow WCAG 2.1 Level AA standards.

### `sg-checkbox`

✅ **Keyboard Navigation**

- `Space` / `Enter` toggle the focused checkbox; `Tab` moves focus in and out.

✅ **Screen Readers**

- Uses `role="checkbox"` with `aria-checked` set to `"true"`, `"false"`, or `"mixed"` for indeterminate.
- `aria-labelledby` links the label; `aria-describedby` links helper text; `aria-errormessage` links error text.
- `aria-disabled` reflects the disabled state.

### `sg-checkbox-group`

✅ **Semantic Structure**

- Renders as a `<fieldset>` with a `<legend>` for the `label` attribute.

✅ **Keyboard Navigation**

- `Tab` moves to the next checkbox within the group.

✅ **Screen Readers**

- `aria-required` and `aria-invalid` reflect the group validation state; `aria-errormessage` and `aria-describedby` link the text nodes.

## Best Practices

**Do:**

- Always provide a meaningful `label` on the group — it is the accessible name read before each option.
- Use `indeterminate` on a "select all" checkbox to represent partial selection.
- Use `orientation="horizontal"` only for short option labels that comfortably fit on one line.
- Pair `error` with `color="error"` to reinforce validation failures visually.
- Prefer `name` on the group (not individual checkboxes) when submitting with a form.

**Don't:**

- Use `sg-checkbox-group` for mutually exclusive choices — use [`sg-radio-group`](./radio) instead.
- Omit the `label` attribute on the group; without it the fieldset has no accessible name.
- Place non-`sg-checkbox` elements as direct children of `sg-checkbox-group`.
