---
title: Buildit — API Reference
description: Complete API reference for Buildit web components.
---

## Buildit API Reference

[[toc]]

## Package Entry Points

Use the package through one of three top-level entry points:

| Import | Purpose |
| --- | --- |
| `@vielzeug/buildit` | Register all published components |
| `@vielzeug/buildit/styles` | Global tokens and shared component styles |
| `@vielzeug/buildit/types` | Shared TypeScript types |

For runtime registration, prefer explicit side-effect imports so your bundle only includes the elements you use.

## Component Import Paths

All currently published component subpaths are available as modular imports:

```typescript
import '@vielzeug/buildit/accordion';
import '@vielzeug/buildit/accordion-item';
import '@vielzeug/buildit/alert';
import '@vielzeug/buildit/avatar';
import '@vielzeug/buildit/badge';
import '@vielzeug/buildit/box';
import '@vielzeug/buildit/breadcrumb';
import '@vielzeug/buildit/button';
import '@vielzeug/buildit/button-group';
import '@vielzeug/buildit/card';
import '@vielzeug/buildit/checkbox';
import '@vielzeug/buildit/checkbox-group';
import '@vielzeug/buildit/chip';
import '@vielzeug/buildit/combobox';
import '@vielzeug/buildit/dialog';
import '@vielzeug/buildit/drawer';
import '@vielzeug/buildit/file-input';
import '@vielzeug/buildit/form';
import '@vielzeug/buildit/grid';
import '@vielzeug/buildit/grid-item';
import '@vielzeug/buildit/input';
import '@vielzeug/buildit/menu';
import '@vielzeug/buildit/number-input';
import '@vielzeug/buildit/otp-input';
import '@vielzeug/buildit/pagination';
import '@vielzeug/buildit/popover';
import '@vielzeug/buildit/progress';
import '@vielzeug/buildit/radio';
import '@vielzeug/buildit/radio-group';
import '@vielzeug/buildit/rating';
import '@vielzeug/buildit/select';
import '@vielzeug/buildit/separator';
import '@vielzeug/buildit/sidebar';
import '@vielzeug/buildit/skeleton';
import '@vielzeug/buildit/slider';
import '@vielzeug/buildit/switch';
import '@vielzeug/buildit/tab-item';
import '@vielzeug/buildit/tab-panel';
import '@vielzeug/buildit/table';
import '@vielzeug/buildit/tabs';
import '@vielzeug/buildit/text';
import '@vielzeug/buildit/textarea';
import '@vielzeug/buildit/toast';
import '@vielzeug/buildit/tooltip';
```

Additional published style assets:

```typescript
import '@vielzeug/buildit/styles/animation.css';
import '@vielzeug/buildit/styles/layers.css';
import '@vielzeug/buildit/styles/theme.css';
```

## Button Component

### Tag Name

`<bit-button>`

### Attributes

| Attribute   | Type                                                                | Default     | Description                      |
| ----------- | ------------------------------------------------------------------- | ----------- | -------------------------------- |
| `variant`   | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost' \| 'text'` | `'solid'`   | Visual style variant             |
| `color`     | `'primary' \| 'secondary' \| 'success' \| 'warning' \| 'error'`     | `'primary'` | Semantic color                   |
| `size`      | `'sm' \| 'md' \| 'lg'`                                              | `'md'`      | Button size                      |
| `type`      | `'button' \| 'submit' \| 'reset'`                                   | `'button'`  | Button type (for forms)          |
| `disabled`  | `boolean`                                                           | `false`     | Disable the button               |
| `loading`   | `boolean`                                                           | `false`     | Show loading state               |
| `icon-only` | `boolean`                                                           | `false`     | Icon-only mode (smaller padding) |
| `rounded`   | `boolean`                                                           | `false`     | Fully rounded corners            |

### Slots

| Slot      | Description                        |
| --------- | ---------------------------------- |
| (default) | Button content (text, icons, etc.) |
| `prefix`  | Content before the main content    |
| `suffix`  | Content after the main content     |

### Events

| Event   | Detail                          | Description                                              |
| ------- | ------------------------------- | -------------------------------------------------------- |
| `click` | `{ originalEvent: MouseEvent }` | Emitted when button is clicked (if not disabled/loading) |

### CSS Custom Properties

Refer to the component source for a full list of overridable CSS variables.

## Card Component

### Tag Name

`<bit-card>`

### Attributes

