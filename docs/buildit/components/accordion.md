# Accordion Component

A flexible accordion component for organizing collapsible content sections. Built with native `<details>` and `<summary>` elements for accessibility and progressive enhancement.

## Features

- 🎨 **6 Variants**: solid, flat, bordered, outline, ghost, text
- 🔄 **Selection Modes**: Single or multiple expansion
- 📏 **3 Sizes**: sm, md, lg- 🎬 **Smooth Animation**: content height animates via CSS `grid-template-rows` — no layout thrashing- ♿ **Accessible**: Native HTML semantics, keyboard navigation, screen reader friendly
- 🎯 **Flexible Content**: Support for icons, subtitles, and custom content

## Source Code

::: details View Source Code
<<< @/../packages/buildit/src/disclosure/accordion/accordion.ts
:::

::: details View Source Code (Accordion Item)
<<< @/../packages/buildit/src/disclosure/accordion-item/accordion-item.ts
:::

## Basic Usage

```html
<bit-accordion>
  <bit-accordion-item>
    <span slot="title">First Section</span>
    Content for the first section goes here.
  </bit-accordion-item>
</bit-accordion>

<script type="module">
  import '@vielzeug/buildit/accordion';
  import '@vielzeug/buildit/accordion-item';
</script>
```

## Visual Options

### Selection Modes

#### Multiple (Default)

Allow multiple items to be expanded simultaneously.

<ComponentPreview vertical>

```html
<bit-accordion variant="solid" selection-mode="multiple">
  <bit-accordion-item>
    <span slot="title">Section 1</span>
    Content 1
  </bit-accordion-item>
  <bit-accordion-item>
    <span slot="title">Section 2</span>
    Content 2
  </bit-accordion-item>
</bit-accordion>
```

</ComponentPreview>

#### Single

Only one item can be expanded at a time.

<ComponentPreview vertical>

```html
<bit-accordion variant="outline" selection-mode="single">
  <bit-accordion-item>
    <span slot="title">Section 1</span>
    Content 1
  </bit-accordion-item>
  <bit-accordion-item>
    <span slot="title">Section 2</span>
    Content 2
  </bit-accordion-item>
</bit-accordion>
```

</ComponentPreview>

### Variants

Eight visual variants applied to all items via the parent accordion.

<ComponentPreview vertical>

```html
<bit-accordion variant="solid">
  <bit-accordion-item>
    <span slot="title">Solid Variant</span>
    Content
  </bit-accordion-item>
</bit-accordion>
<bit-accordion variant="flat">
  <bit-accordion-item>
    <span slot="title">Flat Variant</span>
    Content
  </bit-accordion-item>
</bit-accordion>
<bit-accordion variant="bordered">
  <bit-accordion-item>
    <span slot="title">Bordered Variant</span>
    Content
  </bit-accordion-item>
</bit-accordion>
<bit-accordion variant="outline">
  <bit-accordion-item>
    <span slot="title">Outline Variant</span>
    Content
  </bit-accordion-item>
</bit-accordion>
<bit-accordion variant="ghost">
  <bit-accordion-item>
    <span slot="title">Ghost Variant</span>
    Content
  </bit-accordion-item>
</bit-accordion>
<bit-accordion variant="text">
  <bit-accordion-item>
    <span slot="title">Text Variant</span>
    Content
  </bit-accordion-item>
</bit-accordion>
```

</ComponentPreview>

### Glass & Frost Variants

Modern effects with backdrop blur for elevated UI elements.

::: tip Best Used With
Glass and frost variants work best when placed over colorful backgrounds or images to showcase the blur and transparency effects.
:::

<ComponentPreview center background="https://plus.unsplash.com/premium_photo-1685082778336-282f52a3a923?q=80&w=2532&auto=format&fit=crop">

