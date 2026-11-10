# Combobox

An autocomplete input that combines a text field with a filterable dropdown listbox. Users can type to narrow the displayed options or use arrow keys to browse, making it ideal for long option lists. Filtered options glide to their new slots with the same reflow motion as the command palette ([`animateReflow`](/refine/animation#list-reflow-animatereflow)), so a narrowing list keeps its context.

## Basic Usage

Place `<ore-combobox-option>` elements inside `<ore-combobox>`. The `value` attribute is what gets submitted; the text content is the label used for display and filtering.

<ComponentPreview align="start" justify="start" height="400px">

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

<ComponentPreview align="start" justify="start" height="400px">

```html
<ore-grid cols="2" cols-sm="3" gap="md">
  <ore-combobox fullwidth variant="solid" placeholder="Solid">
    <ore-combobox-option value="a">Option A</ore-combobox-option>
    <ore-combobox-option value="b">Option B</ore-combobox-option>
  </ore-combobox>
  <ore-combobox fullwidth variant="flat" placeholder="Flat">
    <ore-combobox-option value="a">Option A</ore-combobox-option>
    <ore-combobox-option value="b">Option B</ore-combobox-option>
  </ore-combobox>
  <ore-combobox fullwidth variant="bordered" placeholder="Bordered">
    <ore-combobox-option value="a">Option A</ore-combobox-option>
    <ore-combobox-option value="b">Option B</ore-combobox-option>
  </ore-combobox>
  <ore-combobox fullwidth variant="outline" placeholder="Outline">
    <ore-combobox-option value="a">Option A</ore-combobox-option>
    <ore-combobox-option value="b">Option B</ore-combobox-option>
  </ore-combobox>
  <ore-combobox fullwidth variant="ghost" placeholder="Ghost">
    <ore-combobox-option value="a">Option A</ore-combobox-option>
    <ore-combobox-option value="b">Option B</ore-combobox-option>
  </ore-combobox>
</ore-grid>
```

</ComponentPreview>

## Options with Icons

Add an `icon` named slot inside any `<ore-combobox-option>` for a leading icon. The icon is rendered in the dropdown alongside the label.

<ComponentPreview align="start" justify="start" height="400px">

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

<ComponentPreview align="start" justify="start" height="400px">

```html
<ore-grid cols="2" cols-sm="3" cols-md="4" gap="md">
  <ore-combobox fullwidth variant="bordered" label="Default">
    <ore-combobox-option value="a">Option A</ore-combobox-option>
    <ore-combobox-option value="b">Option B</ore-combobox-option>
  </ore-combobox>
  <ore-combobox fullwidth variant="bordered" label="Primary" color="primary">
    <ore-combobox-option value="a">Option A</ore-combobox-option>
    <ore-combobox-option value="b">Option B</ore-combobox-option>
  </ore-combobox>
  <ore-combobox fullwidth variant="bordered" label="Secondary" color="secondary">
    <ore-combobox-option value="a">Option A</ore-combobox-option>
    <ore-combobox-option value="b">Option B</ore-combobox-option>
  </ore-combobox>
  <ore-combobox fullwidth variant="bordered" label="Info" color="info">
    <ore-combobox-option value="a">Option A</ore-combobox-option>
    <ore-combobox-option value="b">Option B</ore-combobox-option>
  </ore-combobox>
  <ore-combobox fullwidth variant="bordered" label="Warning" color="warning">
    <ore-combobox-option value="a">Option A</ore-combobox-option>
    <ore-combobox-option value="b">Option B</ore-combobox-option>
  </ore-combobox>
  <ore-combobox fullwidth variant="bordered" label="Success" color="success">
    <ore-combobox-option value="a">Option A</ore-combobox-option>
    <ore-combobox-option value="b">Option B</ore-combobox-option>
  </ore-combobox>
  <ore-combobox fullwidth variant="bordered" label="Error" color="error">
    <ore-combobox-option value="a">Option A</ore-combobox-option>
    <ore-combobox-option value="b">Option B</ore-combobox-option>
  </ore-combobox>
</ore-grid>
```

</ComponentPreview>

## Sizes

<ComponentPreview align="start" justify="start" height="400px">

```html
<ore-grid gap="md" style="max-width: 22rem;">
  <ore-combobox fullwidth label="Small" size="sm">
    <ore-combobox-option value="a">Alpha</ore-combobox-option>
    <ore-combobox-option value="b">Beta</ore-combobox-option>
  </ore-combobox>
  <ore-combobox fullwidth label="Medium (default)" size="md">
    <ore-combobox-option value="a">Alpha</ore-combobox-option>
    <ore-combobox-option value="b">Beta</ore-combobox-option>
  </ore-combobox>
  <ore-combobox fullwidth label="Large" size="lg">
    <ore-combobox-option value="a">Alpha</ore-combobox-option>
    <ore-combobox-option value="b">Beta</ore-combobox-option>
  </ore-combobox>
</ore-grid>
```

</ComponentPreview>

## Label Placement

The label can be placed **inset** (inside the field, above the input: default) or **outside** (above the field border). Use `hide-label` only when surrounding context and placeholder text make the purpose clear; the label remains the combobox's accessible name.

<ComponentPreview align="start" justify="start" height="400px">

```html
<ore-grid cols="2" gap="md">
  <ore-combobox fullwidth label="Inset label (default)" label-placement="inset">
    <ore-combobox-option value="a">Option A</ore-combobox-option>
    <ore-combobox-option value="b">Option B</ore-combobox-option>
  </ore-combobox>
  <ore-combobox fullwidth label="Outside label" label-placement="outside">
    <ore-combobox-option value="a">Option A</ore-combobox-option>
    <ore-combobox-option value="b">Option B</ore-combobox-option>
  </ore-combobox>
  <ore-combobox fullwidth label="Compact option" hide-label placeholder="Choose an option…">
    <ore-combobox-option value="a">Option A</ore-combobox-option>
    <ore-combobox-option value="b">Option B</ore-combobox-option>
  </ore-combobox>
</ore-grid>
```

</ComponentPreview>

## Clearable

Add `clearable` to show a clear (×) button whenever a value is selected. Use this when the field is optional and users might want to reset their choice.

<ComponentPreview align="start" justify="start" height="400px">

```html
<ore-combobox label="Clearable combobox" clearable>
  <ore-combobox-option value="ts">TypeScript</ore-combobox-option>
  <ore-combobox-option value="js">JavaScript</ore-combobox-option>
  <ore-combobox-option value="rust">Rust</ore-combobox-option>
</ore-combobox>
```

</ComponentPreview>

## Multiselect

Add `multiple` to allow selecting more than one option. Each selected value is shown as a removable `ore-chip` inside the field. Pressing **Backspace** on an empty input removes the last chip. By default only the first three chips are shown; the rest collapse into a `+N` chip. Set `max-visible` to change the cap, or `0` to show every chip.

<ComponentPreview align="start" justify="start" height="400px">

```html
<ore-combobox
  id="combobox-multiselect-demo"
  label="Technologies"
  multiple
  value="ts,rust,go,python"
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
  console.log('value:', e.currentTarget.value); // ["ts", "rust", "go"] in multiple mode
});
```

## Footer Actions

Slotted content in the `footer` slot renders pinned under the option list inside the dropdown. Keep actions light — the footer sits in the scrolling panel, so a couple of buttons is the design budget.

<ComponentPreview align="start" justify="start" height="430px">

```html
<ore-combobox id="combobox-footer-demo" label="Team" multiple placeholder="Search…" style="max-width: 300px;">
  <ore-combobox-option value="ada">Ada</ore-combobox-option>
  <ore-combobox-option value="grace">Grace</ore-combobox-option>
  <ore-combobox-option value="linus">Linus</ore-combobox-option>
  <div slot="footer" style="display: flex; gap: 4px;">
    <ore-button id="combobox-footer-all" size="sm" variant="ghost">Select all</ore-button>
    <ore-button id="combobox-footer-clear" size="sm" variant="ghost">Clear</ore-button>
  </div>
</ore-combobox>

<script>
  const footerCombobox = document.getElementById('combobox-footer-demo');
  const allValues = Array.from(footerCombobox.querySelectorAll('ore-combobox-option'), (option) => option.value);

  document.getElementById('combobox-footer-all').addEventListener('click', () => {
    footerCombobox.value = allValues;
  });
  document.getElementById('combobox-footer-clear').addEventListener('click', () => {
    footerCombobox.value = [];
  });
</script>
```

</ComponentPreview>

## Helper & Error Text

Pair `error` text with `color="error"` for form validation feedback.

<ComponentPreview align="start" justify="start" height="400px">

```html
<ore-grid gap="md" style="max-width: 22rem;">
  <ore-combobox fullwidth label="Language" helper="Start typing to filter available languages.">
    <ore-combobox-option value="en">English</ore-combobox-option>
    <ore-combobox-option value="de">German</ore-combobox-option>
    <ore-combobox-option value="fr">French</ore-combobox-option>
  </ore-combobox>

  <ore-combobox fullwidth label="Country" error="Please select a valid country." color="error">
    <ore-combobox-option value="us">United States</ore-combobox-option>
    <ore-combobox-option value="gb">United Kingdom</ore-combobox-option>
  </ore-combobox>
</ore-grid>
```

</ComponentPreview>

## Disabled Options

Add the `disabled` attribute on a `<ore-combobox-option>` to prevent selection. Add `disabled-reason` to explain why the choice is unavailable; the reason remains visible and is included in the option's accessible name.

<ComponentPreview align="start" justify="start" height="400px">

```html
<ore-combobox label="Role">
  <ore-combobox-option value="admin">Admin</ore-combobox-option>
  <ore-combobox-option value="editor">Editor</ore-combobox-option>
  <ore-combobox-option value="viewer" disabled disabled-reason="Requires editor access">Viewer</ore-combobox-option>
  <ore-combobox-option value="guest" disabled disabled-reason="Invitations are paused">Guest</ore-combobox-option>
</ore-combobox>
```

</ComponentPreview>

The JavaScript `options` property uses the camelCase equivalent:

```js
combobox.options = [{ value: 'viewer', label: 'Viewer', disabled: true, disabledReason: 'Requires editor access' }];
```

## Disabled State

<ComponentPreview align="start" justify="start" height="400px">

```html
<ore-combobox label="Disabled combobox" disabled>
  <ore-combobox-option value="a">Option A</ore-combobox-option>
</ore-combobox>
```

</ComponentPreview>

## No-Filter Mode (Server-Side Search)

Set `no-filter` to keep all options visible regardless of what the user types. Use this when filtering happens server-side: replace the `<ore-combobox-option>` children based on the `search` event. For short lists (fewer than 6 items) consider a plain `ore-select` instead.

<ComponentPreview align="start" justify="start" height="400px">

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

<ComponentPreview align="start" justify="start" height="400px">

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
  console.log('Selected/created:', e.currentTarget.value);
});
```

## Custom Labels

Built-in strings live in the `labels` JavaScript property. Override only what you need — anything unset keeps its default. Use it for localization or rewording.

```js
const combobox = document.querySelector('ore-combobox');

