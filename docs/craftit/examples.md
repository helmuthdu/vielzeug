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
import { define, signal, html, css } from '@vielzeug/craftit';
define('simple-counter', () => {
  const count = signal(0);
  const styles = css`
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
      border: 1px solid #ccc;
      border-radius: 4px;
      background: white;
    }
    button:hover {
      background: #f0f0f0;
    }
    h2 {
      margin: 0;
      font-size: 2rem;
    }
  `;
  return {
    template: html`
      <div class="counter">
        <h2>Count: ${count}</h2>
        <div>
          <button @click=${() => count.value--}>-</button>
          <button @click=${() => (count.value = 0)}>Reset</button>
          <button @click=${() => count.value++}>+</button>
        </div>
      </div>
    `,
    styles: [styles.content],
  };
});
```

### Todo List

Dynamic list with add/remove functionality using signals and html.each.

```ts
import { define, signal, html } from '@vielzeug/craftit';
define('todo-list', () => {
  const todos = signal<Array<{ id: number; text: string; done: boolean }>>([
    { id: 1, text: 'Learn Craftit', done: false },
    { id: 2, text: 'Build components', done: false },
  ]);
  const input = signal('');
  let nextId = 3;
  const addTodo = () => {
    if (input.value.trim()) {
      todos.value = [...todos.value, { id: nextId++, text: input.value, done: false }];
      input.value = '';
    }
  };
  const toggleTodo = (id: number) => {
    todos.update((list) => list.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo)));
  };
  const removeTodo = (id: number) => {
    todos.update((list) => list.filter((todo) => todo.id !== id));
  };
  return html`
    <div class="todo-app">
      <h2>My Todos</h2>
      <div class="add-todo">
        <input
          type="text"
          :value=${input}
          @input=${(e) => (input.value = e.target.value)}
          @keydown.enter=${addTodo}
          placeholder="New todo..." />
        <button @click=${addTodo}>Add</button>
      </div>
      <ul class="todo-list">
        ${html.each(
          todos,
          (todo) => todo.id,
          (todo) => html`
            <li class=${html.classes({ done: todo.done })}>
              <input type="checkbox" ?checked=${todo.done} @change=${() => toggleTodo(todo.id)} />
              <span>${todo.text}</span>
              <button @click=${() => removeTodo(todo.id)}>×</button>
            </li>
          `,
        )}
      </ul>
    </div>
  `;
});
```

## Form Examples

### Login Form

Form with validation and state management.

```ts
import { define, signal, computed, html } from '@vielzeug/craftit';
define('login-form', () => {
  const email = signal('');
  const password = signal('');
  const isSubmitting = signal(false);
  const error = signal('');
  const emailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value));
  const formValid = computed(() => emailValid.value && password.value.length >= 6);
  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!formValid.value) return;
    isSubmitting.value = true;
    error.value = '';
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log('Login successful!', {
        email: email.value,
        password: password.value,
      });
    } catch (err) {
      error.value = 'Login failed. Please try again.';
    } finally {
      isSubmitting.value = false;
    }
  };
  return html`
    <form @submit=${handleSubmit} class="login-form">
      <h2>Login</h2>
      ${html.when(error, () => html` <div class="error">${error}</div> `)}
      <div class="form-group">
        <label>Email</label>
        <input
          type="email"
          :value=${email}
          @input=${(e) => (email.value = e.target.value)}
          ?disabled=${isSubmitting}
          required />
        ${html.when(!emailValid && email.value, () => html` <span class="field-error">Invalid email address</span> `)}
      </div>
      <div class="form-group">
        <label>Password</label>
        <input
          type="password"
          :value=${password}
          @input=${(e) => (password.value = e.target.value)}
          ?disabled=${isSubmitting}
          minlength="6"
          required />
        ${html.when(
          password.value && password.value.length < 6,
          () => html` <span class="field-error">Password must be at least 6 characters</span> `,
        )}
      </div>
      <button type="submit" ?disabled=${!formValid || isSubmitting}>
        ${isSubmitting.value ? 'Logging in...' : 'Login'}
      </button>
    </form>
  `;
});
```

### Dynamic Form

Form with conditional fields based on user selection.

```ts
import { define, signal, html } from '@vielzeug/craftit';
define('dynamic-form', () => {
  const userType = signal<'personal' | 'business'>('personal');
  const name = signal('');
  const companyName = signal('');
  const taxId = signal('');
  return html`
    <form class="dynamic-form">
      <h2>Registration</h2>
      <div class="form-group">
        <label>Account Type</label>
        <select :value=${userType} @change=${(e) => (userType.value = e.target.value)}>
          <option value="personal">Personal</option>
          <option value="business">Business</option>
        </select>
      </div>
      <div class="form-group">
        <label>${userType.value === 'personal' ? 'Your Name' : 'Contact Name'}</label>
        <input type="text" :value=${name} @input=${(e) => (name.value = e.target.value)} />
      </div>
      ${html.when(
        userType.value === 'business',
        () => html`
          <div class="form-group">
            <label>Company Name</label>
            <input type="text" :value=${companyName} @input=${(e) => (companyName.value = e.target.value)} />
          </div>
          <div class="form-group">
            <label>Tax ID</label>
            <input type="text" :value=${taxId} @input=${(e) => (taxId.value = e.target.value)} />
          </div>
        `,
      )}
      <button type="submit">Register</button>
    </form>
  `;
});
```

## Data Display Examples

### User Card

Component with props and styled presentation.

```ts
import { define, prop, html, css } from '@vielzeug/craftit';
define('user-card', () => {
  const name = prop('name', 'Guest');
  const role = prop('role', 'User');
  const avatar = prop('avatar', '');
  const online = prop('online', false, {
    parse: (v) => v !== null,
    reflect: true,
  });
  const styles = css`
    .card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background: white;
    }
    .avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #ccc;
      position: relative;
    }
    .status {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid white;
    }
    .status.online {
      background: #4caf50;
    }
    .status.offline {
      background: #9e9e9e;
    }
    .info h3 {
      margin: 0;
      font-size: 1rem;
    }
    .info p {
      margin: 0.25rem 0 0;
      color: #666;
      font-size: 0.875rem;
    }
  `;
  return {
    template: html`
      <div class="card">
        <div class="avatar">
          ${html.when(avatar, () => html` <img src="${avatar.value}" alt="${name.value}" /> `)}
          <div
            class=${html.classes({
              status: true,
              online: online.value,
              offline: !online.value,
            })}></div>
        </div>
        <div class="info">
          <h3>${name}</h3>
          <p>${role}</p>
        </div>
      </div>
    `,
    styles: [styles.content],
  };
});
```

Usage:

```html
<user-card name="Alice Johnson" role="Senior Developer" avatar="/avatars/alice.jpg" online></user-card>
```

### Data Table

Sortable and filterable table component.

```ts
import { define, signal, computed, html } from '@vielzeug/craftit';
type User = {
  id: number;
  name: string;
  email: string;
  role: string;
};
define('data-table', () => {
  const users = signal<User[]>([
    { id: 1, name: 'Alice', email: 'alice@example.com', role: 'Admin' },
    { id: 2, name: 'Bob', email: 'bob@example.com', role: 'User' },
    { id: 3, name: 'Charlie', email: 'charlie@example.com', role: 'User' },
  ]);
  const sortBy = signal<keyof User>('name');
  const sortDir = signal<'asc' | 'desc'>('asc');
  const filter = signal('');
  const filteredAndSorted = computed(() => {
    let result = users.value;
    // Filter
    if (filter.value) {
      const f = filter.value.toLowerCase();
      result = result.filter(
        (user) =>
          user.name.toLowerCase().includes(f) ||
          user.email.toLowerCase().includes(f) ||
          user.role.toLowerCase().includes(f),
      );
    }
    // Sort
    result = [...result].sort((a, b) => {
      const aVal = a[sortBy.value];
      const bVal = b[sortBy.value];
      const mult = sortDir.value === 'asc' ? 1 : -1;
      return aVal < bVal ? -mult : aVal > bVal ? mult : 0;
    });
    return result;
  });
  const handleSort = (column: keyof User) => {
    if (sortBy.value === column) {
      sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy.value = column;
      sortDir.value = 'asc';
    }
  };
  return html`
    <div class="data-table">
      <input
        type="search"
        :value=${filter}
        @input=${(e) => (filter.value = e.target.value)}
        placeholder="Filter users..." />
      <table>
        <thead>
          <tr>
            <th @click=${() => handleSort('name')}>
              Name ${sortBy.value === 'name' ? (sortDir.value === 'asc' ? '↑' : '↓') : ''}
            </th>
            <th @click=${() => handleSort('email')}>
              Email ${sortBy.value === 'email' ? (sortDir.value === 'asc' ? '↑' : '↓') : ''}
            </th>
            <th @click=${() => handleSort('role')}>
              Role ${sortBy.value === 'role' ? (sortDir.value === 'asc' ? '↑' : '↓') : ''}
            </th>
          </tr>
        </thead>
        <tbody>
          ${html.each(
            filteredAndSorted,
            (user) => user.id,
            (user) => html`
              <tr>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
              </tr>
            `,
            () => html`
              <tr>
                <td colspan="3" style="text-align: center">No users found</td>
              </tr>
            `,
          )}
        </tbody>
      </table>
    </div>
  `;
});
```

## Advanced Examples

### Modal Component

Reusable modal with portal rendering.

```ts
import { define, signal, html, css } from '@vielzeug/craftit';
define('modal-dialog', () => {
  const isOpen = prop('open', false, {
    parse: (v) => v !== null,
    reflect: true,
  });
  const handleClose = () => {
    isOpen.value = false;
    // Dispatch custom event
    dispatchEvent(new CustomEvent('modal-close', { bubbles: true }));
  };
  const styles = css`
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
      padding: 2rem;
      max-width: 500px;
      width: 90%;
      max-height: 90vh;
      overflow: auto;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .close-button {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0;
      width: 2rem;
      height: 2rem;
    }
  `;
  return {
    template: html`
      ${html.portal(
        html.when(
          isOpen,
          () => html`
            <div class="modal-overlay" @click.self=${handleClose}>
              <div class="modal">
                <div class="modal-header">
                  <h2><slot name="title">Modal</slot></h2>
                  <button class="close-button" @click=${handleClose} aria-label="Close">×</button>
                </div>
                <div class="modal-content">
                  <slot></slot>
                </div>
              </div>
            </div>
          `,
        ),
        'body',
      )}
    `,
    styles: [styles.content],
  };
});
```

Usage:

```html
<modal-dialog id="myModal">
  <span slot="title">Confirm Action</span>
  <p>Are you sure you want to proceed?</p>
  <button>Confirm</button>
  <button>Cancel</button>
