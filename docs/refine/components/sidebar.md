# Sidebar

A collapsible navigation sidebar with labelled groups and individual items. It uses the same frosted panel surface treatment as the drawer, while still supporting icon-only collapse mode, keyboard navigation, and full ARIA compliance.

## Collapsible Sidebar

Add the `collapsible` attribute to show the collapse toggle button. Items will animate to icon-only mode when collapsed. When collapsed to icon-only mode, text labels are visually hidden (opacity 0, width 0) but the structural DOM remains accessible, and items remain keyboard reachable. Pair icon-only collapsed items with tooltips using `ore-tooltip` to surface the label for sighted keyboard and pointer users.

<ComponentPreview>

```html
<ore-grid
  areas="'sidebar main'"
  fullwidth
  gap="none"
  style="height: 400px; --grid-cols: auto 1fr; border: 1px solid var(--color-contrast-200); border-radius: var(--rounded-lg); overflow: hidden;">
  <ore-sidebar collapsible label="App navigation" style="grid-area: sidebar;">
    <ore-icon slot="logo" name="rocket" size="24"></ore-icon>
    <span slot="header">My App</span>
    <ore-sidebar-group label="Main">
      <ore-sidebar-item href="#" active>
        <ore-icon slot="icon" name="home" size="18"></ore-icon>
        Dashboard
      </ore-sidebar-item>
      <ore-sidebar-item href="#">
        <ore-icon slot="icon" name="folder" size="18"></ore-icon>
        Projects
      </ore-sidebar-item>
      <ore-sidebar-item href="#">
        <ore-icon slot="icon" name="settings" size="18"></ore-icon>
        Settings
      </ore-sidebar-item>
    </ore-sidebar-group>
  </ore-sidebar>
  <main style="grid-area: main; padding: var(--size-4);">Main content area</main>
</ore-grid>
```

</ComponentPreview>

## Responsive App Shell (Desktop / Tablet / Mobile)

Use two breakpoints to get the full three-state behavior:

- Desktop: full sidebar
- Tablet: compact/collapsed sidebar (`responsive`)
- Mobile: bottom navigation + drawer (`bottom-nav-at`), usually opened from a navbar hamburger

<ComponentPreview>

```html
<div class="sidebar-shell-preview">
  <style>
    .sidebar-shell-preview {
      position: relative;
      height: 460px;
      overflow: hidden;
      border: 1px solid var(--color-contrast-200);
      border-radius: var(--rounded-lg);
    }

    .sidebar-shell-preview .shell-body {
      position: relative;
      height: calc(100% - var(--size-14));
      overflow: hidden;
    }

    .sidebar-shell-preview .shell-grid {
      height: 100%;
      --grid-cols: auto minmax(0, 1fr);
    }

    .sidebar-shell-preview .shell-grid > ore-grid-item {
      min-width: 0;
      min-height: 0;
    }

    .sidebar-shell-preview .shell-sidebar {
      min-height: 0;
    }

    .sidebar-shell-preview .shell-content {
      min-width: 0;
      min-height: 0;
      padding: var(--size-4);
      overflow: auto;
    }
  </style>

  <ore-navbar sticky breakpoint="(max-width: 640px)" mobile-sidebar="#docs-shell-sidebar" label="Workspace navigation">
    <span slot="logo" style="font-weight: var(--font-semibold);">Workspace</span>
    <ore-navbar-item slot="start" href="#" active>Dashboard</ore-navbar-item>
    <ore-navbar-item href="#">Projects</ore-navbar-item>
    <ore-navbar-item href="#">Reports</ore-navbar-item>
    <ore-navbar-item slot="end" href="#">Account</ore-navbar-item>
  </ore-navbar>

  <div class="shell-body">
    <ore-grid class="shell-grid" areas="'sidebar main'" fullwidth gap="none">
      <ore-grid-item area="sidebar">
        <ore-sidebar
          id="docs-shell-sidebar"
          class="shell-sidebar"
          container-breakpoints
          collapsible
          label="Workspace sidebar"
          responsive="(max-width: 1200px)"
          bottom-nav-at="(max-width: 640px)">
          <ore-icon slot="logo" name="rocket" size="20"></ore-icon>
          <span slot="header">Workspace</span>

          <ore-sidebar-item href="#" active>
            <ore-icon slot="icon" name="layout-dashboard" size="18"></ore-icon>
            Dashboard
          </ore-sidebar-item>
          <ore-sidebar-item href="#">
            <ore-icon slot="icon" name="folder" size="18"></ore-icon>
            Projects
          </ore-sidebar-item>
          <ore-sidebar-item href="#">
            <ore-icon slot="icon" name="bar-chart-3" size="18"></ore-icon>
            Reports
          </ore-sidebar-item>

          <ore-sidebar-group label="Admin" collapsible>
            <ore-sidebar-item href="#">
              <ore-icon slot="icon" name="users" size="18"></ore-icon>
              Team
            </ore-sidebar-item>
            <ore-sidebar-item href="#">
              <ore-icon slot="icon" name="settings" size="18"></ore-icon>
              Settings
            </ore-sidebar-item>
          </ore-sidebar-group>
        </ore-sidebar>
      </ore-grid-item>

      <ore-grid-item area="main" class="shell-content">
        <ore-text>
          Resize preview width: desktop uses full sidebar, tablet collapses, and mobile turns sidebar into bottom tabs.
          The navbar hamburger opens the mobile drawer.
        </ore-text>
      </ore-grid-item>
    </ore-grid>
  </div>
</div>
```

