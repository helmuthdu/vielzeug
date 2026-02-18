# Craftit Testing Utilities

Comprehensive testing utilities for web components built with craftit.

## Installation

```bash
npm install @vielzeug/craftit
```

## Usage

Import testing utilities from `@vielzeug/craftit/testing`:

```typescript
import { createFixture, createComponent, queryShadow } from '@vielzeug/craftit/testing';
```

## Quick Start

```typescript
import { defineElement, html } from '@vielzeug/craftit';
import { createFixture } from '@vielzeug/craftit/testing';

// Define a component
defineElement('my-button', {
  template: (el) => html`
    <button>
      <slot></slot>
    </button>
  `,
});

// Test it
describe('my-button', () => {
  it('should render', async () => {
    const fixture = await createFixture('my-button');
    const button = fixture.query('button');
    
    expect(button).toBeTruthy();
    
    fixture.destroy();
  });
});
```

## Core Utilities

### Container Management

#### createTestContainer()

Creates a test container with automatic cleanup.

```typescript
const { container, cleanup } = createTestContainer();
container.innerHTML = '<my-component>Test</my-component>';
// ... test code ...
cleanup();
```

**In beforeEach/afterEach:**

```typescript
let container: HTMLElement;
let cleanup: () => void;

beforeEach(() => {
  const testContainer = createTestContainer();
  container = testContainer.container;
  cleanup = testContainer.cleanup;
});

afterEach(() => {
  cleanup();
});
```

### Component Creation

#### createFixture()

Creates a test fixture with lifecycle management and helper methods (recommended for most tests).

```typescript
const fixture = await createFixture('my-button', {
  variant: 'outline',
  disabled: true
});

// Built-in helper methods
const innerButton = fixture.query('button');
await fixture.setAttribute('color', 'error');

// Automatic cleanup
fixture.destroy();
```

**Parameters:**
- `tagName: string` - Component tag name
- `attributes?: Record<string, string | boolean>` - Attributes to set

**Returns:** Promise<ComponentFixture<T>>

**When to use:** Most component tests - provides built-in shadow DOM queries, attribute helpers, and automatic cleanup.

#### createComponent()

Creates and attaches a component to the DOM (for advanced use cases).

```typescript
const { container, cleanup } = createTestContainer();
const button = await createComponent('my-button', {
  variant: 'outline',
  disabled: true
}, container);

// Manual shadow DOM queries
const innerButton = button.shadowRoot?.querySelector('button');

cleanup();
```

**Parameters:**
- `tagName: string` - Component tag name
- `attributes?: Record<string, string | boolean>` - Attributes to set
- `container?: HTMLElement` - Container (defaults to document.body)

**Returns:** Promise<HTMLElement>

**When to use:** 
- Testing multiple components together
- Complex test setups requiring manual container management
- When you need the raw element without fixture helpers
- Internal use by other testing utilities

**Fixture Methods:**

| Method | Description |
|--------|-------------|
| `update()` | Wait for component re-render |
| `query<T>(selector)` | Query element in shadow DOM |
| `queryAll<T>(selector)` | Query all elements in shadow DOM |
| `setAttribute(name, value)` | Set attribute and wait for update |
| `setAttributes(attrs)` | Set multiple attributes and wait |
| `destroy()` | Cleanup component and container |

## Shadow DOM Utilities

### queryShadow()

Query an element in shadow DOM.

```typescript
const button = await createComponent('my-button');
const innerButton = queryShadow(button, 'button');
const loader = queryShadow<HTMLSpanElement>(button, '.loader');
```

### queryShadowAll()

Query all elements in shadow DOM.

```typescript
const slots = queryShadowAll(button, 'slot');
expect(slots.length).toBe(3);
```

### hasShadowClass()

Check if element has CSS class in shadow DOM.

```typescript
expect(hasShadowClass(button, 'button', 'active')).toBe(true);
```

### getShadowStyle()

Get computed style of element in shadow DOM.

```typescript
const color = getShadowStyle(button, 'button', 'color');
```

## Async Utilities

### waitForRender()

Wait for the next animation frame (component re-render).

```typescript
button.setAttribute('variant', 'outline');
await waitForRender();
expect(button.getAttribute('variant')).toBe('outline');
```

### waitForFrames()

Wait for multiple animation frames.

```typescript
await waitForFrames(2);
```

### waitForAttribute()

Wait for element to have specific attribute value.

```typescript
// Wait for disabled to be removed
await waitForAttribute(button, 'disabled', null);

// Wait for variant to be 'outline'
await waitForAttribute(button, 'variant', 'outline', 2000);
```

### waitForEvent()

Wait for element to emit a specific event.

```typescript
const clickPromise = waitForEvent(button, 'click');
button.click();
const event = await clickPromise;
```

## User Interactions

### userEvent

