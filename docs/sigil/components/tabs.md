# Tabs

A flexible tabs component for organizing content into switchable panels. Keyboard accessible, animation-ready, and available in six visual styles.

## Features

- 🎨 **6 Variants**: solid, flat, bordered, ghost, glass, frost
- 🌈 **7 Colors**: primary, secondary, info, success, warning, error (+ neutral default)
- 📏 **3 Sizes**: sm, md, lg
- ♿ **Accessible**: Full ARIA roles (`tablist`, `tab`, `tabpanel`), keyboard navigation
- 🔀 **Panel Transitions**: Fade + slide-up animation on panel reveal
- 🧩 **Composable**: Three separate elements — `sg-tabs`, `sg-tab-item`, `sg-tab-panel`

## Source Code

::: details View Source Code (sg-tabs)
<<< @/../packages/sigil/src/disclosure/tabs/tabs.ts
:::

::: details View Source Code (sg-tab-item)
<<< @/../packages/sigil/src/disclosure/tab-item/tab-item.ts
:::

::: details View Source Code (sg-tab-panel)
<<< @/../packages/sigil/src/disclosure/tab-panel/tab-panel.ts
:::

## Basic Usage

```html
<sg-tabs value="overview">
  <sg-tab-item slot="tabs" value="overview">Overview</sg-tab-item>
  <sg-tab-item slot="tabs" value="settings">Settings</sg-tab-item>
  <sg-tab-item slot="tabs" value="billing">Billing</sg-tab-item>

  <sg-tab-panel value="overview"><p>Overview content.</p></sg-tab-panel>
  <sg-tab-panel value="settings"><p>Settings content.</p></sg-tab-panel>
  <sg-tab-panel value="billing"><p>Billing content.</p></sg-tab-panel>
</sg-tabs>

<script type="module">
  import '@vielzeug/sigil/tabs';
  import '@vielzeug/sigil/tab-item';
  import '@vielzeug/sigil/tab-panel';
</script>
```

## Visual Options

### Variants

#### Solid (Default)

Pill-style tabs in a rounded container — clean and contained.

<ComponentPreview>

```html
<sg-tabs value="tab1" variant="solid">
  <sg-tab-item slot="tabs" value="tab1">Overview</sg-tab-item>
  <sg-tab-item slot="tabs" value="tab2">Settings</sg-tab-item>
  <sg-tab-item slot="tabs" value="tab3">Billing</sg-tab-item>
  <sg-tab-panel value="tab1"><p>Overview panel content.</p></sg-tab-panel>
  <sg-tab-panel value="tab2"><p>Settings panel content.</p></sg-tab-panel>
  <sg-tab-panel value="tab3"><p>Billing panel content.</p></sg-tab-panel>
</sg-tabs>
```

</ComponentPreview>

#### Flat

Tabs and panel share a single container background — they read as one unified block.

<ComponentPreview>

```html
<sg-tabs value="tab1" variant="flat">
  <sg-tab-item slot="tabs" value="tab1">Overview</sg-tab-item>
  <sg-tab-item slot="tabs" value="tab2">Settings</sg-tab-item>
  <sg-tab-item slot="tabs" value="tab3">Billing</sg-tab-item>
  <sg-tab-panel value="tab1"><p>Overview panel content.</p></sg-tab-panel>
  <sg-tab-panel value="tab2"><p>Settings panel content.</p></sg-tab-panel>
  <sg-tab-panel value="tab3"><p>Billing panel content.</p></sg-tab-panel>
</sg-tabs>
```

</ComponentPreview>

#### Bordered

Tabs that visually connect to their panel with a shared border.

<ComponentPreview>

```html
<sg-tabs value="tab1" variant="bordered">
  <sg-tab-item slot="tabs" value="tab1">Overview</sg-tab-item>
  <sg-tab-item slot="tabs" value="tab2">Settings</sg-tab-item>
  <sg-tab-item slot="tabs" value="tab3">Billing</sg-tab-item>
  <sg-tab-panel value="tab1"><p>Overview panel content.</p></sg-tab-panel>
  <sg-tab-panel value="tab2"><p>Settings panel content.</p></sg-tab-panel>
  <sg-tab-panel value="tab3"><p>Billing panel content.</p></sg-tab-panel>
</sg-tabs>
```

</ComponentPreview>