</ComponentPreview>

### Integration Notes

- Bottom navigation tabs are derived from direct `ore-sidebar-item` children only.
- `ore-sidebar-group` content remains available in the drawer opened by `openMobile()` or a linked `ore-navbar mobile-sidebar` trigger.
- Use `responsive` for tablet compact mode and `bottom-nav-at` for mobile bottom-nav mode.

## Groups

Use `ore-sidebar-group` to organize items into labelled sections. Add the `collapsible` attribute to allow toggling the group open/closed.

`ore-sidebar-group` now uses native `details/summary` semantics internally for simpler keyboard and accessibility behavior. Collapsible group headers receive `role="button"`, `tabindex="0"`, and `aria-expanded` so they can be activated via keyboard (`Enter` or `Space`). The item list is hidden with the `hidden` attribute when closed.

Set `default-open="false"` for uncontrolled groups that start collapsed, or pass `open` to control the group state externally.

Use `ore-sidebar-group` to group semantically related items — it adds a visible label and an implicit `role="list"` on the items container. Avoid setting `active` on more than one item simultaneously, as it breaks `aria-current` semantics.

<ComponentPreview>

```html
<ore-grid
  areas="'sidebar main'"
  fullwidth
  gap="none"
  style="height: 400px; --grid-cols: auto 1fr; border: 1px solid var(--color-contrast-200); border-radius: var(--rounded-lg); overflow: hidden;">
  <ore-sidebar label="App navigation" style="grid-area: sidebar;">
    <span slot="header">My App</span>
    <ore-sidebar-group label="Main">
      <ore-sidebar-item href="#" active>
        <ore-icon slot="icon" name="home" size="18"></ore-icon>
        Dashboard
      </ore-sidebar-item>
      <ore-sidebar-item href="#">
        <ore-icon slot="icon" name="chart-column" size="18"></ore-icon>
        Analytics
      </ore-sidebar-item>
    </ore-sidebar-group>
    <ore-sidebar-group label="Settings" collapsible open>
      <ore-sidebar-item href="#">
        <ore-icon slot="icon" name="user" size="18"></ore-icon>
        Profile
      </ore-sidebar-item>
      <ore-sidebar-item href="#">
        <ore-icon slot="icon" name="bell" size="18"></ore-icon>
        Notifications
      </ore-sidebar-item>
    </ore-sidebar-group>
  </ore-sidebar>
  <main style="grid-area: main; padding: var(--size-4);">Content area</main>
  </ore-grid>
  </div>
```

</ComponentPreview>

## Items with Badges

Use the `end` slot on `ore-sidebar-item` for trailing content such as notification counts or keyboard shortcuts.

<ComponentPreview>

```html
<ore-grid
  areas="'sidebar main'"
  fullwidth
  gap="none"
  style="height: 300px; --grid-cols: auto 1fr; border: 1px solid var(--color-contrast-200); border-radius: var(--rounded-lg); overflow: hidden;">
  <ore-sidebar label="App navigation" style="grid-area: sidebar;">
    <ore-sidebar-group label="Inbox">
      <ore-sidebar-item href="#">
        <ore-icon slot="icon" name="inbox" size="18"></ore-icon>
        Inbox
        <ore-badge slot="end" color="primary">12</ore-badge>
      </ore-sidebar-item>
      <ore-sidebar-item href="#">
        <ore-icon slot="icon" name="star" size="18"></ore-icon>
        Starred
        <ore-badge slot="end">4</ore-badge>
      </ore-sidebar-item>
      <ore-sidebar-item href="#">
        <ore-icon slot="icon" name="trash-2" size="18"></ore-icon>
        Trash
      </ore-sidebar-item>
    </ore-sidebar-group>
  </ore-sidebar>
  <main style="grid-area: main; padding: var(--size-4);">Content area</main>
</ore-grid>
```