</modal-dialog>
<script>
  document.querySelector('#myModal').setAttribute('open', '');
</script>
```

### Tabs Component

Tab interface with slots and state management.

```ts
import { define, signal, html, css, onMount } from '@vielzeug/craftit';
define('tab-group', () => {
  const activeTab = signal(0);
  const styles = css`
    .tabs {
      border-bottom: 2px solid #e0e0e0;
      display: flex;
      gap: 0.5rem;
    }
    .tab {
      padding: 0.75rem 1.5rem;
      border: none;
      background: none;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      font-size: 1rem;
    }
    .tab.active {
      border-bottom-color: #0070f3;
      color: #0070f3;
    }
    .tab-panels {
      padding: 1rem 0;
    }
    .tab-panel {
      display: none;
    }
    .tab-panel.active {
      display: block;
    }
  `;
  onMount(() => {
    // Initialize from attribute if present
    const initial = parseInt(getAttribute('active') || '0');
    if (!isNaN(initial)) activeTab.value = initial;
  });
  return {
    template: html`
      <div class="tabs">
        <button
          class=${html.classes({ tab: true, active: activeTab.value === 0 })}
          @click=${() => (activeTab.value = 0)}>
          Tab 1
        </button>
        <button
          class=${html.classes({ tab: true, active: activeTab.value === 1 })}
          @click=${() => (activeTab.value = 1)}>
          Tab 2
        </button>
        <button
          class=${html.classes({ tab: true, active: activeTab.value === 2 })}
          @click=${() => (activeTab.value = 2)}>
          Tab 3
        </button>
      </div>
      <div class="tab-panels">
        <div class=${html.classes({ 'tab-panel': true, active: activeTab.value === 0 })}>
          <slot name="tab-1">Panel 1 content</slot>
        </div>
        <div class=${html.classes({ 'tab-panel': true, active: activeTab.value === 1 })}>
          <slot name="tab-2">Panel 2 content</slot>
        </div>
        <div class=${html.classes({ 'tab-panel': true, active: activeTab.value === 2 })}>
          <slot name="tab-3">Panel 3 content</slot>
        </div>
      </div>
    `,
    styles: [styles.content],
  };
});
```

### Theme Provider

Context-based theming system.

```ts
import { define, provide, inject, signal, html, css } from '@vielzeug/craftit';
import type { InjectionKey, Signal } from '@vielzeug/craftit';
// Define theme context
interface ThemeContext {
  mode: Signal<'light' | 'dark'>;
  primaryColor: Signal<string>;
}
const ThemeKey: InjectionKey<ThemeContext> = Symbol('theme');
// Theme provider component
define('theme-provider', () => {
  const mode = signal<'light' | 'dark'>('light');
  const primaryColor = signal('#0070f3');
  // Provide theme to children
  provide(ThemeKey, { mode, primaryColor });
  const toggleTheme = () => {
    mode.value = mode.value === 'light' ? 'dark' : 'light';
  };
  return html`
    <div class="theme-provider" data-theme=${mode}>
      <button @click=${toggleTheme}>Toggle to ${mode.value === 'light' ? 'dark' : 'light'} mode</button>
      <slot></slot>
    </div>
  `;
});
// Themed button component
define('themed-button', () => {
  const theme = inject(ThemeKey);
  if (!theme) {
    return html`<button>No theme</button>`;
  }
  const styles = css`
    button {
      background: ${theme.primaryColor.value};
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 4px;
      cursor: pointer;
    }
    [data-theme='dark'] button {
      background: ${theme.primaryColor.value};
      filter: brightness(1.2);
    }
  `;
  return {
    template: html`
      <button>
        <slot>Themed Button</slot>
      </button>
    `,
    styles: [styles.content],
  };
});
```

Usage:

```html
<theme-provider>
  <themed-button>Click Me</themed-button>
  <themed-button>Another Button</themed-button>