| Attribute     | Type                                                                      | Default | Description                                           |
| ------------- | ------------------------------------------------------------------------- | ------- | ----------------------------------------------------- |
| `variant`     | `'solid' \| 'flat' \| 'glass' \| 'frost'`                                 | —       | Visual style variant                                  |
| `color`       | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | —       | Theme color                                           |
| `padding`     | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl'`                                  | —       | Internal padding size                                 |
| `elevation`   | `'0' \| '1' \| '2' \| '3' \| '4' \| '5'`                                  | —       | Shadow elevation level                                |
| `orientation` | `'horizontal'`                                                            | —       | Side-by-side media + content layout                   |
| `interactive` | `boolean`                                                                 | `false` | Enable card activation via pointer and keyboard       |
| `disabled`    | `boolean`                                                                 | `false` | Disable interaction                                   |
| `loading`     | `boolean`                                                                 | `false` | Show an animated loading bar and set `aria-busy=true` |

### Slots

| Slot      | Description                               |
| --------- | ----------------------------------------- |
| `media`   | Media section at the top/left of the card |
| (default) | Main content area of the card             |
| `header`  | Header section at the top of the card     |
| `footer`  | Footer section at the bottom of the card  |
| `actions` | Action buttons section                    |

### Events

| Event      | Detail                                                                             | Description                                   |
| ---------- | ---------------------------------------------------------------------------------- | --------------------------------------------- |
| `activate` | `{ originalEvent: MouseEvent \| KeyboardEvent, trigger: 'pointer' \| 'keyboard' }` | Emitted when an interactive card is activated |

### CSS Custom Properties

| Property              | Default                     | Description        |
| --------------------- | --------------------------- | ------------------ |
| `--card-bg`           | `var(--color-contrast-50)`  | Background color   |
| `--card-color`        | `var(--color-contrast-900)` | Text color         |
| `--card-border`       | `var(--border)`             | Border width       |
| `--card-border-color` | `var(--color-contrast-200)` | Border color       |
| `--card-radius`       | `var(--rounded-lg)`         | Border radius      |
| `--card-padding`      | `var(--size-4)`             | Internal padding   |
| `--card-shadow`       | `var(--shadow-sm)`          | Box shadow         |
| `--card-hover-shadow` | `var(--shadow-md)`          | Hover state shadow |

## Chip Component

### Tag Name

`<bit-chip>`

### Attributes

| Attribute         | Type                                                                      | Default    | Description                                            |
| ----------------- | ------------------------------------------------------------------------- | ---------- | ------------------------------------------------------ |
| `variant`         | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost'`                 | `'solid'`  | Visual style variant                                   |
| `color`           | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | -          | Semantic color                                         |
| `size`            | `'sm' \| 'md' \| 'lg'`                                                    | `'md'`     | Chip size                                              |
| `rounded`         | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl' \| '3xl' \| 'full'`      | -          | Border radius override                                 |
| `mode`            | `'static' \| 'removable' \| 'selectable'`                                 | `'static'` | Interaction mode                                       |
| `disabled`        | `boolean`                                                                 | `false`    | Disable interactions                                   |
| `value`           | `string`                                                                  | -          | Value forwarded in event detail                        |
| `checked`         | `boolean`                                                                 | -          | Controlled checked state for `mode="selectable"`       |
| `default-checked` | `boolean`                                                                 | `false`    | Initial checked state for uncontrolled selectable mode |

### Slots

| Slot      | Description                |
| --------- | -------------------------- |
| (default) | Chip label content         |
| `icon`    | Leading icon or decoration |

### Events

| Event    | Detail                                                                    | Description                            |
| -------- | ------------------------------------------------------------------------- | -------------------------------------- |
| `remove` | `{ value: string \| undefined, originalEvent?: Event }`                   | Emitted when removable chip is removed |
| `change` | `{ value: string \| undefined, checked: boolean, originalEvent?: Event }` | Emitted when selectable state changes  |

### CSS Custom Properties

| Property              | Default           | Description                                |
| --------------------- | ----------------- | ------------------------------------------ |
| `--chip-bg`           | Variant-dependent | Background color                           |
| `--chip-color`        | Variant-dependent | Text color                                 |
| `--chip-border-color` | Variant-dependent | Border color                               |
| `--chip-radius`       | `--rounded-full`  | Border radius                              |
| `--chip-font-size`    | `--text-sm`       | Font size                                  |
| `--chip-font-weight`  | `--font-medium`   | Font weight                                |
| `--chip-padding-x`    | `--size-2-5`      | Horizontal padding                         |
| `--chip-padding-y`    | `--size-0-5`      | Vertical padding                           |
| `--chip-gap`          | `--size-1`        | Gap between icon, label, and remove button |

## Skeleton Component

### Tag Name

