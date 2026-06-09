# Sidebar

A collapsible navigation sidebar with labelled groups and individual items. It uses the same frosted panel surface treatment as the drawer, while still supporting icon-only collapse mode, keyboard navigation, and full ARIA compliance.

## Features

- <sg-icon name="folder-open" size="16"></sg-icon> **3 Sub-components**: `sg-sidebar`, `sg-sidebar-group`, `sg-sidebar-item`
- <sg-icon name="refresh-cw" size="16"></sg-icon> **Collapsible**: smooth icon-only mode with animated width transition
- <sg-icon name="palette" size="16"></sg-icon> **3 Variants**: default (drawer-style panel), floating (rounded elevated panel), inset (subtle background)
- <sg-icon name="link" size="16"></sg-icon> **Link or button**: `sg-sidebar-item` renders an `<a>` when `href` is set, otherwise a `<button>`
- <sg-icon name="map-pin" size="16"></sg-icon> **Active indicator**: visual pill indicator for the current page item
- <sg-icon name="circle-dot" size="16"></sg-icon> **Collapsible groups**: native `<details>/<summary>` interaction with optional toggle event
- <sg-icon name="accessibility" size="16"></sg-icon> **Accessible**: `role="navigation"`, `aria-current="page"`, `aria-expanded`, keyboard navigation
- <sg-icon name="keyboard" size="16"></sg-icon> **Imperative API**: `setCollapsed(next)`, `toggle()` methods on the element

## Source Code

::: details View Source Code
<<< @/../packages/sigil/src/layout/sidebar/sidebar.ts
:::

## Basic Usage

Wrap groups and items inside `sg-sidebar`. Mark the current page with `active`.

```html
<sg-sidebar label="App navigation">
  <sg-sidebar-group label="Main">
    <sg-sidebar-item href="/dashboard" active>Dashboard</sg-sidebar-item>
    <sg-sidebar-item href="/projects">Projects</sg-sidebar-item>
    <sg-sidebar-item href="/settings">Settings</sg-sidebar-item>
  </sg-sidebar-group>
</sg-sidebar>
```

## Collapsible Sidebar

Add the `collapsible` attribute to show the collapse toggle button. Items will animate to icon-only mode when collapsed.

<ComponentPreview>

```html
<sg-grid
  areas="'sidebar main'"
  fullwidth
  gap="none"
  style="height: 400px; --grid-cols: auto 1fr; border: 1px solid var(--color-contrast-200); border-radius: var(--rounded-lg); overflow: hidden;">
  <sg-sidebar collapsible label="App navigation" style="grid-area: sidebar;">
    <sg-icon slot="logo" name="rocket" size="24"></sg-icon>
    <span slot="header">My App</span>
    <sg-sidebar-group label="Main">
      <sg-sidebar-item href="#" active>
        <sg-icon slot="icon" name="home" size="18"></sg-icon>
        Dashboard
      </sg-sidebar-item>
      <sg-sidebar-item href="#">
        <sg-icon slot="icon" name="folder" size="18"></sg-icon>
        Projects
      </sg-sidebar-item>
      <sg-sidebar-item href="#">
        <sg-icon slot="icon" name="settings" size="18"></sg-icon>
        Settings
      </sg-sidebar-item>
    </sg-sidebar-group>
  </sg-sidebar>
  <main style="grid-area: main; padding: var(--size-4);">Main content area</main>
</sg-grid>
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

    .sidebar-shell-preview .shell-grid > sg-grid-item {
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

  <sg-navbar sticky breakpoint="(max-width: 640px)" mobile-sidebar="#docs-shell-sidebar" label="Workspace navigation">
    <span slot="logo" style="font-weight: var(--font-semibold);">Workspace</span>
    <sg-navbar-item slot="start" href="#" active>Dashboard</sg-navbar-item>
    <sg-navbar-item href="#">Projects</sg-navbar-item>
    <sg-navbar-item href="#">Reports</sg-navbar-item>
    <sg-navbar-item slot="end" href="#">Account</sg-navbar-item>
  </sg-navbar>

  <div class="shell-body">
    <sg-grid class="shell-grid" areas="'sidebar main'" fullwidth gap="none">
      <sg-grid-item area="sidebar">
        <sg-sidebar
          id="docs-shell-sidebar"
          class="shell-sidebar"
          container-breakpoints
          collapsible
          label="Workspace sidebar"
          responsive="(max-width: 1200px)"
          bottom-nav-at="(max-width: 640px)">
          <sg-icon slot="logo" name="rocket" size="20"></sg-icon>
          <span slot="header">Workspace</span>

          <sg-sidebar-item href="#" active>
            <sg-icon slot="icon" name="layout-dashboard" size="18"></sg-icon>
            Dashboard
          </sg-sidebar-item>
          <sg-sidebar-item href="#">
            <sg-icon slot="icon" name="folder" size="18"></sg-icon>
            Projects
          </sg-sidebar-item>
          <sg-sidebar-item href="#">
            <sg-icon slot="icon" name="bar-chart-3" size="18"></sg-icon>
            Reports
          </sg-sidebar-item>

          <sg-sidebar-group label="Admin" collapsible>
            <sg-sidebar-item href="#">
              <sg-icon slot="icon" name="users" size="18"></sg-icon>
              Team
            </sg-sidebar-item>
            <sg-sidebar-item href="#">
              <sg-icon slot="icon" name="settings" size="18"></sg-icon>
              Settings
            </sg-sidebar-item>
          </sg-sidebar-group>
        </sg-sidebar>
      </sg-grid-item>

      <sg-grid-item area="main" class="shell-content">
        <sg-text>
          Resize preview width: desktop uses full sidebar, tablet collapses, and mobile turns sidebar into bottom tabs.
          The navbar hamburger opens the mobile drawer.
        </sg-text>
      </sg-grid-item>
    </sg-grid>
  </div>
</div>
```

