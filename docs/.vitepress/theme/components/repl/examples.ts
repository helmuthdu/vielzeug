export const examples = {
  craftit: {
    'basic-component': {
      code: `import { define, html, css } from '@vielzeug/craftit'

define('hello-world', () => {
  const styles = css\`
    :host {
      display: block;
      padding: 1.5rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 8px;
      font-family: sans-serif;
    }
    h2 { margin: 0 0 0.5rem; }
    p { margin: 0; opacity: 0.9; }
  \`
  return {
    template: html\`
      <h2>Hello from Craftit!</h2>
      <p>A lightweight, signals-based web component library.</p>
    \`,
    styles: [styles],
  }
})

const el = document.createElement('hello-world')
document.getElementById('output')?.appendChild(el)
console.log('✓ Component mounted!')`,
      name: 'Basic Component',
    },
    'counter-component': {
      code: `import { define, signal, html, css } from '@vielzeug/craftit'

define('simple-counter', () => {
  const count = signal(0)

  const styles = css\`
    :host { display: block; padding: 1rem; text-align: center; font-family: sans-serif; }
    h2 { margin: 0 0 1rem; }
    button {
      padding: 0.5rem 1rem; font-size: 1rem; cursor: pointer;
      border: none; border-radius: 4px; background: #667eea; color: white; margin: 0 0.25rem;
    }
    button:hover { background: #5a67d8; }
  \`

  return {
    template: html\`
      <h2>Count: \${count}</h2>
      <button @click=\${() => count.value--}>-</button>
      <button @click=\${() => (count.value = 0)}>Reset</button>
      <button @click=\${() => count.value++}>+</button>
    \`,
    styles: [styles],
  }
})

document.getElementById('output')?.appendChild(document.createElement('simple-counter'))
console.log('✓ Counter component mounted!')`,
      name: 'Interactive Counter',
    },
    'computed-signals': {
      code: `import { define, signal, computed, html } from '@vielzeug/craftit'

define('price-calculator', () => {
  const price = signal(100)
  const quantity = signal(1)
  const taxRate = signal(0.1)

  const subtotal = computed(() => price.value * quantity.value)
  const tax = computed(() => subtotal.value * taxRate.value)
  const total = computed(() => subtotal.value + tax.value)

  return {
    template: html\`
      <div style="padding:1rem;font-family:sans-serif;max-width:300px">
        <h3 style="margin:0 0 1rem">Price Calculator</h3>
        <label>Price: <input type="number" .value=\${price} @input=\${(e: Event) => (price.value = +(e.target as HTMLInputElement).value)} style="width:80px"/></label><br/><br/>
        <label>Qty:   <input type="number" .value=\${quantity} @input=\${(e: Event) => (quantity.value = +(e.target as HTMLInputElement).value)} style="width:80px"/></label><br/><br/>
        <hr/>
        <p>Subtotal: $\${subtotal}</p>
        <p>Tax (10%): $\${tax}</p>
        <p><strong>Total: $\${total}</strong></p>
      </div>
    \`,
  }
})

document.getElementById('output')?.appendChild(document.createElement('price-calculator'))`,
      name: 'Computed Signals',
    },
    'watchers': {
      code: `import { define, signal, watch, effect, html } from '@vielzeug/craftit'

define('watcher-demo', () => {
  const count = signal(0)
  const log = signal<string[]>([])

  // watch fires whenever count changes
  watch(count, (next, prev) => {
    log.update((l) => [...l.slice(-4), \`\${prev} → \${next}\`])
  })

  // effect re-runs whenever its deps change
  effect(() => {
    console.log('count is now:', count.value)
  })

  return {
    template: html\`
      <div style="padding:1rem;font-family:sans-serif">
        <h3 style="margin:0 0 .5rem">Count: \${count}</h3>
        <button @click=\${() => count.value++} style="padding:.4rem .9rem;background:#667eea;color:white;border:none;border-radius:4px;cursor:pointer">Increment</button>
        <ul style="margin-top:1rem;padding-left:1.2rem">
          \${html.each(log, (_, i) => i, (entry) => html\`<li>\${entry}</li>\`)}
        </ul>
      </div>
    \`,
  }
})

document.getElementById('output')?.appendChild(document.createElement('watcher-demo'))`,
      name: 'Watchers & Effects',
    },
    'async-data': {
      code: `import { define, signal, html } from '@vielzeug/craftit'

define('user-profile', () => {
  const user = signal<any>(null)
  const loading = signal(false)
  const error = signal<string | null>(null)
  const userId = signal(1)

  async function loadUser() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(\`https://jsonplaceholder.typicode.com/users/\${userId.value}\`)
      user.value = await res.json()
    } catch {
      error.value = 'Failed to load user'
    } finally {
      loading.value = false
    }
  }

  loadUser()

  return {
    template: html\`
      <div style="padding:1rem;border:1px solid #e2e8f0;border-radius:8px;max-width:360px;font-family:sans-serif">
        \${html.when(loading, html\`<p>Loading…</p>\`)}
        \${html.when(error.derive(Boolean), html\`<p style="color:#f56565">\${error}</p>\`)}
        \${html.when(user.derive(Boolean),
          html\`
            <h3 style="margin-top:0">\${user.derive((u) => u?.name)}</h3>
            <p><strong>Email:</strong> \${user.derive((u) => u?.email)}</p>
            <p><strong>Company:</strong> \${user.derive((u) => u?.company?.name)}</p>
            <button @click=\${() => { userId.update((id) => (id % 10) + 1); loadUser() }}
              style="padding:.4rem .9rem;background:#667eea;color:white;border:none;border-radius:4px;cursor:pointer">
              Next User
            </button>
          \`
        )}
      </div>
    \`,
  }
})

document.getElementById('output')?.appendChild(document.createElement('user-profile'))`,
      name: 'Async Data – API Integration',
    },
    'todo-list': {
      code: `import { define, signal, html, css } from '@vielzeug/craftit'

define('todo-list', () => {
  const todos = signal<string[]>(['Learn Craftit', 'Build components'])
  const input = signal('')

  function addTodo() {
    const text = input.value.trim()
    if (text) {
      todos.update((list) => [...list, text])
      input.value = ''
    }
  }

  function removeTodo(index: number) {
    todos.update((list) => list.filter((_, i) => i !== index))
  }

  const styles = css\`
    :host { display: block; max-width: 400px; padding: 1rem; font-family: sans-serif; }
    ul { list-style: none; padding: 0; }
    li { display: flex; justify-content: space-between; align-items: center;
         padding: .6rem; margin-bottom: .4rem; background: #f7fafc; border-radius: 4px; }
    .row { display: flex; gap: .5rem; margin-bottom: 1rem; }
    input { flex: 1; padding: .4rem; border: 1px solid #ddd; border-radius: 4px; }
    .add { background: #667eea; color: white; border: none; border-radius: 4px; padding: .4rem .9rem; cursor: pointer; }
    .del { background: #f56565; color: white; border: none; border-radius: 4px; padding: .2rem .5rem; cursor: pointer; }
  \`

  return {
    template: html\`
      <h2 style="margin-top:0">My Todos</h2>
      <div class="row">
        <input .value=\${input} @input=\${(e: Event) => (input.value = (e.target as HTMLInputElement).value)}
               placeholder="New todo…" @keydown=\${(e: KeyboardEvent) => e.key === 'Enter' && addTodo()} />
        <button class="add" @click=\${addTodo}>Add</button>
      </div>
      <ul>
        \${html.each(todos, (t, i) => i, (todo, idx) => html\`
          <li><span>\${todo}</span><button class="del" @click=\${() => removeTodo(idx)}>×</button></li>
        \`)}
      </ul>
    \`,
    styles: [styles],
  }
})

document.getElementById('output')?.appendChild(document.createElement('todo-list'))`,
      name: 'Todo List',
    },
    'css-theming': {
      code: `import { define, signal, html, css } from '@vielzeug/craftit'

const { vars, sheet } = css.theme(
  { primary: '#3b82f6', bg: '#ffffff', text: '#1f2937', border: '#e5e7eb' },
  { primary: '#60a5fa', bg: '#1f2937', text: '#f9fafb', border: '#374151' },
)

define('themed-card', () => {
  const dark = signal(false)

  return {
    template: html\`
      <div style="padding:1.5rem;font-family:sans-serif" ?data-theme=\${'dark'} .dataset=\${dark.derive((d) => ({ theme: d ? 'dark' : '' }))}>
        <h2 style="margin:0 0 .5rem;color:\${vars.primary}">Themed Card</h2>
        <p style="color:\${vars.text}">Automatic light/dark variables.</p>
        <button @click=\${() => (dark.value = !dark.value)}
          style="padding:.4rem .9rem;background:\${vars.primary};color:white;border:none;border-radius:4px;cursor:pointer">
          Toggle theme
        </button>
      </div>
    \`,
    styles: [
      sheet,
      css\`
        :host { display: block; border: 1px solid \${vars.border}; border-radius: 8px; background: \${vars.bg}; }
      \`,
    ],
  }
})

document.getElementById('output')?.appendChild(document.createElement('themed-card'))`,
      name: 'CSS Theming – Light/Dark',
    },
    'form-associated': {
      code: `import { define, signal, field, onFormAssociated, onFormReset, html } from '@vielzeug/craftit'

define('custom-input', () => {
  const value = signal('')
  const error = signal('')
  const internals = field()

  onFormAssociated((form) => {
    console.log('Associated with form:', form?.id)
  })

  onFormReset(() => {
    value.value = ''
    error.value = ''
    internals.setFormValue('')
  })

  function validate(v: string) {
    if (!v) return 'Required'
    if (!v.includes('@')) return 'Invalid email'
    return ''
  }

  return {
    template: html\`
      <div style="padding:.5rem;font-family:sans-serif">
        <label style="display:block;font-weight:bold;margin-bottom:.25rem">Email</label>
        <input
          type="email"
          .value=\${value}
          placeholder="you@example.com"
          style="padding:.4rem;border:1px solid \${error.derive((e) => (e ? '#f56565' : '#cbd5e0'))};border-radius:4px;width:100%"
          @input=\${(e: Event) => {
            const v = (e.target as HTMLInputElement).value
            value.value = v
            error.value = validate(v)
            internals.setFormValue(v)
            internals.setValidity(error.value ? { customError: true } : {}, error.value || '')
          }}
        />
        \${html.when(error.derive(Boolean), html\`<p style="color:#f56565;font-size:.8rem;margin:.25rem 0 0">\${error}</p>\`)}
      </div>
    \`,
  }
}, { formAssociated: true })

document.getElementById('output')?.appendChild(document.createElement('custom-input'))`,
      name: 'Form-Associated Component',
    },
  },
  deposit: {
    'basic-setup': {
      code: `import { Deposit, defineSchema } from '@vielzeug/deposit'

const schema = defineSchema()({
  users: { key: 'id', indexes: ['email'] },
})

const db = createDeposit({ type: 'localStorage', dbName: 'demo', schema })

await db.put('users', { id: 1, name: 'Alice', email: 'alice@example.com' })
await db.put('users', { id: 2, name: 'Bob', email: 'bob@example.com' })

console.log('Get user 1:', await db.get('users', 1))
console.log('All users:', await db.getAll('users'))
console.log('Count:', await db.count('users'))`,
      name: 'Basic Setup - Initialize Deposit',
    },
    'bulk-operations': {
      code: `import { Deposit, defineSchema } from '@vielzeug/deposit'

const schema = defineSchema()({ items: { key: 'id' } })
const db = createDeposit({ type: 'localStorage', dbName: 'bulk-demo', schema })

const items = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  value: +(Math.random() * 1000).toFixed(2)
}))

await db.bulkPut('items', items)
console.log('Inserted', items.length, 'items')

await db.bulkDelete('items', [1, 2, 3])
console.log('Deleted 3 items')
console.log('Remaining:', await db.count('items'))`,
      name: 'Bulk Operations',
    },
    'crud-operations': {
      code: `import { Deposit, defineSchema } from '@vielzeug/deposit'

const schema = defineSchema()({ users: { key: 'id', indexes: ['email'] } })
const db = createDeposit({ type: 'localStorage', dbName: 'demo', schema })

await db.put('users', { id: 1, name: 'Alice', email: 'alice@example.com', age: 25 })
await db.put('users', { id: 2, name: 'Bob', email: 'bob@example.com', age: 30 })
console.log('Created 2 users')

console.log('Get user 1:', await db.get('users', 1))
console.log('All users:', await db.getAll('users'))

await db.put('users', { id: 1, name: 'Alice Smith', email: 'alice@example.com', age: 26 })
console.log('Updated user 1')

await db.delete('users', 2)
console.log('Count after delete:', await db.count('users'))`,
      name: 'CRUD Operations',
    },
    'query-builder': {
      code: `import { Deposit, defineSchema } from '@vielzeug/deposit'

const schema = defineSchema()({ products: { key: 'id', indexes: ['category'] } })
const db = createDeposit({ type: 'localStorage', dbName: 'shop', schema })

await db.bulkPut('products', [
  { id: 1, name: 'Laptop', price: 999, category: 'electronics', inStock: true },
  { id: 2, name: 'Mouse', price: 29, category: 'electronics', inStock: true },
  { id: 3, name: 'Desk', price: 299, category: 'furniture', inStock: false },
  { id: 4, name: 'Chair', price: 199, category: 'furniture', inStock: true },
  { id: 5, name: 'Monitor', price: 399, category: 'electronics', inStock: true },
])

const affordable = await db.query('products')
  .equals('category', 'electronics')
  .filter(p => p.inStock && p.price < 500)
  .orderBy('price', 'asc')
  .toArray()
console.log('Affordable electronics in stock:', affordable.map(p => p.name))

const grouped = await db.query('products').toGrouped('category')
console.log('By category:')
for (const { key, values } of grouped) {
  console.log(\`  \${key}: \${values.length} items\`)
}`,
      name: 'Query Builder - Advanced Queries',
    },
    transactions: {
      code: `import { Deposit, defineSchema } from '@vielzeug/deposit'

const schema = defineSchema()({ accounts: { key: 'id' } })
const db = createDeposit({ type: 'localStorage', dbName: 'bank', schema })

await db.bulkPut('accounts', [
  { id: 'alice', balance: 1000 },
  { id: 'bob', balance: 500 },
])
console.log('Before:', await db.getAll('accounts'))

await db.transaction(['accounts'], async (stores) => {
  const alice = stores.accounts.find(a => a.id === 'alice')
  const bob = stores.accounts.find(a => a.id === 'bob')
  alice.balance -= 200
  bob.balance += 200
})

console.log('After transfer of 200:', await db.getAll('accounts'))`,
      name: 'Transactions - Atomic for IndexedDB',
    },
    'ttl-expiration': {
      code: `import { Deposit, defineSchema } from '@vielzeug/deposit'

const schema = defineSchema()({ cache: { key: 'id' } })
const db = createDeposit({ type: 'localStorage', dbName: 'cache-demo', schema })

await db.put('cache', { id: 1, data: 'Temporary data' }, 1000) // 1s TTL
console.log('Stored with 1s TTL')
console.log('Immediate read:', await db.get('cache', 1))

await new Promise(r => setTimeout(r, 1500))
console.log('After 1.5s:', await db.get('cache', 1)) // undefined — expired`,
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
  firstName: form.isDirty('firstName'),
  lastName: form.isDirty('lastName'),
  email: form.isDirty('email')
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
const loadLocale = async (locale) => {
  console.log(\`Loading locale: \${locale}\`)
  // Simulate loading translations from API
  await new Promise(r => setTimeout(r, 500))

  const translations = {
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
const loadTranslations = async (locale) => {
  // Simulate API call
  await new Promise(r => setTimeout(r, 300))
  const translations = {
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
      code: `import { createPermit } from '@vielzeug/permit'

const permit = createPermit()

// Register permissions for different roles
permit.set('admin', 'users', {
  read: true,
  create: true,
  update: true,
  delete: true,
})

permit.set('user', 'profile', {
  read: true,
  update: true,
})

permit.set('guest', 'posts', {
  read: true,
})

console.log('Permissions registered!')
console.log('Roles map:', permit.roles)`,
      name: 'Basic Setup - Role Permissions',
    },
    'dynamic-permissions': {
      code: `import { createPermit } from '@vielzeug/permit'

const permit = createPermit()

// Function-based permissions — receives user + optional data
permit.set('user', 'posts', {
  read: true,
  create: true,
  update: (user, data) => user.id === data?.authorId,
  delete: (user, data) => user.id === data?.authorId,
})

const user1 = { id: 'user1', roles: ['user'] }
const user2 = { id: 'user2', roles: ['user'] }
const post = { id: 'post1', authorId: 'user1', title: 'My Post' }

console.log('Author can update:', permit.check(user1, 'posts', 'update', post))
console.log('Author can delete:', permit.check(user1, 'posts', 'delete', post))

console.log('\\nNon-author can update:', permit.check(user2, 'posts', 'update', post))
console.log('Non-author can delete:', permit.check(user2, 'posts', 'delete', post))`,
      name: 'Dynamic Permissions - Functions',
    },
    'permission-checks': {
      code: `import { createPermit } from '@vielzeug/permit'

const permit = createPermit()

permit.set('editor', 'articles', {
  read: true,
  create: true,
  update: true,
  delete: false,
})

permit.set('viewer', 'articles', {
  read: true,
})

const editor = { id: '1', roles: ['editor'] }
const viewer = { id: '2', roles: ['viewer'] }

console.log('Editor can read:', permit.check(editor, 'articles', 'read'))
console.log('Editor can create:', permit.check(editor, 'articles', 'create'))
console.log('Editor can delete:', permit.check(editor, 'articles', 'delete'))

console.log('\\nViewer can read:', permit.check(viewer, 'articles', 'read'))
console.log('Viewer can create:', permit.check(viewer, 'articles', 'create'))`,
      name: 'Permission Checks',
    },
    'permission-management': {
      code: `import { createPermit } from '@vielzeug/permit'

const permit = createPermit()

// Set initial permissions
permit.set('user', 'comments', { read: true, create: true })
console.log('Initial permissions set')

// Merge more actions (replace=false is default)
permit.set('user', 'comments', { update: true })
console.log('Permissions updated (merged)')

// Replace entirely
permit.set('user', 'comments', { read: true, delete: true }, true)
console.log('Permissions replaced')

// Remove a specific action
permit.remove('user', 'comments', 'delete')
console.log('Delete permission removed')

// Remove all actions for a resource
permit.remove('user', 'comments')
console.log('All comment permissions removed')

// Clear everything
permit.clear()
console.log('All permissions cleared')`,
      name: 'Permission Management',
    },
    'role-hierarchy': {
      code: `import { createPermit } from '@vielzeug/permit'

const permit = createPermit()

permit.set('admin', 'users', { read: true, create: true, update: true, delete: true })
permit.set('moderator', 'posts', { read: true, update: true, delete: true })
permit.set('editor', 'posts', { read: true, update: true })

// User with multiple roles — any matching role grants access
const multiRoleUser = { id: '1', roles: ['editor', 'moderator'] }

console.log('Can read posts:', permit.check(multiRoleUser, 'posts', 'read'))
console.log('Can delete posts:', permit.check(multiRoleUser, 'posts', 'delete'))

console.log('\\nHas editor role:', permit.hasRole(multiRoleUser, 'editor'))
console.log('Has admin role:', permit.hasRole(multiRoleUser, 'admin'))`,
      name: 'Role Hierarchy & Multiple Roles',
    },
    'wildcard-permissions': {
      code: `import { createPermit, WILDCARD } from '@vielzeug/permit'

const permit = createPermit()

// Admin has access to every resource via wildcard
permit.set('admin', WILDCARD, { read: true, create: true, update: true, delete: true })

// Regular user has limited access
permit.set('user', 'posts', { read: true })

const admin = { id: '1', roles: ['admin'] }
const user = { id: '2', roles: ['user'] }

console.log('Admin on users:', permit.check(admin, 'users', 'delete'))
console.log('Admin on posts:', permit.check(admin, 'posts', 'delete'))
console.log('Admin on comments:', permit.check(admin, 'comments', 'delete'))

console.log('\\nUser can read posts:', permit.check(user, 'posts', 'read'))
console.log('User can delete posts:', permit.check(user, 'posts', 'delete'))`,
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
      code: `import { createSnapshot } from '@vielzeug/stateit'

// Create a simple counter state
const counter = createSnapshot({ count: 0, name: 'Counter' })

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
      code: `import { createSnapshot } from '@vielzeug/stateit'

const user = createSnapshot({
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
      code: `import { createSnapshot } from '@vielzeug/stateit'

const user = createSnapshot({
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
      code: `import { createSnapshot } from '@vielzeug/stateit'

const data = createSnapshot({
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
    'scoped-states': {
      code: `import { createSnapshot } from '@vielzeug/stateit'

const app = createSnapshot({
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
      code: `import { createSnapshot } from '@vielzeug/stateit'

const state = createSnapshot({
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
      code: `import { createSnapshot } from '@vielzeug/stateit'

const todos = createSnapshot({
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
      code: `import { createSnapshot } from '@vielzeug/stateit'

const cart = createSnapshot({
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
      code: `import { createSnapshot } from '@vielzeug/stateit'

const user = createSnapshot({
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
  { deps: [Config], lifetime: 'singleton' }
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
  { lifetime: 'singleton' }
)

// Transient - created every time
container.registerFactory(
  TransientService,
  () => ({ id: ++transientCount }),
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
