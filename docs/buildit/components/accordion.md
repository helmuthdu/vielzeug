# Accordion Component

A flexible accordion component for organizing collapsible content sections. Built with native `<details>` and `<summary>` elements for accessibility and progressive enhancement.

## Features

- 🎨 **6 Variants**: solid, flat, bordered, outline, ghost, text
- 🔄 **Selection Modes**: Single or multiple expansion
- 📏 **3 Sizes**: sm, md, lg
- ♿ **Accessible**: Native HTML semantics, keyboard navigation, screen reader friendly
- 🎭 **States**: expanded, disabled
- 🔧 **Customizable**: CSS custom properties for styling
- 🌙 **Theme Support**: Works with light/dark mode
- 🎯 **Flexible Content**: Support for icons, subtitles, and custom content

## Basic Usage

```html
<!DOCTYPE html>
<html>
  <body>
    <bit-accordion>
      <bit-accordion-item>
        <span slot="title">First Section</span>
        Content for the first section goes here.
      </bit-accordion-item>
      
      <bit-accordion-item expanded>
        <span slot="title">Second Section (Expanded)</span>
        Content for the second section goes here.
      </bit-accordion-item>
      
      <bit-accordion-item>
        <span slot="title">Third Section</span>
        Content for the third section goes here.
      </bit-accordion-item>
    </bit-accordion>

    <script type="module">
      import '@vielzeug/buildit/accordion';
      import '@vielzeug/buildit/accordion-item';
    </script>
  </body>
</html>
```

## Selection Modes

### Multiple Expansion (Default)

Allow multiple items to be expanded simultaneously:

<ClientOnly>
  <div class="demo-container">
    <bit-accordion selection-mode="multiple">
      <bit-accordion-item>
        <span slot="title">Section 1</span>
        <p>Content for section 1. You can expand multiple sections at once.</p>
      </bit-accordion-item>
      <bit-accordion-item>
        <span slot="title">Section 2</span>
        <p>Content for section 2. Try opening all sections together.</p>
      </bit-accordion-item>
      <bit-accordion-item>
        <span slot="title">Section 3</span>
        <p>Content for section 3. This is the default behavior.</p>
      </bit-accordion-item>
    </bit-accordion>
  </div>
</ClientOnly>

```html
<bit-accordion selection-mode="multiple">
  <bit-accordion-item>
    <span slot="title">Section 1</span>
    Content for section 1
  </bit-accordion-item>
  <bit-accordion-item>
    <span slot="title">Section 2</span>
    Content for section 2
  </bit-accordion-item>
</bit-accordion>
```

### Single Expansion

Only one item can be expanded at a time (accordion-style):

<ClientOnly>
  <div class="demo-container">
    <bit-accordion selection-mode="single">
      <bit-accordion-item expanded>
        <span slot="title">Section 1</span>
        <p>Content for section 1. Opening another section will close this one.</p>
      </bit-accordion-item>
      <bit-accordion-item>
        <span slot="title">Section 2</span>
        <p>Content for section 2. Only one section can be open at a time.</p>
      </bit-accordion-item>
      <bit-accordion-item>
        <span slot="title">Section 3</span>
        <p>Content for section 3. This is classic accordion behavior.</p>
      </bit-accordion-item>
    </bit-accordion>
  </div>
</ClientOnly>

```html
<bit-accordion selection-mode="single">
  <bit-accordion-item expanded>
    <span slot="title">Section 1</span>
    Content for section 1
  </bit-accordion-item>
  <bit-accordion-item>
    <span slot="title">Section 2</span>
    Content for section 2
  </bit-accordion-item>
</bit-accordion>
```

## Variants

The accordion supports six visual variants that can be applied to all items:

<ClientOnly>
  <div class="demo-container">
    <bit-accordion variant="solid">
      <bit-accordion-item>
        <span slot="title">Solid Variant 1</span>
        <p>Filled background with no border.</p>
      </bit-accordion-item>
      <bit-accordion-item>
        <span slot="title">Solid Variant 2</span>
        <p>Filled background with no border.</p>
      </bit-accordion-item>
      <bit-accordion-item>
        <span slot="title">Solid Variant 3</span>
        <p>Filled background with no border.</p>
      </bit-accordion-item>
    </bit-accordion>
    <bit-accordion variant="flat">
      <bit-accordion-item>
        <span slot="title">Flat Variant 1</span>
        <p>Subtle filled background.</p>
      </bit-accordion-item>
      <bit-accordion-item>
        <span slot="title">Flat Variant 2</span>
        <p>Subtle filled background.</p>
      </bit-accordion-item>
      <bit-accordion-item>
        <span slot="title">Flat Variant 3</span>
        <p>Subtle filled background.</p>
      </bit-accordion-item>
    </bit-accordion>
    <bit-accordion variant="bordered">
      <bit-accordion-item>
        <span slot="title">Bordered Variant 1</span>
        <p>Background with visible border.</p>
      </bit-accordion-item>
      <bit-accordion-item>
        <span slot="title">Bordered Variant 2</span>
        <p>Background with visible border.</p>
      </bit-accordion-item>
      <bit-accordion-item>
        <span slot="title">Bordered Variant 3</span>
        <p>Background with visible border.</p>
      </bit-accordion-item>
    </bit-accordion>
    <bit-accordion variant="outline">
      <bit-accordion-item>
        <span slot="title">Outline Variant 1</span>
        <p>Transparent background with border.</p>
      </bit-accordion-item>
      <bit-accordion-item>
        <span slot="title">Outline Variant 2</span>
        <p>Transparent background with border.</p>
      </bit-accordion-item>
      <bit-accordion-item>
        <span slot="title">Outline Variant 3</span>
        <p>Transparent background with border.</p>
      </bit-accordion-item>
    </bit-accordion>
    <bit-accordion variant="ghost">
      <bit-accordion-item>
        <span slot="title">Ghost Variant 1</span>
        <p>Minimal styling, shows on hover.</p>
      </bit-accordion-item>
      <bit-accordion-item>
        <span slot="title">Ghost Variant 2</span>
        <p>Minimal styling, shows on hover.</p>
      </bit-accordion-item>
      <bit-accordion-item>
        <span slot="title">Ghost Variant 3</span>
        <p>Minimal styling, shows on hover.</p>
      </bit-accordion-item>
    </bit-accordion>
    <bit-accordion variant="text">
      <bit-accordion-item>
        <span slot="title">Text Variant 1</span>
        <p>No background or border.</p>
      </bit-accordion-item>
      <bit-accordion-item>
        <span slot="title">Text Variant 2</span>
        <p>No background or border.</p>
      </bit-accordion-item>
      <bit-accordion-item>
        <span slot="title">Text Variant 3</span>
        <p>No background or border.</p>
      </bit-accordion-item>
    </bit-accordion>
  </div>
</ClientOnly>

```html
<bit-accordion variant="solid">...</bit-accordion>
<bit-accordion variant="flat">...</bit-accordion>
<bit-accordion variant="bordered">...</bit-accordion>
<bit-accordion variant="outline">...</bit-accordion>
<bit-accordion variant="ghost">...</bit-accordion>
<bit-accordion variant="text">...</bit-accordion>
```

**Use cases:**
- **Solid/Flat**: Prominent sections with clear separation
- **Bordered/Outline**: Structured content with defined boundaries
- **Ghost/Text**: Minimal styling for clean interfaces

## Sizes

Three sizes for different contexts:

<ClientOnly>
  <div class="demo-container">
    <bit-accordion size="sm">
      <bit-accordion-item>
        <span slot="title">Small Size</span>
        <p>Compact accordion for dense layouts.</p>
      </bit-accordion-item>
    </bit-accordion>
    <bit-accordion size="md">
      <bit-accordion-item>
        <span slot="title">Medium Size</span>
        <p>Default size for most use cases.</p>
      </bit-accordion-item>
    </bit-accordion>
    <bit-accordion size="lg">
      <bit-accordion-item>
        <span slot="title">Large Size</span>
        <p>Spacious accordion for emphasis.</p>
      </bit-accordion-item>
    </bit-accordion>
  </div>
</ClientOnly>

```html
<bit-accordion size="sm">...</bit-accordion>
<bit-accordion size="md">...</bit-accordion>
<bit-accordion size="lg">...</bit-accordion>
```

