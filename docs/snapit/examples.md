# Snapit Examples

Real-world examples and framework integrations.

## Table of Contents

[[toc]]

## React

### Basic Integration with useSyncExternalStore

React 18+ provides `useSyncExternalStore` for external state:

```tsx
import { useSyncExternalStore } from 'react';
import { createSnapshot, type State } from '@vielzeug/snapit';

// Create reusable hooks
function useSnapitState<T extends object>(state: State<T>): T;
function useSnapitState<T extends object, U>(state: State<T>, selector: (state: T) => U): U;
function useSnapitState<T extends object, U>(state: State<T>, selector?: (state: T) => U) {
  return useSyncExternalStore(
    (callback) => {
      if (selector) {
        return state.subscribe(selector, callback);
      }
      return state.subscribe(callback);
    },
    () => (selector ? selector(state.get()) : state.get()),
  );
}

// Create global state
const counterState = createSnapshot({ count: 0 });
const userState = createSnapshot({ name: 'Alice', isLoggedIn: false });

// Use in components
function Counter() {
  // Subscribe to specific field
  const count = useSnapitState(counterState, (data) => data.count);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => counterState.set({ count: count + 1 })}>Increment</button>
      <button onClick={() => counterState.set({ count: count - 1 })}>Decrement</button>
      <button onClick={() => counterState.reset()}>Reset</button>
    </div>
  );
}

function User() {
  // Subscribe to full state
  const user = useSnapitState(userState);

  return (
    <div>
      <p>Name: {user.name}</p>
      <p>Status: {user.isLoggedIn ? 'Logged in' : 'Logged out'}</p>
      <button onClick={() => userState.set({ isLoggedIn: !user.isLoggedIn })}>Toggle Login</button>
    </div>
  );
}
```

### Todo App Example

```tsx
import { createSnapshot } from '@vielzeug/snapit';

type Todo = {
  id: number;
  text: string;
  completed: boolean;
};

type TodoState = {
  todos: Todo[];
  filter: 'all' | 'active' | 'completed';
};

const todoState = createSnapshot<TodoState>({
  todos: [],
  filter: 'all',
});

function TodoApp() {
  const todos = useSnapitState(todoState, (data) => data.todos);
  const filter = useSnapitState(todoState, (data) => data.filter);

  const filteredTodos = todos.filter((todo) => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  const addTodo = (text: string) => {
    todoState.set((data) => ({
      ...data,
      todos: [...data.todos, { id: Date.now(), text, completed: false }],
    }));
  };

  const toggleTodo = (id: number) => {
    todoState.set((data) => ({
      ...data,
      todos: data.todos.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)),
    }));
  };

  const deleteTodo = (id: number) => {
    todoState.set((data) => ({
      ...data,
      todos: data.todos.filter((todo) => todo.id !== id),
    }));
  };

  return (
    <div>
      <h1>Todos ({filteredTodos.length})</h1>

      <div>
        <button onClick={() => todoState.set({ filter: 'all' })}>All</button>
        <button onClick={() => todoState.set({ filter: 'active' })}>Active</button>
        <button onClick={() => todoState.set({ filter: 'completed' })}>Completed</button>
      </div>

      <ul>
        {filteredTodos.map((todo) => (
          <li key={todo.id}>
            <input type="checkbox" checked={todo.completed} onChange={() => toggleTodo(todo.id)} />
            <span
              style={{
                textDecoration: todo.completed ? 'line-through' : 'none',
              }}>
              {todo.text}
            </span>
            <button onClick={() => deleteTodo(todo.id)}>Delete</button>
          </li>
        ))}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const input = e.currentTarget.elements.namedItem('todo') as HTMLInputElement;
          addTodo(input.value);
          input.value = '';
        }}>
        <input name="todo" placeholder="Add todo..." />
        <button type="submit">Add</button>
      </form>
    </div>
  );
}
```

### Async Data Fetching

```tsx
import { useEffect } from 'react';

type DataState = {
  data: User[] | null;
  loading: boolean;
  error: string | null;
};

const dataState = createSnapshot<DataState>({
  data: null,
  loading: false,
  error: null,
});

async function fetchUsers() {
  dataState.set({ loading: true, error: null });

  try {
    await dataState.set(async (current) => {
      const response = await fetch('/api/users');
      const data = await response.json();
      return { ...current, data, loading: false };
    });
  } catch (error) {
    dataState.set({ error: error.message, loading: false });
  }
}

function UserList() {
  const { data, loading, error } = useSnapitState(dataState);

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return <div>No data</div>;

  return (
    <ul>
      {data.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

## Vue

### Composable Integration

```ts
import { computed, onUnmounted, ref } from 'vue';
import { createSnapshot, type State } from '@vielzeug/snapit';

