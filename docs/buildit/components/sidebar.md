# Sidebar

A collapsible navigation sidebar with labelled groups and individual items. Renders a semantic `<nav>` landmark and supports icon-only collapse mode, keyboard navigation, and full ARIA compliance.

## Features

- 🗂️ **3 Sub-components**: `bit-sidebar`, `bit-sidebar-group`, `bit-sidebar-item`
- 🔄 **Collapsible**: smooth icon-only mode with animated width transition
- 🎨 **3 Variants**: default (bordered), floating (shadowed), inset (subtle background)
- 🔗 **Link or button**: `bit-sidebar-item` renders an `<a>` when `href` is set, otherwise a `<button>`
- 📌 **Active indicator**: visual pill indicator for the current page item
- 🔘 **Collapsible groups**: optional accordion-style group headers
- ♿ **Accessible**: `role="navigation"`, `aria-current="page"`, `aria-expanded`, keyboard navigation
- ⌨️ **Imperative API**: `collapse()`, `expand()`, `toggle()` methods on the element

## Source Code

::: details View Source Code
<<< @/../packages/buildit/src/layout/sidebar/sidebar.ts
:::

## Basic Usage

Wrap groups and items inside `bit-sidebar`. Mark the current page with `active`.

```html
<bit-sidebar label="App navigation">
  <bit-sidebar-group label="Main">
    <bit-sidebar-item href="/dashboard" active>Dashboard</bit-sidebar-item>
    <bit-sidebar-item href="/projects">Projects</bit-sidebar-item>
    <bit-sidebar-item href="/settings">Settings</bit-sidebar-item>
  </bit-sidebar-group>
</bit-sidebar>

<script type="module">
  import '@vielzeug/buildit/sidebar';
</script>
```

## Collapsible Sidebar

Add the `collapsible` attribute to show the collapse toggle button. Items will animate to icon-only mode when collapsed.

<ComponentPreview>

```html
<bit-grid
  areas="'sidebar main'"
  fullwidth
  gap="none"
  style="height: 400px; --grid-cols: auto 1fr; border: 1px solid var(--color-contrast-200); border-radius: var(--rounded-lg); overflow: hidden;">
  <bit-sidebar collapsible label="App navigation" style="grid-area: sidebar;">
    <span slot="header">My App</span>
    <bit-sidebar-group label="Main">
      <bit-sidebar-item href="#" active>
        <span slot="icon">🏠</span>
        Dashboard
      </bit-sidebar-item>
      <bit-sidebar-item href="#">
        <span slot="icon">📁</span>
        Projects
      </bit-sidebar-item>
      <bit-sidebar-item href="#">
        <span slot="icon">⚙️</span>
        Settings
      </bit-sidebar-item>
    </bit-sidebar-group>
  </bit-sidebar>
  <main style="grid-area: main; padding: var(--size-4);">Main content area</main>
</bit-grid>
```

</ComponentPreview>

## Groups

Use `bit-sidebar-group` to organize items into labelled sections. Add the `collapsible` attribute to allow toggling the group open/closed.

<ComponentPreview>

```html
<bit-grid
  areas="'sidebar main'"
  fullwidth
  gap="none"
  style="height: 400px; --grid-cols: auto 1fr; border: 1px solid var(--color-contrast-200); border-radius: var(--rounded-lg); overflow: hidden;">
  <bit-sidebar label="App navigation" style="grid-area: sidebar;">
    <bit-sidebar-group label="Main">
      <bit-sidebar-item href="#" active>
        <span slot="icon">🏠</span>
        Dashboard
      </bit-sidebar-item>
      <bit-sidebar-item href="#">
        <span slot="icon">📊</span>
        Analytics
      </bit-sidebar-item>
    </bit-sidebar-group>
    <bit-sidebar-group label="Settings" collapsible open>
      <bit-sidebar-item href="#">
        <span slot="icon">👤</span>
        Profile
      </bit-sidebar-item>
      <bit-sidebar-item href="#">
        <span slot="icon">🔔</span>
        Notifications
      </bit-sidebar-item>
    </bit-sidebar-group>
  </bit-sidebar>
  <main style="grid-area: main; padding: var(--size-4);">Content area</main>
</bit-grid>
```

</ComponentPreview>

## Items with Badges

