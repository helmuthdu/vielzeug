# Tabs Component

A flexible tabs component for organizing content into switchable panels. Keyboard accessible, animation-ready, and available in six visual styles.

## Features

- 🎨 **6 Variants**: solid, flat, bordered, ghost, glass, frost
- 🌈 **7 Colors**: primary, secondary, info, success, warning, error (+ neutral default)
- 📏 **3 Sizes**: sm, md, lg
- ♿ **Accessible**: Full ARIA roles (`tablist`, `tab`, `tabpanel`), keyboard navigation
- 🔀 **Panel Transitions**: Fade + slide-up animation on panel reveal
- 🧩 **Composable**: Three separate elements — `bit-tabs`, `bit-tab-item`, `bit-tab-panel`

## Source Code

::: details View Source Code (bit-tabs)
<<< @/../packages/buildit/src/disclosure/tabs/tabs.ts
:::

::: details View Source Code (bit-tab-item)
<<< @/../packages/buildit/src/disclosure/tab-item/tab-item.ts
:::

::: details View Source Code (bit-tab-panel)
<<< @/../packages/buildit/src/disclosure/tab-panel/tab-panel.ts
:::

## Basic Usage

```html
<bit-tabs value="overview">
  <bit-tab-item slot="tabs" value="overview">Overview</bit-tab-item>
  <bit-tab-item slot="tabs" value="settings">Settings</bit-tab-item>
  <bit-tab-item slot="tabs" value="billing">Billing</bit-tab-item>

  <bit-tab-panel value="overview"><p>Overview content.</p></bit-tab-panel>
  <bit-tab-panel value="settings"><p>Settings content.</p></bit-tab-panel>
  <bit-tab-panel value="billing"><p>Billing content.</p></bit-tab-panel>
</bit-tabs>

<script type="module">
  import '@vielzeug/buildit/tabs';
  import '@vielzeug/buildit/tab-item';
  import '@vielzeug/buildit/tab-panel';
</script>
```

## Visual Options

### Variants

#### Solid (Default)

Pill-style tabs in a rounded container — clean and contained.

<ComponentPreview>

```html
<bit-tabs value="tab1" variant="solid">
  <bit-tab-item slot="tabs" value="tab1">Overview</bit-tab-item>
  <bit-tab-item slot="tabs" value="tab2">Settings</bit-tab-item>
  <bit-tab-item slot="tabs" value="tab3">Billing</bit-tab-item>
  <bit-tab-panel value="tab1"><p>Overview panel content.</p></bit-tab-panel>
  <bit-tab-panel value="tab2"><p>Settings panel content.</p></bit-tab-panel>
  <bit-tab-panel value="tab3"><p>Billing panel content.</p></bit-tab-panel>
</bit-tabs>
```

</ComponentPreview>

#### Flat

Tabs and panel share a single container background — they read as one unified block.

<ComponentPreview>

```html
<bit-tabs value="tab1" variant="flat">
  <bit-tab-item slot="tabs" value="tab1">Overview</bit-tab-item>
  <bit-tab-item slot="tabs" value="tab2">Settings</bit-tab-item>
  <bit-tab-item slot="tabs" value="tab3">Billing</bit-tab-item>
  <bit-tab-panel value="tab1"><p>Overview panel content.</p></bit-tab-panel>
  <bit-tab-panel value="tab2"><p>Settings panel content.</p></bit-tab-panel>
  <bit-tab-panel value="tab3"><p>Billing panel content.</p></bit-tab-panel>
</bit-tabs>
```

</ComponentPreview>

#### Bordered

Tabs that visually connect to their panel with a shared border.

<ComponentPreview>

```html
<bit-tabs value="tab1" variant="bordered">
  <bit-tab-item slot="tabs" value="tab1">Overview</bit-tab-item>
  <bit-tab-item slot="tabs" value="tab2">Settings</bit-tab-item>
  <bit-tab-item slot="tabs" value="tab3">Billing</bit-tab-item>
  <bit-tab-panel value="tab1"><p>Overview panel content.</p></bit-tab-panel>
  <bit-tab-panel value="tab2"><p>Settings panel content.</p></bit-tab-panel>
  <bit-tab-panel value="tab3"><p>Billing panel content.</p></bit-tab-panel>
</bit-tabs>
```

