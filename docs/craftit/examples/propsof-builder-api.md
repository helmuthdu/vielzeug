---
title: 'Craftit Examples — Plain Props API'
description: 'Examples demonstrating the define<Props> plain props API.'
---

## Plain Props API

## Problem

Define typed component props directly in `define<Props>(..., { props })` without a separate schema builder.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/craftit` installed.

### Basic Usage

```ts
import { define, html } from '@vielzeug/craftit';

type ButtonProps = {
  count?: number;
  customId?: number;
  disabled?: boolean;
  helperText?: string;
  label?: string;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'outline';
};

define<ButtonProps>(
  'x-button',
  {
    props: {
      label: 'Button',
      disabled: false,
      count: 0,
      size: 'md',
      helperText: undefined,
      customId: undefined,
      loading: false,
      variant: undefined,
    },
    setup({ props }) {
      return html`
        <button ?disabled=${props.disabled.value} :data-size=${props.size.value}>
          ${props.count.value > 0 ? html`<span class="badge">${props.count.value}</span>` : ''}
          ${props.label.value}
        </button>
        ${props.helperText.value ? html`<small>${props.helperText.value}</small>` : ''}
      `;
    },
  },
);
```

### With `PropDef` options

```ts
import { define, html } from '@vielzeug/craftit';

define<{
  data?: Record<string, unknown>;
  error?: string;
  internalState?: number;
  timestamp?: number;
  }>(
  'x-data-component',
  {
    props: {
      // Don't reflect complex objects to attributes
      data: { default: {}, reflect: false },

      // Omit from DOM when empty
      error: { default: '', omit: true },

      // Custom parsing
      timestamp: {
        default: 0,
        type: Number,
        parse: (v) => v ? parseInt(v) : 0,
      },

      // Don't auto-reflect to attribute
      internalState: { default: 0, type: Number, reflect: false },
    },
    setup({ props }) {
      return html`<div>${props.internalState.value}</div>`;
    },
  },
);
```

### Union props from the component type

```ts
import { define, html } from '@vielzeug/craftit';

const COLORS = ['red', 'green', 'blue'] as const;
const SIZES = ['sm', 'md', 'lg', 'xl'] as const;

define<{
    color?: (typeof COLORS)[number];
    size?: (typeof SIZES)[number];
  }>(
  'x-colored-box',
  {
    props: {
      color: 'red',
      size: 'md',
    },
    setup({ props }) {
      return html`
        <div style=${{ color: props.color.value, fontSize: `var(--size-${props.size.value})` }}>
          Component
        </div>
      `;
    },
  },
);
```

## Expected Output

- TypeScript provides full type inference from the `Props` generic
- Prop values are still automatically parsed from HTML attributes
- Optional props evaluate to `undefined` when not set
- Component renders without runtime type errors

## API Reference

### Key Features

- **Type Safety**: Full TypeScript support from `define<Props>`
- **Simple Defaults**: Plain values for common cases
- **Advanced Options**: Inline `PropDef` objects for `parse`, `reflect`, and `omit`
- **Validation**: Keep allowed values in the prop type and choose sensible defaults
- **Optional Props**: Use `undefined` defaults for optional fields
- **Customizable**: Inline `PropDef` objects for parsing, reflection, and behavior

## Common Patterns

### Theme and Variant Customization

```ts
define<{
  color?: 'primary' | 'secondary' | 'accent' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'outline' | 'ghost';
}>('x-themeable', {
  props: {
    color: 'primary',
    variant: 'solid',
    size: 'md',
  },
  setup() {
    return html`...`;
  },
})
```

### Form Integration

```ts
define<{
  disabled?: boolean;
  name?: string;
  placeholder?: string;
  required?: boolean;
  value?: string;
}>('x-field', {
  props: {
    name: '',
    value: '',
    disabled: false,
    required: false,
    placeholder: undefined,
  },
  setup() {
    return html`...`;
  },
})
```

### Configuration Props

```ts
define<{
  itemsPerPage?: number;
  maxItems?: number;
  minItems?: number;
  sortBy?: 'name' | 'date' | 'size';
}>('x-configurable', {
  props: {
    itemsPerPage: 10,
    minItems: 0,
    maxItems: undefined,
    sortBy: 'name',
  },
  setup() {
    return html`...`;
  },
})
```

## Related Recipes

- [Typed Props and Emits](./typed-props-and-emits.md)
- [Counter Component](./counter-component.md)
- [Form-Associated Rating Input](./form-associated-rating-input.md)
