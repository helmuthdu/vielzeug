# Menu

An action dropdown triggered by any slotted element. Presents a list of `bit-menu-item` actions in a floating panel using viewport-aware positioning. Supports full keyboard navigation and accessibility semantics.

## Features

- 🎯 **Any trigger**: use any element in the `trigger` slot — button, icon, link
- ⌨️ **Full Keyboard Nav**: ArrowDown/Up, Enter/Space, Escape, Tab, Home/End
- 📍 **Auto-positioning**: uses `@vielzeug/floatit` to flip when near viewport edges
- 🔕 **Outside-click close**: dismiss by clicking anywhere outside- ➖ **Separator**: `bit-menu-separator` renders a visual divider between groups of items
- ✅ **Checkable Items**: `bit-menu-item` supports `type="checkbox"` and `type="radio"` for toggleable selections- 🙅 **Disabled items**: individual `bit-menu-item` items can be disabled
- 🧩 **Icon slot**: each item supports a leading `icon` slot
- 🎨 **Color Themes**: primary, secondary, info, success, warning, error
- 📏 **3 Sizes**: sm, md, lg
- ♿ **ARIA**: `role="menu"`, `role="menuitem"`, `aria-expanded`, `aria-haspopup="menu"`, `aria-controls`

## Source Code

::: details View Source Code
<<< @/../packages/buildit/src/overlay/menu/menu.ts
:::

## Basic Usage

Place your trigger element in the `trigger` slot and add `bit-menu-item` children.

```html
<bit-menu>
  <bit-button slot="trigger">Actions</bit-button>
  <bit-menu-item value="edit">Edit</bit-menu-item>
  <bit-menu-item value="duplicate">Duplicate</bit-menu-item>
  <bit-menu-item value="delete">Delete</bit-menu-item>
</bit-menu>

<script type="module">
  import '@vielzeug/buildit/menu';
  import '@vielzeug/buildit/button';
</script>
```

## Placement

Control which side of the trigger the panel opens on. The menu automatically flips to avoid viewport clipping.

<ComponentPreview center>

```html
<bit-menu placement="bottom-start">
  <bit-button slot="trigger" variant="outline" size="sm">Bottom Start ↙</bit-button>
  <bit-menu-item value="a">Option A</bit-menu-item>
  <bit-menu-item value="b">Option B</bit-menu-item>
</bit-menu>

<bit-menu placement="bottom-end">
  <bit-button slot="trigger" variant="outline" size="sm">Bottom End ↘</bit-button>
  <bit-menu-item value="a">Option A</bit-menu-item>
  <bit-menu-item value="b">Option B</bit-menu-item>
</bit-menu>

<bit-menu placement="top-start">
  <bit-button slot="trigger" variant="outline" size="sm">Top Start ↖</bit-button>
  <bit-menu-item value="a">Option A</bit-menu-item>
  <bit-menu-item value="b">Option B</bit-menu-item>
</bit-menu>
```

</ComponentPreview>

## Items with Icons

Use the `icon` named slot on each `bit-menu-item` for leading icons.

::: tip Material Icons
These examples use Material Symbols Rounded ligatures (for example: `<span class="material-symbols-rounded">search</span>`).
:::

<ComponentPreview vertical>

```html
<bit-menu>
  <bit-button slot="trigger">File</bit-button>
  <bit-menu-item value="new">
    <span slot="icon" class="material-symbols-rounded" aria-hidden="true">description</span>
    New File
  </bit-menu-item>
  <bit-menu-item value="open">
    <span slot="icon" class="material-symbols-rounded" aria-hidden="true">folder_open</span>
    Open…
  </bit-menu-item>
  <bit-menu-item value="save">
    <span slot="icon" class="material-symbols-rounded" aria-hidden="true">save</span>
    Save
  </bit-menu-item>
  <bit-menu-item value="delete" disabled>
    <span slot="icon" class="material-symbols-rounded" aria-hidden="true">delete</span>
    Delete (disabled)
  </bit-menu-item>
</bit-menu>
```

</ComponentPreview>

## Disabled Items

Set `disabled` on a `bit-menu-item` to prevent selection. The item is still visible but non-interactive.

<ComponentPreview vertical>