Unified API for simulating user interactions (inspired by Testing Library's userEvent).

```typescript
import { userEvent } from '@vielzeug/craftit/testing';
```

**Click and Mouse Events:**

```typescript
// Click
await userEvent.click(button);
await userEvent.click(button, { ctrlKey: true });

// Double click
await userEvent.dblClick(button);

// Hover
await userEvent.hover(button);
await userEvent.unhover(button);
```

**Keyboard Interactions:**

```typescript
// Single key
await userEvent.keyboard(input, 'Enter');
await userEvent.keyboard(input, 'Tab', { shiftKey: true });

// Type text
await userEvent.type(input, 'Hello World');
```

**Form Interactions:**

```typescript
// Clear input
await userEvent.clear(input);

// Focus/Blur
await userEvent.focus(input);
await userEvent.blur(input);
```

**Available Methods:**

| Method | Description |
|--------|-------------|
| `click(element, options?)` | Simulate click event |
| `dblClick(element, options?)` | Simulate double click |
| `keyboard(element, key, options?)` | Simulate keydown event |
| `type(element, text, options?)` | Type text into input element |
| `clear(element)` | Clear input value |
| `hover(element)` | Simulate mouseenter |
| `unhover(element)` | Simulate mouseleave |
| `focus(element)` | Focus element |
| `blur(element)` | Blur element |

All methods are async and automatically wait for component re-render.


Simulate keyboard event.

```typescript
await keyboard(input, 'Enter');
await keyboard(input, ' ', { shiftKey: true });
```

## Attribute Utilities

### setAttributes()

Set multiple attributes on an element.

```typescript
setAttributes(button, {
  variant: 'outline',
  color: 'primary',
  disabled: true,
  loading: null, // Remove attribute
});
```

## Complete Example

```typescript
import { defineElement, html } from '@vielzeug/craftit';
import {
  createComponent,
  createFixture,
  createTestContainer,
  queryShadow,
} from '@vielzeug/craftit/testing';

describe('my-button', () => {
  let container: HTMLElement;
  let cleanup: () => void;

  beforeEach(() => {
    const testContainer = createTestContainer();
    container = testContainer.container;
    cleanup = testContainer.cleanup;
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('should render button element', async () => {
      const button = await createComponent('my-button', {}, container);
      const innerButton = queryShadow(button, 'button');
      
      expect(innerButton).toBeTruthy();
    });
  });

  describe('State Management', () => {
    it('should update on attribute change', async () => {
      const fixture = await createFixture('my-button');
      
      await fixture.setAttribute('variant', 'outline');
      expect(fixture.element.getAttribute('variant')).toBe('outline');
      
      fixture.destroy();
    });
  });

});
```

## Best Practices

### ✅ Do:
- Use `createFixture()` for component lifecycle tests
- Use `createComponent()` for simple rendering tests
- Always cleanup with `fixture.destroy()` or `cleanup()`
- Use type parameters: `fixture.query<HTMLButtonElement>('button')`
- Wait for renders after attribute changes with `await fixture.setAttribute()`

### ❌ Don't:
- Manually manage `document.body.appendChild/removeChild`
- Use `querySelector` on shadow roots directly
- Forget to cleanup fixtures in tests
- Test computed styles in jsdom (it doesn't support CSS)

## TypeScript Support

All utilities are fully typed:

```typescript
// Type-safe element queries
const button = queryShadow<HTMLButtonElement>(host, 'button');

// Generic fixture
const fixture = await createFixture<HTMLElement>('my-button');

// Typed query methods
const innerButton = fixture.query<HTMLButtonElement>('button');
```

## Integration with Vitest

These utilities work seamlessly with Vitest:

```typescript
import { vi } from 'vitest';

it('should call handler', async () => {
  const fixture = await createFixture('my-button');
  const handler = vi.fn();
  
  fixture.element.addEventListener('click', handler);
  await click(fixture.query('button')!);
  
  expect(handler).toHaveBeenCalled();
  fixture.destroy();
});
```

## API Reference

### Functions

| Function | Return Type | Description |
|----------|-------------|-------------|
| `createTestContainer()` | `{ container, cleanup }` | Create test container |
| `createComponent<T>(tagName, attrs?, container?)` | `Promise<T>` | Create and attach component |
| `createFixture<T>(tagName, attrs?)` | `Promise<ComponentFixture<T>>` | Create test fixture |
| `queryShadow<T>(host, selector)` | `T \| null` | Query shadow DOM |
| `queryShadowAll<T>(host, selector)` | `NodeListOf<T>` | Query all in shadow DOM |
| `waitForRender()` | `Promise<void>` | Wait for next frame |
| `waitForFrames(n)` | `Promise<void>` | Wait for n frames |
| `waitForAttribute(el, attr, value, timeout?)` | `Promise<void>` | Wait for attribute |
| `waitForEvent<T>(el, name, timeout?)` | `Promise<T>` | Wait for event |
| `click(el, options?)` | `Promise<void>` | Simulate click |
| `keyboard(el, key, options?)` | `Promise<void>` | Simulate keyboard |
| `setAttributes(el, attrs)` | `void` | Set multiple attributes |
| `hasShadowClass(host, selector, className)` | `boolean` | Check shadow class |
| `getShadowStyle(host, selector, property)` | `string` | Get shadow style |

### ComponentFixture<T>

| Property/Method | Type | Description |
|----------------|------|-------------|
| `element` | `T` | Component element |
| `update()` | `Promise<void>` | Wait for re-render |
| `query<E>(selector)` | `E \| null` | Query shadow DOM |
| `queryAll<E>(selector)` | `NodeListOf<E>` | Query all shadow |
| `setAttribute(name, value)` | `Promise<void>` | Set and update |
| `setAttributes(attrs)` | `Promise<void>` | Set multiple and update |
| `destroy()` | `void` | Cleanup |

## License

MIT





