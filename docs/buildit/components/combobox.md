# Combobox

An autocomplete input that combines a text field with a filterable dropdown listbox. Users can type to narrow the displayed options or use arrow keys to browse, making it ideal for long option lists.

## Features

- ⌨️ **Full Keyboard Nav** — ArrowDown/Up, Enter, Escape, Home, End, Tab
- ⏳ **Loading State** — `loading` attribute shows a spinner while options are being fetched
- ⚡ **Virtualised Rendering** — powered by `@vielzeug/virtualit` for smooth performance with large option lists
- ✨ **Creatable** — allow users to create new options when no match is found
- ❌ **Clearable** — optional clear button to reset the value
- 🌈 **6 Semantic Colors** — primary, secondary, info, success, warning, error
- 🎨 **5 Variants** — solid, flat, bordered, outline, ghost
- 🏷️ **Label Placement** — inset (default) or outside
- 📏 **3 Sizes** — sm, md, lg
- 📝 **Helper & Error Text** — inline helper or error message below the field
- 🔍 **Live Filtering** — options narrow as the user types
- 🔗 **Form-Associated** — participates in native form submission
- 🔲 **Multiselect** — `multiple` mode shows selected values as removable chips
- 🖼️ **Option Icons** — each option supports a leading `icon` named slot
- 🚫 **No-Filter Mode** — keeps all options visible for server-side search
- 🧩 **Component Options** — place `<bit-combobox-option>` children for rich, slot-based option content

## Source Code

::: details View Source Code
<<< @/../packages/buildit/src/form/combobox/combobox.ts
:::

## Basic Usage

Place `<bit-combobox-option>` elements inside `<bit-combobox>`. The `value` attribute is what gets submitted; the text content is the label used for display and filtering.

<ComponentPreview vertical>

```html
<bit-combobox label="Country" placeholder="Search countries…">
  <bit-combobox-option value="us">United States</bit-combobox-option>
  <bit-combobox-option value="gb">United Kingdom</bit-combobox-option>
  <bit-combobox-option value="de">Germany</bit-combobox-option>
  <bit-combobox-option value="fr">France</bit-combobox-option>
  <bit-combobox-option value="jp">Japan</bit-combobox-option>
</bit-combobox>
```

</ComponentPreview>

## Variants

Five visual variants for different UI contexts and levels of emphasis.

<ComponentPreview>

```html
<bit-combobox variant="solid" placeholder="Solid">
  <bit-combobox-option value="a">Option A</bit-combobox-option>
  <bit-combobox-option value="b">Option B</bit-combobox-option>
</bit-combobox>
<bit-combobox variant="flat" placeholder="Flat">
  <bit-combobox-option value="a">Option A</bit-combobox-option>
  <bit-combobox-option value="b">Option B</bit-combobox-option>
</bit-combobox>
<bit-combobox variant="bordered" placeholder="Bordered">
  <bit-combobox-option value="a">Option A</bit-combobox-option>
  <bit-combobox-option value="b">Option B</bit-combobox-option>
</bit-combobox>
<bit-combobox variant="outline" placeholder="Outline">
  <bit-combobox-option value="a">Option A</bit-combobox-option>
  <bit-combobox-option value="b">Option B</bit-combobox-option>
</bit-combobox>
<bit-combobox variant="ghost" placeholder="Ghost">
  <bit-combobox-option value="a">Option A</bit-combobox-option>
  <bit-combobox-option value="b">Option B</bit-combobox-option>
</bit-combobox>
```

</ComponentPreview>

## Options with Icons

Add an `icon` named slot inside any `<bit-combobox-option>` for a leading icon. The icon is rendered in the dropdown alongside the label.

<ComponentPreview vertical>

```html
<bit-combobox label="Role" placeholder="Select a role…">
  <bit-combobox-option value="admin">
    <span slot="icon">👑</span>
    Administrator
  </bit-combobox-option>
  <bit-combobox-option value="editor">
    <span slot="icon">✏️</span>
    Editor
  </bit-combobox-option>
  <bit-combobox-option value="viewer">
    <span slot="icon">👁️</span>
    Viewer
  </bit-combobox-option>
  <bit-combobox-option value="guest" disabled>
    <span slot="icon">🚫</span>
    Guest (disabled)
  </bit-combobox-option>
</bit-combobox>
```

</ComponentPreview>

## Colors

<ComponentPreview center>

