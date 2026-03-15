---
title: Craftit — Examples
description: Real-world component recipes for Craftit.
---

# Craftit Examples

::: tip
These are copy-paste ready recipes. See [Usage Guide](./usage.md) for detailed explanations.
:::

[[toc]]

::: tip 💡 Complete Applications
These are complete, production-ready examples. For API reference, see [API Documentation](./api.md). For basic usage patterns, see [Usage Guide](./usage.md).
:::

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
            <li class=${() => html.classes({ done: todo.done })}>
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

### Custom Form Input

Basic custom input with form integration using ElementInternals.

```ts
import { define, signal, html, css, defineField } from '@vielzeug/craftit';

define(
  'custom-input',
  () => {
    const value = signal('');
    const placeholder = prop('placeholder', '');

    // Register as form field
    const formField = defineField({ value });

    const styles = css`
      input {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 1rem;
      }

      input:focus {
        outline: none;
        border-color: #0070f3;
        box-shadow: 0 0 0 2px rgba(0, 112, 243, 0.1);
      }
    `;

    return {
      template: html`
        <input
          type="text"
          :value=${value}
          :placeholder=${placeholder}
          @input=${(e) => (value.value = e.target.value)} />
      `,
      styles: [styles.content],
    };
  },
  { formAssociated: true },
);
```

Usage in a form:

```html
<form>
  <custom-input name="username" placeholder="Enter username"></custom-input>
  <button type="submit">Submit</button>
</form>
```

### Validated Email Input

Email input with built-in validation using ElementInternals.

```ts
import { define, signal, computed, watch, html, css, defineField } from '@vielzeug/craftit';

define(
  'email-input',
  () => {
    const value = signal('');
    const required = prop('required', false, {
      parse: (v) => v !== null,
    });

    const formField = defineField({ value });

    const emailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.value));

    // Update validation state
    watch(
      [value, required],
      () => {
        if (required.value && !value.value) {
          formField.setValidity({ valueMissing: true }, 'Email is required');
        } else if (value.value && !emailValid.value) {
          formField.setValidity({ typeMismatch: true }, 'Please enter a valid email address');
        } else {
          formField.setValidity({}, '');
        }
      },
      { immediate: true },
    );

    const styles = css`
      .input-wrapper {
        position: relative;
      }

      input {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #ccc;
        border-radius: 4px;
      }

      input:invalid {
        border-color: #ef4444;
      }

      input:valid:not(:placeholder-shown) {
        border-color: #10b981;
      }

      .error {
        color: #ef4444;
        font-size: 0.875rem;
        margin-top: 0.25rem;
      }
    `;

    return {
      template: html`
        <div class="input-wrapper">
          <input
            type="email"
            :value=${value}
            @input=${(e) => (value.value = e.target.value)}
            placeholder="email@example.com" />
          ${html.when(() => value.value && !emailValid.value, () => html` <div class="error">Please enter a valid email</div> `)}
        </div>
      `,
      styles: [styles.content],
    };
  },
  { formAssociated: true },
);
```

### Rating Component

Star rating component with form integration.

```ts
import { define, signal, watch, html, css, defineField, prop } from '@vielzeug/craftit';

define(
  'star-rating',
  () => {
    const rating = signal(0);
    const maxRating = prop('max', 5, {
      parse: (v) => Number(v) || 5,
    });
    const required = prop('required', false, {
      parse: (v) => v !== null,
    });

    const formField = defineField({
      value: rating,
      toFormValue: (v) => String(v),
    });

    // Validation
    watch(
      [rating, required],
      () => {
        if (required.value && rating.value === 0) {
          formField.setValidity({ valueMissing: true }, 'Please select a rating');
        } else {
          formField.setValidity({}, '');
        }
      },
      { immediate: true },
    );

    const styles = css`
      .rating {
        display: flex;
        gap: 0.25rem;
      }

      button {
        background: none;
        border: none;
        font-size: 2rem;
        cursor: pointer;
        color: #d1d5db;
        padding: 0;
        transition: color 0.2s;
      }

      button.active,
      button:hover {
        color: #fbbf24;
      }

      button:focus {
        outline: 2px solid #0070f3;
        outline-offset: 2px;
      }
    `;

    return {
      template: html`
        <div class="rating" role="radiogroup" aria-label="Rating">
          ${Array.from({ length: maxRating.value }, (_, i) => i + 1).map(
            (star) => html`
              <button
                type="button"
                class=${() => html.classes({ active: rating.value >= star })}
                @click=${() => (rating.value = star)}
                aria-label="${star} star${star > 1 ? 's' : ''}"
                role="radio"
                aria-checked=${rating.value === star}>
                ★
              </button>
            `,
          )}
        </div>
      `,
      styles: [styles.content],
    };
  },
  { formAssociated: true },
);
```