## With Icons

Add custom icons using prefix and suffix slots:

<ClientOnly>
  <div class="demo-container">
    <bit-accordion variant="bordered">
      <bit-accordion-item>
        <span slot="prefix" class="material-symbols-rounded">folder</span>
        <span slot="title">Files & Documents</span>
        <p>View and manage your files and documents here.</p>
      </bit-accordion-item>
      <bit-accordion-item>
        <span slot="prefix" class="material-symbols-rounded">settings</span>
        <span slot="title">Settings</span>
        <span slot="suffix" style="background: var(--color-primary); color: white; padding: 0.125rem 0.5rem; border-radius: 12px; font-size: 0.75rem;">New</span>
        <p>Configure your application settings and preferences.</p>
      </bit-accordion-item>
      <bit-accordion-item>
        <span slot="prefix" class="material-symbols-rounded">help</span>
        <span slot="title">Help & Support</span>
        <p>Get help and support for common questions.</p>
      </bit-accordion-item>
    </bit-accordion>
  </div>
</ClientOnly>

```html
<bit-accordion>
  <bit-accordion-item>
    <svg slot="prefix">...</svg>
    <span slot="title">Section Title</span>
    Content goes here
  </bit-accordion-item>
  
  <bit-accordion-item>
    <svg slot="prefix">...</svg>
    <span slot="title">Another Section</span>
    <span slot="suffix" class="badge">Badge</span>
    More content
  </bit-accordion-item>
</bit-accordion>
```

## With Subtitles

Add descriptive subtitles below titles for additional context:

<ClientOnly>
  <div class="demo-container">
    <bit-accordion variant="ghost">
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
  </div>
</ClientOnly>

```html
<bit-accordion>
  <bit-accordion-item>
    <span slot="title">Cloud Storage</span>
    <span slot="subtitle">Manage your files and backups</span>
    Content goes here
  </bit-accordion-item>
  
  <bit-accordion-item>
    <span slot="title">Security Settings</span>
    <span slot="subtitle">Two-factor authentication and password management</span>
    More content
  </bit-accordion-item>
</bit-accordion>
```

## States

### Expanded

Set initial expanded state with the `expanded` attribute:

<ClientOnly>
  <div class="demo-container">
    <bit-accordion>
      <bit-accordion-item>
        <span slot="title">Collapsed by Default</span>
        <p>This section starts collapsed.</p>
      </bit-accordion-item>
      <bit-accordion-item expanded>
        <span slot="title">Expanded by Default</span>
        <p>This section starts expanded.</p>
      </bit-accordion-item>
    </bit-accordion>
  </div>
</ClientOnly>

```html
<bit-accordion-item expanded>
  <span slot="title">Expanded Section</span>
  This section is expanded by default
</bit-accordion-item>
```

### Disabled

Prevent interaction with the `disabled` attribute:

<ClientOnly>
  <div class="demo-container">
    <bit-accordion>
      <bit-accordion-item>
        <span slot="title">Normal Section</span>
        <p>This section can be interacted with.</p>
      </bit-accordion-item>
      <bit-accordion-item disabled>
        <span slot="title">Disabled Section</span>
        <p>This section cannot be opened or closed.</p>
      </bit-accordion-item>
    </bit-accordion>
  </div>
</ClientOnly>

```html
<bit-accordion-item disabled>
  <span slot="title">Disabled Section</span>
  This section cannot be toggled
</bit-accordion-item>
```

## Custom Styling

Customize appearance using CSS custom properties:

<ClientOnly>
  <div class="demo-container">
    <bit-accordion>
      <bit-accordion-item style="--accordion-item-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%); --accordion-item-radius: 16px;">
        <span slot="title" style="color: white; font-weight: 600;">Custom Gradient</span>
        <p style="color: white; background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 8px;">Custom styled accordion with gradient background and rounded corners.</p>
      </bit-accordion-item>
      <bit-accordion-item style="--accordion-item-bg: #ff6b6b; --accordion-item-border-color: #c92a2a; --accordion-item-padding: 1.5rem;">
        <span slot="title" style="color: white; font-weight: 600;">Custom Colors & Padding</span>
        <p style="color: white;">Accordion with custom background, border, and padding.</p>
      </bit-accordion-item>
    </bit-accordion>
  </div>