combobox.labels = {
  noResults: 'Rien trouvé',
  create: (query) => `Ajouter « ${query} »`,
};
```

| Key         | Type                        | Default              | Where it appears                           |
| ----------- | --------------------------- | -------------------- | ------------------------------------------ |
| `noResults` | `string`                    | `'No results found'` | Empty-state row in the dropdown            |
| `create`    | `(query: string) => string` | `Create "X"`         | Creatable row (only offered for new terms) |

## Loading State

Set `loading` to show a loading indicator inside the dropdown while options are being fetched. Use this together with `no-filter` for server-side search.

<ComponentPreview align="start" justify="start" height="400px">

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

`ore-combobox` is form-associated: its `name` attribute participates in native `FormData` submissions. Set `required` to fail constraint validation while nothing is selected: a native `<form>` blocks submission and `checkValidity()`/`reportValidity()` return `false` until an option is chosen; resetting the ancestor form restores the initial selection.

<ComponentPreview align="start" justify="start" height="400px">

```html
<form id="myForm">
  <ore-combobox name="country" label="Country" placeholder="Search countries…" required>
    <ore-combobox-option value="us">United States</ore-combobox-option>
    <ore-combobox-option value="de">Germany</ore-combobox-option>
    <ore-combobox-option value="gb">United Kingdom</ore-combobox-option>
  </ore-combobox>
  <ore-button type="submit">Submit</ore-button>
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

