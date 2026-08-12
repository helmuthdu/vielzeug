# Navigation Menu

A horizontal trigger bar with anchored, non-modal navigation panels. Use it for product and marketing navigation with links, cards, and calls to action. Use [`Menu`](./menu.md) for compact action lists.

## Product Navigation

<ComponentPreview align="start" justify="start" height="360px">

```html
<ore-navbar breakpoint="(max-width: 0px)" label="Primary navigation">
  <span slot="logo" style="font-weight:var(--font-semibold);">Acme</span>
  <ore-navbar-item href="#">Features</ore-navbar-item>
  <ore-navigation-menu>
    <ore-navigation-menu-item value="products">Products</ore-navigation-menu-item>
    <ore-navigation-menu-item value="resources">Resources</ore-navigation-menu-item>

    <ore-navigation-menu-panel for="products">
      <a href="/payments" style="display:grid; grid-template-columns:auto 1fr; column-gap:var(--size-3);">
        <ore-icon name="credit-card" size="20" style="grid-row:span 2; color:var(--color-primary);"></ore-icon>
        <strong>Payments</strong><span>Accept cards and manage transactions.</span>
      </a>
      <a href="/security" style="display:grid; grid-template-columns:auto 1fr; column-gap:var(--size-3);">
        <ore-icon name="shield-check" size="20" style="grid-row:span 2; color:var(--color-success);"></ore-icon>
        <strong>Security</strong><span>Protect customers and control access.</span>
      </a>
      <div slot="footer" style="display:flex; justify-content:space-between; padding:1rem 1.5rem; border-top:1px solid var(--color-divider);">
        <span>Ready to build?</span>
        <ore-button size="sm">Get started</ore-button>
      </div>
    </ore-navigation-menu-panel>

    <ore-navigation-menu-panel for="resources">
      <a href="/docs">Documentation</a>
    </ore-navigation-menu-panel>
  </ore-navigation-menu>
  <ore-navbar-item href="#">Pricing</ore-navbar-item>
  <ore-button slot="end" size="sm">Sign up</ore-button>
</ore-navbar>
```

</ComponentPreview>

## Grouped Content

Panels use content-sized grid tracks and do not stretch empty row space. For uneven category lengths, make each visual column one direct panel child and stack its groups inside that wrapper. This keeps each column's vertical rhythm independent:

<ComponentPreview align="start" justify="start" height="360px">

```html
<ore-navigation-menu columns="2">
  <ore-navigation-menu-item value="packages">Packages</ore-navigation-menu-item>
  <ore-navigation-menu-panel for="packages">
    <div class="menu-column">
      <section>Core Primitives</section>
      <section>Data Layer</section>
    </div>
    <div class="menu-column">
      <section>UI Components</section>
      <section>Utilities</section>
    </div>
  </ore-navigation-menu-panel>
</ore-navigation-menu>

<style>
  .menu-column {
    display: grid;
    align-content: start;
    gap: var(--size-7);
  }
</style>
```

</ComponentPreview>

Avoid assigning `grid-row` to individual groups when their columns contain different amounts of content. CSS Grid shares those row tracks across columns; column wrappers avoid unintended vertical gaps.

## API Reference

| Attribute | Type | Default | Description |
| --- | --- | --- | --- |
| `open` | `string` | — | Controlled active trigger value. User interaction emits an `open-change` request; update this value to apply it. |
| `default-open` | `string` | — | Initial active trigger value. |
| `close-on-select` | `boolean` | `true` | Closes the menu after activating a panel link. |
| `columns` | `number` | `2` | Number of columns in the panel grid. |
| `label` | `string` | `'Navigation menu'` | Accessible label for the trigger region. |
| `placement` | `'bottom-start' \| 'bottom-end'` | `'bottom-start'` | Panel placement relative to active trigger. |
| `disabled` | `boolean` | `false` | Disables all triggers. |

Set `--navigation-menu-panel-width` to change the panel width, `columns` to change how many grid columns the panel uses, and `--navigation-menu-backdrop-blur` to tune the frosted backdrop.

Each `ore-navigation-menu-item` needs a unique `value`. Pair panels and footers using matching `for` values. Activating a panel link emits `select` and closes the menu. Add `data-navigation-menu-keep-open` to a link or its ancestor when activating it should leave the menu open.

Panels use the viewport as their placement boundary, including when their menu is inside an `overflow: hidden`, scrollable, or sandboxed container. The native Popover top layer keeps the panel visible outside that container while preserving its trigger alignment.

## Controlled State

When you supply `open`, the parent owns the active value. Update it in response to `open-change`:

```js
const menu = document.querySelector('ore-navigation-menu');

menu.addEventListener('open-change', (event) => {
  menu.open = event.detail.value ?? undefined;
});
```