</ComponentPreview>

## Variants

### Floating

Uses the same drawer-inspired panel surface with a stronger floating presentation, rounded corners, and more separation from the page background.

<ComponentPreview>

```html
<ore-grid
  areas="'sidebar main'"
  fullwidth
  gap="sm"
  style="height: 300px; --grid-cols: auto 1fr; background: var(--color-contrast-50); overflow: hidden; padding: var(--size-2);">
  <ore-sidebar variant="floating" label="Floating sidebar" style="grid-area: sidebar;">
    <ore-sidebar-group label="Navigation">
      <ore-sidebar-item href="#" active>
        <ore-icon slot="icon" name="home" size="18"></ore-icon>
        Home
      </ore-sidebar-item>
      <ore-sidebar-item href="#">
        <ore-icon slot="icon" name="folder" size="18"></ore-icon>
        Files
      </ore-sidebar-item>
    </ore-sidebar-group>
  </ore-sidebar>
  <div style="grid-area: main; padding: var(--size-4);">Content</div>
</ore-grid>
```

</ComponentPreview>

### Inset

A subtle variant with a slightly tinted background and no visible border or elevated panel shadow — blends naturally into page content areas.

<ComponentPreview>

```html
<ore-grid areas="'sidebar main'" fullwidth gap="none" style="height: 300px; --grid-cols: auto 1fr; overflow: hidden;">
  <ore-sidebar variant="inset" label="Inset sidebar" style="grid-area: sidebar;">
    <ore-sidebar-group label="Navigation">
      <ore-sidebar-item href="#" active>
        <ore-icon slot="icon" name="home" size="18"></ore-icon>
        Home
      </ore-sidebar-item>
      <ore-sidebar-item href="#">
        <ore-icon slot="icon" name="folder" size="18"></ore-icon>
        Files
      </ore-sidebar-item>
    </ore-sidebar-group>
  </ore-sidebar>
  <div style="grid-area: main; padding: var(--size-4);">Content</div>
</ore-grid>
```

</ComponentPreview>

## Header and Footer Slots

Use `slot="logo"` for the logo/icon and `slot="header"` for the app name or branding text. Use `slot="footer"` for user profile or secondary actions. When collapsed, only the logo/icon is shown above the toggle button.

<ComponentPreview>

```html
<ore-grid
  areas="'sidebar main'"
  fullwidth
  gap="none"
  style="height: 400px; --grid-cols: auto 1fr; border: 1px solid var(--color-contrast-200); border-radius: var(--rounded-lg); overflow: hidden;">
  <ore-sidebar label="App sidebar" style="grid-area: sidebar;">
    <ore-icon slot="logo" name="rocket" size="24"></ore-icon>
    <span slot="header">MyApp</span>

    <ore-sidebar-group label="Navigation">
      <ore-sidebar-item href="#" active>
        <ore-icon slot="icon" name="home" size="18"></ore-icon>
        Dashboard
      </ore-sidebar-item>
      <ore-sidebar-item href="#">
        <ore-icon slot="icon" name="users" size="18"></ore-icon>
        Team
      </ore-sidebar-item>
    </ore-sidebar-group>

    <div
      slot="footer"
      style="display: flex; align-items: center; gap: var(--size-2); font-size: var(--text-sm); color: var(--color-contrast-600);">
      <ore-sidebar-item href="#">
        <ore-icon slot="icon" name="settings" size="18"></ore-icon>
        Config
      </ore-sidebar-item>
    </div>
  </ore-sidebar>
  <main style="grid-area: main; padding: var(--size-4);">Content area</main>
</ore-grid>
```

</ComponentPreview>

## Disabled Items

Set `disabled` on a `ore-sidebar-item` to prevent interaction. Avoid using `disabled` as a teaching mechanism — if an item is permanently unavailable, remove it from the sidebar instead.

<ComponentPreview>

```html
<ore-grid
  areas="'sidebar main'"
  fullwidth
  gap="none"
  style="--grid-cols: auto 1fr; border: 1px solid var(--color-contrast-200); border-radius: var(--rounded-lg); overflow: hidden;">
  <ore-sidebar label="App navigation" style="grid-area: sidebar;">
    <ore-sidebar-group label="Options">
      <ore-sidebar-item href="/available">
        <ore-icon slot="icon" name="check-circle" size="18"></ore-icon>
        Available
      </ore-sidebar-item>
      <ore-sidebar-item href="/locked" disabled>
        <ore-icon slot="icon" name="lock" size="18"></ore-icon>
        Locked (disabled)
      </ore-sidebar-item>
    </ore-sidebar-group>
  </ore-sidebar>
  <main style="grid-area: main; padding: var(--size-4);">Content area</main>
</ore-grid>
```