// Create composable
function useSnapitState<T extends object>(state: State<T>) {
  const reactive = ref(state.get());

  const unsubscribe = state.subscribe((current) => {
    reactive.value = current;
  });

  onUnmounted(() => {
    unsubscribe();
  });

  return reactive;
}

function useSnapitSelector<T extends object, U>(state: State<T>, selector: (state: T) => U) {
  const selected = ref(selector(state.get()));

  const unsubscribe = state.subscribe(selector, (value) => {
    selected.value = value;
  });

  onUnmounted(() => {
    unsubscribe();
  });

  return selected;
}

// Create state
const counterState = createSnapshot({ count: 0 });

// Use in component
export default {
  setup() {
    const state = useSnapitState(counterState);
    const count = useSnapitSelector(counterState, (s) => s.count);

    const increment = () => {
      counterState.set({ count: count.value + 1 });
    };

    const decrement = () => {
      counterState.set({ count: count.value - 1 });
    };

    return { state, count, increment, decrement };
  },
};
```

### Composition API Example

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { createSnapshot } from '@vielzeug/snapit';

type User = {
  name: string;
  email: string;
  age: number;
};

const userState = createSnapshot<User>({
  name: 'Alice',
  email: 'alice@example.com',
  age: 30,
});

const state = useSnapitState(userState);
const name = useSnapitSelector(userState, (s) => s.name);

const isAdult = computed(() => state.value.age >= 18);

function updateName(newName: string) {
  userState.set({ name: newName });
}

function updateAge(newAge: number) {
  userState.set({ age: newAge });
}
</script>

<template>
  <div>
    <h2>User Profile</h2>
    <p>Name: {{ name }}</p>
    <p>Email: {{ state.email }}</p>
    <p>Age: {{ state.age }}</p>
    <p>Status: {{ isAdult ? 'Adult' : 'Minor' }}</p>

    <input :value="name" @input="updateName($event.target.value)" placeholder="Name" />
    <input type="number" :value="state.age" @input="updateAge(Number($event.target.value))" />
  </div>
</template>
```

## Svelte

### Store Adapter

```ts
import { readable } from 'svelte/store';
import { createSnapshot, type State } from '@vielzeug/snapit';

// Convert snapit state to Svelte store
function toSvelteStore<T extends object>(state: State<T>) {
  return readable(state.get(), (set) => {
    return state.subscribe((current) => {
      set(current);
    });
  });
}

// Create state
const counterState = createSnapshot({ count: 0 });

// Convert to Svelte store
const counter = toSvelteStore(counterState);

export { counter, counterState };
```

### Component Usage

```svelte
<script lang="ts">
  import { counter, counterState } from './stores';

  $: count = $counter.count;

  function increment() {
    counterState.set({ count: count + 1 });
  }

  function decrement() {
    counterState.set({ count: count - 1 });
  }

  function reset() {
    counterState.reset();
  }
</script>

<div>
  <h1>Counter: {count}</h1>
  <button on:click={increment}>+</button>
  <button on:click={decrement}>-</button>
  <button on:click={reset}>Reset</button>
</div>
```

### Todo List Example

```svelte
<script lang="ts">
  import { createSnapshot } from '@vielzeug/snapit';
  import { toSvelteStore } from './utils';

  type Todo = {
    id: number;
    text: string;
    completed: boolean;
  };

  const todoState = createSnapshot<{ todos: Todo[] }>({
    todos: [],
  });

  const todos = toSvelteStore(todoState);

  let newTodo = '';

  function addTodo() {
    if (!newTodo.trim()) return;

    todoState.set((data) => ({
      todos: [
        ...data.todos,
        { id: Date.now(), text: newTodo, completed: false },
      ],
    }));

    newTodo = '';
  }

  function toggleTodo(id: number) {
    todoState.set((data) => ({
      todos: data.todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      ),
    }));
  }

  function deleteTodo(id: number) {
    todoState.set((data) => ({
      todos: data.todos.filter((todo) => todo.id !== id),
    }));
  }
</script>

<div>
  <h1>Todos</h1>

  <form on:submit|preventDefault={addTodo}>
    <input bind:value={newTodo} placeholder="Add todo..." />
    <button type="submit">Add</button>
  </form>

  <ul>
    {#each $todos.todos as todo (todo.id)}
      <li>
        <input
          type="checkbox"
          checked={todo.completed}
          on:change={() => toggleTodo(todo.id)}
        />
        <span class:completed={todo.completed}>
          {todo.text}
        </span>
        <button on:click={() => deleteTodo(todo.id)}>Delete</button>
      </li>
    {/each}
  </ul>
</div>

<style>
  .completed {
    text-decoration: line-through;
    opacity: 0.6;
  }
</style>
```

