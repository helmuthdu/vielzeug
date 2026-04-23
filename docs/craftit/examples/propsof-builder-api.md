---
title: 'Craftit Examples — Props DSL'
description: 'Examples demonstrating the defineProps + prop.* DSL.'
---

## Props DSL

## Problem

Define typed component props concisely using `defineProps` and `prop.*` helpers.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/craftit` installed.

### Basic Usage

```ts
import { define, defineProps, html, prop } from '@vielzeug/craftit';

define('x-button', {
  props: defineProps({
    label: prop.string('Button'),
    disabled: prop.bool(false),
    count: prop.number(0),
    size: prop.oneOf(['sm', 'md', 'lg'] as const, 'md'),
    variant: prop.oneOf(['solid', 'outline'] as const, 'solid'),
  }),
  setup(props) {
    return {
      render: () => html`
        <button ?disabled=${props.disabled} :data-size=${props.size.value}>
          ${props.count.value > 0 ? html`<span class="badge">${props.count}</span>` : ''}
          ${props.label}
        </button>
      `,
    };
  },
});
```

### With raw `PropDef` for advanced control

```ts
import { define, defineProps, html, prop } from '@vielzeug/craftit';

define<{
  data?: Record<string, unknown>;
  timestamp?: number;
  internalState?: number;
}>('x-data-component', {
  props: {
    // Don't reflect complex objects to attributes
    data: { default: {} as Record<string, unknown>, reflect: false },

    // Custom parsing
    timestamp: {
      default: 0,
      parse: (v) => (v ? parseInt(v) : 0),
      reflect: true,
    },

    // Don't auto-reflect to attribute
    internalState: { default: 0, reflect: false },
  },
  setup(props) {
    return { render: () => html`<div>${props.internalState}</div>` };
  },
});
```

### Union props via `prop.oneOf`

```ts
import { define, defineProps, html, prop } from '@vielzeug/craftit';

define('x-colored-box', {
  props: defineProps({
    color: prop.oneOf(['red', 'green', 'blue'] as const, 'red'),
    size: prop.oneOf(['sm', 'md', 'lg', 'xl'] as const, 'md'),
  }),
  setup(props) {
    return {
      render: () => html`
        <div style=${{ color: props.color.value, fontSize: `var(--size-${props.size.value})` }}>
          Component
        </div>
      `,
    };
  },
});
```

## Expected Output

- TypeScript infers exact types from each `prop.*` helper
- Prop values are automatically parsed from HTML attributes
- Omit props evaluated as their defaults when not set
- Component renders without runtime type errors

## API Reference

### `prop` Helpers

| Helper | Example | Inferred type |
|---|---|---|
| `prop.string(default)` | `prop.string('md')` | `string` (narrows to literal) |
| `prop.bool(default?)` | `prop.bool(false)` | `boolean` |
| `prop.number(default?)` | `prop.number(0)` | `number` |
| `prop.oneOf(allowed, default)` | `prop.oneOf(['a','b'], 'a')` | union of allowed values |

### `defineProps(defs)`

Identity function that returns the defs object unchanged — exists purely for type inference convenience.

## Common Patterns

### Theme and Variant Customization

```ts
define('x-themeable', {
  props: defineProps({
    color: prop.oneOf(['primary', 'secondary', 'accent', 'neutral'] as const, 'primary'),
    size: prop.oneOf(['sm', 'md', 'lg'] as const, 'md'),
    variant: prop.oneOf(['solid', 'outline', 'ghost'] as const, 'solid'),
  }),
  setup() {
    return { render: () => html`...` };
  },
});
```

### Form Integration

```ts
define('x-field', {
  props: defineProps({
    name: prop.string(''),
    value: prop.string(''),
    disabled: prop.bool(false),
    required: prop.bool(false),
  }),
  setup() {
    return { render: () => html`...` };
  },
});
```

### Configuration Props

```ts
define('x-configurable', {
  props: defineProps({
    itemsPerPage: prop.number(10),
    sortBy: prop.oneOf(['name', 'date', 'size'] as const, 'name'),
  }),
  setup() {
    return { render: () => html`...` };
  },
});
```

## Related Recipes

- [Typed Props and Emits](./typed-props-and-emits.md)
- [Counter Component](./counter-component.md)
- [Form-Associated Rating Input](./form-associated-rating-input.md)
