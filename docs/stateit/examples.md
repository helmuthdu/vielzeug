# Stateit Examples

Real-world examples demonstrating common use cases and patterns with Stateit.

::: tip 💡 Complete Applications
These are complete, production-ready application examples. For API reference and basic usage, see [Usage Guide](./usage.md).
:::

## Table of Contents

[[toc]]

## Framework Integration

::: details 🎯 Why Two Patterns?
We provide both **inline** and **hook/composable** patterns because:

- **Inline**: Quick prototyping, direct usage
- **Hook/Composable**: Reusable across components, better separation of concerns

Choose based on your project structure and team preferences.
:::

Complete examples showing how to integrate Stateit with React, Vue, Svelte, and Web Components.

### Basic Integration (Inline)

Directly create and use a store instance within components.

::: code-group

```tsx [React]
import { createStore } from '@vielzeug/stateit';
import { useSyncExternalStore } from 'react';

const counterStore = createStore({ count: 0 });

function Counter() {
  const state = useSyncExternalStore(
    (callback) => counterStore.subscribe(callback),
    () => counterStore.get(),
  );

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => counterStore.set({ count: state.count + 1 })}>Increment</button>
      <button onClick={() => counterStore.reset()}>Reset</button>
    </div>
  );
}
```

```vue [Vue 3]
<script setup lang="ts">
import { createStore } from '@vielzeug/stateit';
import { computed, onUnmounted } from 'vue';

const counterStore = createStore({ count: 0 });

const state = computed(() => counterStore.get());

const unsubscribe = counterStore.subscribe(() => {
  state.value = counterStore.get();
});

onUnmounted(() => {
  unsubscribe();
});

const increment = () => {
  counterStore.set({ count: state.value.count + 1 });
};

const reset = () => {
  counterStore.reset();
};
</script>

<template>
  <div>
    <p>Count: {{ state.count }}</p>
    <button @click="increment">Increment</button>
    <button @click="reset">Reset</button>
  </div>
</template>
```

```svelte [Svelte]
<script lang="ts">
  import { createStore } from '@vielzeug/stateit';
  import { readable } from 'svelte/store';
  import { onDestroy } from 'svelte';

  const counterStore = createStore({ count: 0 });

  const state = readable(counterStore.get(), (set) => {
    return counterStore.subscribe(set);
  });

  function increment() {
    counterStore.set({ count: $state.count + 1 });
  }

  function reset() {
    counterStore.reset();
  }
</script>

<div>
  <p>Count: {$state.count}</p>
  <button on:click={increment}>Increment</button>
  <button on:click={reset}>Reset</button>
</div>
```

```ts [Web Component]
import { createStore } from '@vielzeug/stateit';

class CounterComponent extends HTMLElement {
  #store = createStore({ count: 0 });
  #unsubscribe;

  connectedCallback() {
    this.innerHTML = `
      <div>
        <p>Count: <span id="count">0</span></p>
        <button id="increment">Increment</button>
        <button id="reset">Reset</button>
      </div>
    `;

    this.querySelector('#increment').addEventListener('click', () => {
      this.#store.set({ count: this.#store.get().count + 1 });
    });

    this.querySelector('#reset').addEventListener('click', () => {
      this.#store.reset();
    });

    this.#unsubscribe = this.#store.subscribe((state) => {
      this.querySelector('#count').textContent = String(state.count);
    });
  }

  disconnectedCallback() {
    this.#unsubscribe?.();
  }
}

customElements.define('counter-component', CounterComponent);
```

:::

### Advanced Integration (Hook/Composable)

Create reusable hooks/composables for store integration.

::: code-group

```tsx [React]
import { createStore, type Store } from '@vielzeug/stateit';
import { useSyncExternalStore } from 'react';

// Create hook for store integration
function useStore<T extends object>(store: Store<T>): T;
function useStore<T extends object, U>(store: Store<T>, selector: (state: T) => U): U;
function useStore<T extends object, U>(store: Store<T>, selector?: (state: T) => U) {
  return useSyncExternalStore(
    (callback) => {
      if (selector) {
        return store.subscribe(selector, callback);
      }
      return store.subscribe(callback);
    },
    () => (selector ? selector(store.get()) : store.get()),
  );
}

// Create stores
const counterStore = createStore({ count: 0 });

// Use in components
function Counter() {
  // Subscribe to specific field
  const count = useStore(counterStore, (state) => state.count);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => counterStore.set({ count: count + 1 })}>Increment</button>
    </div>
  );
}

function FullStateExample() {
  // Subscribe to full state
  const state = useStore(counterStore);

  return <div>Count: {state.count}</div>;
}
```

