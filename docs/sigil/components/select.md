# Select

A fully-featured, form-associated select widget that reads native `<option>` and `<optgroup>` children, supports single and multiple selection, keyboard navigation, grouped options, and ARIA combobox semantics.

## Features

- <sg-icon name="keyboard" size="16"></sg-icon> **Full Keyboard Nav** — Arrow keys, Enter, Space, Escape, Home, End, Tab
- <sg-icon name="hourglass" size="16"></sg-icon> **Loading State** — `loading` attribute shows a loading indicator while options are being fetched
- <sg-icon name="accessibility" size="16"></sg-icon> **ARIA Combobox** — `role="combobox"`, `role="listbox"`, `role="option"` with live attributes
- <sg-icon name="rainbow" size="16"></sg-icon> **6 Semantic Colors** — primary, secondary, info, success, warning, error
- <sg-icon name="palette" size="16"></sg-icon> **5 Variants** — solid, flat, bordered, outline, ghost
- <sg-icon name="tag" size="16"></sg-icon> **Label Placement** — inset (floating) or outside
- <sg-icon name="clipboard" size="16"></sg-icon> **Native Options** — use standard `<option>` and `<optgroup>` children; no custom syntax
- <sg-icon name="ruler" size="16"></sg-icon> **3 Sizes** — sm, md, lg
- <sg-icon name="file-pen" size="16"></sg-icon> **Helper & Error Text** — inline helper or error message below the control
- <sg-icon name="link" size="16"></sg-icon> **Form-Associated** — participates in native form submission
- <sg-icon name="square" size="16"></sg-icon> **Multiple Selection** — chip-based multi-select via `multiple` attribute
- <sg-icon name="puzzle" size="16"></sg-icon> **Grouped Options** — `<optgroup label="...">` renders as section headers

## Source Code

::: details View Source Code
<<< @/../packages/sigil/src/inputs/select/select.ts
:::

## Basic Usage

Place `<option>` children directly inside `sg-select`.

```html
<sg-select label="Country">
  <option value="">Pick a country…</option>
  <option value="us">United States</option>
  <option value="uk">United Kingdom</option>
  <option value="de">Germany</option>
  <option value="jp">Japan</option>
</sg-select>
```

## Visual Options

### Variants

Six visual variants for different UI contexts and levels of emphasis.

<ComponentPreview>

```html
<sg-select variant="solid" placeholder="Solid">
  <option value="1">Option 1</option>
  <option value="2">Option 2</option>
</sg-select>
<sg-select variant="flat" placeholder="Flat">
  <option value="1">Option 1</option>
  <option value="2">Option 2</option>
</sg-select>
<sg-select variant="bordered" placeholder="Bordered">
  <option value="1">Option 1</option>
  <option value="2">Option 2</option>
</sg-select>
<sg-select variant="outline" placeholder="Outline">
  <option value="1">Option 1</option>
  <option value="2">Option 2</option>
</sg-select>
<sg-select variant="ghost" placeholder="Ghost">
  <option value="1">Option 1</option>
  <option value="2">Option 2</option>
</sg-select>
```

</ComponentPreview>

### Colors

Six semantic colors for different contexts and validation states. Defaults to neutral when no color is specified.

<ComponentPreview center>

```html
<sg-grid cols="1" cols-sm="3" cols-md="4" cols-lg="5" gap="md" style="width: 100%;">
  <sg-select variant="flat" placeholder="Default">
    <option value="1">Option 1</option>
  </sg-select>
  <sg-select variant="flat" color="primary" placeholder="Primary">
    <option value="1">Option 1</option>
  </sg-select>
  <sg-select variant="flat" color="secondary" placeholder="Secondary">
    <option value="1">Option 1</option>
  </sg-select>
  <sg-select variant="flat" color="info" placeholder="Info">
    <option value="1">Option 1</option>
  </sg-select>
  <sg-select variant="flat" color="success" placeholder="Success">
    <option value="1">Option 1</option>
  </sg-select>
  <sg-select variant="flat" color="warning" placeholder="Warning">
    <option value="1">Option 1</option>
  </sg-select>
  <sg-select variant="flat" color="error" placeholder="Error">
    <option value="1">Option 1</option>
  </sg-select>
</sg-grid>
```

</ComponentPreview>

## Sizes

<ComponentPreview vertical>

```html
<sg-select label="Small" size="sm">
  <option value="1">Option</option>
</sg-select>
<sg-select label="Medium (default)" size="md">
  <option value="1">Option</option>
</sg-select>
<sg-select label="Large" size="lg">
  <option value="1">Option</option>
</sg-select>
```

