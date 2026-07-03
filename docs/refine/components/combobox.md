# Combobox

An autocomplete input that combines a text field with a filterable dropdown listbox. Users can type to narrow the displayed options or use arrow keys to browse, making it ideal for long option lists.

## Basic Usage

Place `<ore-combobox-option>` elements inside `<ore-combobox>`. The `value` attribute is what gets submitted; the text content is the label used for display and filtering.

<ComponentPreview height="400px">

```html
<ore-combobox label="Country" placeholder="Search countries…">
  <ore-combobox-option value="us">United States</ore-combobox-option>
  <ore-combobox-option value="gb">United Kingdom</ore-combobox-option>
  <ore-combobox-option value="de">Germany</ore-combobox-option>
  <ore-combobox-option value="fr">France</ore-combobox-option>
  <ore-combobox-option value="jp">Japan</ore-combobox-option>
</ore-combobox>
```

</ComponentPreview>

## Variants

Five visual variants for different UI contexts and levels of emphasis.

<ComponentPreview height="400px">

```html
<ore-combobox variant="solid" placeholder="Solid">
  <ore-combobox-option value="a">Option A</ore-combobox-option>
  <ore-combobox-option value="b">Option B</ore-combobox-option>
</ore-combobox>
<ore-combobox variant="flat" placeholder="Flat">
  <ore-combobox-option value="a">Option A</ore-combobox-option>
  <ore-combobox-option value="b">Option B</ore-combobox-option>
</ore-combobox>
<ore-combobox variant="bordered" placeholder="Bordered">
  <ore-combobox-option value="a">Option A</ore-combobox-option>
  <ore-combobox-option value="b">Option B</ore-combobox-option>
</ore-combobox>
<ore-combobox variant="outline" placeholder="Outline">
  <ore-combobox-option value="a">Option A</ore-combobox-option>
  <ore-combobox-option value="b">Option B</ore-combobox-option>
</ore-combobox>
<ore-combobox variant="ghost" placeholder="Ghost">
  <ore-combobox-option value="a">Option A</ore-combobox-option>
  <ore-combobox-option value="b">Option B</ore-combobox-option>
</ore-combobox>
```

</ComponentPreview>

## Options with Icons

Add an `icon` named slot inside any `<ore-combobox-option>` for a leading icon. The icon is rendered in the dropdown alongside the label.

<ComponentPreview height="400px">

```html
<ore-combobox label="Role" placeholder="Select a role…">
  <ore-combobox-option value="admin">
    <span slot="icon"><ore-icon name="crown" size="16"></ore-icon></span>
    Administrator
  </ore-combobox-option>
  <ore-combobox-option value="editor">
    <span slot="icon"><ore-icon name="pencil" size="16"></ore-icon>️</span>
    Editor
  </ore-combobox-option>
  <ore-combobox-option value="viewer">
    <span slot="icon"><ore-icon name="eye" size="16"></ore-icon>️</span>
    Viewer
  </ore-combobox-option>
  <ore-combobox-option value="guest" disabled>
    <span slot="icon"><ore-icon name="ban" size="16"></ore-icon></span>
    Guest (disabled)
  </ore-combobox-option>
</ore-combobox>
```

</ComponentPreview>

## Colors

<ComponentPreview height="400px">

```html
<ore-combobox variant="bordered" label="Default">
  <ore-combobox-option value="a">Option A</ore-combobox-option>
  <ore-combobox-option value="b">Option B</ore-combobox-option>
</ore-combobox>
<ore-combobox variant="bordered" label="Primary" color="primary">
  <ore-combobox-option value="a">Option A</ore-combobox-option>
  <ore-combobox-option value="b">Option B</ore-combobox-option>
</ore-combobox>
<ore-combobox variant="bordered" label="Secondary" color="secondary">
  <ore-combobox-option value="a">Option A</ore-combobox-option>
  <ore-combobox-option value="b">Option B</ore-combobox-option>
</ore-combobox>
<ore-combobox variant="bordered" label="Info" color="info">
  <ore-combobox-option value="a">Option A</ore-combobox-option>
  <ore-combobox-option value="b">Option B</ore-combobox-option>
</ore-combobox>
<ore-combobox variant="bordered" label="Warning" color="warning">
  <ore-combobox-option value="a">Option A</ore-combobox-option>
  <ore-combobox-option value="b">Option B</ore-combobox-option>
</ore-combobox>
<ore-combobox variant="bordered" label="Success" color="success">
  <ore-combobox-option value="a">Option A</ore-combobox-option>
  <ore-combobox-option value="b">Option B</ore-combobox-option>
</ore-combobox>
<ore-combobox variant="bordered" label="Error" color="error">
  <ore-combobox-option value="a">Option A</ore-combobox-option>
  <ore-combobox-option value="b">Option B</ore-combobox-option>
</ore-combobox>
```