```vue [Vue 3]
<script setup lang="ts">
import { createStore, type Store } from '@vielzeug/stateit';
import { computed, onUnmounted } from 'vue';

// Create composable for store integration
function useStore<T extends object>(store: Store<T>) {
  const state = computed(() => store.get());

  const unsubscribe = store.subscribe(() => {
    state.value = store.get();
  });

  onUnmounted(() => {
    unsubscribe();
  });

  return state;
}

function useStoreSelector<T extends object, U>(store: Store<T>, selector: (state: T) => U) {
  const selected = computed(() => selector(store.get()));

  const unsubscribe = store.subscribe(selector, (value) => {
    selected.value = value;
  });

  onUnmounted(() => {
    unsubscribe();
  });

  return selected;
}

// Create store
const counterStore = createStore({ count: 0 });

// Use in component
const state = useStore(counterStore);
const count = useStoreSelector(counterStore, (s) => s.count);

const increment = () => {
  counterStore.set({ count: count.value + 1 });
};
</script>

<template>
  <div>
    <p>Count: {{ count }}</p>
    <button @click="increment">Increment</button>
  </div>
</template>
```

```svelte [Svelte (SvelteKit)]
<script lang="ts">
  import { createStore, type Store } from '@vielzeug/stateit';
  import { readable, type Readable } from 'svelte/store';

  // Create Svelte store from stateit store
  function toSvelteStore<T extends object>(store: Store<T>): Readable<T> {
    return readable(store.get(), (set) => {
      return store.subscribe(set);
    });
  }

  // Create store
  const counterStore = createStore({ count: 0 });

  // Convert to Svelte store
  const counter = toSvelteStore(counterStore);

  function increment() {
    counterStore.set({ count: $counter.count + 1 });
  }
</script>

<div>
  <p>Count: {$counter.count}</p>
  <button on:click={increment}>Increment</button>
</div>
```

```ts [Web Component (Full)]
import { createStore, type Store } from '@vielzeug/stateit';

// Store manager for web components
class StoreManager<T extends object> {
  private unsubscribers = new Set<() => void>();

  constructor(private store: Store<T>) {}

  subscribe(element: HTMLElement, updater: (state: T) => void) {
    const unsubscribe = this.store.subscribe((state) => {
      updater(state);
    });
    this.unsubscribers.add(unsubscribe);
    return unsubscribe;
  }

  dispose() {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers.clear();
  }

  get() {
    return this.store.get();
  }

  set(updates: Partial<T>) {
    this.store.set(updates);
  }
}

// Usage in Web Component
const counterStore = createStore({ count: 0, name: 'Counter' });

class AdvancedCounter extends HTMLElement {
  #manager = new StoreManager(counterStore);

  connectedCallback() {
    this.innerHTML = `
      <div class="counter">
        <h2 id="name">Counter</h2>
        <p>Count: <span id="count">0</span></p>
        <button id="increment">+</button>
        <button id="decrement">-</button>
        <button id="reset">Reset</button>
      </div>
    `;

    this.#manager.subscribe(this, (state) => {
      this.querySelector('#count').textContent = String(state.count);
      this.querySelector('#name').textContent = state.name;
    });

    this.querySelector('#increment').addEventListener('click', () => {
      const { count } = this.#manager.get();
      this.#manager.set({ count: count + 1 });
    });

    this.querySelector('#decrement').addEventListener('click', () => {
      const { count } = this.#manager.get();
      this.#manager.set({ count: count - 1 });
    });

    this.querySelector('#reset').addEventListener('click', () => {
      counterStore.reset();
    });
  }

  disconnectedCallback() {
    this.#manager.dispose();
  }
}

customElements.define('advanced-counter', AdvancedCounter);
```

:::

## Common Use Cases

### Todo List

Complete todo list with add, toggle, and delete functionality.