<ComponentPreview align="start" justify="start" height="400px">

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
  console.log('value:', e.currentTarget.value);
  // In multiple mode, value is a string array.
});

// Fired on every keystroke in the input
cb.addEventListener('search', (e) => {
  console.log('query:', e.detail.query);
});

cb.addEventListener('open-change', (e) => {
  console.log('dropdown open:', e.detail.open, e.detail.reason);
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
| `hide-label`      | `boolean`                                                                 | `false`   | Hide the visual label while retaining its accessible name   |
| `placeholder`     | `string`                                                                  | `''`      | Input placeholder text                                      |
| `helper`          | `string`                                                                  | `''`      | Helper text shown below the field                           |
| `error`           | `string`                                                                  | `''`      | Error message; overrides helper text                        |
| `color`           | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | N/A       | Color theme                                                 |
| `variant`         | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost'`                 | `'solid'` | Visual style variant                                        |
| `size`            | `'sm' \| 'md' \| 'lg'`                                                    | `'md'`    | Field size                                                  |
| `rounded`         | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl' \| '3xl' \| 'full'`      | N/A       | Border radius override                                      |
| `clearable`       | `boolean`                                                                 | `false`   | Show a clear button when a value is selected                |
| `no-filter`       | `boolean`                                                                 | `false`   | Disable client-side option filtering (for server-side use)  |
| `creatable`       | `boolean`                                                                 | `false`   | Show a "Create X" option when no match is found             |
| `loading`         | `boolean`                                                                 | `false`   | Show a loading indicator in the dropdown                    |
| `multiple`        | `boolean`                                                                 | `false`   | Allow selecting multiple options (chips are shown in field) |
| `max-visible`     | `number`                                                                  | `3`       | Chips shown before the `+N` overflow chip (`0` = unlimited) |
| `fullwidth`       | `boolean`                                                                 | `false`   | Expand to fill the container width                          |
| `disabled`        | `boolean`                                                                 | `false`   | Disable the control                                         |
| `required`        | `boolean`                                                                 | `false`   | Require a non-blank selection for native-form validation    |

**`ore-combobox` Slots**

| Slot      | Description                                                    |
| --------- | -------------------------------------------------------------- |
| (default) | `ore-combobox-option` elements defining the option list        |
| `footer`  | Optional content pinned under the option list inside the panel |

**`ore-combobox` JavaScript Properties**

| Prop     | Type                      | Default           | Description                                      |
| -------- | ------------------------- | ----------------- | ------------------------------------------------ |
| `labels` | `Partial<ComboboxLabels>` | see Custom Labels | Overrides for built-in `noResults`/`create` text |

**`ore-combobox-option` Attributes**

| Attribute  | Type      | Default | Description                                                                             |
| ---------- | --------- | ------- | --------------------------------------------------------------------------------------- |
| `value`    | `string`  | `''`    | The value submitted to the form and emitted in `ore-change`                             |
| `label`    | `string`  | N/A     | Explicit text used for display and filtering; falls back to the element's `textContent` |
| `disabled` | `boolean` | `false` | Prevent this option from being selected                                                 |

**`ore-combobox-option` Slots**

| Slot      | Description                         |
| --------- | ----------------------------------- |
| `icon`    | Optional leading icon or decoration |
| (default) | Label text for the option           |

**Events**

| Event         | Detail                                                                         | Description                                   |
| ------------- | ------------------------------------------------------------------------------ | --------------------------------------------- |
| `change`      | `{ value: string, values: string[], labels: string[], originalEvent?: Event }` | Emitted when selected value(s) change         |
| `open-change` | `{ open: boolean, reason: string }`                                            | Emitted whenever the dropdown opens or closes |
| `search`      | `{ query: string }`                                                            | Emitted on every keystroke in the text input  |

**CSS Custom Properties**

| Property                              | Description                                        | Default           |
| ------------------------------------- | -------------------------------------------------- | ----------------- |
| `--combobox-dropdown-bg`              | Dropdown panel background color                    | Theme-dependent   |
| `--combobox-dropdown-border-color`    | Dropdown panel border color                        | Theme-dependent   |
| `--combobox-option-hover-bg`          | Option background on hover                         | Theme-dependent   |
| `--combobox-option-focus-bg`          | Option background when keyboard-focused            | Theme-dependent   |
| `--combobox-option-selected-bg`       | Option background when selected                    | Theme-dependent   |
| `--combobox-option-selected-focus-bg` | Option background when selected and focused        | Theme-dependent   |
| `--input-bg`                          | Field background (passed through to `ore-input`)   | Variant-dependent |
| `--input-border-color`                | Field border color (passed through to `ore-input`) | Variant-dependent |

## Accessibility

The combobox component follows WCAG 2.1 Level AA standards. Keyboard navigation is fully supported: `Tab` focuses the input, `ArrowDown` / `ArrowUp` navigate the option list, `Enter` confirms selection, and `Escape` closes the dropdown.

The component uses `role="combobox"` with `aria-expanded`, `aria-controls`, `aria-activedescendant`, and `aria-autocomplete="list"`. The dropdown uses `role="listbox"`; each option uses `role="option"` with `aria-selected` and `aria-disabled`. An `aria-live="polite"` region on the helper / error area announces validation messages. `aria-labelledby` links the label; `aria-describedby` links helper and error text. `aria-disabled` reflects the disabled state.
