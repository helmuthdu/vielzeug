# Command Palette

A searchable, keyboard-driven list of commands presented in a centered modal — the "⌘K" pattern popularized by editors and productivity apps. Built on the native `<dialog>` element for focus trapping, top-layer stacking, and `Escape`-to-close, and on [`@vielzeug/keymap`](/keymap/) for the global shortcut that opens it from anywhere on the page.

## Basic Usage

Declare commands with `ore-command-palette-item` elements in the default slot. Each item needs a `value`; the visible label falls back to the element's text content when `label` is omitted.

<ComponentPreview height="480px">

```html
<ore-button id="open-btn">Open (⌘K / Ctrl+K)</ore-button>

<ore-command-palette id="palette" label="Command palette">
  <ore-command-palette-item value="new-file" group="File" shortcut="⌘+N">New File</ore-command-palette-item>
  <ore-command-palette-item value="open-file" group="File" shortcut="⌘+O">Open File…</ore-command-palette-item>
  <ore-command-palette-item value="save-file" group="File" shortcut="⌘+S">Save</ore-command-palette-item>
  <ore-command-palette-item value="toggle-theme" group="View" keywords="dark,light,appearance"
    >Toggle Theme</ore-command-palette-item
  >
  <ore-command-palette-item value="open-settings" group="View">Open Settings</ore-command-palette-item>
</ore-command-palette>

<script type="module">
  import '@vielzeug/refine/command-palette';
  import '@vielzeug/refine/button';

  const palette = document.getElementById('palette');

  document.getElementById('open-btn').addEventListener('click', () => {
    palette.setAttribute('open', '');
  });

  palette.addEventListener('select', (e) => {
    console.log('command selected:', e.detail.value);
  });
</script>
```

</ComponentPreview>

The global shortcut (`mod+k` by default — `⌘K` on macOS, `Ctrl+K` elsewhere) works as soon as the element is connected, independent of the `open` attribute; pressing it again while open closes the palette.

## Data-Driven Items

Pass the `items` property for programmatically generated commands instead of (or in addition to) slotted `ore-command-palette-item` elements. The `items` property always takes precedence over slotted items when both are present.

```html
<ore-command-palette id="palette" label="Jump to…"></ore-command-palette>

<script type="module">
  import '@vielzeug/refine/command-palette';

  document.getElementById('palette').items = [
    { value: 'dashboard', label: 'Go to Dashboard', group: 'Navigate' },
    { value: 'billing', label: 'Go to Billing', group: 'Navigate' },
    { value: 'invite', label: 'Invite Teammate', group: 'Actions', shortcut: '⌘+I' },
    { value: 'logout', label: 'Log Out', group: 'Actions', disabled: true },
  ];
</script>
```

## Groups and Icons

