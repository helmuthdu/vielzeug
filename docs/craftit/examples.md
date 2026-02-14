# Craftit Examples

Real-world examples demonstrating common use cases and patterns with Craftit.
::: tip 💡 Complete Applications
These are complete, production-ready examples. For API reference, see [API Documentation](./api.md). For basic usage patterns, see [Usage Guide](./usage.md).
:::

## Table of Contents

[[toc]]

## Basic Examples

### Counter Component

Simple interactive counter with increment/decrement buttons.

```ts
import { defineElement, html, css } from '@vielzeug/craftit';
defineElement('simple-counter', {
  state: { count: 0 },
  template: (el) => html`
    <div class="counter">
      <h2>Count: ${el.state.count}</h2>
      <button class="decrement">-</button>
      <button class="reset">Reset</button>
      <button class="increment">+</button>
    </div>
  `,
  styles: [
    css`
      .counter {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        padding: 2rem;
      }
      button {
        padding: 0.5rem 1.5rem;
        font-size: 1rem;
        cursor: pointer;
      }
    `,
  ],
  onConnected(el) {
    el.on('.increment', 'click', () => el.state.count++);
    el.on('.decrement', 'click', () => el.state.count--);
    el.on('.reset', 'click', () => (el.state.count = 0));
  },
});
```

### Todo List

Dynamic list with add/remove functionality.

```ts
defineElement('todo-list', {
  state: {
    todos: ['Learn Craftit', 'Build components'],
    input: '',
  },
  template: (el) => html`
    <div class="todo-app">
      <h2>My Todos</h2>
      <div class="add-todo">
        <input type="text" placeholder="New todo..." value="${el.state.input}" />
        <button class="add">Add</button>
      </div>
      <ul class="todo-list">
        ${el.state.todos
          .map(
            (todo, i) => `
          <li>
            <span>${todo}</span>
            <button class="delete" data-index="${i}">×</button>
          </li>
        `,
          )
          .join('')}
      </ul>
    </div>
  `,
  onConnected(el) {
    el.on('input', 'input', (e) => {
      el.state.input = (e.currentTarget as HTMLInputElement).value;
    });
    el.on('.add', 'click', () => {
      if (el.state.input.trim()) {
        el.state.todos.push(el.state.input);
        el.state.input = '';
      }
    });
    el.on('.delete', 'click', (e) => {
      const index = +(e.currentTarget as HTMLElement).dataset.index!;
      el.state.todos.splice(index, 1);
    });
  },
});
```

## Form Examples

### Custom Input Component

Form-associated custom input with validation.

```ts
defineElement('custom-input', {
  state: {
    value: '',
    error: '',
  },
  template: (el) => html`
    <div class="input-wrapper">
      <label>
        <span class="label">${el.label || 'Input'}</span>
        <input type="text" value="${el.state.value}" placeholder="${el.placeholder || ''}" />
      </label>
      ${el.state.error ? `<span class="error">${el.state.error}</span>` : ''}
    </div>
  `,
  formAssociated: true,
  observedAttributes: ['label', 'placeholder', 'required'] as const,
  onConnected(el) {
    el.on('input', 'input', (e) => {
      const value = (e.currentTarget as HTMLInputElement).value;
      el.state.value = value;
      // Validation
      if (el.required && !value) {
        el.state.error = 'This field is required';
        el.form?.valid({ valueMissing: true }, 'Required');
      } else {
        el.state.error = '';
        el.form?.valid();
      }
      el.form?.value(value);
    });
  },
});
// Usage
// <form>
//   <custom-input name="username" label="Username" required></custom-input>
//   <button type="submit">Submit</button>
// </form>
```

### Complete Form

Full form example with multiple fields and validation.

```ts
defineElement('registration-form', {
  state: {
    email: '',
    password: '',
    confirmPassword: '',
    errors: {} as Record<string, string>,
  },
  template: (el) => html`
    <form>
      <h2>Register</h2>
      <div class="field">
        <input type="email" placeholder="Email" value="${el.state.email}" name="email" />
        ${el.state.errors.email ? `<span class="error">${el.state.errors.email}</span>` : ''}
      </div>
      <div class="field">
        <input type="password" placeholder="Password" value="${el.state.password}" name="password" />
        ${el.state.errors.password ? `<span class="error">${el.state.errors.password}</span>` : ''}
      </div>
      <div class="field">
        <input
          type="password"
          placeholder="Confirm Password"
          value="${el.state.confirmPassword}"
          name="confirmPassword" />
        ${el.state.errors.confirmPassword ? `<span class="error">${el.state.errors.confirmPassword}</span>` : ''}
      </div>
      <button type="submit">Register</button>
    </form>
  `,
  onConnected(el) {
    el.on('input', 'input', (e) => {
      const input = e.currentTarget as HTMLInputElement;
      const name = input.name;
      const value = input.value;
      el.state[name] = value;
      el.validate();
    });
    el.on('form', 'submit', async (e) => {
      e.preventDefault();
      if (el.validate()) {
        await el.submitForm();
      }
    });
  },
  // Methods via set
  async onUpdated(el) {
    // Add helper methods
    (el as any).validate = () => {
      const errors: Record<string, string> = {};
      if (!el.state.email.includes('@')) {
        errors.email = 'Invalid email';
      }
      if (el.state.password.length < 8) {
        errors.password = 'Password must be at least 8 characters';
      }
      if (el.state.password !== el.state.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
      el.state.errors = errors;
      return Object.keys(errors).length === 0;
    };
    (el as any).submitForm = async () => {
      try {
        const response = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: el.state.email,
            password: el.state.password,
          }),
        });
        if (response.ok) {
          el.emit('registration-success');
        }
      } catch (error) {
        el.state.errors = { form: 'Registration failed' };
      }
    };
  },
});
```

