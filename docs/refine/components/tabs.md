# Tabs

A flexible tabs component for organizing content into switchable panels. Keyboard accessible, animation-ready, and available in six visual styles.

## Variants

#### Solid (Default)

Pill-style tabs in a rounded container — clean and contained.

<ComponentPreview>

```html
<ore-tabs value="tab1" variant="solid">
  <ore-tab-item slot="tabs" value="tab1">Overview</ore-tab-item>
  <ore-tab-item slot="tabs" value="tab2">Settings</ore-tab-item>
  <ore-tab-item slot="tabs" value="tab3">Billing</ore-tab-item>
  <ore-tab-panel value="tab1"><p>Overview panel content.</p></ore-tab-panel>
  <ore-tab-panel value="tab2"><p>Settings panel content.</p></ore-tab-panel>
  <ore-tab-panel value="tab3"><p>Billing panel content.</p></ore-tab-panel>
</ore-tabs>
```

</ComponentPreview>

#### Flat

Tabs and panel share a single container background — they read as one unified block. Use `variant="flat"` when tabs need to feel visually connected to the panel content below them.

<ComponentPreview>

```html
<ore-tabs value="tab1" variant="flat">
  <ore-tab-item slot="tabs" value="tab1">Overview</ore-tab-item>
  <ore-tab-item slot="tabs" value="tab2">Settings</ore-tab-item>
  <ore-tab-item slot="tabs" value="tab3">Billing</ore-tab-item>
  <ore-tab-panel value="tab1"><p>Overview panel content.</p></ore-tab-panel>
  <ore-tab-panel value="tab2"><p>Settings panel content.</p></ore-tab-panel>
  <ore-tab-panel value="tab3"><p>Billing panel content.</p></ore-tab-panel>
</ore-tabs>
```

</ComponentPreview>

#### Bordered

Tabs that visually connect to their panel with a shared border. Use `variant="bordered"` when tabs need to feel visually connected to the panel content below them.

<ComponentPreview>

```html
<ore-tabs value="tab1" variant="bordered">
  <ore-tab-item slot="tabs" value="tab1">Overview</ore-tab-item>
  <ore-tab-item slot="tabs" value="tab2">Settings</ore-tab-item>
  <ore-tab-item slot="tabs" value="tab3">Billing</ore-tab-item>
  <ore-tab-panel value="tab1"><p>Overview panel content.</p></ore-tab-panel>
  <ore-tab-panel value="tab2"><p>Settings panel content.</p></ore-tab-panel>
  <ore-tab-panel value="tab3"><p>Billing panel content.</p></ore-tab-panel>
</ore-tabs>
```

</ComponentPreview>

#### Ghost

Open tabs with a filled active pill — no container border, floats freely.

<ComponentPreview>

```html
<ore-tabs value="tab1" variant="ghost">
  <ore-tab-item slot="tabs" value="tab1">Overview</ore-tab-item>
  <ore-tab-item slot="tabs" value="tab2">Settings</ore-tab-item>
  <ore-tab-item slot="tabs" value="tab3">Billing</ore-tab-item>
  <ore-tab-panel value="tab1"><p>Overview panel content.</p></ore-tab-panel>
  <ore-tab-panel value="tab2"><p>Settings panel content.</p></ore-tab-panel>
  <ore-tab-panel value="tab3"><p>Billing panel content.</p></ore-tab-panel>
</ore-tabs>
```

</ComponentPreview>

### Glass & Frost Variants

Translucent tab bars with backdrop blur — best used over rich backgrounds.

::: tip Best Used With
Glass and frost variants look best over colorful backgrounds or images to showcase the blur and transparency effects.
:::

<ComponentPreview center background="https://plus.unsplash.com/premium_photo-1685082778336-282f52a3a923?q=80&w=2532&auto=format&fit=crop">

