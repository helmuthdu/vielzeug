---
title: 'Craftit Examples — Plain Props API'
description: 'Examples demonstrating the component<Props> plain props API.'
---

## Plain Props API

## Problem

Define typed component props directly in `component<Props>({ props })` without a separate schema builder.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/craftit` installed.

### Basic Usage

```ts
import { component, define, html } from '@vielzeug/craftit';

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

define(
  'x-button',
  component<ButtonProps>({
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
        <button ?disabled=${props.disabled} :data-size=${props.size}>
          ${props.count > 0 ? html`<span class="badge">${props.count}</span>` : ''}
          ${props.label}
        </button>
        ${props.helperText ? html`<small>${props.helperText}</small>` : ''}
      `;
    },
  }),
);
```

### With `PropDef` options

```ts
import { component, define, html } from '@vielzeug/craftit';

define(
  'x-data-component',
  component<{
  data?: Record<string, unknown>;
  error?: string;
  internalState?: number;
  timestamp?: number;
  }>({
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
      return html`<div>${props.internalState}</div>`;
    },
  }),
);
```

### Union props from the component type

```ts
import { component, define, html } from '@vielzeug/craftit';

const COLORS = ['red', 'green', 'blue'] as const;
const SIZES = ['sm', 'md', 'lg', 'xl'] as const;

define(
  'x-colored-box',
  component<{
    color?: (typeof COLORS)[number];
    size?: (typeof SIZES)[number];
  }>({
    props: {
      color: 'red',
      size: 'md',
    },
    setup({ props }) {
      return html`
        <div style=${{ color: props.color, fontSize: `var(--size-${props.size})` }}>
          Component
        </div>
      `;
    },
  }),
);
```

## Expected Output

- TypeScript provides full type inference from the `Props` generic
- Prop values are still automatically parsed from HTML attributes
- Optional props evaluate to `undefined` when not set
- Component renders without runtime type errors

## API Reference

### Key Features

- **Type Safety**: Full TypeScript support from `component<Props>`
- **Simple Defaults**: Plain values for common cases
- **Advanced Options**: Inline `PropDef` objects for `parse`, `reflect`, and `omit`
- **Validation**: Keep allowed values in the prop type and choose sensible defaults
- **Optional Props**: Use `undefined` defaults for optional fields
- **Customizable**: Inline `PropDef` objects for parsing, reflection, and behavior

## Common Patterns

### Theme and Variant Customization

```ts
define('x-themeable', component<{
  color?: 'primary' | 'secondary' | 'accent' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'outline' | 'ghost';
}>({
  props: {
    color: 'primary',
    variant: 'solid',
    size: 'md',
  },
  setup() {
    return html`...`;
  },
}))
```

### Form Integration

```ts
define('x-field', component<{
  disabled?: boolean;
  name?: string;
  placeholder?: string;
  required?: boolean;
  value?: string;
}>({
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
}))
```

### Configuration Props

```ts
define('x-configurable', component<{
  itemsPerPage?: number;
  maxItems?: number;
  minItems?: number;
  sortBy?: 'name' | 'date' | 'size';
}>({
  props: {
    itemsPerPage: 10,
    minItems: 0,
    maxItems: undefined,
    sortBy: 'name',
  },
  setup() {
    return html`...`;
  },
}))
```

## Related Recipes

- [Typed Props and Emits](./typed-props-and-emits.md)
- [Counter Component](./counter-component.md)
- [Form-Associated Rating Input](./form-associated-rating-input.md)
