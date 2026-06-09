# Menu

An action dropdown triggered by any slotted element. Presents a list of `sg-menu-item` actions in a floating panel using viewport-aware positioning. Supports full keyboard navigation and accessibility semantics.

## Features

- <sg-icon name="crosshair" size="16"></sg-icon> **Any trigger**: use any element in the `trigger` slot — button, icon, link
- <sg-icon name="keyboard" size="16"></sg-icon> **Full Keyboard Nav**: ArrowDown/Up, Enter/Space, Escape, Tab, Home/End
- <sg-icon name="map-pin" size="16"></sg-icon> **Auto-positioning**: uses `@vielzeug/orbit` to flip when near viewport edges
- <sg-icon name="bell-off" size="16"></sg-icon> **Outside-click close**: dismiss by clicking anywhere outside
- <sg-icon name="minus" size="16"></sg-icon> **Separator**: `sg-menu-separator` renders a visual divider between groups of items
- <sg-icon name="circle-check" size="16"></sg-icon> **Checkable Items**: `sg-menu-item` supports `type="checkbox"` and `type="radio"` for toggleable selections
- <sg-icon name="hand" size="16"></sg-icon> **Disabled items**: individual `sg-menu-item` items can be disabled
- <sg-icon name="puzzle" size="16"></sg-icon> **Icon slot**: each item supports a leading `icon` slot
- <sg-icon name="palette" size="16"></sg-icon> **Color Themes**: primary, secondary, info, success, warning, error
- <sg-icon name="ruler" size="16"></sg-icon> **3 Sizes**: sm, md, lg
- <sg-icon name="accessibility" size="16"></sg-icon> **ARIA**: `role="menu"`, `role="menuitem"`, `aria-expanded`, `aria-haspopup="menu"`, `aria-controls`

## Source Code

::: details View Source Code
<<< @/../packages/sigil/src/overlay/menu/menu.ts
:::

## Basic Usage

Place your trigger element in the `trigger` slot and add `sg-menu-item` children.

```html
<sg-menu>
  <sg-button slot="trigger">Actions</sg-button>
  <sg-menu-item value="edit">Edit</sg-menu-item>
  <sg-menu-item value="duplicate">Duplicate</sg-menu-item>
  <sg-menu-item value="delete">Delete</sg-menu-item>
</sg-menu>
```

## Placement

Control which side of the trigger the panel opens on. The menu automatically flips to avoid viewport clipping.

<ComponentPreview center>

```html
<sg-menu placement="bottom-start">
  <sg-button slot="trigger" variant="outline" size="sm">Bottom Start <sg-icon name="arrow-down-left" size="16"></sg-icon></sg-button>
  <sg-menu-item value="a">Option A</sg-menu-item>
  <sg-menu-item value="b">Option B</sg-menu-item>
</sg-menu>

<sg-menu placement="bottom-end">
  <sg-button slot="trigger" variant="outline" size="sm">Bottom End <sg-icon name="arrow-down-right" size="16"></sg-icon></sg-button>
  <sg-menu-item value="a">Option A</sg-menu-item>
  <sg-menu-item value="b">Option B</sg-menu-item>
</sg-menu>

<sg-menu placement="top-start">
  <sg-button slot="trigger" variant="outline" size="sm">Top Start <sg-icon name="arrow-up-left" size="16"></sg-icon></sg-button>
  <sg-menu-item value="a">Option A</sg-menu-item>
  <sg-menu-item value="b">Option B</sg-menu-item>
</sg-menu>
```

</ComponentPreview>

## Items with Icons

Use the `icon` named slot on each `sg-menu-item` for leading icons.

::: tip Icons
These examples use inline SVG slot content so they stay framework and icon-library agnostic.
:::

<ComponentPreview vertical>

```html
<sg-menu>
  <sg-button slot="trigger">File</sg-button>
  <sg-menu-item value="new">
    <sg-icon slot="icon" name="file" size="18"></sg-icon>
    New File
  </sg-menu-item>
  <sg-menu-item value="open">
    <sg-icon slot="icon" name="folder" size="18"></sg-icon>
    Open…
  </sg-menu-item>
  <sg-menu-item value="save">
    <sg-icon slot="icon" name="save" size="18"></sg-icon>
    Save
  </sg-menu-item>
  <sg-menu-item value="delete" disabled>
    <sg-icon slot="icon" name="trash-2" size="18"></sg-icon>
    Delete (disabled)
  </sg-menu-item>
</sg-menu>
```

</ComponentPreview>

## Disabled Items

Set `disabled` on a `sg-menu-item` to prevent selection. The item is still visible but non-interactive.

<ComponentPreview vertical>