</ComponentPreview>

#### Ghost

Open tabs with a filled active pill — no container border, floats freely.

<ComponentPreview>

```html
<bit-tabs value="tab1" variant="ghost">
  <bit-tab-item slot="tabs" value="tab1">Overview</bit-tab-item>
  <bit-tab-item slot="tabs" value="tab2">Settings</bit-tab-item>
  <bit-tab-item slot="tabs" value="tab3">Billing</bit-tab-item>
  <bit-tab-panel value="tab1"><p>Overview panel content.</p></bit-tab-panel>
  <bit-tab-panel value="tab2"><p>Settings panel content.</p></bit-tab-panel>
  <bit-tab-panel value="tab3"><p>Billing panel content.</p></bit-tab-panel>
</bit-tabs>
```

</ComponentPreview>

### Glass & Frost Variants

Translucent tab bars with backdrop blur — best used over rich backgrounds.

::: tip Best Used With
Glass and frost variants look best over colorful backgrounds or images to showcase the blur and transparency effects.
:::

<ComponentPreview center background="https://plus.unsplash.com/premium_photo-1685082778336-282f52a3a923?q=80&w=2532&auto=format&fit=crop">

```html
<bit-tabs value="tab1" variant="frost">
  <bit-tab-item slot="tabs" value="tab1">Overview</bit-tab-item>
  <bit-tab-item slot="tabs" value="tab2">Settings</bit-tab-item>
  <bit-tab-item slot="tabs" value="tab3">Billing</bit-tab-item>
  <bit-tab-panel value="tab1"><p>Overview panel content.</p></bit-tab-panel>
  <bit-tab-panel value="tab2"><p>Settings panel content.</p></bit-tab-panel>
  <bit-tab-panel value="tab3"><p>Billing panel content.</p></bit-tab-panel>
</bit-tabs>
<bit-tabs value="tab1" variant="glass">
  <bit-tab-item slot="tabs" value="tab1">Overview</bit-tab-item>
  <bit-tab-item slot="tabs" value="tab2">Settings</bit-tab-item>
  <bit-tab-item slot="tabs" value="tab3">Billing</bit-tab-item>
  <bit-tab-panel value="tab1"><p>Overview panel content.</p></bit-tab-panel>
  <bit-tab-panel value="tab2"><p>Settings panel content.</p></bit-tab-panel>
  <bit-tab-panel value="tab3"><p>Billing panel content.</p></bit-tab-panel>
</bit-tabs>
```

</ComponentPreview>

### Colors

Set `color` on `bit-tabs` to apply a theme color — it propagates automatically to all tab items. The color drives the active pill fill on `ghost`, the focus ring on all variants, and the indicator line on future `underline`-style usage.

<ComponentPreview vertical>

