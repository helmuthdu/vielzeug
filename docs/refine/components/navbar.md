# Navbar

A responsive navigation bar with desktop and mobile layouts, plus sticky and floating modes. It includes a dedicated mobile menu slot and supports a floating-to-full-width transition when `floating` and `sticky` are used together.

## Position Modes

### Sticky

<ComponentPreview>

```html
<div
  style="height: 220px; width: 100%; overflow: auto; border: 1px solid var(--color-contrast-200); border-radius: var(--rounded-lg);">
  <ore-navbar sticky label="Main navigation">
    <span slot="logo" style="font-weight: var(--font-semibold);">Brand</span>
    <ore-navbar-item href="#" active>Home</ore-navbar-item>
    <ore-navbar-item href="#">Docs</ore-navbar-item>
    <ore-navbar-item href="#">Pricing</ore-navbar-item>
  </ore-navbar>
  <div style="padding: var(--size-4); min-height: 420px;">
    <ore-text>Scroll this container to validate sticky behavior.</ore-text>
  </div>
</div>
```

</ComponentPreview>

### Floating

<ComponentPreview>

```html
<div
  class="navbar-floating-preview"
  style="height: 260px; width: 100%; position: relative; overflow: auto; border: 1px solid var(--color-contrast-200); border-radius: var(--rounded-lg);">
  <style>
    .navbar-floating-preview ore-navbar[data-mode='floating'] {
      position: absolute !important;
      inset-inline: var(--size-3) !important;
      top: var(--size-3) !important;
      width: calc(100% - var(--size-6)) !important;
      max-width: none !important;
    }
  </style>

  <ore-navbar floating variant="glass" label="Main navigation">
    <span slot="logo" style="font-weight: var(--font-semibold);">Brand</span>
    <ore-navbar-item href="#" active>Home</ore-navbar-item>
    <ore-navbar-item href="#">Docs</ore-navbar-item>
    <ore-navbar-item slot="end" href="#">Account</ore-navbar-item>

    <div slot="mobile-menu">
      <ore-navbar-item href="#" active>Home</ore-navbar-item>
      <ore-navbar-item href="#">Docs</ore-navbar-item>
      <ore-navbar-item href="#">Account</ore-navbar-item>
    </div>
  </ore-navbar>

  <div style="padding: var(--size-4); min-height: 420px;"></div>
</div>
```

</ComponentPreview>

### Floating + Sticky Transition

When both are set, the navbar starts as floating and switches to full-width sticky once page scroll passes `scroll-threshold`.

<ComponentPreview>

```html
<div
  class="navbar-floating-sticky-preview"
  style="height: 320px; width: 100%; position: relative; display: block; overflow: auto; border: 1px solid var(--color-contrast-200); border-radius: var(--rounded-lg);">
  <style>
    .navbar-floating-sticky-preview ore-navbar[data-mode='floating'] {
      position: absolute !important;
      inset-inline: var(--size-3) !important;
      top: var(--size-3) !important;
      width: calc(100% - var(--size-6)) !important;
      max-width: none !important;
      z-index: 2;
    }

    .navbar-floating-sticky-preview ore-navbar[data-mode='sticky'] {
      position: sticky !important;
      inset-inline: 0 !important;
      top: 0 !important;
      width: 100% !important;
      z-index: 3;
    }
  </style>

  <ore-navbar floating sticky scroll-threshold="48" label="Main navigation">
    <span slot="logo" style="font-weight: var(--font-semibold);">Brand</span>
    <ore-navbar-item href="#" active>Home</ore-navbar-item>
    <ore-navbar-item href="#">Docs</ore-navbar-item>
    <ore-navbar-item slot="end" href="#">Account</ore-navbar-item>

    <div slot="mobile-menu">
      <ore-navbar-item href="#" active>Home</ore-navbar-item>
      <ore-navbar-item href="#">Docs</ore-navbar-item>
      <ore-navbar-item href="#">Account</ore-navbar-item>
    </div>
  </ore-navbar>

  <div style="padding: var(--size-4); min-height: 640px;">
    <ore-text>Scroll this container to observe floating mode transition into sticky mode.</ore-text>
  </div>
</div>
```

</ComponentPreview>

## Navbar + Sidebar Integration

Recommended app-shell pattern:

- Desktop: keep `ore-sidebar` visible and use the navbar for top-level context/actions.
- Mobile: switch sidebar to bottom-nav mode and toggle its drawer from the navbar hamburger.
- Use `mobile-sidebar` on `ore-navbar` and `bottom-nav-at="(max-width: ... )"` on `ore-sidebar`.

<ComponentPreview>