</ComponentPreview>

## Label Placement

<ComponentPreview vertical>

```html
<sg-select label="Inset label (default)" label-placement="inset">
  <option value="">Select…</option>
  <option value="a">Alpha</option>
</sg-select>
<sg-select label="Outside label" label-placement="outside">
  <option value="">Select…</option>
  <option value="a">Alpha</option>
</sg-select>
```

</ComponentPreview>

## Grouped Options

Use native `<optgroup>` elements to create labelled groups.

<ComponentPreview vertical>

```html
<sg-select label="Fruit or Vegetable">
  <optgroup label="Fruits">
    <option value="apple">Apple</option>
    <option value="banana">Banana</option>
    <option value="cherry">Cherry</option>
  </optgroup>
  <optgroup label="Vegetables">
    <option value="carrot">Carrot</option>
    <option value="broccoli">Broccoli</option>
  </optgroup>
</sg-select>
```

</ComponentPreview>

## Multiple Selection

Add `multiple` to allow selecting more than one option. Each selected value is displayed as a removable `sg-chip` tag inside the trigger field — clicking the × on a chip deselects that value without closing the dropdown.

<ComponentPreview vertical>

```html
<sg-select label="Skills" multiple color="primary">
  <option value="ts">TypeScript</option>
  <option value="rust">Rust</option>
  <option value="go">Go</option>
  <option value="python">Python</option>
  <option value="java">Java</option>
</sg-select>
```

</ComponentPreview>

The `change` event detail includes both `value` (comma-separated string) and `values` (array of selected values):

```js
document.querySelector('sg-select').addEventListener('change', (e) => {
  console.log('csv:', e.detail.value); // "ts,rust"
  console.log('array:', e.detail.values); // ["ts", "rust"]
});
```

## Helper & Error Text

<ComponentPreview vertical>

```html
<sg-select label="Role" helper="Choose the role that best fits.">
  <option value="">Select a role…</option>
  <option value="admin">Admin</option>
  <option value="editor">Editor</option>
  <option value="viewer">Viewer</option>
</sg-select>

<sg-select label="Priority" error="Please select a priority." color="error">
  <option value="">Select…</option>
  <option value="high">High</option>
  <option value="medium">Medium</option>
</sg-select>
```

</ComponentPreview>

## States

<ComponentPreview vertical>

```html
<sg-select label="Disabled select" disabled>
  <option value="1">Option</option>
</sg-select>
<sg-select label="Required select" required>
  <option value="">Choose…</option>
  <option value="a">Alpha</option>
</sg-select>
```

</ComponentPreview>

## Loading State

Set `loading` to show a loading indicator inside the dropdown while options are being fetched from a server. The option list is hidden during loading.

<ComponentPreview vertical>

```html
<sg-select label="Country" loading></sg-select>
```

</ComponentPreview>

```js
const select = document.querySelector('sg-select');
select.loading = true;
const data = await fetch('/api/countries').then((r) => r.json());
select.options = data.map((c) => ({ value: c.code, label: c.name }));
select.loading = false;
```

## JavaScript Options

For dynamic or large option lists, set the `options` property directly in JavaScript instead of using `<option>` children. Each item only needs a `value`; `label` falls back to the same string when omitted, and `group` remains optional.

```js
const select = document.querySelector('sg-select');
select.options = [
  { value: 'us', label: 'United States' },
  { value: 'gb', label: 'United Kingdom', group: 'Europe' },
  { value: 'de', label: 'Germany', group: 'Europe' },
  { value: 'fr', label: 'France', group: 'Europe' },
];
```

Assigning a new array to `options` at any time updates the dropdown immediately. When both `<option>` children and `options` are provided, the JS property takes precedence.

## In a Form

`sg-select` is form-associated. Read the value via `FormData` or a `change` event.

```html
<sg-form id="myForm">
  <sg-select name="category" label="Category" required>
    <option value="">Select a category…</option>
    <option value="tech">Technology</option>
    <option value="science">Science</option>
    <option value="art">Art</option>
  </sg-select>
  <sg-button type="submit">Submit</sg-button>
</sg-form>

<script type="module">
  import '@vielzeug/sigil/form';
  import '@vielzeug/sigil/select';
  import '@vielzeug/sigil/button';

  document.getElementById('myForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    console.log('category:', data.get('category'));
  });

  document.querySelector('sg-select').addEventListener('change', (e) => {
    console.log('Selected value:', e.detail.value);
    console.log('Selected labels:', e.detail.labels);
    // For multiple: e.detail.values (string[])
  });

  document.querySelector('sg-select').addEventListener('open', (e) => {
    console.log('Opened because:', e.detail.reason); // 'trigger' | 'programmatic'
  });

  document.querySelector('sg-select').addEventListener('close', (e) => {
    console.log('Closed because:', e.detail.reason); // 'escape' | 'outside-click' | 'programmatic' | 'trigger'
  });
</script>
```

