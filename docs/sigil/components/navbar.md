# Navbar

A responsive navigation bar with desktop and mobile layouts, plus sticky and floating modes. It includes a dedicated mobile menu slot and supports a floating-to-full-width transition when `floating` and `sticky` are used together.

## Features

- 📱 **Responsive by default**: desktop and mobile layouts with configurable media query breakpoint
- 📌 **Sticky mode**: pins the navbar to the top of the viewport
- 🫧 **Floating mode**: detached top navbar with rounded panel styling
- 🔄 **Floating + Sticky transition**: starts floating, becomes full-width sticky when scrolling past `scroll-threshold`
- 🎛️ **Imperative API**: open/close/toggle mobile menu from code
- ♿ **Accessible semantics**: nav landmark label, expanded state, keyboard-close on Escape
- 🧩 **Composable slots**: `logo`, `start`, default, `end`, and `mobile-menu`

## Source Code

::: details View Source Code (Navbar)
<<< @/../packages/sigil/src/layout/navbar/navbar.ts
:::

## Basic Usage

<ComponentPreview>

```html
<sg-navbar label="Main navigation" sticky>
  <sg-navbar-item slot="start" href="#">Docs</sg-navbar-item>
  <sg-navbar-item href="#">Pricing</sg-navbar-item>
  <sg-navbar-item href="#">Blog</sg-navbar-item>
  <sg-navbar-item slot="end" href="#">Sign in</sg-navbar-item>
  <sg-navbar-item slot="end" href="#" active>Get started</sg-navbar-item>

  <div slot="mobile-menu">
    <sg-navbar-item href="#" active>Home</sg-navbar-item>
    <sg-navbar-item href="#">Docs</sg-navbar-item>
    <sg-navbar-item href="#">Pricing</sg-navbar-item>
    <sg-navbar-item href="#">Blog</sg-navbar-item>
  </div>
</sg-navbar>
```

</ComponentPreview>

## Position Modes

### Sticky

<ComponentPreview>

```html
<div
  style="height: 220px; width: 100%; overflow: auto; border: 1px solid var(--color-contrast-200); border-radius: var(--rounded-lg);">
  <sg-navbar sticky label="Main navigation">
    <span slot="logo" style="font-weight: var(--font-semibold);">Brand</span>
    <sg-navbar-item href="#" active>Home</sg-navbar-item>
    <sg-navbar-item href="#">Docs</sg-navbar-item>
    <sg-navbar-item href="#">Pricing</sg-navbar-item>
  </sg-navbar>
  <div style="padding: var(--size-4); min-height: 420px;">
    <sg-text>Scroll this container to validate sticky behavior.</sg-text>
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
    .navbar-floating-preview sg-navbar[data-mode='floating'] {
      position: absolute !important;
      inset-inline: var(--size-3) !important;
      top: var(--size-3) !important;
      width: calc(100% - var(--size-6)) !important;
      max-width: none !important;
    }
  </style>

  <sg-navbar floating variant="glass" label="Main navigation">
    <span slot="logo" style="font-weight: var(--font-semibold);">Brand</span>
    <sg-navbar-item href="#" active>Home</sg-navbar-item>
    <sg-navbar-item href="#">Docs</sg-navbar-item>
    <sg-navbar-item slot="end" href="#">Account</sg-navbar-item>

    <div slot="mobile-menu">
      <sg-navbar-item href="#" active>Home</sg-navbar-item>
      <sg-navbar-item href="#">Docs</sg-navbar-item>
      <sg-navbar-item href="#">Account</sg-navbar-item>
    </div>
  </sg-navbar>

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
    .navbar-floating-sticky-preview sg-navbar[data-mode='floating'] {
      position: absolute !important;
      inset-inline: var(--size-3) !important;
      top: var(--size-3) !important;
      width: calc(100% - var(--size-6)) !important;
      max-width: none !important;
      z-index: 2;
    }

    .navbar-floating-sticky-preview sg-navbar[data-mode='sticky'] {
      position: sticky !important;
      inset-inline: 0 !important;
      top: 0 !important;
      width: 100% !important;
      z-index: 3;
    }
  </style>

  <sg-navbar floating sticky scroll-threshold="48" label="Main navigation">
    <span slot="logo" style="font-weight: var(--font-semibold);">Brand</span>
    <sg-navbar-item href="#" active>Home</sg-navbar-item>
    <sg-navbar-item href="#">Docs</sg-navbar-item>
    <sg-navbar-item slot="end" href="#">Account</sg-navbar-item>

    <div slot="mobile-menu">
      <sg-navbar-item href="#" active>Home</sg-navbar-item>
      <sg-navbar-item href="#">Docs</sg-navbar-item>
      <sg-navbar-item href="#">Account</sg-navbar-item>
    </div>
  </sg-navbar>

  <div style="padding: var(--size-4); min-height: 640px;">
    <sg-text>Scroll this container to observe floating mode transition into sticky mode.</sg-text>
  </div>
</div>
```

</ComponentPreview>

## Navbar + Sidebar Integration

Recommended app-shell pattern:

- Desktop: keep `sg-sidebar` visible and use the navbar for top-level context/actions.
- Mobile: switch sidebar to bottom-nav mode and toggle its drawer from the navbar hamburger.
- Use `mobile-sidebar` on `sg-navbar` and `bottom-nav-at="(max-width: ... )"` on `sg-sidebar`.

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

    .navbar-sidebar-shell .shell-grid > sg-grid-item {
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

    .navbar-sidebar-shell .shell-panel sg-navbar {
      position: relative;
      z-index: 5;
      flex-shrink: 0;
    }

    .navbar-sidebar-shell .shell-panel sg-navbar[data-mode='floating'] {
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

  <sg-grid class="shell-grid" areas="'sidebar panel'" fullwidth gap="none">
    <sg-grid-item area="sidebar">
      <sg-sidebar
        id="app-shell-sidebar"
        class="shell-sidebar"
        label="Workspace navigation"
        variant="floating"
        container-breakpoints
        responsive="(max-width: 1200px)"
        bottom-nav-at="(max-width: 640px)">
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
      </sg-sidebar>
    </sg-grid-item>

    <sg-grid-item area="panel" class="shell-panel">
      <sg-navbar
        floating
        variant="glass"
        breakpoint="(max-width: 640px)"
        container-breakpoints
        mobile-sidebar="#app-shell-sidebar"
        label="Workspace navigation">
        <span slot="logo" style="font-weight: var(--font-semibold);">Workspace</span>
        <sg-navbar-item slot="start" href="#" active>Dashboard</sg-navbar-item>
        <sg-navbar-item href="#">Projects</sg-navbar-item>
        <sg-navbar-item href="#">Reports</sg-navbar-item>
        <sg-navbar-item slot="end" href="#">Account</sg-navbar-item>
      </sg-navbar>

      <main class="shell-content">
        <sg-text
          >Desktop keeps the sidebar as a dedicated left rail while the right shell contains a floating navbar and
          content. On mobile, opening the sidebar drawer pushes the entire right shell sideways.</sg-text
        >
      </main>
    </sg-grid-item>
  </sg-grid>
</div>
```

</ComponentPreview>

## `sg-navbar-item`

`sg-navbar-item` renders as an anchor when `href` is set, otherwise as a button.

<ComponentPreview>

```html
<sg-navbar label="Item examples">
  <sg-navbar-item href="#" active>Dashboard</sg-navbar-item>
  <sg-navbar-item href="#">Settings</sg-navbar-item>
  <sg-navbar-item disabled>Billing (Unavailable)</sg-navbar-item>
</sg-navbar>
```

</ComponentPreview>

## Imperative API

```js
const navbar = document.querySelector('sg-navbar');

navbar.openMobileMenu();
navbar.closeMobileMenu();
navbar.toggleMobileMenu();
```

## Events

```js
const navbar = document.querySelector('sg-navbar');

navbar.addEventListener('mobile-menu-change', (e) => {
  console.log('Mobile menu open:', e.detail.open);
});
```

## API Reference

### `sg-navbar` Attributes

| Attribute               | Type                                                                 | Default                | Description                                                                    |
| ----------------------- | -------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------ |
| `label`                 | `string`                                                             | `'Main navigation'`    | Accessible nav landmark label                                                  |
| `sticky`                | `boolean`                                                            | `false`                | Enables sticky mode                                                            |
| `floating`              | `boolean`                                                            | `false`                | Enables floating mode                                                          |
| `scroll-threshold`      | `number`                                                             | `80`                   | Scroll px threshold for floating+sticky transition                             |
| `breakpoint`            | `string`                                                             | `'(max-width: 768px)'` | Media query used for mobile mode                                               |
| `container-breakpoints` | `boolean`                                                            | `false`                | Evaluates parseable `max-width` breakpoints against the navbar container width |
| `variant`               | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'glass' \| 'frost'` | —                      | Surface style variant                                                          |
| `color`                 | `ThemeColor`                                                         | —                      | Theme color                                                                    |
| `rounded`               | `RoundedSize`                                                        | —                      | Border radius token                                                            |
| `elevation`             | `'0' \| '1' \| '2' \| '3' \| '4' \| '5'`                             | —                      | Elevation shadow level                                                         |

### `sg-navbar` Slots

| Slot          | Description                          |
| ------------- | ------------------------------------ |
| `logo`        | Brand mark/logo                      |
| `start`       | Left-aligned desktop content         |
| (default)     | Center desktop content               |
| `end`         | Right-aligned desktop content        |
| `mobile-menu` | Mobile-only expandable content panel |

### `sg-navbar` Events

| Event                | Detail              | Description                               |
| -------------------- | ------------------- | ----------------------------------------- |
| `mobile-menu-change` | `{ open: boolean }` | Fired when mobile menu open state changes |

### `sg-navbar-item` Attributes

| Attribute  | Type      | Default | Description                                        |
| ---------- | --------- | ------- | -------------------------------------------------- |
| `href`     | `string`  | —       | Link URL (renders anchor when set)                 |
| `active`   | `boolean` | `false` | Marks item as current page (`aria-current="page"`) |
| `disabled` | `boolean` | `false` | Disables interaction                               |
| `rel`      | `string`  | —       | Link relationship when `href` is set               |
| `target`   | `string`  | —       | Link target when `href` is set                     |

## Related Components

- [Sidebar](./sidebar.md)
- [Menu](./menu.md)
- [Tabs](./tabs.md)