```ts
import { createStore } from '@vielzeug/stateit';

type Todo = {
  id: string;
  text: string;
  completed: boolean;
};

type TodoState = {
  todos: Todo[];
  filter: 'all' | 'active' | 'completed';
};

const todoStore = createStore<TodoState>({
  todos: [],
  filter: 'all',
});

// Actions
export function addTodo(text: string) {
  const { todos } = todoStore.get();
  todoStore.set({
    todos: [
      ...todos,
      {
        id: crypto.randomUUID(),
        text,
        completed: false,
      },
    ],
  });
}

export function toggleTodo(id: string) {
  const { todos } = todoStore.get();
  todoStore.set({
    todos: todos.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)),
  });
}

export function deleteTodo(id: string) {
  const { todos } = todoStore.get();
  todoStore.set({
    todos: todos.filter((todo) => todo.id !== id),
  });
}

export function setFilter(filter: TodoState['filter']) {
  todoStore.set({ filter });
}

// Computed values using select() - type-safe property access
export function getFilteredTodos() {
  // Use select() for clean, type-safe access
  const todos = todoStore.select((state) => state.todos);
  const filter = todoStore.select((state) => state.filter);

  switch (filter) {
    case 'active':
      return todos.filter((t) => !t.completed);
    case 'completed':
      return todos.filter((t) => t.completed);
    default:
      return todos;
  }
}

// Get specific computed values
export function getTodoCount() {
  return todoStore.select((state) => state.todos.length);
}

export function getCompletedCount() {
  return todoStore.select((state) => state.todos.filter((t) => t.completed).length);
}

export function getActiveCount() {
  return todoStore.select((state) => state.todos.filter((t) => !t.completed).length);
}

export { todoStore };
```

::: tip 💡 select() for Computed Values
Use `select()` to derive values from state without subscribing. Perfect for one-time reads or computed getters.
:::

### Authentication State

Manage user authentication state with token persistence.

```ts
import { createStore } from '@vielzeug/stateit';

type AuthState = {
  user: { id: string; name: string; email: string } | null;
  token: string | null;
  isLoading: boolean;
};

const authStore = createStore<AuthState>({
  user: null,
  token: null,
  isLoading: false,
});

// Load token from localStorage
const savedToken = localStorage.getItem('auth_token');
if (savedToken) {
  authStore.set({ token: savedToken });
}

// Persist token changes
authStore.subscribe(
  (state) => state.token,
  (token) => {
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  },
);

// Actions
export async function login(email: string, password: string) {
  authStore.set({ isLoading: true });

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const { user, token } = await response.json();
    authStore.set({ user, token, isLoading: false });
  } catch (error) {
    authStore.set({ isLoading: false });
    throw error;
  }
}

export function logout() {
  authStore.replace({ user: null, token: null, isLoading: false });
}

export function isAuthenticated() {
  return !!authStore.get().user;
}

export { authStore };
```

### Shopping Cart

Shopping cart with items, quantities, and total calculation.

```ts
import { createStore } from '@vielzeug/stateit';

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type CartState = {
  items: CartItem[];
};

const cartStore = createStore<CartState>({
  items: [],
});

// Actions
export function addToCart(item: Omit<CartItem, 'quantity'>) {
  const { items } = cartStore.get();
  const existing = items.find((i) => i.id === item.id);

  if (existing) {
    cartStore.set({
      items: items.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)),
    });
  } else {
    cartStore.set({
      items: [...items, { ...item, quantity: 1 }],
    });
  }
}

export function removeFromCart(id: string) {
  const { items } = cartStore.get();
  cartStore.set({
    items: items.filter((item) => item.id !== id),
  });
}

export function updateQuantity(id: string, quantity: number) {
  const { items } = cartStore.get();

  if (quantity <= 0) {
    removeFromCart(id);
    return;
  }

  cartStore.set({
    items: items.map((item) => (item.id === id ? { ...item, quantity } : item)),
  });
}

export function clearCart() {
  cartStore.set({ items: [] });
}

// Computed values using select()
export function getCartTotal() {
  return cartStore.select((state) => state.items.reduce((sum, item) => sum + item.price * item.quantity, 0));
}

export function getCartItemCount() {
  return cartStore.select((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));
}

export function getCartItems() {
  return cartStore.select((state) => state.items);
}

export function hasItems() {
  return cartStore.select((state) => state.items.length > 0);
}

// Subscribe to cart total for real-time updates
cartStore.subscribe(
  (state) => state.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  (total) => {
    console.log('Cart total:', total);
  },
);

export { cartStore };
```