```html
<bit-combobox label="Default">
  <bit-combobox-option value="a">Option A</bit-combobox-option>
  <bit-combobox-option value="b">Option B</bit-combobox-option>
</bit-combobox>
<bit-combobox label="Primary" color="primary">
  <bit-combobox-option value="a">Option A</bit-combobox-option>
  <bit-combobox-option value="b">Option B</bit-combobox-option>
</bit-combobox>
<bit-combobox label="Success" color="success">
  <bit-combobox-option value="a">Option A</bit-combobox-option>
  <bit-combobox-option value="b">Option B</bit-combobox-option>
</bit-combobox>
<bit-combobox label="Error" color="error">
  <bit-combobox-option value="a">Option A</bit-combobox-option>
  <bit-combobox-option value="b">Option B</bit-combobox-option>
</bit-combobox>
```

</ComponentPreview>

## Sizes

<ComponentPreview vertical>

```html
<bit-combobox label="Small" size="sm">
  <bit-combobox-option value="a">Alpha</bit-combobox-option>
  <bit-combobox-option value="b">Beta</bit-combobox-option>
</bit-combobox>
<bit-combobox label="Medium (default)" size="md">
  <bit-combobox-option value="a">Alpha</bit-combobox-option>
  <bit-combobox-option value="b">Beta</bit-combobox-option>
</bit-combobox>
<bit-combobox label="Large" size="lg">
  <bit-combobox-option value="a">Alpha</bit-combobox-option>
  <bit-combobox-option value="b">Beta</bit-combobox-option>
</bit-combobox>
```

</ComponentPreview>

## Label Placement

The label can be placed **inset** (inside the field, above the input — default) or **outside** (above the field border).

<ComponentPreview vertical>

```html
<bit-combobox label="Inset label (default)" label-placement="inset">
  <bit-combobox-option value="a">Option A</bit-combobox-option>
  <bit-combobox-option value="b">Option B</bit-combobox-option>
</bit-combobox>
<bit-combobox label="Outside label" label-placement="outside">
  <bit-combobox-option value="a">Option A</bit-combobox-option>
  <bit-combobox-option value="b">Option B</bit-combobox-option>
</bit-combobox>
```

</ComponentPreview>

## Clearable

Add `clearable` to show a clear (×) button whenever a value is selected.

<ComponentPreview vertical>

```html
<bit-combobox label="Clearable combobox" clearable>
  <bit-combobox-option value="ts">TypeScript</bit-combobox-option>
  <bit-combobox-option value="js">JavaScript</bit-combobox-option>
  <bit-combobox-option value="rust">Rust</bit-combobox-option>
</bit-combobox>
```

</ComponentPreview>

## Multiselect

Add `multiple` to allow selecting more than one option. Each selected value is shown as a removable `bit-chip` inside the field. Pressing **Backspace** on an empty input removes the last chip.

<ComponentPreview vertical>

```html
<bit-combobox label="Technologies" multiple placeholder="Search…" style="max-width: 300px;">
  <bit-combobox-option value="ts">TypeScript</bit-combobox-option>
  <bit-combobox-option value="rust">Rust</bit-combobox-option>
  <bit-combobox-option value="go">Go</bit-combobox-option>
  <bit-combobox-option value="python">Python</bit-combobox-option>
  <bit-combobox-option value="java">Java</bit-combobox-option>
</bit-combobox>
```

</ComponentPreview>

In multiple mode the `change` event detail includes both `value` (comma-separated) and `values` (array):

```js
document.querySelector('bit-combobox').addEventListener('change', (e) => {
  console.log('csv:', e.detail.value); // "ts,rust,go"
  console.log('array:', e.detail.values); // ["ts", "rust", "go"]
});
```

## Helper & Error Text

<ComponentPreview vertical>

```html
<bit-combobox label="Language" helper="Start typing to filter available languages.">
  <bit-combobox-option value="en">English</bit-combobox-option>
  <bit-combobox-option value="de">German</bit-combobox-option>
  <bit-combobox-option value="fr">French</bit-combobox-option>
</bit-combobox>

<bit-combobox label="Country" error="Please select a valid country." color="error">
  <bit-combobox-option value="us">United States</bit-combobox-option>
  <bit-combobox-option value="gb">United Kingdom</bit-combobox-option>
</bit-combobox>
```

</ComponentPreview>

## Disabled Options

Add the `disabled` attribute on a `<bit-combobox-option>` to prevent selection of individual options.

<ComponentPreview vertical>