```html
<ore-tabs value="tab1" variant="frost">
  <ore-tab-item slot="tabs" value="tab1">Overview</ore-tab-item>
  <ore-tab-item slot="tabs" value="tab2">Settings</ore-tab-item>
  <ore-tab-item slot="tabs" value="tab3">Billing</ore-tab-item>
  <ore-tab-panel value="tab1"><p>Overview panel content.</p></ore-tab-panel>
  <ore-tab-panel value="tab2"><p>Settings panel content.</p></ore-tab-panel>
  <ore-tab-panel value="tab3"><p>Billing panel content.</p></ore-tab-panel>
</ore-tabs>
<ore-tabs value="tab1" variant="glass">
  <ore-tab-item slot="tabs" value="tab1">Overview</ore-tab-item>
  <ore-tab-item slot="tabs" value="tab2">Settings</ore-tab-item>
  <ore-tab-item slot="tabs" value="tab3">Billing</ore-tab-item>
  <ore-tab-panel value="tab1"><p>Overview panel content.</p></ore-tab-panel>
  <ore-tab-panel value="tab2"><p>Settings panel content.</p></ore-tab-panel>
  <ore-tab-panel value="tab3"><p>Billing panel content.</p></ore-tab-panel>
</ore-tabs>
```

</ComponentPreview>

## Colors

Set `color` on `ore-tabs` to apply a theme color — it propagates automatically to all tab items. The color drives the active pill fill on `ghost`, the focus ring on all variants, and the indicator line on future `underline`-style usage.

<ComponentPreview vertical>

```html
<ore-tabs value="tab1" variant="ghost" color="primary">
  <ore-tab-item slot="tabs" value="tab1">Overview</ore-tab-item>
  <ore-tab-item slot="tabs" value="tab2">Settings</ore-tab-item>
  <ore-tab-item slot="tabs" value="tab3">Billing</ore-tab-item>
  <ore-tab-panel value="tab1"><p>Primary color.</p></ore-tab-panel>
  <ore-tab-panel value="tab2"><p>Settings panel.</p></ore-tab-panel>
  <ore-tab-panel value="tab3"><p>Billing panel.</p></ore-tab-panel>
</ore-tabs>

<ore-tabs value="tab1" variant="ghost" color="secondary">
  <ore-tab-item slot="tabs" value="tab1">Overview</ore-tab-item>
  <ore-tab-item slot="tabs" value="tab2">Settings</ore-tab-item>
  <ore-tab-item slot="tabs" value="tab3">Billing</ore-tab-item>
  <ore-tab-panel value="tab1"><p>Secondary color.</p></ore-tab-panel>
  <ore-tab-panel value="tab2"><p>Settings panel.</p></ore-tab-panel>
  <ore-tab-panel value="tab3"><p>Billing panel.</p></ore-tab-panel>
</ore-tabs>

<ore-tabs value="tab1" variant="ghost" color="success">
  <ore-tab-item slot="tabs" value="tab1">Overview</ore-tab-item>
  <ore-tab-item slot="tabs" value="tab2">Settings</ore-tab-item>
  <ore-tab-item slot="tabs" value="tab3">Billing</ore-tab-item>
  <ore-tab-panel value="tab1"><p>Success color.</p></ore-tab-panel>
  <ore-tab-panel value="tab2"><p>Settings panel.</p></ore-tab-panel>
  <ore-tab-panel value="tab3"><p>Billing panel.</p></ore-tab-panel>
</ore-tabs>

<ore-tabs value="tab1" variant="ghost" color="warning">
  <ore-tab-item slot="tabs" value="tab1">Overview</ore-tab-item>
  <ore-tab-item slot="tabs" value="tab2">Settings</ore-tab-item>
  <ore-tab-item slot="tabs" value="tab3">Billing</ore-tab-item>
  <ore-tab-panel value="tab1"><p>Warning color.</p></ore-tab-panel>
  <ore-tab-panel value="tab2"><p>Settings panel.</p></ore-tab-panel>
  <ore-tab-panel value="tab3"><p>Billing panel.</p></ore-tab-panel>
</ore-tabs>

<ore-tabs value="tab1" variant="ghost" color="error">
  <ore-tab-item slot="tabs" value="tab1">Overview</ore-tab-item>
  <ore-tab-item slot="tabs" value="tab2">Settings</ore-tab-item>
  <ore-tab-item slot="tabs" value="tab3">Billing</ore-tab-item>
  <ore-tab-panel value="tab1"><p>Error color.</p></ore-tab-panel>
  <ore-tab-panel value="tab2"><p>Settings panel.</p></ore-tab-panel>
  <ore-tab-panel value="tab3"><p>Billing panel.</p></ore-tab-panel>
</ore-tabs>

<ore-tabs value="tab1" variant="ghost" color="info">
  <ore-tab-item slot="tabs" value="tab1">Overview</ore-tab-item>
  <ore-tab-item slot="tabs" value="tab2">Settings</ore-tab-item>
  <ore-tab-item slot="tabs" value="tab3">Billing</ore-tab-item>
  <ore-tab-panel value="tab1"><p>Info color.</p></ore-tab-panel>
  <ore-tab-panel value="tab2"><p>Settings panel.</p></ore-tab-panel>
  <ore-tab-panel value="tab3"><p>Billing panel.</p></ore-tab-panel>
</ore-tabs>
```