#### Ghost

Open tabs with a filled active pill — no container border, floats freely.

<ComponentPreview>

```html
<sg-tabs value="tab1" variant="ghost">
  <sg-tab-item slot="tabs" value="tab1">Overview</sg-tab-item>
  <sg-tab-item slot="tabs" value="tab2">Settings</sg-tab-item>
  <sg-tab-item slot="tabs" value="tab3">Billing</sg-tab-item>
  <sg-tab-panel value="tab1"><p>Overview panel content.</p></sg-tab-panel>
  <sg-tab-panel value="tab2"><p>Settings panel content.</p></sg-tab-panel>
  <sg-tab-panel value="tab3"><p>Billing panel content.</p></sg-tab-panel>
</sg-tabs>
```

</ComponentPreview>

### Glass & Frost Variants

Translucent tab bars with backdrop blur — best used over rich backgrounds.

::: tip Best Used With
Glass and frost variants look best over colorful backgrounds or images to showcase the blur and transparency effects.
:::

<ComponentPreview center background="https://plus.unsplash.com/premium_photo-1685082778336-282f52a3a923?q=80&w=2532&auto=format&fit=crop">

```html
<sg-tabs value="tab1" variant="frost">
  <sg-tab-item slot="tabs" value="tab1">Overview</sg-tab-item>
  <sg-tab-item slot="tabs" value="tab2">Settings</sg-tab-item>
  <sg-tab-item slot="tabs" value="tab3">Billing</sg-tab-item>
  <sg-tab-panel value="tab1"><p>Overview panel content.</p></sg-tab-panel>
  <sg-tab-panel value="tab2"><p>Settings panel content.</p></sg-tab-panel>
  <sg-tab-panel value="tab3"><p>Billing panel content.</p></sg-tab-panel>
</sg-tabs>
<sg-tabs value="tab1" variant="glass">
  <sg-tab-item slot="tabs" value="tab1">Overview</sg-tab-item>
  <sg-tab-item slot="tabs" value="tab2">Settings</sg-tab-item>
  <sg-tab-item slot="tabs" value="tab3">Billing</sg-tab-item>
  <sg-tab-panel value="tab1"><p>Overview panel content.</p></sg-tab-panel>
  <sg-tab-panel value="tab2"><p>Settings panel content.</p></sg-tab-panel>
  <sg-tab-panel value="tab3"><p>Billing panel content.</p></sg-tab-panel>
</sg-tabs>
```

</ComponentPreview>

### Colors

Set `color` on `sg-tabs` to apply a theme color — it propagates automatically to all tab items. The color drives the active pill fill on `ghost`, the focus ring on all variants, and the indicator line on future `underline`-style usage.

<ComponentPreview vertical>