```html
<sg-menu>
  <sg-button slot="trigger" variant="flat">More options</sg-button>
  <sg-menu-item value="view">View details</sg-menu-item>
  <sg-menu-item value="export">Export</sg-menu-item>
  <sg-menu-item value="archive" disabled>Archive (no permission)</sg-menu-item>
  <sg-menu-item value="delete" disabled>Delete (no permission)</sg-menu-item>
</sg-menu>
```

</ComponentPreview>

## Disabled Menu

Set `disabled` on the `sg-menu` element to prevent the panel from opening at all.

<ComponentPreview center>

```html
<sg-menu disabled>
  <sg-button slot="trigger" disabled>Disabled menu</sg-button>
  <sg-menu-item value="a">Option A</sg-menu-item>
</sg-menu>
```

</ComponentPreview>

## Listening to Events

```html
<sg-menu id="action-menu">
  <sg-button slot="trigger">Actions</sg-button>
  <sg-menu-item value="rename">Rename</sg-menu-item>
  <sg-menu-item value="move">Move to folder</sg-menu-item>
  <sg-menu-item value="delete">Delete</sg-menu-item>
</sg-menu>

<script type="module">
  import '@vielzeug/sigil/menu';
  import '@vielzeug/sigil/button';

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

  // Fired when the panel opens
  menu.addEventListener('open', (e) => {
    console.log('menu opened via:', e.detail.reason); // 'programmatic' or 'trigger'
  });

  // Fired when the panel closes
  menu.addEventListener('close', (e) => {
    console.log('menu closed via:', e.detail.reason); // 'escape', 'outside-click', 'programmatic', or 'trigger'
  });
</script>
```

## Trigger with an Icon Button

Any element works as the trigger — including icon-only buttons.

<ComponentPreview center>

```html
<sg-menu>
  <sg-button slot="trigger" variant="ghost" size="sm" aria-label="More options">
    <sg-icon name="ellipsis" size="18"></sg-icon>
  </sg-button>
  <sg-menu-item value="edit">Edit</sg-menu-item>
  <sg-menu-item value="copy">Copy link</sg-menu-item>
  <sg-menu-item value="report">Report</sg-menu-item>
</sg-menu>
```

</ComponentPreview>

## Separator

Use `sg-menu-separator` to add a horizontal divider between groups of related items.

<ComponentPreview vertical>

```html
<sg-menu>
  <sg-button slot="trigger">File</sg-button>
  <sg-menu-item value="new">New File</sg-menu-item>
  <sg-menu-item value="open">Open…</sg-menu-item>
  <sg-menu-separator></sg-menu-separator>
  <sg-menu-item value="save">Save</sg-menu-item>
  <sg-menu-item value="save-as">Save As…</sg-menu-item>
  <sg-menu-separator></sg-menu-separator>
  <sg-menu-item value="delete" disabled>Delete</sg-menu-item>
</sg-menu>
```

</ComponentPreview>

## Checkable Items

### Checkbox Items

Set `type="checkbox"` on a `sg-menu-item` to make it toggleable. Clicking or pressing `Enter`/`Space` toggles the `checked` attribute and emits `select` with `checked` in the event detail. The menu stays open when a checkbox item is activated.

<ComponentPreview vertical>

```html
<sg-menu id="view-menu">
  <sg-button slot="trigger">View</sg-button>
  <sg-menu-item value="sidebar" type="checkbox" checked>Show Sidebar</sg-menu-item>
  <sg-menu-item value="toolbar" type="checkbox">Show Toolbar</sg-menu-item>
  <sg-menu-item value="statusbar" type="checkbox" checked>Show Status Bar</sg-menu-item>
</sg-menu>

<script>
  document.getElementById('view-menu').addEventListener('select', (e) => {
    console.log(e.detail.value, 'checked:', e.detail.checked);
  });
</script>
```

</ComponentPreview>

### Radio Items

Set `type="radio"` to create a group where only one item can be checked at a time. Selecting a radio item automatically unchecks all other `type="radio"` siblings.

<ComponentPreview vertical>

```html
<sg-menu id="sort-menu">
  <sg-button slot="trigger">Sort By</sg-button>
  <sg-menu-item value="name" type="radio" checked>Name</sg-menu-item>
  <sg-menu-item value="date" type="radio">Date Modified</sg-menu-item>
  <sg-menu-item value="size" type="radio">File Size</sg-menu-item>
</sg-menu>
```

</ComponentPreview>

## API Reference

### `sg-menu` Attributes

| Attribute   | Type                                                                              | Default          | Description                                                |
| ----------- | --------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------- |
| `placement` | `'bottom' \| 'bottom-start' \| 'bottom-end' \| 'top' \| 'top-start' \| 'top-end'` | `'bottom-start'` | Preferred panel placement (auto-flips near viewport edges) |
| `color`     | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'`         | —                | Color theme                                                |
| `size`      | `'sm' \| 'md' \| 'lg'`                                                            | `'md'`           | Size theme                                                 |
| `disabled`  | `boolean`                                                                         | `false`          | Prevent the menu from opening                              |