</ClientOnly>

```html
<bit-accordion-item 
  style="
    --accordion-item-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --accordion-item-radius: 16px;
  ">
  <span slot="title">Custom Styled</span>
  Custom content
</bit-accordion-item>
```

### Available CSS Custom Properties

#### Colors & Backgrounds
- `--accordion-item-bg` - Background color for the summary
- `--accordion-item-border-color` - Border color

#### Borders & Spacing
- `--accordion-item-radius` - Border radius
- `--accordion-item-padding` - Inner padding

#### Effects
- `--accordion-item-transition` - Transition timing for animations

## API Reference

### `bit-accordion` Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `selection-mode` | `'single' \| 'multiple'` | `'multiple'` | Whether multiple items can be expanded simultaneously |
| `variant` | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost' \| 'text'` | - | Visual variant applied to all items |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size applied to all items |

### `bit-accordion-item` Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `expanded` | `boolean` | `false` | Whether the item is expanded |
| `disabled` | `boolean` | `false` | Disable the item (prevents toggling) |
| `variant` | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost' \| 'text'` | - | Visual variant (usually set via parent) |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size (usually set via parent) |

### `bit-accordion` Slots

| Slot | Description |
|------|-------------|
| (default) | Slot for `bit-accordion-item` elements |

### `bit-accordion-item` Slots

| Slot | Description |
|------|-------------|
| (default) | Content shown when item is expanded |
| `title` | Title/summary content |
| `subtitle` | Subtitle text shown below the title |
| `prefix` | Content before the title (icons, etc.) |
| `suffix` | Content after the title (badges, custom chevron, etc.) |

### Events

#### `bit-accordion` Events

| Event | Detail | Description |
|-------|--------|-------------|
| `change` | `{ expandedItem: HTMLElement }` | Emitted when selection changes (single mode only) |

#### `bit-accordion-item` Events

| Event | Detail | Description |
|-------|--------|-------------|
| `expand` | - | Emitted when the item is expanded |
| `collapse` | - | Emitted when the item is collapsed |

## Accessibility

The accordion component follows WAI-ARIA Accordion Pattern best practices:

✅ **Native Semantics**
- Built with native `<details>` and `<summary>` elements
- Progressive enhancement - works without JavaScript
- Automatic ARIA states via native elements

✅ **Keyboard Navigation**
- `Enter` and `Space` toggle expansion
- `Tab` moves focus between accordion items
- Arrow keys navigate between items (native behavior)

✅ **Screen Readers**
- Announces expanded/collapsed state automatically
- Summary content is announced as the trigger
- Content is accessible when expanded

✅ **Focus Management**
- Visible focus indicators on summary
- Focus is maintained after toggling
- Disabled items cannot receive focus

### Best Practices

**Do:**
- Use clear, descriptive titles in the `title` slot
- Provide visual feedback for hover and focus states
- Use single mode for mutually exclusive content
- Keep content concise and scannable

**Don't:**
- Nest accordions deeply (max 1-2 levels)
- Use accordions for navigation (consider tabs instead)
- Hide critical information in collapsed state
- Use too many items (consider pagination)

## Browser Support

Requires modern browsers with Web Components support:

- Chrome 77+
- Firefox 93+
- Safari 16.4+
- Edge 79+

::: tip Details/Summary Support
The `<details>` element is supported in all modern browsers. The component enhances it with custom styling and behavior while maintaining native functionality.
:::

## Examples

### FAQ Section

<ClientOnly>
  <div class="demo-container">
    <bit-accordion variant="bordered" selection-mode="single">
      <bit-accordion-item>
        <span slot="title">How do I install the component?</span>
        <p>Install via npm or pnpm:</p>
        <pre><code>pnpm add @vielzeug/buildit</code></pre>
      </bit-accordion-item>
      <bit-accordion-item>
        <span slot="title">Can I use custom icons?</span>
        <p>Yes! Use the prefix and suffix slots to add any icons or badges you need.</p>
      </bit-accordion-item>
      <bit-accordion-item>
        <span slot="title">Is it accessible?</span>
        <p>Absolutely! Built with native HTML semantics and follows WAI-ARIA best practices.</p>
      </bit-accordion-item>
    </bit-accordion>
  </div>