</ComponentPreview>

## External Links

When linking to external resources, use `target` and `rel` attributes on `ore-sidebar-item`.

```html
<ore-sidebar-item href="https://example.com" target="_blank" rel="noopener noreferrer">
  <ore-icon slot="icon" name="globe" size="18"></ore-icon>
  External Docs
</ore-sidebar-item>
```

## Imperative API

Collapse methods are exposed on the element instance.

```js
const sidebar = document.querySelector('ore-sidebar');

sidebar.setCollapsed(true); // collapse to icon-only
sidebar.setCollapsed(false); // expand to full width
sidebar.toggle(); // toggle between states

// bottom-nav mode drawer controls
sidebar.openMobile();
sidebar.closeMobile();
sidebar.toggleMobile();
```

## Events

```js
const sidebar = document.querySelector('ore-sidebar');

sidebar.addEventListener('collapsed-change', (e) => {
  console.log('Collapsed:', e.detail.collapsed, 'source:', e.detail.source);
});

sidebar.addEventListener('mobile-open-change', (e) => {
  console.log('Mobile drawer open:', e.detail.open, 'source:', e.detail.source);
});

const group = document.querySelector('ore-sidebar-group[collapsible]');

group.addEventListener('toggle', (e) => {
  console.log('Group open:', e.detail.open);
});
```

## Related Components

- [Navbar](./navbar.md)

## CSS Customization

### Global Variables

Override these CSS custom properties in your stylesheet to restyle the sidebar globally:

```css
ore-sidebar {
  --sidebar-width: 18rem; /* expanded width */
  --sidebar-collapsed-width: 4rem; /* collapsed width */
  --sidebar-bg: var(--color-canvas); /* sidebar background */
  --sidebar-border-color: var(--color-divider);
}

ore-sidebar-item {
  --sidebar-item-color: var(--color-contrast-700);
  --sidebar-item-hover-bg: var(--color-contrast-100);
  --sidebar-item-hover-color: var(--color-contrast-900);
  --sidebar-item-active-bg: color-mix(in oklch, var(--color-primary) 12%, transparent);
  --sidebar-item-active-color: var(--color-primary);
  --sidebar-item-indicator: var(--color-primary);
}
```

## API Reference

**`ore-sidebar` Attributes**

| Attribute           | Type      | Default                | Description                                                  |
| ------------------- | --------- | ---------------------- | ------------------------------------------------------------ |
| `collapsed`         | `boolean` | —                      | Controlled collapsed state                                   |
| `default-collapsed` | `boolean` | `false`                | Initial collapsed state in uncontrolled mode                 |
| `collapsible`       | `boolean` | `false`                | Shows the collapse/expand toggle button in the header        |
| `responsive`        | `string`  | —                      | Media query that enables compact (collapsed) sidebar mode    |
| `bottom-nav-at`     | `string`  | —                      | Media query that switches to mobile bottom-nav + drawer mode |
| `variant`           | `string`  | —                      | Visual variant: `'floating'` \| `'inset'`                    |
| `label`             | `string`  | `'Sidebar navigation'` | `aria-label` for the `<nav>` landmark                        |

**`ore-sidebar` Slots**

| Slot      | Description                                      |
| --------- | ------------------------------------------------ |
| `logo`    | Logo or icon, always visible at the top          |
| `header`  | App name or branding text, hidden when collapsed |
| (default) | `ore-sidebar-group` or `ore-sidebar-item` elements |
| `footer`  | User info, theme toggles, or secondary actions   |

**`ore-sidebar` Events**

| Event                | Detail                                                              | Description                                         |
| -------------------- | ------------------------------------------------------------------- | --------------------------------------------------- |
| `collapsed-change`   | `{ collapsed: boolean; source: 'toggle' \| 'responsive' \| 'api' }` | Fired when a collapse state change is requested     |
| `mobile-open-change` | `{ open: boolean; source: 'toggle' \| 'responsive' \| 'api' }`      | Fired when the bottom-nav drawer open state changes |

**`ore-sidebar` Methods**