### Data Fetching with Loading States

Async data fetching with loading, error, and success states.

```ts
import { createStore } from '@vielzeug/stateit';

type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
};

function createAsyncStore<T>(initialData: T | null = null) {
  return createStore<AsyncState<T>>({
    data: initialData,
    loading: false,
    error: null,
  });
}

// Usage: User data
type User = {
  id: string;
  name: string;
  email: string;
};

const userStore = createAsyncStore<User>();

export async function fetchUser(id: string) {
  userStore.set({ loading: true, error: null });

  try {
    const response = await fetch(`/api/users/${id}`);

    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }

    const user = await response.json();
    userStore.set({ data: user, loading: false });
  } catch (error) {
    userStore.set({
      error: error as Error,
      loading: false,
    });
  }
}

export async function updateUser(id: string, updates: Partial<User>) {
  const currentData = userStore.get().data;

  // Optimistic update
  if (currentData) {
    userStore.set({
      data: { ...currentData, ...updates },
    });
  }

  try {
    const response = await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    const user = await response.json();
    userStore.set({ data: user });
  } catch (error) {
    // Rollback on error
    userStore.set({
      data: currentData,
      error: error as Error,
    });
  }
}

export { userStore };
```

### Theme Management

Theme switcher with persistence and DOM updates.

```ts
import { createStore } from '@vielzeug/stateit';

type Theme = 'light' | 'dark' | 'auto';

type ThemeState = {
  theme: Theme;
  isDark: boolean;
};

// Detect system theme
function getSystemTheme(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// Load saved theme
const savedTheme = localStorage.getItem('theme') as Theme | null;

const themeStore = createStore<ThemeState>({
  theme: savedTheme || 'auto',
  isDark: savedTheme === 'dark' || (savedTheme === 'auto' && getSystemTheme()),
});

// Listen to system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  const { theme } = themeStore.get();
  if (theme === 'auto') {
    themeStore.set({ isDark: e.matches });
  }
});

// Apply theme to DOM
themeStore.subscribe(
  (state) => state.isDark,
  (isDark) => {
    document.documentElement.classList.toggle('dark', isDark);
  },
);

// Persist theme
themeStore.subscribe(
  (state) => state.theme,
  (theme) => {
    localStorage.setItem('theme', theme);
  },
);

// Actions
export function setTheme(theme: Theme) {
  const isDark = theme === 'dark' || (theme === 'auto' && getSystemTheme());
  themeStore.set({ theme, isDark });
}

export function toggleTheme() {
  const { isDark } = themeStore.get();
  themeStore.set({
    theme: isDark ? 'light' : 'dark',
    isDark: !isDark,
  });
}

export { themeStore };
```

### Derived State with select()

Use `select()` for type-safe derived state and computed values.

```ts
import { createStore } from '@vielzeug/stateit';

type User = {
  firstName: string;
  lastName: string;
  email: string;
  age: number;
  address: {
    street: string;
    city: string;
    country: string;
  };
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
};

const userStore = createStore<User>({
  firstName: 'Alice',
  lastName: 'Johnson',
  email: 'alice@example.com',
  age: 30,
  address: {
    street: '123 Main St',
    city: 'New York',
    country: 'USA',
  },
  preferences: {
    theme: 'light',
    notifications: true,
  },
});

// Simple property access
export function getFirstName() {
  return userStore.select((state) => state.firstName);
}

// Nested property access
export function getUserCity() {
  return userStore.select((state) => state.address.city);
}

export function getUserTheme() {
  return userStore.select((state) => state.preferences.theme);
}

// Computed values
export function getFullName() {
  return userStore.select((state) => `${state.firstName} ${state.lastName}`);
}

export function getFullAddress() {
  return userStore.select((state) => {
    const { street, city, country } = state.address;
    return `${street}, ${city}, ${country}`;
  });
}

export function isAdult() {
  return userStore.select((state) => state.age >= 18);
}

// Complex transformations
export function getUserProfile() {
  return userStore.select((state) => ({
    name: `${state.firstName} ${state.lastName}`,
    contact: state.email,
    location: `${state.address.city}, ${state.address.country}`,
    isDarkMode: state.preferences.theme === 'dark',
  }));
}

// Type-safe field selection
export function getUserSettings() {
  return userStore.select((state) => ({
    theme: state.preferences.theme,
    notifications: state.preferences.notifications,
  }));
}
```