## API Reference

### Attributes

| Attribute         | Type                                                                                   | Default     | Description                                |
| ----------------- | -------------------------------------------------------------------------------------- | ----------- | ------------------------------------------ |
| `value`           | `string`                                                                               | `''`        | Currently selected value                   |
| `name`            | `string`                                                                               | `''`        | Form field name                            |
| `label`           | `string`                                                                               | `''`        | Label text                                 |
| `label-placement` | `'inset' \| 'outside'`                                                                 | `'inset'`   | Label positioning                          |
| `placeholder`     | `string`                                                                               | `''`        | Empty-state placeholder text               |
| `helper`          | `string`                                                                               | `''`        | Helper text shown below the control        |
| `error`           | `string`                                                                               | `''`        | Error message; overrides helper text       |
| `variant`         | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost'`                              | `'solid'`   | Visual style variant                       |
| `color`           | `'default' \| 'primary' \| 'secondary' \| 'success' \| 'warning' \| 'error' \| 'info'` | `'default'` | Color theme                                |
| `size`            | `'sm' \| 'md' \| 'lg'`                                                                 | `'md'`      | Control size                               |
| `multiple`        | `boolean`                                                                              | `false`     | Allow multiple selections                  |
| `disabled`        | `boolean`                                                                              | `false`     | Disable the control                        |
| `required`        | `boolean`                                                                              | `false`     | Mark field as required for form validation |
| `fullwidth`       | `boolean`                                                                              | `false`     | Expand to full width                       |
| `rounded`         | `'none' \| 'sm' \| 'md' \| 'lg' \| 'full'`                                             | —           | Override border-radius                     |
| `loading`         | `boolean`                                                                              | `false`     | Show loading indicator in the dropdown     |

### Slots

| Slot      | Description                                     |
| --------- | ----------------------------------------------- |
| (default) | `<option>` and `<optgroup>` elements to display |

### Events

| Event    | Detail                                                                         | Description                               |
| -------- | ------------------------------------------------------------------------------ | ----------------------------------------- |
| `change` | `{ value: string, values: string[], labels: string[], originalEvent?: Event }` | Emitted when the selected value(s) change |
| `open`   | `{ reason: 'trigger' \| 'programmatic' }`                                      | Emitted when the dropdown opens           |
| `close`  | `{ reason: 'escape' \| 'outside-click' \| 'programmatic' \| 'trigger' }`       | Emitted when the dropdown closes          |

### CSS Custom Properties

| Property                   | Description                   | Default           |
| -------------------------- | ----------------------------- | ----------------- |
| `--select-border-color`    | Default border color          | `--color-border`  |
| `--select-focus-color`     | Focus ring / active color     | Per color theme   |
| `--select-bg`              | Trigger background            | Per variant       |
| `--select-dropdown-bg`     | Dropdown panel background     | `--color-surface` |
| `--select-option-hover-bg` | Option hover state background | `--color-hover`   |
| `--select-height`          | Trigger height                | Per size          |

## Accessibility

The select component follows WCAG 2.1 Level AA standards.

### `sg-select`

<sg-icon name="circle-check" size="16"></sg-icon> **Keyboard Navigation**

- `Tab` focuses the trigger; `Enter` / `Space` open the dropdown.
- Arrow keys navigate options; `Home` / `End` jump to first / last; `Escape` closes; `Tab` closes and moves focus out.

<sg-icon name="circle-check" size="16"></sg-icon> **Screen Readers**

- The trigger uses `role="combobox"` with `aria-haspopup="listbox"`, `aria-expanded`, and `aria-activedescendant`.
- The dropdown uses `role="listbox"`; each option uses `role="option"` with `aria-selected`; `aria-multiselectable` is set when `multiple` is active.
- `aria-labelledby` links the label; `aria-describedby` links helper and error text.
- `aria-disabled` reflects the disabled state.

## Best Practices

**Do:**

- Supply a placeholder `<option value="">…</option>` when the field is not pre-selected.
- Use `<optgroup>` for lists longer than ~8 options to improve scanability.
- Combine `required` with `error` text to give users clear validation feedback.
- For long single-select lists, consider a searchable implementation instead.

**Don't:**

- Use `multiple` for selections where only one makes logical sense.
- Put more than ~20 ungrouped options in one select — consider a multi-level pattern.
