# Checkbox

A customizable boolean form control with indeterminate state support, plus a group wrapper for managing multi-selection lists.

- **`bit-checkbox`** — standalone checkbox for a single boolean value.
- **`bit-checkbox-group`** — form-associated `<fieldset>` wrapper that manages a set of checkboxes, propagates `color`, `size`, and `disabled` to all children, and tracks checked values as a comma-separated `values` string.

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
- 📝 **Form Integration** — comma-separated `values` submit through the group's `name` with any `<form>` or `bit-form`
- 📡 **Context Propagation** — `color`, `size`, and `disabled` propagate to all child checkboxes
- 🗂️ **Semantic Markup** — renders as `<fieldset>` + `<legend>` for proper screen reader grouping

## Source Code

::: details View Checkbox Source
<<< @/../packages/buildit/src/inputs/checkbox/checkbox.ts
:::

::: details View Checkbox Group Source
<<< @/../packages/buildit/src/inputs/checkbox-group/checkbox-group.ts
:::

---

## Checkbox

### Basic Usage

```html
<bit-checkbox>Accept terms and conditions</bit-checkbox>

<script type="module">
  import '@vielzeug/buildit/checkbox';
</script>
```

### Colors

Six semantic colors to match your design language or validation state.

<ComponentPreview center>

```html
<bit-checkbox checked>Default</bit-checkbox>
<bit-checkbox checked color="primary">Primary</bit-checkbox>
<bit-checkbox checked color="secondary">Secondary</bit-checkbox>
<bit-checkbox checked color="info">Info</bit-checkbox>
<bit-checkbox checked color="success">Success</bit-checkbox>
<bit-checkbox checked color="warning">Warning</bit-checkbox>
<bit-checkbox checked color="error">Error</bit-checkbox>
```

</ComponentPreview>

### Sizes

<ComponentPreview center>

```html
<bit-checkbox checked size="sm">Small</bit-checkbox>
<bit-checkbox checked size="md">Medium</bit-checkbox>
<bit-checkbox checked size="lg">Large</bit-checkbox>
```

</ComponentPreview>

### Indeterminate

Use the indeterminate state for "select all" controls where only some items in a sub-list are checked. First click resolves to checked; subsequent clicks toggle normally.

<ComponentPreview center>

```html
<bit-checkbox indeterminate>Select all (partial)</bit-checkbox>
```

</ComponentPreview>

### States

#### Disabled

<ComponentPreview center>

```html
<bit-checkbox disabled>Disabled (unchecked)</bit-checkbox>
<bit-checkbox checked disabled>Disabled (checked)</bit-checkbox>
<bit-checkbox indeterminate disabled>Disabled (indeterminate)</bit-checkbox>
```

</ComponentPreview>

### Helper & Error Text

Provide contextual feedback directly below the checkbox.

<ComponentPreview vertical>

```html
<bit-checkbox helper="You can change this at any time in settings."> Send me marketing emails </bit-checkbox>

<bit-checkbox color="error" error="You must accept the terms to continue.">
  I accept the terms of service
</bit-checkbox>
```

</ComponentPreview>

### Listening for Changes

```js
const checkbox = document.querySelector('bit-checkbox');
checkbox.addEventListener('change', (e) => {
  console.log('checked:', e.detail.checked);
  console.log('value:', e.detail.value);
});
```

---

## Checkbox Group

`bit-checkbox-group` wraps `bit-checkbox` elements in a `<fieldset>`. Set `values` to a comma-separated string to pre-select options, and set `name` when you want the group to submit with a form.

### Basic Usage

```html
<bit-checkbox-group label="Interests" values="sport,music">
  <bit-checkbox value="sport">Sport</bit-checkbox>
  <bit-checkbox value="music">Music</bit-checkbox>
  <bit-checkbox value="travel">Travel</bit-checkbox>
</bit-checkbox-group>

<script type="module">
  import '@vielzeug/buildit/checkbox-group';
  import '@vielzeug/buildit/checkbox';
</script>
```

### Orientation

<ComponentPreview vertical>

```html
<bit-checkbox-group label="Notifications (vertical)">
  <bit-checkbox value="email">Email</bit-checkbox>
  <bit-checkbox value="push">Push</bit-checkbox>
  <bit-checkbox value="sms">SMS</bit-checkbox>
</bit-checkbox-group>

<bit-checkbox-group label="Working days (horizontal)" orientation="horizontal">
  <bit-checkbox value="mon">Mon</bit-checkbox>
  <bit-checkbox value="tue">Tue</bit-checkbox>
  <bit-checkbox value="wed">Wed</bit-checkbox>
  <bit-checkbox value="thu">Thu</bit-checkbox>
  <bit-checkbox value="fri">Fri</bit-checkbox>
</bit-checkbox-group>
```

</ComponentPreview>

### Colors & Sizes

`color` and `size` set on the group propagate automatically to all child checkboxes.

<ComponentPreview vertical>