::: tip 💡 When to Use select()

- ✅ One-time reads of specific values
- ✅ Computed/derived values
- ✅ Type-safe property access
- ✅ Building APIs that return state slices
- ❌ Not needed for subscriptions (use selector parameter instead)
  :::

## Advanced Patterns

### Multi-Store Coordination

Coordinate multiple stores for complex state management.

```ts
import { createStore } from '@vielzeug/stateit';

// Stores
const authStore = createStore({ user: null, token: null });
const cartStore = createStore({ items: [] });
const notificationStore = createStore({ messages: [] });

// Clear cart when user logs out
authStore.subscribe((auth) => {
  if (!auth.user) {
    cartStore.set({ items: [] });
  }
});

// Show notification when items added to cart
cartStore.subscribe(
  (state) => state.items.length,
  (count, prevCount) => {
    if (count > prevCount) {
      const { messages } = notificationStore.get();
      notificationStore.set({
        messages: [...messages, { id: Date.now(), text: 'Item added to cart', type: 'success' }],
      });
    }
  },
);
```

### Request-Scoped State

Use scoped stores for request-specific state.

```ts
import { createStore } from '@vielzeug/stateit';
import type { Request, Response, NextFunction } from 'express';

const appStore = createStore({
  config: { apiUrl: 'https://api.example.com' },
});

// Express middleware
export async function requestContext(req: Request, res: Response, next: NextFunction) {
  await appStore.runInScope(
    async (requestStore) => {
      // Request-specific state
      requestStore.set({
        requestId: req.id,
        userId: req.user?.id,
      });

      // Make store available to route handlers
      req.context = requestStore;

      next();
    },
    {
      requestId: req.id,
      userId: req.user?.id,
    },
  );
}
```

### Undo/Redo Implementation

Implement undo/redo functionality.

```ts
import { createStore, type Store } from '@vielzeug/stateit';

class UndoManager<T extends object> {
  private past: T[] = [];
  private future: T[] = [];
  private unsubscribe: () => void;

  constructor(
    private store: Store<T>,
    private maxHistory = 50,
  ) {
    this.unsubscribe = store.observe((state, prev) => {
      this.past.push(prev);

      // Limit history
      if (this.past.length > maxHistory) {
        this.past.shift();
      }

      this.future = [];
    });
  }

  undo() {
    const previous = this.past.pop();
    if (previous) {
      this.future.push(this.store.get());
      this.store.replace(previous);
      return true;
    }
    return false;
  }

  redo() {
    const next = this.future.pop();
    if (next) {
      this.past.push(this.store.get());
      this.store.replace(next);
      return true;
    }
    return false;
  }

  canUndo() {
    return this.past.length > 0;
  }

  canRedo() {
    return this.future.length > 0;
  }

  clear() {
    this.past = [];
    this.future = [];
  }

  dispose() {
    this.unsubscribe();
  }
}

// Usage
const editorStore = createStore({ content: '' });
const undoManager = new UndoManager(editorStore);

// Make changes
editorStore.set({ content: 'Hello' });
editorStore.set({ content: 'Hello World' });

// Undo
undoManager.undo(); // Back to 'Hello'
undoManager.undo(); // Back to ''

// Redo
undoManager.redo(); // Forward to 'Hello'
```

### DevTools Integration

Integrate with Redux DevTools for debugging.

```ts
import { createStore } from '@vielzeug/stateit';

function withDevTools<T extends object>(store: Store<T>, name: string = 'Store') {
  const devTools = (window as any).__REDUX_DEVTOOLS_EXTENSION__?.connect({ name });

  if (!devTools) return store;

  store.observe((state, prev) => {
    devTools.send(
      {
        type: 'STATE_UPDATE',
        payload: state,
      },
      state,
    );
  });

  devTools.subscribe((message: any) => {
    if (message.type === 'DISPATCH' && message.state) {
      store.replace(JSON.parse(message.state));
    }
  });

  return store;
}

// Usage
const store = withDevTools(createStore({ count: 0 }), 'Counter Store');
```