```html
<bit-combobox label="Role">
  <bit-combobox-option value="admin">Admin</bit-combobox-option>
  <bit-combobox-option value="editor">Editor</bit-combobox-option>
  <bit-combobox-option value="viewer" disabled>Viewer (no permission)</bit-combobox-option>
  <bit-combobox-option value="guest" disabled>Guest (no permission)</bit-combobox-option>
</bit-combobox>
```

</ComponentPreview>

## Disabled State

<ComponentPreview vertical>

```html
<bit-combobox label="Disabled combobox" disabled>
  <bit-combobox-option value="a">Option A</bit-combobox-option>
</bit-combobox>
```

</ComponentPreview>

## No-Filter Mode (Server-Side Search)

Set `no-filter` to keep all options visible regardless of what the user types. Use this when filtering happens server-side — replace the `<bit-combobox-option>` children based on the `search` event.

<ComponentPreview vertical>

```html
<bit-combobox label="User search" no-filter id="user-cb" placeholder="Type to search…">
  <bit-combobox-option value="1">Alice Johnson</bit-combobox-option>
  <bit-combobox-option value="2">Bob Smith</bit-combobox-option>
  <bit-combobox-option value="3">Carol White</bit-combobox-option>
</bit-combobox>
```

</ComponentPreview>

For a real server-side integration, replace options dynamically on `bit-input`:

```js
const cb = document.getElementById('user-cb');
cb.addEventListener('search', async (e) => {
  const results = await fetch(`/api/users?q=${encodeURIComponent(e.detail.query)}`).then((r) => r.json());
  cb.querySelectorAll('bit-combobox-option').forEach((el) => el.remove());
  for (const user of results) {
    const opt = document.createElement('bit-combobox-option');
    opt.setAttribute('value', user.id);
    opt.textContent = user.name;
    cb.appendChild(opt);
  }
});
```

## Creatable Options

Add `creatable` to allow users to create a new option when their query does not match any existing option. A **Create “X”** button appears at the bottom of the dropdown. Selecting it adds the new option and emits a `bit-change` event like any normal selection.

<ComponentPreview vertical>

```html
<bit-combobox label="Tags" creatable placeholder="Search or create a tag…">
  <bit-combobox-option value="typescript">TypeScript</bit-combobox-option>
  <bit-combobox-option value="rust">Rust</bit-combobox-option>
  <bit-combobox-option value="go">Go</bit-combobox-option>
</bit-combobox>
```

</ComponentPreview>

```js
document.querySelector('bit-combobox').addEventListener('change', (e) => {
  // Both selected and newly created options fire change
  console.log('Selected/created:', e.detail.value, e.detail.label);
});
```

## Loading State

Set `loading` to show a loading indicator inside the dropdown while options are being fetched. Use this together with `no-filter` for server-side search.

<ComponentPreview vertical>

```html
<bit-combobox label="Server search" no-filter loading placeholder="Fetching options…"> </bit-combobox>
```

</ComponentPreview>

```js
const cb = document.querySelector('bit-combobox');
cb.addEventListener('search', async (e) => {
  cb.loading = true;
  const results = await fetch(`/api/items?q=${encodeURIComponent(e.detail.query)}`).then((r) => r.json());
  cb.options = results.map((r) => ({ value: r.id, label: r.name }));
  cb.loading = false;
});
```

## JavaScript Options

Set the `options` property directly in JavaScript to provide options without using `<bit-combobox-option>` children. Each item is an object with `value`, `label`, and optional `disabled` fields.

```js
const cb = document.querySelector('bit-combobox');
cb.options = [
  { value: 'ts', label: 'TypeScript' },
  { value: 'rust', label: 'Rust' },
  { value: 'go', label: 'Go', disabled: true },
];
```

Assigning a new array to `options` updates the dropdown immediately. When both `<bit-combobox-option>` children and `options` are present, the JS property takes precedence.

## In a Form

`bit-combobox` is form-associated — its `name` attribute participates in `FormData` submissions.

<ComponentPreview vertical>

```html
<bit-form id="myForm">
  <bit-combobox name="country" label="Country" placeholder="Search countries…">
    <bit-combobox-option value="us">United States</bit-combobox-option>
    <bit-combobox-option value="de">Germany</bit-combobox-option>
    <bit-combobox-option value="gb">United Kingdom</bit-combobox-option>
  </bit-combobox>
  <bit-button type="submit">Submit</bit-button>
</form>
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
<bit-combobox id="my-cb" label="Programming language">
  <bit-combobox-option value="ts">TypeScript</bit-combobox-option>
  <bit-combobox-option value="rs">Rust</bit-combobox-option>
  <bit-combobox-option value="go">Go</bit-combobox-option>
</bit-combobox>
```

