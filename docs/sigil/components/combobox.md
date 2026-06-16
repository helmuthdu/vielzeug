# Combobox

An autocomplete input that combines a text field with a filterable dropdown listbox. Users can type to narrow the displayed options or use arrow keys to browse, making it ideal for long option lists.

## Features

- <sg-icon name="keyboard" size="16"></sg-icon> **Full Keyboard Nav** — ArrowDown/Up, Enter, Escape, Home, End, Tab
- <sg-icon name="hourglass" size="16"></sg-icon> **Loading State** — `loading` attribute shows a spinner while options are being fetched
- <sg-icon name="sparkles" size="16"></sg-icon> **Creatable** — allow users to create new options when no match is found
- <sg-icon name="x" size="16"></sg-icon> **Clearable** — optional clear button to reset the value
- <sg-icon name="rainbow" size="16"></sg-icon> **6 Semantic Colors** — primary, secondary, info, success, warning, error
- <sg-icon name="palette" size="16"></sg-icon> **5 Variants** — solid, flat, bordered, outline, ghost
- <sg-icon name="tag" size="16"></sg-icon> **Label Placement** — inset (default) or outside
- <sg-icon name="ruler" size="16"></sg-icon> **3 Sizes** — sm, md, lg
- <sg-icon name="file-pen" size="16"></sg-icon> **Helper & Error Text** — inline helper or error message below the field
- <sg-icon name="search" size="16"></sg-icon> **Live Filtering** — options narrow as the user types
- <sg-icon name="link" size="16"></sg-icon> **Form-Associated** — participates in native form submission
- <sg-icon name="square" size="16"></sg-icon> **Multiselect** — `multiple` mode shows selected values as removable chips
- <sg-icon name="image" size="16"></sg-icon> **Option Icons** — each option supports a leading `icon` named slot
- <sg-icon name="ban" size="16"></sg-icon> **No-Filter Mode** — keeps all options visible for server-side search
- <sg-icon name="puzzle" size="16"></sg-icon> **Component Options** — place `<sg-combobox-option>` children for rich, slot-based option content

## Source Code

::: details View Source Code
<<< @/../packages/sigil/src/inputs/combobox/combobox.ts
:::

## Basic Usage

Place `<sg-combobox-option>` elements inside `<sg-combobox>`. The `value` attribute is what gets submitted; the text content is the label used for display and filtering.

<ComponentPreview vertical>

```html
<sg-combobox label="Country" placeholder="Search countries…">
  <sg-combobox-option value="us">United States</sg-combobox-option>
  <sg-combobox-option value="gb">United Kingdom</sg-combobox-option>
  <sg-combobox-option value="de">Germany</sg-combobox-option>
  <sg-combobox-option value="fr">France</sg-combobox-option>
  <sg-combobox-option value="jp">Japan</sg-combobox-option>
</sg-combobox>
```

</ComponentPreview>

## Variants

Five visual variants for different UI contexts and levels of emphasis.

<ComponentPreview>

```html
<sg-combobox variant="solid" placeholder="Solid">
  <sg-combobox-option value="a">Option A</sg-combobox-option>
  <sg-combobox-option value="b">Option B</sg-combobox-option>
</sg-combobox>
<sg-combobox variant="flat" placeholder="Flat">
  <sg-combobox-option value="a">Option A</sg-combobox-option>
  <sg-combobox-option value="b">Option B</sg-combobox-option>
</sg-combobox>
<sg-combobox variant="bordered" placeholder="Bordered">
  <sg-combobox-option value="a">Option A</sg-combobox-option>
  <sg-combobox-option value="b">Option B</sg-combobox-option>
</sg-combobox>
<sg-combobox variant="outline" placeholder="Outline">
  <sg-combobox-option value="a">Option A</sg-combobox-option>
  <sg-combobox-option value="b">Option B</sg-combobox-option>
</sg-combobox>
<sg-combobox variant="ghost" placeholder="Ghost">
  <sg-combobox-option value="a">Option A</sg-combobox-option>
  <sg-combobox-option value="b">Option B</sg-combobox-option>
</sg-combobox>
```

</ComponentPreview>

## Options with Icons

Add an `icon` named slot inside any `<sg-combobox-option>` for a leading icon. The icon is rendered in the dropdown alongside the label.

<ComponentPreview vertical>

