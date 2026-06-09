# Accordion

A flexible accordion component for organizing collapsible content sections. Built with native `<details>` and `<summary>` elements for accessibility and progressive enhancement.

## Features

- <sg-icon name="palette" size="16"></sg-icon> **6 Variants**: solid, flat, bordered, outline, ghost, text
- <sg-icon name="refresh-cw" size="16"></sg-icon> **Selection Modes**: Single or multiple expansion
- <sg-icon name="ruler" size="16"></sg-icon> **3 Sizes**: sm, md, lg- <sg-icon name="clapperboard" size="16"></sg-icon> **Smooth Animation**: content height animates via CSS `grid-template-rows` — no layout thrashing- <sg-icon name="accessibility" size="16"></sg-icon> **Accessible**: Native HTML semantics, keyboard navigation, screen reader friendly
- <sg-icon name="crosshair" size="16"></sg-icon> **Flexible Content**: Support for icons, subtitles, and custom content

## Source Code

::: details View Source Code
<<< @/../packages/sigil/src/disclosure/accordion/accordion.ts
:::

::: details View Source Code (Accordion Item)
<<< @/../packages/sigil/src/disclosure/accordion-item/accordion-item.ts
:::

## Basic Usage

```html
<sg-accordion>
  <sg-accordion-item>
    <span slot="title">First Section</span>
    Content for the first section goes here.
  </sg-accordion-item>
</sg-accordion>
```

## Visual Options

### Selection Modes

#### Multiple (Default)

Allow multiple items to be expanded simultaneously.

<ComponentPreview vertical>

```html
<sg-accordion variant="solid" selection-mode="multiple">
  <sg-accordion-item>
    <span slot="title">Section 1</span>
    Content 1
  </sg-accordion-item>
  <sg-accordion-item>
    <span slot="title">Section 2</span>
    Content 2
  </sg-accordion-item>
</sg-accordion>
```

</ComponentPreview>

#### Single

Only one item can be expanded at a time.

<ComponentPreview vertical>

```html
<sg-accordion variant="outline" selection-mode="single">
  <sg-accordion-item>
    <span slot="title">Section 1</span>
    Content 1
  </sg-accordion-item>
  <sg-accordion-item>
    <span slot="title">Section 2</span>
    Content 2
  </sg-accordion-item>
</sg-accordion>
```

</ComponentPreview>

### Variants

Six standard variants plus glass and frost — applied to all items via the parent accordion.

<ComponentPreview vertical>

```html
<sg-accordion variant="solid">
  <sg-accordion-item>
    <span slot="title">Solid Variant</span>
    Content
  </sg-accordion-item>
</sg-accordion>
<sg-accordion variant="flat">
  <sg-accordion-item>
    <span slot="title">Flat Variant</span>
    Content
  </sg-accordion-item>
</sg-accordion>
<sg-accordion variant="bordered">
  <sg-accordion-item>
    <span slot="title">Bordered Variant</span>
    Content
  </sg-accordion-item>
</sg-accordion>
<sg-accordion variant="outline">
  <sg-accordion-item>
    <span slot="title">Outline Variant</span>
    Content
  </sg-accordion-item>
</sg-accordion>
<sg-accordion variant="ghost">
  <sg-accordion-item>
    <span slot="title">Ghost Variant</span>
    Content
  </sg-accordion-item>
</sg-accordion>
<sg-accordion variant="text">
  <sg-accordion-item>
    <span slot="title">Text Variant</span>
    Content
  </sg-accordion-item>
</sg-accordion>
```

</ComponentPreview>

### Glass & Frost Variants

Modern effects with backdrop blur for elevated UI elements.

::: tip Best Used With
Glass and frost variants work best when placed over colorful backgrounds or images to showcase the blur and transparency effects.
:::

<ComponentPreview center background="https://plus.unsplash.com/premium_photo-1685082778336-282f52a3a923?q=80&w=2532&auto=format&fit=crop">