```html
<bit-tabs value="tab1" variant="ghost" color="primary">
  <bit-tab-item slot="tabs" value="tab1">Overview</bit-tab-item>
  <bit-tab-item slot="tabs" value="tab2">Settings</bit-tab-item>
  <bit-tab-item slot="tabs" value="tab3">Billing</bit-tab-item>
  <bit-tab-panel value="tab1"><p>Primary color.</p></bit-tab-panel>
  <bit-tab-panel value="tab2"><p>Settings panel.</p></bit-tab-panel>
  <bit-tab-panel value="tab3"><p>Billing panel.</p></bit-tab-panel>
</bit-tabs>

<bit-tabs value="tab1" variant="ghost" color="secondary">
  <bit-tab-item slot="tabs" value="tab1">Overview</bit-tab-item>
  <bit-tab-item slot="tabs" value="tab2">Settings</bit-tab-item>
  <bit-tab-item slot="tabs" value="tab3">Billing</bit-tab-item>
  <bit-tab-panel value="tab1"><p>Secondary color.</p></bit-tab-panel>
  <bit-tab-panel value="tab2"><p>Settings panel.</p></bit-tab-panel>
  <bit-tab-panel value="tab3"><p>Billing panel.</p></bit-tab-panel>
</bit-tabs>

<bit-tabs value="tab1" variant="ghost" color="success">
  <bit-tab-item slot="tabs" value="tab1">Overview</bit-tab-item>
  <bit-tab-item slot="tabs" value="tab2">Settings</bit-tab-item>
  <bit-tab-item slot="tabs" value="tab3">Billing</bit-tab-item>
  <bit-tab-panel value="tab1"><p>Success color.</p></bit-tab-panel>
  <bit-tab-panel value="tab2"><p>Settings panel.</p></bit-tab-panel>
  <bit-tab-panel value="tab3"><p>Billing panel.</p></bit-tab-panel>
</bit-tabs>

<bit-tabs value="tab1" variant="ghost" color="warning">
  <bit-tab-item slot="tabs" value="tab1">Overview</bit-tab-item>
  <bit-tab-item slot="tabs" value="tab2">Settings</bit-tab-item>
  <bit-tab-item slot="tabs" value="tab3">Billing</bit-tab-item>
  <bit-tab-panel value="tab1"><p>Warning color.</p></bit-tab-panel>
  <bit-tab-panel value="tab2"><p>Settings panel.</p></bit-tab-panel>
  <bit-tab-panel value="tab3"><p>Billing panel.</p></bit-tab-panel>
</bit-tabs>

<bit-tabs value="tab1" variant="ghost" color="error">
  <bit-tab-item slot="tabs" value="tab1">Overview</bit-tab-item>
  <bit-tab-item slot="tabs" value="tab2">Settings</bit-tab-item>
  <bit-tab-item slot="tabs" value="tab3">Billing</bit-tab-item>
  <bit-tab-panel value="tab1"><p>Error color.</p></bit-tab-panel>
  <bit-tab-panel value="tab2"><p>Settings panel.</p></bit-tab-panel>
  <bit-tab-panel value="tab3"><p>Billing panel.</p></bit-tab-panel>
</bit-tabs>

<bit-tabs value="tab1" variant="ghost" color="info">
  <bit-tab-item slot="tabs" value="tab1">Overview</bit-tab-item>
  <bit-tab-item slot="tabs" value="tab2">Settings</bit-tab-item>
  <bit-tab-item slot="tabs" value="tab3">Billing</bit-tab-item>
  <bit-tab-panel value="tab1"><p>Info color.</p></bit-tab-panel>
  <bit-tab-panel value="tab2"><p>Settings panel.</p></bit-tab-panel>
  <bit-tab-panel value="tab3"><p>Billing panel.</p></bit-tab-panel>
</bit-tabs>
```

</ComponentPreview>

### Sizes

<ComponentPreview vertical>

```html
<bit-tabs value="tab1" size="sm">
  <bit-tab-item slot="tabs" value="tab1">Overview</bit-tab-item>
  <bit-tab-item slot="tabs" value="tab2">Settings</bit-tab-item>
  <bit-tab-panel value="tab1"><p>Small size panel.</p></bit-tab-panel>
  <bit-tab-panel value="tab2"><p>Settings panel.</p></bit-tab-panel>
</bit-tabs>

<bit-tabs value="tab1" size="md">
  <bit-tab-item slot="tabs" value="tab1">Overview</bit-tab-item>
  <bit-tab-item slot="tabs" value="tab2">Settings</bit-tab-item>
  <bit-tab-panel value="tab1"><p>Medium size panel.</p></bit-tab-panel>
  <bit-tab-panel value="tab2"><p>Settings panel.</p></bit-tab-panel>
</bit-tabs>

<bit-tabs value="tab1" size="lg">
  <bit-tab-item slot="tabs" value="tab1">Overview</bit-tab-item>
  <bit-tab-item slot="tabs" value="tab2">Settings</bit-tab-item>
  <bit-tab-panel value="tab1"><p>Large size panel.</p></bit-tab-panel>
  <bit-tab-panel value="tab2"><p>Settings panel.</p></bit-tab-panel>
</bit-tabs>
```

</ComponentPreview>

## Customization

### Icons & Badges

Use the `prefix` and `suffix` slots on `bit-tab-item` to add icons or notification badges.

<ComponentPreview>