```html
<bit-accordion variant="glass">
  <bit-accordion-item>
    <span slot="prefix" class="material-symbols-rounded">favorite</span>
    <span slot="title">Item 1</span>
    <span slot="subtitle">Subitem 1</span>
    Content
  </bit-accordion-item>
  <bit-accordion-item>
    <span slot="prefix" class="material-symbols-rounded">help</span>
    <span slot="title">Item 2</span>
    <span slot="subtitle">Subitem 2</span>
    Content
  </bit-accordion-item>
  <bit-accordion-item>
    <span slot="prefix" class="material-symbols-rounded">bookmark</span>
    <span slot="title">Item 3</span>
    <span slot="subtitle">Subitem 3</span>
    Content
  </bit-accordion-item>
</bit-accordion>
<bit-accordion variant="frost">
  <bit-accordion-item>
    <span slot="prefix" class="material-symbols-rounded">favorite</span>
    <span slot="title">Item 1</span>
    <span slot="subtitle">Subitem 1</span>
    Content
  </bit-accordion-item>
  <bit-accordion-item>
    <span slot="prefix" class="material-symbols-rounded">help</span>
    <span slot="title">Item 2</span>
    <span slot="subtitle">Subitem 2</span>
    Content
  </bit-accordion-item>
  <bit-accordion-item>
    <span slot="prefix" class="material-symbols-rounded">bookmark</span>
    <span slot="title">Item 3</span>
    <span slot="subtitle">Subitem 3</span>
    Content
  </bit-accordion-item>
</bit-accordion>
```

</ComponentPreview>

### Sizes

Three sizes for different contexts.

<ComponentPreview vertical>

```html
<bit-accordion size="sm">
  <bit-accordion-item>
    <span slot="title">Small size</span>
    Content
  </bit-accordion-item>
</bit-accordion>
<bit-accordion size="md">
  <bit-accordion-item>
    <span slot="title">Medium Size</span>
    Content
  </bit-accordion-item>
</bit-accordion>
<bit-accordion size="lg">
  <bit-accordion-item>
    <span slot="title">Large size</span>
    Content
  </bit-accordion-item>
</bit-accordion>
```

</ComponentPreview>

## Customization

### Icons & Subtitles

Add icons or descriptive subtitles using slots.

<ComponentPreview vertical>

```html
<bit-accordion variant="bordered">
  <bit-accordion-item>
    <span slot="prefix" class="material-symbols-rounded">cloud</span>
    <span slot="title">Cloud Storage</span>
    <span slot="subtitle">Manage your files and backups</span>
    <p>Access and manage all your cloud storage files, folders, and backups from this central location.</p>
  </bit-accordion-item>
  <bit-accordion-item>
    <span slot="prefix" class="material-symbols-rounded">security</span>
    <span slot="title">Security Settings</span>
    <span slot="subtitle">Two-factor authentication and password management</span>
    <p>Configure security options including 2FA, password policies, and login alerts.</p>
  </bit-accordion-item>
  <bit-accordion-item>
    <span slot="prefix" class="material-symbols-rounded">palette</span>
    <span slot="title">Appearance</span>
    <span slot="subtitle">Theme, colors, and layout preferences</span>
    <p>Customize the look and feel of your application with theme and color options.</p>
  </bit-accordion-item>
</bit-accordion>
```

</ComponentPreview>

## States

### Disabled

Prevent interaction with specific items.

<ComponentPreview vertical>

```html
<bit-accordion variant="text">
  <bit-accordion-item>
    <span slot="title">Normal Section</span>
    Content
  </bit-accordion-item>
  <bit-accordion-item disabled>
    <span slot="title">Disabled Section</span>
    Content
  </bit-accordion-item>
</bit-accordion>
```

</ComponentPreview>

## Guideline Recipe: Quieter FAQ Section

**Guideline: quieter** — collapse secondary content so users focus on only what they need right now.

