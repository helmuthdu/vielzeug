# Checkbox

A customizable boolean form control with indeterminate state support, plus a group wrapper for managing multi-selection lists.

- **`ore-checkbox`** — standalone checkbox for a single boolean value.
- **`ore-checkbox-group`** — form-associated `<fieldset>` wrapper that manages a set of checkboxes, propagates `color`, `size`, and `disabled` to all children, and tracks checked values as a comma-separated `values` string.

## Checkbox

### Colors

Six semantic colors to match your design language or validation state.

<ComponentPreview center>

```html
<ore-checkbox checked>Default</ore-checkbox>
<ore-checkbox checked color="primary">Primary</ore-checkbox>
<ore-checkbox checked color="secondary">Secondary</ore-checkbox>
<ore-checkbox checked color="info">Info</ore-checkbox>
<ore-checkbox checked color="success">Success</ore-checkbox>
<ore-checkbox checked color="warning">Warning</ore-checkbox>
<ore-checkbox checked color="error">Error</ore-checkbox>
```

</ComponentPreview>

### Sizes

<ComponentPreview center>

```html
<ore-checkbox checked size="sm">Small</ore-checkbox>
<ore-checkbox checked size="md">Medium</ore-checkbox>
<ore-checkbox checked size="lg">Large</ore-checkbox>
```

</ComponentPreview>

### Indeterminate

Use the indeterminate state for "select all" controls where only some items in a sub-list are checked. First click resolves to checked; subsequent clicks toggle normally.

<ComponentPreview center>

```html
<ore-checkbox indeterminate>Select all (partial)</ore-checkbox>
```

</ComponentPreview>

### States

#### Disabled

<ComponentPreview center>

```html
<ore-checkbox disabled>Disabled (unchecked)</ore-checkbox>
<ore-checkbox checked disabled>Disabled (checked)</ore-checkbox>
<ore-checkbox indeterminate disabled>Disabled (indeterminate)</ore-checkbox>
```

</ComponentPreview>

### Helper & Error Text

Provide contextual feedback directly below the checkbox.

<ComponentPreview vertical>

```html
<ore-checkbox helper="You can change this at any time in settings."> Send me marketing emails </ore-checkbox>

<ore-checkbox color="error" error="You must accept the terms to continue."> I accept the terms of service </ore-checkbox>
```

</ComponentPreview>

### Listening for Changes

```js
const checkbox = document.querySelector('ore-checkbox');
checkbox.addEventListener('change', (e) => {
  console.log('checked:', e.detail.checked);
  console.log('value:', e.detail.value);
});
```

## Checkbox Group

`ore-checkbox-group` wraps `ore-checkbox` elements in a `<fieldset>`. Set `values` to a comma-separated string to pre-select options, and set `name` when you want the group to submit with a form. Always provide a meaningful `label` on the group — it is the accessible name read before each option. Do not use `ore-checkbox-group` for mutually exclusive choices — use [`ore-radio-group`](./radio) instead.

### Orientation

<ComponentPreview vertical>

```html
<ore-checkbox-group label="Notifications (vertical)">
  <ore-checkbox value="email">Email</ore-checkbox>
  <ore-checkbox value="push">Push</ore-checkbox>
  <ore-checkbox value="sms">SMS</ore-checkbox>
</ore-checkbox-group>

<ore-checkbox-group label="Working days (horizontal)" orientation="horizontal">
  <ore-checkbox value="mon">Mon</ore-checkbox>
  <ore-checkbox value="tue">Tue</ore-checkbox>
  <ore-checkbox value="wed">Wed</ore-checkbox>
  <ore-checkbox value="thu">Thu</ore-checkbox>
  <ore-checkbox value="fri">Fri</ore-checkbox>
</ore-checkbox-group>
```

</ComponentPreview>

Use `orientation="horizontal"` only for short option labels that comfortably fit on one line.

### Colors & Sizes

`color` and `size` set on the group propagate automatically to all child checkboxes.

<ComponentPreview vertical>

```html
<ore-checkbox-group label="Small · Primary" size="sm" color="primary" orientation="horizontal" values="a">
  <ore-checkbox value="a">Option A</ore-checkbox>
  <ore-checkbox value="b">Option B</ore-checkbox>
</ore-checkbox-group>
<ore-checkbox-group label="Medium · Success" size="md" color="success" orientation="horizontal" values="a">
  <ore-checkbox value="a">Option A</ore-checkbox>
  <ore-checkbox value="b">Option B</ore-checkbox>
</ore-checkbox-group>
<ore-checkbox-group label="Large · Warning" size="lg" color="warning" orientation="horizontal" values="a">
  <ore-checkbox value="a">Option A</ore-checkbox>
  <ore-checkbox value="b">Option B</ore-checkbox>
</ore-checkbox-group>
```

</ComponentPreview>

### Validation Feedback

Pair `error` with `color="error"` to reinforce validation failures visually.

