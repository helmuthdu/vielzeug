export const examples = {
  craftit: {
    'async-data': {
      code: `import { defineElement, html } from '@vielzeug/craftit'

defineElement('user-profile', {
  state: {
    userId: 1,
    user: null as any,
    loading: false,
    error: null as string | null
  },
  
  template: (el) => html\`
    <div style="padding: 1rem; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 400px;">
      \${el.state.loading ? \`
        <div style="text-align: center; padding: 2rem; color: #667eea;">Loading...</div>
      \` : el.state.error ? \`
        <div style="color: #f56565; padding: 1rem;">\${el.state.error}</div>
      \` : el.state.user ? \`
        <div>
          <h3 style="margin-top: 0;">\${el.state.user.name}</h3>
          <p style="color: #718096;"><strong>Email:</strong> \${el.state.user.email}</p>
          <p style="color: #718096;"><strong>Company:</strong> \${el.state.user.company.name}</p>
          <button class="load-next" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Load Next User
          </button>
        </div>
      \` : ''}
    </div>
  \`,
  
  async onConnected(el) {
    await loadUser(el)
    
    el.on('.load-next', 'click', async () => {
      el.state.userId++
      await loadUser(el)
    })
  }
})

async function loadUser(el: any) {
  await el.set(async (state: any) => {
    try {
      const response = await fetch(\`https://jsonplaceholder.typicode.com/users/\${state.userId}\`)
      const user = await response.json()
      return { ...state, user, loading: false, error: null }
    } catch (error) {
      return {
        ...state,
        user: null,
        loading: false,
        error: 'Failed to load user'
      }
    }
  })
}

const profile = document.createElement('user-profile')
document.getElementById('output').appendChild(profile)

console.log('✓ Async data loading component created!')`,
      name: 'Async Data - API Integration',
    },
    'basic-component': {
      code: `import { defineElement, html } from '@vielzeug/craftit'

defineElement('hello-world', {
  template: html\`
    <div style="padding: 1rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px;">
      <h2>Hello from Craftit!</h2>
      <p>A lightweight web component library</p>
    </div>
  \`
})

// Create and mount the element
const el = document.createElement('hello-world')
document.getElementById('output').appendChild(el)

console.log('✓ Component mounted successfully!')`,
      name: 'Basic Component - Simple Element',
    },
    'counter-component': {
      code: `import { defineElement, html } from '@vielzeug/craftit'

defineElement('simple-counter', {
  state: { count: 0 },
  
  template: (el) => html\`
    <div style="padding: 1rem; text-align: center;">
      <h2 style="margin: 0 0 1rem 0;">Count: \${el.state.count}</h2>
      <button class="btn btn-decrement" style="margin: 0 0.5rem;">-</button>
      <button class="btn btn-reset" style="margin: 0 0.5rem;">Reset</button>
      <button class="btn btn-increment" style="margin: 0 0.5rem;">+</button>
    </div>
  \`,
  
  styles: [\`
    .btn {
      padding: 0.5rem 1rem;
      font-size: 1rem;
      cursor: pointer;
      border: none;
      border-radius: 4px;
      background: #667eea;
      color: white;
    }
    .btn:hover {
      background: #5a67d8;
    }
  \`],
  
  onConnected(el) {
    el.on('.btn-increment', 'click', () => el.state.count++)
    el.on('.btn-decrement', 'click', () => el.state.count--)
    el.on('.btn-reset', 'click', () => el.state.count = 0)
  }
})

const counter = document.createElement('simple-counter')
document.getElementById('output').appendChild(counter)

console.log('✓ Interactive counter component created!')`,
      name: 'Interactive Counter - State & Events',
    },
    'css-theming': {
      code: `import { defineElement, html, css } from '@vielzeug/craftit'

// Create light/dark theme - same variable references!
const theme = css.theme(
  // Light theme
  {
    primaryColor: '#3b82f6',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    borderColor: '#e5e7eb',
    spacing: '1.5rem',
    borderRadius: '12px',
    buttonBg: '#f3f4f6',
    buttonText: '#374151',
  },
  // Dark theme
  {
    primaryColor: '#60a5fa',
    backgroundColor: '#1f2937',
    textColor: '#f9fafb',
    borderColor: '#374151',
    buttonBg: '#374151',
    buttonText: '#f9fafb',
  }
)

defineElement('themed-card', {
  state: {
    mode: 'auto' as 'auto' | 'light' | 'dark'
  },
  
  template: (el) => html\`
    <div class="card">
      <h2>✨ Light/Dark Theme with Autocomplete</h2>
      <p>Automatic theme switching via <code>prefers-color-scheme</code></p>
      <p><small>Mode: \${el.state.mode.charAt(0).toUpperCase() + el.state.mode.slice(1)}</small></p>
      <div class="theme-buttons">
        <button class="btn-auto">Auto</button>
        <button class="btn-light">Light</button>
        <button class="btn-dark">Dark</button>
      </div>
      <div class="info">
        <p>💡 Use the same variable names - CSS handles light/dark!</p>
        <p>Try: <code>theme.primaryColor</code> works for both themes</p>
      </div>
    </div>
  \`,
  
  styles: [
    css\`
      /* Inject both light and dark themes */
      \${theme}
      
      .card {
        /* Same variable references - CSS handles which theme applies! */
        background: \${theme.backgroundColor};
        color: \${theme.textColor};
        border: 2px solid \${theme.borderColor};
        border-radius: \${theme.borderRadius};
        padding: \${theme.spacing};
        transition: all 0.3s ease;
      }
      
      h2 {
        margin-top: 0;
        color: \${theme.primaryColor};
      }
      
      code {
        background: rgba(0, 0, 0, 0.05);
        padding: 0.125rem 0.375rem;
        border-radius: 4px;
        font-size: 0.9em;
      }
      
      small {
        opacity: 0.7;
      }
      
      .theme-buttons {
        display: flex;
        gap: 0.5rem;
        margin: 1rem 0;
      }
      
      button {
        flex: 1;
        background: \${theme.buttonBg};
        color: \${theme.buttonText};
        border: 1px solid \${theme.borderColor};
        padding: 0.75rem 1rem;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.875rem;
        transition: all 0.2s;
      }
      
      button:hover {
        opacity: 0.8;
        transform: translateY(-1px);
      }
      
      button:active {
        transform: translateY(0);
      }
      
      .info {
        margin-top: 1rem;
        padding: 0.75rem;
        background: rgba(59, 130, 246, 0.05);
        border-left: 3px solid \${theme.primaryColor};
        border-radius: 4px;
      }
      
      .info p {
        margin: 0.25rem 0;
        font-size: 0.875rem;
      }
    \`
  ],
  
  onConnected(el) {
    el.on('.btn-auto', 'click', () => {
      el.state.mode = 'auto'
      el.removeAttribute('data-theme')
    })
    
    el.on('.btn-light', 'click', () => {
      el.state.mode = 'light'
      el.setAttribute('data-theme', 'light')
    })
    
    el.on('.btn-dark', 'click', () => {
      el.state.mode = 'dark'
      el.setAttribute('data-theme', 'dark')
    })
  }
})

const card = document.createElement('themed-card')
document.getElementById('output').appendChild(card)

console.log('✓ Light/dark themed card created!')
console.log('')
console.log('🎯 Real-World Usage:')
console.log('  • Same variable names for both themes')
console.log('  • CSS handles which theme applies')
console.log('  • Autocomplete: theme.primaryColor')
console.log('  • No .light or .dark needed!')
console.log('')
console.log('Theme behavior:')
console.log('  • Auto: System preference (prefers-color-scheme)')
console.log('  • Light: Force light mode')
console.log('  • Dark: Force dark mode')`,
      name: 'CSS Theming - Light/Dark with Autocomplete',
    },
    'form-component': {
      code: `import { defineElement, html } from '@vielzeug/craftit'

defineElement('custom-input', {
  state: {
    value: '',
    error: ''
  },
  
  template: (el) => html\`
    <div style="margin-bottom: 1rem;">
      <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">
        Email Address
      </label>
      <input
        type="email"
        value="\${el.state.value}"
        placeholder="Enter your email"
        style="width: 100%; padding: 0.5rem; border: 1px solid \${el.state.error ? '#f56565' : '#e2e8f0'}; border-radius: 4px;"
      />
      \${el.state.error ? \`
        <span style="color: #f56565; font-size: 0.875rem; margin-top: 0.25rem; display: block;">
          \${el.state.error}
        </span>
      \` : ''}
    </div>
  \`,
  
  formAssociated: true,
  
  onConnected(el) {
    el.on('input', 'input', (e) => {
      const value = (e.currentTarget as HTMLInputElement).value
      el.state.value = value
      
      // Validation
      if (!value) {
        el.state.error = 'Email is required'
        el.form?.valid({ valueMissing: true }, 'Required')
      } else if (!value.includes('@')) {
        el.state.error = 'Invalid email address'
        el.form?.valid({ typeMismatch: true }, 'Invalid email')
      } else {
        el.state.error = ''
        el.form?.valid()
      }
      
      el.form?.value(value)
    })
  }
})

const input = document.createElement('custom-input')
document.getElementById('output').appendChild(input)

console.log('✓ Form-associated custom input created!')
console.log('Try typing to see validation in action')`,
      name: 'Form Component - Custom Input',
    },
    'todo-list': {
      code: `import { defineElement, html } from '@vielzeug/craftit'

defineElement('todo-list', {
  state: {
    todos: ['Learn Craftit', 'Build components'],
    input: ''
  },
  
  template: (el) => html\`
    <div style="max-width: 400px; margin: 0 auto; padding: 1rem;">
      <h2 style="margin-top: 0;">My Todos</h2>
      <div style="margin-bottom: 1rem; display: flex; gap: 0.5rem;">
        <input
          type="text"
          placeholder="New todo..."
          value="\${el.state.input}"
          style="flex: 1; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;"
        />
        <button class="add" style="padding: 0.5rem 1rem; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Add
        </button>
      </div>
      <ul style="list-style: none; padding: 0;">
        \${el.state.todos.map((todo, i) => \`
          <li style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; margin-bottom: 0.5rem; background: #f7fafc; border-radius: 4px;">
            <span>\${todo}</span>
            <button class="delete" data-index="\${i}" style="background: #f56565; color: white; border: none; border-radius: 4px; padding: 0.25rem 0.5rem; cursor: pointer;">
              ×
            </button>
          </li>
        \`).join('')}
      </ul>
    </div>
  \`,
  
  onConnected(el) {
    el.on('input', 'input', (e) => {
      el.state.input = (e.currentTarget as HTMLInputElement).value
    })
    
    el.on('.add', 'click', () => {
      if (el.state.input.trim()) {
        el.state.todos.push(el.state.input)
        el.state.input = ''
      }
    })
    
    el.on('.delete', 'click', (e) => {
      const index = +(e.currentTarget as HTMLElement).dataset.index!
      el.state.todos.splice(index, 1)
    })
  }
})

const todoList = document.createElement('todo-list')
document.getElementById('output').appendChild(todoList)

console.log('✓ Todo list component created!')
console.log('Try adding and removing todos!')`,
      name: 'Todo List - Dynamic Content',
    },
    watchers: {
      code: `import { defineElement, html } from '@vielzeug/craftit'

defineElement('watcher-demo', {
  state: {
    count: 0,
    doubled: 0,
    history: [] as number[]
  },
  
  template: (el) => html\`
    <div style="padding: 1rem;">
      <h3>State Watchers</h3>
      <p><strong>Count:</strong> \${el.state.count}</p>
      <p><strong>Doubled:</strong> \${el.state.doubled}</p>
      <p><strong>History:</strong> [\${el.state.history.join(', ')}]</p>
      <button class="increment" style="padding: 0.5rem 1rem; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Increment
      </button>
    </div>
  \`,
  
  onConnected(el) {
    // Watch count changes
    el.watch(
      (state) => state.count,
      (count, prevCount) => {
        console.log(\`Count changed from \${prevCount} to \${count}\`)
        
        // Update doubled value
        el.state.doubled = count * 2
        
        // Add to history
        el.state.history.push(count)
        
        // Keep only last 5
        if (el.state.history.length > 5) {
          el.state.history.shift()
        }
      }
    )
    
    el.on('.increment', 'click', () => {
      el.state.count++
    })
  }
})

const demo = document.createElement('watcher-demo')
document.getElementById('output').appendChild(demo)

console.log('✓ Watcher demo created!')
console.log('Click increment to see watchers in action')`,
      name: 'State Watchers - Reactive Side Effects',
    },
  },
  deposit: {
    'basic-setup': {
      code: `import { Deposit, defineSchema } from '@vielzeug/deposit'

type User = { id: number; name: string; email: string }
type Post = { id: number; userId: number; title: string; content: string }

const schema = defineSchema<{ users: User; posts: Post }>()({
  users: {
    key: 'id',
    indexes: ['email']
  },
  posts: {
    key: 'id'
  }
})

const db = new Deposit({
  type: 'localStorage',
  dbName: 'myapp',
  version: 1,
  schema
})

console.log('Deposit initialized!')
console.log('Tables:', Object.keys(schema))`,
      name: 'Basic Setup - Initialize Deposit',
    },
    'bulk-operations': {
      code: `import { Deposit } from '@vielzeug/deposit'

const schema = {
  items: {
    key: 'id',
    record: { id: 0, value: 0 }
  }
}

const db = new Deposit({
  type: 'localStorage',
  dbName: 'bulk-demo',
  version: 1,
  schema
})

// Bulk insert
const items = Array.from({ length: 100 }, (_, i) => ({
  id: i + 1,
  value: Math.random() * 1000
}))

await db.bulkPut('items', items)
console.log('Inserted 100 items')

// Bulk delete
const idsToDelete = [1, 2, 3, 4, 5]
await db.bulkDelete('items', idsToDelete)
console.log('Deleted 5 items')

const remaining = await db.count('items')
console.log('Remaining items:', remaining)`,
      name: 'Bulk Operations',
    },
    'crud-operations': {
      code: `import { Deposit } from '@vielzeug/deposit'

const schema = {
  users: {
    key: 'id',
    record: { id: 0, name: '', email: '', age: 0 }
  }
}

const db = new Deposit({
  type: 'localStorage',
  dbName: 'demo',
  version: 1,
  schema
})

// Create
await db.put('users', { id: 1, name: 'Alice', email: 'alice@example.com', age: 25 })
await db.put('users', { id: 2, name: 'Bob', email: 'bob@example.com', age: 30 })

console.log('Created 2 users')

// Read
const user = await db.get('users', 1)
console.log('Retrieved user:', user)

// Read all
const allUsers = await db.getAll('users')
console.log('All users:', allUsers)

// Update
await db.put('users', { id: 1, name: 'Alice Updated', email: 'alice@example.com', age: 26 })
console.log('Updated user 1')

// Delete
await db.delete('users', 2)
console.log('Deleted user 2')

// Count
const count = await db.count('users')
console.log('Remaining users:', count)`,
      name: 'CRUD Operations',
    },
    'query-builder': {
      code: `import { Deposit } from '@vielzeug/deposit'

const schema = {
  products: {
    key: 'id',
    record: { id: 0, name: '', price: 0, category: '', inStock: false }
  }
}

const db = new Deposit({
  type: 'localStorage',
  dbName: 'shop',
  version: 1,
  schema
})

// Seed data
await db.bulkPut('products', [
  { id: 1, name: 'Laptop', price: 999, category: 'electronics', inStock: true },
  { id: 2, name: 'Mouse', price: 29, category: 'electronics', inStock: true },
  { id: 3, name: 'Desk', price: 299, category: 'furniture', inStock: false },
  { id: 4, name: 'Chair', price: 199, category: 'furniture', inStock: true },
  { id: 5, name: 'Monitor', price: 399, category: 'electronics', inStock: true }
])

// Query: Find electronics in stock under $500
const results = await db.query('products')
  .equals('category', 'electronics')
  .filter(p => p.inStock && p.price < 500)
  .orderBy('price', 'asc')
  .toArray()

console.log('Affordable electronics in stock:', results)

// Query: Count products by category
const byCategory = await db.query('products')
  .toGrouped('category')

console.log('Products by category:', byCategory)`,
      name: 'Query Builder - Advanced Queries',
    },
    transactions: {
      code: `import { Deposit } from '@vielzeug/deposit'

const schema = {
  accounts: {
    key: 'id',
    record: { id: '', balance: 0 }
  }
}

const db = new Deposit({
  type: 'localStorage',
  dbName: 'bank',
  version: 1,
  schema
})

// Setup accounts
await db.bulkPut('accounts', [
  { id: 'alice', balance: 1000 },
  { id: 'bob', balance: 500 }
])

console.log('Initial balances:', await db.getAll('accounts'))

// Transfer money with transaction
// For IndexedDB: Atomic (all succeed or all fail)
// For LocalStorage: Optimistic (not atomic across tables)
await db.transaction(['accounts'], async (stores) => {
  const alice = stores.accounts.find(a => a.id === 'alice')
  const bob = stores.accounts.find(a => a.id === 'bob')
  
  const amount = 200
  alice.balance -= amount
  bob.balance += amount
  
  console.log('Transfer executed!')
})

console.log('Final balances:', await db.getAll('accounts'))`,
      name: 'Transactions - Atomic for IndexedDB',
    },
    'ttl-expiration': {
      code: `import { Deposit } from '@vielzeug/deposit'

const schema = {
  cache: {
    key: 'id',
    record: { id: 0, data: '' }
  }
}

const db = new Deposit({
  type: 'localStorage',
  dbName: 'cache-demo',
  version: 1,
  schema
})

// Store with TTL (expires in 2 seconds)
await db.put('cache', 
  { id: 1, data: 'This will expire' },
  2000 // 2 seconds
)

console.log('Item stored with 2s TTL')

// Immediately retrieve
const item1 = await db.get('cache', 1)
console.log('Immediate get:', item1)

// Wait and try again
await new Promise(r => setTimeout(r, 3000))

const item2 = await db.get('cache', 1)
console.log('After expiration:', item2) // undefined`,
      name: 'TTL & Expiration',
    },
  },
  fetchit: {
    'http-client-basic': {
      code: `import { createHttpClient } from '@vielzeug/fetchit'

const http = createHttpClient({
  baseUrl: 'https://jsonplaceholder.typicode.com',
  timeout: 5000
})

console.log('Fetchit HTTP client created!')

// GET request
const todo = await http.get('/todos/1')
console.log('GET /todos/1:', todo)

// POST request
const newTodo = await http.post('/todos', {
  body: { title: 'New Todo', completed: false, userId: 1 }
})
console.log('POST /todos:', newTodo)`,
      name: 'HTTP Client - Basic Requests',
    },
    'http-client-headers': {
      code: `import { createHttpClient } from '@vielzeug/fetchit'

const http = createHttpClient({
  baseUrl: 'https://jsonplaceholder.typicode.com',
  headers: {
    'Authorization': 'Bearer token123',
    'X-Custom-Header': 'CustomValue'
  }
})

console.log('HTTP client created with custom headers')

// Update headers dynamically
http.setHeaders({
  'Authorization': 'Bearer newtoken456'
})

console.log('Headers updated successfully')

// Make request with updated headers
const data = await http.get('/posts/1')
console.log('Fetched with new headers:', data.title)`,
      name: 'HTTP Client - Custom Headers',
    },
    'http-client-methods': {
      code: `import { createHttpClient } from '@vielzeug/fetchit'

const http = createHttpClient({
  baseUrl: 'https://jsonplaceholder.typicode.com'
})

// GET
const post = await http.get('/posts/1')
console.log('GET:', post.title)

// POST
const created = await http.post('/posts', {
  body: { title: 'New Post', body: 'Content', userId: 1 }
})
console.log('POST:', created.id)

// PUT
const updated = await http.put('/posts/1', {
  body: { id: 1, title: 'Updated', body: 'New content', userId: 1 }
})
console.log('PUT:', updated.title)

// PATCH
const patched = await http.patch('/posts/1', {
  body: { title: 'Patched Title' }
})
console.log('PATCH:', patched.title)

// DELETE
await http.delete('/posts/1')
console.log('DELETE: Success')`,
      name: 'HTTP Client - All Methods',
    },
    'http-client-params': {
      code: `import { createHttpClient } from '@vielzeug/fetchit'

const http = createHttpClient({
  baseUrl: 'https://jsonplaceholder.typicode.com'
})

// GET with query parameters
const posts = await http.get('/posts', {
  query: { userId: 1, _limit: 5 }
})

console.log('Filtered posts:', posts)
console.log('Count:', posts.length)

// GET with path parameters
const user = await http.get('/users/:id', {
  params: { id: 1 }
})

console.log('User:', user.name)

// Combine path and query parameters
const userPosts = await http.get('/users/:userId/posts', {
  params: { userId: 1 },
  query: { _limit: 3 }
})

console.log('User posts:', userPosts.length, 'items')`,
      name: 'HTTP Client - Path & Query Parameters',
    },
    'query-client-basic': {
      code: `import { createQueryClient, createHttpClient } from '@vielzeug/fetchit'

const http = createHttpClient({
  baseUrl: 'https://jsonplaceholder.typicode.com'
})

const queryClient = createQueryClient({
  staleTime: 5000,
  gcTime: 300000
})

// First fetch - hits the network
console.log('First fetch...')
const data1 = await queryClient.fetch({
  queryKey: ['posts', 1],
  queryFn: () => http.get('/posts/1')
})
console.log('Data:', data1.title)

// Second fetch - returns from cache (within staleTime)
console.log('Second fetch (cached)...')
const data2 = await queryClient.fetch({
  queryKey: ['posts', 1],
  queryFn: () => http.get('/posts/1')
})
console.log('Data:', data2.title)
console.log('✓ Second request used cached data!')`,
      name: 'Query Client - Basic Caching',
    },
    'query-client-invalidate': {
      code: `import { createQueryClient, createHttpClient } from '@vielzeug/fetchit'

const http = createHttpClient({
  baseUrl: 'https://jsonplaceholder.typicode.com'
})

const queryClient = createQueryClient()

// Fetch and cache
await queryClient.fetch({
  queryKey: ['users'],
  queryFn: () => http.get('/users')
})

console.log('✓ Data cached for key: ["users"]')

// Invalidate specific query
queryClient.invalidate(['users'])
console.log('✓ Cache invalidated for ["users"]')

// Invalidate with prefix matching
await queryClient.fetch({
  queryKey: ['users', 1],
  queryFn: () => http.get('/users/1')
})
await queryClient.fetch({
  queryKey: ['users', 2],
  queryFn: () => http.get('/users/2')
})

console.log('✓ Cached ["users", 1] and ["users", 2]')

// Invalidate all 'users' queries with prefix matching
queryClient.invalidate(['users'])
console.log('✓ All "users" queries invalidated via prefix match')`,
      name: 'Query Client - Cache Invalidation',
    },
    'query-client-mutations': {
      code: `import { createQueryClient, createHttpClient } from '@vielzeug/fetchit'

const http = createHttpClient({
  baseUrl: 'https://jsonplaceholder.typicode.com'
})

const queryClient = createQueryClient()

// Mutation with callbacks
const result = await queryClient.mutate({
  mutationFn: (variables) => http.post('/posts', { body: variables }),
  onSuccess: (data, variables) => {
    console.log('✓ Post created:', data.id)
    console.log('  Variables:', variables)
    // Invalidate related queries
    queryClient.invalidate(['posts'])
  },
  onError: (error, variables) => {
    console.error('✗ Mutation failed:', error.message)
  }
}, {
  title: 'New Post',
  body: 'Content here',
  userId: 1
})

console.log('Mutation result:', result)`,
      name: 'Query Client - Mutations',
    },
    'query-client-subscriptions': {
      code: `import { createQueryClient, createHttpClient } from '@vielzeug/fetchit'

const http = createHttpClient({
  baseUrl: 'https://jsonplaceholder.typicode.com'
})

const queryClient = createQueryClient()

// Subscribe to query state changes
const unsubscribe = queryClient.subscribe(['posts', 1], (state) => {
  console.log('Query state:', {
    status: state.status,
    isLoading: state.isLoading,
    isSuccess: state.isSuccess,
    dataUpdatedAt: state.dataUpdatedAt
  })
})

// Fetch data (will trigger subscription)
await queryClient.fetch({
  queryKey: ['posts', 1],
  queryFn: () => http.get('/posts/1')
})

// Clean up
unsubscribe()
console.log('Unsubscribed')`,
      name: 'Query Client - Subscriptions',
    },
  },
  formit: {
    'create-form': {
      code: `import { createForm } from '@vielzeug/formit'

const form = createForm({
  fields: {
    name: '',
    email: '',
    age: 0
  }
})

console.log('Form created!')
console.log('Initial values:', form.values())
console.log('Name:', form.get('name'))
console.log('Email:', form.get('email'))`,
      name: 'Create Form - Basic Setup',
    },
    'field-binding': {
      code: `import { createForm } from '@vielzeug/formit'

const form = createForm({
  fields: {
    firstName: '',
    lastName: '',
    email: ''
  }
})

// Create bindings (for use with input elements)
const firstNameBind = form.bind('firstName')
const lastNameBind = form.bind('lastName')
const emailBind = form.bind('email')

console.log('Field bindings created:', {
  firstName: firstNameBind.name,
  lastName: lastNameBind.name,
  email: emailBind.name
})

// Simulate input changes
firstNameBind.set('John')
lastNameBind.set('Doe')
emailBind.set('john.doe@example.com')

console.log('Form values:', form.values())

// Check dirty state
console.log('Dirty fields:', {
  firstName: form.dirty('firstName'),
  lastName: form.dirty('lastName'),
  email: form.dirty('email')
})`,
      name: 'Field Binding for Inputs',
    },
    'field-operations': {
      code: `import { createForm } from '@vielzeug/formit'

const form = createForm({
  fields: {
    name: 'Alice',
    age: 25
  }
})

console.log('Initial:', form.values())

// Set single field
form.set('name', 'Bob')
console.log('After set name:', form.get('name'))

// Set multiple fields (merge)
form.set({ name: 'Charlie', age: 30 })
console.log('After merge:', form.values())

// Replace all values
form.set({ name: 'David' }, { replace: true })
console.log('After replace:', form.values())

// Reset to initial
form.reset()
console.log('After reset:', form.values())`,
      name: 'Field Operations - Get/Set',
    },
    'form-submission': {
      code: `import { createForm } from '@vielzeug/formit'

const form = createForm({
  fields: {
    username: {
      value: '',
      validators: (value) => value ? undefined : 'Username is required'
    },
    email: {
      value: '',
      validators: (value) => {
        if (!value) return 'Email is required'
        if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(value))) {
          return 'Invalid email'
        }
      }
    }
  }
})

// Set values
form.set('username', 'johndoe')
form.set('email', 'john@example.com')

// Submit with validation
try {
  const result = await form.submit(async (formData) => {
    const values = Object.fromEntries(formData)
    console.log('Submitting...', values)
    // Simulate API call
    await new Promise(r => setTimeout(r, 500))
    return { success: true, id: 123 }
  })
  
  console.log('✓ Form submitted successfully!', result)
} catch (error) {
  if (error.type === 'validation') {
    console.error('✗ Validation errors:', Object.fromEntries(error.errors))
  } else {
    console.error('✗ Submission error:', error)
  }
}`,
      name: 'Form Submission with Validation',
    },
    'form-subscriptions': {
      code: `import { createForm } from '@vielzeug/formit'

const form = createForm({
  fields: {
    name: '',
    email: '',
    age: 0
  }
})

// Subscribe to all form changes
const unsubscribe = form.subscribe((state) => {
  console.log('Form state changed:', {
    values: form.values(),
    errors: state.errors.size,
    dirty: state.dirty.size,
    isSubmitting: state.isSubmitting
  })
})

// Subscribe to specific field
const unsubEmail = form.subscribeField('email', (field) => {
  console.log('Email field:', {
    value: field.value,
    error: field.error,
    touched: field.touched,
    dirty: field.dirty
  })
})

// Make changes
form.set('name', 'Alice')
form.set('email', 'alice@example.com')
form.set('age', 25)

// Cleanup
setTimeout(() => {
  unsubscribe()
  unsubEmail()
  console.log('Unsubscribed')
}, 100)`,
      name: 'Form Subscriptions - Reactive Updates',
    },
    'form-validation': {
      code: `import { createForm } from '@vielzeug/formit'

const form = createForm({
  fields: {
    email: {
      value: '',
      validators: (value) => {
        if (!value) return 'Email is required'
        if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(value))) {
          return 'Invalid email format'
        }
      }
    },
    password: {
      value: '',
      validators: (value) => {
        if (!value) return 'Password is required'
        if (String(value).length < 8) return 'Min 8 characters'
      }
    },
    confirmPassword: ''
  },
  validate: (formData) => {
    const password = formData.get('password')
    const confirm = formData.get('confirmPassword')
    const errors = new Map()
    
    if (password !== confirm) {
      errors.set('confirmPassword', 'Passwords must match')
    }
    
    return errors
  }
})

// Set values
form.set('email', 'invalid-email')
form.set('password', 'short')
form.set('confirmPassword', 'different')

// Validate
const errors = await form.validate()
console.log('Validation errors:', Object.fromEntries(errors))

// Fix and revalidate
form.set('email', 'user@example.com')
form.set('password', 'password123')
form.set('confirmPassword', 'password123')

const errors2 = await form.validate()
console.log('After fixing:', errors2.size === 0 ? '✓ Valid' : 'Still errors')`,
      name: 'Field & Form Validation',
    },
    'nested-fields': {
      code: `import { createForm } from '@vielzeug/formit'

const form = createForm({})

// Set nested values using dot notation
form.set('user.name', 'Alice')
form.set('user.email', 'alice@example.com')
form.set('user.address.city', 'New York')

console.log('Nested values:', form.values())
console.log('User name:', form.get('user.name'))
console.log('City:', form.get('user.address.city'))

// Arrays
form.set('tags', ['javascript', 'typescript', 'react'])
console.log('Tags:', form.get('tags'))

// Update nested field
form.set('user.address.city', 'San Francisco')
console.log('Updated city:', form.get('user.address.city'))`,
      name: 'Nested Fields - Dot Notation',
    },
    'nested-values': {
      code: `import { createForm } from '@vielzeug/formit'

const form = createForm({
  fields: {
    user: {
      name: 'Alice',
      email: 'alice@example.com',
      profile: {
        age: 25,
        city: 'NYC'
      }
    },
    settings: {
      notifications: true,
      theme: 'dark'
    }
  }
})

console.log('Nested object initialized!')
console.log('User name:', form.get('user.name'))
console.log('User age:', form.get('user.profile.age'))
console.log('City:', form.get('user.profile.city'))
console.log('Theme:', form.get('settings.theme'))

// Update nested values
form.set('user.profile.city', 'San Francisco')
console.log('Updated city:', form.get('user.profile.city'))

// All values (flattened)
console.log('All values:', form.values())`,
      name: 'Nested Values - Auto Flattening',
    },
  },
  i18nit: {
    'array-formatting': {
      code: `import { createI18n } from '@vielzeug/i18nit'

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      list: 'Items: {items}',
      and: 'Choices: {options|and}',
      or: 'Select: {flavors|or}',
      custom: 'Tags: {tags| • }'
    },
    es: {
      list: 'Artículos: {items}',
      and: 'Opciones: {options|and}',
      or: 'Seleccionar: {flavors|or}'
    }
  }
})

const items = ['apple', 'banana', 'orange']
const options = ['red', 'blue', 'green']
const tags = ['javascript', 'typescript', 'react']

console.log(i18n.t('list', { items }))
console.log(i18n.t('and', { options }))
console.log(i18n.t('or', { flavors: ['vanilla', 'chocolate'] }))
console.log(i18n.t('custom', { tags }))

// Switch to Spanish
i18n.setLocale('es')
console.log('\\nSpanish:')
console.log(i18n.t('and', { options }))
console.log(i18n.t('or', { flavors: ['vainilla', 'chocolate'] }))`,
      name: 'Array Formatting with Separators',
    },
    'async-loading': {
      code: `import { createI18n } from '@vielzeug/i18nit'

// Reusable loader function that receives locale as parameter
const loadLocale = async (locale: string) => {
  console.log(\`Loading locale: \${locale}\`)
  // Simulate loading translations from API
  await new Promise(r => setTimeout(r, 500))
  
  const translations: Record<string, any> = {
    es: { greeting: 'Hola', farewell: 'Adiós' },
    fr: { greeting: 'Bonjour', farewell: 'Au revoir' },
    de: { greeting: 'Hallo', farewell: 'Auf Wiedersehen' }
  }
  
  return translations[locale]
}

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: { greeting: 'Hello', farewell: 'Goodbye' }
  },
  loaders: {
    es: loadLocale,  // Receives 'es' as parameter
    fr: loadLocale,  // Receives 'fr' as parameter
    de: loadLocale   // Receives 'de' as parameter
  }
})

console.log('Current:', i18n.t('greeting'))

// Load Spanish
console.log('\\nLoading Spanish...')
await i18n.load('es')
i18n.setLocale('es')
console.log('Spanish:', i18n.t('greeting'))
console.log('Spanish farewell:', i18n.t('farewell'))

// Dynamically register and load German
console.log('\\nDynamically registering German...')
i18n.register('de', loadLocale)
await i18n.load('de')
i18n.setLocale('de')
console.log('German:', i18n.t('greeting'))`,
      name: 'Async Locale Loading',
    },
    'basic-setup': {
      code: `import { createI18n } from '@vielzeug/i18nit'

const i18n = createI18n({
  locale: 'en',
  fallback: 'en',
  messages: {
    en: { 
      hello: 'Hello',
      goodbye: 'Goodbye',
      welcome: 'Welcome, {name}!'
    },
    es: { 
      hello: 'Hola',
      goodbye: 'Adiós',
      welcome: '¡Bienvenido, {name}!'
    }
  }
})

console.log('Current locale:', i18n.getLocale())
console.log('EN:', i18n.t('hello'))

i18n.setLocale('es')
console.log('ES:', i18n.t('hello'))

console.log('With variable:', i18n.t('welcome', { name: 'Alice' }))`,
      name: 'Basic Setup - Initialize i18n',
    },
    'nested-objects': {
      code: `import { createI18n } from '@vielzeug/i18nit'

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      // Flat key
      welcome: 'Welcome!',
      
      // Nested objects for better organization
      user: {
        greeting: 'Hello, {name}!',
        profile: {
          title: 'User Profile',
          settings: 'Profile Settings',
          bio: 'Biography'
        }
      },
      
      // Deep nesting
      app: {
        navigation: {
          menu: {
            home: 'Home',
            about: 'About Us',
            contact: 'Contact'
          }
        }
      }
    },
    es: {
      welcome: '¡Bienvenido!',
      user: {
        greeting: '¡Hola, {name}!',
        profile: {
          title: 'Perfil de Usuario',
          settings: 'Configuración del Perfil',
          bio: 'Biografía'
        }
      },
      app: {
        navigation: {
          menu: {
            home: 'Inicio',
            about: 'Acerca de',
            contact: 'Contacto'
          }
        }
      }
    }
  }
})

// Access with dot notation
console.log('Flat:', i18n.t('welcome'))
console.log('Nested:', i18n.t('user.greeting', { name: 'Alice' }))
console.log('Deep nested:', i18n.t('user.profile.title'))
console.log('Very deep:', i18n.t('app.navigation.menu.home'))

// Use with namespaces for cleaner code
const userNs = i18n.namespace('user')
console.log('\\nWith namespace:')
console.log(userNs.t('greeting', { name: 'Bob' }))
console.log(userNs.t('profile.settings'))

// Switch locale
i18n.setLocale('es')
console.log('\\nSpanish:')
console.log(i18n.t('user.profile.title'))
console.log(i18n.t('app.navigation.menu.home'))`,
      name: 'Nested Message Objects',
    },
    'formatting-helpers': {
      code: `import { createI18n } from '@vielzeug/i18nit'

const i18n = createI18n({ locale: 'en-US' })

// Number formatting
console.log('Number:', i18n.number(1234567.89))
console.log('Currency:', i18n.number(1234.56, {
  style: 'currency',
  currency: 'USD'
}))
console.log('Percent:', i18n.number(0.75, {
  style: 'percent'
}))

// Date formatting
const date = new Date('2024-03-15T10:30:00')
console.log('\\nDate:', i18n.date(date))
console.log('Short:', i18n.date(date, { dateStyle: 'short' }))
console.log('Long:', i18n.date(date, { 
  dateStyle: 'long',
  timeStyle: 'short'
}))

// Different locale
i18n.setLocale('de-DE')
console.log('\\nGerman number:', i18n.number(1234567.89))
console.log('German date:', i18n.date(date))`,
      name: 'Number and Date Formatting',
    },
    namespaces: {
      code: `import { createI18n } from '@vielzeug/i18nit'

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      'common.hello': 'Hello',
      'common.goodbye': 'Goodbye',
      'errors.notFound': 'Not found',
      'errors.unauthorized': 'Unauthorized',
      'nav.home': 'Home',
      'nav.about': 'About'
    }
  }
})

// Use namespace helper
const common = i18n.namespace('common')
const errors = i18n.namespace('errors')
const nav = i18n.namespace('nav')

console.log('Common:', common.t('hello'))
console.log('Errors:', errors.t('notFound'))
console.log('Nav:', nav.t('home'))`,
      name: 'Namespaces for Organization',
    },
    pluralization: {
      code: `import { createI18n } from '@vielzeug/i18nit'

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      items: {
        zero: 'No items',
        one: 'One item',
        other: '{count} items'
      },
      cats: {
        one: '{count} cat',
        other: '{count} cats'
      }
    }
  }
})

console.log(i18n.t('items', { count: 0 }))
console.log(i18n.t('items', { count: 1 }))
console.log(i18n.t('items', { count: 5 }))

console.log(i18n.t('cats', { count: 1 }))
console.log(i18n.t('cats', { count: 3 }))`,
      name: 'Pluralization Rules',
    },
    'preload-pattern': {
      code: `import { createI18n } from '@vielzeug/i18nit'

// Reusable loader function
const loadTranslations = async (locale: string) => {
  // Simulate API call
  await new Promise(r => setTimeout(r, 300))
  const translations: Record<string, any> = {
    en: { greeting: 'Hello', welcome: 'Welcome!' },
    es: { greeting: 'Hola', welcome: '¡Bienvenido!' },
    fr: { greeting: 'Bonjour', welcome: 'Bienvenue!' }
  }
  return translations[locale]
}

// App initialization - configure loaders
const i18n = createI18n({
  locale: 'en',
  loaders: {
    en: loadTranslations,
    es: loadTranslations,
    fr: loadTranslations
  }
})

// Preload all locales at app startup
console.log('Preloading locales...')
await Promise.all([
  i18n.load('en'),
  i18n.load('es'),
  i18n.load('fr')
])
console.log('✓ All locales loaded!\\n')

// Now use sync t() everywhere - no await needed!
console.log('EN:', i18n.t('greeting'))

i18n.setLocale('es')
console.log('ES:', i18n.t('greeting'))

i18n.setLocale('fr')
console.log('FR:', i18n.t('greeting'))

// Perfect for React/Vue components
console.log('\\nIn component:')
console.log(i18n.t('welcome')) // No await! ✨`,
      name: 'Preload Pattern (Recommended)',
    },
    'variable-interpolation': {
      code: `import { createI18n } from '@vielzeug/i18nit'

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      greeting: 'Hello, {name}!',
      info: 'You are {age} years old',
      path: 'Nested: {user.name} at {user.address.city}',
      count: 'You have {items.length} items'
    }
  }
})

console.log(i18n.t('greeting', { name: 'Bob' }))
console.log(i18n.t('info', { age: 30 }))
console.log(i18n.t('path', { 
  user: { name: 'Alice', address: { city: 'NYC' } }
}))
console.log(i18n.t('count', { items: ['a', 'b', 'c'] }))`,
      name: 'Variable Interpolation',
    },
  },
  logit: {
    'basic-logging': {
      code: `import { Logit } from '@vielzeug/logit'

Logit.debug('Debug message')
Logit.info('Info message')
Logit.success('Success message!')
Logit.warn('Warning message')
Logit.error('Error message')

console.log('Check your browser console for styled output!')`,
      name: 'Basic Logging',
    },
    configuration: {
      code: `import { Logit } from '@vielzeug/logit'

// Configure Logit
Logit.setup({
  variant: 'symbol', // 'text' | 'symbol' | 'icon'
  logLevel: 'debug',
  environment: true,
  timestamp: true
})

Logit.info('Configured with symbols')

// Change variant
Logit.setVariant('text')
Logit.info('Now using text variant')

Logit.setVariant('icon')
Logit.info('Now using icon variant')

// Toggle environment indicator
Logit.toggleEnvironment(false)
Logit.info('Environment indicator hidden')

console.log('Check browser console!')`,
      name: 'Configuration Options',
    },
    'data-logging': {
      code: `import { Logit } from '@vielzeug/logit'

const user = {
  id: 1,
  name: 'Alice',
  email: 'alice@example.com',
  metadata: {
    role: 'admin',
    lastLogin: new Date()
  }
}

Logit.info('User object:', user)

const array = [1, 2, 3, 4, 5]
Logit.debug('Array data:', array)

Logit.table({ Name: 'Alice', Age: 30, Role: 'Admin' })

console.log('Check browser console for formatted data!')`,
      name: 'Logging Objects and Data',
    },
    'log-levels': {
      code: `import { Logit } from '@vielzeug/logit'

// Get current level
console.log('Current level:', Logit.getLevel())

// Set to only show warnings and errors
Logit.setLogLevel('warn')

Logit.debug('This will not appear')
Logit.info('This will not appear')
Logit.warn('This will appear')
Logit.error('This will appear')

// Reset to show all
Logit.setLogLevel('debug')
console.log('\\nAll logs enabled again')`,
      name: 'Log Levels',
    },
    'scoped-logging': {
      code: `import { Logit } from '@vielzeug/logit'

// Create scoped loggers
const apiLogger = Logit.scope('API')
const dbLogger = Logit.scope('Database')
const authLogger = Logit.scope('Auth')

apiLogger.info('Making HTTP request')
dbLogger.success('Connected to database')
authLogger.warn('Token expiring soon')
apiLogger.error('Request failed')

console.log('Check browser console for scoped output!')`,
      name: 'Scoped Logging',
    },
  },
  permit: {
    'basic-setup': {
      code: `import { Permit } from '@vielzeug/permit'

// Register permissions for different roles
Permit.register('admin', 'users', {
  read: true, 
  create: true, 
  update: true, 
  delete: true
})

Permit.register('user', 'profile', {
  read: true,
  update: true
})

Permit.register('guest', 'posts', {
  read: true
})

console.log('Permissions registered!')
console.log('Roles:', Permit.roles)`,
      name: 'Basic Setup - Role Permissions',
    },
    'dynamic-permissions': {
      code: `import { Permit } from '@vielzeug/permit'

// Register function-based permissions
Permit.register('user', 'posts', {
  read: true,
  create: true,
  update: (user, data) => user.id === data.authorId,
  delete: (user, data) => user.id === data.authorId
})

const user1 = { id: 'user1', roles: ['user'] }
const user2 = { id: 'user2', roles: ['user'] }

const post = {
  id: 'post1',
  authorId: 'user1',
  title: 'My Post'
}

// User 1 (author) can update and delete
console.log('Author can update:', 
  Permit.check(user1, 'posts', 'update', post))
console.log('Author can delete:', 
  Permit.check(user1, 'posts', 'delete', post))

// User 2 (not author) cannot update or delete
console.log('\\nNon-author can update:', 
  Permit.check(user2, 'posts', 'update', post))
console.log('Non-author can delete:', 
  Permit.check(user2, 'posts', 'delete', post))`,
      name: 'Dynamic Permissions - Functions',
    },
    'permission-checks': {
      code: `import { Permit } from '@vielzeug/permit'

// Setup permissions
Permit.register('editor', 'articles', {
  read: true,
  create: true,
  update: true,
  delete: false
})

Permit.register('viewer', 'articles', {
  read: true
})

// Define users
const editor = { id: '1', roles: ['editor'] }
const viewer = { id: '2', roles: ['viewer'] }

// Check permissions
console.log('Editor can read:', Permit.check(editor, 'articles', 'read'))
console.log('Editor can create:', Permit.check(editor, 'articles', 'create'))
console.log('Editor can delete:', Permit.check(editor, 'articles', 'delete'))

console.log('\\nViewer can read:', Permit.check(viewer, 'articles', 'read'))
console.log('Viewer can create:', Permit.check(viewer, 'articles', 'create'))`,
      name: 'Permission Checks',
    },
    'permission-management': {
      code: `import { Permit } from '@vielzeug/permit'

// Register initial permissions
Permit.register('user', 'comments', {
  read: true,
  create: true
})

console.log('Initial permissions registered')

// Update permissions (merge)
Permit.set('user', 'comments', {
  update: true
}, false) // false = merge

console.log('Permissions updated (merged)')

// Replace permissions
Permit.set('user', 'comments', {
  read: true,
  delete: true
}, true) // true = replace

console.log('Permissions replaced')

// Unregister specific action
Permit.unregister('user', 'comments', 'delete')
console.log('Delete permission removed')

// Clear all
Permit.clear()
console.log('All permissions cleared')`,
      name: 'Permission Management',
    },
    'role-hierarchy': {
      code: `import { Permit } from '@vielzeug/permit'

// Setup role hierarchy
Permit.register('admin', 'users', {
  read: true, create: true, update: true, delete: true
})

Permit.register('moderator', 'posts', {
  read: true, update: true, delete: true
})

Permit.register('editor', 'posts', {
  read: true, update: true
})

// User with multiple roles
const userWithMultipleRoles = {
  id: '1',
  roles: ['editor', 'moderator']
}

// Check permission (any role grants access)
console.log('Can read posts:', 
  Permit.check(userWithMultipleRoles, 'posts', 'read'))
console.log('Can delete posts:', 
  Permit.check(userWithMultipleRoles, 'posts', 'delete'))

// Check role membership
console.log('\\nHas editor role:', 
  Permit.hasRole(userWithMultipleRoles, 'editor'))
console.log('Has admin role:', 
  Permit.hasRole(userWithMultipleRoles, 'admin'))`,
      name: 'Role Hierarchy & Multiple Roles',
    },
    'wildcard-permissions': {
      code: `import { Permit, WILDCARD } from '@vielzeug/permit'

// Admin has access to all resources
Permit.register('admin', WILDCARD, {
  read: true,
  create: true,
  update: true,
  delete: true
})

// Regular user has limited access
Permit.register('user', 'posts', {
  read: true
})

const admin = { id: '1', roles: ['admin'] }
const user = { id: '2', roles: ['user'] }

// Admin can access any resource
console.log('Admin on users:', Permit.check(admin, 'users', 'delete'))
console.log('Admin on posts:', Permit.check(admin, 'posts', 'delete'))
console.log('Admin on comments:', Permit.check(admin, 'comments', 'delete'))

// User has limited access
console.log('\\nUser on posts read:', Permit.check(user, 'posts', 'read'))
console.log('User on posts delete:', Permit.check(user, 'posts', 'delete'))`,
      name: 'Wildcard Permissions',
    },
  },
  routeit: {
    'basic-routing': {
      code: `import { createRouter } from '@vielzeug/routeit'

const router = createRouter()

router
  .get('/', () => {
    console.log('Home page')
  })
  .get('/about', () => {
    console.log('About page')
  })
  .get('/users/:id', ({ params }) => {
    console.log('User page - ID:', params.id)
  })
  .start()

// Navigate
console.log('Navigating to home...')
router.navigate('/')

console.log('\\nNavigating to about...')
router.navigate('/about')

console.log('\\nNavigating to user 123...')
router.navigate('/users/123')`,
      name: 'Basic Routing - Simple Navigation',
    },
    'middleware-auth': {
      code: `import { createRouter } from '@vielzeug/routeit'

// Mock auth service
const authService = {
  currentUser: { id: 1, name: 'Alice', roles: ['user'] },
  isAuthenticated: true
}

// Auth middleware
const requireAuth = async (ctx, next) => {
  if (!authService.isAuthenticated) {
    console.log('❌ Not authenticated, redirecting to login')
    ctx.navigate('/login')
    return
  }
  
  ctx.user = authService.currentUser
  console.log('✅ Authenticated as:', ctx.user.name)
  await next()
}

const router = createRouter()

router
  .get('/login', () => {
    console.log('📝 Login page')
  })
  .route({
    path: '/dashboard',
    middleware: requireAuth,
    handler: (ctx) => {
      console.log('📊 Dashboard - Welcome,', ctx.user.name)
    }
  })
  .route({
    path: '/profile',
    middleware: requireAuth,
    handler: (ctx) => {
      console.log('👤 Profile for:', ctx.user.name)
      console.log('   User ID:', ctx.user.id)
      console.log('   Roles:', ctx.user.roles)
    }
  })
  .start()

// Try accessing protected routes
console.log('\\n--- Accessing Dashboard ---')
router.navigate('/dashboard')

console.log('\\n--- Accessing Profile ---')
router.navigate('/profile')`,
      name: 'Middleware - Authentication',
    },
    'middleware-chain': {
      code: `import { createRouter } from '@vielzeug/routeit'

// Logger middleware
const logger = async (ctx, next) => {
  console.log('📝 Logger:', ctx.pathname)
  await next()
  console.log('✅ Logger: Done')
}

// Auth middleware
const auth = async (ctx, next) => {
  console.log('  🔐 Auth: Checking...')
  ctx.user = { id: 1, name: 'Alice', role: 'admin' }
  await next()
}

// Permission middleware
const requireAdmin = async (ctx, next) => {
  console.log('    👮 Permission: Checking admin...')
  if (ctx.user?.role !== 'admin') {
    console.log('    ❌ Permission denied')
    return
  }
  console.log('    ✅ Admin verified')
  await next()
}

// Data loader middleware
const loadData = async (ctx, next) => {
  console.log('      📦 Loading data...')
  ctx.meta = { loaded: true, timestamp: Date.now() }
  await next()
}

const router = createRouter({ middleware: [logger] })

router
  .route({
    path: '/admin/panel',
    middleware: [auth, requireAdmin, loadData],
    handler: (ctx) => {
      console.log('        🎯 Handler: Admin panel')
      console.log('        User:', ctx.user?.name)
      console.log('        Data loaded:', ctx.meta?.loaded)
    }
  })
  .start()

console.log('Execution order:')
console.log('Global → Route → Handler\\n')
router.navigate('/admin/panel')`,
      name: 'Middleware Chain - Execution Flow',
    },
    'named-routes': {
      code: `import { createRouter } from '@vielzeug/routeit'

const router = createRouter()

router
  .route({
    path: '/',
    name: 'home',
    handler: () => console.log('🏠 Home')
  })
  .route({
    path: '/users/:id',
    name: 'userDetail',
    handler: ({ params }) => {
      console.log('👤 User Detail - ID:', params.id)
    }
  })
  .route({
    path: '/posts/:postId/comments/:commentId',
    name: 'postComment',
    handler: ({ params }) => {
      console.log('💬 Post:', params.postId, 'Comment:', params.commentId)
    }
  })
  .start()

// Navigate by name
console.log('Navigate to home:')
router.navigateTo('home')

console.log('\\nNavigate to user 42:')
router.navigateTo('userDetail', { id: '42' })

console.log('\\nNavigate to post comment:')
router.navigateTo('postComment', { postId: '5', commentId: '12' })

// Build URLs
console.log('\\n--- Building URLs ---')
console.log('User 123 URL:', router.urlFor('userDetail', { id: '123' }))
console.log('Comment URL:', router.urlFor('postComment', { 
  postId: '10', 
  commentId: '50' 
}))`,
      name: 'Named Routes - Type-Safe Navigation',
    },
    'nested-routes': {
      code: `import { createRouter } from '@vielzeug/routeit'

const router = createRouter()

router
  .route({
    path: '/admin',
    handler: () => {
      console.log('📂 Admin section')
    },
    children: [
      {
        path: '/dashboard',
        handler: () => {
          console.log('  📊 Admin Dashboard')
        }
      },
      {
        path: '/users',
        handler: () => {
          console.log('  👥 User Management')
        }
      },
      {
        path: '/settings',
        handler: () => {
          console.log('  ⚙️ Admin Settings')
        }
      }
    ]
  })
  .route({
    path: '/blog',
    handler: () => {
      console.log('📝 Blog section')
    },
    children: [
      {
        path: '/posts/:id',
        handler: ({ params }) => {
          console.log('  📄 Post:', params.id)
        }
      },
      {
        path: '/categories/:category',
        handler: ({ params }) => {
          console.log('  🏷️ Category:', params.category)
        }
      }
    ]
  })
  .start()

// Navigate to nested routes
console.log('Admin routes:')
router.navigate('/admin/dashboard')
router.navigate('/admin/users')
router.navigate('/admin/settings')

console.log('\\nBlog routes:')
router.navigate('/blog/posts/123')
router.navigate('/blog/categories/javascript')`,
      name: 'Nested Routes - Route Hierarchy',
    },
    'query-params': {
      code: `import { createRouter } from '@vielzeug/routeit'

const router = createRouter()

router
  .get('/search', ({ query }) => {
    console.log('🔍 Search page')
    console.log('   Query:', query.q)
    console.log('   Page:', query.page || '1')
    console.log('   Sort:', query.sort || 'relevance')
  })
  .get('/products', ({ query, params }) => {
    console.log('🛍️ Products page')
    console.log('   Category:', query.category)
    console.log('   Price range:', query.min, '-', query.max)
    console.log('   Tags:', query.tags) // Array support
  })
  .get('/users/:id/posts', ({ params, query }) => {
    console.log('📝 User posts')
    console.log('   User ID:', params.id)
    console.log('   Status:', query.status)
    console.log('   Limit:', query.limit || '10')
  })
  .start()

// Navigate with query params
console.log('Search with query:')
router.navigate('/search?q=typescript&page=2&sort=recent')

console.log('\\nProducts with filters:')
router.navigate('/products?category=electronics&min=100&max=500&tags=sale&tags=new')

console.log('\\nUser posts:')
router.navigate('/users/42/posts?status=published&limit=20')`,
      name: 'Query Parameters - URL Parsing',
    },
    'route-context': {
      code: `import { createRouter } from '@vielzeug/routeit'

const router = createRouter()

router
  .route({
    path: '/users/:userId/posts/:postId',
    data: {
      title: 'Post Detail',
      requiresAuth: true,
      breadcrumbs: ['Home', 'Users', 'Posts']
    },
    middleware: async (ctx, next) => {
      // Add custom metadata
      ctx.meta = {
        startTime: Date.now(),
        environment: 'production'
      }
      
      // Simulate user loading
      ctx.user = {
        id: parseInt(ctx.params.userId),
        name: 'Alice'
      }
      
      await next()
      
      // Log after handler
      const elapsed = Date.now() - ctx.meta.startTime
      console.log(\`\\n⏱️ Took \${elapsed}ms\`)
    },
    handler: (ctx) => {
      console.log('📄 Route Context:')
      console.log('   Pathname:', ctx.pathname)
      console.log('   Params:', ctx.params)
      console.log('   Data:', ctx.data)
      console.log('   User:', ctx.user)
      console.log('   Meta:', ctx.meta)
    }
  })
  .start()

router.navigate('/users/42/posts/123?tab=comments&sort=recent')`,
      name: 'Route Context - Full Context Access',
    },
    'url-building': {
      code: `import { createRouter } from '@vielzeug/routeit'

const router = createRouter({ base: '/app' })

router
  .route({
    path: '/users/:id',
    name: 'user',
    handler: () => {}
  })
  .route({
    path: '/posts/:postId/comments/:commentId',
    name: 'comment',
    handler: () => {}
  })
  .start()

console.log('🔗 URL Building Examples:\\n')

// Build with params
const userUrl = router.buildUrl('/users/:id', { id: '123' })
console.log('User URL:', userUrl)

// Build with query params
const searchUrl = router.buildUrl('/search', undefined, {
  q: 'typescript',
  page: '2',
  tags: ['tutorial', 'advanced']
})
console.log('Search URL:', searchUrl)

// Build with both
const profileUrl = router.buildUrl(
  '/users/:id',
  { id: '456' },
  { tab: 'posts', sort: 'recent' }
)
console.log('Profile URL:', profileUrl)

// Named routes
const commentUrl = router.urlFor('comment', {
  postId: '10',
  commentId: '25'
})
console.log('Comment URL:', commentUrl)

// Named route with query
const userPostsUrl = router.urlFor('user', { id: '789' })
console.log('User posts URL:', userPostsUrl)`,
      name: 'URL Building - Dynamic URLs',
    },
  },
  stateit: {
    'basic-state': {
      code: `import { createState } from '@vielzeug/stateit'

// Create a simple counter state
const counter = createState({ count: 0, name: 'Counter' })

// Subscribe to changes
counter.subscribe((current, prev) => {
  console.log(\`Count: \${prev.count} → \${current.count}\`)
})

// Update state - partial merge
console.log('Initial:', counter.get())
counter.set({ count: 1 })
counter.set({ count: 2 })

// Update with function
counter.set((state) => ({ count: state.count + 1 }))

// Reset to initial
counter.reset()
console.log('After reset:', counter.get())`,
      name: 'Basic State - Counter',
    },
    'selective-subscription': {
      code: `import { createState } from '@vielzeug/stateit'

const user = createState({
  name: 'Alice',
  age: 30,
  email: 'alice@example.com'
})

// Subscribe to specific field only
user.subscribe(
  (state) => state.name,
  (name, prevName) => {
    console.log(\`Name changed: \${prevName} → \${name}\`)
  }
)

// Subscribe to computed value
user.subscribe(
  (state) => state.age >= 18,
  (isAdult) => {
    console.log('Is adult:', isAdult)
  }
)

// Only name changes trigger name subscription
user.set({ name: 'Bob' }) // Triggers name subscriber
user.set({ age: 31 }) // Doesn't trigger name subscriber
user.set({ email: 'bob@example.com' }) // No name change
user.set({ name: 'Charlie', age: 25 }) // Triggers both`,
      name: 'Selective Subscriptions',
    },
    'get-with-selector': {
      code: `import { createState } from '@vielzeug/stateit'

const user = createState({
  firstName: 'Alice',
  lastName: 'Johnson',
  age: 30,
  address: {
    city: 'New York',
    country: 'USA'
  }
})

// Get full state
console.log('Full state:', user.get())

// Get with selector - computed value
const fullName = user.get((s) => \`\${s.firstName} \${s.lastName}\`)
console.log('Full name:', fullName)

// Get nested property
const city = user.get((s) => s.address.city)
console.log('City:', city)

// Get multiple derived values
const summary = user.get((s) => ({
  name: \`\${s.firstName} \${s.lastName}\`,
  location: \`\${s.address.city}, \${s.address.country}\`,
  isAdult: s.age >= 18
}))
console.log('Summary:', summary)`,
      name: 'Get with Selector',
    },
    'async-updates': {
      code: `import { createState } from '@vielzeug/stateit'

const data = createState({
  items: null,
  loading: false,
  error: null
})

// Subscribe to loading state
data.subscribe(
  (state) => state.loading,
  (loading) => console.log('Loading:', loading)
)

// Async fetch with loading states
async function fetchItems() {
  data.set({ loading: true, error: null })
  
  try {
    // Use async updater
    await data.set(async (current) => {
      // Simulate API call
      await new Promise(r => setTimeout(r, 1000))
      const items = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' }
      ]
      return { ...current, items, loading: false }
    })
    
    console.log('Success! Items:', data.get().items)
  } catch (error) {
    data.set({ error: error.message, loading: false })
    console.error('Error:', error)
  }
}

await fetchItems()`,
      name: 'Async State Updates',
    },
    'computed-values': {
      code: `import { createState } from '@vielzeug/stateit'

const cart = createState({
  items: [
    { id: 1, name: 'Apple', price: 1.5, quantity: 2 },
    { id: 2, name: 'Banana', price: 0.8, quantity: 3 }
  ],
  taxRate: 0.1
})

// Subscribe to computed total
cart.subscribe(
  (state) => {
    const subtotal = state.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    )
    const tax = subtotal * state.taxRate
    return subtotal + tax
  },
  (total) => {
    console.log('Cart total: $' + total.toFixed(2))
  }
)

// Initial total logged above

// Update cart - add item
cart.set((state) => ({
  items: [
    ...state.items,
    { id: 3, name: 'Orange', price: 1.2, quantity: 4 }
  ]
}))

// Update tax rate
cart.set({ taxRate: 0.15 })`,
      name: 'Computed Values',
    },
    'scoped-states': {
      code: `import { createState } from '@vielzeug/stateit'

const app = createState({
  theme: 'light',
  language: 'en',
  user: 'Alice'
})

// Create child state with overrides
const draft = app.createChild({
  theme: 'dark'
})

console.log('Parent theme:', app.get().theme) // 'light'
console.log('Child theme:', draft.get().theme) // 'dark'

// Child changes don't affect parent
draft.set({ language: 'es', user: 'Bob' })
console.log('\\nAfter child update:')
console.log('Parent:', app.get())
console.log('Child:', draft.get())

// Run in isolated scope
const result = await app.runInScope(
  async (scoped) => {
    scoped.set({ theme: 'dark', user: 'Temporary' })
    console.log('\\nScoped state:', scoped.get())
    return 'completed'
  }
)

console.log('\\nAfter scope:')
console.log('Parent unchanged:', app.get())
console.log('Result:', result)`,
      name: 'Scoped States',
    },
    'custom-equality': {
      code: `import { createState } from '@vielzeug/stateit'

const state = createState({
  items: [1, 2, 3],
  metadata: { updated: Date.now() }
})

// Subscribe with custom equality - only notify if length changes
state.subscribe(
  (state) => state.items,
  (items) => {
    console.log('Items array changed:', items)
  },
  {
    equality: (a, b) => a.length === b.length
  }
)

// Won't trigger (same length)
state.set({ items: [4, 5, 6] })
console.log('After replacing items (same length) - no log above')

// Will trigger (different length)
state.set({ items: [1, 2, 3, 4] })
console.log('After adding item - logged above')

// Won't trigger (metadata change doesn't affect items)
state.set({ metadata: { updated: Date.now() } })`,
      name: 'Custom Equality Functions',
    },
    'todo-list': {
      code: `import { createState } from '@vielzeug/stateit'

const todos = createState({
  items: [],
  filter: 'all' // 'all' | 'active' | 'completed'
})

// Subscribe to filtered todos
todos.subscribe(
  (state) => {
    const { items, filter } = state
    switch (filter) {
      case 'active':
        return items.filter(t => !t.completed)
      case 'completed':
        return items.filter(t => t.completed)
      default:
        return items
    }
  },
  (filtered) => {
    console.log(\`\${todos.get().filter} todos (\${filtered.length}):\`, filtered)
  }
)

// Add todos
const items = [
  { id: 1, text: 'Learn Stateit', completed: false },
  { id: 2, text: 'Build app', completed: false },
  { id: 3, text: 'Deploy', completed: true }
]
todos.set({ items })

// Filter to active only
todos.set({ filter: 'active' })

// Complete a todo
todos.set((state) => ({
  items: state.items.map(t =>
    t.id === 2 ? { ...t, completed: true } : t
  )
}))

// Show completed
todos.set({ filter: 'completed' })`,
      name: 'Todo List Example',
    },
    'computed-values': {
      code: `import { createState } from '@vielzeug/stateit'

const cart = createState({
  items: [
    { id: 1, name: 'Apple', price: 1.5, quantity: 2 },
    { id: 2, name: 'Banana', price: 0.8, quantity: 3 }
  ],
  taxRate: 0.1
})

// Create computed values
const subtotal = cart.computed((state) =>
  state.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
)

const tax = cart.computed((state) => subtotal.get() * state.taxRate)
const total = cart.computed(() => subtotal.get() + tax.get())

console.log('Subtotal:', subtotal.get().toFixed(2))
console.log('Tax:', tax.get().toFixed(2))
console.log('Total:', total.get().toFixed(2))

// Subscribe to changes
total.subscribe((current, prev) => {
  console.log(\`Total: $\${prev.toFixed(2)} → $\${current.toFixed(2)}\`)
})

// Add item - auto-updates
cart.set((state) => ({
  items: [...state.items, { id: 3, name: 'Orange', price: 1.2, quantity: 4 }]
}))

console.log('\\nNew Total:', total.get().toFixed(2))`,
      name: 'Computed Values',
    },
    'transactions': {
      code: `import { createState } from '@vielzeug/stateit'

const user = createState({
  name: 'Alice',
  age: 30,
  email: 'alice@example.com'
})

let count = 0
user.subscribe(() => {
  count++
  console.log(\`Update #\${count}\`)
})

console.log('=== Without transaction ===')
count = 0
user.set({ name: 'Bob' })
user.set({ age: 31 })
user.set({ email: 'bob@example.com' })
console.log(\`Updates: \${count}\`)

console.log(\`\\n=== With transaction ===\`)
count = 0
user.transaction(() => {
  user.set({ name: 'Charlie' })
  user.set({ age: 25 })
  user.set({ email: 'charlie@example.com' })
})
console.log(\`Updates: \${count}\`)
console.log('Final:', user.get())`,
      name: 'Transactions',
    },
  },
  toolkit: {
    'array-chunk': {
      code: `import { chunk } from '@vielzeug/toolkit'

const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

console.log('Original:', numbers)
console.log('Chunks of 3:', chunk(numbers, 3))
console.log('Chunks of 4:', chunk(numbers, 4))

// Practical use case: Batch processing
const userIds = [101, 102, 103, 104, 105, 106, 107, 108]
const batches = chunk(userIds, 3)
console.log('User ID batches:', batches)`,
      name: 'chunk - Split array into chunks',
    },
    'array-filter': {
      code: `import { filter } from '@vielzeug/toolkit'

const users = [
  { name: 'Alice', age: 25, active: true },
  { name: 'Bob', age: 30, active: false },
  { name: 'Charlie', age: 35, active: true },
  { name: 'David', age: 28, active: true }
]

const activeUsers = filter(users, u => u.active)
console.log('Active users:', activeUsers)

const over30 = filter(users, u => u.age > 30)
console.log('Users over 30:', over30)

// Async filter support
const asyncFiltered = await filter(users, async (u) => {
  await new Promise(r => setTimeout(r, 10))
  return u.age >= 28
})
console.log('Async filtered:', asyncFiltered)`,
      name: 'filter - Filter array elements',
    },
    'array-group': {
      code: `import { group } from '@vielzeug/toolkit'

const items = [
  { type: 'fruit', name: 'apple', price: 1.2 },
  { type: 'vegetable', name: 'carrot', price: 0.8 },
  { type: 'fruit', name: 'banana', price: 0.5 },
  { type: 'vegetable', name: 'broccoli', price: 1.5 },
  { type: 'fruit', name: 'orange', price: 0.9 }
]

const byType = group(items, item => item.type)
console.log('Grouped by type:', byType)

// Group by price range
const byPriceRange = group(items, item => 
  item.price < 1 ? 'cheap' : 'expensive'
)
console.log('Grouped by price:', byPriceRange)`,
      name: 'group - Group array by key',
    },
    'array-map': {
      code: `import { map } from '@vielzeug/toolkit'

const numbers = [1, 2, 3, 4, 5]

const doubled = map(numbers, n => n * 2)
console.log('Doubled:', doubled)

const strings = map(numbers, n => \`Number: \${n}\`)
console.log('Formatted:', strings)

// Async map support
const asyncMapped = await map(numbers, async (n) => {
  await new Promise(r => setTimeout(r, 10))
  return n * 3
})
console.log('Async tripled:', asyncMapped)`,
      name: 'map - Transform array elements',
    },
    'array-search': {
      code: `import { search } from '@vielzeug/toolkit'

const users = [
  { name: 'Alice Johnson', email: 'alice@example.com', role: 'admin' },
  { name: 'Bob Smith', email: 'bob@example.com', role: 'user' },
  { name: 'Charlie Brown', email: 'charlie@example.com', role: 'user' },
  { name: 'David Miller', email: 'david@example.com', role: 'moderator' }
]

const results1 = search(users, 'alice')
console.log('Search "alice":', results1)

const results2 = search(users, 'smith')
console.log('Search "smith":', results2)

const results3 = search(users, 'admin')
console.log('Search "admin":', results3)`,
      name: 'search - Fuzzy search in arrays',
    },
    'array-uniq': {
      code: `import { uniq } from '@vielzeug/toolkit'

const numbers = [1, 2, 2, 3, 3, 3, 4, 5, 5]
console.log('Unique numbers:', uniq(numbers))

const tags = ['javascript', 'react', 'vue', 'react', 'angular', 'vue']
console.log('Unique tags:', uniq(tags))

// Works with objects too (by reference)
const obj1 = { id: 1 }
const obj2 = { id: 2 }
const objects = [obj1, obj2, obj1, obj2]
console.log('Unique objects:', uniq(objects))`,
      name: 'uniq - Remove duplicates',
    },
    'async-parallel': {
      code: `import { parallel } from '@vielzeug/toolkit'

const items = [1, 2, 3, 4, 5, 6, 7, 8]

// Process 2 items at a time
const results = await parallel(2, items, async (item) => {
  console.log(\`Processing: \${item}\`)
  await new Promise(r => setTimeout(r, 100))
  return item * 2
})

console.log('Results:', results)`,
      name: 'parallel - Controlled parallel execution',
    },
    'async-pool': {
      code: `import { pool } from '@vielzeug/toolkit'

const tasks = Array.from({ length: 10 }, (_, i) =>
  async () => {
    console.log(\`Task \${i + 1} started\`)
    await new Promise(r => setTimeout(r, 100))
    return \`Result \${i + 1}\`
  }
)

// Run max 3 tasks in parallel
const results = await pool(3, tasks)
console.log('All results:', results)`,
      name: 'pool - Parallel execution with concurrency limit',
    },
    'async-queue': {
      code: `import { queue } from '@vielzeug/toolkit'

const tasks = [
  () => new Promise(r => setTimeout(() => r('Task 1'), 100)),
  () => new Promise(r => setTimeout(() => r('Task 2'), 50)),
  () => new Promise(r => setTimeout(() => r('Task 3'), 75))
]

console.log('Starting queue...')
const results = await queue(tasks)
console.log('Queue completed:', results)`,
      name: 'queue - Sequential async execution',
    },
    'async-retry': {
      code: `import { retry } from '@vielzeug/toolkit'

let attempts = 0
const unreliableOperation = async () => {
  attempts++
  console.log(\`Attempt #\${attempts}\`)
  
  if (attempts < 3) {
    throw new Error('Failed!')
  }
  
  return 'Success!'
}

try {
  const result = await retry(unreliableOperation, {
    times: 5,
    delay: 100
  })
  console.log('Result:', result)
  console.log('Total attempts:', attempts)
} catch (err) {
  console.error('All retries failed:', err.message)
}`,
      name: 'retry - Retry failed operations',
    },
    'function-curry': {
      code: `import { curry } from '@vielzeug/toolkit'

const add = (a, b, c) => a + b + c

const curriedAdd = curry(add)

console.log('All at once:', curriedAdd(1, 2, 3))
console.log('One by one:', curriedAdd(1)(2)(3))
console.log('Partially:', curriedAdd(1, 2)(3))

// Practical use case
const greet = curry((greeting, name, punctuation) =>
  \`\${greeting}, \${name}\${punctuation}\`
)

const sayHello = greet('Hello')
const sayHelloToUser = sayHello('User')

console.log(sayHelloToUser('!'))
console.log(sayHelloToUser('.'))`,
      name: 'curry - Curry functions',
    },
    'function-debounce': {
      code: `import { debounce } from '@vielzeug/toolkit'

let searchCount = 0
const handleSearch = (query) => {
  searchCount++
  console.log(\`Search #\${searchCount}: "\${query}"\`)
}

const debouncedSearch = debounce(handleSearch, 300)

// Only the last call within 300ms will execute
debouncedSearch('c')
debouncedSearch('ca')
debouncedSearch('cat')

setTimeout(() => {
  console.log('Final search count:', searchCount) // Should be 1
}, 500)`,
      name: 'debounce - Debounce function',
    },
    'function-pipe': {
      code: `import { pipe, compose } from '@vielzeug/toolkit'

const add5 = (n) => n + 5
const multiply2 = (n) => n * 2
const square = (n) => n * n

// Pipe: left to right
const pipeResult = pipe(
  () => 3,
  add5,      // 3 + 5 = 8
  multiply2, // 8 * 2 = 16
  square     // 16 * 16 = 256
)

console.log('Pipe result:', pipeResult())

// Compose: right to left
const composeResult = compose(
  square,     // last
  multiply2,
  add5        // first
)

console.log('Compose result:', composeResult(3)) // Same result`,
      name: 'pipe - Compose functions',
    },
    'function-throttle': {
      code: `import { throttle } from '@vielzeug/toolkit'

let scrollCount = 0
const handleScroll = () => {
  scrollCount++
  console.log(\`Scroll event #\${scrollCount}\`)
}

const throttledScroll = throttle(handleScroll, 200)

// Simulate rapid scroll events
for (let i = 0; i < 10; i++) {
  setTimeout(() => throttledScroll(), i * 50)
}

setTimeout(() => {
  console.log('Total throttled calls:', scrollCount)
}, 1000)`,
      name: 'throttle - Throttle function calls',
    },
    'math-average': {
      code: `import { average, sum, min, max, median } from '@vielzeug/toolkit'

const numbers = [10, 20, 30, 40, 50]
console.log('Numbers:', numbers)
console.log('Average:', average(numbers))
console.log('Sum:', sum(numbers))
console.log('Min:', min(numbers))
console.log('Max:', max(numbers))
console.log('Median:', median(numbers))

const grades = [85, 90, 78, 92, 88]
console.log('\\nGrades:', grades)
console.log('Average grade:', average(grades).toFixed(2))`,
      name: 'average - Calculate average',
    },
    'object-clone': {
      code: `import { clone } from '@vielzeug/toolkit'

const original = { 
  a: 1, 
  b: { c: 2, d: [3, 4] },
  date: new Date(),
  regex: /test/g
}
const copy = clone(original)

copy.b.c = 99
copy.b.d.push(5)

console.log('Original:', original)
console.log('Copy:', copy)
console.log('Deep equal:', original.b.c === 2) // true`,
      name: 'clone - Deep clone object',
    },
    'object-diff': {
      code: `import { diff } from '@vielzeug/toolkit'

const before = {
  name: 'Alice',
  age: 25,
  email: 'alice@old.com',
  settings: { theme: 'light', lang: 'en' }
}

const after = {
  name: 'Alice',
  age: 26,
  email: 'alice@new.com',
  settings: { theme: 'dark', lang: 'en' }
}

const changes = diff(before, after)
console.log('Changes detected:', changes)`,
      name: 'diff - Compare objects',
    },
    'object-merge': {
      code: `import { merge } from '@vielzeug/toolkit'

const obj1 = { a: 1, b: { c: 2 }, d: [1, 2] }
const obj2 = { b: { d: 3 }, e: 4, d: [3, 4] }
const obj3 = { a: 10, f: 5 }

const merged = merge(obj1, obj2, obj3)
console.log('Merged:', merged)

// Nested merge
const config1 = {
  api: { baseUrl: 'https://api.dev', timeout: 5000 },
  features: { darkMode: true }
}
const config2 = {
  api: { timeout: 10000, retries: 3 },
  features: { notifications: true }
}

console.log('Merged configs:', merge(config1, config2))`,
      name: 'merge - Deep merge objects',
    },
    'string-camelcase': {
      code: `import { camelCase, pascalCase, kebabCase, snakeCase } from '@vielzeug/toolkit'

const input = 'hello world example'

console.log('camelCase:', camelCase(input))
console.log('PascalCase:', pascalCase(input))
console.log('kebab-case:', kebabCase(input))
console.log('snake_case:', snakeCase(input))

// Different input formats
const formats = [
  'hello-world',
  'hello_world',
  'HelloWorld',
  'helloWorld'
]

formats.forEach(str => {
  console.log(\`"\${str}" → camelCase: \${camelCase(str)}\`)
})`,
      name: 'camelCase - Convert to camelCase',
    },
    'typed-is': {
      code: `import { 
  isString, isNumber, isBoolean, isArray, isObject,
  isFunction, isDate, isRegex, isNil, isEmpty
} from '@vielzeug/toolkit'

const values = [
  'hello', 42, true, [], {}, null, undefined,
  () => {}, new Date(), /test/
]

values.forEach(val => {
  console.log(\`Value: \${val}\`)
  console.log(\`  String: \${isString(val)}\`)
  console.log(\`  Number: \${isNumber(val)}\`)
  console.log(\`  Nil: \${isNil(val)}\`)
  console.log(\`  Empty: \${isEmpty(val)}\`)
  console.log('---')
})`,
      name: 'Type checking utilities',
    },
  },
  validit: {
    'array-validation': {
      code: `import { v } from '@vielzeug/validit'

const tagSchema = v.array(v.string()).min(1).max(5)
const numberSchema = v.array(v.number())
const userSchema = v.array(v.object({
  id: v.number(),
  name: v.string()
}))

// Valid arrays
console.log('Tags:', tagSchema.safeParse(['js', 'ts']).success)
console.log('Numbers:', numberSchema.safeParse([1, 2, 3]).success)
console.log('Users:', userSchema.safeParse([
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' }
]).success)

// Invalid arrays
console.log('\\nEmpty tags:', tagSchema.safeParse([]).success)
console.log('Too many tags:', 
  tagSchema.safeParse(['a', 'b', 'c', 'd', 'e', 'f']).success)
console.log('Invalid user:', userSchema.safeParse([
  { id: 'invalid', name: 'Alice' }
]).success)`,
      name: 'Array Validation',
    },
    'basic-schema': {
      code: `import { v } from '@vielzeug/validit'

const userSchema = v.object({
  name: v.string().min(1).max(100),
  email: v.string().email(),
  age: v.number().min(0).max(150)
})

// Valid data
const result1 = userSchema.safeParse({
  name: 'John Doe',
  email: 'john@example.com',
  age: 30
})

console.log('Valid:', result1.success)
if (result1.success) {
  console.log('Data:', result1.data)
}

// Invalid data
const result2 = userSchema.safeParse({
  name: '',
  email: 'invalid-email',
  age: 200
})

console.log('\\nInvalid:', result2.success)
if (!result2.success) {
  console.log('Errors:', result2.error.issues)
}`,
      name: 'Basic Schema Validation',
    },
    coercion: {
      code: `import { v } from '@vielzeug/validit'

const schema = v.object({
  age: v.coerce.number(),
  active: v.coerce.boolean(),
  createdAt: v.coerce.date()
})

// Input with string types
const input = {
  age: '25',
  active: 'true',
  createdAt: '2024-01-15'
}

const result = schema.safeParse(input)
console.log('Success:', result.success)
if (result.success) {
  console.log('Coerced data:', result.data)
  console.log('Age type:', typeof result.data.age)
  console.log('Active type:', typeof result.data.active)
  console.log('Date type:', result.data.createdAt instanceof Date)
}`,
      name: 'Type Coercion',
    },
    'nested-objects': {
      code: `import { v } from '@vielzeug/validit'

const addressSchema = v.object({
  street: v.string(),
  city: v.string(),
  zipCode: v.string().pattern(/^\\d{5}$/),
  country: v.string()
})

const userSchema = v.object({
  name: v.string(),
  email: v.string().email(),
  address: addressSchema,
  settings: v.object({
    theme: v.enum('light', 'dark'),
    notifications: v.boolean()
  })
})

const validUser = {
  name: 'Alice',
  email: 'alice@example.com',
  address: {
    street: '123 Main St',
    city: 'New York',
    zipCode: '10001',
    country: 'USA'
  },
  settings: {
    theme: 'dark',
    notifications: true
  }
}

const result = userSchema.safeParse(validUser)
console.log('Valid:', result.success)
if (result.success) {
  console.log('Validated user:', result.data.name)
  console.log('City:', result.data.address.city)
  console.log('Theme:', result.data.settings.theme)
}`,
      name: 'Nested Object Validation',
    },
    'number-validation': {
      code: `import { v } from '@vielzeug/validit'

const schemas = {
  basic: v.number(),
  positive: v.number().positive(),
  min: v.number().min(0),
  max: v.number().max(100),
  int: v.number().int(),
}

const tests = [
  { name: 'positive number', value: 42, schema: 'positive' },
  { name: 'negative number', value: -5, schema: 'positive' },
  { name: 'in range', value: 50, schema: 'max' },
  { name: 'out of range', value: 150, schema: 'max' },
  { name: 'integer', value: 5, schema: 'int' },
  { name: 'float', value: 5.5, schema: 'int' }
]

tests.forEach(({ name, value, schema }) => {
  const result = schemas[schema].safeParse(value)
  console.log(\`\${name}: \${result.success}\`)
})`,
      name: 'Number Validation',
    },
    'optional-nullable': {
      code: `import { v } from '@vielzeug/validit'

const schema = v.object({
  required: v.string(),
  optional: v.string().optional(),
  nullable: v.string().nullable(),
  withDefault: v.string().default('default value')
})

// Valid with minimum fields
const result1 = schema.safeParse({
  required: 'value'
})
console.log('Minimal:', result1.success)
if (result1.success) {
  console.log('Data:', result1.data)
}

// With optional and nullable
const result2 = schema.safeParse({
  required: 'value',
  optional: 'optional value',
  nullable: null
})
console.log('\\nWith optional:', result2.success)

// Missing required field
const result3 = schema.safeParse({
  optional: 'value'
})
console.log('Missing required:', result3.success)`,
      name: 'Optional and Nullable Fields',
    },
    refinements: {
      code: `import { v } from '@vielzeug/validit'

const passwordSchema = v.string()
  .min(8)
  .refine(
    (val) => /[A-Z]/.test(val),
    'Must contain uppercase letter'
  )
  .refine(
    (val) => /[a-z]/.test(val),
    'Must contain lowercase letter'
  )
  .refine(
    (val) => /[0-9]/.test(val),
    'Must contain number'
  )

const passwords = [
  'weak',
  'WeakPass',
  'WeakPass123'
]

passwords.forEach(pwd => {
  const result = passwordSchema.safeParse(pwd)
  console.log(\`"\${pwd}": \${result.success}\`)
  if (!result.success) {
    console.log('  →', result.error.issues[0].message)
  }
})`,
      name: 'Custom Refinements',
    },
    'string-validation': {
      code: `import { v } from '@vielzeug/validit'

const schemas = {
  email: v.string().email(),
  url: v.string().url(),
  uuid: v.string().uuid(),
  min: v.string().min(3),
  max: v.string().max(10),
  length: v.string().length(5),
  pattern: v.string().pattern(/^[A-Z]+$/),
}

const tests = {
  email: 'user@example.com',
  url: 'https://example.com',
  uuid: '550e8400-e29b-41d4-a716-446655440000',
  min: 'abc',
  max: 'short',
  length: 'exact',
  pattern: 'HELLO'
}

Object.entries(tests).forEach(([key, value]) => {
  const result = schemas[key].safeParse(value)
  console.log(\`\${key}: \${result.success}\`)
})`,
      name: 'String Validation',
    },
  },
  wireit: {
    'basic-container': {
      code: `import { createContainer, createToken } from '@vielzeug/wireit'

// Create tokens
const Config = createToken('Config')
const Logger = createToken('Logger')

// Create container
const container = createContainer()

// Register providers
container
  .registerValue(Config, { apiUrl: 'https://api.example.com' })
  .registerValue(Logger, { log: (msg) => console.log('[LOG]', msg) })

// Resolve dependencies
const config = container.get(Config)
const logger = container.get(Logger)

logger.log(\`Config loaded: \${config.apiUrl}\`)
console.log('Container initialized!')`,
      name: 'Basic Container - Value Provider',
    },
    'child-containers': {
      code: `import { createContainer, createToken } from '@vielzeug/wireit'

const GlobalConfig = createToken('GlobalConfig')
const RequestId = createToken('RequestId')

// Parent container
const parent = createContainer()
parent.registerValue(GlobalConfig, { 
  appName: 'MyApp',
  version: '1.0.0'
})

// Child container inherits from parent
const child1 = parent.createChild([
  [RequestId, { useValue: 'req-001' }]
])

const child2 = parent.createChild([
  [RequestId, { useValue: 'req-002' }]
])

// Both children have access to parent's providers
const config1 = child1.get(GlobalConfig)
const id1 = child1.get(RequestId)
console.log(\`Child 1: \${config1.appName} - Request \${id1}\`)

const config2 = child2.get(GlobalConfig)
const id2 = child2.get(RequestId)
console.log(\`Child 2: \${config2.appName} - Request \${id2}\`)`,
      name: 'Child Containers - Hierarchical DI',
    },
    'class-provider': {
      code: `import { createContainer, createToken } from '@vielzeug/wireit'

// Define tokens
const Database = createToken('Database')
const UserService = createToken('UserService')

// Define classes
class DatabaseImpl {
  constructor() {
    this.users = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ]
  }
  getUsers() { return this.users }
}

class UserServiceImpl {
  constructor(db) {
    this.db = db
  }
  getAllUsers() {
    return this.db.getUsers()
  }
}

// Setup container
const container = createContainer()
container
  .register(Database, { useClass: DatabaseImpl })
  .register(UserService, { 
    useClass: UserServiceImpl, 
    deps: [Database] 
  })

// Use the service
const service = container.get(UserService)
console.log('Users:', service.getAllUsers())`,
      name: 'Class Provider - Dependency Injection',
    },
    'factory-provider': {
      code: `import { createContainer, createToken } from '@vielzeug/wireit'

const Config = createToken('Config')
const Logger = createToken('Logger')

const container = createContainer()

// Register config
container.registerValue(Config, { 
  environment: 'production',
  logLevel: 'info'
})

// Register factory that uses config
container.registerFactory(
  Logger,
  (config) => ({
    info: (msg) => {
      if (config.logLevel === 'info') {
        console.log(\`[\${config.environment.toUpperCase()}] \${msg}\`)
      }
    }
  }),
  [Config],
  { lifetime: 'singleton' }
)

const logger = container.get(Logger)
logger.info('Application started!')
logger.info('Factory provider working!')`,
      name: 'Factory Provider - Custom Creation',
    },
    lifetimes: {
      code: `import { createContainer, createToken } from '@vielzeug/wireit'

const SingletonService = createToken('SingletonService')
const TransientService = createToken('TransientService')

let singletonCount = 0
let transientCount = 0

const container = createContainer()

// Singleton - created once
container.registerFactory(
  SingletonService,
  () => ({ id: ++singletonCount }),
  [],
  { lifetime: 'singleton' }
)

// Transient - created every time
container.registerFactory(
  TransientService,
  () => ({ id: ++transientCount }),
  [],
  { lifetime: 'transient' }
)

// Get singleton multiple times
const s1 = container.get(SingletonService)
const s2 = container.get(SingletonService)
console.log('Singleton instances:', s1.id, s2.id) // Same ID

// Get transient multiple times
const t1 = container.get(TransientService)
const t2 = container.get(TransientService)
console.log('Transient instances:', t1.id, t2.id) // Different IDs`,
      name: 'Lifetimes - Singleton vs Transient',
    },
    'scoped-execution': {
      code: `import { createContainer, createToken } from '@vielzeug/wireit'

const RequestId = createToken('RequestId')
const RequestHandler = createToken('RequestHandler')

class Handler {
  constructor(requestId) {
    this.requestId = requestId
  }
  handle() {
    return \`Handled request: \${this.requestId}\`
  }
}

const container = createContainer()
container.register(RequestHandler, {
  useClass: Handler,
  deps: [RequestId]
})

// Simulate multiple requests
async function handleRequest(id) {
  return container.runInScope(
    (scope) => {
      const handler = scope.get(RequestHandler)
      return handler.handle()
    },
    [[RequestId, { useValue: id }]]
  )
}

// Process multiple requests
const results = await Promise.all([
  handleRequest('request-1'),
  handleRequest('request-2'),
  handleRequest('request-3')
])

console.log('Results:', results)`,
      name: 'Scoped Execution - Request Scoping',
    },
  },
};