Use the `end` slot on `bit-sidebar-item` for trailing content such as notification counts or keyboard shortcuts.

<ComponentPreview>

```html
<bit-grid
  areas="'sidebar main'"
  fullwidth
  gap="none"
  style="height: 300px; --grid-cols: auto 1fr; border: 1px solid var(--color-contrast-200); border-radius: var(--rounded-lg); overflow: hidden;">
  <bit-sidebar label="App navigation" style="grid-area: sidebar;">
    <bit-sidebar-group label="Inbox">
      <bit-sidebar-item href="#">
        <span slot="icon">📬</span>
        Inbox
        <bit-badge slot="end" color="primary">12</bit-badge>
      </bit-sidebar-item>
      <bit-sidebar-item href="#">
        <span slot="icon">⭐</span>
        Starred
        <bit-badge slot="end">4</bit-badge>
      </bit-sidebar-item>
      <bit-sidebar-item href="#">
        <span slot="icon">🗑️</span>
        Trash
      </bit-sidebar-item>
    </bit-sidebar-group>
  </bit-sidebar>
  <main style="grid-area: main; padding: var(--size-4);">Content area</main>
</bit-grid>
```

</ComponentPreview>

## Variants

### Floating

Elevates the sidebar with a shadow and rounded corners — suited for dashboard shells where the sidebar floats over the background.

<ComponentPreview>

```html
<bit-grid
  areas="'sidebar main'"
  fullwidth
  gap="sm"
  style="height: 300px; --grid-cols: auto 1fr; background: var(--color-contrast-50); overflow: hidden; padding: var(--size-2);">
  <bit-sidebar variant="floating" label="Floating sidebar" style="grid-area: sidebar;">
    <bit-sidebar-group label="Navigation">
      <bit-sidebar-item href="#" active>
        <span slot="icon">🏠</span>
        Home
      </bit-sidebar-item>
      <bit-sidebar-item href="#">
        <span slot="icon">📁</span>
        Files
      </bit-sidebar-item>
    </bit-sidebar-group>
  </bit-sidebar>
  <div style="grid-area: main; padding: var(--size-4);">Content</div>
</bit-grid>
```

</ComponentPreview>

### Inset

A subtle variant with a slightly tinted background and no visible border — blends naturally into page content areas.

<ComponentPreview>

```html
<bit-grid areas="'sidebar main'" fullwidth gap="none" style="height: 300px; --grid-cols: auto 1fr; overflow: hidden;">
  <bit-sidebar variant="inset" label="Inset sidebar" style="grid-area: sidebar;">
    <bit-sidebar-group label="Navigation">
      <bit-sidebar-item href="#" active>
        <span slot="icon">🏠</span>
        Home
      </bit-sidebar-item>
      <bit-sidebar-item href="#">
        <span slot="icon">📁</span>
        Files
      </bit-sidebar-item>
    </bit-sidebar-group>
  </bit-sidebar>
  <div style="grid-area: main; padding: var(--size-4);">Content</div>
</bit-grid>
```

</ComponentPreview>

## Header and Footer Slots

Use `slot="header"` for branding (logo, app name) and `slot="footer"` for user profile or secondary actions.

<ComponentPreview>

```html
<bit-grid
  areas="'sidebar main'"
  fullwidth
  gap="none"
  style="height: 400px; --grid-cols: auto 1fr; border: 1px solid var(--color-contrast-200); border-radius: var(--rounded-lg); overflow: hidden;">
  <bit-sidebar label="App sidebar" style="grid-area: sidebar;">
    <div slot="header" style="display: flex; align-items: center; gap: var(--size-2); font-weight: var(--font-bold);">
      <span>🚀</span>
      <span>MyApp</span>
    </div>

    <bit-sidebar-group label="Navigation">
      <bit-sidebar-item href="#" active>
        <span slot="icon">🏠</span>
        Dashboard
      </bit-sidebar-item>
      <bit-sidebar-item href="#">
        <span slot="icon">👥</span>
        Team
      </bit-sidebar-item>
    </bit-sidebar-group>

    <div
      slot="footer"
      style="display: flex; align-items: center; gap: var(--size-2); font-size: var(--text-sm); color: var(--color-contrast-600);">
      <bit-sidebar-item href="#">
        <span slot="icon">⚙️</span>
        Config
      </bit-sidebar-item>
    </div>
  </bit-sidebar>
  <main style="grid-area: main; padding: var(--size-4);">Content area</main>
</bit-grid>
```