</theme-provider>
```

## Framework Integration

### With React

```tsx
import React from 'react';
import '@vielzeug/craftit'; // Import your components
import 'simple-counter'; // Or specific component
function App() {
  return (
    <div>
      <h1>Craftit in React</h1>
      <simple-counter />
    </div>
  );
}
```

### With Vue

```vue
<template>
  <div>
    <h1>Craftit in Vue</h1>
    <simple-counter />
  </div>
</template>
<script setup>
import '@vielzeug/craftit';
</script>
```

### With Svelte

```svelte
<script>
  import '@vielzeug/craftit';
</script>
<div>
  <h1>Craftit in Svelte</h1>
  <simple-counter />
</div>
```

## Testing Examples

### Testing a Counter

```ts
import { mount, fireEvent } from '@vielzeug/craftit/trial';
import { describe, it, expect } from 'vitest';
import './simple-counter';
describe('simple-counter', () => {
  it('increments count when + button clicked', async () => {
    const { query, queryAll, waitForUpdates } = await mount('simple-counter');
    const buttons = queryAll('button');
    const incrementBtn = buttons[2]; // Third button is increment
    const h2 = query('h2');
    expect(h2?.textContent).toBe('Count: 0');
    fireEvent.click(incrementBtn);
    await waitForUpdates();
    expect(h2?.textContent).toBe('Count: 1');
  });
  it('resets count when reset button clicked', async () => {
    const { query, queryAll, waitForUpdates } = await mount('simple-counter');
    const buttons = queryAll('button');
    const incrementBtn = buttons[2];
    const resetBtn = buttons[1];
    const h2 = query('h2');
    // Increment a few times
    fireEvent.click(incrementBtn);
    fireEvent.click(incrementBtn);
    await waitForUpdates();
    expect(h2?.textContent).toBe('Count: 2');
    // Reset
    fireEvent.click(resetBtn);
    await waitForUpdates();
    expect(h2?.textContent).toBe('Count: 0');
  });
});
```

## Next Steps

- See [Usage Guide](./usage.md) for more patterns
- Read [API Reference](./api.md) for complete documentation
- Visit [GitHub](https://github.com/saatkhel/vielzeug) for source code
