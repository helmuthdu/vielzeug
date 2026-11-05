# Menu

An action dropdown triggered by any slotted element. Presents a list of `ore-menu-item` actions in a floating panel using viewport-aware positioning. Supports full keyboard navigation and accessibility semantics.

## Placement

Control which side of the trigger the panel opens on. The menu automatically flips to avoid viewport clipping.

<ComponentPreview height="400px">

```html
<ore-menu placement="bottom-start">
  <ore-button slot="trigger" variant="outline" size="sm">
    Bottom Start
    <ore-icon name="arrow-down-left" size="16"></ore-icon>
  </ore-button>
  <ore-menu-item value="a">Option A</ore-menu-item>
  <ore-menu-item value="b">Option B</ore-menu-item>
</ore-menu>

<ore-menu placement="bottom-end">
  <ore-button slot="trigger" variant="outline" size="sm">
    Bottom End
    <ore-icon name="arrow-down-right" size="16"></ore-icon>
  </ore-button>
  <ore-menu-item value="a">Option A</ore-menu-item>
  <ore-menu-item value="b">Option B</ore-menu-item>
</ore-menu>

<ore-menu placement="top-start">
  <ore-button slot="trigger" variant="outline" size="sm">
    Top Start
    <ore-icon name="arrow-up-left" size="16"></ore-icon>
  </ore-button>
  <ore-menu-item value="a">Option A</ore-menu-item>
  <ore-menu-item value="b">Option B</ore-menu-item>
</ore-menu>
```

</ComponentPreview>

## Items with Icons

Use the `icon` named slot on each `ore-menu-item` for leading icons.

::: tip Icons
These examples use `ore-icon` with names from the shared icon registry. The docs preview registers the full Lucide set so every name resolves; an app registers its own icons first, as described in the [icon guide](./icon.md).
:::

<ComponentPreview align="start" justify="start" height="400px" vertical>

```html
<ore-menu>
  <ore-button slot="trigger">File</ore-button>
  <ore-menu-item value="new">
    <ore-icon slot="icon" name="file" size="18"></ore-icon>
    New File
  </ore-menu-item>
  <ore-menu-item value="open">
    <ore-icon slot="icon" name="folder" size="18"></ore-icon>
    Open…
  </ore-menu-item>
  <ore-menu-item value="save">
    <ore-icon slot="icon" name="save" size="18"></ore-icon>
    Save
  </ore-menu-item>
  <ore-menu-item value="delete" disabled>
    <ore-icon slot="icon" name="trash-2" size="18"></ore-icon>
    Delete (disabled)
  </ore-menu-item>
</ore-menu>
```

</ComponentPreview>

## Disabled Items

Set `disabled` on a `ore-menu-item` to prevent selection. The item is still visible but non-interactive. Use `disabled` for permissions that might change rather than removing the item entirely, to signal that the action exists but is unavailable.

<ComponentPreview align="start" justify="start" height="400px" vertical>

```html
<ore-menu>
  <ore-button slot="trigger" variant="flat">More options</ore-button>
  <ore-menu-item value="view">View details</ore-menu-item>
  <ore-menu-item value="export">Export</ore-menu-item>
  <ore-menu-item value="archive" disabled>Archive (no permission)</ore-menu-item>
  <ore-menu-item value="delete" disabled>Delete (no permission)</ore-menu-item>
</ore-menu>
```

</ComponentPreview>

## Disabled Menu

Set `disabled` on the `ore-menu` element to prevent the panel from opening at all.

<ComponentPreview align="start" justify="start" height="400px" vertical>

```html
<ore-menu disabled>
  <ore-button slot="trigger" disabled>Disabled menu</ore-button>
  <ore-menu-item value="a">Option A</ore-menu-item>
</ore-menu>
```

</ComponentPreview>

## Trigger with an Icon Button

Any element works as the trigger: including icon-only buttons. Always provide a visible label or `aria-label` on an icon-only trigger button so the purpose is clear to screen reader users.

<ComponentPreview align="start" justify="start" height="400px" vertical>

```html
<ore-menu>
  <ore-button slot="trigger" variant="ghost" size="sm" aria-label="More options">
    <ore-icon name="ellipsis" size="18"></ore-icon>
  </ore-button>
  <ore-menu-item value="edit">Edit</ore-menu-item>
  <ore-menu-item value="copy">Copy link</ore-menu-item>
  <ore-menu-item value="report">Report</ore-menu-item>
</ore-menu>
```

</ComponentPreview>

## Context Menu

Set `trigger="contextmenu"` to turn any element into a right-click (or long-press) target. The panel opens at the pointer instead of anchored to the trigger, and a left-click passes through to the page untouched.

<ComponentPreview align="start" justify="start" height="400px" vertical>

