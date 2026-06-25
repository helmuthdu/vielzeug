# Menu

An action dropdown triggered by any slotted element. Presents a list of `ore-menu-item` actions in a floating panel using viewport-aware positioning. Supports full keyboard navigation and accessibility semantics.

## Placement

Control which side of the trigger the panel opens on. The menu automatically flips to avoid viewport clipping.

<ComponentPreview center>

```html
<ore-menu placement="bottom-start">
  <ore-button slot="trigger" variant="outline" size="sm"
    >Bottom Start <ore-icon name="arrow-down-left" size="16"></ore-icon
  ></ore-button>
  <ore-menu-item value="a">Option A</ore-menu-item>
  <ore-menu-item value="b">Option B</ore-menu-item>
</ore-menu>

<ore-menu placement="bottom-end">
  <ore-button slot="trigger" variant="outline" size="sm"
    >Bottom End <ore-icon name="arrow-down-right" size="16"></ore-icon
  ></ore-button>
  <ore-menu-item value="a">Option A</ore-menu-item>
  <ore-menu-item value="b">Option B</ore-menu-item>
</ore-menu>

<ore-menu placement="top-start">
  <ore-button slot="trigger" variant="outline" size="sm"
    >Top Start <ore-icon name="arrow-up-left" size="16"></ore-icon
  ></ore-button>
  <ore-menu-item value="a">Option A</ore-menu-item>
  <ore-menu-item value="b">Option B</ore-menu-item>
</ore-menu>
```

</ComponentPreview>

## Items with Icons

Use the `icon` named slot on each `ore-menu-item` for leading icons.

::: tip Icons
These examples use inline SVG slot content so they stay framework and icon-library agnostic.
:::

<ComponentPreview vertical>

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

<ComponentPreview vertical>

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

<ComponentPreview center>

```html
<ore-menu disabled>
  <ore-button slot="trigger" disabled>Disabled menu</ore-button>
  <ore-menu-item value="a">Option A</ore-menu-item>
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

Use `value` on each item to handle selection in a single `select` listener rather than per-item click handlers. Keep menu items short and action-oriented (verb + noun: "Edit post", "Delete file").

## Trigger with an Icon Button

Any element works as the trigger — including icon-only buttons. Always provide a visible label or `aria-label` on an icon-only trigger button so the purpose is clear to screen reader users.

<ComponentPreview center>

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

## Separator

Use `ore-menu-separator` to add a horizontal divider between groups of related items.

<ComponentPreview vertical>

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

## Checkable Items

### Checkbox Items

Set `type="checkbox"` on a `ore-menu-item` to make it toggleable. Clicking or pressing `Enter`/`Space` toggles the `checked` attribute and emits `select` with `checked` in the event detail. The menu stays open when a checkbox item is activated.

<ComponentPreview vertical>

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

<ComponentPreview vertical>

```html
<ore-menu id="sort-menu">
  <ore-button slot="trigger">Sort By</ore-button>
  <ore-menu-item value="name" type="radio" checked>Name</ore-menu-item>
  <ore-menu-item value="date" type="radio">Date Modified</ore-menu-item>
  <ore-menu-item value="size" type="radio">File Size</ore-menu-item>
</ore-menu>
```

</ComponentPreview>

## API Reference

**`ore-menu`** Attributes

| Attribute   | Type                                                                              | Default          | Description                                                |
| ----------- | --------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------- |
| `placement` | `'bottom' \| 'bottom-start' \| 'bottom-end' \| 'top' \| 'top-start' \| 'top-end'` | `'bottom-start'` | Preferred panel placement (auto-flips near viewport edges) |
| `color`     | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'`         | —                | Color theme                                                |
| `size`      | `'sm' \| 'md' \| 'lg'`                                                            | `'md'`           | Size theme                                                 |
| `disabled`  | `boolean`                                                                         | `false`          | Prevent the menu from opening                              |

**`ore-menu`** Slots

| Slot      | Description                                        |
| --------- | -------------------------------------------------- |
| `trigger` | The element that opens/closes the menu panel       |
| (default) | `ore-menu-item` elements to display as menu options |

**`ore-menu-item`** Attributes

| Attribute  | Type                    | Default | Description                                                  |
| ---------- | ----------------------- | ------- | ------------------------------------------------------------ |
| `value`    | `string`                | `''`    | Value emitted in the `select` event detail                   |
| `type`     | `'checkbox' \| 'radio'` | —       | Makes the item checkable; radio items are mutually exclusive |
| `checked`  | `boolean`               | `false` | Whether a checkable item is currently checked                |
| `disabled` | `boolean`               | `false` | Prevent the item from being selected                         |

**`ore-menu-item`** Slots

| Slot      | Description                         |
| --------- | ----------------------------------- |
| `icon`    | Optional leading icon or decoration |
| (default) | Item label text                     |

**Events**

| Event    | Detail                                                                   | Description                                                                                               |
| -------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `select` | `{ value: string, checked?: boolean }`                                   | Emitted when a menu item is selected. `checked` is present for `type="checkbox"` and `type="radio"` items |
| `open`   | `{ reason: 'programmatic' \| 'trigger' }`                                | Emitted when the panel opens.                                                                             |
| `close`  | `{ reason: 'escape' \| 'outside-click' \| 'programmatic' \| 'trigger' }` | Emitted when the panel closes.                                                                            |

**CSS Custom Properties (`ore-menu`)**

| Property                    | Description                                      | Default             |
| --------------------------- | ------------------------------------------------ | ------------------- |
| `--menu-panel-min-width`    | Minimum width of the panel                       | `10rem`             |
| `--menu-panel-radius`       | Border radius of the panel                       | `var(--rounded-lg)` |
| `--menu-panel-shadow`       | Box shadow of the panel                          | `var(--shadow-xl)`  |
| `--menu-panel-bg`           | Panel background surface                         | Theme-dependent     |
| `--menu-panel-border-color` | Panel border color                               | Theme-dependent     |
| `--menu-panel-blur`         | Panel backdrop blur amount                       | `var(--blur-md)`    |
| `--menu-item-hover-bg`      | Item background on hover                         | Theme-dependent     |
| `--menu-item-focus-color`   | Item text color when keyboard-focused            | Theme-dependent     |
| `--menu-item-focus-bg`      | Item background when keyboard-focused            | Theme-dependent     |
| `--menu-item-selection-bg`  | Background for checkbox/radio items (unselected) | Theme-dependent     |
| `--menu-item-checked-color` | Item text color when checked                     | Theme-dependent     |
| `--menu-item-checked-bg`    | Item background when checked                     | Theme-dependent     |

## Accessibility

The menu component follows WAI-ARIA Menu Button Pattern best practices.

Arrow keys move focus between items; `Enter` / `Space` activates the focused item; `Escape` closes the panel and returns focus to the trigger. `Home` / `End` jump to the first or last item. Outside clicks and `Tab` also close the menu and restore focus to the trigger.

The panel has `role="menu"` and `aria-orientation="vertical"`. The trigger element receives `aria-haspopup="menu"`, `aria-expanded`, and `aria-controls` pointing to the menu panel. Each item has `role="menuitem"` and `aria-disabled` when disabled. Checkable items automatically switch to `role="menuitemcheckbox"` or `role="menuitemradio"` with the appropriate `aria-checked` value.