```html
<sg-combobox label="Role" placeholder="Select a role…">
  <sg-combobox-option value="admin">
    <span slot="icon"><sg-icon name="crown" size="16"></sg-icon></span>
    Administrator
  </sg-combobox-option>
  <sg-combobox-option value="editor">
    <span slot="icon"><sg-icon name="pencil" size="16"></sg-icon>️</span>
    Editor
  </sg-combobox-option>
  <sg-combobox-option value="viewer">
    <span slot="icon"><sg-icon name="eye" size="16"></sg-icon>️</span>
    Viewer
  </sg-combobox-option>
  <sg-combobox-option value="guest" disabled>
    <span slot="icon"><sg-icon name="ban" size="16"></sg-icon></span>
    Guest (disabled)
  </sg-combobox-option>
</sg-combobox>
```

</ComponentPreview>

## Colors

<ComponentPreview center>

```html
<sg-combobox variant="bordered" label="Default">
  <sg-combobox-option value="a">Option A</sg-combobox-option>
  <sg-combobox-option value="b">Option B</sg-combobox-option>
</sg-combobox>
<sg-combobox variant="bordered" label="Primary" color="primary">
  <sg-combobox-option value="a">Option A</sg-combobox-option>
  <sg-combobox-option value="b">Option B</sg-combobox-option>
</sg-combobox>
<sg-combobox variant="bordered" label="Secondary" color="secondary">
  <sg-combobox-option value="a">Option A</sg-combobox-option>
  <sg-combobox-option value="b">Option B</sg-combobox-option>
</sg-combobox>
<sg-combobox variant="bordered" label="Info" color="info">
  <sg-combobox-option value="a">Option A</sg-combobox-option>
  <sg-combobox-option value="b">Option B</sg-combobox-option>
</sg-combobox>
<sg-combobox variant="bordered" label="Warning" color="warning">
  <sg-combobox-option value="a">Option A</sg-combobox-option>
  <sg-combobox-option value="b">Option B</sg-combobox-option>
</sg-combobox>
<sg-combobox variant="bordered" label="Success" color="success">
  <sg-combobox-option value="a">Option A</sg-combobox-option>
  <sg-combobox-option value="b">Option B</sg-combobox-option>
</sg-combobox>
<sg-combobox variant="bordered" label="Error" color="error">
  <sg-combobox-option value="a">Option A</sg-combobox-option>
  <sg-combobox-option value="b">Option B</sg-combobox-option>
</sg-combobox>
```

</ComponentPreview>

## Sizes

<ComponentPreview vertical>

```html
<sg-combobox label="Small" size="sm">
  <sg-combobox-option value="a">Alpha</sg-combobox-option>
  <sg-combobox-option value="b">Beta</sg-combobox-option>
</sg-combobox>
<sg-combobox label="Medium (default)" size="md">
  <sg-combobox-option value="a">Alpha</sg-combobox-option>
  <sg-combobox-option value="b">Beta</sg-combobox-option>
</sg-combobox>
<sg-combobox label="Large" size="lg">
  <sg-combobox-option value="a">Alpha</sg-combobox-option>
  <sg-combobox-option value="b">Beta</sg-combobox-option>
</sg-combobox>
```

</ComponentPreview>

## Label Placement

The label can be placed **inset** (inside the field, above the input — default) or **outside** (above the field border).

<ComponentPreview vertical>

```html
<sg-combobox label="Inset label (default)" label-placement="inset">
  <sg-combobox-option value="a">Option A</sg-combobox-option>
  <sg-combobox-option value="b">Option B</sg-combobox-option>
</sg-combobox>
<sg-combobox label="Outside label" label-placement="outside">
  <sg-combobox-option value="a">Option A</sg-combobox-option>
  <sg-combobox-option value="b">Option B</sg-combobox-option>
</sg-combobox>
```

</ComponentPreview>

## Clearable

Add `clearable` to show a clear (×) button whenever a value is selected.

<ComponentPreview vertical>

```html
<sg-combobox label="Clearable combobox" clearable>
  <sg-combobox-option value="ts">TypeScript</sg-combobox-option>
  <sg-combobox-option value="js">JavaScript</sg-combobox-option>
  <sg-combobox-option value="rust">Rust</sg-combobox-option>
</sg-combobox>
```

</ComponentPreview>

## Multiselect

Add `multiple` to allow selecting more than one option. Each selected value is shown as a removable `sg-chip` inside the field. Pressing **Backspace** on an empty input removes the last chip.