<ComponentPreview vertical>

```html
<ore-checkbox-group label="Interests" helper="Select all that apply.">
  <ore-checkbox value="sport">Sport</ore-checkbox>
  <ore-checkbox value="music">Music</ore-checkbox>
  <ore-checkbox value="travel">Travel</ore-checkbox>
</ore-checkbox-group>

<ore-checkbox-group label="Agreements" error="Please accept all required policies." color="error">
  <ore-checkbox value="terms">I accept the terms of service</ore-checkbox>
  <ore-checkbox value="privacy">I accept the privacy policy</ore-checkbox>
</ore-checkbox-group>
```

</ComponentPreview>

### Disabled

Disabling the group propagates to all child checkboxes.

<ComponentPreview>

```html
<ore-checkbox-group label="Disabled group" disabled values="a,c">
  <ore-checkbox value="a">Option A</ore-checkbox>
  <ore-checkbox value="b">Option B</ore-checkbox>
  <ore-checkbox value="c">Option C</ore-checkbox>
</ore-checkbox-group>
```

</ComponentPreview>

### Form Integration

The group's checked values are stored in the `values` attribute and submitted under the group's `name` as a comma-separated string with any `<form>` or `ore-form`. Prefer `name` on the group (not individual checkboxes) when submitting with a form.

<ComponentPreview vertical>

```html
<ore-form id="prefs-form" novalidate>
  <ore-checkbox-group name="contact" label="Preferred contact" required>
    <ore-checkbox value="email">Email</ore-checkbox>
    <ore-checkbox value="phone">Phone</ore-checkbox>
    <ore-checkbox value="sms">SMS</ore-checkbox>
  </ore-checkbox-group>
  <ore-button type="submit">Save Preferences</ore-button>
</ore-form>

<script type="module">
  import '@vielzeug/refine/form';
  import '@vielzeug/refine/checkbox-group';
  import '@vielzeug/refine/checkbox';
  import '@vielzeug/refine/button';

  document.getElementById('prefs-form').addEventListener('submit', (e) => {
    console.log('contact:', e.detail.formData.get('contact'));
  });

  document.querySelector('ore-checkbox-group').addEventListener('change', (e) => {
    console.log('Checked values:', e.detail.values);
  });
</script>
```

</ComponentPreview>

### Select All Pattern

Combine indeterminate state on a parent checkbox with a `ore-checkbox-group` to build a "select all" control. Use `indeterminate` on a "select all" checkbox to represent partial selection.

<ComponentPreview vertical>

```html
<ore-checkbox id="select-all" indeterminate>Select all</ore-checkbox>
<ore-checkbox-group id="options" label="Options" values="a">
  <ore-checkbox value="a">Option A</ore-checkbox>
  <ore-checkbox value="b">Option B</ore-checkbox>
  <ore-checkbox value="c">Option C</ore-checkbox>
</ore-checkbox-group>

<script type="module">
  import '@vielzeug/refine/checkbox';
  import '@vielzeug/refine/checkbox-group';

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

**`ore-checkbox` Attributes**

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

**`ore-checkbox` Slots**

| Slot      | Description         |
| --------- | ------------------- |
| (default) | Checkbox label text |

**`ore-checkbox` Parts**

| Part       | Description                  |
| ---------- | ---------------------------- |
| `checkbox` | The checkbox wrapper element |
| `box`      | The visual checkbox square   |
| `label`    | The label text element       |

**`ore-checkbox` Events**

| Event    | Detail                                | Description                            |
| -------- | ------------------------------------- | -------------------------------------- |
| `change` | `{ checked: boolean, value: string }` | Emitted when the checked state changes |

**`ore-checkbox` CSS Custom Properties**

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

**`ore-checkbox-group` Attributes**

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

**`ore-checkbox-group` Slots**

| Slot      | Description                       |
| --------- | --------------------------------- |
| (default) | Place `ore-checkbox` elements here |

**`ore-checkbox-group` Events**

| Event    | Detail                 | Description                                             |
| -------- | ---------------------- | ------------------------------------------------------- |
| `change` | `{ values: string[] }` | Full array of currently checked values after any toggle |

## Accessibility

The checkbox components follow WCAG 2.1 Level AA standards.

`ore-checkbox` uses `role="checkbox"` with `aria-checked` set to `"true"`, `"false"`, or `"mixed"` for the indeterminate state. `aria-labelledby` links the label; `aria-describedby` links helper text; `aria-errormessage` links error text. `aria-disabled` reflects the disabled state. Keyboard interaction uses `Space` or `Enter` to toggle the focused checkbox, and `Tab` to move focus in and out.

`ore-checkbox-group` renders as a `<fieldset>` with a `<legend>` for the `label` attribute, providing proper screen reader grouping. `Tab` moves to the next checkbox within the group. `aria-required` and `aria-invalid` reflect the group validation state; `aria-errormessage` and `aria-describedby` link the text nodes.
