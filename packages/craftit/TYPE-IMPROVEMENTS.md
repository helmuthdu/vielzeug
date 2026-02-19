# Craftit Type Improvements - Example

## Before (2 generic parameters)

```typescript
import { defineElement, html } from '@vielzeug/craftit';

// ❌ Old syntax - state as second parameter
defineElement<HTMLInputElement, { value: string }>(
  'my-input',
  {
    state: { value: '' },
    template: (el) => html`
      <input type="text" value="${el.state.value}" />
    `
  }
);
```

## After (3 generic parameters)

```typescript
import { defineElement, html } from '@vielzeug/craftit';

// ✅ New syntax - Props, State clearly separated
defineElement<HTMLInputElement, { variant: string; size: string }, { value: string }>(
  'my-input',
  {
    observedAttributes: ['variant', 'size'] as const,
    state: { value: '' },
    template: (el) => html`
      <input 
        type="text" 
        value="${el.state.value}"
        class="${el.variant} ${el.size}"
      />
    `
  }
);
```

## Benefits

### 1. **Type-safe Props (Attributes)**

```typescript
defineElement<
  HTMLDivElement,
  { variant: 'solid' | 'outline' | 'ghost'; disabled: boolean }, // Props
  { count: number } // State
>(
  'my-button',
  {
    observedAttributes: ['variant', 'disabled'] as const,
    state: { count: 0 },
    template: (el) => html`
      <button ?disabled="${el.disabled}">
        ${el.variant}: ${el.state.count}
      </button>
    `
  }
);

// Usage with autocomplete:
const button = document.createElement('my-button') as WebComponent<
  HTMLDivElement,
  { variant: 'solid' | 'outline' | 'ghost'; disabled: boolean },
  { count: number }
>;

button.variant = 'solid';  // ✅ Type-safe!
button.disabled = true;    // ✅ Type-safe!
button.state.count++;      // ✅ Type-safe!
```

### 2. **Better IDE Support**

- Autocomplete for component props (attributes)
- Autocomplete for state properties
- Type checking for both attributes and state
- Clear separation of concerns

### 3. **Template Type Safety**

```typescript
defineElement<
  HTMLDivElement,
  { color: 'primary' | 'secondary'; size: 'sm' | 'md' | 'lg' },
  { isOpen: boolean }
>(
  'my-modal',
  {
    observedAttributes: ['color', 'size'] as const,
    state: { isOpen: false },
    onConnected(el) {
      // el.color is typed as 'primary' | 'secondary'
      // el.size is typed as 'sm' | 'md' | 'lg'  
      // el.state.isOpen is typed as boolean
      
      console.log(el.color, el.size, el.state.isOpen); // All type-safe!
    },
    template: (el) => html`
      <div class="modal ${el.color} ${el.size}">
        ${el.state.isOpen ? 'Open' : 'Closed'}
      </div>
    `
  }
);
```

### 4. **Form-Associated Components**

```typescript
defineElement<
  HTMLInputElement,
  { name: string; required: boolean; placeholder: string },
  { value: string; error: string | null }
>(
  'my-form-input',
  {
    formAssociated: true,
    observedAttributes: ['name', 'required', 'placeholder'] as const,
    state: { value: '', error: null },
    
    onConnected(el) {
      // All properties are type-safe
      el.form?.value(el.state.value);
      
      if (el.required && !el.state.value) {
        el.form?.valid({ valueMissing: true }, 'This field is required');
      }
    },
    
    template: (el) => html`
      <input
        type="text"
        name="${el.name}"
        placeholder="${el.placeholder}"
        ?required="${el.required}"
        value="${el.state.value}"
      />
      ${el.state.error ? html`<span class="error">${el.state.error}</span>` : ''}
    `
  }
);
```

## Migration Guide

### Update your imports:

```typescript
// No change needed
import { defineElement, html, type WebComponent } from '@vielzeug/craftit';
```

### Update defineElement calls:

```typescript
// Before
defineElement<RootElement, StateType>('my-component', { ... });

// After  
defineElement<RootElement, PropsType, StateType>('my-component', { ... });
```

### Update WebComponent type references:

```typescript
// Before
const el = document.createElement('my-component') as WebComponent<HTMLElement, { count: number }>;

// After
const el = document.createElement('my-component') as WebComponent<HTMLElement, object, { count: number }>;
// Or with props:
const el = document.createElement('my-component') as WebComponent<
  HTMLElement,
  { variant: string },
  { count: number }
>;
```

## Generic Parameter Order

```typescript
defineElement<T, P, S>(name, options)
             │  │  │
             │  │  └─ S: State object type
             │  └──── P: Props object type (component attributes)
             └─────── T: Root element type (first child in shadow DOM)

WebComponent<T, P, S>
             │  │  │
             │  │  └─ S: State object type
             │  └──── P: Props object type (component attributes)
             └─────── T: Root element type
```

## Example: Complete Component

```typescript
import { defineElement, html, type WebComponent } from '@vielzeug/craftit';

// Define the component with full type safety
defineElement<
  HTMLButtonElement,
  {
    variant: 'solid' | 'outline' | 'ghost';
    size: 'sm' | 'md' | 'lg';
    disabled: boolean;
  },
  {
    count: number;
    loading: boolean;
  }
>(
  'counter-button',
  {
    observedAttributes: ['variant', 'size', 'disabled'] as const,
    
    state: {
      count: 0,
      loading: false
    },
    
    onConnected(el) {
      el.on('button', 'click', async () => {
        if (el.disabled || el.state.loading) return;
        
        el.set({ loading: true });
        await new Promise(resolve => setTimeout(resolve, 500));
        el.set({ count: el.state.count + 1, loading: false });
      });
    },
    
    template: (el) => html`
      <button
        class="btn-${el.variant} btn-${el.size}"
        ?disabled="${el.disabled || el.state.loading}"
      >
        ${el.state.loading ? 'Loading...' : `Count: ${el.state.count}`}
      </button>
    `
  }
);

// Usage with type checking
const button = document.createElement('counter-button') as WebComponent<
  HTMLButtonElement,
  {
    variant: 'solid' | 'outline' | 'ghost';
    size: 'sm' | 'md' | 'lg';
    disabled: boolean;
  },
  {
    count: number;
    loading: boolean;
  }
>;

// All type-safe!
button.variant = 'solid';
button.size = 'lg';
button.disabled = false;
console.log(button.state.count); // number
console.log(button.state.loading); // boolean
```