</ComponentPreview>

## Sizes

<ComponentPreview vertical>

```html
<ore-tabs value="tab1" size="sm">
  <ore-tab-item slot="tabs" value="tab1">Overview</ore-tab-item>
  <ore-tab-item slot="tabs" value="tab2">Settings</ore-tab-item>
  <ore-tab-panel value="tab1"><p>Small size panel.</p></ore-tab-panel>
  <ore-tab-panel value="tab2"><p>Settings panel.</p></ore-tab-panel>
</ore-tabs>

<ore-tabs value="tab1" size="md">
  <ore-tab-item slot="tabs" value="tab1">Overview</ore-tab-item>
  <ore-tab-item slot="tabs" value="tab2">Settings</ore-tab-item>
  <ore-tab-panel value="tab1"><p>Medium size panel.</p></ore-tab-panel>
  <ore-tab-panel value="tab2"><p>Settings panel.</p></ore-tab-panel>
</ore-tabs>

<ore-tabs value="tab1" size="lg">
  <ore-tab-item slot="tabs" value="tab1">Overview</ore-tab-item>
  <ore-tab-item slot="tabs" value="tab2">Settings</ore-tab-item>
  <ore-tab-panel value="tab1"><p>Large size panel.</p></ore-tab-panel>
  <ore-tab-panel value="tab2"><p>Settings panel.</p></ore-tab-panel>
</ore-tabs>
```

</ComponentPreview>

## Vertical Tabs

Use `orientation="vertical"` to place the tab list on the side. This works well for settings pages, account sections, or docs-style navigation.

<ComponentPreview>

```html
<ore-tabs value="profile" orientation="vertical" variant="bordered" style="min-height: 320px;">
  <ore-tab-item slot="tabs" value="profile">Profile</ore-tab-item>
  <ore-tab-item slot="tabs" value="security">Security</ore-tab-item>
  <ore-tab-item slot="tabs" value="notifications">Notifications</ore-tab-item>
  <ore-tab-item slot="tabs" value="billing">Billing</ore-tab-item>

  <ore-tab-panel value="profile"><p>Profile preferences and personal details.</p></ore-tab-panel>
  <ore-tab-panel value="security"><p>Password, sessions, and 2FA controls.</p></ore-tab-panel>
  <ore-tab-panel value="notifications"><p>Email and push notification settings.</p></ore-tab-panel>
  <ore-tab-panel value="billing"><p>Plans, invoices, and payment methods.</p></ore-tab-panel>
</ore-tabs>
```

</ComponentPreview>

## Vertical + Manual Activation

For keyboard-heavy interfaces, pair vertical tabs with `activation="manual"` so arrow keys move focus and Enter/Space commits selection.

<ComponentPreview>

```html
<ore-tabs
  value="account"
  orientation="vertical"
  activation="manual"
  variant="ghost"
  color="primary"
  style="min-height: 280px;">
  <ore-tab-item slot="tabs" value="account">Account</ore-tab-item>
  <ore-tab-item slot="tabs" value="privacy">Privacy</ore-tab-item>
  <ore-tab-item slot="tabs" value="integrations">Integrations</ore-tab-item>

  <ore-tab-panel value="account"><p>Account profile and team membership.</p></ore-tab-panel>
  <ore-tab-panel value="privacy"><p>Data export, retention, and consent settings.</p></ore-tab-panel>
  <ore-tab-panel value="integrations"><p>Connected services and API tokens.</p></ore-tab-panel>
</ore-tabs>
```