</ComponentPreview>

## Sizes

<ComponentPreview height="400px">

```html
<ore-combobox label="Small" size="sm">
  <ore-combobox-option value="a">Alpha</ore-combobox-option>
  <ore-combobox-option value="b">Beta</ore-combobox-option>
</ore-combobox>
<ore-combobox label="Medium (default)" size="md">
  <ore-combobox-option value="a">Alpha</ore-combobox-option>
  <ore-combobox-option value="b">Beta</ore-combobox-option>
</ore-combobox>
<ore-combobox label="Large" size="lg">
  <ore-combobox-option value="a">Alpha</ore-combobox-option>
  <ore-combobox-option value="b">Beta</ore-combobox-option>
</ore-combobox>
```

</ComponentPreview>

## Label Placement

The label can be placed **inset** (inside the field, above the input — default) or **outside** (above the field border). Always provide a visible label so the purpose is clear when the list is hidden.

<ComponentPreview height="400px">

```html
<ore-combobox label="Inset label (default)" label-placement="inset">
  <ore-combobox-option value="a">Option A</ore-combobox-option>
  <ore-combobox-option value="b">Option B</ore-combobox-option>
</ore-combobox>
<ore-combobox label="Outside label" label-placement="outside">
  <ore-combobox-option value="a">Option A</ore-combobox-option>
  <ore-combobox-option value="b">Option B</ore-combobox-option>
</ore-combobox>
```

</ComponentPreview>

## Clearable

Add `clearable` to show a clear (×) button whenever a value is selected. Use this when the field is optional and users might want to reset their choice.

<ComponentPreview height="400px">

```html
<ore-combobox label="Clearable combobox" clearable>
  <ore-combobox-option value="ts">TypeScript</ore-combobox-option>
  <ore-combobox-option value="js">JavaScript</ore-combobox-option>
  <ore-combobox-option value="rust">Rust</ore-combobox-option>
</ore-combobox>
```

</ComponentPreview>

## Multiselect

Add `multiple` to allow selecting more than one option. Each selected value is shown as a removable `ore-chip` inside the field. Pressing **Backspace** on an empty input removes the last chip.

<ComponentPreview height="400px">

```html
<ore-combobox
  id="combobox-multiselect-demo"
  label="Technologies"
  multiple
  placeholder="Search…"
  style="max-width: 300px;">
  <ore-combobox-option value="ts">TypeScript</ore-combobox-option>
  <ore-combobox-option value="rust">Rust</ore-combobox-option>
  <ore-combobox-option value="go">Go</ore-combobox-option>
  <ore-combobox-option value="python">Python</ore-combobox-option>
  <ore-combobox-option value="java">Java</ore-combobox-option>
</ore-combobox>
```

</ComponentPreview>

In multiple mode the `change` event detail includes both `value` (comma-separated) and `values` (array):

```js
document.querySelector('ore-combobox').addEventListener('change', (e) => {
  console.log('csv:', e.detail.value); // "ts,rust,go"
  console.log('array:', e.detail.values); // ["ts", "rust", "go"]
});
```

## Helper & Error Text

Pair `error` text with `color="error"` for form validation feedback.

<ComponentPreview height="400px">

```html
<ore-combobox label="Language" helper="Start typing to filter available languages.">
  <ore-combobox-option value="en">English</ore-combobox-option>
  <ore-combobox-option value="de">German</ore-combobox-option>
  <ore-combobox-option value="fr">French</ore-combobox-option>
</ore-combobox>

<ore-combobox label="Country" error="Please select a valid country." color="error">
  <ore-combobox-option value="us">United States</ore-combobox-option>
  <ore-combobox-option value="gb">United Kingdom</ore-combobox-option>
</ore-combobox>
```