```html
<sg-tabs value="tab1" variant="ghost" color="primary">
  <sg-tab-item slot="tabs" value="tab1">Overview</sg-tab-item>
  <sg-tab-item slot="tabs" value="tab2">Settings</sg-tab-item>
  <sg-tab-item slot="tabs" value="tab3">Billing</sg-tab-item>
  <sg-tab-panel value="tab1"><p>Primary color.</p></sg-tab-panel>
  <sg-tab-panel value="tab2"><p>Settings panel.</p></sg-tab-panel>
  <sg-tab-panel value="tab3"><p>Billing panel.</p></sg-tab-panel>
</sg-tabs>

<sg-tabs value="tab1" variant="ghost" color="secondary">
  <sg-tab-item slot="tabs" value="tab1">Overview</sg-tab-item>
  <sg-tab-item slot="tabs" value="tab2">Settings</sg-tab-item>
  <sg-tab-item slot="tabs" value="tab3">Billing</sg-tab-item>
  <sg-tab-panel value="tab1"><p>Secondary color.</p></sg-tab-panel>
  <sg-tab-panel value="tab2"><p>Settings panel.</p></sg-tab-panel>
  <sg-tab-panel value="tab3"><p>Billing panel.</p></sg-tab-panel>
</sg-tabs>

<sg-tabs value="tab1" variant="ghost" color="success">
  <sg-tab-item slot="tabs" value="tab1">Overview</sg-tab-item>
  <sg-tab-item slot="tabs" value="tab2">Settings</sg-tab-item>
  <sg-tab-item slot="tabs" value="tab3">Billing</sg-tab-item>
  <sg-tab-panel value="tab1"><p>Success color.</p></sg-tab-panel>
  <sg-tab-panel value="tab2"><p>Settings panel.</p></sg-tab-panel>
  <sg-tab-panel value="tab3"><p>Billing panel.</p></sg-tab-panel>
</sg-tabs>

<sg-tabs value="tab1" variant="ghost" color="warning">
  <sg-tab-item slot="tabs" value="tab1">Overview</sg-tab-item>
  <sg-tab-item slot="tabs" value="tab2">Settings</sg-tab-item>
  <sg-tab-item slot="tabs" value="tab3">Billing</sg-tab-item>
  <sg-tab-panel value="tab1"><p>Warning color.</p></sg-tab-panel>
  <sg-tab-panel value="tab2"><p>Settings panel.</p></sg-tab-panel>
  <sg-tab-panel value="tab3"><p>Billing panel.</p></sg-tab-panel>
</sg-tabs>

<sg-tabs value="tab1" variant="ghost" color="error">
  <sg-tab-item slot="tabs" value="tab1">Overview</sg-tab-item>
  <sg-tab-item slot="tabs" value="tab2">Settings</sg-tab-item>
  <sg-tab-item slot="tabs" value="tab3">Billing</sg-tab-item>
  <sg-tab-panel value="tab1"><p>Error color.</p></sg-tab-panel>
  <sg-tab-panel value="tab2"><p>Settings panel.</p></sg-tab-panel>
  <sg-tab-panel value="tab3"><p>Billing panel.</p></sg-tab-panel>
</sg-tabs>

<sg-tabs value="tab1" variant="ghost" color="info">
  <sg-tab-item slot="tabs" value="tab1">Overview</sg-tab-item>
  <sg-tab-item slot="tabs" value="tab2">Settings</sg-tab-item>
  <sg-tab-item slot="tabs" value="tab3">Billing</sg-tab-item>
  <sg-tab-panel value="tab1"><p>Info color.</p></sg-tab-panel>
  <sg-tab-panel value="tab2"><p>Settings panel.</p></sg-tab-panel>
  <sg-tab-panel value="tab3"><p>Billing panel.</p></sg-tab-panel>
</sg-tabs>
```

</ComponentPreview>

### Sizes

<ComponentPreview vertical>

```html
<sg-tabs value="tab1" size="sm">
  <sg-tab-item slot="tabs" value="tab1">Overview</sg-tab-item>
  <sg-tab-item slot="tabs" value="tab2">Settings</sg-tab-item>
  <sg-tab-panel value="tab1"><p>Small size panel.</p></sg-tab-panel>
  <sg-tab-panel value="tab2"><p>Settings panel.</p></sg-tab-panel>
</sg-tabs>

<sg-tabs value="tab1" size="md">
  <sg-tab-item slot="tabs" value="tab1">Overview</sg-tab-item>
  <sg-tab-item slot="tabs" value="tab2">Settings</sg-tab-item>
  <sg-tab-panel value="tab1"><p>Medium size panel.</p></sg-tab-panel>
  <sg-tab-panel value="tab2"><p>Settings panel.</p></sg-tab-panel>
</sg-tabs>

<sg-tabs value="tab1" size="lg">
  <sg-tab-item slot="tabs" value="tab1">Overview</sg-tab-item>
  <sg-tab-item slot="tabs" value="tab2">Settings</sg-tab-item>
  <sg-tab-panel value="tab1"><p>Large size panel.</p></sg-tab-panel>
  <sg-tab-panel value="tab2"><p>Settings panel.</p></sg-tab-panel>
</sg-tabs>
```

</ComponentPreview>

### Vertical Tabs

Use `orientation="vertical"` to place the tab list on the side. This works well for settings pages, account sections, or docs-style navigation.

<ComponentPreview>

```html
<sg-tabs value="profile" orientation="vertical" variant="bordered" style="min-height: 320px;">
  <sg-tab-item slot="tabs" value="profile">Profile</sg-tab-item>
  <sg-tab-item slot="tabs" value="security">Security</sg-tab-item>
  <sg-tab-item slot="tabs" value="notifications">Notifications</sg-tab-item>
  <sg-tab-item slot="tabs" value="billing">Billing</sg-tab-item>

  <sg-tab-panel value="profile"><p>Profile preferences and personal details.</p></sg-tab-panel>
  <sg-tab-panel value="security"><p>Password, sessions, and 2FA controls.</p></sg-tab-panel>
  <sg-tab-panel value="notifications"><p>Email and push notification settings.</p></sg-tab-panel>
  <sg-tab-panel value="billing"><p>Plans, invoices, and payment methods.</p></sg-tab-panel>
</sg-tabs>
```