</ComponentPreview>

```js
const cb = document.getElementById('my-cb');

// Fired when a value is selected from the list
cb.addEventListener('change', (e) => {
  console.log('value:', e.detail.value, 'label:', e.detail.label);
  // In multiple mode, e.detail.values is a string array
  console.log('values:', e.detail.values);
});

// Fired on every keystroke in the input
cb.addEventListener('search', (e) => {
  console.log('query:', e.detail.query);
});
```

## Guideline Recipe: Onboard with Smart Defaults

**Guideline: onboard** — pre-populating a combobox with a sensible default value removes friction during first-time setup forms.

```html
<bit-combobox label="Primary language" name="language" value="en" helper="Used for UI language and date formatting">
  <bit-combobox-option value="en">English</bit-combobox-option>
  <bit-combobox-option value="fr">Français</bit-combobox-option>
  <bit-combobox-option value="de">Deutsch</bit-combobox-option>
  <bit-combobox-option value="es">Español</bit-combobox-option>
  <bit-combobox-option value="ja">日本語</bit-combobox-option>
</bit-combobox>
```

**Tip:** Combine with `helper` text explaining the impact of the choice so users feel confident selecting without needing to know the full implications first.

## API Reference

### `bit-combobox` Attributes

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

### `bit-combobox` Slots

| Slot      | Description                                             |
| --------- | ------------------------------------------------------- |
| (default) | `bit-combobox-option` elements defining the option list |

### `bit-combobox-option` Attributes

| Attribute  | Type      | Default | Description                                                                             |
| ---------- | --------- | ------- | --------------------------------------------------------------------------------------- |
| `value`    | `string`  | `''`    | The value submitted to the form and emitted in `bit-change`                             |
| `label`    | `string`  | —       | Explicit text used for display and filtering; falls back to the element's `textContent` |
| `disabled` | `boolean` | `false` | Prevent this option from being selected                                                 |

### `bit-combobox-option` Slots

| Slot      | Description                         |
| --------- | ----------------------------------- |
| `icon`    | Optional leading icon or decoration |
| (default) | Label text for the option           |

### Events

| Event    | Detail                                               | Description                                       |
| -------- | ---------------------------------------------------- | ------------------------------------------------- |
| `change` | `{ value: string, values: string[], label: string }` | Emitted when a value is selected from the listbox |
| `search` | `{ query: string }`                                  | Emitted on every keystroke in the text input      |

### CSS Custom Properties

| Property                  | Description                | Default                |
| ------------------------- | -------------------------- | ---------------------- |
| `--combobox-font-size`    | Input / option font size   | `--text-sm`            |
| `--combobox-gap`          | Gap between field elements | `--size-2`             |
| `--combobox-padding`      | Field padding              | Inner paddings         |
| `--combobox-radius`       | Field border radius        | `--rounded-md`         |
| `--combobox-bg`           | Field background color     | `--color-contrast-100` |
| `--combobox-border-color` | Default border color       | `--color-contrast-300` |

## Accessibility

The combobox component follows WCAG 2.1 Level AA standards.

### `bit-combobox`

✅ **Keyboard Navigation**

- `Tab` focuses the input; `ArrowDown` / `ArrowUp` navigate the option list.
- `Enter` confirms selection; `Escape` closes the dropdown.

✅ **Screen Readers**

- Uses `role="combobox"` with `aria-expanded`, `aria-controls`, `aria-activedescendant`, and `aria-autocomplete="list"`.
- The dropdown uses `role="listbox"`; each option uses `role="option"` with `aria-selected` and `aria-disabled`.
- `aria-live="polite"` on the helper / error region announces validation messages.
- `aria-labelledby` links the label; `aria-describedby` links helper and error text.
- `aria-disabled` reflects the disabled state.

## Best Practices

**Do:**

- Use `placeholder` to hint at the expected input (e.g. _"Search countries…"_).
- Use `clearable` when the field is optional and users might want to reset their choice.
- Use `no-filter` + `bit-input` for server-side search with large datasets.
- Pair with `error` text and `color="error"` for form validation feedback.

**Don't:**

- Use combobox for short lists (< 6 items) — a plain `bit-select` is simpler.
- Rely on the dropdown alone: always provide a visible label so the purpose is clear when the list is hidden.