</ComponentPreview>

## Disabled Options

Add the `disabled` attribute on a `<ore-combobox-option>` to prevent selection of individual options.

<ComponentPreview height="400px">

```html
<ore-combobox label="Role">
  <ore-combobox-option value="admin">Admin</ore-combobox-option>
  <ore-combobox-option value="editor">Editor</ore-combobox-option>
  <ore-combobox-option value="viewer" disabled>Viewer (no permission)</ore-combobox-option>
  <ore-combobox-option value="guest" disabled>Guest (no permission)</ore-combobox-option>
</ore-combobox>
```

</ComponentPreview>

## Disabled State

<ComponentPreview height="400px">

```html
<ore-combobox label="Disabled combobox" disabled>
  <ore-combobox-option value="a">Option A</ore-combobox-option>
</ore-combobox>
```

</ComponentPreview>

## No-Filter Mode (Server-Side Search)

Set `no-filter` to keep all options visible regardless of what the user types. Use this when filtering happens server-side — replace the `<ore-combobox-option>` children based on the `search` event. For short lists (fewer than 6 items) consider a plain `ore-select` instead.

<ComponentPreview height="400px">

```html
<ore-combobox label="User search" no-filter id="user-cb" placeholder="Type to search…">
  <ore-combobox-option value="1">Alice Johnson</ore-combobox-option>
  <ore-combobox-option value="2">Bob Smith</ore-combobox-option>
  <ore-combobox-option value="3">Carol White</ore-combobox-option>
</ore-combobox>
```

</ComponentPreview>

For a real server-side integration, replace options dynamically on `search`:

```js
const cb = document.getElementById('user-cb');
cb.addEventListener('search', async (e) => {
  const results = await fetch(`/api/users?q=${encodeURIComponent(e.detail.query)}`).then((r) => r.json());
  cb.querySelectorAll('ore-combobox-option').forEach((el) => el.remove());
  for (const user of results) {
    const opt = document.createElement('ore-combobox-option');
    opt.setAttribute('value', user.id);
    opt.textContent = user.name;
    cb.appendChild(opt);
  }
});
```

## Creatable Options

Add `creatable` to allow users to create a new option when their query does not match any existing option. A **Create "X"** button appears at the bottom of the dropdown. Selecting it adds the new option and emits a `ore-change` event like any normal selection.

<ComponentPreview height="400px">

```html
<ore-combobox label="Tags" creatable placeholder="Search or create a tag…">
  <ore-combobox-option value="typescript">TypeScript</ore-combobox-option>
  <ore-combobox-option value="rust">Rust</ore-combobox-option>
  <ore-combobox-option value="go">Go</ore-combobox-option>
</ore-combobox>
```

</ComponentPreview>

```js
document.querySelector('ore-combobox').addEventListener('change', (e) => {
  // Both selected and newly created options fire change
  console.log('Selected/created:', e.detail.value, e.detail.labels);
});
```

## Loading State

Set `loading` to show a loading indicator inside the dropdown while options are being fetched. Use this together with `no-filter` for server-side search.

<ComponentPreview height="400px">

```html
<ore-combobox label="Server search" no-filter loading placeholder="Fetching options…"> </ore-combobox>
```

</ComponentPreview>

```js
const cb = document.querySelector('ore-combobox');
cb.addEventListener('search', async (e) => {
  cb.loading = true;
  const results = await fetch(`/api/items?q=${encodeURIComponent(e.detail.query)}`).then((r) => r.json());
  cb.options = results.map((r) => ({ value: r.id, label: r.name }));
  cb.loading = false;
});
```

## JavaScript Options

Set the `options` property directly in JavaScript to provide options without using `<ore-combobox-option>` children. Each item only needs a `value`; `label` falls back to the same string when omitted, while `disabled` remains optional.

```js
const cb = document.querySelector('ore-combobox');
cb.options = [{ value: 'ts' }, { value: 'rust', label: 'Rust' }, { value: 'go', label: 'Go', disabled: true }];
```