<ComponentPreview vertical>

```html
<sg-combobox
  id="combobox-multiselect-demo"
  label="Technologies"
  multiple
  placeholder="Search…"
  style="max-width: 300px;">
  <sg-combobox-option value="ts">TypeScript</sg-combobox-option>
  <sg-combobox-option value="rust">Rust</sg-combobox-option>
  <sg-combobox-option value="go">Go</sg-combobox-option>
  <sg-combobox-option value="python">Python</sg-combobox-option>
  <sg-combobox-option value="java">Java</sg-combobox-option>
</sg-combobox>
```

</ComponentPreview>

In multiple mode the `change` event detail includes both `value` (comma-separated) and `values` (array):

```js
document.querySelector('sg-combobox').addEventListener('change', (e) => {
  console.log('csv:', e.detail.value); // "ts,rust,go"
  console.log('array:', e.detail.values); // ["ts", "rust", "go"]
});
```

## Helper & Error Text

<ComponentPreview vertical>

```html
<sg-combobox label="Language" helper="Start typing to filter available languages.">
  <sg-combobox-option value="en">English</sg-combobox-option>
  <sg-combobox-option value="de">German</sg-combobox-option>
  <sg-combobox-option value="fr">French</sg-combobox-option>
</sg-combobox>

<sg-combobox label="Country" error="Please select a valid country." color="error">
  <sg-combobox-option value="us">United States</sg-combobox-option>
  <sg-combobox-option value="gb">United Kingdom</sg-combobox-option>
</sg-combobox>
```

</ComponentPreview>

## Disabled Options

Add the `disabled` attribute on a `<sg-combobox-option>` to prevent selection of individual options.

<ComponentPreview vertical>

```html
<sg-combobox label="Role">
  <sg-combobox-option value="admin">Admin</sg-combobox-option>
  <sg-combobox-option value="editor">Editor</sg-combobox-option>
  <sg-combobox-option value="viewer" disabled>Viewer (no permission)</sg-combobox-option>
  <sg-combobox-option value="guest" disabled>Guest (no permission)</sg-combobox-option>
</sg-combobox>
```

</ComponentPreview>

## Disabled State

<ComponentPreview vertical>

```html
<sg-combobox label="Disabled combobox" disabled>
  <sg-combobox-option value="a">Option A</sg-combobox-option>
</sg-combobox>
```

</ComponentPreview>

## No-Filter Mode (Server-Side Search)

Set `no-filter` to keep all options visible regardless of what the user types. Use this when filtering happens server-side — replace the `<sg-combobox-option>` children based on the `search` event.

<ComponentPreview vertical>

```html
<sg-combobox label="User search" no-filter id="user-cb" placeholder="Type to search…">
  <sg-combobox-option value="1">Alice Johnson</sg-combobox-option>
  <sg-combobox-option value="2">Bob Smith</sg-combobox-option>
  <sg-combobox-option value="3">Carol White</sg-combobox-option>
</sg-combobox>
```

</ComponentPreview>

For a real server-side integration, replace options dynamically on `search`:

```js
const cb = document.getElementById('user-cb');
cb.addEventListener('search', async (e) => {
  const results = await fetch(`/api/users?q=${encodeURIComponent(e.detail.query)}`).then((r) => r.json());
  cb.querySelectorAll('sg-combobox-option').forEach((el) => el.remove());
  for (const user of results) {
    const opt = document.createElement('sg-combobox-option');
    opt.setAttribute('value', user.id);
    opt.textContent = user.name;
    cb.appendChild(opt);
  }
});
```

## Creatable Options

Add `creatable` to allow users to create a new option when their query does not match any existing option. A **Create “X”** button appears at the bottom of the dropdown. Selecting it adds the new option and emits a `sg-change` event like any normal selection.

<ComponentPreview vertical>

```html
<sg-combobox label="Tags" creatable placeholder="Search or create a tag…">
  <sg-combobox-option value="typescript">TypeScript</sg-combobox-option>
  <sg-combobox-option value="rust">Rust</sg-combobox-option>
  <sg-combobox-option value="go">Go</sg-combobox-option>
</sg-combobox>
```

</ComponentPreview>

```js
document.querySelector('sg-combobox').addEventListener('change', (e) => {
  // Both selected and newly created options fire change
  console.log('Selected/created:', e.detail.value, e.detail.labels);
});
```