</ClientOnly>

```html
<bit-accordion variant="bordered" selection-mode="single">
  <bit-accordion-item>
    <span slot="title">Question 1?</span>
    Answer to question 1
  </bit-accordion-item>
  <bit-accordion-item>
    <span slot="title">Question 2?</span>
    Answer to question 2
  </bit-accordion-item>
</bit-accordion>
```

### Settings Panel

<ClientOnly>
  <div class="demo-container">
    <bit-accordion variant="solid">
      <bit-accordion-item expanded>
        <span slot="prefix" class="material-symbols-rounded">person</span>
        <span slot="title">Profile Settings</span>
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          <label>Name: <input type="text" value="John Doe" style="margin-left: 0.5rem; padding: 0.25rem 0.5rem; border: 1px solid var(--color-contrast-300); border-radius: 4px;"></label>
          <label>Email: <input type="email" value="john@example.com" style="margin-left: 0.5rem; padding: 0.25rem 0.5rem; border: 1px solid var(--color-contrast-300); border-radius: 4px;"></label>
        </div>
      </bit-accordion-item>
      <bit-accordion-item>
        <span slot="prefix" class="material-symbols-rounded">notifications</span>
        <span slot="title">Notifications</span>
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          <label><input type="checkbox" checked> Email notifications</label>
          <label><input type="checkbox"> Push notifications</label>
          <label><input type="checkbox" checked> SMS alerts</label>
        </div>
      </bit-accordion-item>
      <bit-accordion-item>
        <span slot="prefix" class="material-symbols-rounded">lock</span>
        <span slot="title">Privacy & Security</span>
        <p>Configure your privacy and security preferences.</p>
      </bit-accordion-item>
    </bit-accordion>
  </div>
</ClientOnly>

```html
<bit-accordion variant="solid">
  <bit-accordion-item expanded>
    <svg slot="prefix">...</svg>
    <span slot="title">Profile Settings</span>
    <!-- Form fields -->
  </bit-accordion-item>
  
  <bit-accordion-item>
    <svg slot="prefix">...</svg>
    <span slot="title">Notifications</span>
    <!-- Checkboxes -->
  </bit-accordion-item>
</bit-accordion>
```

### Feature Showcase

<ClientOnly>
  <div class="demo-container">
    <bit-accordion variant="outline" size="lg">
      <bit-accordion-item>
        <span slot="prefix" style="font-size: 1.5rem;">🚀</span>
        <span slot="title">Performance</span>
        <p>Lightning-fast rendering and minimal bundle size for optimal performance.</p>
      </bit-accordion-item>
      <bit-accordion-item>
        <span slot="prefix" style="font-size: 1.5rem;">♿</span>
        <span slot="title">Accessibility</span>
        <p>Built with accessibility in mind, following WAI-ARIA best practices.</p>
      </bit-accordion-item>
      <bit-accordion-item>
        <span slot="prefix" style="font-size: 1.5rem;">🎨</span>
        <span slot="title">Customization</span>
        <p>Fully customizable with CSS custom properties and multiple variants.</p>
      </bit-accordion-item>
    </bit-accordion>
  </div>
</ClientOnly>

```html
<bit-accordion variant="outline" size="lg">
  <bit-accordion-item>
    <span slot="prefix">🚀</span>
    <span slot="title">Performance</span>
    Description...
  </bit-accordion-item>
  <!-- More items -->
</bit-accordion>
```

## Related Components

- **Tabs** - Alternative for organizing content (coming soon)
- **Collapse** - Single collapsible section (coming soon)
- **Drawer** - Side panel for content (coming soon)

## Source Code

- [Accordion Component](https://github.com/helmuthdu/vielzeug/tree/main/packages/buildit/src/base/accordion)
- [Accordion Item Component](https://github.com/helmuthdu/vielzeug/tree/main/packages/buildit/src/base/accordion-item)
- [Tests](https://github.com/helmuthdu/vielzeug/tree/main/packages/buildit/src/base/accordion/__tests__)

