# Navigation Menu

`ore-navigation-menu` groups disclosure buttons with non-modal panels of navigation links. It does not create a navigation landmark; place it inside the page's existing navigation landmark, such as `ore-navbar`.

## Basic usage

<ComponentPreview align="start" justify="start" height="360px">

```html
<ore-navbar breakpoint="(max-width: 0px)" label="Primary navigation">
  <span slot="logo" style="font-weight:var(--font-semibold);">Acme</span>
  <ore-navbar-item href="/">Home</ore-navbar-item>
  <ore-navigation-menu>
    <ore-navigation-menu-item value="products">Products</ore-navigation-menu-item>
    <ore-navigation-menu-item value="resources">Resources</ore-navigation-menu-item>

    <ore-navigation-menu-panel for="products">
      <ore-navigation-menu-link href="/payments">
        <ore-icon aria-hidden="true" name="credit-card" size="20"></ore-icon>
        <span>
          <strong>Payments</strong>
          <span>Accept cards and manage transactions.</span>
        </span>
      </ore-navigation-menu-link>
      <ore-navigation-menu-link href="/security" active>
        <ore-icon aria-hidden="true" name="shield-check" size="20"></ore-icon>
        <span>
          <strong>Security</strong>
          <span>Protect customers and control access.</span>
        </span>
      </ore-navigation-menu-link>
      <ore-navigation-menu-link href="/get-started" slot="footer">
        Ready to build?
        <ore-icon aria-hidden="true" name="arrow-right" size="16"></ore-icon>
      </ore-navigation-menu-link>
    </ore-navigation-menu-panel>

    <ore-navigation-menu-panel for="resources">
      <ore-navigation-menu-link href="/docs">Documentation</ore-navigation-menu-link>
    </ore-navigation-menu-panel>
  </ore-navigation-menu>
  <ore-navbar-item href="/pricing">Pricing</ore-navbar-item>
</ore-navbar>
```

</ComponentPreview>

Use `ore-navigation-menu-link` for links styled for the panel. Native anchors also work. Mark the current destination with `active`; the built-in link exposes `aria-current="page"` on its native anchor.

## Grouped content

Panels use a content-sized grid. `columns` is the maximum column count; columns also adapt to the available panel width and `--navigation-menu-column-min`. Keep each visual group in one direct child so its content flows independently:

<ComponentPreview align="start" justify="start" height="360px">

```html
<ore-navigation-menu columns="3">
  <ore-navigation-menu-item value="packages">Packages</ore-navigation-menu-item>
  <ore-navigation-menu-panel for="packages">
    <section class="menu-column">
      <strong>Core Primitives</strong>
      <ore-navigation-menu-link href="/ripple">Ripple</ore-navigation-menu-link>
      <ore-navigation-menu-link href="/ore">Ore</ore-navigation-menu-link>
    </section>
    <section class="menu-column">
      <strong>Data Layer</strong>
      <ore-navigation-menu-link href="/courier">Courier</ore-navigation-menu-link>
    </section>
    <section class="menu-column">
      <strong>UI Components</strong>
      <ore-navigation-menu-link href="/refine">Refine</ore-navigation-menu-link>
    </section>
  </ore-navigation-menu-panel>
</ore-navigation-menu>

<style>
  .menu-column {
    display: grid;
    align-content: start;
    gap: var(--size-3);
  }
</style>
```

</ComponentPreview>

## Responsive layout

Inside `ore-navbar`, the menu automatically switches to inline disclosure panels when the navbar enters its mobile layout. Use the `inline` attribute to opt into the same document-flow layout outside a navbar. Inline panels render as a single column and remain associated with their trigger.

## Keyboard and accessibility

- Each item is a button with `aria-expanded`; its panel is a labelled `region`.
- Arrow keys move among triggers in the writing direction. `Home` and `End` move to the first and last enabled trigger.
- `ArrowDown` opens the active panel and moves focus to its first focusable item.
- `Tab` from an open trigger enters the panel; `Shift+Tab` from its first item returns to the trigger. `Tab` from the last panel item moves to the next trigger when one exists.
- `Escape` closes the active panel and restores trigger focus. Moving focus outside the active trigger and panel also closes it.