```html
<ore-menu trigger="contextmenu">
  <p slot="trigger" style="padding: 1rem; border: 1px dashed var(--color-divider)">
    Right-click this area
  </p>
  <ore-menu-item value="copy">Copy</ore-menu-item>
  <ore-menu-item value="cut">Cut</ore-menu-item>
  <ore-menu-item value="paste">Paste</ore-menu-item>
</ore-menu>
```

</ComponentPreview>

Keyboard users still get the menu: `Enter`, `Space`, or `ArrowDown` on a focused trigger opens it anchored to the trigger element, exactly as in `click` mode.

## Submenus

Slot `ore-menu-item` elements into another item's `submenu` slot to turn it into a submenu trigger. The trigger grows a trailing chevron and flies out a nested panel on hover, `ArrowRight`, `Enter`, `Space`, or a click. Submenus nest to any depth — a submenu item can itself carry a `submenu` slot.

<ComponentPreview align="start" justify="start" height="400px" vertical>

```html
<ore-menu>
  <ore-button slot="trigger">File</ore-button>
  <ore-menu-item value="new">New</ore-menu-item>
  <ore-menu-item>
    Open Recent
    <ore-menu-item slot="submenu" value="report">report.pdf</ore-menu-item>
    <ore-menu-item slot="submenu" value="notes">notes.md</ore-menu-item>
    <ore-menu-item slot="submenu">
      More
      <ore-menu-item slot="submenu" value="archive">archive.zip</ore-menu-item>
    </ore-menu-item>
  </ore-menu-item>
  <ore-menu-item value="close">Close</ore-menu-item>
</ore-menu>
```

</ComponentPreview>

A submenu trigger is deliberately **not selectable**: it emits no `select` and carries no `value`, because its press opens the flyout rather than choosing an action. Its children stay out of the parent's arrow navigation, so the parent's rows always match what the pointer sees. Only one submenu in a sibling group stays open at a time — opening another closes its siblings, while ancestors stay open, matching native menus. Selecting a leaf closes the whole chain.

Keyboard model:

- `ArrowRight` / `Enter` / `Space` on a trigger opens its flyout and moves focus into it.
- `ArrowDown` / `ArrowUp` walk the open flyout's items.
- `Escape` / `ArrowLeft` close the flyout and hand focus back to the trigger.
- A hover dwell of ~120 ms opens a flyout as the pointer crosses a row; a ~300 ms grace keeps it open while the pointer crosses the gap into the flyout.

Checkable items work inside a flyout, and radio groups scope to their own panel — a submenu's radios are a separate group from the root menu's.

## Separator

Use `ore-menu-separator` to add a horizontal divider between groups of related items.

<ComponentPreview align="start" justify="start" height="400px" vertical>

```html
<ore-menu>
  <ore-button slot="trigger">File</ore-button>
  <ore-menu-item value="new">New File</ore-menu-item>
  <ore-menu-item value="open">Open…</ore-menu-item>
  <ore-menu-separator></ore-menu-separator>
  <ore-menu-item value="save">Save</ore-menu-item>
  <ore-menu-item value="save-as">Save As…</ore-menu-item>
  <ore-menu-separator></ore-menu-separator>
  <ore-menu-item value="delete" disabled>Delete</ore-menu-item>
</ore-menu>
```

</ComponentPreview>

## Grid Layout

Set `layout="grid"` to turn the panel into a grid of cards: icon above a centered, two-line-clamped label, equal columns, no scroller to fight. This suits a small, complete action set (three to six verbs a thumb should see at once). For longer lists, keep the default `list` layout. Use `columns` to set the row size (default 3); `ore-menu-separator` still works and spans the full width between clusters. The `columns` prop owns the column count outright: the panel's grid tracks and the arrow-key rows always read the same number.

<ComponentPreview align="start" justify="start" height="400px" vertical>

```html
<ore-menu layout="grid">
  <ore-button slot="trigger">Actions</ore-button>
  <ore-menu-item value="forge">
    <ore-icon slot="icon" name="hammer" size="18"></ore-icon>
    Open Forge
  </ore-menu-item>
  <ore-menu-item value="decks">
    <ore-icon slot="icon" name="layers" size="18"></ore-icon>
    Edit decks
  </ore-menu-item>
  <ore-menu-item value="share">
    <ore-icon slot="icon" name="share-2" size="18"></ore-icon>
    Share build
  </ore-menu-item>
  <ore-menu-separator></ore-menu-separator>
  <ore-menu-item value="export">
    <ore-icon slot="icon" name="download" size="18"></ore-icon>
    Export
  </ore-menu-item>
  <ore-menu-item value="delete" disabled>
    <ore-icon slot="icon" name="trash-2" size="18"></ore-icon>
    Delete
  </ore-menu-item>
</ore-menu>
```

</ComponentPreview>