`<bit-skeleton>`

### Attributes

| Attribute  | Type                           | Default  | Description                                       |
| ---------- | ------------------------------ | -------- | ------------------------------------------------- |
| `variant`  | `'rect' \| 'circle' \| 'text'` | `'rect'` | Visual shape preset                               |
| `size`     | `'sm' \| 'md' \| 'lg'`         | -        | Height preset (`text`) and circle size (`circle`) |
| `width`    | `string`                       | -        | Width override (for example `12rem`, `70%`)       |
| `height`   | `string`                       | -        | Height override                                   |
| `radius`   | `string`                       | -        | Border-radius override                            |
| `animated` | `boolean`                      | `true`   | Set `animated="false"` to disable shimmer         |
| `lines`    | `number`                       | `1`      | Number of text lines (`variant="text"`)           |

### Events

This component does not emit custom events.

### CSS Custom Properties

| Property                     | Default                     | Description                  |
| ---------------------------- | --------------------------- | ---------------------------- |
| `--skeleton-bg`              | `var(--color-contrast-200)` | Base shimmer color           |
| `--skeleton-highlight`       | `var(--color-contrast-100)` | Shimmer highlight color      |
| `--skeleton-radius`          | `var(--rounded-md)`         | Border radius                |
| `--skeleton-size`            | `var(--size-10)`            | Circle fallback size         |
| `--skeleton-width`           | `100%`                      | Component width              |
| `--skeleton-height`          | `var(--size-4)`             | Component height             |
| `--skeleton-line-gap`        | `var(--size-2)`             | Gap between text lines       |
| `--skeleton-last-line-width` | `60%`                       | Width of the final text line |
| `--skeleton-duration`        | `1.6s`                      | Shimmer animation duration   |

## Accordion Component

### Tag Names

- `<bit-accordion>` - Container for accordion items
- `<bit-accordion-item>` - Individual collapsible item

### bit-accordion Attributes

| Attribute        | Type                                                                           | Default      | Description                                   |
| ---------------- | ------------------------------------------------------------------------------ | ------------ | --------------------------------------------- |
| `selection-mode` | `'single' \| 'multiple'`                                                       | `'multiple'` | Selection mode                                |
| `variant`        | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost' \| 'text' \| 'frost'` | -            | Visual style variant (propagated to children) |
| `size`           | `'sm' \| 'md' \| 'lg'`                                                         | `'md'`       | Size (propagated to children)                 |

### bit-accordion-item Attributes

| Attribute  | Type                                                                           | Default | Description                  |
| ---------- | ------------------------------------------------------------------------------ | ------- | ---------------------------- |
| `expanded` | `boolean`                                                                      | `false` | Whether the item is expanded |
| `disabled` | `boolean`                                                                      | `false` | Disable the accordion item   |
| `variant`  | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost' \| 'text' \| 'frost'` | -       | Visual style variant         |
| `size`     | `'sm' \| 'md' \| 'lg'`                                                         | `'md'`  | Item size                    |

### Slots

#### bit-accordion

| Slot      | Description                                     |
| --------- | ----------------------------------------------- |
| (default) | Accordion items (`bit-accordion-item` elements) |

#### bit-accordion-item

| Slot       | Description                         |
| ---------- | ----------------------------------- |
| `title`    | Title/summary content               |
| `subtitle` | Subtitle text shown below the title |
| `prefix`   | Content before the header content   |
| `suffix`   | Content after the header content    |
| (default)  | Content shown when expanded         |

### Events

#### bit-accordion

| Event    | Detail                                  | Description                                       |
| -------- | --------------------------------------- | ------------------------------------------------- |
| `change` | `{ expandedItem: HTMLElement \| null }` | Emitted when selection changes (single mode only) |

#### bit-accordion-item

| Event      | Detail                                   | Description                    |
| ---------- | ---------------------------------------- | ------------------------------ |
| `expand`   | `{ expanded: true, item: HTMLElement }`  | Emitted when item is expanded  |
| `collapse` | `{ expanded: false, item: HTMLElement }` | Emitted when item is collapsed |

## Text Component

### Tag Name

`<bit-text>`

### Attributes