</ComponentPreview>

### Integration Notes

- Bottom navigation tabs are derived from direct `sg-sidebar-item` children only.
- `sg-sidebar-group` content remains available in the drawer opened by `openMobile()` or a linked `sg-navbar mobile-sidebar` trigger.
- Use `responsive` for tablet compact mode and `bottom-nav-at` for mobile bottom-nav mode.

## Groups

Use `sg-sidebar-group` to organize items into labelled sections. Add the `collapsible` attribute to allow toggling the group open/closed.

`sg-sidebar-group` now uses native `details/summary` semantics internally for simpler keyboard and accessibility behavior.

Set `default-open="false"` for uncontrolled groups that start collapsed, or pass `open` to control the group state externally.

<ComponentPreview>

```html
<sg-grid
  areas="'sidebar main'"
  fullwidth
  gap="none"
  style="height: 400px; --grid-cols: auto 1fr; border: 1px solid var(--color-contrast-200); border-radius: var(--rounded-lg); overflow: hidden;">
  <sg-sidebar label="App navigation" style="grid-area: sidebar;">
    <span slot="header">My App</span>
    <sg-sidebar-group label="Main">
      <sg-sidebar-item href="#" active>
        <sg-icon slot="icon" name="home" size="18"></sg-icon>
        Dashboard
      </sg-sidebar-item>
      <sg-sidebar-item href="#">
        <sg-icon slot="icon" name="chart-column" size="18"></sg-icon>
        Analytics
      </sg-sidebar-item>
    </sg-sidebar-group>
    <sg-sidebar-group label="Settings" collapsible open>
      <sg-sidebar-item href="#">
        <sg-icon slot="icon" name="user" size="18"></sg-icon>
        Profile
      </sg-sidebar-item>
      <sg-sidebar-item href="#">
        <sg-icon slot="icon" name="bell" size="18"></sg-icon>
        Notifications
      </sg-sidebar-item>
    </sg-sidebar-group>
  </sg-sidebar>
  <main style="grid-area: main; padding: var(--size-4);">Content area</main>
  </sg-grid>
  </div>
```

</ComponentPreview>

## Items with Badges

Use the `end` slot on `sg-sidebar-item` for trailing content such as notification counts or keyboard shortcuts.

<ComponentPreview>

```html
<sg-grid
  areas="'sidebar main'"
  fullwidth
  gap="none"
  style="height: 300px; --grid-cols: auto 1fr; border: 1px solid var(--color-contrast-200); border-radius: var(--rounded-lg); overflow: hidden;">
  <sg-sidebar label="App navigation" style="grid-area: sidebar;">
    <sg-sidebar-group label="Inbox">
      <sg-sidebar-item href="#">
        <sg-icon slot="icon" name="inbox" size="18"></sg-icon>
        Inbox
        <sg-badge slot="end" color="primary">12</sg-badge>
      </sg-sidebar-item>
      <sg-sidebar-item href="#">
        <sg-icon slot="icon" name="star" size="18"></sg-icon>
        Starred
        <sg-badge slot="end">4</sg-badge>
      </sg-sidebar-item>
      <sg-sidebar-item href="#">
        <sg-icon slot="icon" name="trash-2" size="18"></sg-icon>
        Trash
      </sg-sidebar-item>
    </sg-sidebar-group>
  </sg-sidebar>
  <main style="grid-area: main; padding: var(--size-4);">Content area</main>
</sg-grid>
```