Keyboard navigation follows the grid: `ArrowLeft` / `ArrowRight` step one card, `ArrowUp` / `ArrowDown` step one row, `Home` / `End` jump to the ends. Disabled cards are still stepped over (skipping them would desync the arrows from the visible rows) but never activated.

## Checkable Items

### Checkbox Items

Set `type="checkbox"` on a `ore-menu-item` to make it toggleable. Clicking or pressing `Enter`/`Space` toggles the `checked` attribute and emits `select` with `checked` in the event detail. The menu stays open when a checkbox item is activated.

<ComponentPreview align="start" justify="start" height="400px" vertical>

```html
<ore-menu id="view-menu">
  <ore-button slot="trigger">View</ore-button>
  <ore-menu-item value="sidebar" type="checkbox" checked>Show Sidebar</ore-menu-item>
  <ore-menu-item value="toolbar" type="checkbox">Show Toolbar</ore-menu-item>
  <ore-menu-item value="statusbar" type="checkbox" checked>Show Status Bar</ore-menu-item>
</ore-menu>

<script>
  document.getElementById('view-menu').addEventListener('select', (e) => {
    console.log(e.detail.value, 'checked:', e.detail.checked);
  });
</script>
```

</ComponentPreview>

### Radio Items

Set `type="radio"` to create a group where only one item can be checked at a time. Selecting a radio item automatically unchecks all other `type="radio"` siblings.

<ComponentPreview align="start" justify="start" height="400px" vertical>

```html
<ore-menu id="sort-menu">
  <ore-button slot="trigger">Sort By</ore-button>
  <ore-menu-item value="name" type="radio" checked>Name</ore-menu-item>
  <ore-menu-item value="date" type="radio">Date Modified</ore-menu-item>
  <ore-menu-item value="size" type="radio">File Size</ore-menu-item>
</ore-menu>
```

</ComponentPreview>

## Listening to Events

```html
<ore-menu id="action-menu">
  <ore-button slot="trigger">Actions</ore-button>
  <ore-menu-item value="rename">Rename</ore-menu-item>
  <ore-menu-item value="move">Move to folder</ore-menu-item>
  <ore-menu-item value="delete">Delete</ore-menu-item>
</ore-menu>

<script type="module">
  import '@vielzeug/refine/menu';
  import '@vielzeug/refine/button';

  const menu = document.getElementById('action-menu');

  // Fired when a menu item is selected
  menu.addEventListener('select', (e) => {
    console.log('selected:', e.detail.value, 'checked:', e.detail.checked);
    switch (e.detail.value) {
      case 'rename':
        openRenameDialog();
        break;
      case 'move':
        openMoveDialog();
        break;
      case 'delete':
        confirmDelete();
        break;
    }
  });

  menu.addEventListener('open-change', (e) => {
    console.log('menu open:', e.detail.open, e.detail.reason);
  });
</script>
```

Use `value` on each item to handle selection in a single `select` listener rather than per-item click handlers. Keep menu items short and action-oriented (verb + noun: "Edit post", "Delete file").

## API Reference

**`ore-menu`** Attributes

| Attribute      | Type                                                                              | Default          | Description                                                                 |
| -------------- | --------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------- |
| `placement`    | `'bottom' \| 'bottom-start' \| 'bottom-end' \| 'top' \| 'top-start' \| 'top-end'` | `'bottom-start'` | Preferred panel placement (auto-flips near viewport edges)                  |
| `color`        | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'`         | N/A              | Color theme                                                                 |
| `size`         | `'sm' \| 'md' \| 'lg'`                                                            | `'md'`           | Size theme                                                                  |
| `disabled`     | `boolean`                                                                         | `false`          | Prevent the menu from opening                                               |
| `open`         | `boolean`                                                                         | N/A              | Controlled panel visibility                                                 |
| `default-open` | `boolean`                                                                         | `false`          | Initial visibility when `open` is not provided                              |
| `layout`       | `'list' \| 'grid'`                                                                | `'list'`         | Panel layout: rows or a grid of cards                                       |
| `columns`      | `number`                                                                          | `3`              | Cards per row in `grid` layout; sets both the tracks and the arrow-key rows |
| `trigger`      | `'click' \| 'contextmenu'`                                                        | `'click'`        | How the menu opens: a left-click, or right-click / long-press at the pointer |

**`ore-menu`** Slots

| Slot      | Description                                         |
| --------- | --------------------------------------------------- |
| `trigger` | The element that opens/closes the menu panel        |
| (default) | `ore-menu-item` elements to display as menu options |

**`ore-menu-item`** Attributes

