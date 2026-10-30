# Command Palette

A searchable, keyboard-driven list of commands presented in a centered modal: the "⌘K" pattern popularized by editors and productivity apps. Built on the native `<dialog>` element for focus trapping, top-layer stacking, and `Escape`-to-close, and on [`@vielzeug/keymap`](/keymap/) for the global shortcut that opens it from anywhere on the page.

This is a centered, global modal: not an anchored, inline dropdown. For a Slack/Notion-style `/`-triggered menu that pops up under the caret inside a [`ore-message-composer`](./message-composer.md), reach for [`ore-combobox`](./combobox.md) or [`ore-menu`](./menu.md) instead; keep `ore-command-palette` for a single, page-wide "jump to action" shortcut.

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

The global shortcut (`mod+k` by default: `⌘K` on macOS, `Ctrl+K` elsewhere) works as soon as the element is connected. Shortcut hints use [`ore-keyboard-key`](./keyboard-key.md), which is also available for settings screens and key-state displays. Use `open` as the controlled state and update it from `open-change`; use `default-open` only to initialize an uncontrolled palette.

## Data-Driven Items

Pass the `items` property for programmatically generated commands instead of (or in addition to) slotted `ore-command-palette-item` elements. The `items` property always takes precedence over slotted items when both are present.

<ComponentPreview height="480px">

```html
<ore-button id="open-btn">Open (⌘K / Ctrl+K)</ore-button>

<ore-command-palette id="palette" label="Jump to…"></ore-command-palette>

<script type="module">
  import '@vielzeug/refine/command-palette';
  import '@vielzeug/refine/button';

  const palette = document.getElementById('palette');

  document.getElementById('open-btn').addEventListener('click', () => {
    palette.setAttribute('open', '');
  });

  palette.items = [
    { value: 'dashboard', label: 'Go to Dashboard', group: 'Navigate' },
    { value: 'billing', label: 'Go to Billing', group: 'Navigate' },
    { value: 'invite', label: 'Invite Teammate', group: 'Actions', shortcut: '⌘+I' },
    { value: 'logout', label: 'Log Out', group: 'Actions', disabled: true },
  ];
</script>
```

</ComponentPreview>

## Groups and Icons

Items sharing a `group` value are clustered under a heading, in the order groups first appear. The heading stays pinned to the top of the list while its own group scrolls, and its name is searchable: typing a group name keeps that group's items and drops the rest. Add an `icon` (a [registered icon name](./icon.md)) for a leading icon.