| Attribute  | Type                                                                                                            | Default  | Description                                 |
| ---------- | --------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------- |
| `variant`  | `'body' \| 'heading' \| 'label' \| 'caption' \| 'overline' \| 'code'`                                           | `'body'` | Text variant style                          |
| `size`     | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl' \| '3xl' \| '4xl' \| '5xl' \| '6xl' \| '7xl' \| '8xl' \| '9xl'`  | -        | Text size (13 options from 12px to 128px)   |
| `weight`   | `'normal' \| 'medium' \| 'semibold' \| 'bold'`                                                                  | -        | Font weight                                 |
| `color`    | `'primary' \| 'secondary' \| 'success' \| 'warning' \| 'error' \| 'heading' \| 'body' \| 'muted' \| 'disabled'` | -        | Text color                                  |
| `align`    | `'left' \| 'center' \| 'right' \| 'justify'`                                                                    | -        | Text alignment                              |
| `truncate` | `boolean`                                                                                                       | `false`  | Enable single-line truncation with ellipsis |
| `italic`   | `boolean`                                                                                                       | `false`  | Apply italic font style                     |
| `as`       | `'span' \| 'p' \| 'div' \| 'h1' \| 'h2' \| 'h3' \| 'h4' \| 'h5' \| 'h6' \| 'label' \| 'code'`                   | -        | Semantic HTML tag to render                 |

### Slots

| Slot      | Description  |
| --------- | ------------ |
| (default) | Text content |

### CSS Custom Properties

| Property                | Description    | Default                  |
| ----------------------- | -------------- | ------------------------ |
| `--text-size`           | Font size      | `var(--text-base)`       |
| `--text-weight`         | Font weight    | `var(--font-normal)`     |
| `--text-color`          | Text color     | `var(--text-color-body)` |
| `--text-line-height`    | Line height    | `var(--leading-normal)`  |
| `--text-letter-spacing` | Letter spacing | `normal`                 |

### Usage Examples

#### Basic Text

```html
<bit-text>Regular paragraph text</bit-text>
```

#### Heading Variants

```html
<bit-text variant="heading" size="3xl" as="h1">Page Title</bit-text>
<bit-text variant="heading" size="2xl" as="h2">Section Title</bit-text>
```

#### Colored Text

```html
<bit-text color="primary">Primary colored text</bit-text>
<bit-text color="error" weight="medium">Error message</bit-text>
<bit-text color="muted" size="sm">Secondary information</bit-text>
```

#### Truncated Text

```html
<bit-text truncate style="max-width: 200px;"> This long text will be truncated with ellipsis... </bit-text>
```

## Checkbox Component

### Tag Name

`<bit-checkbox>`

### Attributes

| Attribute       | Type                                                            | Default     | Description                   |
| --------------- | --------------------------------------------------------------- | ----------- | ----------------------------- |
| `checked`       | `boolean`                                                       | `false`     | Checkbox checked state        |
| `disabled`      | `boolean`                                                       | `false`     | Disable the checkbox          |
| `indeterminate` | `boolean`                                                       | `false`     | Show indeterminate state      |
| `color`         | `'primary' \| 'secondary' \| 'success' \| 'warning' \| 'error'` | `'primary'` | Semantic color                |
| `size`          | `'sm' \| 'md' \| 'lg'`                                          | `'md'`      | Checkbox size                 |
| `name`          | `string`                                                        | -           | Form field name               |
| `value`         | `string`                                                        | -           | Form field value when checked |

### Events

| Event    | Detail                                                              | Description                        |
| -------- | ------------------------------------------------------------------- | ---------------------------------- |
| `change` | `{ checked: boolean, value: string \| null, originalEvent: Event }` | Emitted when checked state changes |

## Switch Component

### Tag Name

`<bit-switch>`

### Attributes

| Attribute  | Type                                                            | Default     | Description              |
| ---------- | --------------------------------------------------------------- | ----------- | ------------------------ |
| `checked`  | `boolean`                                                       | `false`     | Switch checked state     |
| `disabled` | `boolean`                                                       | `false`     | Disable the switch       |
| `color`    | `'primary' \| 'secondary' \| 'success' \| 'warning' \| 'error'` | `'primary'` | Semantic color           |
| `size`     | `'sm' \| 'md' \| 'lg'`                                          | `'md'`      | Switch size              |
| `name`     | `string`                                                        | -           | Form field name          |
| `value`    | `string`                                                        | -           | Form field value when on |

### Slots

| Slot      | Description          |
| --------- | -------------------- |
| (default) | Switch label content |

### Events

| Event    | Detail                                                              | Description                        |
| -------- | ------------------------------------------------------------------- | ---------------------------------- |
| `change` | `{ checked: boolean, value: string \| null, originalEvent: Event }` | Emitted when checked state changes |

### CSS Custom Properties