```html
<div class="navbar-sidebar-shell">
  <style>
    .navbar-sidebar-shell {
      --shell-drawer-width: min(14rem, 42vw);
      --shell-push-gap: var(--size-1);
      position: relative;
      width: 100%;
      min-width: 0;
      height: 460px;
      overflow: hidden;
      border: 1px solid var(--color-contrast-200);
      border-radius: var(--rounded-lg);
    }

    .navbar-sidebar-shell .shell-grid {
      height: 100%;
      --grid-cols: auto minmax(0, 1fr);
    }

    .navbar-sidebar-shell .shell-grid > ore-grid-item {
      min-width: 0;
      min-height: 0;
    }

    .navbar-sidebar-shell .shell-sidebar {
      --sidebar-width: var(--shell-drawer-width);
      min-height: 0;
      z-index: 3;
    }

    .navbar-sidebar-shell .shell-panel {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      gap: var(--size-3);
      min-width: 0;
      min-height: 0;
      height: 100%;
      padding: var(--size-3);
      transition: transform var(--transition-normal);
      will-change: transform;
    }

    .navbar-sidebar-shell .shell-panel ore-navbar {
      position: relative;
      z-index: 5;
      flex-shrink: 0;
    }

    .navbar-sidebar-shell .shell-panel ore-navbar[data-mode='floating'] {
      position: relative !important;
      inset: auto !important;
      width: 100% !important;
      max-width: none !important;
      z-index: 6 !important;
    }

    .navbar-sidebar-shell .shell-content {
      flex: 1;
      min-width: 0;
      min-height: 0;
      padding: var(--size-4);
      overflow: auto;
    }

    .navbar-sidebar-shell .shell-grid:has(.shell-sidebar[data-bottom-nav][data-mobile-open]) .shell-panel {
      transform: translateX(calc(var(--shell-drawer-width) + var(--shell-push-gap)));
    }

    .navbar-sidebar-shell .shell-sidebar[variant='floating']:not([data-bottom-nav]) {
      margin: var(--size-3) 0 var(--size-3) var(--size-3);
    }

    .navbar-sidebar-shell
      .shell-grid:has(.shell-sidebar[variant='floating'][data-bottom-nav][data-mobile-open])
      .shell-panel {
      transform: translateX(calc(var(--shell-drawer-width) + var(--size-2) + var(--shell-push-gap)));
    }
  </style>

  <ore-grid class="shell-grid" areas="'sidebar panel'" fullwidth gap="none">
    <ore-grid-item area="sidebar">
      <ore-sidebar
        id="app-shell-sidebar"
        class="shell-sidebar"
        label="Workspace navigation"
        variant="floating"
        container-breakpoints
        responsive="(max-width: 1200px)"
        bottom-nav-at="(max-width: 640px)">
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
      </ore-sidebar>
    </ore-grid-item>

    <ore-grid-item area="panel" class="shell-panel">
      <ore-navbar
        floating
        variant="glass"
        breakpoint="(max-width: 640px)"
        container-breakpoints
        mobile-sidebar="#app-shell-sidebar"
        label="Workspace navigation">
        <span slot="logo" style="font-weight: var(--font-semibold);">Workspace</span>
        <ore-navbar-item slot="start" href="#" active>Dashboard</ore-navbar-item>
        <ore-navbar-item href="#">Projects</ore-navbar-item>
        <ore-navbar-item href="#">Reports</ore-navbar-item>
        <ore-navbar-item slot="end" href="#">Account</ore-navbar-item>
      </ore-navbar>

      <main class="shell-content">
        <ore-text
          >Desktop keeps the sidebar as a dedicated left rail while the right shell contains a floating navbar and
          content. On mobile, opening the sidebar drawer pushes the entire right shell sideways.</ore-text
        >
      </main>
    </ore-grid-item>
  </ore-grid>
</div>
```

</ComponentPreview>

## `ore-navbar-item`

`ore-navbar-item` renders as an anchor when `href` is set, otherwise as a button.

<ComponentPreview>

```html
<ore-navbar label="Item examples">
  <ore-navbar-item href="#" active>Dashboard</ore-navbar-item>
  <ore-navbar-item href="#">Settings</ore-navbar-item>
  <ore-navbar-item disabled>Billing (Unavailable)</ore-navbar-item>
</ore-navbar>
```

</ComponentPreview>

## Imperative API

```js
const navbar = document.querySelector('ore-navbar');

navbar.openMobileMenu();
navbar.closeMobileMenu();
navbar.toggleMobileMenu();
```

## Events

```js
const navbar = document.querySelector('ore-navbar');

navbar.addEventListener('mobile-menu-change', (e) => {
  console.log('Mobile menu open:', e.detail.open);
});
```

## API Reference

**`ore-navbar` Attributes**