</ComponentPreview>

## Variants

### Floating

Uses the same drawer-inspired panel surface with a stronger floating presentation, rounded corners, and more separation from the page background.

<ComponentPreview>

```html
<sg-grid
  areas="'sidebar main'"
  fullwidth
  gap="sm"
  style="height: 300px; --grid-cols: auto 1fr; background: var(--color-contrast-50); overflow: hidden; padding: var(--size-2);">
  <sg-sidebar variant="floating" label="Floating sidebar" style="grid-area: sidebar;">
    <sg-sidebar-group label="Navigation">
      <sg-sidebar-item href="#" active>
        <sg-icon slot="icon" name="home" size="18"></sg-icon>
        Home
      </sg-sidebar-item>
      <sg-sidebar-item href="#">
        <sg-icon slot="icon" name="folder" size="18"></sg-icon>
        Files
      </sg-sidebar-item>
    </sg-sidebar-group>
  </sg-sidebar>
  <div style="grid-area: main; padding: var(--size-4);">Content</div>
</sg-grid>
```

</ComponentPreview>

### Inset

A subtle variant with a slightly tinted background and no visible border or elevated panel shadow — blends naturally into page content areas.

<ComponentPreview>

```html
<sg-grid areas="'sidebar main'" fullwidth gap="none" style="height: 300px; --grid-cols: auto 1fr; overflow: hidden;">
  <sg-sidebar variant="inset" label="Inset sidebar" style="grid-area: sidebar;">
    <sg-sidebar-group label="Navigation">
      <sg-sidebar-item href="#" active>
        <sg-icon slot="icon" name="home" size="18"></sg-icon>
        Home
      </sg-sidebar-item>
      <sg-sidebar-item href="#">
        <sg-icon slot="icon" name="folder" size="18"></sg-icon>
        Files
      </sg-sidebar-item>
    </sg-sidebar-group>
  </sg-sidebar>
  <div style="grid-area: main; padding: var(--size-4);">Content</div>
</sg-grid>
```

</ComponentPreview>

## Header and Footer Slots

Use `slot="logo"` for the logo/icon and `slot="header"` for the app name or branding text. Use `slot="footer"` for user profile or secondary actions.

<ComponentPreview>

```html
<sg-grid
  areas="'sidebar main'"
  fullwidth
  gap="none"
  style="height: 400px; --grid-cols: auto 1fr; border: 1px solid var(--color-contrast-200); border-radius: var(--rounded-lg); overflow: hidden;">
  <sg-sidebar label="App sidebar" style="grid-area: sidebar;">
    <sg-icon slot="logo" name="rocket" size="24"></sg-icon>
    <span slot="header">MyApp</span>

    <sg-sidebar-group label="Navigation">
      <sg-sidebar-item href="#" active>
        <sg-icon slot="icon" name="home" size="18"></sg-icon>
        Dashboard
      </sg-sidebar-item>
      <sg-sidebar-item href="#">
        <sg-icon slot="icon" name="users" size="18"></sg-icon>
        Team
      </sg-sidebar-item>
    </sg-sidebar-group>

    <div
      slot="footer"
      style="display: flex; align-items: center; gap: var(--size-2); font-size: var(--text-sm); color: var(--color-contrast-600);">
      <sg-sidebar-item href="#">
        <sg-icon slot="icon" name="settings" size="18"></sg-icon>
        Config
      </sg-sidebar-item>
    </div>
  </sg-sidebar>
  <main style="grid-area: main; padding: var(--size-4);">Content area</main>
</sg-grid>
```

</ComponentPreview>

> **Note:** The sidebar header now supports a dedicated `logo` slot for the logo/icon, and a `header` slot for the app name or branding text. When collapsed, only the logo/icon is shown above the toggle button.

## Disabled Items

Set `disabled` on a `sg-sidebar-item` to prevent interaction.

<ComponentPreview>

```html
<sg-grid
  areas="'sidebar main'"
  fullwidth
  gap="none"
  style="--grid-cols: auto 1fr; border: 1px solid var(--color-contrast-200); border-radius: var(--rounded-lg); overflow: hidden;">
  <sg-sidebar label="App navigation" style="grid-area: sidebar;">
    <sg-sidebar-group label="Options">
      <sg-sidebar-item href="/available">
        <sg-icon slot="icon" name="check-circle" size="18"></sg-icon>
        Available
      </sg-sidebar-item>
      <sg-sidebar-item href="/locked" disabled>
        <sg-icon slot="icon" name="lock" size="18"></sg-icon>
        Locked (disabled)
      </sg-sidebar-item>
    </sg-sidebar-group>
  </sg-sidebar>
  <main style="grid-area: main; padding: var(--size-4);">Content area</main>
</sg-grid>
```