### `sg-menu` Slots

| Slot      | Description                                        |
| --------- | -------------------------------------------------- |
| `trigger` | The element that opens/closes the menu panel       |
| (default) | `sg-menu-item` elements to display as menu options |

### `sg-menu-item` Attributes

| Attribute  | Type                    | Default | Description                                                  |
| ---------- | ----------------------- | ------- | ------------------------------------------------------------ |
| `value`    | `string`                | `''`    | Value emitted in the `select` event detail                   |
| `type`     | `'checkbox' \| 'radio'` | —       | Makes the item checkable; radio items are mutually exclusive |
| `checked`  | `boolean`               | `false` | Whether a checkable item is currently checked                |
| `disabled` | `boolean`               | `false` | Prevent the item from being selected                         |

### `sg-menu-item` Slots

| Slot      | Description                         |
| --------- | ----------------------------------- |
| `icon`    | Optional leading icon or decoration |
| (default) | Item label text                     |

### Events

| Event    | Detail                                                                   | Description                                                                                               |
| -------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `select` | `{ value: string, checked?: boolean }`                                   | Emitted when a menu item is selected. `checked` is present for `type="checkbox"` and `type="radio"` items |
| `open`   | `{ reason: 'programmatic' \| 'trigger' }`                                | Emitted when the panel opens.                                                                             |
| `close`  | `{ reason: 'escape' \| 'outside-click' \| 'programmatic' \| 'trigger' }` | Emitted when the panel closes.                                                                            |

### CSS Custom Properties (`sg-menu`)

| Property                    | Description                | Default                |
| --------------------------- | -------------------------- | ---------------------- |
| `--menu-panel-min-width`          | Minimum width of the panel                       | `10rem`                |
| `--menu-panel-radius`             | Border radius of the panel                       | `var(--rounded-lg)`    |
| `--menu-panel-shadow`             | Box shadow of the panel                          | `var(--shadow-xl)`     |
| `--menu-panel-bg`                 | Panel background surface                         | Theme-dependent        |
| `--menu-panel-border-color`       | Panel border color                               | Theme-dependent        |
| `--menu-panel-blur`               | Panel backdrop blur amount                       | `var(--blur-md)`       |
| `--menu-item-hover-bg`            | Item background on hover                         | Theme-dependent        |
| `--menu-item-focus-color`         | Item text color when keyboard-focused            | Theme-dependent        |
| `--menu-item-focus-bg`            | Item background when keyboard-focused            | Theme-dependent        |
| `--menu-item-selection-bg`        | Background for checkbox/radio items (unselected) | Theme-dependent        |
| `--menu-item-checked-color`       | Item text color when checked                     | Theme-dependent        |
| `--menu-item-checked-bg`          | Item background when checked                     | Theme-dependent        |

## Accessibility

The menu component follows WAI-ARIA Menu Button Pattern best practices.

### `sg-menu`

<sg-icon name="circle-check" size="16"></sg-icon> **Keyboard Navigation**

- Arrow keys move focus between items; `Enter` / `Space` activates; `Escape` closes and returns focus to the trigger.
- `Home` / `End` jump to the first or last item.
- Outside clicks and `Tab` close the menu and restore focus to the trigger.

<sg-icon name="circle-check" size="16"></sg-icon> **Screen Readers**

- The panel has `role="menu"` and `aria-orientation="vertical"`.
- The trigger element receives `aria-haspopup="menu"`, `aria-expanded`, and `aria-controls` pointing to the menu panel.

### `sg-menu-item`

<sg-icon name="circle-check" size="16"></sg-icon> **Screen Readers**

- Each item has `role="menuitem"` and `aria-disabled` when disabled.
- Checkable items automatically switch to `role="menuitemcheckbox"` or `role="menuitemradio"` with the appropriate `aria-checked` value.

::: tip
Always provide a visible label or `aria-label` on an icon-only trigger button so the purpose is clear to screen reader users.
:::

## Best Practices

**Do:**

- Keep menu items short and action-oriented (verb + noun: "Edit post", "Delete file").
- Use `value` on each item to handle selection in a single `sg-select` listener rather than per-item click handlers.
- Use `disabled` on items for permissions that might change, rather than removing the item, to signal that the action exists but is unavailable.

**Don't:**

- Nest menus inside other menus — this creates complex keyboard interactions and poor UX.
- Place form controls (inputs, checkboxes) inside a menu — use a popover or dialog instead.
- Use a menu when only one action is available — a plain button is always clearer.