## Advanced Examples

### Data Table with Sorting

```ts
type User = {
  id: number;
  name: string;
  email: string;
  role: string;
};
defineElement('data-table', {
  state: {
    users: [
      { id: 1, name: 'Alice', email: 'alice@example.com', role: 'Admin' },
      { id: 2, name: 'Bob', email: 'bob@example.com', role: 'User' },
      { id: 3, name: 'Charlie', email: 'charlie@example.com', role: 'User' },
    ] as User[],
    sortBy: 'name' as keyof User,
    sortOrder: 'asc' as 'asc' | 'desc',
  },
  template: (el) => {
    const sorted = [...el.state.users].sort((a, b) => {
      const aVal = a[el.state.sortBy];
      const bVal = b[el.state.sortBy];
      const mult = el.state.sortOrder === 'asc' ? 1 : -1;
      return aVal > bVal ? mult : aVal < bVal ? -mult : 0;
    });
    return html`
      <table>
        <thead>
          <tr>
            <th data-col="name">
              Name ${el.state.sortBy === 'name' ? (el.state.sortOrder === 'asc' ? '↑' : '↓') : ''}
            </th>
            <th data-col="email">
              Email ${el.state.sortBy === 'email' ? (el.state.sortOrder === 'asc' ? '↑' : '↓') : ''}
            </th>
            <th data-col="role">
              Role ${el.state.sortBy === 'role' ? (el.state.sortOrder === 'asc' ? '↑' : '↓') : ''}
            </th>
          </tr>
        </thead>
        <tbody>
          ${sorted
            .map(
              (user) => `
            <tr>
              <td>${user.name}</td>
              <td>${user.email}</td>
              <td>${user.role}</td>
            </tr>
          `,
            )
            .join('')}
        </tbody>
      </table>
    `;
  },
  onConnected(el) {
    el.on('th', 'click', (e) => {
      const col = (e.currentTarget as HTMLElement).dataset.col as keyof User;
      if (el.state.sortBy === col) {
        el.state.sortOrder = el.state.sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        el.state.sortBy = col;
        el.state.sortOrder = 'asc';
      }
    });
  },
});
```

### Async Data Loading

```ts
defineElement('user-profile', {
  state: {
    userId: 1,
    user: null as any,
    loading: false,
    error: null as string | null,
  },
  template: (el) => html`
    <div class="profile">
      ${el.state.loading
        ? `
        <div class="loading">Loading...</div>
      `
        : el.state.error
          ? `
        <div class="error">${el.state.error}</div>
      `
          : el.state.user
            ? `
        <div class="user-info">
          <h2>${el.state.user.name}</h2>
          <p>${el.state.user.email}</p>
          <p>Role: ${el.state.user.role}</p>
        </div>
      `
            : ''}
    </div>
  `,
  observedAttributes: ['user-id'] as const,
  async onConnected(el) {
    await (el as any).loadUser();
  },
  onAttributeChanged(name, oldVal, newVal, el) {
    if (name === 'user-id' && oldVal !== newVal) {
      el.state.userId = Number(newVal);
      (el as any).loadUser();
    }
  },
  async onUpdated(el) {
    (el as any).loadUser = async () => {
      await el.set(async (state) => {
        try {
          const response = await fetch(`/api/users/${state.userId}`);
          const user = await response.json();
          return { ...state, user, loading: false, error: null };
        } catch (error) {
          return {
            ...state,
            user: null,
            loading: false,
            error: 'Failed to load user',
          };
        }
      });
    };
  },
});
```

### Modal Dialog

