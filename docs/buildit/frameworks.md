# Framework Integration

Buildit is built on native Web Components standards, ensuring seamless compatibility with all modern frontend frameworks.

## React

React works great with Web Components, though it sometimes requires manual handling of complex properties or custom events.

### Basic Usage

```tsx
import '@vielzeug/buildit/button';

function App() {
  return (
    <bit-button variant="solid" color="primary" onClick={() => console.log('Clicked!')}>
      React Button
    </bit-button>
  );
}
```

### TypeScript Support

For better type safety in TSX, you can define the custom elements in a global namespace:

```typescript
// custom-elements.d.ts
declare namespace JSX {
  interface IntrinsicElements {
    'bit-button': any; // Or use specific Buildit types
  }
}
```

## Vue

Vue has top-tier support for Web Components.

```vue
<template>
  <bit-button :variant="variant" :color="color" @click="handleClick"> Vue Button </bit-button>
</template>

<script setup>
import { ref } from 'vue';
import '@vielzeug/buildit/button';

const variant = ref('solid');
const color = ref('primary');

const handleClick = () => alert('Hello from Vue!');
</script>
```

## Svelte

Svelte handles Web Components natively without any extra configuration.

```svelte
<script>
  import '@vielzeug/buildit/button';
  let count = 0;
</script>

<bit-button on:click={() => count++}>
  Clicked {count} times
</bit-button>
```

## Angular

Add `CUSTOM_ELEMENTS_SCHEMA` to your `@NgModule` to allow custom elements in templates.

```typescript
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@NgModule({
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppModule {}
```

Then use them in your templates:

```html
<bit-button [attr.variant]="'solid'" (click)="onClick()"> Angular Button </bit-button>
```