| Attribute  | Type                    | Default | Description                                                  |
| ---------- | ----------------------- | ------- | ------------------------------------------------------------ |
| `value`    | `string`                | `''`    | Value emitted in the `select` event detail                   |
| `type`     | `'checkbox' \| 'radio'` | N/A     | Makes the item checkable; radio items are mutually exclusive |
| `checked`  | `boolean`               | `false` | Whether a checkable item is currently checked                |
| `disabled` | `boolean`               | `false` | Prevent the item from being selected                         |

**`ore-menu-item`** Slots

| Slot      | Description                         |
| --------- | ----------------------------------- |
| `icon`    | Optional leading icon or decoration |
| `submenu` | Nested `ore-menu-item` elements that turn this item into a submenu trigger |
| (default) | Item label text                     |

**Events**

| Event         | Detail                                 | Description                                                                                                  |
| ------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `select`      | `{ value: string, checked?: boolean }` | Emitted when a menu item is selected. `checked` is present for `type="checkbox"` and `type="radio"` items    |
| `open-change` | `{ open: boolean, reason: string }`    | Emitted whenever the panel opens or closes. Opening reports `reason: "click"`, `"contextmenu"`, `"keyboard"`, or `"programmatic"`; closing after a plain item is chosen reports `reason: "select"`. |

**CSS Custom Properties (`ore-menu`)**

| Property                        | Description                                      | Default                                   |
| ------------------------------- | ------------------------------------------------ | ----------------------------------------- |
| `--menu-panel-min-width`        | Minimum width of the panel                       | `10rem`                                   |
| `--menu-panel-radius`           | Border radius of the panel                       | `var(--rounded-lg)`                       |
| `--menu-panel-shadow`           | Box shadow of the panel                          | `var(--shadow-xl)`                        |
| `--menu-panel-bg`               | Panel background surface                         | Theme-dependent                           |
| `--menu-panel-color`            | Panel foreground and unchecked indicator color   | Theme-dependent                           |
| `--menu-panel-border-color`     | Panel border color                               | Theme-dependent                           |
| `--menu-panel-blur`             | Panel backdrop blur amount                       | `var(--blur-md)`                          |
| `--menu-panel-padding`          | Panel padding                                    | `var(--size-1)`                           |
| `--menu-panel-width`            | Panel width in `grid` layout                     | `min(21rem, calc(100vw - var(--size-4)))` |
| `--menu-panel-gap`              | Gap between grid cards                           | `var(--size-1-5)`                         |
| `--menu-item-card-min-height`   | Grid card height floor                           | `var(--size-20)`                          |
| `--menu-item-card-border-color` | Grid card border color                           | `var(--color-divider)`                    |
| `--menu-item-card-radius`       | Grid card corner radius                          | `var(--rounded-md)`                       |
| `--menu-item-card-icon-size`    | Icon size inside a grid card (`--ore-icon-size`) | `var(--size-5)`                           |
| `--menu-item-hover-bg`          | Item background on hover                         | Theme-dependent                           |
| `--menu-item-focus-color`       | Item text color when keyboard-focused            | Theme-dependent                           |
| `--menu-item-focus-bg`          | Item background when keyboard-focused            | Theme-dependent                           |
| `--menu-item-selection-bg`      | Background for checkbox/radio items (unselected) | Theme-dependent                           |
| `--menu-item-checked-color`     | Item text color when checked                     | Theme-dependent                           |
| `--menu-item-checked-bg`        | Item background when checked                     | Theme-dependent                           |

## Accessibility

The menu component follows WAI-ARIA Menu Button Pattern best practices.

Arrow keys move focus between items; `Enter` / `Space` activates the focused item; `Escape` closes the panel and returns focus to the trigger. `Home` / `End` jump to the first or last item. Opening with `Enter`, `Space`, or `ArrowDown` moves focus to the first usable item. Outside clicks and `Tab` also close the menu and restore focus to the trigger. In `grid` layout the arrow keys follow the two-dimensional layout instead: left/right step one card, up/down step one row.

The panel has `role="menu"` and `aria-orientation="vertical"`. The trigger element receives `aria-haspopup="menu"`, `aria-expanded`, and `aria-controls` pointing to the menu panel. Each item has `role="menuitem"` and `aria-disabled` when disabled. Checkable items automatically switch to `role="menuitemcheckbox"` or `role="menuitemradio"` with the appropriate `aria-checked` value.

A submenu trigger also reports `aria-haspopup="menu"` and `aria-expanded`, and its flyout is a nested `role="menu"`. Because the trigger opens a flyout instead of choosing an action, it stays a plain `role="menuitem"` with no `value`, so assistive technology never announces it as selectable.

A `trigger="contextmenu"` menu suppresses the browser's native context menu on its trigger. Because a right-click is pointer-only, keep the same actions reachable by keyboard: the trigger still opens the menu with `Enter` / `Space` / `ArrowDown`, so give it focus (a focusable element, not a bare `<p>`) when the menu is the primary way to reach those actions.