## Loading State

Set `loading` to show a loading indicator inside the dropdown while options are being fetched. Use this together with `no-filter` for server-side search.

<ComponentPreview vertical>

```html
<sg-combobox label="Server search" no-filter loading placeholder="Fetching options…"> </sg-combobox>
```

</ComponentPreview>

```js
const cb = document.querySelector('sg-combobox');
cb.addEventListener('search', async (e) => {
  cb.loading = true;
  const results = await fetch(`/api/items?q=${encodeURIComponent(e.detail.query)}`).then((r) => r.json());
  cb.options = results.map((r) => ({ value: r.id, label: r.name }));
  cb.loading = false;
});
```

## JavaScript Options

Set the `options` property directly in JavaScript to provide options without using `<sg-combobox-option>` children. Each item only needs a `value`; `label` falls back to the same string when omitted, while `disabled` remains optional.

```js
const cb = document.querySelector('sg-combobox');
cb.options = [{ value: 'ts' }, { value: 'rust', label: 'Rust' }, { value: 'go', label: 'Go', disabled: true }];
```

Assigning a new array to `options` updates the dropdown immediately. When both `<sg-combobox-option>` children and `options` are present, the JS property takes precedence.

## In a Form

`sg-combobox` is form-associated — its `name` attribute participates in `FormData` submissions.

<ComponentPreview vertical>

```html
<sg-form id="myForm">
  <sg-combobox name="country" label="Country" placeholder="Search countries…">
    <sg-combobox-option value="us">United States</sg-combobox-option>
    <sg-combobox-option value="de">Germany</sg-combobox-option>
    <sg-combobox-option value="gb">United Kingdom</sg-combobox-option>
  </sg-combobox>
  <sg-button type="submit">Submit</sg-button>
</sg-form>
```

</ComponentPreview>

```js
document.getElementById('myForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(e.target);
  console.log('country:', data.get('country'));
});
```

## Listening to Events

<ComponentPreview vertical>

```html
<sg-combobox id="my-cb" label="Programming language">
  <sg-combobox-option value="ts">TypeScript</sg-combobox-option>
  <sg-combobox-option value="rs">Rust</sg-combobox-option>
  <sg-combobox-option value="go">Go</sg-combobox-option>
</sg-combobox>
```

</ComponentPreview>

```js
const cb = document.getElementById('my-cb');

// Fired when a value is selected from the list
cb.addEventListener('change', (e) => {
  console.log('value:', e.detail.value, 'labels:', e.detail.labels);
  // In multiple mode, e.detail.values is a string array
  console.log('values:', e.detail.values);
});

// Fired on every keystroke in the input
cb.addEventListener('search', (e) => {
  console.log('query:', e.detail.query);
});

// Fired when the popup opens/closes
cb.addEventListener('open', (e) => {
  console.log('opened because:', e.detail.reason); // 'trigger' | 'programmatic'
});

cb.addEventListener('close', (e) => {
  console.log('closed because:', e.detail.reason); // 'escape' | 'outside-click' | 'programmatic'
});
```

## API Reference

### `sg-combobox` Attributes

| Attribute         | Type                                                                      | Default   | Description                                                 |
| ----------------- | ------------------------------------------------------------------------- | --------- | ----------------------------------------------------------- |
| `value`           | `string`                                                                  | `''`      | Currently selected value                                    |
| `name`            | `string`                                                                  | `''`      | Form field name                                             |
| `label`           | `string`                                                                  | `''`      | Label text                                                  |
| `label-placement` | `'inset' \| 'outside'`                                                    | `'inset'` | Label positioning                                           |
| `placeholder`     | `string`                                                                  | `''`      | Input placeholder text                                      |
| `helper`          | `string`                                                                  | `''`      | Helper text shown below the field                           |
| `error`           | `string`                                                                  | `''`      | Error message; overrides helper text                        |
| `color`           | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | —         | Color theme                                                 |
| `variant`         | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost'`                 | `'solid'` | Visual style variant                                        |
| `size`            | `'sm' \| 'md' \| 'lg'`                                                    | `'md'`    | Field size                                                  |
| `rounded`         | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl' \| '3xl' \| 'full'`      | —         | Border radius override                                      |
| `clearable`       | `boolean`                                                                 | `false`   | Show a clear button when a value is selected                |
| `no-filter`       | `boolean`                                                                 | `false`   | Disable client-side option filtering (for server-side use)  |
| `creatable`       | `boolean`                                                                 | `false`   | Show a "Create X" option when no match is found             |
| `loading`         | `boolean`                                                                 | `false`   | Show a loading indicator in the dropdown                    |
| `multiple`        | `boolean`                                                                 | `false`   | Allow selecting multiple options (chips are shown in field) |
| `fullwidth`       | `boolean`                                                                 | `false`   | Expand to fill the container width                          |
| `disabled`        | `boolean`                                                                 | `false`   | Disable the control                                         |