Assigning a new array to `options` updates the dropdown immediately. When both `<ore-combobox-option>` children and `options` are present, the JS property takes precedence.

## In a Form

`ore-combobox` is form-associated — its `name` attribute participates in `FormData` submissions.

<ComponentPreview height="400px">

```html
<ore-form id="myForm">
  <ore-combobox name="country" label="Country" placeholder="Search countries…">
    <ore-combobox-option value="us">United States</ore-combobox-option>
    <ore-combobox-option value="de">Germany</ore-combobox-option>
    <ore-combobox-option value="gb">United Kingdom</ore-combobox-option>
  </ore-combobox>
  <ore-button type="submit">Submit</ore-button>
</ore-form>
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

<ComponentPreview height="400px">

```html
<ore-combobox id="my-cb" label="Programming language">
  <ore-combobox-option value="ts">TypeScript</ore-combobox-option>
  <ore-combobox-option value="rs">Rust</ore-combobox-option>
  <ore-combobox-option value="go">Go</ore-combobox-option>
</ore-combobox>
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

**`ore-combobox` Attributes**

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

**`ore-combobox` Slots**

| Slot      | Description                                            |
| --------- | ------------------------------------------------------ |
| (default) | `ore-combobox-option` elements defining the option list |

**`ore-combobox-option` Attributes**

| Attribute  | Type      | Default | Description                                                                             |
| ---------- | --------- | ------- | --------------------------------------------------------------------------------------- |
| `value`    | `string`  | `''`    | The value submitted to the form and emitted in `ore-change`                              |
| `label`    | `string`  | —       | Explicit text used for display and filtering; falls back to the element's `textContent` |
| `disabled` | `boolean` | `false` | Prevent this option from being selected                                                 |

**`ore-combobox-option` Slots**

| Slot      | Description                         |
| --------- | ----------------------------------- |
| `icon`    | Optional leading icon or decoration |
| (default) | Label text for the option           |

**Events**

| Event    | Detail                                                                         | Description                                  |
| -------- | ------------------------------------------------------------------------------ | -------------------------------------------- |
| `change` | `{ value: string, values: string[], labels: string[], originalEvent?: Event }` | Emitted when selected value(s) change        |
| `open`   | `{ reason: 'trigger' \| 'programmatic' }`                                      | Emitted when the dropdown opens              |
| `close`  | `{ reason: 'escape' \| 'outside-click' \| 'programmatic' }`                    | Emitted when the dropdown closes             |
| `search` | `{ query: string }`                                                            | Emitted on every keystroke in the text input |

**CSS Custom Properties**

| Property                              | Description                                       | Default           |
| ------------------------------------- | ------------------------------------------------- | ----------------- |
| `--combobox-dropdown-bg`              | Dropdown panel background color                   | Theme-dependent   |
| `--combobox-dropdown-border-color`    | Dropdown panel border color                       | Theme-dependent   |
| `--combobox-option-hover-bg`          | Option background on hover                        | Theme-dependent   |
| `--combobox-option-focus-bg`          | Option background when keyboard-focused           | Theme-dependent   |
| `--combobox-option-selected-bg`       | Option background when selected                   | Theme-dependent   |
| `--combobox-option-selected-focus-bg` | Option background when selected and focused       | Theme-dependent   |
| `--input-bg`                          | Field background (passed through to `ore-input`)   | Variant-dependent |
| `--input-border-color`                | Field border color (passed through to `ore-input`) | Variant-dependent |

## Accessibility

The combobox component follows WCAG 2.1 Level AA standards. Keyboard navigation is fully supported: `Tab` focuses the input, `ArrowDown` / `ArrowUp` navigate the option list, `Enter` confirms selection, and `Escape` closes the dropdown.

The component uses `role="combobox"` with `aria-expanded`, `aria-controls`, `aria-activedescendant`, and `aria-autocomplete="list"`. The dropdown uses `role="listbox"`; each option uses `role="option"` with `aria-selected` and `aria-disabled`. An `aria-live="polite"` region on the helper / error area announces validation messages. `aria-labelledby` links the label; `aria-describedby` links helper and error text. `aria-disabled` reflects the disabled state.