Usage:

```html
<form>
  <label>Rate this product:</label>
  <star-rating name="rating" max="5" required></star-rating>
  <button type="submit">Submit Review</button>
</form>
```

### Multi-Select Component

Custom multi-select with form integration.

```ts
import { define, signal, html, css, defineField } from '@vielzeug/craftit';

type Option = { value: string; label: string };

define(
  'multi-select',
  () => {
    const options: Option[] = [
      { value: 'js', label: 'JavaScript' },
      { value: 'ts', label: 'TypeScript' },
      { value: 'py', label: 'Python' },
      { value: 'rs', label: 'Rust' },
    ];

    const selected = signal<string[]>([]);

    const formField = defineField({
      value: selected,
      toFormValue: (values) => {
        // Send as comma-separated string or FormData
        return values.join(',');
      },
    });

    const toggleOption = (value: string) => {
      selected.update((current) => {
        if (current.includes(value)) {
          return current.filter((v) => v !== value);
        }
        return [...current, value];
      });
    };

    const styles = css`
      .options {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 0.5rem;
        border: 1px solid #ccc;
        border-radius: 4px;
      }

      label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 4px;
        transition: background 0.2s;
      }

      label:hover {
        background: #f3f4f6;
      }

      input[type='checkbox'] {
        width: 1.25rem;
        height: 1.25rem;
        cursor: pointer;
      }
    `;

    return {
      template: html`
        <div class="options">
          ${options.map(
            (option) => html`
              <label>
                <input
                  type="checkbox"
                  ?checked=${() => selected.value.includes(option.value)}
                  @change=${() => toggleOption(option.value)} />
                <span>${option.label}</span>
              </label>
            `,
          )}
        </div>
        <div style="margin-top: 0.5rem; color: #666; font-size: 0.875rem">
          Selected: ${selected.value.length} item${selected.value.length !== 1 ? 's' : ''}
        </div>
      `,
      styles: [styles.content],
    };
  },
  { formAssociated: true },
);
```

### File Upload Component

Custom file uploader with preview and form integration.