```html
<bit-tabs value="inbox" variant="flat">
  <bit-tab-item slot="tabs" value="inbox">
    <span slot="prefix" class="material-symbols-rounded">inbox</span>
    Inbox
    <bit-badge slot="suffix" color="error" size="sm">4</bit-badge>
  </bit-tab-item>
  <bit-tab-item slot="tabs" value="sent">
    <span slot="prefix" class="material-symbols-rounded">send</span>
    Sent
  </bit-tab-item>
  <bit-tab-item slot="tabs" value="drafts">
    <span slot="prefix" class="material-symbols-rounded">draft</span>
    Drafts
  </bit-tab-item>

  <bit-tab-panel value="inbox"><p>Your inbox messages.</p></bit-tab-panel>
  <bit-tab-panel value="sent"><p>Sent items.</p></bit-tab-panel>
  <bit-tab-panel value="drafts"><p>Draft messages.</p></bit-tab-panel>
</bit-tabs>
```

</ComponentPreview>

## States

### Disabled Tabs

Prevent specific tabs from being selected.

<ComponentPreview>

```html
<bit-tabs value="tab1" variant="solid">
  <bit-tab-item slot="tabs" value="tab1">Active</bit-tab-item>
  <bit-tab-item slot="tabs" value="tab2" disabled>Disabled</bit-tab-item>
  <bit-tab-item slot="tabs" value="tab3">Normal</bit-tab-item>

  <bit-tab-panel value="tab1"><p>Active panel content.</p></bit-tab-panel>
  <bit-tab-panel value="tab2"><p>This panel is inaccessible.</p></bit-tab-panel>
  <bit-tab-panel value="tab3"><p>Normal panel content.</p></bit-tab-panel>
</bit-tabs>
```

</ComponentPreview>

## Keyboard Navigation

| Key | Action |
|---|---|
| `ArrowRight` | Move to the next tab (wraps around) |
| `ArrowLeft` | Move to the previous tab (wraps around) |
| `Home` | Jump to the first tab |
| `End` | Jump to the last tab |

Disabled tabs are skipped during keyboard navigation.

## Events

```js
const tabs = document.querySelector('bit-tabs');

tabs.addEventListener('change', (e) => {
  console.log('Active tab:', e.detail.value);
});
```

## API Reference

### `bit-tabs` Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `value` | `string` | — | Value of the currently selected tab |
| `variant` | `'solid' \| 'flat' \| 'bordered' \| 'ghost' \| 'glass' \| 'frost'` | `'solid'` | Visual style of the tab bar |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size applied to all tab items |
| `color` | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | — | Theme color propagated to all tab items |

### `bit-tabs` Events

| Event | Detail | Description |
|---|---|---|
| `change` | `{ value: string }` | Fired when the active tab changes |

### `bit-tabs` Slots

| Slot | Description |
|---|---|
| `tabs` | Place `bit-tab-item` elements here |
| (default) | Place `bit-tab-panel` elements here |

### `bit-tab-item` Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `value` | `string` | — | **Required.** Must match the corresponding `bit-tab-panel` value |
| `active` | `boolean` | `false` | Whether this tab is selected (managed by `bit-tabs`) |
| `disabled` | `boolean` | `false` | Prevents the tab from being selected |
| `size` | `'sm' \| 'md' \| 'lg'` | inherited | Inherited from parent `bit-tabs` |
| `variant` | `string` | inherited | Inherited from parent `bit-tabs` |
| `color` | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | inherited | Inherited from parent `bit-tabs` |

### `bit-tab-item` Slots

| Slot | Description |
|---|---|
| `prefix` | Icon or content before the label |
| (default) | Tab label text |
| `suffix` | Badge or count after the label |

### `bit-tab-panel` Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `value` | `string` | — | **Required.** Must match the corresponding `bit-tab-item` value |
| `active` | `boolean` | `false` | Whether this panel is visible (managed by `bit-tabs`) |

### CSS Custom Properties

| Property | Default | Description |
|---|---|---|
| `--tabs-transition` | `var(--transition-normal)` | Transition speed for tab hover states |
| `--tabs-radius` | `var(--rounded-md)` | Border radius of the tab bar container |
| `--tab-panel-padding` | `var(--size-4)` | Padding inside each tab panel |