| Property             | Description                   | Default                |
| -------------------- | ----------------------------- | ---------------------- |
| `--switch-width`     | Width of the switch track     | Size-dependent         |
| `--switch-height`    | Height of the switch track    | Size-dependent         |
| `--switch-bg`        | Background when checked       | Color-dependent        |
| `--switch-track`     | Background of unchecked track | `--color-contrast-300` |
| `--switch-thumb`     | Background of the thumb       | `white`                |
| `--switch-font-size` | Font size of the label        | Size-dependent         |

### CSS Custom Properties

#### bit-accordion

| Property          | Description                 | Default  |
| ----------------- | --------------------------- | -------- |
| `--accordion-gap` | Gap between accordion items | `0.5rem` |

#### bit-accordion-item

| Property                          | Description         | Default                 |
| --------------------------------- | ------------------- | ----------------------- |
| `--accordion-item-bg`             | Background color    | `transparent`           |
| `--accordion-item-color`          | Text color          | `var(--color-contrast)` |
| `--accordion-item-border-color`   | Border color        | `var(--color-backdrop)` |
| `--accordion-item-radius`         | Border radius       | `0.375rem`              |
| `--accordion-item-padding`        | Content padding     | Size-dependent          |
| `--accordion-item-header-padding` | Header padding      | Size-dependent          |
| `--accordion-item-font-size`      | Font size           | Size-dependent          |
| `--accordion-item-transition`     | Transition duration | `200ms ease-in-out`     |

### Examples

#### Basic Accordion

```html
<bit-accordion>
  <bit-accordion-item>
    <span slot="header">Section 1</span>
    <p>Content for section 1</p>
  </bit-accordion-item>
  <bit-accordion-item>
    <span slot="header">Section 2</span>
    <p>Content for section 2</p>
  </bit-accordion-item>
</bit-accordion>
```

#### Multiple Expand Mode

```html
<bit-accordion allow-multiple>
  <bit-accordion-item expanded>
    <span slot="header">Item 1</span>
    <p>This item is expanded</p>
  </bit-accordion-item>
  <bit-accordion-item expanded>
    <span slot="header">Item 2</span>
    <p>This item is also expanded</p>
  </bit-accordion-item>
</bit-accordion>
```

#### With Variants and Sizes

```html
<bit-accordion variant="bordered" size="lg">
  <bit-accordion-item>
    <span slot="header">Large Bordered Item</span>
    <p>Content with borders and large padding</p>
  </bit-accordion-item>
</bit-accordion>
```

#### Custom Icon

```html
<bit-accordion>
  <bit-accordion-item>
    <span slot="header">Custom Icon</span>
    <svg slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M9 18l6-6-6-6" />
    </svg>
    <p>Content with custom chevron</p>
  </bit-accordion-item>
</bit-accordion>
```

## Badge Component

### Tag Name

`<bit-badge>`

### Attributes

| Attribute | Type                                                                                   | Default     | Description                                      |
| --------- | -------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------ |
| `variant` | `'solid' \| 'flat' \| 'outline'`                                                       | `'solid'`   | Visual style variant                             |
| `color`   | `'default' \| 'primary' \| 'secondary' \| 'success' \| 'warning' \| 'error' \| 'info'` | `'default'` | Color theme                                      |
| `size`    | `'sm' \| 'md' \| 'lg'`                                                                 | `'md'`      | Badge size                                       |
| `count`   | `number`                                                                               | —           | Display a numeric count                          |
| `max`     | `number`                                                                               | `99`        | Max visible count (shows `{max}+` when exceeded) |
| `dot`     | `boolean`                                                                              | `false`     | Show as a small dot instead of a label           |
| `rounded` | `'none' \| 'sm' \| 'md' \| 'lg' \| 'full'`                                             | —           | Override border-radius                           |

### Slots

| Slot      | Description                      |
| --------- | -------------------------------- |
| (default) | Badge text / label content       |
| `icon`    | Icon to display inside the badge |

### CSS Custom Properties

| Property               | Description       | Default     |
| ---------------------- | ----------------- | ----------- |
| `--badge-bg`           | Background color  | Per variant |
| `--badge-color`        | Text / icon color | Per variant |
| `--badge-border-color` | Border color      | Per variant |
| `--badge-font-size`    | Font size         | Per size    |
| `--badge-padding`      | Internal padding  | Per size    |
| `--badge-radius`       | Border radius     | Per rounded |

## Alert Component

### Tag Name

`<bit-alert>`

### Attributes