```ts
import { define, signal, html, css, defineField } from '@vielzeug/craftit';

define(
  'file-upload',
  () => {
    const files = signal<FileList | null>(null);
    const multiple = prop('multiple', false, {
      parse: (v) => v !== null,
    });

    const formField = defineField({
      value: files,
      toFormValue: (fileList) => {
        if (!fileList || fileList.length === 0) return null;

        if (fileList.length === 1) {
          return fileList[0];
        }

        // Multiple files - return FormData
        const formData = new FormData();
        for (let i = 0; i < fileList.length; i++) {
          formData.append('files[]', fileList[i]);
        }
        return formData;
      },
    });

    const handleChange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      files.value = target.files;
    };

    const removeFile = (index: number) => {
      if (!files.value) return;

      const dt = new DataTransfer();
      for (let i = 0; i < files.value.length; i++) {
        if (i !== index) {
          dt.items.add(files.value[i]);
        }
      }
      files.value = dt.files.length > 0 ? dt.files : null;
    };

    const styles = css`
      .upload-area {
        border: 2px dashed #ccc;
        border-radius: 8px;
        padding: 2rem;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
      }

      .upload-area:hover {
        border-color: #0070f3;
        background: #f0f9ff;
      }

      .file-list {
        margin-top: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .file-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem;
        background: #f3f4f6;
        border-radius: 4px;
      }

      .remove-btn {
        background: #ef4444;
        color: white;
        border: none;
        padding: 0.25rem 0.75rem;
        border-radius: 4px;
        cursor: pointer;
      }
    `;

    return {
      template: html`
        <div>
          <div
            class="upload-area"
            @click=${() => {
              const input = document.querySelector('input[type="file"]') as HTMLInputElement;
              input?.click();
            }}>
            <input type="file" ?multiple=${multiple} @change=${handleChange} style="display: none" />
            <p>Click to upload or drag and drop</p>
            <p style="font-size: 0.875rem; color: #666">
              ${multiple.value ? 'Multiple files allowed' : 'Single file only'}
            </p>
          </div>

          ${html.when(
            files && files.value,
            () => html`
              <div class="file-list">
                ${Array.from(files.value!).map(
                  (file, i) => html`
                    <div class="file-item">
                      <span>${file.name} (${(file.size / 1024).toFixed(2)} KB)</span>
                      <button type="button" class="remove-btn" @click=${() => removeFile(i)}>Remove</button>
                    </div>
                  `,
                )}
              </div>
            `,
          )}
        </div>
      `,
      styles: [styles.content],
    };
  },
  { formAssociated: true },
);
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
            class=${() =>
              html.classes({
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
define(
  'modal-dialog',
  () => {
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

    return html`
      ${html.when(
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
      )}
    `;
  },
  { styles: [styles.content], target: 'body' },
);
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
          class=${() => html.classes({ tab: true, active: activeTab.value === 0 })}
          @click=${() => (activeTab.value = 0)}>
          Tab 1
        </button>
        <button
          class=${() => html.classes({ tab: true, active: activeTab.value === 1 })}
          @click=${() => (activeTab.value = 1)}>
          Tab 2
        </button>
        <button
          class=${() => html.classes({ tab: true, active: activeTab.value === 2 })}
          @click=${() => (activeTab.value = 2)}>
          Tab 3
        </button>
      </div>
      <div class="tab-panels">
        <div class=${() => html.classes({ 'tab-panel': true, active: activeTab.value === 0 })}>
          <slot name="tab-1">Panel 1 content</slot>
        </div>
        <div class=${() => html.classes({ 'tab-panel': true, active: activeTab.value === 1 })}>
          <slot name="tab-2">Panel 2 content</slot>
        </div>
        <div class=${() => html.classes({ 'tab-panel': true, active: activeTab.value === 2 })}>
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
import { mount, fire } from '@vielzeug/craftit/test';
import { describe, it, expect } from 'vitest';
import './simple-counter';

describe('simple-counter', () => {
  it('increments count when + button clicked', async () => {
    const { query, queryAll, act } = await mount('simple-counter');
    const buttons = queryAll('button');
    const incrementBtn = buttons[2]; // Third button is increment
    const h2 = query('h2');
    expect(h2?.textContent).toBe('Count: 0');
    await act(() => fire.click(incrementBtn));
    expect(h2?.textContent).toBe('Count: 1');
  });
  it('resets count when reset button clicked', async () => {
    const { query, queryAll, act } = await mount('simple-counter');
    const buttons = queryAll('button');
    const incrementBtn = buttons[2];
    const resetBtn = buttons[1];
    const h2 = query('h2');
    // Increment a few times
    await act(() => {
      fire.click(incrementBtn);
      fire.click(incrementBtn);
    });
    expect(h2?.textContent).toBe('Count: 2');
    // Reset
    await act(() => fire.click(resetBtn));
    expect(h2?.textContent).toBe('Count: 0');
  });
});
```

## Next Steps

- See [Usage Guide](./usage.md) for more patterns
- Read [API Reference](./api.md) for complete documentation
- Visit [GitHub](https://github.com/saatkhel/vielzeug) for source code