</ComponentPreview>

## External Links

When linking to external resources, use `target` and `rel` attributes on `sg-sidebar-item`.

```html
<sg-sidebar-item href="https://example.com" target="_blank" rel="noopener noreferrer">
  <sg-icon slot="icon" name="globe" size="18"></sg-icon>
  External Docs
</sg-sidebar-item>
```

## Imperative API

Collapse methods are exposed on the element instance.

```js
const sidebar = document.querySelector('sg-sidebar');

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
const sidebar = document.querySelector('sg-sidebar');

sidebar.addEventListener('collapsed-change', (e) => {
  console.log('Collapsed:', e.detail.collapsed, 'source:', e.detail.source);
});

sidebar.addEventListener('mobile-open-change', (e) => {
  console.log('Mobile drawer open:', e.detail.open, 'source:', e.detail.source);
});

const group = document.querySelector('sg-sidebar-group[collapsible]');

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
sg-sidebar {
  --sidebar-width: 18rem; /* expanded width */
  --sidebar-collapsed-width: 4rem; /* collapsed width */
  --sidebar-bg: var(--color-canvas); /* sidebar background */
  --sidebar-border-color: var(--color-contrast-300);
}

sg-sidebar-item {
  --sidebar-item-color: var(--color-contrast-700);
  --sidebar-item-hover-bg: var(--color-contrast-100);
  --sidebar-item-hover-color: var(--color-contrast-900);
  --sidebar-item-active-bg: color-mix(in srgb, var(--color-primary) 12%, transparent);
  --sidebar-item-active-color: var(--color-primary);
  --sidebar-item-indicator: var(--color-primary);
}
```

## API Reference

### `sg-sidebar` Attributes

| Attribute           | Type      | Default                | Description                                                  |
| ------------------- | --------- | ---------------------- | ------------------------------------------------------------ |
| `collapsed`         | `boolean` | —                      | Controlled collapsed state                                   |
| `default-collapsed` | `boolean` | `false`                | Initial collapsed state in uncontrolled mode                 |
| `collapsible`       | `boolean` | `false`                | Shows the collapse/expand toggle button in the header        |
| `responsive`        | `string`  | —                      | Media query that enables compact (collapsed) sidebar mode    |
| `bottom-nav-at`     | `string`  | —                      | Media query that switches to mobile bottom-nav + drawer mode |
| `variant`           | `string`  | —                      | Visual variant: `'floating'` \| `'inset'`                    |
| `label`             | `string`  | `'Sidebar navigation'` | `aria-label` for the `<nav>` landmark                        |

### `sg-sidebar` Slots

| Slot      | Description                                      |
| --------- | ------------------------------------------------ |
| `logo`    | Logo or icon, always visible at the top          |
| `header`  | App name or branding text, hidden when collapsed |
| (default) | `sg-sidebar-group` or `sg-sidebar-item` elements |
| `footer`  | User info, theme toggles, or secondary actions   |

### `sg-sidebar` Events

| Event                | Detail                                                              | Description                                         |
| -------------------- | ------------------------------------------------------------------- | --------------------------------------------------- |
| `collapsed-change`   | `{ collapsed: boolean; source: 'toggle' \| 'responsive' \| 'api' }` | Fired when a collapse state change is requested     |
| `mobile-open-change` | `{ open: boolean; source: 'toggle' \| 'responsive' \| 'api' }`      | Fired when the bottom-nav drawer open state changes |

### `sg-sidebar` Methods

| Method               | Description                         |
| -------------------- | ----------------------------------- |
| `setCollapsed(next)` | Set collapsed state                 |
| `toggle()`           | Toggle between collapsed / expanded |
| `openMobile()`       | Open the bottom-nav drawer          |
| `closeMobile()`      | Close the bottom-nav drawer         |
| `toggleMobile()`     | Toggle the bottom-nav drawer        |

### `sg-sidebar` CSS Custom Properties

| Property                    | Description                 | Default  |
| --------------------------- | --------------------------- | -------- |
| `--sidebar-width`           | Expanded width              | `16rem`  |
| `--sidebar-collapsed-width` | Collapsed (icon-only) width | `3.5rem` |
| `--sidebar-bg`              | Sidebar background color    | canvas   |
| `--sidebar-border-color`    | Border / divider color      | contrast |