| Method               | Description                         |
| -------------------- | ----------------------------------- |
| `setCollapsed(next)` | Set collapsed state                 |
| `toggle()`           | Toggle between collapsed / expanded |
| `openMobile()`       | Open the bottom-nav drawer          |
| `closeMobile()`      | Close the bottom-nav drawer         |
| `toggleMobile()`     | Toggle the bottom-nav drawer        |

**`ore-sidebar` CSS Custom Properties**

| Property                    | Description                 | Default  |
| --------------------------- | --------------------------- | -------- |
| `--sidebar-width`           | Expanded width              | `16rem`  |
| `--sidebar-collapsed-width` | Collapsed (icon-only) width | `3.5rem` |
| `--sidebar-bg`              | Sidebar background color    | canvas   |
| `--sidebar-border-color`    | Border / divider color      | contrast |

---

**`ore-sidebar-group` Attributes**

| Attribute      | Type      | Default | Description                                               |
| -------------- | --------- | ------- | --------------------------------------------------------- |
| `label`        | `string`  | `''`    | Visible group label text                                  |
| `collapsible`  | `boolean` | `false` | Adds a toggle button to collapse/expand the group's items |
| `default-open` | `boolean` | `true`  | Initial open state for uncontrolled collapsible groups    |
| `open`         | `boolean` | —       | Controlled group open state                               |

**`ore-sidebar-group` Slots**

| Slot      | Description                                 |
| --------- | ------------------------------------------- |
| `icon`    | Optional icon displayed in the group header |
| (default) | `ore-sidebar-item` elements                  |

**`ore-sidebar-group` Events**

| Event    | Detail              | Description                               |
| -------- | ------------------- | ----------------------------------------- |
| `toggle` | `{ open: boolean }` | Fired when a collapsible group is toggled |

---

**`ore-sidebar-item` Attributes**

| Attribute  | Type      | Default | Description                                                |
| ---------- | --------- | ------- | ---------------------------------------------------------- |
| `href`     | `string`  | —       | URL — renders an `<a>` when set, otherwise a `<button>`    |
| `active`   | `boolean` | `false` | Marks the item as the current page (`aria-current="page"`) |
| `disabled` | `boolean` | `false` | Disables the item and forces button rendering              |
| `rel`      | `string`  | —       | `rel` attribute on the inner `<a>` (link items only)       |
| `target`   | `string`  | —       | `target` attribute on the inner `<a>` (link items only)    |

**`ore-sidebar-item` Slots**

| Slot      | Description                                          |
| --------- | ---------------------------------------------------- |
| `icon`    | Leading icon (hidden from assistive tech)            |
| (default) | Item label text                                      |
| `end`     | Trailing content: badge, shortcut key, chevron, etc. |

**`ore-sidebar-item` Parts**

| Part         | Description                           |
| ------------ | ------------------------------------- |
| `item`       | The inner `<a>` or `<button>` element |
| `item-icon`  | The icon slot wrapper                 |
| `item-label` | The label text wrapper                |
| `item-end`   | The trailing content wrapper          |

**`ore-sidebar-item` CSS Custom Properties**

| Property                      | Description                      |
| ----------------------------- | -------------------------------- |
| `--sidebar-item-color`        | Default text color               |
| `--sidebar-item-hover-bg`     | Background on hover              |
| `--sidebar-item-hover-color`  | Text color on hover              |
| `--sidebar-item-active-bg`    | Background when active           |
| `--sidebar-item-active-color` | Text color when active           |
| `--sidebar-item-indicator`    | Active state indicator bar color |

## Accessibility

The sidebar follows WAI-ARIA navigation patterns and WCAG 2.2 guidelines.

The `ore-sidebar` element renders a `<nav>` landmark with an `aria-label`. When a page has multiple navigation regions, ensure each has a unique descriptive label:

```html
<ore-sidebar label="Main navigation">…</ore-sidebar> <ore-sidebar label="Documentation sidebar">…</ore-sidebar>
```

`ore-sidebar-item` sets `aria-current="page"` on the inner `<a>` or `<button>` when `active` is applied. Screen readers announce the item as the current location. Set `active` on the item matching the current URL on every page load, and avoid setting it on more than one item simultaneously.

When the sidebar is collapsed to icon-only mode, the toggle button updates `aria-label` and `aria-expanded` to reflect the current state. Navigation within the sidebar uses native DOM focus order — no roving tabindex — keeping behaviour predictable and compatible with all screen readers.

### Keyboard Navigation

| Key     | Behavior                                                 |
| ------- | -------------------------------------------------------- |
| `Tab`   | Moves focus to the next focusable item in DOM order      |
| `Enter` | Activates a focused item or toggles a collapsible header |
| `Space` | Same as `Enter` on collapsible group headers             |