```html
<sg-accordion variant="glass">
  <sg-accordion-item>
    <sg-icon slot="prefix" name="heart" size="18"></sg-icon>
    <span slot="title">Item 1</span>
    <span slot="subtitle">Subitem 1</span>
    Content
  </sg-accordion-item>
  <sg-accordion-item>
    <sg-icon slot="prefix" name="help-circle" size="18"></sg-icon>
    <span slot="title">Item 2</span>
    <span slot="subtitle">Subitem 2</span>
    Content
  </sg-accordion-item>
  <sg-accordion-item>
    <sg-icon slot="prefix" name="bookmark" size="18"></sg-icon>
    <span slot="title">Item 3</span>
    <span slot="subtitle">Subitem 3</span>
    Content
  </sg-accordion-item>
</sg-accordion>
<sg-accordion variant="frost">
  <sg-accordion-item>
    <sg-icon slot="prefix" name="heart" size="18"></sg-icon>
    <span slot="title">Item 1</span>
    <span slot="subtitle">Subitem 1</span>
    Content
  </sg-accordion-item>
  <sg-accordion-item>
    <sg-icon slot="prefix" name="help-circle" size="18"></sg-icon>
    <span slot="title">Item 2</span>
    <span slot="subtitle">Subitem 2</span>
    Content
  </sg-accordion-item>
  <sg-accordion-item>
    <sg-icon slot="prefix" name="bookmark" size="18"></sg-icon>
    <span slot="title">Item 3</span>
    <span slot="subtitle">Subitem 3</span>
    Content
  </sg-accordion-item>
</sg-accordion>

```

</ComponentPreview>

### Sizes

Three sizes for different contexts.

<ComponentPreview vertical>

```html
<sg-accordion size="sm">
  <sg-accordion-item>
    <span slot="title">Small size</span>
    Content
  </sg-accordion-item>
</sg-accordion>
<sg-accordion size="md">
  <sg-accordion-item>
    <span slot="title">Medium Size</span>
    Content
  </sg-accordion-item>
</sg-accordion>
<sg-accordion size="lg">
  <sg-accordion-item>
    <span slot="title">Large size</span>
    Content
  </sg-accordion-item>
</sg-accordion>
```

</ComponentPreview>

## Customization

### Icons & Subtitles

Add icons or descriptive subtitles using slots.

<ComponentPreview vertical>

```html
<sg-accordion variant="bordered">
  <sg-accordion-item>
    <sg-icon slot="prefix" name="wind" size="18"></sg-icon>
    <span slot="title">Cloud Storage</span>
    <span slot="subtitle">Manage your files and backups</span>
    <p>Access and manage all your cloud storage files, folders, and backups from this central location.</p>
  </sg-accordion-item>
  <sg-accordion-item>
    <sg-icon slot="prefix" name="shield" size="18"></sg-icon>
    <span slot="title">Security Settings</span>
    <span slot="subtitle">Two-factor authentication and password management</span>
    <p>Configure security options including 2FA, password policies, and login alerts.</p>
  </sg-accordion-item>
  <sg-accordion-item>
    <sg-icon slot="prefix" name="smile-plus" size="18"></sg-icon>
    <span slot="title">Appearance</span>
    <span slot="subtitle">Theme, colors, and layout preferences</span>
    <p>Customize the look and feel of your application with theme and color options.</p>
  </sg-accordion-item>
</sg-accordion>

```

</ComponentPreview>

## States

### Disabled

Prevent interaction with specific items.

<ComponentPreview vertical>

```html
<sg-accordion variant="text">
  <sg-accordion-item>
    <span slot="title">Normal Section</span>
    Content
  </sg-accordion-item>
  <sg-accordion-item disabled>
    <span slot="title">Disabled Section</span>
    Content
  </sg-accordion-item>
</sg-accordion>
```

</ComponentPreview>

## API Reference

### `sg-accordion` Attributes

