# Navbar

A responsive navigation bar with desktop and mobile layouts, plus sticky and floating modes. Items can mark themselves active from a single `active-url`, a `subnav` slot adds a second-tier row, `centered` pins the main navigation to the bar's center, and the mobile layout picks itself: an explicit `mobile-menu` panel, an external `mobile-sidebar` drawer, or the bar's own items wrapping under the logo. A floating-to-full-width transition runs when `floating` and `sticky` are used together.

## Keyboard Navigation

The mobile toggle announces whether its menu is expanded. Pressing Escape inside an open mobile menu closes it and returns focus to the toggle, so keyboard navigation resumes from a visible control. The menu is nonmodal and does not trap focus.

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

  <ore-navbar floating label="Main navigation">
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

## Active State from the URL

Set `active-url` once and every item resolves itself: an item is active when its `href` matches exactly, or when the URL nests under it (`/docs` stays highlighted on `/docs/intro`). Root `/` and in-page `#anchors` match exactly only, so they never light up everywhere. An explicit `active` on an item always wins, which keeps the escape hatch for forced or derived states.

<ComponentPreview>

```html
<ore-navbar active-url="/docs/introduction" label="Docs navigation">
  <span slot="logo" style="font-weight: var(--font-semibold);">Acme Docs</span>
  <ore-navbar-item href="/">Home</ore-navbar-item>
  <ore-navbar-item href="/docs">Docs</ore-navbar-item>
  <ore-navbar-item href="/pricing">Pricing</ore-navbar-item>
</ore-navbar>
```

</ComponentPreview>

Matched items reflect `data-active` and carry `aria-current` (`page` for routes, `location` for in-page anchors), so assistive tech and your own styling see the same answer.

## Second-Tier Navigation

The `subnav` slot renders a quieter row under the bar for section navigation: plain `ore-navbar-item` pills, scrollable when they overflow. It appears only when it has content.

<ComponentPreview>

```html
<ore-navbar active-url="/docs/introduction" label="Docs navigation">
  <span slot="logo" style="font-weight: var(--font-semibold);">Acme Docs</span>
  <ore-navbar-item href="/docs">Docs</ore-navbar-item>
  <ore-navbar-item href="/changelog">Changelog</ore-navbar-item>
  <ore-navbar-item slot="subnav" href="/docs/introduction">Introduction</ore-navbar-item>
  <ore-navbar-item slot="subnav" href="/docs/installation">Installation</ore-navbar-item>
  <ore-navbar-item slot="subnav" href="/docs/theming">Theming</ore-navbar-item>
</ore-navbar>
```

</ComponentPreview>

## Centered Layout

`centered` pins the default-slot content to the bar's true center no matter how much the logo and end regions hold.

<ComponentPreview>

```html
<ore-navbar centered label="Marketing navigation">
  <span slot="logo" style="font-weight: var(--font-semibold);">Acme</span>
  <ore-navbar-item href="#" active>Product</ore-navbar-item>
  <ore-navbar-item href="#">Pricing</ore-navbar-item>
  <ore-navbar-item href="#">Docs</ore-navbar-item>
  <ore-button slot="end" variant="solid" color="primary" size="sm">Sign in</ore-button>
</ore-navbar>
```

</ComponentPreview>

## Mobile Layouts

The mobile layout resolves in one order:

1. `mobile-menu` slot content: a toggle opens the navbar's own overflow panel.
2. A `mobile-sidebar` target: the toggle drives that sidebar's drawer.
3. Neither: the bar's live navigation wraps onto its own scrollable row(s) under the logo. No duplication, no clone that drifts out of sync, and nothing to maintain twice.

The `end` region still collapses in the wrapped layout: `persistent` exists precisely to stay visible through the collapse, `end` to collapse.

<ComponentPreview>

```html
<ore-navbar label="Demo navigation" style="max-width: 26rem">
  <span slot="logo" style="font-weight: var(--font-semibold);">Acme</span>
  <ore-navbar-item href="#" active>Home</ore-navbar-item>
  <ore-navbar-item href="#">Team</ore-navbar-item>
  <ore-navbar-item href="#">Work</ore-navbar-item>
  <ore-navbar-item href="#">Journal</ore-navbar-item>
  <ore-navbar-item href="#">Contact</ore-navbar-item>
</ore-navbar>
```

</ComponentPreview>

## Navbar + Sidebar Integration

Recommended app-shell pattern:

- Desktop: keep `ore-sidebar` visible and use the navbar for top-level context/actions.
- Mobile: switch sidebar to bottom-nav mode and toggle its drawer from the navbar control, with `menu-icon="panel-left-open"` and `menu-close-icon="panel-left-close"` so it reads as the same control as the desktop collapse toggle.
- Use `mobile-sidebar` on `ore-navbar` and `bottom-nav-at="(max-width: ... )"` on `ore-sidebar`.

<ComponentPreview>