```html
<bit-menu>
  <bit-button slot="trigger" variant="flat">More options</bit-button>
  <bit-menu-item value="view">View details</bit-menu-item>
  <bit-menu-item value="export">Export</bit-menu-item>
  <bit-menu-item value="archive" disabled>Archive (no permission)</bit-menu-item>
  <bit-menu-item value="delete" disabled>Delete (no permission)</bit-menu-item>
</bit-menu>
```

</ComponentPreview>

## Disabled Menu

Set `disabled` on the `bit-menu` element to prevent the panel from opening at all.

<ComponentPreview center>

```html
<bit-menu disabled>
  <bit-button slot="trigger" disabled>Disabled menu</bit-button>
  <bit-menu-item value="a">Option A</bit-menu-item>
</bit-menu>
```

</ComponentPreview>

## Listening to Events

```html
<bit-menu id="action-menu">
  <bit-button slot="trigger">Actions</bit-button>
  <bit-menu-item value="rename">Rename</bit-menu-item>
  <bit-menu-item value="move">Move to folder</bit-menu-item>
  <bit-menu-item value="delete">Delete</bit-menu-item>
</bit-menu>

<script type="module">
  import '@vielzeug/buildit/menu';
  import '@vielzeug/buildit/button';

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
    console.log('menu opened via:', e.detail.reason); // 'toggle', 'programmatic', or 'trigger'
  });

  // Fired when the panel closes
  menu.addEventListener('close', (e) => {
    console.log('menu closed via:', e.detail.reason); // 'escape', 'outside-click', 'programmatic', or 'toggle'
  });
</script>
```

## Trigger with an Icon Button

Any element works as the trigger — including icon-only buttons.

<ComponentPreview center>

```html
<bit-menu>
  <bit-button slot="trigger" variant="ghost" size="sm" aria-label="More options">
    <span class="material-symbols-rounded" aria-hidden="true">more_horiz</span>
  </bit-button>
  <bit-menu-item value="edit">Edit</bit-menu-item>
  <bit-menu-item value="copy">Copy link</bit-menu-item>
  <bit-menu-item value="report">Report</bit-menu-item>
</bit-menu>
```

</ComponentPreview>

## Separator

Use `bit-menu-separator` to add a horizontal divider between groups of related items.

<ComponentPreview vertical>

```html
<bit-menu>
  <bit-button slot="trigger">File</bit-button>
  <bit-menu-item value="new">New File</bit-menu-item>
  <bit-menu-item value="open">Open…</bit-menu-item>
  <bit-menu-separator></bit-menu-separator>
  <bit-menu-item value="save">Save</bit-menu-item>
  <bit-menu-item value="save-as">Save As…</bit-menu-item>
  <bit-menu-separator></bit-menu-separator>
  <bit-menu-item value="delete" disabled>Delete</bit-menu-item>
</bit-menu>
```

</ComponentPreview>

## Checkable Items

### Checkbox Items

Set `type="checkbox"` on a `bit-menu-item` to make it toggleable. Clicking or pressing `Enter`/`Space` toggles the `checked` attribute and emits `select` with `checked` in the event detail. The menu stays open when a checkbox item is activated.

<ComponentPreview vertical>

```html
<bit-menu id="view-menu">
  <bit-button slot="trigger">View</bit-button>
  <bit-menu-item value="sidebar" type="checkbox" checked>Show Sidebar</bit-menu-item>
  <bit-menu-item value="toolbar" type="checkbox">Show Toolbar</bit-menu-item>
  <bit-menu-item value="statusbar" type="checkbox" checked>Show Status Bar</bit-menu-item>
</bit-menu>

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
<bit-menu id="sort-menu">
  <bit-button slot="trigger">Sort By</bit-button>
  <bit-menu-item value="name" type="radio" checked>Name</bit-menu-item>
  <bit-menu-item value="date" type="radio">Date Modified</bit-menu-item>
  <bit-menu-item value="size" type="radio">File Size</bit-menu-item>
</bit-menu>
```

</ComponentPreview>

## API Reference

### `bit-menu` Attributes