| Attribute        | Type                                                                | Default      | Description                                           |
| ---------------- | ------------------------------------------------------------------- | ------------ | ----------------------------------------------------- |
| `selection-mode` | `'single' \| 'multiple'`                                                                    | `'multiple'` | Whether multiple items can be expanded simultaneously |
| `variant`        | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost' \| 'text' \| 'glass' \| 'frost'` | `'solid'`    | Visual variant applied to all items                   |
| `size`           | `'sm' \| 'md' \| 'lg'`                                              | `'md'`       | Size applied to all items                             |

### `sg-accordion-item` Attributes

| Attribute  | Type                                                                | Default   | Description                             |
| ---------- | ------------------------------------------------------------------- | --------- | --------------------------------------- |
| `expanded` | `boolean`                                                           | `false`   | Whether the item is expanded            |
| `disabled` | `boolean`                                                           | `false`   | Disable the item (prevents toggling)    |
| `variant`  | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost' \| 'text' \| 'glass' \| 'frost'` | `'solid'` | Visual variant (usually set via parent) |
| `size`     | `'sm' \| 'md' \| 'lg'`                                              | `'md'`    | Size (usually set via parent)           |

### Slots

#### `sg-accordion-item`

| Slot       | Description                                            |
| ---------- | ------------------------------------------------------ |
| (default)  | Content shown when item is expanded                    |
| `title`    | Title/summary content                                  |
| `subtitle` | Subtitle text shown below the title                    |
| `prefix`   | Content before the title (icons, etc.)                 |
| `suffix`   | Content after the title (badges, custom chevron, etc.) |

### Events

#### `sg-accordion`

| Event    | Detail                                  | Description                                       |
| -------- | --------------------------------------- | ------------------------------------------------- |
| `change` | `{ expandedItem: HTMLElement \| null }` | Emitted when selection changes (single mode only) |

#### `sg-accordion-item`

| Event      | Detail                                   | Description                        |
| ---------- | ---------------------------------------- | ---------------------------------- |
| `expand`   | `{ expanded: true, item: HTMLElement }`  | Emitted when the item is expanded  |
| `collapse` | `{ expanded: false, item: HTMLElement }` | Emitted when the item is collapsed |

### CSS Custom Properties

| Property                      | Description                                       | Default                    |
| ----------------------------- | ------------------------------------------------- | -------------------------- |
| `--accordion-item-bg`         | Item background color                             | `transparent`              |
| `--accordion-item-radius`     | Item border radius                                | `var(--rounded-lg)`        |
| `--accordion-item-padding`    | Item inner padding                                | Size-dependent             |
| `--accordion-item-transition` | Transition duration for expand/collapse animation | `var(--transition-normal)` |
| `--accordion-border-color`    | Container border color (solid/flat variants)      | Theme-dependent            |
| `--accordion-divider-color`   | Divider color between items (text variant)        | Theme-dependent            |
| `--accordion-shadow`          | Container box shadow                              | Theme-dependent            |

## Accessibility

The accordion component follows WAI-ARIA Accordion Pattern best practices.

### `sg-accordion`

<sg-icon name="circle-check" size="16"></sg-icon> **Native Semantics**

- Built with native `<details>` and `<summary>` elements.
- Progressive enhancement - works without JavaScript.

<sg-icon name="circle-check" size="16"></sg-icon> **Smooth Animation**

- Content height transitions via `grid-template-rows: 0fr → 1fr` — no JavaScript height calculations and no layout thrashing.
- Respects `prefers-reduced-motion`: the transition plays only when the user hasn’t opted out of animations.
- Override the speed with `--accordion-item-transition`.

<sg-icon name="circle-check" size="16"></sg-icon> **Keyboard Navigation**

- `Enter` and `Space` toggle expansion.
- `Tab` moves focus between accordion items.

## Best Practices

**Do:**

- Use clear, descriptive titles.
- Use `single` mode for mutually exclusive content.

**Don't:**

- Nest accordions deeply (max 1-2 levels).
- Hide critical information in a collapsed state.