</ComponentPreview>

### Vertical + Manual Activation

For keyboard-heavy interfaces, pair vertical tabs with `activation="manual"` so arrow keys move focus and Enter/Space commits selection.

<ComponentPreview>

```html
<sg-tabs
  value="account"
  orientation="vertical"
  activation="manual"
  variant="ghost"
  color="primary"
  style="min-height: 280px;">
  <sg-tab-item slot="tabs" value="account">Account</sg-tab-item>
  <sg-tab-item slot="tabs" value="privacy">Privacy</sg-tab-item>
  <sg-tab-item slot="tabs" value="integrations">Integrations</sg-tab-item>

  <sg-tab-panel value="account"><p>Account profile and team membership.</p></sg-tab-panel>
  <sg-tab-panel value="privacy"><p>Data export, retention, and consent settings.</p></sg-tab-panel>
  <sg-tab-panel value="integrations"><p>Connected services and API tokens.</p></sg-tab-panel>
</sg-tabs>
```

</ComponentPreview>

## Customization

### Icons & Badges

Use the `prefix` and `suffix` slots on `sg-tab-item` to add icons or notification badges.

<ComponentPreview>

```html
<sg-tabs value="inbox" variant="flat">
  <sg-tab-item slot="tabs" value="inbox">
    <sg-icon slot="prefix" name="inbox" size="18"></sg-icon>
    Inbox
    <sg-badge slot="suffix" color="error" size="sm">4</sg-badge>
  </sg-tab-item>
  <sg-tab-item slot="tabs" value="sent">
    <sg-icon slot="prefix" name="send" size="18"></sg-icon>
    Sent
  </sg-tab-item>
  <sg-tab-item slot="tabs" value="drafts">
    <sg-icon slot="prefix" name="mail" size="18"></sg-icon>
    Drafts
  </sg-tab-item>

  <sg-tab-panel value="inbox"><p>Inbox content.</p></sg-tab-panel>
  <sg-tab-panel value="sent"><p>Sent content.</p></sg-tab-panel>
  <sg-tab-panel value="drafts"><p>Drafts content.</p></sg-tab-panel>
</sg-tabs>

<script type="module">
  import '@vielzeug/sigil/tabs';
  import '@vielzeug/sigil/tab-item';
  import '@vielzeug/sigil/tab-panel';
  import '@vielzeug/sigil/badge';
  import '@vielzeug/sigil/icon';
</script>
```

</ComponentPreview>

## States

### Lazy Panels

Add `lazy` to a `sg-tab-panel` to defer rendering its slot content until the tab is first activated. Once activated, the content stays rendered even if the tab is later switched away. This is useful for panels containing expensive components or data-fetching logic.

```html
<sg-tabs value="tab1">
  <sg-tab-item slot="tabs" value="tab1">Quick</sg-tab-item>
  <sg-tab-item slot="tabs" value="tab2">Heavy</sg-tab-item>

  <sg-tab-panel value="tab1"><p>Rendered immediately.</p></sg-tab-panel>
  <sg-tab-panel value="tab2" lazy>
    <!-- Only rendered after the "Heavy" tab is first clicked -->
    <my-heavy-component></my-heavy-component>
  </sg-tab-panel>
</sg-tabs>
```

### Disabled Tabs

Prevent specific tabs from being selected.

<ComponentPreview>