### `sg-combobox` Slots

| Slot      | Description                                            |
| --------- | ------------------------------------------------------ |
| (default) | `sg-combobox-option` elements defining the option list |

### `sg-combobox-option` Attributes

| Attribute  | Type      | Default | Description                                                                             |
| ---------- | --------- | ------- | --------------------------------------------------------------------------------------- |
| `value`    | `string`  | `''`    | The value submitted to the form and emitted in `sg-change`                              |
| `label`    | `string`  | —       | Explicit text used for display and filtering; falls back to the element's `textContent` |
| `disabled` | `boolean` | `false` | Prevent this option from being selected                                                 |

### `sg-combobox-option` Slots

| Slot      | Description                         |
| --------- | ----------------------------------- |
| `icon`    | Optional leading icon or decoration |
| (default) | Label text for the option           |

### Events

| Event    | Detail                                                                         | Description                                  |
| -------- | ------------------------------------------------------------------------------ | -------------------------------------------- |
| `change` | `{ value: string, values: string[], labels: string[], originalEvent?: Event }` | Emitted when selected value(s) change        |
| `open`   | `{ reason: 'trigger' \| 'programmatic' }`                                      | Emitted when the dropdown opens              |
| `close`  | `{ reason: 'escape' \| 'outside-click' \| 'programmatic' }`                    | Emitted when the dropdown closes             |
| `search` | `{ query: string }`                                                            | Emitted on every keystroke in the text input |

### CSS Custom Properties

| Property                              | Description                                       | Default           |
| ------------------------------------- | ------------------------------------------------- | ----------------- |
| `--combobox-dropdown-bg`              | Dropdown panel background color                   | Theme-dependent   |
| `--combobox-dropdown-border-color`    | Dropdown panel border color                       | Theme-dependent   |
| `--combobox-option-hover-bg`          | Option background on hover                        | Theme-dependent   |
| `--combobox-option-focus-bg`          | Option background when keyboard-focused           | Theme-dependent   |
| `--combobox-option-selected-bg`       | Option background when selected                   | Theme-dependent   |
| `--combobox-option-selected-focus-bg` | Option background when selected and focused       | Theme-dependent   |
| `--input-bg`                          | Field background (passed through to `sg-input`)   | Variant-dependent |
| `--input-border-color`                | Field border color (passed through to `sg-input`) | Variant-dependent |

## Accessibility

The combobox component follows WCAG 2.1 Level AA standards.

### `sg-combobox`

<sg-icon name="check" size="16"></sg-icon> **Keyboard Navigation**

- `Tab` focuses the input; `ArrowDown` / `ArrowUp` navigate the option list.
- `Enter` confirms selection; `Escape` closes the dropdown.

<sg-icon name="check" size="16"></sg-icon> **Screen Readers**

- Uses `role="combobox"` with `aria-expanded`, `aria-controls`, `aria-activedescendant`, and `aria-autocomplete="list"`.
- The dropdown uses `role="listbox"`; each option uses `role="option"` with `aria-selected` and `aria-disabled`.
- `aria-live="polite"` on the helper / error region announces validation messages.
- `aria-labelledby` links the label; `aria-describedby` links helper and error text.
- `aria-disabled` reflects the disabled state.

## Best Practices

**Do:**

- Use `placeholder` to hint at the expected input (e.g. _"Search countries…"_).
- Use `clearable` when the field is optional and users might want to reset their choice.
- Use `no-filter` + `sg-input` for server-side search with large datasets.
- Pair with `error` text and `color="error"` for form validation feedback.

**Don't:**

- Use combobox for short lists (< 6 items) — a plain `sg-select` is simpler.
- Rely on the dropdown alone: always provide a visible label so the purpose is clear when the list is hidden.