| Attribute     | Type                                                                      | Default  | Description                                      |
| ------------- | ------------------------------------------------------------------------- | -------- | ------------------------------------------------ |
| `variant`     | `'flat' \| 'solid' \| 'bordered'`                                         | `'flat'` | Visual style variant                             |
| `color`       | `'primary' \| 'secondary' \| 'success' \| 'warning' \| 'error' \| 'info'` | —        | Semantic color theme                             |
| `size`        | `'sm' \| 'md' \| 'lg'`                                                    | `'md'`   | Alert size                                       |
| `heading`     | `string`                                                                  | `''`     | Bold heading rendered above the body             |
| `dismissible` | `boolean`                                                                 | `false`  | Show a close button; emit `dismiss` when clicked |
| `accented`    | `boolean`                                                                 | `false`  | Left accent border (flat/bordered variants only) |
| `inline`      | `boolean`                                                                 | `false`  | Position action buttons to the right of content  |
| `rounded`     | `'none' \| 'sm' \| 'md' \| 'lg' \| 'full'`                                | —        | Override border-radius                           |

### Slots

| Slot      | Description                                                         |
| --------- | ------------------------------------------------------------------- |
| (default) | Alert body content                                                  |
| `icon`    | Icon displayed on the leading edge of the alert                     |
| `meta`    | Metadata alongside the heading (lighter color, right-aligned)       |
| `actions` | Action buttons shown below the message (or beside it when `inline`) |

### Events

| Event     | Detail                          | Description                              |
| --------- | ------------------------------- | ---------------------------------------- |
| `dismiss` | `{ originalEvent: MouseEvent }` | Emitted when the close button is clicked |

### CSS Custom Properties

| Property               | Description                              | Default         |
| ---------------------- | ---------------------------------------- | --------------- |
| `--alert-bg`           | Background color                         | Per variant     |
| `--alert-color`        | Text/icon color                          | Per variant     |
| `--alert-border-color` | Border color                             | Per variant     |
| `--alert-font-size`    | Font size                                | Per size        |
| `--alert-padding`      | Internal padding                         | Per size        |
| `--alert-radius`       | Border radius                            | Per rounded     |
| `--alert-gap`          | Gap between icon, body, and close button | `var(--size-3)` |

## Tooltip Component

### Tag Name

`<bit-tooltip>`

### Attributes