```ts
defineElement('modal-dialog', {
  state: {
    isOpen: false,
    title: '',
    content: '',
  },
  template: (el) => html`
    ${el.state.isOpen
      ? `
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-header">
            <h2>${el.state.title}</h2>
            <button class="close">×</button>
          </div>
          <div class="modal-body">
            ${el.state.content}
          </div>
          <div class="modal-footer">
            <button class="cancel">Cancel</button>
            <button class="confirm">Confirm</button>
          </div>
        </div>
      </div>
    `
      : ''}
  `,
  styles: [
    css`
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }
      .modal {
        background: white;
        border-radius: 8px;
        min-width: 400px;
        max-width: 90vw;
        max-height: 90vh;
        overflow: auto;
      }
      .modal-header {
        display: flex;
        justify-content: space-between;
        padding: 1rem;
        border-bottom: 1px solid #eee;
      }
      .modal-body {
        padding: 1rem;
      }
      .modal-footer {
        display: flex;
        gap: 0.5rem;
        justify-content: flex-end;
        padding: 1rem;
        border-top: 1px solid #eee;
      }
    `,
  ],
  onConnected(el) {
    el.on('.close', 'click', () => {
      el.state.isOpen = false;
      el.emit('close');
    });
    el.on('.cancel', 'click', () => {
      el.state.isOpen = false;
      el.emit('cancel');
    });
    el.on('.confirm', 'click', () => {
      el.emit('confirm');
      el.state.isOpen = false;
    });
    el.on('.modal-overlay', 'click', (e) => {
      if (e.target === e.currentTarget) {
        el.state.isOpen = false;
        el.emit('close');
      }
    });
  },
});
// Usage
const modal = document.querySelector('modal-dialog');
modal.state.title = 'Confirm Action';
modal.state.content = 'Are you sure you want to continue?';
modal.state.isOpen = true;
modal.addEventListener('confirm', () => {
  console.log('User confirmed!');
});
```

## Framework Integration

Craftit web components work seamlessly with all major frameworks. Here's how to integrate the same counter component across different frameworks:

::: code-group

```tsx [React]
import { defineElement, html } from '@vielzeug/craftit';
import { useEffect, useRef, useState } from 'react';

// Define the web component
defineElement('counter-component', {
  state: { count: 0 },
  template: (el) => html`
    <div>
      <p>Count: ${el.state.count}</p>
      <button class="increment">+</button>
    </div>
  `,
  onConnected(el) {
    el.on('.increment', 'click', () => el.state.count++);
  },
});

// Use in React
function CounterWrapper() {
  const ref = useRef<any>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const unwatch = el.watch(
      (state: any) => state.count,
      (count: number) => setCount(count),
    );

    return unwatch;
  }, []);

  return (
    <div>
      <counter-component ref={ref} />
      <p>React sees count: {count}</p>
    </div>
  );
}
```

```vue [Vue]
<script setup lang="ts">
import { defineElement, html } from '@vielzeug/craftit';
import { ref, onMounted } from 'vue';

defineElement('counter-component', {
  state: { count: 0 },
  template: (el) => html`
    <div>
      <p>Count: ${el.state.count}</p>
      <button class="increment">+</button>
    </div>
  `,
  onConnected(el) {
    el.on('.increment', 'click', () => el.state.count++);
  },
});

const counter = ref<any>(null);
const count = ref(0);

onMounted(() => {
  counter.value?.watch(
    (state: any) => state.count,
    (val: number) => (count.value = val),
  );
});
</script>

<template>
  <div>
    <counter-component ref="counter" />
    <p>Vue sees count: {{ count }}</p>
  </div>
</template>
```

```svelte [Svelte]
<script lang="ts">
  import { defineElement, html } from '@vielzeug/craftit';
  import { onMount } from 'svelte';

  defineElement('counter-component', {
    state: { count: 0 },
    template: (el) => html`
      <div>
        <p>Count: ${el.state.count}</p>
        <button class="increment">+</button>
      </div>
    `,
    onConnected(el) {
      el.on('.increment', 'click', () => el.state.count++);
    }
  });

  let counter: any;
  let count = 0;

  onMount(() => {
    counter?.watch(
      (state: any) => state.count,
      (val: number) => count = val
    );
  });
</script>

<counter-component bind:this={counter} />
<p>Svelte sees count: {count}</p>
```

```ts [Vanilla JS]
import { defineElement, html } from '@vielzeug/craftit';

defineElement('counter-component', {
  state: { count: 0 },
  template: (el) => html`
    <div>
      <p>Count: ${el.state.count}</p>
      <button class="increment">+</button>
    </div>
  `,
  onConnected(el) {
    el.on('.increment', 'click', () => el.state.count++);
  },
});

// Use directly in HTML
const counter = document.createElement('counter-component');
document.body.appendChild(counter);

// Watch state changes
let count = 0;
counter.watch(
  (state) => state.count,
  (val) => {
    count = val;
    console.log('Count:', count);
  },
);
```

:::

## Testing Examples

### Unit Testing

```ts
import { defineElement, html, attach, destroy } from '@vielzeug/craftit';
describe('Counter Component', () => {
  it('increments count when button clicked', async () => {
    defineElement('test-counter', {
      state: { count: 0 },
      template: (el) => html`
        <div class="count">${el.state.count}</div>
        <button class="increment">+</button>
      `,
      onConnected(el) {
        el.on('.increment', 'click', () => el.state.count++);
      },
    });
    const el = document.createElement('test-counter');
    await attach(el);
    expect(el.find('.count')?.textContent).toBe('0');
    el.find<HTMLButtonElement>('.increment')?.click();
    await el.flush();
    expect(el.find('.count')?.textContent).toBe('1');
    destroy(el);
  });
  it('handles state updates', async () => {
    const el = document.createElement('test-counter');
    await attach(el);
    await el.set({ count: 10 });
    expect(el.find('.count')?.textContent).toBe('10');
    destroy(el);
  });
});
```