</ComponentPreview>

## Customization

### Icons & Badges

Use the `prefix` and `suffix` slots on `ore-tab-item` to add icons or notification badges. Keep tab labels short and descriptive (ideally 1–3 words).

<ComponentPreview>

```html
<ore-tabs value="inbox" variant="flat">
  <ore-tab-item slot="tabs" value="inbox">
    <ore-icon slot="prefix" name="inbox" size="18"></ore-icon>
    Inbox
    <ore-badge slot="suffix" color="error" size="sm">4</ore-badge>
  </ore-tab-item>
  <ore-tab-item slot="tabs" value="sent">
    <ore-icon slot="prefix" name="send" size="18"></ore-icon>
    Sent
  </ore-tab-item>
  <ore-tab-item slot="tabs" value="drafts">
    <ore-icon slot="prefix" name="mail" size="18"></ore-icon>
    Drafts
  </ore-tab-item>

  <ore-tab-panel value="inbox"><p>Inbox content.</p></ore-tab-panel>
  <ore-tab-panel value="sent"><p>Sent content.</p></ore-tab-panel>
  <ore-tab-panel value="drafts"><p>Drafts content.</p></ore-tab-panel>
</ore-tabs>
```

</ComponentPreview>

## States

### Lazy Panels

Add `lazy` to a `ore-tab-panel` to defer rendering its slot content until the tab is first activated. Once activated, the content stays rendered even if the tab is later switched away. This is useful for panels containing expensive components or data-fetching logic.

```html
<ore-tabs value="tab1">
  <ore-tab-item slot="tabs" value="tab1">Quick</ore-tab-item>
  <ore-tab-item slot="tabs" value="tab2">Heavy</ore-tab-item>

  <ore-tab-panel value="tab1"><p>Rendered immediately.</p></ore-tab-panel>
  <ore-tab-panel value="tab2" lazy>
    <!-- Only rendered after the "Heavy" tab is first clicked -->
    <my-heavy-component></my-heavy-component>
  </ore-tab-panel>
</ore-tabs>
```

### Disabled Tabs

Prevent specific tabs from being selected. Disabled tabs are skipped during keyboard navigation and have `aria-disabled="true"`.

<ComponentPreview>

```html
<ore-tabs value="tab1" variant="solid">
  <ore-tab-item slot="tabs" value="tab1">Active</ore-tab-item>
  <ore-tab-item slot="tabs" value="tab2" disabled>Disabled</ore-tab-item>
  <ore-tab-item slot="tabs" value="tab3">Normal</ore-tab-item>

  <ore-tab-panel value="tab1"><p>Active panel content.</p></ore-tab-panel>
  <ore-tab-panel value="tab2"><p>This panel is inaccessible.</p></ore-tab-panel>
  <ore-tab-panel value="tab3"><p>Normal panel content.</p></ore-tab-panel>
</ore-tabs>
```

</ComponentPreview>

## Keyboard Navigation

| Key          | Action                                  |
| ------------ | --------------------------------------- |
| `ArrowRight` | Move to the next tab (wraps around)     |
| `ArrowLeft`  | Move to the previous tab (wraps around) |
| `Home`       | Jump to the first tab                   |
| `End`        | Jump to the last tab                    |

Disabled tabs are skipped during keyboard navigation.

## API Reference

**`ore-tabs` Attributes**

| Attribute     | Type                                                                      | Default        | Description                                                           |
| ------------- | ------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------- |
| `value`       | `string`                                                                  | —              | Value of the currently selected tab                                   |
| `variant`     | `'solid' \| 'flat' \| 'bordered' \| 'ghost' \| 'glass' \| 'frost'`        | `'solid'`      | Visual style of the tab bar                                           |
| `size`        | `'sm' \| 'md' \| 'lg'`                                                    | `'md'`         | Size applied to all tab items                                         |
| `color`       | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | —              | Theme color propagated to all tab items                               |
| `orientation` | `'horizontal' \| 'vertical'`                                              | `'horizontal'` | Tab list layout direction                                             |
| `activation`  | `'auto' \| 'manual'`                                                      | `'auto'`       | `auto`: arrow keys select immediately; `manual`: Enter/Space confirms |