## Vanilla JavaScript

### Basic Counter

```ts
import { createSnapshot } from '@vielzeug/snapit';

const counterState = createSnapshot({ count: 0 });

// Get DOM elements
const countEl = document.getElementById('count');
const incrementBtn = document.getElementById('increment');
const decrementBtn = document.getElementById('decrement');
const resetBtn = document.getElementById('reset');

// Subscribe to updates
counterState.subscribe((data) => {
  countEl.textContent = data.count.toString();
});

// Event handlers
incrementBtn.addEventListener('click', () => {
  counterState.set((data) => ({ count: data.count + 1 }));
});

decrementBtn.addEventListener('click', () => {
  counterState.set((data) => ({ count: data.count - 1 }));
});

resetBtn.addEventListener('click', () => {
  counterState.reset();
});
```

### Form State Management

```ts
const formState = createSnapshot({
  name: '',
  email: '',
  age: 0,
  errors: {},
});

const form = document.querySelector('form');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const ageInput = document.getElementById('age');

// Subscribe to state changes
formState.subscribe((data) => {
  nameInput.value = data.name;
  emailInput.value = data.email;
  ageInput.value = data.age.toString();

  // Update error display
  updateErrors(state.errors);
});

// Handle input changes
nameInput.addEventListener('input', (e) => {
  formState.set({ name: e.target.value });
});

emailInput.addEventListener('input', (e) => {
  formState.set({ email: e.target.value });
});

ageInput.addEventListener('input', (e) => {
  formState.set({ age: Number(e.target.value) });
});

// Validation
function validate(state) {
  const errors = {};

  if (!state.name) errors.name = 'Name is required';
  if (!state.email) errors.email = 'Email is required';
  if (state.age < 18) errors.age = 'Must be 18 or older';

  return errors;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const errors = validate(formState.get());
  formState.set({ errors });

  if (Object.keys(errors).length === 0) {
    console.log('Form submitted:', formState.get());
  }
});
```

## Web Components

### Custom Element with State

```ts
import { createSnapshot } from '@vielzeug/snapit';

class CounterElement extends HTMLElement {
  private state = createSnapshot({ count: 0 });
  private unsubscribe?: () => void;

  connectedCallback() {
    this.render();

    // Subscribe to state changes
    this.unsubscribe = this.state.subscribe(() => {
      this.render();
    });

    // Event listeners
    this.querySelector('#increment')?.addEventListener('click', () => {
      this.state.set((data) => ({ count: data.count + 1 }));
    });

    this.querySelector('#decrement')?.addEventListener('click', () => {
      this.state.set((data) => ({ count: data.count - 1 }));
    });
  }

  disconnectedCallback() {
    this.unsubscribe?.();
  }

  render() {
    const { count } = this.state.get();

    this.innerHTML = `
      <div>
        <h2>Count: ${count}</h2>
        <button id="increment">+</button>
        <button id="decrement">-</button>
      </div>
    `;
  }
}

customElements.define('counter-element', CounterElement);
```

## Advanced Patterns

### Global App State

```ts
// stores/app.ts
import { createSnapshot } from '@vielzeug/snapit';

export const authState = createSnapshot({
  user: null as User | null,
  token: null as string | null,
  isAuthenticated: false,
});

export const uiState = createSnapshot({
  theme: 'light' as 'light' | 'dark',
  sidebarOpen: false,
  notifications: [] as Notification[],
});

export const cartState = createSnapshot({
  items: [] as CartItem[],
  total: 0,
});

// Sync states
authState.subscribe((auth) => {
  if (!auth.isAuthenticated) {
    // Clear cart on logout
    cartState.set({ items: [], total: 0 });
  }
});

uiState.subscribe(
  (data) => data.theme,
  (theme) => {
    document.body.setAttribute('data-theme', theme);
  },
);
```

### Local Storage Persistence