---

### `sg-sidebar-group` Attributes

| Attribute      | Type      | Default | Description                                               |
| -------------- | --------- | ------- | --------------------------------------------------------- |
| `label`        | `string`  | `''`    | Visible group label text                                  |
| `collapsible`  | `boolean` | `false` | Adds a toggle button to collapse/expand the group's items |
| `default-open` | `boolean` | `true`  | Initial open state for uncontrolled collapsible groups    |
| `open`         | `boolean` | —       | Controlled group open state                               |

### `sg-sidebar-group` Slots

| Slot      | Description                                 |
| --------- | ------------------------------------------- |
| `icon`    | Optional icon displayed in the group header |
| (default) | `sg-sidebar-item` elements                  |

### `sg-sidebar-group` Events

| Event    | Detail              | Description                               |
| -------- | ------------------- | ----------------------------------------- |
| `toggle` | `{ open: boolean }` | Fired when a collapsible group is toggled |

---

### `sg-sidebar-item` Attributes

| Attribute  | Type      | Default | Description                                                |
| ---------- | --------- | ------- | ---------------------------------------------------------- |
| `href`     | `string`  | —       | URL — renders an `<a>` when set, otherwise a `<button>`    |
| `active`   | `boolean` | `false` | Marks the item as the current page (`aria-current="page"`) |
| `disabled` | `boolean` | `false` | Disables the item and forces button rendering              |
| `rel`      | `string`  | —       | `rel` attribute on the inner `<a>` (link items only)       |
| `target`   | `string`  | —       | `target` attribute on the inner `<a>` (link items only)    |

### `sg-sidebar-item` Slots

| Slot      | Description                                          |
| --------- | ---------------------------------------------------- |
| `icon`    | Leading icon (hidden from assistive tech)            |
| (default) | Item label text                                      |
| `end`     | Trailing content: badge, shortcut key, chevron, etc. |

### `sg-sidebar-item` Parts

| Part         | Description                           |
| ------------ | ------------------------------------- |
| `item`       | The inner `<a>` or `<button>` element |
| `item-icon`  | The icon slot wrapper                 |
| `item-label` | The label text wrapper                |
| `item-end`   | The trailing content wrapper          |

### `sg-sidebar-item` CSS Custom Properties

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

### Navigation Landmark

The `sg-sidebar` element renders a `<nav>` landmark with an `aria-label`. When a page has multiple navigation regions, ensure each has a unique descriptive label:

```html
<sg-sidebar label="Main navigation">…</sg-sidebar> <sg-sidebar label="Documentation sidebar">…</sg-sidebar>
```

### Current Page

`sg-sidebar-item` sets `aria-current="page"` on the inner `<a>` or `<button>` when `active` is applied. Screen readers announce the item as the current location.

### Collapsed State

When the sidebar is collapsed to icon-only mode:

- Text labels are visually hidden (opacity 0, width 0) but the structural DOM remains accessible.
- The toggle button updates `aria-label` and `aria-expanded` to reflect the current state.
- Items remain keyboard reachable; only the visual label is hidden.

**Best practice:** pair icon-only collapsed items with tooltips using `sg-tooltip` to surface the label for sighted keyboard and pointer users.

### Collapsible Groups

Collapsible group headers receive `role="button"`, `tabindex="0"`, and `aria-expanded` so they can be activated via keyboard (`Enter` or `Space`). The item list is hidden with the `hidden` attribute when closed.

### Keyboard Navigation

| Key     | Behavior                                                 |
| ------- | -------------------------------------------------------- |
| `Tab`   | Moves focus to the next focusable item in DOM order      |
| `Enter` | Activates a focused item or toggles a collapsible header |
| `Space` | Same as `Enter` on collapsible group headers             |

Navigation within the sidebar uses native DOM focus order — no roving tabindex. This keeps behaviour predictable and compatible with all screen readers.

## Best Practices

**Do:**

- Provide a descriptive `label` on `sg-sidebar` when the page has other `<nav>` elements.
- Set `active` on the item matching the current URL on every page load.
- Use `sg-sidebar-group` to group semantically related items — it adds a visible label and an implicit `role="list"` on the items container.
- Add tooltips to icon-only items when the sidebar can collapse.

**Don't:**

- Nest `sg-sidebar` inside another `sg-sidebar`.
- Set `active` on more than one item simultaneously — it breaks `aria-current` semantics.
- Use `disabled` as a teaching mechanism. If an item is permanently unavailable, remove it from the sidebar.