**`ore-tabs` Events**

| Event    | Detail              | Description                       |
| -------- | ------------------- | --------------------------------- |
| `change` | `{ value: string }` | Fired when the active tab changes |

**`ore-tabs` Slots**

| Slot      | Description                        |
| --------- | ---------------------------------- |
| `tabs`    | Place `ore-tab-item` elements here  |
| (default) | Place `ore-tab-panel` elements here |

**`ore-tab-item` Attributes**

| Attribute  | Type                                                                      | Default   | Description                                                     |
| ---------- | ------------------------------------------------------------------------- | --------- | --------------------------------------------------------------- |
| `value`    | `string`                                                                  | —         | **Required.** Must match the corresponding `ore-tab-panel` value |
| `active`   | `boolean`                                                                 | `false`   | Whether this tab is selected (managed by `ore-tabs`)             |
| `disabled` | `boolean`                                                                 | `false`   | Prevents the tab from being selected                            |
| `size`     | `'sm' \| 'md' \| 'lg'`                                                    | inherited | Inherited from parent `ore-tabs`                                 |
| `variant`  | `string`                                                                  | inherited | Inherited from parent `ore-tabs`                                 |
| `color`    | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | inherited | Inherited from parent `ore-tabs`                                 |

**`ore-tab-item` Slots**

| Slot      | Description                      |
| --------- | -------------------------------- |
| `prefix`  | Icon or content before the label |
| (default) | Tab label text                   |
| `suffix`  | Badge or count after the label   |

**`ore-tab-panel` Attributes**

| Attribute | Type      | Default | Description                                                     |
| --------- | --------- | ------- | --------------------------------------------------------------- |
| `value`   | `string`  | —       | **Required.** Must match the corresponding `ore-tab-item` value  |
| `active`  | `boolean` | `false` | Whether this panel is visible (managed by `ore-tabs`)            |
| `lazy`    | `boolean` | `false` | Defer rendering slot content until the panel is first activated |

**CSS Custom Properties**

| Property                      | Default                    | Description                                               |
| ----------------------------- | -------------------------- | --------------------------------------------------------- |
| `--tabs-radius`               | `var(--rounded-lg)`        | Border radius of the tablist container and panels         |
| `--tabs-transition`           | `var(--transition-normal)` | Transition duration/easing for the active indicator       |
| `--tabs-indicator-color`      | Theme color                | Color of the sliding active indicator line                |
| `--tabs-bg`                   | Theme-dependent            | Background of the host element (flat variant)             |
| `--tabs-tablist-bg`           | Theme-dependent            | Tablist container background (solid/glass/frost variants) |
| `--tabs-tablist-border-color` | Theme-dependent            | Tablist container border color                            |
| `--tab-panel-padding`         | `var(--size-4)`            | Padding inside each tab panel                             |
| `--tab-item-radius`           | Theme-dependent            | Tab button border radius                                  |
| `--tab-item-color`            | Theme-dependent            | Default tab text color                                    |
| `--tab-item-hover-bg`         | Theme-dependent            | Tab background on hover                                   |
| `--tab-item-active-bg`        | Theme-dependent            | Tab background when active/selected                       |
| `--tab-item-active-color`     | Theme-dependent            | Tab text color when active/selected                       |
| `--tab-item-active-shadow`    | Theme-dependent            | Box shadow when active/selected                           |

## Accessibility

The tabs component follows the WAI-ARIA Tabs Pattern best practices. The tab list has `role="tablist"`. Each tab has `role="tab"` with `aria-selected` and `aria-controls` pointing to its panel. Each panel has `role="tabpanel"` with `aria-labelledby` pointing to its tab. Disabled tabs have `aria-disabled="true"`.

`ArrowRight` / `ArrowLeft` navigate between tabs; `Home` / `End` jump to first / last. Disabled tabs are skipped during keyboard navigation. Avoid nesting tabs inside tabs as it creates confusing navigation hierarchies. Do not use tabs to represent sequential steps; use a stepper component for linear flows. Limit to 5–7 tabs at most — consider a sidebar navigation for larger sets of sections.