| Attribute   | Type                                                                              | Default          | Description                                                |
| ----------- | --------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------- |
| `placement` | `'bottom' \| 'bottom-start' \| 'bottom-end' \| 'top' \| 'top-start' \| 'top-end'` | `'bottom-start'` | Preferred panel placement (auto-flips near viewport edges) |
| `color`     | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'`         | —                | Color theme                                                |
| `size`      | `'sm' \| 'md' \| 'lg'`                                                            | `'md'`           | Size theme                                                 |
| `disabled`  | `boolean`                                                                         | `false`          | Prevent the menu from opening                              |

### `bit-menu` Slots

| Slot      | Description                                         |
| --------- | --------------------------------------------------- |
| `trigger` | The element that opens/closes the menu panel        |
| (default) | `bit-menu-item` elements to display as menu options |

### `bit-menu-item` Attributes

| Attribute  | Type                    | Default | Description                                                  |
| ---------- | ----------------------- | ------- | ------------------------------------------------------------ |
| `value`    | `string`                | `''`    | Value emitted in the `bit-select` event detail               |
| `type`     | `'checkbox' \| 'radio'` | —       | Makes the item checkable; radio items are mutually exclusive |
| `checked`  | `boolean`               | `false` | Whether a checkable item is currently checked                |
| `disabled` | `boolean`               | `false` | Prevent the item from being selected                         |

### `bit-menu-item` Slots

| Slot      | Description                         |
| --------- | ----------------------------------- |
| `icon`    | Optional leading icon or decoration |
| (default) | Item label text                     |

### Events

| Event    | Detail                                  | Description                                                                                                                   |
| -------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `select` | `{ value: string, checked?: boolean }`  | Emitted when a menu item is selected. `checked` is present for `type="checkbox"` and `type="radio"` items                    |
| `open`   | `{ reason: OverlayOpenReason }`         | Emitted when the panel opens. Reason can be `'toggle'`, `'programmatic'`, or `'trigger'`                                    |
| `close`  | `{ reason: OverlayCloseReason }`        | Emitted when the panel closes. Reason can be `'escape'`, `'outside-click'`, `'programmatic'`, or `'toggle'`                 |

### CSS Custom Properties (`bit-menu`)

| Property                 | Description                | Default        |
| ------------------------ | -------------------------- | -------------- |
| `--menu-panel-min-width` | Minimum width of the panel | `10rem`        |
| `--menu-panel-radius`    | Border radius of the panel | `--rounded-lg` |
| `--menu-panel-shadow`    | Box shadow of the panel    | `--shadow-xl`  |
| `--menu-panel-bg`        | Panel background surface   | mixed contrast surface |
| `--menu-panel-border-color` | Panel border color      | subtle mixed contrast |
| `--menu-panel-blur`      | Panel blur amount          | `--blur-md`    |

## Accessibility

The menu component follows WAI-ARIA Menu Button Pattern best practices.

### `bit-menu`

✅ **Keyboard Navigation**

- Arrow keys move focus between items; `Enter` / `Space` activates; `Escape` closes and returns focus to the trigger.
- `Home` / `End` jump to the first or last item.
- Outside clicks and `Tab` close the menu and restore focus to the trigger.

✅ **Screen Readers**

- The panel has `role="menu"` and `aria-orientation="vertical"`.
- The trigger element receives `aria-haspopup="menu"`, `aria-expanded`, and `aria-controls` pointing to the menu panel.

### `bit-menu-item`

✅ **Screen Readers**

- Each item has `role="menuitem"` and `aria-disabled` when disabled.
- Checkable items automatically switch to `role="menuitemcheckbox"` or `role="menuitemradio"` with the appropriate `aria-checked` value.

::: tip
Always provide a visible label or `aria-label` on an icon-only trigger button so the purpose is clear to screen reader users.
:::

## Best Practices

**Do:**

- Keep menu items short and action-oriented (verb + noun: "Edit post", "Delete file").
- Use `value` on each item to handle selection in a single `bit-select` listener rather than per-item click handlers.
- Use `disabled` on items for permissions that might change, rather than removing the item, to signal that the action exists but is unavailable.

**Don't:**

- Nest menus inside other menus — this creates complex keyboard interactions and poor UX.
- Place form controls (inputs, checkboxes) inside a menu — use a popover or dialog instead.
- Use a menu when only one action is available — a plain button is always clearer.
