# Accordion

A flexible accordion component for organizing collapsible content sections. Built with native `<details>` and `<summary>` elements for accessibility and progressive enhancement.

## Selection Modes

#### Multiple (Default)

Allow multiple items to be expanded simultaneously.

<ComponentPreview vertical>

```html
<ore-accordion variant="solid" selection-mode="multiple">
  <ore-accordion-item>
    <span slot="title">Section 1</span>
    Content 1
  </ore-accordion-item>
  <ore-accordion-item>
    <span slot="title">Section 2</span>
    Content 2
  </ore-accordion-item>
</ore-accordion>
```

</ComponentPreview>

#### Single

Only one item can be expanded at a time. Use `single` mode for mutually exclusive content.

<ComponentPreview vertical>

```html
<ore-accordion variant="outline" selection-mode="single">
  <ore-accordion-item>
    <span slot="title">Section 1</span>
    Content 1
  </ore-accordion-item>
  <ore-accordion-item>
    <span slot="title">Section 2</span>
    Content 2
  </ore-accordion-item>
</ore-accordion>
```

</ComponentPreview>

## Variants

Eight variants applied to all items via the parent accordion — six standard plus glass and frost for translucent effects.

<ComponentPreview vertical>

```html
<ore-accordion variant="solid">
  <ore-accordion-item>
    <span slot="title">Solid Variant</span>
    Content
  </ore-accordion-item>
</ore-accordion>
<ore-accordion variant="flat">
  <ore-accordion-item>
    <span slot="title">Flat Variant</span>
    Content
  </ore-accordion-item>
</ore-accordion>
<ore-accordion variant="bordered">
  <ore-accordion-item>
    <span slot="title">Bordered Variant</span>
    Content
  </ore-accordion-item>
</ore-accordion>
<ore-accordion variant="outline">
  <ore-accordion-item>
    <span slot="title">Outline Variant</span>
    Content
  </ore-accordion-item>
</ore-accordion>
<ore-accordion variant="ghost">
  <ore-accordion-item>
    <span slot="title">Ghost Variant</span>
    Content
  </ore-accordion-item>
</ore-accordion>
<ore-accordion variant="text">
  <ore-accordion-item>
    <span slot="title">Text Variant</span>
    Content
  </ore-accordion-item>
</ore-accordion>
```

</ComponentPreview>

### Glass & Frost Variants

Modern effects with backdrop blur for elevated UI elements.

::: tip Best Used With
Glass and frost variants work best when placed over colorful backgrounds or images to showcase the blur and transparency effects.
:::

<ComponentPreview center background="https://plus.unsplash.com/premium_photo-1685082778336-282f52a3a923?q=80&w=2532&auto=format&fit=crop">

```html
<ore-accordion variant="glass">
  <ore-accordion-item>
    <ore-icon slot="prefix" name="heart" size="18"></ore-icon>
    <span slot="title">Item 1</span>
    <span slot="subtitle">Subitem 1</span>
    Content
  </ore-accordion-item>
  <ore-accordion-item>
    <ore-icon slot="prefix" name="help-circle" size="18"></ore-icon>
    <span slot="title">Item 2</span>
    <span slot="subtitle">Subitem 2</span>
    Content
  </ore-accordion-item>
  <ore-accordion-item>
    <ore-icon slot="prefix" name="bookmark" size="18"></ore-icon>
    <span slot="title">Item 3</span>
    <span slot="subtitle">Subitem 3</span>
    Content
  </ore-accordion-item>
</ore-accordion>
<ore-accordion variant="frost">
  <ore-accordion-item>
    <ore-icon slot="prefix" name="heart" size="18"></ore-icon>
    <span slot="title">Item 1</span>
    <span slot="subtitle">Subitem 1</span>
    Content
  </ore-accordion-item>
  <ore-accordion-item>
    <ore-icon slot="prefix" name="help-circle" size="18"></ore-icon>
    <span slot="title">Item 2</span>
    <span slot="subtitle">Subitem 2</span>
    Content
  </ore-accordion-item>
  <ore-accordion-item>
    <ore-icon slot="prefix" name="bookmark" size="18"></ore-icon>
    <span slot="title">Item 3</span>
    <span slot="subtitle">Subitem 3</span>
    Content
  </ore-accordion-item>
</ore-accordion>
```

</ComponentPreview>

## Sizes

Three sizes for different contexts.

<ComponentPreview vertical>