</ComponentPreview>

## Disabled Items

Set `disabled` on a `bit-sidebar-item` to prevent interaction.

<ComponentPreview>

```html
<bit-grid
  areas="'sidebar main'"
  fullwidth
  gap="none"
  style="--grid-cols: auto 1fr; border: 1px solid var(--color-contrast-200); border-radius: var(--rounded-lg); overflow: hidden;">
  <bit-sidebar label="App navigation" style="grid-area: sidebar;">
    <bit-sidebar-group label="Options">
      <bit-sidebar-item href="/available">Available</bit-sidebar-item>
      <bit-sidebar-item href="/locked" disabled>Locked (disabled)</bit-sidebar-item>
    </bit-sidebar-group>
  </bit-sidebar>
  <main style="grid-area: main; padding: var(--size-4);">Content area</main>
</bit-grid>
```

</ComponentPreview>

## External Links

When linking to external resources, use `target` and `rel` attributes on `bit-sidebar-item`.

```html
<bit-sidebar-item href="https://example.com" target="_blank" rel="noopener noreferrer">
  <span slot="icon">🌐</span>
  External Docs
</bit-sidebar-item>
```

## Imperative API

All collapse state methods are exposed on the element instance.

```js
const sidebar = document.querySelector('bit-sidebar');

sidebar.collapse(); // collapse to icon-only
sidebar.expand(); // expand to full width
sidebar.toggle(); // toggle between states
```

## Events

```js
const sidebar = document.querySelector('bit-sidebar');

sidebar.addEventListener('collapse', () => {
  console.log('Sidebar collapsed');
});

sidebar.addEventListener('expand', () => {
  console.log('Sidebar expanded');
});

const group = document.querySelector('bit-sidebar-group[collapsible]');

group.addEventListener('toggle', (e) => {
  console.log('Group open:', e.detail.open);
});
```

## CSS Customization

### Global Variables

Override these CSS custom properties in your stylesheet to restyle the sidebar globally:

```css
bit-sidebar {
  --sidebar-width: 18rem; /* expanded width */
  --sidebar-collapsed-width: 4rem; /* collapsed width */
  --sidebar-bg: var(--color-canvas); /* sidebar background */
  --sidebar-border-color: var(--color-contrast-300);
}

bit-sidebar-item {
  --sidebar-item-color: var(--color-contrast-700);
  --sidebar-item-hover-bg: var(--color-contrast-100);
  --sidebar-item-hover-color: var(--color-contrast-900);
  --sidebar-item-active-bg: color-mix(in srgb, var(--color-primary) 12%, transparent);
  --sidebar-item-active-color: var(--color-primary);
  --sidebar-item-indicator: var(--color-primary);
}
```

## API Reference

### `bit-sidebar` Attributes

| Attribute     | Type      | Default                | Description                                              |
| ------------- | --------- | ---------------------- | -------------------------------------------------------- |
| `collapsed`   | `boolean` | `false`                | Collapses the sidebar to icon-only mode                  |
| `collapsible` | `boolean` | `false`                | Shows the collapse/expand toggle button in the header    |
| `variant`     | `string`  | `'default'`            | Visual variant: `'default'` \| `'floating'` \| `'inset'` |
| `label`       | `string`  | `'Sidebar navigation'` | `aria-label` for the `<nav>` landmark                    |

### `bit-sidebar` Slots

| Slot      | Description                                        |
| --------- | -------------------------------------------------- |
| `header`  | Branding, logo, or app name — displayed at the top |
| (default) | `bit-sidebar-group` or `bit-sidebar-item` elements |
| `footer`  | User info, theme toggles, or secondary actions     |

### `bit-sidebar` Events

| Event      | Detail      | Description                      |
| ---------- | ----------- | -------------------------------- |
| `collapse` | `undefined` | Fired when the sidebar collapses |
| `expand`   | `undefined` | Fired when the sidebar expands   |

### `bit-sidebar` Methods

| Method       | Description                         |
| ------------ | ----------------------------------- |
| `collapse()` | Collapse the sidebar                |
| `expand()`   | Expand the sidebar                  |
| `toggle()`   | Toggle between collapsed / expanded |