| Attribute               | Type                                                                 | Default                | Description                                                                    |
| ----------------------- | -------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------ |
| `label`                 | `string`                                                             | `'Main navigation'`    | Accessible nav landmark label                                                  |
| `sticky`                | `boolean`                                                            | `false`                | Enables sticky mode                                                            |
| `floating`              | `boolean`                                                            | `false`                | Enables floating mode                                                          |
| `scroll-threshold`      | `number`                                                             | `80`                   | Scroll px threshold for floating+sticky transition                             |
| `breakpoint`            | `string`                                                             | `'(max-width: 768px)'` | Media query used for mobile mode                                               |
| `container-breakpoints` | `boolean`                                                            | `false`                | Evaluates parseable `max-width` breakpoints against the navbar container width |
| `variant`               | `'flat' \| 'solid' \| 'bordered' \| 'outline' \| 'glass' \| 'frost'` | —                      | Surface style variant                                                          |
| `color`                 | `ThemeColor`                                                         | —                      | Theme color                                                                    |
| `rounded`               | `RoundedSize`                                                        | —                      | Border radius token                                                            |
| `elevation`             | `'0' \| '1' \| '2' \| '3' \| '4' \| '5'`                             | —                      | Elevation shadow level                                                         |

**`ore-navbar` Parts**

| Part            | Description                    |
| --------------- | ------------------------------ |
| `nav`           | Outer `<nav>` landmark element |
| `bar`           | Main navbar row container      |
| `logo`          | Logo slot container            |
| `start`         | Leading (start) content region |
| `center`        | Center content region          |
| `end`           | Trailing (end) content region  |
| `mobile-toggle` | Mobile menu toggle button      |
| `mobile-menu`   | Mobile overflow panel          |

**`ore-navbar` Slots**

| Slot          | Description                          |
| ------------- | ------------------------------------ |
| `logo`        | Brand mark/logo                      |
| `start`       | Left-aligned desktop content         |
| (default)     | Center desktop content               |
| `end`         | Right-aligned desktop content        |
| `mobile-menu` | Mobile-only expandable content panel |

**`ore-navbar` Events**

| Event                | Detail              | Description                               |
| -------------------- | ------------------- | ----------------------------------------- |
| `mobile-menu-change` | `{ open: boolean }` | Fired when mobile menu open state changes |

**`ore-navbar` CSS Custom Properties**

| Property                     | Description                                       | Default         |
| ---------------------------- | ------------------------------------------------- | --------------- |
| `--navbar-height`            | Navbar bar height                                 | Theme-dependent |
| `--navbar-width`             | Max width of the navbar content                   | Theme-dependent |
| `--navbar-offset`            | Horizontal offset for floating/sticky positioning | Theme-dependent |
| `--navbar-bg`                | Navbar background color                           | Theme-dependent |
| `--navbar-color`             | Navbar text color                                 | Theme-dependent |
| `--navbar-border-color`      | Navbar border color                               | Theme-dependent |
| `--navbar-shadow`            | Navbar box shadow                                 | Theme-dependent |
| `--navbar-radius`            | Border radius (floating/sticky modes)             | Theme-dependent |
| `--navbar-backdrop-filter`   | Backdrop filter for blur effect                   | Theme-dependent |
| `--navbar-item-color`        | Nav item text color                               | Theme-dependent |
| `--navbar-item-hover-color`  | Nav item hover text color                         | Theme-dependent |
| `--navbar-item-hover-bg`     | Nav item hover background                         | Theme-dependent |
| `--navbar-item-active-color` | Nav item active/current text color                | Theme-dependent |
| `--navbar-item-active-bg`    | Nav item active/current background                | Theme-dependent |

**`ore-navbar-item` Attributes**

| Attribute  | Type      | Default | Description                                        |
| ---------- | --------- | ------- | -------------------------------------------------- |
| `href`     | `string`  | —       | Link URL (renders anchor when set)                 |
| `active`   | `boolean` | `false` | Marks item as current page (`aria-current="page"`) |
| `disabled` | `boolean` | `false` | Disables interaction                               |
| `rel`      | `string`  | —       | Link relationship when `href` is set               |
| `target`   | `string`  | —       | Link target when `href` is set                     |

**`ore-navbar-item` Slots**

| Slot      | Description               |
| --------- | ------------------------- |
| (default) | Item label text           |
| `icon`    | Optional leading icon     |
| `end`     | Optional trailing content |

**`ore-navbar-item` Parts**

| Part         | Description                               |
| ------------ | ----------------------------------------- |
| `item`       | Root clickable element (anchor or button) |
| `item-icon`  | Leading icon container                    |
| `item-label` | Label text container                      |
| `item-end`   | Trailing content container                |

## Related Components

- [Sidebar](./sidebar.md)
- [Menu](./menu.md)
- [Tabs](./tabs.md)