```html
<div class="navbar-sidebar-shell">
  <style>
    .navbar-sidebar-shell {
      --shell-drawer-width: clamp(16rem, 28vw, 22rem);
      --shell-push-gap: var(--size-1);
      position: relative;
      width: 100%;
      min-width: 0;
      height: 460px;
      overflow: hidden;
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      /* Definite row: the bottom-nav sidebar is absolute, and its containing
         block is the (un-stretched) row track — auto would shrink it short. */
      grid-template-rows: minmax(0, 1fr);
      border: 1px solid var(--color-contrast-200);
      border-radius: var(--rounded-lg);
    }

    .navbar-sidebar-shell > * {
      min-width: 0;
      min-height: 0;
    }

    /* The sidebar sizes to 100% of its track (max-width only caps it), so an `auto`
       track would shrink it to its content's max-content: above the bottom-nav
       breakpoint the track is given the rail's real width (plus its inline margins). */
    @media (width > 640px) {
      .navbar-sidebar-shell {
        grid-template-columns: calc(var(--shell-drawer-width) + var(--size-3)) minmax(0, 1fr);
      }

      /* Collapsed (tablet) rail: back to an auto track sized by the rail itself. */
      .navbar-sidebar-shell:has(.shell-sidebar[data-collapsed]) {
        grid-template-columns: auto minmax(0, 1fr);
      }
    }

    .navbar-sidebar-shell .shell-sidebar {
      --sidebar-width: var(--shell-drawer-width);
      min-height: 0;
      z-index: 3;
    }

    /* Tablet band: the rail rests inline, but expanding it overlays the panel
       instead of stealing its track, so the navbar card never shrinks. */
    @media (width > 640px) and (width <= 900px) {
      .navbar-sidebar-shell:has(.shell-sidebar:not([data-collapsed])) {
        grid-template-columns: minmax(0, 1fr);
      }

      .navbar-sidebar-shell .shell-sidebar:not([data-collapsed], [data-bottom-nav]) {
        position: absolute;
        inset: 0;
        height: auto;
      }
    }

    /* Bottom-nav mode: the sidebar is absolutely positioned (out of grid flow),
       so the panel must be the only track. */
    @media (width <= 640px) {
      .navbar-sidebar-shell {
        grid-template-columns: minmax(0, 1fr);
      }

      .navbar-sidebar-shell .shell-panel ore-navbar {
        --navbar-height: var(--size-11);
      }
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

    .navbar-sidebar-shell:has(.shell-sidebar[data-bottom-nav][data-drawer-open]) .shell-panel {
      transform: translateX(calc(var(--shell-drawer-width) + var(--shell-push-gap)));
    }

    .navbar-sidebar-shell .shell-sidebar[variant='floating']:not([data-bottom-nav]) {
      /* The panel's 12px padding already separates it from the sidebar, so the
         sidebar carries no inline-end margin: edge → sidebar → navbar gaps match. */
      margin: var(--size-3) 0 var(--size-3) var(--size-3);
    }

    .navbar-sidebar-shell:has(.shell-sidebar[variant='floating'][data-bottom-nav][data-drawer-open]) .shell-panel {
      transform: translateX(calc(var(--shell-drawer-width) + var(--size-2) + var(--shell-push-gap)));
    }
  </style>

  <ore-sidebar
    id="app-shell-sidebar"
    class="shell-sidebar"
    label="Workspace navigation"
    variant="floating"
    container-breakpoints
    responsive="(max-width: 900px)"
    bottom-nav-at="(max-width: 640px)">
    <ore-sidebar-item href="#" active bottom-nav>
      <ore-icon slot="icon" name="layout-dashboard" size="18"></ore-icon>
      Dashboard
    </ore-sidebar-item>
    <ore-sidebar-group label="Workspace">
      <ore-sidebar-item href="#" bottom-nav>
        <ore-icon slot="icon" name="folder" size="18"></ore-icon>
        Projects
      </ore-sidebar-item>
      <ore-sidebar-item href="#" bottom-nav>
        <ore-icon slot="icon" name="bar-chart-3" size="18"></ore-icon>
        Reports
      </ore-sidebar-item>
    </ore-sidebar-group>
  </ore-sidebar>

  <section class="shell-panel">
    <ore-navbar
      floating
      variant="bordered"
      breakpoint="(max-width: 640px)"
      container-breakpoints
      mobile-sidebar="#app-shell-sidebar"
      menu-icon="panel-left-open"
      menu-close-icon="panel-left-close"
      label="Workspace navigation">
      <span slot="logo" style="font-weight: var(--font-semibold);">Workspace</span>
      <ore-navbar-item slot="start" href="#" active>Dashboard</ore-navbar-item>
      <ore-navbar-item href="#">Projects</ore-navbar-item>
      <ore-navbar-item href="#">Reports</ore-navbar-item>
      <ore-navbar-item slot="end" href="#">Account</ore-navbar-item>
    </ore-navbar>

    <main class="shell-content">
      <ore-text>
        Desktop keeps the sidebar as a dedicated left rail while the right shell contains a floating navbar and
        content. On tablet the rail collapses, and expanding it overlays the panel so the navbar never shrinks. On
        mobile the sidebar becomes a bottom bar, and opening its drawer pushes the entire right shell sideways.
      </ore-text>
    </main>
  </section>
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

  <div slot="mobile-menu">
    <ore-navbar-item href="#" active>Dashboard</ore-navbar-item>
    <ore-navbar-item href="#">Settings</ore-navbar-item>
    <ore-navbar-item disabled>Billing (Unavailable)</ore-navbar-item>
  </div>
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

| Attribute               | Type                                                      | Default                   | Description                                                                                                                                                                                             |
| ----------------------- | --------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `active-url`            | `string`                                                  | N/A                       | Current page URL; items whose `href` match it (exact, or nested paths keep the parent) become active automatically; explicit `active` wins                                                               |
| `centered`              | `boolean`                                                 | `false`                   | Pin the default-slot content to the bar's true center                                                                                                                   |
| `label`                 | `string`                                                  | `'Main navigation'`       | Accessible nav landmark label                                                                                                                                                                           |
| `menu-icon`             | `string`                                                  | `'menu'`                  | Icon shown while the mobile menu is closed                                                                                                                                                              |
| `menu-open-label`       | `string`                                                  | `'Open navigation menu'`  | Accessible label for the closed mobile menu toggle                                                                                                                                                      |
| `menu-close-icon`       | `string`                                                  | `'x'`                     | Icon shown while the mobile menu or the external `mobile-sidebar` drawer is open                                                                                                                  |
| `menu-close-label`      | `string`                                                  | `'Close navigation menu'` | Accessible label for the open mobile menu toggle                                                                                                                                                        |
| `sticky`                | `boolean`                                                 | `false`                   | Enables sticky mode                                                                                                                                                                                     |
| `floating`              | `boolean`                                                 | `false`                   | Enables floating mode                                                                                                                                                                                   |
| `scroll-threshold`      | `number`                                                  | `80`                      | Scroll px threshold for floating+sticky transition                                                                                                                                                      |
| `breakpoint`            | `string`                                                  | `'(max-width: 768px)'`    | Media query used for mobile mode                                                                                                                                                                        |
| `container-breakpoints` | `boolean`                                                 | `false`                   | Evaluates parseable `max-width` breakpoints against the navbar container width                                                                                                                          |
| `variant`               | `'flat' \| 'solid' \| 'bordered' \| 'outline' \| 'frost'` | N/A                       | Surface style variant                                                                                                                                                                                   |
| `color`                 | `ThemeColor`                                              | N/A                       | Theme color                                                                                                                                                                                             |
| `rounded`               | `RoundedSize`                                             | N/A                       | Border radius token                                                                                                                                                                                     |
| `elevation`             | `'0' \| '1' \| '2' \| '3' \| '4' \| '5'`                  | N/A                       | Elevation shadow level                                                                                                                                                                                  |

When `variant="frost"` has an explicit elevation, that elevation replaces the default frost halo so levels remain visually distinct.

**`ore-navbar` Parts**

| Part            | Description                    |
| --------------- | ------------------------------ |
| `nav`           | Outer `<nav>` landmark element |
| `bar`           | Main navbar row container      |
| `logo`          | Logo slot container            |
| `start`         | Leading (start) content region |
| `center`        | Center content region          |
| `end`           | Trailing (end) content region  |
| `persistent`    | Trailing region kept in the bar through the mobile collapse |
| `subnav`        | Second-tier row container under the bar |
| `mobile-toggle` | Mobile menu toggle button      |
| `mobile-menu`   | Mobile overflow panel          |

**`ore-navbar` Slots**

| Slot          | Description                          |
| ------------- | ------------------------------------ |
| `logo`        | Brand mark/logo                      |
| `start`       | Left-aligned desktop content         |
| (default)     | Center desktop content               |
| `end`         | Right-aligned desktop content        |
| `persistent`  | Trailing content that stays in the bar through the mobile collapse (global actions, status icons) |
| `subnav`      | Second-tier row rendered under the bar |
| `mobile-menu` | Mobile-only expandable content panel |

**`ore-navbar` Events**

| Event                | Detail              | Description                                                                     |
| -------------------- | ------------------- | ------------------------------------------------------------------------------- |
| `mobile-menu-change` | `{ open: boolean }` | Fired when the navbar's own mobile panel toggles (drawer-driven open/close emits the sidebar's `drawer-change` instead) |

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
| `href`     | `string`  | N/A     | Link URL (renders anchor when set)                 |
| `active`   | `boolean` | `false` | Marks item as current page (`aria-current="page"`); wins over the navbar's `active-url` match |
| `disabled` | `boolean` | `false` | Disables interaction                               |
| `rel`      | `string`  | N/A     | Link relationship when `href` is set               |
| `target`   | `string`  | N/A     | Link target when `href` is set                     |

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