### `bit-sidebar` CSS Custom Properties

| Property                    | Description                 | Default  |
| --------------------------- | --------------------------- | -------- |
| `--sidebar-width`           | Expanded width              | `16rem`  |
| `--sidebar-collapsed-width` | Collapsed (icon-only) width | `3.5rem` |
| `--sidebar-bg`              | Sidebar background color    | canvas   |
| `--sidebar-border-color`    | Border / divider color      | contrast |

---

### `bit-sidebar-group` Attributes

| Attribute     | Type      | Default | Description                                                  |
| ------------- | --------- | ------- | ------------------------------------------------------------ |
| `label`       | `string`  | `''`    | Visible group label text                                     |
| `collapsible` | `boolean` | `false` | Adds a toggle button to collapse/expand the group's items    |
| `open`        | `boolean` | `true`  | Group open state (only meaningful when `collapsible` is set) |

### `bit-sidebar-group` Slots

| Slot      | Description                                 |
| --------- | ------------------------------------------- |
| `icon`    | Optional icon displayed in the group header |
| (default) | `bit-sidebar-item` elements                 |

### `bit-sidebar-group` Events

| Event    | Detail              | Description                               |
| -------- | ------------------- | ----------------------------------------- |
| `toggle` | `{ open: boolean }` | Fired when a collapsible group is toggled |

---

### `bit-sidebar-item` Attributes

| Attribute  | Type      | Default | Description                                                              |
| ---------- | --------- | ------- | ------------------------------------------------------------------------ |
| `href`     | `string`  | —       | URL — renders an `<a>` when set, otherwise a `<button>`                  |
| `active`   | `boolean` | `false` | Marks the item as the current page (`aria-current="page"`)               |
| `disabled` | `boolean` | `false` | Disables the item (sets `disabled` on button, `aria-disabled` on anchor) |
| `rel`      | `string`  | —       | `rel` attribute on the inner `<a>` (link items only)                     |
| `target`   | `string`  | —       | `target` attribute on the inner `<a>` (link items only)                  |

### `bit-sidebar-item` Slots

| Slot      | Description                                          |
| --------- | ---------------------------------------------------- |
| `icon`    | Leading icon (hidden from assistive tech)            |
| (default) | Item label text                                      |
| `end`     | Trailing content: badge, shortcut key, chevron, etc. |

### `bit-sidebar-item` Parts

| Part         | Description                           |
| ------------ | ------------------------------------- |
| `item`       | The inner `<a>` or `<button>` element |
| `item-icon`  | The icon slot wrapper                 |
| `item-label` | The label text wrapper                |
| `item-end`   | The trailing content wrapper          |

### `bit-sidebar-item` CSS Custom Properties

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

The `bit-sidebar` element renders a `<nav>` landmark with an `aria-label`. When a page has multiple navigation regions, ensure each has a unique descriptive label:

```html
<bit-sidebar label="Main navigation">…</bit-sidebar> <bit-sidebar label="Documentation sidebar">…</bit-sidebar>
```

### Current Page

`bit-sidebar-item` sets `aria-current="page"` on the inner `<a>` or `<button>` when `active` is applied. Screen readers announce the item as the current location.

### Collapsed State

When the sidebar is collapsed to icon-only mode:

- Text labels are visually hidden (opacity 0, width 0) but the structural DOM remains accessible.
- The toggle button updates `aria-label` and `aria-expanded` to reflect the current state.
- Items remain keyboard reachable; only the visual label is hidden.

**Best practice:** pair icon-only collapsed items with tooltips using `bit-tooltip` to surface the label for sighted keyboard and pointer users.

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

- Provide a descriptive `label` on `bit-sidebar` when the page has other `<nav>` elements.
- Set `active` on the item matching the current URL on every page load.
- Use `bit-sidebar-group` to group semantically related items — it adds a visible label and an implicit `role="list"` on the items container.
- Add tooltips to icon-only items when the sidebar can collapse.

**Don't:**

- Nest `bit-sidebar` inside another `bit-sidebar`.
- Set `active` on more than one item simultaneously — it breaks `aria-current` semantics.
- Use `disabled` as a teaching mechanism. If an item is permanently unavailable, remove it from the sidebar.
