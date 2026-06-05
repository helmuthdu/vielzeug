# Skeleton

A loading placeholder component for representing content that has not loaded yet. Use it to reduce layout shift and provide immediate visual structure while data is fetched.

## Features

- Three visual variants: rect, circle, text
- Size variants: sm, md, lg
- First-class `width`, `height`, and `radius` attributes
- Multi-line text skeletons via `lines`
- Runtime animation toggle via `animated="false"`
- Diagonal striped pattern via `striped` for design-mode placeholders
- Shimmer animation with reduced-motion fallback
- Fully styleable through CSS custom properties
- Forced-colors support for high-contrast environments

## Source Code

::: details View Source Code
<<< @/../packages/sigil/src/feedback/skeleton/skeleton.ts
:::

## Basic Usage

```html
<sg-skeleton></sg-skeleton>
<sg-skeleton width="12rem" height="1rem"></sg-skeleton>

<script type="module">
  import '@vielzeug/sigil/skeleton';
</script>
```

## Variants

### Rectangle (Default)

<ComponentPreview center vertical>

```html
<sg-skeleton width="100%" height="1rem"></sg-skeleton> <sg-skeleton width="16rem" height="10rem"></sg-skeleton>
```

</ComponentPreview>

### Circle

<ComponentPreview center>

```html
<sg-skeleton variant="circle" size="sm"></sg-skeleton>
<sg-skeleton variant="circle" size="lg"></sg-skeleton>
<sg-skeleton variant="circle" width="3.5rem" height="3.5rem"></sg-skeleton>
```

</ComponentPreview>

### Text

<ComponentPreview center vertical>

```html
<sg-skeleton variant="text" lines="3" width="100%"></sg-skeleton>
<sg-skeleton variant="text" lines="2" width="70%"></sg-skeleton>
```

</ComponentPreview>

## Sizes

<ComponentPreview center vertical>

```html
<sg-skeleton size="sm" width="14rem"></sg-skeleton>
<sg-skeleton size="md" width="14rem"></sg-skeleton>
<sg-skeleton size="lg" width="14rem"></sg-skeleton>
```

</ComponentPreview>

## Common Patterns

### Card Placeholder

<ComponentPreview center vertical>

```html
<sg-card style="padding: var(--size-4); width: 20rem;">
  <sg-skeleton width="100%" height="10rem" style="margin-bottom: var(--size-4)"></sg-skeleton>
  <sg-skeleton variant="text" lines="3" width="100%"></sg-skeleton>
</sg-card>
```

</ComponentPreview>

### List Item Placeholder

<ComponentPreview center vertical>

```html
<div style="display: grid; gap: var(--size-3); width: 100%; max-width: 28rem;">
  <div style="display: flex; align-items: center; gap: var(--size-3);">
    <sg-skeleton variant="circle" width="2.25rem" height="2.25rem"></sg-skeleton>
    <div style="flex: 1; display: grid; gap: var(--size-2);">
      <sg-skeleton variant="text" width="40%"></sg-skeleton>
      <sg-skeleton variant="text" width="70%"></sg-skeleton>
    </div>
  </div>
</div>
```

</ComponentPreview>

## Animation Control

Use `animated="false"` for static placeholders.

<ComponentPreview center vertical>

```html
<sg-skeleton width="16rem" height="1rem"></sg-skeleton>
<sg-skeleton width="16rem" height="1rem" animated="false"></sg-skeleton>
```

</ComponentPreview>

## Striped

Add `striped` to replace the shimmer with a diagonal stripe pattern. Useful for designers building page layouts — the high-contrast stripes make it immediately obvious where content placeholders are, without relying on animation.

<ComponentPreview center>

```html
<sg-card padding="md" style="width: 280px;">
  <!-- Hero image area -->
  <sg-skeleton striped width="100%" height="160px" style="border-radius: 0; display: block;"></sg-skeleton>

  <sg-grid gap="md" style="margin-top: var(--size-4);">
    <!-- Avatar + author line -->
    <div style="display: flex; align-items: center; gap: var(--size-2);">
      <sg-skeleton striped variant="circle" width="2rem" height="2rem"></sg-skeleton>
      <sg-skeleton striped variant="text" width="6rem"></sg-skeleton>
    </div>

    <!-- Title -->
    <sg-skeleton striped width="90%" height="1.125rem"></sg-skeleton>

    <!-- Body text lines -->
    <sg-skeleton striped variant="text" lines="3" width="98%"></sg-skeleton>

    <!-- Action button -->
    <sg-skeleton striped width="7rem" height="2rem" style="border-radius: var(--rounded-lg);"></sg-skeleton>
  </sg-grid>
</sg-card>
```

</ComponentPreview>

The spacing between lines is adjustable via the `--skeleton-stripe-size` CSS custom property:

```html
<sg-skeleton striped width="100%" height="2rem" style="--skeleton-stripe-size: 16px"></sg-skeleton>
```

## API Reference

### Attributes

| Attribute  | Type                           | Default  | Description                                       |
| ---------- | ------------------------------ | -------- | ------------------------------------------------- |
| `variant`  | `'rect' \| 'circle' \| 'text'` | `'rect'` | Visual shape preset                               |
| `size`     | `'sm' \| 'md' \| 'lg'`         | -        | Height preset (`text`) and circle size (`circle`) |
| `width`    | `string`                       | -        | Width override (e.g. `12rem`, `70%`)              |
| `height`   | `string`                       | -        | Height override                                   |
| `radius`   | `string`                       | -        | Border-radius override                            |
| `animated` | `boolean`                      | `true`   | Set `animated="false"` to disable shimmer         |
| `lines`    | `number`                       | `1`      | Number of text lines (`variant="text"`)           |
| `striped`  | `boolean`                      | `false`  | Diagonal stripe pattern instead of shimmer        |

### Events

This component does not emit custom events.

### CSS Custom Properties

| Property                     | Description                                               | Default                     |
| ---------------------------- | --------------------------------------------------------- | --------------------------- |
| `--skeleton-bg`              | Base color                                                | `var(--color-contrast-200)` |
| `--skeleton-highlight`       | Shimmer highlight color                                   | `var(--color-contrast-100)` |
| `--skeleton-radius`          | Border radius                                             | `var(--rounded-lg)`         |
| `--skeleton-size`            | Circle fallback size                                      | `var(--size-10)`            |
| `--skeleton-width`           | Component width                                           | `100%`                      |
| `--skeleton-height`          | Component height                                          | `var(--size-4)`             |
| `--skeleton-line-gap`        | Gap between text lines                                    | `var(--size-2)`             |
| `--skeleton-last-line-width` | Width of the final text line                              | `60%`                       |
| `--skeleton-duration`        | Shimmer animation duration                                | `1.6s`                      |
| `--skeleton-stripe-size`     | Spacing between the 1px diagonal lines (`striped`)        | `8px`                       |
| `--skeleton-stripe-color`    | Color of the diagonal lines and dashed border (`striped`) | `var(--color-contrast-400)` |

## Accessibility

The skeleton component follows WAI-ARIA best practices.

### `sg-skeleton`

✅ **Screen Readers**

- Skeleton placeholders are decorative and non-interactive.
- The internal visual element is marked with `aria-hidden="true"`.
- No focusable roles or tab stops are exposed.
- Animation is disabled for users with `prefers-reduced-motion: reduce`.

## Related Components

- [Progress](./progress.md) for explicit operation progress states
- [Card](./card.md) for content containers commonly paired with placeholders
- [Text](./text.md) for loaded content replacing text skeleton lines