```html
<bit-accordion value="1">
  <bit-accordion-item value="1" label="What's included?">
    Access to all features and 30 days of history.
  </bit-accordion-item>
  <bit-accordion-item value="2" label="Can I cancel anytime?">
    Yes — no contracts, cancel from account settings.
  </bit-accordion-item>
  <bit-accordion-item value="3" label="How do I get support?">
    Use in-app chat or email support@example.com.
  </bit-accordion-item>
</bit-accordion>
```

**Tip:** Combine with `multiple` selection mode when users need to compare items side by side.

## API Reference

### `bit-accordion` Attributes

| Attribute        | Type                                                                | Default      | Description                                           |
| ---------------- | ------------------------------------------------------------------- | ------------ | ----------------------------------------------------- |
| `selection-mode` | `'single' \| 'multiple'`                                            | `'multiple'` | Whether multiple items can be expanded simultaneously |
| `variant`        | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost' \| 'text'` | `'solid'`    | Visual variant applied to all items                   |
| `size`           | `'sm' \| 'md' \| 'lg'`                                              | `'md'`       | Size applied to all items                             |

### `bit-accordion-item` Attributes

| Attribute  | Type                                                                | Default   | Description                             |
| ---------- | ------------------------------------------------------------------- | --------- | --------------------------------------- |
| `expanded` | `boolean`                                                           | `false`   | Whether the item is expanded            |
| `disabled` | `boolean`                                                           | `false`   | Disable the item (prevents toggling)    |
| `variant`  | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost' \| 'text'` | `'solid'` | Visual variant (usually set via parent) |
| `size`     | `'sm' \| 'md' \| 'lg'`                                              | `'md'`    | Size (usually set via parent)           |

### Slots

#### `bit-accordion-item`

| Slot       | Description                                            |
| ---------- | ------------------------------------------------------ |
| (default)  | Content shown when item is expanded                    |
| `title`    | Title/summary content                                  |
| `subtitle` | Subtitle text shown below the title                    |
| `prefix`   | Content before the title (icons, etc.)                 |
| `suffix`   | Content after the title (badges, custom chevron, etc.) |

### Events

#### `bit-accordion`

| Event    | Detail                                  | Description                                       |
| -------- | --------------------------------------- | ------------------------------------------------- |
| `change` | `{ expandedItem: HTMLElement \| null }` | Emitted when selection changes (single mode only) |

#### `bit-accordion-item`

| Event      | Detail                                   | Description                        |
| ---------- | ---------------------------------------- | ---------------------------------- |
| `expand`   | `{ expanded: true, item: HTMLElement }`  | Emitted when the item is expanded  |
| `collapse` | `{ expanded: false, item: HTMLElement }` | Emitted when the item is collapsed |

### CSS Custom Properties

| Property                   | Description      | Default        |
| -------------------------- | ---------------- | -------------- |
| `--accordion-item-bg`      | Background color | `transparent`  |
| `--accordion-item-radius`  | Border radius    | `0.375rem`     |
| `--accordion-item-padding` | Inner padding    | Size-dependent |
| `--accordion-item-transition` | Transition duration for expand/collapse animation | `var(--transition-normal)` |

## Accessibility

The accordion component follows WAI-ARIA Accordion Pattern best practices.

### `bit-accordion`

✅ **Native Semantics**

- Built with native `<details>` and `<summary>` elements.
- Progressive enhancement - works without JavaScript.

✅ **Smooth Animation**

- Content height transitions via `grid-template-rows: 0fr → 1fr` — no JavaScript height calculations and no layout thrashing.
- Respects `prefers-reduced-motion`: the transition plays only when the user hasn’t opted out of animations.
- Override the speed with `--accordion-item-transition`.

✅ **Keyboard Navigation**

- `Enter` and `Space` toggle expansion.
- `Tab` moves focus between accordion items.

## Best Practices

**Do:**

- Use clear, descriptive titles.
- Use `single` mode for mutually exclusive content.

**Don't:**

- Nest accordions deeply (max 1-2 levels).
- Hide critical information in a collapsed state.