Grouping is presentation only: every item stays visible in one list. To keep the list short instead, nest items into [drill-down categories](#drill-down-categories).

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

## Drill-down Categories

When a command set is too large for one list, nest items inside an item. The parent renders as a single category row: a chevron and a leaf count instead of a shortcut hint. `ArrowRight`, `Enter`, or a click opens it, showing only that category's commands; `ArrowLeft` (with an empty query), `Backspace`, `Escape`, or the back row returns to the root list. Categories nest one level: a command inside a category is always a leaf.

Search stays global from the root: a typed query flattens category leaves into one result list, so no command hides behind a category, and typing a category's name surfaces all of its commands. Inside an opened category, the query narrows that category's own children. Entering a category is navigation, never `select`: it emits `category-open` instead, so command handlers never see a category value.

<ComponentPreview height="480px">

```html
<ore-command-palette id="nested-palette" label="Command palette" open>
  <ore-command-palette-item value="cat-file" label="File" icon="folder">
    <ore-command-palette-item value="new-file" shortcut="⌘+N">New File</ore-command-palette-item>
    <ore-command-palette-item value="open-file" shortcut="⌘+O">Open File…</ore-command-palette-item>
    <ore-command-palette-item value="save-file" shortcut="⌘+S">Save</ore-command-palette-item>
  </ore-command-palette-item>
  <ore-command-palette-item value="cat-view" label="View" icon="eye">
    <ore-command-palette-item value="toggle-theme" keywords="dark,light">Toggle Theme</ore-command-palette-item>
    <ore-command-palette-item value="zoom-in">Zoom In</ore-command-palette-item>
  </ore-command-palette-item>
  <ore-command-palette-item value="help" shortcut="⌘+/">Help</ore-command-palette-item>
</ore-command-palette>

<script type="module">
  import '@vielzeug/refine/command-palette';
</script>
```

</ComponentPreview>

The same shape works data-driven: give an `items` entry a `children` array.

```js
palette.items = [
  {
    label: 'File',
    value: 'cat-file',
    children: [
      { label: 'New File', value: 'new-file' },
      { label: 'Open File', value: 'open-file' },
    ],
  },
  { label: 'Help', value: 'help' },
];
```

## Disabled Items

Set `disabled` on an item to keep it visible but skip it during keyboard navigation, typeahead-style filtering, and click selection.

<ComponentPreview height="480px">

```html
<ore-button id="open-btn">Open (⌘K / Ctrl+K)</ore-button>

<ore-command-palette id="palette" label="Command palette">
  <ore-command-palette-item value="export">Export Project</ore-command-palette-item>
  <ore-command-palette-item value="delete" disabled>Delete Project (no permission)</ore-command-palette-item>
</ore-command-palette>

<script type="module">
  import '@vielzeug/refine/command-palette';
  import '@vielzeug/refine/button';

  document.getElementById('open-btn').addEventListener('click', () => {
    document.getElementById('palette').setAttribute('open', '');
  });
</script>
```

</ComponentPreview>

## Keeping the Palette Open

By default, selecting an item closes the palette. Set `keep-open-on-select` for commands the user might invoke repeatedly (e.g. inserting several snippets in a row): the search input is refocused after each selection.

<ComponentPreview height="480px">

```html
<ore-button id="open-btn">Open (⌘K / Ctrl+K)</ore-button>

<ore-command-palette id="palette" label="Insert snippet" keep-open-on-select>
  <ore-command-palette-item value="snippet-1">Insert "Hello world"</ore-command-palette-item>
  <ore-command-palette-item value="snippet-2">Insert date stamp</ore-command-palette-item>
</ore-command-palette>

<script type="module">
  import '@vielzeug/refine/command-palette';
  import '@vielzeug/refine/button';

  document.getElementById('open-btn').addEventListener('click', () => {
    document.getElementById('palette').setAttribute('open', '');
  });
</script>
```

</ComponentPreview>

## Custom Shortcut, Filtering, and Empty State

Override the global shortcut with `shortcut`, or set it to an empty string to disable the built-in trigger entirely and open the palette from your own UI instead. Use `no-filter` when `items` is already filtered server-side, and `empty-text` to customize the no-results message.

As the query narrows, surviving rows slide from their old slot to their new one instead of snapping, so the focused command never jumps out of context. The reflow honors [Motion Mode](/refine/animation#motion-mode): it is skipped under reduced motion and can be forced on with `data-motion="full"`. The same helper is available for your own keyed lists: [`animateReflow`](/refine/animation#list-reflow-animatereflow).

<ComponentPreview height="480px">

```html
<ore-button id="open-btn">Open (Ctrl+Shift+P)</ore-button>

<ore-command-palette id="search-palette" label="Search" shortcut="mod+shift+p" empty-text="No commands match."></ore-command-palette>

<script type="module">
  import '@vielzeug/refine/command-palette';
  import '@vielzeug/refine/button';

  const palette = document.getElementById('search-palette');

  document.getElementById('open-btn').addEventListener('click', () => {
    palette.setAttribute('open', '');
  });

  palette.addEventListener('search', async (e) => {
    palette.setAttribute('loading', '');
    // Simulate async fetch
    await new Promise(r => setTimeout(r, 500));
    palette.items = [
      { value: 'cmd-1', label: 'Sample result for: ' + e.detail.query },
      { value: 'cmd-2', label: 'Another match for: ' + e.detail.query },
    ];
    palette.removeAttribute('loading');
  });
</script>
```

</ComponentPreview>

Set `no-filter` on this pattern once results come back already scoped to the query, otherwise the built-in client-side filter runs again on top of the server response.

## Settling the Search

Filtering normally runs on every keystroke, so a fast typist watches the list rebuild once per character: rows slide, counts change, and a `no-filter` consumer rebuilds its own catalogue each time. `search-debounce` holds typed text for the given number of milliseconds before it reaches the list and the `search` event, so a burst of keystrokes settles into one result set instead.

```html
<ore-command-palette label="Search" search-debounce="150"></ore-command-palette>
```

The input itself is never delayed: every character appears as it is typed, and the caret stays put. Two transitions ignore the window on purpose:

- `Enter` applies a query still inside the window before choosing, so the command committed is the best match for the text in the input rather than for whatever last settled. A click keeps the opposite contract: the row under the pointer is the row that was seen.
- Opening a category, stepping back, and closing cancel a pending query outright, because those views are not filtered by the text being typed. A cancelled query emits nothing, which keeps a `no-filter` consumer's mirrored search text in step with the cleared input.

Set it per consumer: server-driven search wants a window (it stops one request per keystroke), a large local catalogue wants one too (it stops one reflow per keystroke), and a small local list is better off instant. The default is `0`, which is the instant behavior.

## Previewing the Active Row

Put content in the `preview` slot to render a detail pane beside the command list: the pane opens automatically while the slot has content and folds away when the slot is empty, so a palette that never uses it keeps the plain single-column layout. Listen to `active-change` to keep the pane in step with the row the user points at: it fires whenever the focused row changes (keyboard, hover, typing, open, close), with `item: undefined` when no row is active. On narrow screens the pane drops below the list instead of sitting beside it.

<ComponentPreview height="480px">

```html
<ore-command-palette id="preview-palette" label="Command palette" open>
  <ore-command-palette-item value="keyword-focus" group="Keywords" icon="eye">Focus</ore-command-palette-item>
  <ore-command-palette-item value="keyword-range" group="Keywords" icon="ruler">Range</ore-command-palette-item>
  <ore-command-palette-item value="keyword-cover" group="Keywords" icon="shield">Cover</ore-command-palette-item>
  <div slot="preview" id="preview-pane" style="display: flex; flex-direction: column; gap: 0.5rem">
    <strong id="preview-title"></strong>
    <span id="preview-body" style="color: var(--color-contrast-600)"></span>
  </div>
</ore-command-palette>

<script type="module">
  import '@vielzeug/refine/command-palette';

  const entries = {
    'keyword-focus': 'A hunter may spend an action to steady themselves, drawing the card that answers what comes next.',
    'keyword-range': 'Measured in sectors from the attacker: a target outside the printed range cannot be attacked.',
    'keyword-cover': 'Figures behind cover are harder to hit: the attacker must spend extra range to aim around it.',
  };

  const palette = document.getElementById('preview-palette');

  palette.addEventListener('active-change', (e) => {
    const text = entries[e.detail.value];
    document.getElementById('preview-title').textContent = e.detail.label;
    document.getElementById('preview-body').textContent = text ?? 'No entry for this command.';
  });
</script>
```

</ComponentPreview>

The slot is plain light DOM: the palette only owns where and when it renders, so the pane can hold any markup or components the host app already uses. Pair it with `no-filter` when the catalogue is app-ranked: the preview then explains the app's own ranking as the user arrows through the hits.

## Listening to Events

<ComponentPreview height="480px" vertical>

```html
<ore-button id="open-btn">Open (⌘K / Ctrl+K)</ore-button>

<ore-command-palette id="palette" label="Command palette">
  <ore-command-palette-item value="new-file">New File</ore-command-palette-item>
  <ore-command-palette-item value="open-file">Open File…</ore-command-palette-item>
</ore-command-palette>

<ore-box id="log" style="margin-top: 1rem; font-family: monospace; font-size: 0.875rem; max-height: 200px; overflow-y: auto;"></ore-box>

<script type="module">
  import '@vielzeug/refine/command-palette';
  import '@vielzeug/refine/button';

  const palette = document.getElementById('palette');
  const log = document.getElementById('log');

  document.getElementById('open-btn').addEventListener('click', () => {
    palette.setAttribute('open', '');
  });

  palette.addEventListener('select', (e) => {
    const msg = `Selected: ${e.detail.value} (${e.detail.label})`;
    console.log(msg);
    log.innerHTML += msg + '<br/>';
  });

  palette.addEventListener('search', (e) => {
    console.log('search:', e.detail.query);
  });

  palette.addEventListener('open-change', (e) => {
    console.log('open:', e.detail.open);
  });
</script>
```

</ComponentPreview>

Use `value` in a single `select` listener to dispatch commands rather than wiring per-item click handlers.

## API Reference

**`ore-command-palette`** Attributes

| Attribute              | Type      | Default                        | Description                                                                                        |
| ---------------------- | --------- | ------------------------------- | --------------------------------------------------------------------------------------------------- |
| `open`                 | `boolean` | N/A | Controlled visibility                                                                               |
| `default-open`         | `boolean` | `false`                          | Initial visibility when `open` is not provided                                                      |
| `backdrop`             | `'opaque' \| 'blur' \| 'transparent'` | `'opaque'`          | Backdrop style: dimming veil only (default), veil + blur, or no overlay                        |
| `back-text`            | `string`  | `'All commands'`               | Label of the back row shown above an opened category                                              |
| `label`                | `string`  | `'Command palette'`              | Accessible label for the dialog                                                                     |
| `placeholder`          | `string`  | `'Type a command or search…'`   | Placeholder text for the search input                                                               |
| `shortcut`             | `string`  | `'mod+k'`                        | Global keyboard shortcut ([keymap syntax](/keymap/usage.md)) that toggles the palette; `''` disables it |
| `no-filter`            | `boolean` | `false`                          | Disable built-in client-side filtering (for server-driven search)                                   |
| `loading`               | `boolean` | `false`                          | Shows a loading indicator next to the search input                                                  |
| `empty-text`           | `string`  | `'No results found.'`            | Message shown when no item matches the query                                                        |
| `keep-open-on-select`  | `boolean` | `false`                          | Keep the palette open after an item is selected, refocusing the search input                        |
| `search-debounce`      | `number`  | `0`                              | Milliseconds typed text waits before filtering the list and emitting `search`; `0` filters on every keystroke |

**`ore-command-palette`** Properties

| Property | Type                        | Description                                                                     |
| -------- | --------------------------- | -------------------------------------------------------------------------------- |
| `items`  | `CommandPaletteItemInput[]` | JS-driven command list: takes precedence over slotted `ore-command-palette-item` elements |

**`ore-command-palette`** Slots

| Slot      | Description                                                          |
| --------- | ---------------------------------------------------------------------- |
| (default) | `ore-command-palette-item` elements (alternative/supplement to `items`) |
| `preview` | Optional detail pane rendered beside the list while the slot has content; pair with `active-change` |

**`ore-command-palette-item`** Attributes

| Attribute  | Type      | Default | Description                                             |
| ---------- | --------- | ------- | -------------------------------------------------------- |
| `value`    | `string`  | `''`    | Value emitted by the `select` event and matched by search |
| `label`    | `string`  | N/A | Explicit label text; falls back to the element's text content |
| `group`    | `string`  | N/A | Group heading the item is clustered under; the name is also matched by search |
| `icon`     | `string`  | N/A | Lucide icon name rendered at the start of the row         |
| `shortcut` | `string`  | N/A | Display-only keyboard hint rendered at the end of the row: one `<kbd>` per key, separated with `+` (e.g. `"⌘+S"`). A literal `+` key isn't representable this way: spell it out (e.g. `"Ctrl+Plus"`) |
| `keywords` | `string`  | N/A | Comma-separated extra search terms matched in addition to the label |
| `disabled` | `boolean` | `false` | Excludes the item from keyboard navigation and selection  |

An item that contains nested `<ore-command-palette-item>` elements (or, data-driven, a `children` array) becomes a category row that opens on `ArrowRight`/`Enter`/click instead of selecting. Nesting is one level only: a nested item's own children are ignored with a development warning.

**Events**

| Event    | Detail                                                                          | Description                                        |
| -------- | -------------------------------------------------------------------------------- | --------------------------------------------------- |
| `select` | `{ value: string, label: string, item: CommandPaletteItem }`                    | Emitted when a command is chosen (click or `Enter`) |
| `category-open` | `{ value: string, label: string, count: number }`                   | Emitted when a category row is opened; `select` never carries a category value |
| `active-change` | `{ value: string, label: string, item?: CommandPaletteItem }`          | Emitted when the focused row changes; `item` is `undefined` when no row is active |
| `search` | `{ query: string }`                                                              | Emitted when the query reaches the list: every keystroke, or after `search-debounce` settles it. Also when a drill-in or back step clears a typed query |
| `open-change` | `{ open: boolean, reason: string }`                                         | Emitted whenever the palette opens or closes        |

**CSS Custom Properties**

| Property                              | Description                | Default                |
| --------------------------------------- | --------------------------- | ------------------------ |
| `--command-palette-bg`                | Panel background color      | `var(--color-canvas)`  |
| `--command-palette-border-color`      | Panel border color          | Theme-dependent         |
| `--command-palette-radius`            | Panel border radius         | `var(--rounded-lg)`    |
| `--command-palette-shadow`            | Panel drop shadow           | `var(--shadow-2xl)`    |
| `--command-palette-max-width`         | Maximum panel width         | `40rem`                 |
| `--command-palette-backdrop-bg`       | Backdrop veil color         | `var(--overlay-veil)`     |
| `--command-palette-option-hover-bg`   | Item background on hover    | Theme-dependent         |
| `--command-palette-option-focus-bg`   | Item background when keyboard-focused | Theme-dependent |
| `--command-palette-group-sticky-bg`   | Background of the pinned group heading while it sticks | Theme-dependent |
| `--command-palette-preview-width`     | Preview pane width (when the `preview` slot has content) | `18rem` |

## Accessibility

The dialog panel follows the [WAI-ARIA Dialog (Modal) Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), built on the native `<dialog>` element: `Tab`/`Shift+Tab` trap focus inside the panel, `Escape` closes it, and focus returns to the triggering element on close. The `label` attribute becomes the dialog's `aria-label`: always set one, since the palette has no visible title.

The search input follows the collapsible listbox pattern: it carries `role="combobox"`, `aria-expanded="true"`, `aria-controls` pointing at the listbox, and a reactive `aria-activedescendant` that tracks the keyboard-focused row. The listbox itself has `role="listbox"`; each command row has `role="option"` with `aria-selected` reflecting keyboard focus and `aria-disabled` for disabled items. Each named group is a `role="group"` container labelled by its heading via `aria-labelledby`, so screen readers announce the section a row belongs to; the heading text itself is `role="presentation"` to avoid double-speaking, and ungrouped items render directly in the listbox without a wrapper.

`ArrowUp`/`ArrowDown` move focus through enabled items (wrapping at the ends); `Home`/`End` jump to the first/last enabled item; `Enter` selects the focused item, or the first result if none has been focused yet, so pressing `Enter` immediately after typing a query works as expected. Disabled items are skipped entirely by keyboard navigation. On open, the search input receives focus automatically; on close, the query and any opened category reset so the next open starts from a clean slate.

A category row is an ordinary `role="option"`: its openable-ness is carried by the visible chevron and leaf count, which put "opens a list" into the accessible name rather than into ARIA state that a listbox option has no defined meaning for. Inside a category, the listbox's `aria-label` names the category, so the change of scope is announced. The back row is a real `<button>` above the listbox rather than a row inside it: pointer and `Tab` users get a visible way back without the listbox gaining a non-option child, and focus returns to the search input when it is used. `ArrowRight` opens the focused category; `ArrowLeft` and `Backspace` step out only while the query is empty, so editing the query keeps normal caret behavior; `Escape` steps out first and closes the palette only once the root list is showing.

Because the palette can be summoned from anywhere via its global keyboard shortcut, avoid relying on `shortcut` collisions with other page-level bindings: check for conflicts with [`findShortcutConflicts`](/keymap/api.md#findshortcutconflicts-shortcut-entries-options) if your app registers other global shortcuts.