```html
<sg-tabs value="tab1" variant="solid">
  <sg-tab-item slot="tabs" value="tab1">Active</sg-tab-item>
  <sg-tab-item slot="tabs" value="tab2" disabled>Disabled</sg-tab-item>
  <sg-tab-item slot="tabs" value="tab3">Normal</sg-tab-item>

  <sg-tab-panel value="tab1"><p>Active panel content.</p></sg-tab-panel>
  <sg-tab-panel value="tab2"><p>This panel is inaccessible.</p></sg-tab-panel>
  <sg-tab-panel value="tab3"><p>Normal panel content.</p></sg-tab-panel>
</sg-tabs>
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

### `sg-tabs` Attributes

| Attribute | Type                                                                      | Default   | Description                             |
| --------- | ------------------------------------------------------------------------- | --------- | --------------------------------------- |
| `value`   | `string`                                                                  | —         | Value of the currently selected tab     |
| `variant` | `'solid' \| 'flat' \| 'bordered' \| 'ghost' \| 'glass' \| 'frost'`        | `'solid'` | Visual style of the tab bar             |
| `size`    | `'sm' \| 'md' \| 'lg'`                                                    | `'md'`    | Size applied to all tab items           |
| `color`   | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | —         | Theme color propagated to all tab items |

### `sg-tabs` Events

| Event    | Detail              | Description                       |
| -------- | ------------------- | --------------------------------- |
| `change` | `{ value: string }` | Fired when the active tab changes |

### `sg-tabs` Slots

| Slot      | Description                         |
| --------- | ----------------------------------- |
| `tabs`    | Place `sg-tab-item` elements here  |
| (default) | Place `sg-tab-panel` elements here |

### `sg-tab-item` Attributes

| Attribute  | Type                                                                      | Default   | Description                                                      |
| ---------- | ------------------------------------------------------------------------- | --------- | ---------------------------------------------------------------- |
| `value`    | `string`                                                                  | —         | **Required.** Must match the corresponding `sg-tab-panel` value |
| `active`   | `boolean`                                                                 | `false`   | Whether this tab is selected (managed by `sg-tabs`)             |
| `disabled` | `boolean`                                                                 | `false`   | Prevents the tab from being selected                             |
| `size`     | `'sm' \| 'md' \| 'lg'`                                                    | inherited | Inherited from parent `sg-tabs`                                 |
| `variant`  | `string`                                                                  | inherited | Inherited from parent `sg-tabs`                                 |
| `color`    | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | inherited | Inherited from parent `sg-tabs`                                 |

### `sg-tab-item` Slots

| Slot      | Description                      |
| --------- | -------------------------------- |
| `prefix`  | Icon or content before the label |
| (default) | Tab label text                   |
| `suffix`  | Badge or count after the label   |

### `sg-tab-panel` Attributes

| Attribute | Type      | Default | Description                                                     |
| --------- | --------- | ------- | --------------------------------------------------------------- |
| `value`   | `string`  | —       | **Required.** Must match the corresponding `sg-tab-item` value |
| `active`  | `boolean` | `false` | Whether this panel is visible (managed by `sg-tabs`)           |
| `lazy`    | `boolean` | `false` | Defer rendering slot content until the panel is first activated |

### CSS Custom Properties

| Property              | Default                    | Description                            |
| --------------------- | -------------------------- | -------------------------------------- |
| `--tabs-transition`   | `var(--transition-normal)` | Transition speed for tab hover states  |
| `--tabs-radius`       | `var(--rounded-lg)`        | Border radius of the tab bar container |
| `--tab-panel-padding` | `var(--size-4)`            | Padding inside each tab panel          |

## Accessibility

The tabs component follows the WAI-ARIA Tabs Pattern best practices.

### `sg-tabs`

✅ **Keyboard Navigation**

- `ArrowRight` / `ArrowLeft` navigate between tabs; `Home` / `End` jump to first / last.
- Disabled tabs are skipped during keyboard navigation.

✅ **Screen Readers**

- The tab list has `role="tablist"`.
- Each tab has `role="tab"` with `aria-selected` and `aria-controls` pointing to its panel.
- Each panel has `role="tabpanel"` with `aria-labelledby` pointing to its tab.
- Disabled tabs have `aria-disabled="true"`.

## Best Practices

**Do:**

- Keep tab labels short and descriptive (ideally 1–3 words).
- Always set a default `value` on `sg-tabs` so a tab is active on first render.
- Use the `prefix` and `suffix` slots on `sg-tab-item` to add icons or notification counts.
- Use `variant="bordered"` or `variant="flat"` when tabs need to feel visually connected to the panel content below them.

**Don't:**

- Use more than 5–7 tabs — consider a sidebar navigation for larger sets of sections.
- Use tabs to represent sequential steps; use a stepper component for linear flows.
- Nest tabs inside tabs — it creates confusing navigation hierarchies.