| Attribute   | Type                                     | Default         | Description                                          |
| ----------- | ---------------------------------------- | --------------- | ---------------------------------------------------- |
| `content`   | `string`                                 | `''`            | Tooltip text content                                 |
| `placement` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'top'`         | Preferred placement (auto-flips near viewport edges) |
| `trigger`   | `string`                                 | `'hover,focus'` | Trigger mode(s), comma-separated                     |
| `delay`     | `number`                                 | `0`             | Show delay in milliseconds                           |
| `variant`   | `'dark' \| 'light'`                      | `'dark'`        | Visual style variant                                 |
| `size`      | `'sm' \| 'md' \| 'lg'`                   | `'md'`          | Tooltip bubble size                                  |
| `disabled`  | `boolean`                                | `false`         | Disable the tooltip entirely                         |

### Slots

| Slot      | Description                                              |
| --------- | -------------------------------------------------------- |
| (default) | The trigger element the tooltip is anchored to           |
| `content` | Rich tooltip content (overrides the `content` attribute) |

### CSS Custom Properties

| Property              | Description             | Default |
| --------------------- | ----------------------- | ------- |
| `--tooltip-max-width` | Max width of the bubble | `18rem` |

## Textarea Component

### Tag Name

`<bit-textarea>`

### Attributes

| Attribute         | Type                                                                                   | Default     | Description                                   |
| ----------------- | -------------------------------------------------------------------------------------- | ----------- | --------------------------------------------- |
| `value`           | `string`                                                                               | `''`        | Current textarea value                        |
| `name`            | `string`                                                                               | `''`        | Form field name                               |
| `label`           | `string`                                                                               | `''`        | Label text                                    |
| `label-placement` | `'inset' \| 'outside'`                                                                 | `'inset'`   | Label positioning                             |
| `placeholder`     | `string`                                                                               | `''`        | Placeholder text                              |
| `rows`            | `number`                                                                               | `3`         | Visible rows                                  |
| `maxlength`       | `number`                                                                               | —           | Maximum character count; enables live counter |
| `auto-resize`     | `boolean`                                                                              | `false`     | Grow automatically with content               |
| `resize`          | `'none' \| 'both' \| 'horizontal' \| 'vertical'`                                       | —           | CSS `resize` override                         |
| `no-resize`       | `boolean`                                                                              | `false`     | Disable manual resize handle                  |
| `helper`          | `string`                                                                               | `''`        | Helper text below the control                 |
| `error`           | `string`                                                                               | `''`        | Error message; overrides helper text          |
| `variant`         | `'flat' \| 'solid' \| 'outline'`                                                       | `'flat'`    | Visual style variant                          |
| `color`           | `'default' \| 'primary' \| 'secondary' \| 'success' \| 'warning' \| 'error' \| 'info'` | `'default'` | Color theme                                   |
| `size`            | `'sm' \| 'md' \| 'lg'`                                                                 | `'md'`      | Control size                                  |
| `disabled`        | `boolean`                                                                              | `false`     | Disable the control                           |
| `readonly`        | `boolean`                                                                              | `false`     | Make the field read-only                      |
| `required`        | `boolean`                                                                              | `false`     | Mark as required                              |

### Events

| Event    | Detail              | Description                        |
| -------- | ------------------- | ---------------------------------- |
| `input`  | `{ value: string }` | Emitted on every keystroke         |
| `change` | `{ value: string }` | Emitted when the field loses focus |

### CSS Custom Properties

| Property                   | Description                  | Default          |
| -------------------------- | ---------------------------- | ---------------- |
| `--textarea-border-color`  | Default border color         | `--color-border` |
| `--textarea-focus-color`   | Focus ring / active color    | Per color theme  |
| `--textarea-bg`            | Background color             | Per variant      |
| `--textarea-color`         | Text color                   | Per variant      |
| `--textarea-font-size`     | Font size                    | Per size         |
| `--textarea-counter-color` | Character counter text color | `--color-muted`  |

## Select Component

### Tag Name

`<bit-select>`

### Attributes

| Attribute         | Type                                                                                   | Default     | Description                          |
| ----------------- | -------------------------------------------------------------------------------------- | ----------- | ------------------------------------ |
| `value`           | `string`                                                                               | `''`        | Currently selected value             |
| `name`            | `string`                                                                               | `''`        | Form field name                      |
| `label`           | `string`                                                                               | `''`        | Label text                           |
| `label-placement` | `'inset' \| 'outside'`                                                                 | `'inset'`   | Label positioning                    |
| `placeholder`     | `string`                                                                               | `''`        | Empty-state placeholder text         |
| `helper`          | `string`                                                                               | `''`        | Helper text below the control        |
| `error`           | `string`                                                                               | `''`        | Error message; overrides helper text |
| `variant`         | `'flat' \| 'solid' \| 'outline'`                                                       | `'flat'`    | Visual style variant                 |
| `color`           | `'default' \| 'primary' \| 'secondary' \| 'success' \| 'warning' \| 'error' \| 'info'` | `'default'` | Color theme                          |
| `size`            | `'sm' \| 'md' \| 'lg'`                                                                 | `'md'`      | Control size                         |
| `multiple`        | `boolean`                                                                              | `false`     | Allow multiple selections            |
| `disabled`        | `boolean`                                                                              | `false`     | Disable the control                  |
| `readonly`        | `boolean`                                                                              | `false`     | Prevent the dropdown from opening    |
| `required`        | `boolean`                                                                              | `false`     | Mark as required                     |
| `rounded`         | `'none' \| 'sm' \| 'md' \| 'lg' \| 'full'`                                             | —           | Override border-radius               |

### Slots

| Slot      | Description                                     |
| --------- | ----------------------------------------------- |
| (default) | `<option>` and `<optgroup>` elements to display |

### Events

| Event    | Detail                                | Description                               |
| -------- | ------------------------------------- | ----------------------------------------- |
| `change` | `{ value: string, values: string[] }` | Emitted when the selected value(s) change |

### CSS Custom Properties

| Property                   | Description                   | Default           |
| -------------------------- | ----------------------------- | ----------------- |
| `--select-border-color`    | Default border color          | `--color-border`  |
| `--select-focus-color`     | Focus ring / active color     | Per color theme   |
| `--select-bg`              | Trigger background            | Per variant       |
| `--select-dropdown-bg`     | Dropdown panel background     | `--color-surface` |
| `--select-option-hover-bg` | Option hover state background | `--color-hover`   |
| `--select-height`          | Trigger height                | Per size          |

## Theme Variables

Global theme variables that affect all components:

### Color Palette

```css
:root {
  /* Primary colors */
  --color-primary: #3b82f6;
  --color-primary-light: #60a5fa;
  --color-primary-dark: #2563eb;

  /* Secondary colors */
  --color-secondary: #6b7280;
  --color-secondary-light: #9ca3af;
  --color-secondary-dark: #4b5563;

  /* Semantic colors */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;

  /* Neutral colors */
  --color-canvas: #ffffff;
  --color-contrast: #1f2937;
  --color-backdrop: #f3f4f6;
  --color-focus: #3b82f6;
}