```html
<ore-accordion size="sm">
  <ore-accordion-item>
    <span slot="title">Small size</span>
    Content
  </ore-accordion-item>
</ore-accordion>
<ore-accordion size="md">
  <ore-accordion-item>
    <span slot="title">Medium Size</span>
    Content
  </ore-accordion-item>
</ore-accordion>
<ore-accordion size="lg">
  <ore-accordion-item>
    <span slot="title">Large size</span>
    Content
  </ore-accordion-item>
</ore-accordion>
```

</ComponentPreview>

## Customization

### Icons & Subtitles

Add icons or descriptive subtitles using slots. Use clear, descriptive titles to help users understand section content Overview.

<ComponentPreview vertical>

```html
<ore-accordion variant="bordered">
  <ore-accordion-item>
    <ore-icon slot="prefix" name="wind" size="18"></ore-icon>
    <span slot="title">Cloud Storage</span>
    <span slot="subtitle">Manage your files and backups</span>
    <p>Access and manage all your cloud storage files, folders, and backups from this central location.</p>
  </ore-accordion-item>
  <ore-accordion-item>
    <ore-icon slot="prefix" name="shield" size="18"></ore-icon>
    <span slot="title">Security Settings</span>
    <span slot="subtitle">Two-factor authentication and password management</span>
    <p>Configure security options including 2FA, password policies, and login alerts.</p>
  </ore-accordion-item>
  <ore-accordion-item>
    <ore-icon slot="prefix" name="smile-plus" size="18"></ore-icon>
    <span slot="title">Appearance</span>
    <span slot="subtitle">Theme, colors, and layout preferences</span>
    <p>Customize the look and feel of your application with theme and color options.</p>
  </ore-accordion-item>
</ore-accordion>
```

</ComponentPreview>

## States

### Disabled

Prevent interaction with specific items.

<ComponentPreview vertical>

```html
<ore-accordion variant="text">
  <ore-accordion-item>
    <span slot="title">Normal Section</span>
    Content
  </ore-accordion-item>
  <ore-accordion-item disabled>
    <span slot="title">Disabled Section</span>
    Content
  </ore-accordion-item>
</ore-accordion>
```

</ComponentPreview>

## API Reference

**`ore-accordion`** Attributes

| Attribute        | Type                                                                                      | Default      | Description                                           |
| ---------------- | ----------------------------------------------------------------------------------------- | ------------ | ----------------------------------------------------- |
| `selection-mode` | `'single' \| 'multiple'`                                                                  | `'multiple'` | Whether multiple items can be expanded simultaneously |
| `variant`        | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost' \| 'text' \| 'glass' \| 'frost'` | `'solid'`    | Visual variant applied to all items                   |
| `size`           | `'sm' \| 'md' \| 'lg'`                                                                    | `'md'`       | Size applied to all items                             |

**`ore-accordion-item`** Attributes

| Attribute  | Type                                                                                      | Default   | Description                             |
| ---------- | ----------------------------------------------------------------------------------------- | --------- | --------------------------------------- |
| `expanded` | `boolean`                                                                                 | `false`   | Whether the item is expanded            |
| `disabled` | `boolean`                                                                                 | `false`   | Disable the item (prevents toggling)    |
| `variant`  | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost' \| 'text' \| 'glass' \| 'frost'` | `'solid'` | Visual variant (usually set via parent) |
| `size`     | `'sm' \| 'md' \| 'lg'`                                                                    | `'md'`    | Size (usually set via parent)           |

### Slots

**`ore-accordion-item`**

| Slot       | Description                                            |
| ---------- | ------------------------------------------------------ |
| (default)  | Content shown when item is expanded                    |
| `title`    | Title/summary content                                  |
| `subtitle` | Subtitle text shown below the title                    |
| `prefix`   | Content before the title (icons, etc.)                 |
| `suffix`   | Content after the title (badges, custom chevron, etc.) |

### Events

**`ore-accordion`**

| Event    | Detail                                  | Description                                       |
| -------- | --------------------------------------- | ------------------------------------------------- |
| `change` | `{ expandedItem: HTMLElement \| null }` | Emitted when selection changes (single mode only) |

**`ore-accordion-item`**

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

The accordion component follows WAI-ARIA Accordion Pattern best practices. It is built with native `<details>` and `<summary>` elements, providing progressive enhancement — the component works without JavaScript. Keyboard navigation is fully supported: `Enter` and `Space` toggle expansion, and `Tab` moves focus between accordion items.

Content height transitions via `grid-template-rows: 0fr → 1fr` — no JavaScript height calculations and no layout thrashing. The transition respects `prefers-reduced-motion` and plays only when the user hasn't opted out of animations. The speed can be overridden with `--accordion-item-transition`.

Avoid hiding critical information in a collapsed state, and avoid nesting accordions more than one or two levels deep.