```ts
function createPersistedState<T extends object>(key: string, initialState: T) {
  // Load from localStorage
  const saved = localStorage.getItem(key);
  const state = createSnapshot<T>(saved ? JSON.parse(saved) : initialState);

  // Save on changes
  state.subscribe((current) => {
    localStorage.setItem(key, JSON.stringify(current));
  });

  return state;
}

// Usage
const settingsState = createPersistedState('app-settings', {
  theme: 'light',
  language: 'en',
});
```

### Debounced Updates

```ts
function debounce(fn: Function, delay: number) {
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

const searchState = createSnapshot({ query: '', results: [] });

const debouncedSearch = debounce(async (query: string) => {
  if (!query) {
    searchState.set({ results: [] });
    return;
  }

  const results = await fetch(`/api/search?q=${query}`).then((r) => r.json());
  searchState.set({ results });
}, 300);

// Usage in input handler
searchInput.addEventListener('input', (e) => {
  const query = e.target.value;
  searchState.set({ query });
  debouncedSearch(query);
});
```

### Undo/Redo Pattern

```ts
class UndoableState<T extends object> {
  private state: State<T>;
  private history: T[] = [];
  private historyIndex = -1;
  private maxHistory = 50;

  constructor(initialState: T) {
    this.state = createSnapshot(initialState);
    this.pushHistory(initialState);
  }

  get() {
    return this.state.get();
  }

  set(update: Partial<T> | ((current: T) => T)) {
    const newState = typeof update === 'function' ? update(this.state.get()) : { ...this.state.get(), ...update };

    this.state.set(newState);
    this.pushHistory(newState);
  }

  undo() {
    if (this.canUndo()) {
      this.historyIndex--;
      this.state.set(this.history[this.historyIndex]);
    }
  }

  redo() {
    if (this.canRedo()) {
      this.historyIndex++;
      this.state.set(this.history[this.historyIndex]);
    }
  }

  canUndo() {
    return this.historyIndex > 0;
  }

  canRedo() {
    return this.historyIndex < this.history.length - 1;
  }

  subscribe(listener: Listener<T>) {
    return this.state.subscribe(listener);
  }

  private pushHistory(state: T) {
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(state);

    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }
}

// Usage
const editorState = new UndoableState({ content: '' });

editorState.set({ content: 'Hello' });
editorState.set({ content: 'Hello World' });
editorState.undo(); // Back to "Hello"
editorState.redo(); // Forward to "Hello World"
```

## Testing Examples

### Unit Tests

```ts
import { describe, it, expect, vi } from 'vitest';
import { createSnapshot, createTestState } from '@vielzeug/snapit';

describe('Counter State', () => {
  it('initializes with correct value', () => {
    const state = createSnapshot({ count: 0 });
    expect(state.get().count).toBe(0);
  });

  it('updates count', () => {
    const state = createSnapshot({ count: 0 });
    state.set({ count: 5 });
    expect(state.get().count).toBe(5);
  });

  it('resets to initial state', () => {
    const state = createSnapshot({ count: 0 });
    state.set({ count: 10 });
    state.reset();
    expect(state.get().count).toBe(0);
  });

  it('notifies subscribers', async () => {
    const state = createSnapshot({ count: 0 });
    const listener = vi.fn();

    state.subscribe(listener);
    listener.mockClear();

    state.set({ count: 1 });
    await Promise.resolve();

    expect(listener).toHaveBeenCalledWith({ count: 1 }, { count: 0 });
  });
});

describe('Test State Helper', () => {
  it('creates isolated test state', () => {
    const baseState = createSnapshot({ count: 0 });
    const { state: testState, dispose } = createTestState(baseState, {
      count: 5,
    });

    expect(testState.get().count).toBe(5);
    expect(baseState.get().count).toBe(0);

    dispose();
  });
});
```

### Integration Tests

```ts
describe('Todo App', () => {
  it('adds and completes todos', () => {
    const todoState = createSnapshot({ todos: [], filter: 'all' });

    // Add todo
    todoState.set((data) => ({
      ...data,
      todos: [...data.todos, { id: 1, text: 'Test', completed: false }],
    }));

    expect(todoState.get().todos).toHaveLength(1);

    // Complete todo
    todoState.set((data) => ({
      ...data,
      todos: data.todos.map((t) => (t.id === 1 ? { ...t, completed: true } : t)),
    }));

    expect(todoState.get().todos[0].completed).toBe(true);
  });
});
```