.dark-theme {
  --color-primary: #60a5fa;
  --color-primary-light: #93c5fd;
  --color-primary-dark: #3b82f6;

  --color-secondary: #9ca3af;
  --color-secondary-light: #d1d5db;
  --color-secondary-dark: #6b7280;

  --color-success: #34d399;
  --color-warning: #fbbf24;
  --color-error: #f87171;

  --color-canvas: #111827;
  --color-contrast: #f9fafb;
  --color-backdrop: #1f2937;
  --color-focus: #60a5fa;
}
```

### Spacing

```css
:root {
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
}
```

### Typography

```css
:root {
  --font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-md: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
}
```

### Borders

```css
:root {
  --border-width: 1px;
  --border-radius-sm: 0.25rem;
  --border-radius-md: 0.375rem;
  --border-radius-lg: 0.5rem;
  --border-radius-full: 9999px;
}
```

### Shadows

```css
:root {
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}
```

## Utilities

### Theme Control

Control the theme programmatically:

```typescript
// Set theme
document.documentElement.classList.add('dark-theme');
document.documentElement.classList.remove('light-theme');

// Toggle theme
document.documentElement.classList.toggle('dark-theme');

// Detect system preference
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (e.matches) {
    document.documentElement.classList.add('dark-theme');
  } else {
    document.documentElement.classList.remove('dark-theme');
  }
});
```

### Custom Properties Helper

Get and set custom properties:

```typescript
// Get custom property value
const button = document.querySelector('bit-button');
const bgColor = getComputedStyle(button).getPropertyValue('--button-bg');

// Set custom property
button.style.setProperty('--button-bg', '#3b82f6');
button.style.setProperty('--button-color', 'white');
```

## Type Definitions

### Button Types

```typescript
type ButtonVariant = 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'text';
type ButtonColor = 'primary' | 'secondary' | 'success' | 'warning' | 'error';
type ButtonSize = 'sm' | 'md' | 'lg';
type ButtonType = 'button' | 'submit' | 'reset';

interface ButtonElement extends HTMLElement {
  variant: ButtonVariant;
  color: ButtonColor;
  size: ButtonSize;
  type: ButtonType;
  disabled: boolean;
  loading: boolean;
  iconOnly: boolean;
  rounded: boolean;
}

interface ButtonClickEvent extends CustomEvent {
  detail: {
    originalEvent: MouseEvent;
  };
}
```

### Global Types

For better TypeScript support in JSX/TSX:

```typescript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'bit-button': {
        variant?: ButtonVariant;
        color?: ButtonColor;
        size?: ButtonSize;
        type?: ButtonType;
        disabled?: boolean;
        loading?: boolean;
        'icon-only'?: boolean;
        rounded?: boolean;
        'aria-label'?: string;
        style?: string;
        class?: string;
        onClick?: (event: ButtonClickEvent) => void;
      };
    }
  }
}
```

## Browser Compatibility

### Supported Browsers

| Browser | Minimum Version |
| ------- | --------------- |
| Chrome  | 77+             |
| Firefox | 93+             |
| Safari  | 16.4+           |
| Edge    | 79+             |

### Required Features

Buildit requires the following web platform features:

- **Custom Elements v1** – For component registration
- **Shadow DOM v1** – For style encapsulation
- **ES Modules** – For component loading
- **CSS Custom Properties** – For theming

### Polyfills

For older browsers, use [@webcomponents/webcomponentsjs](https://github.com/webcomponents/polyfills):

```html
<script src="https://unpkg.com/@webcomponents/webcomponentsjs@latest/webcomponents-loader.js"></script>
<script type="module">
  import '@vielzeug/buildit/button';
</script>
```

## Performance

### Bundle Size

Component sizes (minified + gzipped):

| Component | Size        |
| --------- | ----------- |
| Button    | ~6.8 KB     |
| Input     | Coming soon |
| Select    | Coming soon |

### Tree Shaking

Buildit supports tree-shaking. Import only what you need:

```typescript
// ✅ Only button code is included
import '@vielzeug/buildit/button';

// ❌ Don't do this (no tree-shaking benefit)
import * as Buildit from '@vielzeug/buildit';
```

### Lazy Loading

Lazy load components for better performance:

```typescript
// Load button only when needed
async function loadButton() {
  await import('@vielzeug/buildit/button');
}

// Use with intersection observer
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      loadButton();
    }
  });
});
```

## Next Steps

- **[Usage Guide](./usage.md)** – Installation and usage patterns
- **[Examples](./examples.md)** – Real-world examples
- **[Button Component](components/button.md)** – Complete button documentation