## API reference

### `ore-navigation-menu`

| Attribute         | Type                             | Default          | Description                                                                                                      |
| ----------------- | -------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| `open`            | `string`                         | unset            | Controlled active trigger value. User interaction emits an `open-change` request; update this value to apply it. |
| `default-open`    | `string`                         | unset            | Initial active trigger value.                                                                                    |
| `close-on-select` | `boolean`                        | `true`           | Closes the menu after activating a panel link.                                                                   |
| `columns`         | `number`                         | `2`              | Maximum number of panel content columns.                                                                         |
| `inline`          | `boolean`                        | `false`          | Renders panels in document flow instead of the popover layer.                                                    |
| `placement`       | `'bottom-start' \| 'bottom-end'` | `'bottom-start'` | Panel placement relative to the active trigger.                                                                  |
| `disabled`        | `boolean`                        | `false`          | Disables all triggers.                                                                                           |

### `ore-navigation-menu-item`

| Attribute  | Type      | Default | Description                                         |
| ---------- | --------- | ------- | --------------------------------------------------- |
| `value`    | `string`  | `''`    | Unique value paired with a panel's `for` attribute. |
| `active`   | `boolean` | `false` | Applies the active trigger appearance.              |
| `disabled` | `boolean` | `false` | Disables this trigger.                              |

### `ore-navigation-menu-panel`

| Attribute | Type     | Default | Description                        |
| --------- | -------- | ------- | ---------------------------------- |
| `for`     | `string` | unset   | Value of the associated menu item. |

The panel has a default content slot and an optional `footer` slot. Add `data-navigation-menu-keep-open` to a link or its ancestor to prevent `close-on-select` from closing the panel.

### `ore-navigation-menu-link`

| Attribute | Type      | Default | Description                                            |
| --------- | --------- | ------- | ------------------------------------------------------ |
| `href`    | `string`  | unset   | Link destination.                                      |
| `active`  | `boolean` | `false` | Marks the destination as the current page.             |
| `target`  | `string`  | unset   | Browsing context for the destination.                  |
| `rel`     | `string`  | unset   | Relationship between the current page and destination. |

The `select` event detail contains the active panel's `value` and the link's resolved `href`. The `open-change` event reports the requested `value`, `open` state, and interaction `reason`.

## Styling

| Custom property                      | Default                | Purpose                                                             |
| ------------------------------------ | ---------------------- | ------------------------------------------------------------------- |
| `--navigation-menu-panel-width`      | `48rem`                | Maximum panel width.                                                |
| `--navigation-menu-panel-max-height` | `42rem`                | Maximum panel height.                                               |
| `--navigation-menu-panel-columns`    | `2`                    | Maximum content column count when the `columns` attribute is unset. |
| `--navigation-menu-column-min`       | `12rem`                | Minimum width used to fit panel columns.                            |
| `--navigation-menu-trigger-gap`      | `var(--size-1)`        | Gap between triggers.                                               |
| `--navigation-menu-bg`               | Theme surface          | Panel background.                                                   |
| `--navigation-menu-border-color`     | `var(--color-divider)` | Panel border color.                                                 |
| `--navigation-menu-radius`           | `var(--rounded-lg)`    | Panel corner radius.                                                |
| `--navigation-menu-shadow`           | `var(--shadow-xl)`     | Panel shadow.                                                       |
| `--navigation-menu-backdrop-blur`    | `var(--blur-xl)`       | Panel backdrop blur.                                                |

Panels use the viewport for positioning, even inside a clipping or scrollable container. Opening and closing reuse the shared overlay motion tokens and reduced-motion behavior; see [Motion Mode](/refine/animation#motion-mode).

## Controlled state

When you supply `open`, the parent owns the active value. Update it in response to `open-change`:

```js
const menu = document.querySelector('ore-navigation-menu');

menu.addEventListener('open-change', (event) => {
  menu.open = event.detail.value ?? undefined;
});
```