```html
<bit-checkbox-group label="Small · Primary" size="sm" color="primary" orientation="horizontal" values="a">
  <bit-checkbox value="a">Option A</bit-checkbox>
  <bit-checkbox value="b">Option B</bit-checkbox>
</bit-checkbox-group>
<bit-checkbox-group label="Medium · Success" size="md" color="success" orientation="horizontal" values="a">
  <bit-checkbox value="a">Option A</bit-checkbox>
  <bit-checkbox value="b">Option B</bit-checkbox>
</bit-checkbox-group>
<bit-checkbox-group label="Large · Warning" size="lg" color="warning" orientation="horizontal" values="a">
  <bit-checkbox value="a">Option A</bit-checkbox>
  <bit-checkbox value="b">Option B</bit-checkbox>
</bit-checkbox-group>
```

</ComponentPreview>

### Validation Feedback

<ComponentPreview vertical>

```html
<bit-checkbox-group label="Interests" helper="Select all that apply.">
  <bit-checkbox value="sport">Sport</bit-checkbox>
  <bit-checkbox value="music">Music</bit-checkbox>
  <bit-checkbox value="travel">Travel</bit-checkbox>
</bit-checkbox-group>

<bit-checkbox-group label="Agreements" error="Please accept all required policies." color="error">
  <bit-checkbox value="terms">I accept the terms of service</bit-checkbox>
  <bit-checkbox value="privacy">I accept the privacy policy</bit-checkbox>
</bit-checkbox-group>
```

</ComponentPreview>

### Disabled

Disabling the group propagates to all child checkboxes.

<ComponentPreview>

```html
<bit-checkbox-group label="Disabled group" disabled values="a,c">
  <bit-checkbox value="a">Option A</bit-checkbox>
  <bit-checkbox value="b">Option B</bit-checkbox>
  <bit-checkbox value="c">Option C</bit-checkbox>
</bit-checkbox-group>
```

</ComponentPreview>

### Form Integration

The group's checked values are stored in the `values` attribute and submitted under the group's `name` as a comma-separated string with any `<form>` or `bit-form`.

<ComponentPreview vertical>

```html
<bit-form id="prefs-form" novalidate>
  <bit-checkbox-group name="contact" label="Preferred contact" required>
    <bit-checkbox value="email">Email</bit-checkbox>
    <bit-checkbox value="phone">Phone</bit-checkbox>
    <bit-checkbox value="sms">SMS</bit-checkbox>
  </bit-checkbox-group>
  <bit-button type="submit">Save Preferences</bit-button>
</bit-form>

<script type="module">
  import '@vielzeug/buildit/form';
  import '@vielzeug/buildit/checkbox-group';
  import '@vielzeug/buildit/checkbox';
  import '@vielzeug/buildit/button';

  document.getElementById('prefs-form').addEventListener('submit', (e) => {
    console.log('contact:', e.detail.formData.get('contact'));
  });

  document.querySelector('bit-checkbox-group').addEventListener('change', (e) => {
    console.log('Checked values:', e.detail.values);
  });
</script>
```

</ComponentPreview>

### Select All Pattern

Combine indeterminate state on a parent checkbox with a `bit-checkbox-group` to build a "select all" control.

<ComponentPreview vertical>

```html
<bit-checkbox id="select-all" indeterminate>Select all</bit-checkbox>
<bit-checkbox-group id="options" label="Options" values="a">
  <bit-checkbox value="a">Option A</bit-checkbox>
  <bit-checkbox value="b">Option B</bit-checkbox>
  <bit-checkbox value="c">Option C</bit-checkbox>
</bit-checkbox-group>

<script type="module">
  import '@vielzeug/buildit/checkbox';
  import '@vielzeug/buildit/checkbox-group';

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

---

## API Reference

### `bit-checkbox` Attributes

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

### `bit-checkbox` Slots

| Slot      | Description         |
| --------- | ------------------- |
| (default) | Checkbox label text |

### `bit-checkbox` Parts

| Part       | Description                  |
| ---------- | ---------------------------- |
| `checkbox` | The checkbox wrapper element |
| `box`      | The visual checkbox square   |
| `label`    | The label text element       |

### `bit-checkbox` Events

| Event    | Detail                                | Description                            |
| -------- | ------------------------------------- | -------------------------------------- |
| `change` | `{ checked: boolean, value: string }` | Emitted when the checked state changes |

### `bit-checkbox` CSS Custom Properties

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

### `bit-checkbox-group` Attributes

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

### `bit-checkbox-group` Slots

| Slot      | Description                        |
| --------- | ---------------------------------- |
| (default) | Place `bit-checkbox` elements here |

### `bit-checkbox-group` Events

| Event    | Detail                 | Description                                             |
| -------- | ---------------------- | ------------------------------------------------------- |
| `change` | `{ values: string[] }` | Full array of currently checked values after any toggle |

---

## Accessibility

The checkbox components follow WCAG 2.1 Level AA standards.

### `bit-checkbox`

✅ **Keyboard Navigation**

- `Space` / `Enter` toggle the focused checkbox; `Tab` moves focus in and out.

✅ **Screen Readers**

- Uses `role="checkbox"` with `aria-checked` set to `"true"`, `"false"`, or `"mixed"` for indeterminate.
- `aria-labelledby` links the label; `aria-describedby` links helper text; `aria-errormessage` links error text.
- `aria-disabled` reflects the disabled state.

### `bit-checkbox-group`

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

- Use `bit-checkbox-group` for mutually exclusive choices — use [`bit-radio-group`](./radio) instead.
- Omit the `label` attribute on the group; without it the fieldset has no accessible name.
- Place non-`bit-checkbox` elements as direct children of `bit-checkbox-group`.