Items sharing a `group` value are clustered under a heading, in the order groups first appear. Add an `icon` (a [Lucide](https://lucide.dev) icon name) for a leading icon.

<ComponentPreview height="480px">

```html
<ore-command-palette id="grouped-palette" label="Command palette" open>
  <ore-command-palette-item value="new-file" group="File" icon="file-plus" shortcut="⌘+N"
    >New File</ore-command-palette-item
  >
  <ore-command-palette-item value="open-file" group="File" icon="folder-open" shortcut="⌘+O"
    >Open File…</ore-command-palette-item
  >
  <ore-command-palette-item value="find" group="Edit" icon="search" shortcut="⌘+F">Find</ore-command-palette-item>
  <ore-command-palette-item value="replace" group="Edit" icon="replace">Replace</ore-command-palette-item>
</ore-command-palette>

<script type="module">
  import '@vielzeug/refine/command-palette';
</script>
```

</ComponentPreview>

## Disabled Items

Set `disabled` on an item to keep it visible but skip it during keyboard navigation, typeahead-style filtering, and click selection.

```html
<ore-command-palette label="Command palette" open>
  <ore-command-palette-item value="export">Export Project</ore-command-palette-item>
  <ore-command-palette-item value="delete" disabled>Delete Project (no permission)</ore-command-palette-item>
</ore-command-palette>
```

## Keeping the Palette Open

By default, selecting an item closes the palette. Set `keep-open-on-select` for commands the user might invoke repeatedly (e.g. inserting several snippets in a row) — the search input is refocused after each selection.

```html
<ore-command-palette label="Insert snippet" keep-open-on-select open>
  <ore-command-palette-item value="snippet-1">Insert "Hello world"</ore-command-palette-item>
  <ore-command-palette-item value="snippet-2">Insert date stamp</ore-command-palette-item>
</ore-command-palette>
```

## Custom Shortcut, Filtering, and Empty State

Override the global shortcut with `shortcut`, or set it to an empty string to disable the built-in trigger entirely and open the palette from your own UI instead. Use `no-filter` when `items` is already filtered server-side, and `empty-text` to customize the no-results message.

```html
<ore-command-palette id="search-palette" label="Search" shortcut="mod+shift+p" empty-text="No commands match." loading>
</ore-command-palette>

<script type="module">
  import '@vielzeug/refine/command-palette';

  const palette = document.getElementById('search-palette');

  palette.addEventListener('search', async (e) => {
    palette.setAttribute('loading', '');
    palette.items = await fetchResults(e.detail.query);
    palette.removeAttribute('loading');
  });
</script>
```

Set `no-filter` on this pattern once results come back already scoped to the query — otherwise the built-in client-side filter runs again on top of the server response.

## Listening to Events

```html
<ore-command-palette id="palette" label="Command palette">
  <ore-command-palette-item value="new-file">New File</ore-command-palette-item>
  <ore-command-palette-item value="open-file">Open File…</ore-command-palette-item>
</ore-command-palette>

<script type="module">
  import '@vielzeug/refine/command-palette';

  const palette = document.getElementById('palette');

  // Fired when a command is chosen (click or Enter)
  palette.addEventListener('select', (e) => {
    console.log('selected:', e.detail.value, e.detail.label);
  });

  // Fired on every keystroke in the search input
  palette.addEventListener('search', (e) => {
    console.log('query:', e.detail.query);
  });

  palette.addEventListener('open', (e) => {
    console.log('opened via:', e.detail.reason); // 'keyboard', 'programmatic', or 'trigger'
  });

  palette.addEventListener('close', (e) => {
    console.log('closed via:', e.detail.reason); // 'escape', 'outsideClick', 'programmatic', or 'trigger'
  });
</script>
```

Use `value` in a single `select` listener to dispatch commands rather than wiring per-item click handlers.

## API Reference

**`ore-command-palette`** Attributes

| Attribute              | Type      | Default                        | Description                                                                                        |
| ---------------------- | --------- | ------------------------------- | --------------------------------------------------------------------------------------------------- |
| `open`                 | `boolean` | `false`                          | Controls whether the palette is visible                                                             |
| `label`                | `string`  | `'Command palette'`              | Accessible label for the dialog                                                                     |
| `placeholder`          | `string`  | `'Type a command or search…'`   | Placeholder text for the search input                                                               |
| `shortcut`             | `string`  | `'mod+k'`                        | Global keyboard shortcut ([keymap syntax](/keymap/usage.md)) that toggles the palette; `''` disables it |
| `no-filter`            | `boolean` | `false`                          | Disable built-in client-side filtering (for server-driven search)                                   |
| `loading`               | `boolean` | `false`                          | Shows a loading indicator next to the search input                                                  |
| `empty-text`           | `string`  | `'No results found.'`            | Message shown when no item matches the query                                                        |
| `keep-open-on-select`  | `boolean` | `false`                          | Keep the palette open after an item is selected, refocusing the search input                        |

**`ore-command-palette`** Properties

| Property | Type                        | Description                                                                     |
| -------- | --------------------------- | -------------------------------------------------------------------------------- |
| `items`  | `CommandPaletteItemInput[]` | JS-driven command list — takes precedence over slotted `ore-command-palette-item` elements |

**`ore-command-palette`** Slots

| Slot      | Description                                                          |
| --------- | ---------------------------------------------------------------------- |
| (default) | `ore-command-palette-item` elements (alternative/supplement to `items`) |

**`ore-command-palette-item`** Attributes

| Attribute  | Type      | Default | Description                                             |
| ---------- | --------- | ------- | -------------------------------------------------------- |
| `value`    | `string`  | `''`    | Value emitted by the `select` event and matched by search |
| `label`    | `string`  | —       | Explicit label text; falls back to the element's text content |
| `group`    | `string`  | —       | Group heading the item is clustered under                |
| `icon`     | `string`  | —       | Lucide icon name rendered at the start of the row         |
| `shortcut` | `string`  | —       | Display-only keyboard hint rendered at the end of the row — one `<kbd>` per key, separated with `+` (e.g. `"⌘+S"`) |
| `keywords` | `string`  | —       | Comma-separated extra search terms matched in addition to the label |
| `disabled` | `boolean` | `false` | Excludes the item from keyboard navigation and selection  |

**Events**

| Event    | Detail                                                                          | Description                                        |
| -------- | -------------------------------------------------------------------------------- | --------------------------------------------------- |
| `select` | `{ value: string, label: string, item: CommandPaletteItem }`                    | Emitted when a command is chosen (click or `Enter`) |
| `search` | `{ query: string }`                                                              | Emitted on every keystroke in the search input      |
| `open`   | `{ reason: 'keyboard' \| 'programmatic' \| 'trigger' }`                          | Emitted when the palette opens                      |
| `close`  | `{ reason: 'escape' \| 'outsideClick' \| 'programmatic' \| 'trigger' }`          | Emitted when the palette closes                     |

**CSS Custom Properties**

| Property                              | Description                | Default                |
| --------------------------------------- | --------------------------- | ------------------------ |
| `--command-palette-bg`                | Panel background color      | `var(--color-canvas)`  |
| `--command-palette-border-color`      | Panel border color          | Theme-dependent         |
| `--command-palette-radius`            | Panel border radius         | `var(--rounded-lg)`    |
| `--command-palette-shadow`            | Panel drop shadow           | `var(--shadow-2xl)`    |
| `--command-palette-max-width`         | Maximum panel width         | `40rem`                 |
| `--command-palette-backdrop`          | Backdrop overlay color      | Theme-dependent         |
| `--command-palette-option-hover-bg`   | Item background on hover    | Theme-dependent         |
| `--command-palette-option-focus-bg`   | Item background when keyboard-focused | Theme-dependent |

## Accessibility

The dialog panel follows the [WAI-ARIA Dialog (Modal) Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), built on the native `<dialog>` element: `Tab`/`Shift+Tab` trap focus inside the panel, `Escape` closes it, and focus returns to the triggering element on close. The `label` attribute becomes the dialog's `aria-label` — always set one, since the palette has no visible title.

The search input follows the collapsible listbox pattern: it carries `role="combobox"`, `aria-expanded="true"`, `aria-controls` pointing at the listbox, and a reactive `aria-activedescendant` that tracks the keyboard-focused row. The listbox itself has `role="listbox"`; each command row has `role="option"` with `aria-selected` reflecting keyboard focus and `aria-disabled` for disabled items. Group headings are `role="presentation"` decorative text, not part of the accessibility tree's option count.

`ArrowUp`/`ArrowDown` move focus through enabled items (wrapping at the ends); `Home`/`End` jump to the first/last enabled item; `Enter` selects the focused item — or the first result if none has been focused yet, so pressing `Enter` immediately after typing a query works as expected. Disabled items are skipped entirely by keyboard navigation. On open, the search input receives focus automatically; on close, the query resets so the next open starts from a clean slate.

Because the palette can be summoned from anywhere via its global keyboard shortcut, avoid relying on `shortcut` collisions with other page-level bindings — check for conflicts with [`findShortcutConflicts`](/keymap/api.md#findshortcutconflicts-shortcut-entries-options) if your app registers other global shortcuts.
