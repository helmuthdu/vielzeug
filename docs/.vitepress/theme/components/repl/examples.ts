export const examples = {
  craftit: {
    'async-data': {
      code: `import { define, signal, html } from '@vielzeug/craftit'

define('user-profile', () => {
  const user = signal(null)
  const loading = signal(false)
  const error = signal(null)
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
        \${html.when(loading, () => html\`<p>Loading…</p>\`)}
        \${html.when(() => Boolean(error.value), () => html\`<p style="color:#f56565">\${error}</p>\`)}
        \${html.when(() => Boolean(user.value),
          () => html\`
            <h3 style="margin-top:0">\${() => user.value?.name}</h3>
            <p><strong>Email:</strong> \${() => user.value?.email}</p>
            <p><strong>Company:</strong> \${() => user.value?.company?.name}</p>
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
        <label>Price: <input type="number" .value=\${price} @input=\${(e: Event) => (price.value = +(e.target).value)} style="width:80px"/></label><br/><br/>
        <label>Qty:   <input type="number" .value=\${quantity} @input=\${(e: Event) => (quantity.value = +(e.target).value)} style="width:80px"/></label><br/><br/>
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
    'css-theming': {
      code: `import { define, signal, html, css, watch } from '@vielzeug/craftit'

const theme = css.theme(
  { primary: '#3b82f6', bg: '#ffffff', text: '#1f2937', border: '#e5e7eb' },
  { primary: '#60a5fa', bg: '#1f2937', text: '#f9fafb', border: '#374151' },
)

define('themed-card', ({ host }) => {
  const dark = signal(false)

  // Sync data-theme on host so css.theme light/dark rules apply
  watch(dark, (isDark) => {
    host.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, { immediate: true })

  return {
    template: html\`
      <div style="padding:1.5rem;font-family:sans-serif">
        <h2 style="margin:0 0 .5rem;color:\${theme.primary}">Themed Card</h2>
        <p style="color:\${theme.text}">Automatic light/dark variables.</p>
        <button @click=\${() => (dark.value = !dark.value)}
          style="padding:.4rem .9rem;background:\${theme.primary};color:white;border:none;border-radius:4px;cursor:pointer">
          Toggle theme
        </button>
      </div>
    \`,
    styles: [
      theme,
      css\`
        :host { display: block; border: 1px solid \${theme.border}; border-radius: 8px; background: \${theme.bg}; }
      \`,
    ],
  }
})

document.getElementById('output')?.appendChild(document.createElement('themed-card'))`,
      name: 'CSS Theming – Light/Dark',
    },
    'form-associated': {
      code: `import { define, signal, defineField, html } from '@vielzeug/craftit'

define('custom-input', () => {
  const value = signal('')
  const error = signal('')

  // defineField syncs the value signal to form internals automatically;
  // callbacks handle lifecycle events
  const fd = defineField(
    { value },
    {
      onAssociated: (form) => {
        console.log('Associated with form:', form?.id)
      },
      onReset: () => {
        value.value = ''
        error.value = ''
      },
    }
  )

  function validate(v) {
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
          style="padding:.4rem;border:1px solid \${() => error.value ? '#f56565' : '#cbd5e0'};border-radius:4px;width:100%"
          @input=\${(e: Event) => {
            const v = (e.target as HTMLInputElement).value
            value.value = v
            error.value = validate(v)
            fd.setValidity(error.value ? { customError: true } : {}, error.value || '')
          }}
        />
        \${html.when(() => Boolean(error.value), () => html\`<p style="color:#f56565;font-size:.8rem;margin:.25rem 0 0">\${error}</p>\`)}
      </div>
    \`,
  }
}, { formAssociated: true })

document.getElementById('output')?.appendChild(document.createElement('custom-input'))`,
      name: 'Form-Associated Component',
    },
    'todo-list': {
      code: `import { define, signal, html, css } from '@vielzeug/craftit'

define('todo-list', () => {
  const todos = signal(['Learn Craftit', 'Build components'])
  const input = signal('')

  function addTodo() {
    const text = input.value.trim()
    if (text) {
      todos.update((list) => [...list, text])
      input.value = ''
    }
  }

  function removeTodo(index) {
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
        <input .value=\${input} @input=\${(e: Event) => (input.value = (e.target).value)}
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
    watchers: {
      code: `import { define, signal, watch, effect, html } from '@vielzeug/craftit'

define('watcher-demo', () => {
  const count = signal(0)
  const log = signal([])

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
  },
  deposit: {
    'basic-setup': {
      code: `import { createLocalStorage, defineSchema } from '@vielzeug/deposit'

const schema = defineSchema({
  users: { key: 'id', indexes: ['email'] },
})

const db = createLocalStorage({ dbName: 'demo', schema })

await db.put('users', { id: 1, name: 'Alice', email: 'alice@example.com' })
await db.put('users', { id: 2, name: 'Bob', email: 'bob@example.com' })

console.log('Get user 1:', await db.get('users', 1))
console.log('All users:', await db.getAll('users'))
console.log('Count:', await db.count('users'))`,
      name: 'Basic Setup - Initialize Deposit',
    },
    'bulk-operations': {
      code: `import { createLocalStorage, defineSchema } from '@vielzeug/deposit'

const schema = defineSchema({
  items: { key: 'id' },
})
const db = createLocalStorage({ dbName: 'bulk-demo', schema })

const items = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  value: +(Math.random() * 1000).toFixed(2),
}))

await db.putMany('items', items)
console.log('Inserted', items.length, 'items')

await db.deleteMany('items', [1, 2, 3])
console.log('Deleted 3 items')
console.log('Remaining:', await db.count('items'))`,
      name: 'Bulk Operations',
    },
    'crud-operations': {
      code: `import { createLocalStorage, defineSchema } from '@vielzeug/deposit'

const schema = defineSchema({
  users: { key: 'id', indexes: ['email'] },
})

const db = createLocalStorage({ dbName: 'demo', schema })

await db.put('users', { id: 1, name: 'Alice', email: 'alice@example.com', age: 25 })
await db.put('users', { id: 2, name: 'Bob', email: 'bob@example.com', age: 30 })
console.log('Created 2 users')

console.log('Get user 1:', await db.get('users', 1))
console.log('All users:', await db.getAll('users'))

await db.patch('users', 1, { name: 'Alice Smith', age: 26 })
console.log('Updated user 1:', await db.get('users', 1))

await db.delete('users', 2)
console.log('Count after delete:', await db.count('users'))`,
      name: 'CRUD Operations',
    },
    'get-or-put': {
      code: `import { createLocalStorage, defineSchema } from '@vielzeug/deposit'

const schema = defineSchema({
  cache: { key: 'id' },
})
const db = createLocalStorage({ dbName: 'cache-demo', schema })

// getOrPut: fetch from cache or compute & store
const result = await db.getOrPut(
  'cache',
  'config',
  async () => {
    console.log('Cache miss — computing...')
    await new Promise((r) => setTimeout(r, 200))
    return { id: 'config', data: 'computed value', fetched: Date.now() }
  }
)
console.log('First call:', result)

// Second call uses cached value
const cached = await db.getOrPut('cache', 'config', async () => {
  console.log('This should NOT print — cache hit!')
  return { id: 'config', data: 'new value', fetched: Date.now() }
})
console.log('Second call (cache hit):', cached)`,
      name: 'getOrPut - Cache Pattern',
    },
    'indexed-db': {
      code: `import { createIndexedDB, defineSchema } from '@vielzeug/deposit'

const schema = defineSchema({
  logs: { key: 'id', indexes: ['level'] },
})

// IndexedDB supports transactions and larger datasets
const db = createIndexedDB({ dbName: 'app-logs', version: 1, schema })

await db.putMany('logs', [
  { id: 1, level: 'info', message: 'App started', ts: Date.now() - 3000 },
  { id: 2, level: 'warn', message: 'Slow query detected', ts: Date.now() - 2000 },
  { id: 3, level: 'error', message: 'Request failed', ts: Date.now() - 1000 },
  { id: 4, level: 'info', message: 'Request succeeded', ts: Date.now() },
])

const errors = await db.from('logs').equals('level', 'error').toArray()
console.log('Errors:', errors.map((l) => l.message))

const count = await db.count('logs')
console.log('Total logs:', count)

db.close()`,
      name: 'IndexedDB Adapter',
    },
    'query-builder': {
      code: `import { createLocalStorage, defineSchema } from '@vielzeug/deposit'

const schema = defineSchema({
  products: { key: 'id', indexes: ['category'] },
})
const db = createLocalStorage({ dbName: 'shop', schema })

await db.putMany('products', [
  { id: 1, name: 'Laptop', price: 999, category: 'electronics', inStock: true },
  { id: 2, name: 'Mouse', price: 29, category: 'electronics', inStock: true },
  { id: 3, name: 'Desk', price: 299, category: 'furniture', inStock: false },
  { id: 4, name: 'Chair', price: 199, category: 'furniture', inStock: true },
  { id: 5, name: 'Monitor', price: 399, category: 'electronics', inStock: true },
])

const affordable = await db
  .from('products')
  .equals('category', 'electronics')
  .filter((p) => p.inStock && p.price < 500)
  .orderBy('price', 'asc')
  .toArray()
console.log('Affordable electronics in stock:', affordable.map((p) => p.name))

const all = await db.from('products').toArray()
const grouped = all.reduce((acc, p) => { ;(acc[p.category] ??= []).push(p); return acc }, {})
console.log('By category:')
for (const [category, items] of Object.entries(grouped)) {
  console.log(\`  \${category}: \${items.length} items\`)
}`,
      name: 'Query Builder - Advanced Queries',
    },
    'ttl-expiration': {
      code: `import { createLocalStorage, defineSchema, ttl } from '@vielzeug/deposit'

const schema = defineSchema({
  cache: { key: 'id' },
})
const db = createLocalStorage({ dbName: 'cache-demo', schema })

// Store with 1-second TTL
await db.put('cache', { id: 'temp', data: 'Temporary data' }, ttl.seconds(1))
console.log('Stored with 1s TTL')
console.log('Immediate read:', await db.get('cache', 'temp'))

await new Promise((r) => setTimeout(r, 1500))
console.log('After 1.5s:', await db.get('cache', 'temp')) // undefined — expired
console.log('ttl helpers:', {
  '5 minutes': ttl.minutes(5),
  '2 hours': ttl.hours(2),
  '7 days': ttl.days(7),
})`,
      name: 'TTL & Expiration',
    },
  },
  dragit: {
    'drop-zone-accept': {
      code: `import { createDropZone } from '@vielzeug/dragit'

const dropEl = document.createElement('div')
dropEl.style.cssText = 'width:300px;height:200px;border:2px dashed #ccc;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;'
dropEl.innerHTML = '<span>Drop images or PDFs here</span><small style="color:#888">(.png, .jpg, image/*, .pdf)</small>'
document.body.appendChild(dropEl)

const zone = createDropZone({
  element: dropEl,
  accept: ['image/*', '.pdf'],
  onDrop: (files) => {
    console.log('Accepted files:')
    files.forEach(f => console.log(' ✓', f.name))
  },
  onDropRejected: (files) => {
    console.log('Rejected files (wrong type):')
    files.forEach(f => console.log(' ✗', f.name, '-', f.type))
  },
  onHoverChange: (hovered) => {
    dropEl.style.borderColor = hovered ? '#10b981' : '#ccc'
  },
})

// Disable zone conditionally
let isReadOnly = false
const toggleReadOnly = () => {
  isReadOnly = !isReadOnly
  console.log('Read-only mode:', isReadOnly)
}

// Pass reactive disabled callback
const reactiveZone = createDropZone({
  element: dropEl,
  disabled: () => isReadOnly,
  onDrop: (files) => console.log('Dropped:', files.map(f => f.name)),
})`,
      name: 'createDropZone - Accept Filter',
    },
    'drop-zone-basic': {
      code: `import { createDropZone } from '@vielzeug/dragit'

const dropEl = document.createElement('div')
dropEl.style.cssText = 'width:300px;height:200px;border:2px dashed #ccc;display:flex;align-items:center;justify-content:center;'
dropEl.textContent = 'Drop files here'
document.body.appendChild(dropEl)

const zone = createDropZone({
  element: dropEl,
  onDrop: (files, event) => {
    console.log('Dropped files:')
    files.forEach(f => console.log(' -', f.name, '(' + f.type + ')', f.size + ' bytes'))
  },
  onHoverChange: (hovered) => {
    dropEl.style.borderColor = hovered ? '#3b82f6' : '#ccc'
    dropEl.style.background = hovered ? '#eff6ff' : ''
    dropEl.textContent = hovered ? 'Release to drop!' : 'Drop files here'
  },
})

console.log('Drop zone created. Zone hovered:', zone.hovered)

// Cleanup when done
// zone.destroy()`,
      name: 'createDropZone - Basic',
    },
    'sortable-list': {
      code: `import { createSortable } from '@vielzeug/dragit'

const listEl = document.createElement('ul')
listEl.style.cssText = 'list-style:none;padding:0;margin:0;width:200px;'
document.body.appendChild(listEl)

const items = [
  { id: 'item-1', label: 'Item One' },
  { id: 'item-2', label: 'Item Two' },
  { id: 'item-3', label: 'Item Three' },
  { id: 'item-4', label: 'Item Four' },
]

function render(order) {
  listEl.innerHTML = ''
  order.forEach(id => {
    const item = items.find(i => i.id === id)
    const li = document.createElement('li')
    // data-sort-id is required on each direct child
    li.dataset.sortId = item.id
    li.textContent = item.label
    li.style.cssText = 'padding:10px;margin:4px 0;background:#f0f0f0;border-radius:4px;cursor:grab;'
    listEl.appendChild(li)
  })
}

let currentOrder = items.map(i => i.id)
render(currentOrder)

const sortable = createSortable({
  container: listEl,
  onReorder: (orderedIds) => {
    console.log('New order:', orderedIds)
    currentOrder = orderedIds
  },
  onDragStart: (id) => console.log('Dragging:', id),
  onDragEnd: () => console.log('Drag ended'),
})

console.log('Sortable list ready. Drag items to reorder.')

// Cleanup:
// sortable.destroy()`,
      name: 'createSortable - Drag to Reorder',
    },
    'sortable-with-handle': {
      code: `import { createSortable } from '@vielzeug/dragit'

const listEl = document.createElement('ul')
listEl.style.cssText = 'list-style:none;padding:0;width:250px;'
document.body.appendChild(listEl)

const tasks = [
  { id: 'task-a', title: 'Design UI' },
  { id: 'task-b', title: 'Write tests' },
  { id: 'task-c', title: 'Deploy to prod' },
]

tasks.forEach(task => {
  const li = document.createElement('li')
  li.dataset.sortId = task.id
  li.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px;margin:4px 0;background:#fff;border:1px solid #e5e5e5;border-radius:4px;'

  const handle = document.createElement('span')
  handle.className = 'drag-handle'
  handle.textContent = '⠿'
  handle.style.cssText = 'cursor:grab;color:#888;font-size:18px;'

  const label = document.createElement('span')
  label.textContent = task.title

  li.appendChild(handle)
  li.appendChild(label)
  listEl.appendChild(li)
})

// Using the 'using' keyword for automatic cleanup (ES2025)
const sortable = createSortable({
  container: listEl,
  handle: '.drag-handle',  // only the handle triggers drag
  onReorder: (ids) => console.log('Reordered:', ids),
})

sortable.refresh() // Call after dynamically adding/removing items`,
      name: 'createSortable - Drag Handle',
    },
  },
  eventit: {
    'abort-signal': {
      code: `import { createBus, BusDisposedError } from '@vielzeug/eventit'


const bus = createBus()

// AbortSignal works with on(), once(), wait(), and events()
const controller = new AbortController()
const { signal } = controller

bus.on('message', (msg) => {
  console.log('Listener with signal:', msg)
}, signal)

bus.emit('message', 'First message')    // received
bus.emit('message', 'Second message')   // received

// Abort — listener auto-removed
controller.abort()

bus.emit('message', 'Third message')    // NOT received (aborted)
console.log('After abort — third message ignored')

// Disposing the bus rejects pending waits
const bus2 = createBus()

bus2.wait('message').catch(err => {
  if (err instanceof BusDisposedError) {
    console.log('Caught BusDisposedError:', err.message)
  }
})

bus2.dispose()`,
      name: 'AbortSignal & BusDisposedError',
    },
    'async-generator': {
      code: `import { createBus } from '@vielzeug/eventit'


const bus = createBus()

// Consume events
async function consumeTicks() {
  let received = 0
  for await (const tick of bus.events('tick')) {
    console.log('Tick:', tick)
    received++
    if (received >= 3) break  // stop after 3 ticks
  }
  console.log('Done consuming ticks')
}

consumeTicks()

// Emit several ticks
let count = 0
const interval = setInterval(() => {
  bus.emit('tick', ++count)
  if (count >= 5) clearInterval(interval)
}, 30)`,
      name: 'events() - Async Generator',
    },
    'bus-basics': {
      code: `import { createBus } from '@vielzeug/eventit'

// Define your event map for full type safety

const bus = createBus()

// Subscribe to typed events
const unsubLogin = bus.on('user:login', (payload) => {
  console.log('User logged in:', payload.name, '(' + payload.userId + ')')
})

bus.on('user:logout', () => {
  console.log('User logged out')
})

bus.on('notification', (msg) => {
  console.log('Notification:', msg)
})

// Emit events (type-safe)
bus.emit('user:login', { userId: '123', name: 'Alice' })
bus.emit('notification', 'Welcome back!')
bus.emit('count:update', 42)

// Unsubscribe manually
unsubLogin()

bus.emit('user:login', { userId: '456', name: 'Bob' })
console.log('Login listener removed — no log above for Bob')

// Total listener count
console.log('Active listeners:', bus.listenerCount())

bus.dispose()`,
      name: 'createBus - Basics',
    },
    'once-and-wait': {
      code: `import { createBus } from '@vielzeug/eventit'


const bus = createBus()

// Subscribe once — auto-removes after first emit
bus.once('data:ready', (payload) => {
  console.log('Data arrived (once):', payload.items)
})

bus.emit('data:ready', { items: ['alpha', 'beta', 'gamma'] })
bus.emit('data:ready', { items: ['will not fire once listener'] })

// Await the next emit
async function waitForTask() {
  console.log('Waiting for task to complete...')
  const result = await bus.wait('task:done')
  console.log('Task done! Result:', result.result)
}

waitForTask()

// Simulate task completing after a delay
setTimeout(() => {
  bus.emit('task:done', { result: 99 })
}, 50)`,
      name: 'once() and wait()',
    },
  },
  fetchit: {
    'http-client-basic': {
      code: `import { createApi } from '@vielzeug/fetchit'

const http = createApi({
  baseUrl: 'https://jsonplaceholder.typicode.com',
  timeout: 5000,
})

console.log('Fetchit HTTP client created!')

// GET request
const todo = await http.get('/todos/1')
console.log('GET /todos/1:', todo)

// POST request
const newTodo = await http.post('/todos', {
  body: { title: 'New Todo', completed: false, userId: 1 },
})
console.log('POST /todos:', newTodo)`,
      name: 'HTTP Client - Basic Requests',
    },
    'http-client-headers': {
      code: `import { createApi } from '@vielzeug/fetchit'

const http = createApi({
  baseUrl: 'https://jsonplaceholder.typicode.com',
  headers: {
    Authorization: 'Bearer token123',
    'X-Custom-Header': 'CustomValue',
  },
})

console.log('HTTP client created with custom headers')

// Update headers dynamically
http.headers({ Authorization: 'Bearer newtoken456' })
console.log('Headers updated successfully')

// Make request with updated headers
const data = await http.get('/posts/1')
console.log('Fetched with new headers:', data.title)`,
      name: 'HTTP Client - Custom Headers',
    },
    'http-client-methods': {
      code: `import { createApi } from '@vielzeug/fetchit'

const http = createApi({ baseUrl: 'https://jsonplaceholder.typicode.com' })

// GET
const post = await http.get('/posts/1')
console.log('GET:', post.title)

// POST
const created = await http.post('/posts', {
  body: { title: 'New Post', body: 'Content', userId: 1 },
})
console.log('POST id:', created.id)

// PUT
const updated = await http.put('/posts/1', {
  body: { id: 1, title: 'Updated', body: 'New content', userId: 1 },
})
console.log('PUT:', updated.title)

// PATCH
const patched = await http.patch('/posts/1', {
  body: { title: 'Patched Title' },
})
console.log('PATCH:', patched.title)

// DELETE
await http.delete('/posts/1')
console.log('DELETE: Success')`,
      name: 'HTTP Client - All Methods',
    },
    'http-client-params': {
      code: `import { createApi } from '@vielzeug/fetchit'

const http = createApi({ baseUrl: 'https://jsonplaceholder.typicode.com' })

// GET with query parameters
const posts = await http.get('/posts', {
  query: { userId: 1, _limit: 5 },
})
console.log('Filtered posts count:', posts.length)

// GET with path parameters (curly-brace or colon style)
const user = await http.get('/users/{id}', {
  params: { id: 1 },
})
console.log('User:', user.name)

// Combine path and query parameters
const userPosts = await http.get('/users/{userId}/posts', {
  params: { userId: 1 },
  query: { _limit: 3 },
})
console.log('User posts:', userPosts.length, 'items')`,
      name: 'HTTP Client - Path & Query Parameters',
    },
    'http-interceptors': {
      code: `import { createApi, HttpError } from '@vielzeug/fetchit'

const http = createApi({ baseUrl: 'https://jsonplaceholder.typicode.com' })

// Add a request/response interceptor
const remove = http.use(async (ctx, next) => {
  console.log('→ Request:', ctx.url)
  const start = Date.now()
  try {
    const response = await next(ctx)
    console.log(\`← Response: \${ctx.url} (\${Date.now() - start}ms)\`)
    return response
  } catch (err) {
    if (HttpError.is(err)) {
      console.error(\`← Error \${err.status}: \${ctx.url}\`)
    }
    throw err
  }
})

const data = await http.get('/posts/1')
console.log('Post:', data.title)

// Remove the interceptor
remove()`,
      name: 'HTTP Client - Interceptors',
    },
    'query-client-basic': {
      code: `import { createQuery, createApi } from '@vielzeug/fetchit'

const http = createApi({ baseUrl: 'https://jsonplaceholder.typicode.com' })

const queryClient = createQuery({ staleTime: 5000, gcTime: 300000 })

// First call — hits the network
console.log('First query...')
const data1 = await queryClient.query({
  queryKey: ['posts', 1],
  queryFn: () => http.get('/posts/1'),
})
console.log('Data:', data1.title)

// Second call — served from cache (within staleTime)
console.log('Second query (cached)...')
const data2 = await queryClient.query({
  queryKey: ['posts', 1],
  queryFn: () => http.get('/posts/1'),
})
console.log('Data:', data2.title)
console.log('✓ Second request used cached data!')`,
      name: 'Query Client - Basic Caching',
    },
    'query-client-invalidate': {
      code: `import { createQuery, createApi } from '@vielzeug/fetchit'

const http = createApi({ baseUrl: 'https://jsonplaceholder.typicode.com' })
const queryClient = createQuery()

// Fetch and cache
await queryClient.query({
  queryKey: ['users'],
  queryFn: () => http.get('/users'),
})
console.log('✓ Data cached for key: ["users"]')

queryClient.invalidate(['users'])
console.log('✓ Cache invalidated for ["users"]')

// Cache individual entries
await queryClient.query({ queryKey: ['users', 1], queryFn: () => http.get('/users/1') })
await queryClient.query({ queryKey: ['users', 2], queryFn: () => http.get('/users/2') })
console.log('✓ Cached ["users", 1] and ["users", 2]')

// Invalidate all 'users' queries via prefix
queryClient.invalidate(['users'])
console.log('✓ All "users" queries invalidated')`,
      name: 'Query Client - Cache Invalidation',
    },
    'query-client-mutations': {
      code: `import { createMutation, createApi } from '@vielzeug/fetchit'

const http = createApi({ baseUrl: 'https://jsonplaceholder.typicode.com' })

// Standalone createMutation
const createPost = createMutation(
  (variables: { title: string; body: string; userId: number }) =>
    http.post('/posts', { body: variables }),
  {
    onSuccess: (data, variables) => {
      console.log('✓ Post created:', data.id)
      console.log('  Title:', variables.title)
    },
    onError: (error) => {
      console.error('✗ Mutation failed:', error.message)
    },
  }
)

const result = await createPost.mutate({ title: 'New Post', body: 'Content', userId: 1 })
console.log('Result:', result)`,
      name: 'Mutations - createMutation',
    },
    'query-client-subscriptions': {
      code: `import { createQuery, createApi } from '@vielzeug/fetchit'

const http = createApi({ baseUrl: 'https://jsonplaceholder.typicode.com' })
const queryClient = createQuery()

// Subscribe to query state changes
const unsubscribe = queryClient.subscribe(['posts', 1], (state) => {
  console.log('Query state:', {
    status: state.status,
    isSuccess: state.isSuccess,
    isLoading: state.isLoading,
  })
})

// Fetch triggers subscribers
await queryClient.query({
  queryKey: ['posts', 1],
  queryFn: () => http.get('/posts/1'),
})

unsubscribe()
console.log('Unsubscribed')`,
      name: 'Query Client - Subscriptions',
    },
  },
  floatit: {
    'auto-update': {
      code: `import { positionFloat, offset, flip, shift, autoUpdate } from '@vielzeug/floatit'

const button = document.createElement('button')
button.textContent = 'Reference'
button.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);padding:8px 16px;'
document.body.appendChild(button)

const dropdown = document.createElement('div')
dropdown.textContent = 'I stay positioned!'
dropdown.style.cssText = 'position:fixed;background:#fff;border:1px solid #e5e5e5;border-radius:6px;padding:12px 16px;box-shadow:0 4px 12px rgba(0,0,0,.1);'
document.body.appendChild(dropdown)

async function update() {
  await positionFloat(button, dropdown, {
    placement: 'bottom-start',
    middleware: [offset(4), flip(), shift({ padding: 8 })],
  })
}

// autoUpdate re-runs 'update' on scroll, resize, and DOM changes
const cleanup = autoUpdate(button, dropdown, update)

update()

console.log('autoUpdate running — resize the window or scroll to see re-positioning')

// Stop tracking when the dropdown closes:
// cleanup()`,
      name: 'autoUpdate - Track on Scroll/Resize',
    },
    'position-basic': {
      code: `import { computePosition } from '@vielzeug/floatit'

const button = document.createElement('button')
button.textContent = 'Hover me'
button.style.cssText = 'margin: 80px; padding: 8px 16px;'
document.body.appendChild(button)

const tooltip = document.createElement('div')
tooltip.textContent = 'I am a tooltip!'
tooltip.style.cssText = 'position:fixed;background:#1e293b;color:#fff;padding:6px 10px;border-radius:4px;font-size:13px;pointer-events:none;'
document.body.appendChild(tooltip)

async function updatePosition() {
  const { x, y, placement } = await computePosition(button, tooltip, {
    placement: 'top',
  })
  tooltip.style.left = x + 'px'
  tooltip.style.top = y + 'px'
  console.log('Placed at:', placement, '→', Math.round(x), Math.round(y))
}

button.addEventListener('mouseenter', updatePosition)
updatePosition()`,
      name: 'computePosition - Basic',
    },
    'position-float': {
      code: `import { positionFloat, offset, flip, shift } from '@vielzeug/floatit'

const button = document.createElement('button')
button.textContent = 'Click for tooltip'
button.style.cssText = 'margin:100px;padding:8px 16px;'
document.body.appendChild(button)

const tooltip = document.createElement('div')
tooltip.textContent = 'Smart tooltip with middleware!'
tooltip.style.cssText = 'position:fixed;background:#1e293b;color:#fff;padding:8px 12px;border-radius:6px;font-size:13px;pointer-events:none;'
document.body.appendChild(tooltip)

// positionFloat applies left/top styles automatically
async function update() {
  const placement = await positionFloat(button, tooltip, {
    placement: 'top',
    middleware: [
      offset(8),          // 8px gap between button and tooltip
      flip(),             // flip to bottom if no space above
      shift({ padding: 8 }), // keep within viewport edges
    ],
  })
  tooltip.dataset.placement = placement
  console.log('Final placement:', placement)
}

update()`,
      name: 'positionFloat - With Middleware',
    },
    'size-middleware': {
      code: `import { positionFloat, offset, flip, size } from '@vielzeug/floatit'

const button = document.createElement('button')
button.textContent = 'Open dropdown'
button.style.cssText = 'margin:50px;padding:8px 16px;'
document.body.appendChild(button)

const dropdown = document.createElement('div')
dropdown.style.cssText = 'position:fixed;background:#fff;border:1px solid #e5e5e5;border-radius:6px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,.1);'
// Populate dropdown with many items
for (let i = 1; i <= 20; i++) {
  const item = document.createElement('div')
  item.textContent = 'Option ' + i
  item.style.cssText = 'padding:8px 16px;cursor:pointer;'
  dropdown.appendChild(item)
}
document.body.appendChild(dropdown)

positionFloat(button, dropdown, {
  placement: 'bottom-start',
  middleware: [
    offset(4),
    flip(),
    size({
      padding: 8,
      apply: ({ availableHeight, elements }) => {
        // Constrain dropdown height to available viewport space
        elements.floating.style.maxHeight = Math.min(availableHeight, 300) + 'px'
        console.log('Available height:', availableHeight)
      },
    }),
  ],
})`,
      name: 'size() - Constrain Height',
    },
  },
  formit: {
    'array-fields': {
      code: `import { createForm } from '@vielzeug/formit'

const form = createForm({
  defaultValues: {
    tags: ['javascript', 'typescript'],
  },
})

console.log('Initial tags:', form.get('tags'))

// Append a new tag
form.appendField('tags', 'react')
console.log('After append:', form.get('tags'))

// Remove second item (index 1)
form.removeField('tags', 1)
console.log('After remove index 1:', form.get('tags'))

// Move first item to last position
form.moveField('tags', 0, 1)
console.log('After move:', form.get('tags'))`,
      name: 'Array Fields - Dynamic Lists',
    },
    'create-form': {
      code: `import { createForm } from '@vielzeug/formit'

const form = createForm({
  defaultValues: {
    name: '',
    email: '',
    age: 0,
  },
})

console.log('Form created!')
console.log('Initial values:', form.values())
console.log('Name:', form.get('name'))
console.log('Is valid:', form.isValid)
console.log('Is dirty:', form.isDirty)`,
      name: 'Create Form - Basic Setup',
    },
    'field-binding': {
      code: `import { createForm } from '@vielzeug/formit'

const form = createForm({
  defaultValues: {
    firstName: '',
    lastName: '',
    email: '',
  },
})

// bind() returns live getters compatible with HTML inputs
const firstNameBind = form.bind('firstName')
const emailBind = form.bind('email')

console.log('Binding for firstName:', {
  name: firstNameBind.name,
  value: firstNameBind.value,
})

// Simulate user input — call onChange with an Event-like object
firstNameBind.onChange({ target: { value: 'John' } })
emailBind.onChange({ target: { value: 'john@example.com' } })

console.log('Form values after input:', form.values())
console.log('Touched fields:', form.isTouched)`,
      name: 'Field Binding for Inputs',
    },
    'field-operations': {
      code: `import { createForm } from '@vielzeug/formit'

const form = createForm({
  defaultValues: {
    name: 'Alice',
    age: 25,
  },
})

console.log('Initial:', form.values())

// Set single field
form.set('name', 'Bob')
console.log('After set name:', form.get('name'))

// Patch multiple fields at once
form.patch({ name: 'Charlie', age: 30 })
console.log('After patch:', form.values())

// Dirty tracking
console.log('Is dirty:', form.isDirty)
console.log('Name dirty:', form.isFieldDirty('name'))

// Reset to initial
form.reset()
console.log('After reset:', form.values())`,
      name: 'Field Operations - Get/Set/Patch',
    },
    'form-submission': {
      code: `import { createForm, FormValidationError } from '@vielzeug/formit'

const form = createForm({
  defaultValues: {
    username: '',
    email: '',
  },
  validators: {
    username: (v) => (!v ? 'Username is required' : undefined),
    email: (v) => {
      if (!v) return 'Email is required'
      if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(v))) return 'Invalid email'
    },
  },
})

form.set('username', 'johndoe')
form.set('email', 'john@example.com')

try {
  const result = await form.submit(async (values) => {
    console.log('Submitting...', values)
    await new Promise((r) => setTimeout(r, 500))
    return { success: true, id: 123 }
  })
  console.log('✓ Form submitted!', result)
} catch (error) {
  if (error instanceof FormValidationError) {
    console.error('✗ Validation errors:', error.errors)
  } else {
    console.error('✗ Submission error:', error)
  }
}`,
      name: 'Form Submission with Validation',
    },
    'form-subscriptions': {
      code: `import { createForm } from '@vielzeug/formit'

const form = createForm({
  defaultValues: {
    name: '',
    email: '',
  },
})

// Subscribe to entire form state
const unsubscribe = form.subscribe((state) => {
  console.log('Form state:', {
    isDirty: state.isDirty,
    isValid: state.isValid,
    errors: state.errors,
  })
})

// Watch a specific field (replaces subscribeOnly)
const unsubEmail = form.watch('email', (field) => {
  console.log('Email field:', {
    value: field.value,
    error: field.error,
    touched: field.touched,
    dirty: field.dirty,
  })
})

form.set('name', 'Alice')
form.set('email', 'alice@example.com')

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
  defaultValues: {
    email: '',
    password: '',
    confirmPassword: '',
  },
  validators: {
    email: (v) => {
      if (!v) return 'Email is required'
      if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(v))) return 'Invalid email format'
    },
    password: (v) => {
      if (!v) return 'Password is required'
      if (String(v).length < 8) return 'Min 8 characters'
    },
  },
  validator: (values) => {
    const errors: Record<string, string> = {}
    if (values.password !== values.confirmPassword) {
      errors.confirmPassword = 'Passwords must match'
    }
    return errors
  },
})

form.set('email', 'invalid-email')
form.set('password', 'short')
form.set('confirmPassword', 'different')

const { errors, valid } = await form.validate()
console.log('Valid:', valid)
console.log('Errors:', errors)

form.set('email', 'user@example.com')
form.set('password', 'password123')
form.set('confirmPassword', 'password123')

const result2 = await form.validate()
console.log('After fixing:', result2.valid ? '✓ Valid' : 'Still errors')`,
      name: 'Field & Form Validation',
    },
    'schema-integration': {
      code: `import { createForm, fromSchema } from '@vielzeug/formit'

// Works with any schema library that exposes safeParse
// Example using a minimal compatible schema shape:
const mockSchema = {
  safeParse: (data) => {
    const issues: { message: string; path: string[] }[] = []
    const d = data
    if (!d.username || String(d.username).length < 3) {
      issues.push({ message: 'Min 3 characters', path: ['username'] })
    }
    if (!d.email || !String(d.email).includes('@')) {
      issues.push({ message: 'Invalid email', path: ['email'] })
    }
    if (issues.length) {
      return { success: false, error: { issues } }
    }
    return { success: true, data }
  },
}

const form = createForm({
  defaultValues: {
    username: '',
    email: '',
  },
  ...fromSchema(mockSchema),
})

form.set('username', 'ab')
form.set('email', 'notanemail')

const { errors, valid } = await form.validate()
console.log('Valid:', valid)
console.log('Errors:', errors)`,
      name: 'Schema Integration - fromSchema',
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
await i18n.setLocale('es')
console.log('\\nSpanish:')
console.log(i18n.t('and', { options }))
console.log(i18n.t('or', { flavors: ['vainilla', 'chocolate'] }))`,
      name: 'Array Formatting with Separators',
    },
    'async-loading': {
      code: `import { createI18n } from '@vielzeug/i18nit'

// Reusable loader function that receives locale
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
    es: loadLocale,  // Receives 'es'
    fr: loadLocale,  // Receives 'fr'
    de: loadLocale   // Receives 'de'
  }
})

console.log('Current:', i18n.t('greeting'))

// Load Spanish
console.log('\\nLoading Spanish...')
await i18n.setLocale('es')
console.log('Spanish:', i18n.t('greeting'))
console.log('Spanish farewell:', i18n.t('farewell'))

// Dynamically register and load German
console.log('\\nDynamically registering German...')
i18n.registerLoader('de', loadLocale)
await i18n.setLocale('de')
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

console.log('Current locale:', i18n.locale)
console.log('EN:', i18n.t('hello'))

await i18n.setLocale('es')
console.log('ES:', i18n.t('hello'))

console.log('With variable:', i18n.t('welcome', { name: 'Alice' }))`,
      name: 'Basic Setup - Initialize i18n',
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
await i18n.setLocale('de-DE')
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
      common: { hello: 'Hello', goodbye: 'Goodbye' },
      errors: { notFound: 'Not found', unauthorized: 'Unauthorized' },
      nav: { home: 'Home', about: 'About' }
    }
  }
})

// Use scope() helper
const common = i18n.scope('common')
const errors = i18n.scope('errors')
const nav = i18n.scope('nav')

console.log('Common:', common.t('hello'))
console.log('Errors:', errors.t('notFound'))
console.log('Nav:', nav.t('home'))`,
      name: 'Namespaces for Organization',
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

// Use scope() for cleaner code
const userNs = i18n.scope('user')
console.log('\\nWith scope:')
console.log(userNs.t('greeting', { name: 'Bob' }))
console.log(userNs.t('profile.settings'))

// Switch locale
await i18n.setLocale('es')
console.log('\\nSpanish:')
console.log(i18n.t('user.profile.title'))
console.log(i18n.t('app.navigation.menu.home'))`,
      name: 'Nested Message Objects',
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

await i18n.setLocale('es')
console.log('ES:', i18n.t('greeting'))

await i18n.setLocale('fr')
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
Logit.setConfig({
  variant: 'symbol', // 'text' | 'symbol' | 'icon'
  logLevel: 'debug',
  environment: true,
  timestamp: true
})

Logit.info('Configured with symbols')

// Change variant
Logit.setConfig({ variant: 'text' })
Logit.info('Now using text variant')

Logit.setConfig({ variant: 'icon' })
Logit.info('Now using icon variant')

// Toggle environment indicator
Logit.setConfig({ environment: false })
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
console.log('Current level:', Logit.config.logLevel)

// Set to only show warnings and errors
Logit.setConfig({ logLevel: 'warn' })

Logit.debug('This will not appear')
Logit.info('This will not appear')
Logit.warn('This will appear')
Logit.error('This will appear')

// Reset to show all
Logit.setConfig({ logLevel: 'debug' })
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
permit.define('admin', 'users', {
  read: true,
  create: true,
  update: true,
  delete: true,
})

permit.define('user', 'profile', {
  read: true,
  update: true,
})

permit.define('guest', 'posts', {
  read: true,
})

console.log('Permissions registered!')`,
      name: 'Basic Setup - Role Permissions',
    },
    'dynamic-permissions': {
      code: `import { createPermit } from '@vielzeug/permit'

const permit = createPermit()

// Function-based permissions — receives user + optional data
permit.define('user', 'posts', {
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

permit.define('editor', 'articles', {
  read: true,
  create: true,
  update: true,
  delete: false,
})

permit.define('viewer', 'articles', {
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
permit.define('user', 'comments', { read: true, create: true })
console.log('Initial permissions set')

// Re-define with additional actions (overwrites previous)
permit.define('user', 'comments', { read: true, create: true, update: true })
console.log('Permissions updated')

// Re-define to overwrite entirely
permit.define('user', 'comments', { read: true, delete: true })
console.log('Permissions overwritten')

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
      code: `import { createPermit, hasRole } from '@vielzeug/permit'

const permit = createPermit()

permit.define('admin', 'users', { read: true, create: true, update: true, delete: true })
permit.define('moderator', 'posts', { read: true, update: true, delete: true })
permit.define('editor', 'posts', { read: true, update: true })

// User with multiple roles — any matching role grants access
const multiRoleUser = { id: '1', roles: ['editor', 'moderator'] }

console.log('Can read posts:', permit.check(multiRoleUser, 'posts', 'read'))
console.log('Can delete posts:', permit.check(multiRoleUser, 'posts', 'delete'))

console.log('\\nHas editor role:', hasRole(multiRoleUser, 'editor'))
console.log('Has admin role:', hasRole(multiRoleUser, 'admin'))`,
      name: 'Role Hierarchy & Multiple Roles',
    },
    'wildcard-permissions': {
      code: `import { createPermit, WILDCARD } from '@vielzeug/permit'

const permit = createPermit()

// Admin has access to every resource via wildcard
permit.define('admin', WILDCARD, { read: true, create: true, update: true, delete: true })

// Regular user has limited access
permit.define('user', 'posts', { read: true })

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
  .on('/', () => {
    console.log('Home page')
  })
  .on('/about', () => {
    console.log('About page')
  })
  .on('/users/:id', ({ params }) => {
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

  ctx.locals.user = authService.currentUser
  console.log('✅ Authenticated as:', ctx.locals.user.name)
  await next()
}

const router = createRouter()

router
  .on('/login', () => {
    console.log('📝 Login page')
  })
  .on('/dashboard', (ctx) => {
    console.log('📊 Dashboard - Welcome,', ctx.locals.user.name)
  }, { middleware: requireAuth })
  .on('/profile', (ctx) => {
    console.log('👤 Profile for:', ctx.locals.user.name)
    console.log('   User ID:', ctx.locals.user.id)
    console.log('   Roles:', ctx.locals.user.roles)
  }, { middleware: requireAuth })
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
  ctx.locals.user = { id: 1, name: 'Alice', role: 'admin' }
  await next()
}

// Permission middleware
const requireAdmin = async (ctx, next) => {
  console.log('    👮 Permission: Checking admin...')
  if (ctx.locals.user?.role !== 'admin') {
    console.log('    ❌ Permission denied')
    return
  }
  console.log('    ✅ Admin verified')
  await next()
}

// Data loader middleware
const loadData = async (ctx, next) => {
  console.log('      📦 Loading data...')
  ctx.locals.data = { loaded: true, timestamp: Date.now() }
  await next()
}

const router = createRouter({ middleware: [logger] })

router
  .on('/admin/panel', (ctx) => {
    console.log('        🎯 Handler: Admin panel')
    console.log('        User:', ctx.locals.user?.name)
    console.log('        Data loaded:', ctx.locals.data?.loaded)
  }, { middleware: [auth, requireAdmin, loadData] })
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
  .on('/', () => console.log('🏠 Home'), { name: 'home' })
  .on('/users/:id', ({ params }) => {
    console.log('👤 User Detail - ID:', params.id)
  }, { name: 'userDetail' })
  .on('/posts/:postId/comments/:commentId', ({ params }) => {
    console.log('💬 Post:', params.postId, 'Comment:', params.commentId)
  }, { name: 'postComment' })
  .start()

// Navigate by name
console.log('Navigate to home:')
router.navigate({ name: 'home' })

console.log('\\nNavigate to user 42:')
router.navigate({ name: 'userDetail', params: { id: '42' } })

console.log('\\nNavigate to post comment:')
router.navigate({ name: 'postComment', params: { postId: '5', commentId: '12' } })

// Build URLs
console.log('\\n--- Building URLs ---')
console.log('User 123 URL:', router.url('userDetail', { id: '123' }))
console.log('Comment URL:', router.url('postComment', {
  postId: '10',
  commentId: '50'
}))`,
      name: 'Named Routes - Type-Safe Navigation',
    },
    'nested-routes': {
      code: `import { createRouter } from '@vielzeug/routeit'

const router = createRouter()

router.group('/admin', (r) => {
  r.on('/', () => {
    console.log('📂 Admin section')
  })
  r.on('/dashboard', () => {
    console.log('  📊 Admin Dashboard')
  })
  r.on('/users', () => {
    console.log('  👥 User Management')
  })
  r.on('/settings', () => {
    console.log('  ⚙️ Admin Settings')
  })
})

router.group('/blog', (r) => {
  r.on('/', () => {
    console.log('📝 Blog section')
  })
  r.on('/posts/:id', ({ params }) => {
    console.log('  📄 Post:', params.id)
  })
  r.on('/categories/:category', ({ params }) => {
    console.log('  🏷️ Category:', params.category)
  })
})

router.start()

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
  .on('/search', ({ query }) => {
    console.log('🔍 Search page')
    console.log('   Query:', query.q)
    console.log('   Page:', query.page || '1')
    console.log('   Sort:', query.sort || 'relevance')
  })
  .on('/products', ({ query, params }) => {
    console.log('🛍️ Products page')
    console.log('   Category:', query.category)
    console.log('   Price range:', query.min, '-', query.max)
    console.log('   Tags:', query.tags) // Array support
  })
  .on('/users/:id/posts', ({ params, query }) => {
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
  .on('/users/:userId/posts/:postId', (ctx) => {
    console.log('📄 Route Context:')
    console.log('   Pathname:', ctx.pathname)
    console.log('   Params:', ctx.params)
    console.log('   Meta (static):', ctx.meta)
    console.log('   User (from middleware):', ctx.locals.user)
  }, {
    meta: {
      title: 'Post Detail',
      requiresAuth: true,
      breadcrumbs: ['Home', 'Users', 'Posts']
    },
    middleware: async (ctx, next) => {
      // Store dynamic data in ctx.locals
      ctx.locals.startTime = Date.now()

      // Simulate user loading
      ctx.locals.user = {
        id: parseInt(ctx.params.userId),
        name: 'Alice'
      }

      await next()

      // Log after handler
      const elapsed = Date.now() - ctx.locals.startTime
      console.log(\`\\n⏱️ Took \${elapsed}ms\`)
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
  .on('/users/:id', () => {}, { name: 'user' })
  .on('/posts/:postId/comments/:commentId', () => {}, { name: 'comment' })
  .start()

console.log('🔗 URL Building Examples:\\n')

// Build with params
const userUrl = router.url('/users/:id', { id: '123' })
console.log('User URL:', userUrl)

// Build with query params
const searchUrl = router.url('/search', undefined, {
  q: 'typescript',
  page: '2',
  tags: ['tutorial', 'advanced']
})
console.log('Search URL:', searchUrl)

// Build with both
const profileUrl = router.url(
  '/users/:id',
  { id: '456' },
  { tab: 'posts', sort: 'recent' }
)
console.log('Profile URL:', profileUrl)

// Named routes
const commentUrl = router.url('comment', {
  postId: '10',
  commentId: '25'
})
console.log('Comment URL:', commentUrl)

// Named route with query
const userPostsUrl = router.url('user', { id: '789' })
console.log('User posts URL:', userPostsUrl)`,
      name: 'URL Building - Dynamic URLs',
    },
  },
  stateit: {
    'basic-signal': {
      code: `import { signal, effect, computed, batch } from '@vielzeug/stateit'

// Create reactive signals
const count = signal(0)
const name = signal('World')

// Computed derives from signals automatically
const greeting = computed(() => \`Hello, \${name.value}! Count: \${count.value}\`)

// Effect re-runs when dependencies change
effect(() => {
  console.log('Greeting:', greeting.value)
})

// Updates trigger effects
count.value = 1
name.value = 'Alice'

// Batch multiple writes into one flush
batch(() => {
  count.value = 10
  name.value = 'Bob'
})
// Only one re-run after the batch`,
      name: 'Signal, Computed & Effect',
    },
    'batch-untrack': {
      code: `import { signal, effect, batch, untrack } from '@vielzeug/stateit'

const a = signal(1)
const b = signal(2)

let effectRuns = 0
effect(() => {
  // Reading a and b makes them dependencies
  const sum = a.value + b.value
  effectRuns++
  console.log(\`Effect run #\${effectRuns}: sum = \${sum}\`)
})

// Without batch: each write triggers the effect
a.value = 10  // run #2
b.value = 20  // run #3

// Batch: flush only once after the block
batch(() => {
  a.value = 100
  b.value = 200
})  // run #4 (single run for both updates)

// untrack: read without registering dependency
effect(() => {
  const tracked = a.value        // tracked
  const peeked = untrack(() => b.value)  // NOT tracked
  console.log('peeked b:', peeked)
})

b.value = 999  // won't re-run the untrack effect`,
      name: 'Batch & Untrack',
    },
    'derived-signals': {
      code: `import { signal, derived, computed } from '@vielzeug/stateit'

const price = signal(100)
const quantity = signal(2)
const taxRate = signal(0.1)

// derived() — combine multiple source signals
const subtotal = derived([price, quantity], (p, q) => p * q)
const tax = computed(() => subtotal.value * taxRate.value)
const total = computed(() => subtotal.value + tax.value)

console.log('Subtotal:', subtotal.value)
console.log('Tax:', tax.value)
console.log('Total:', total.value)

// Update sources — all derived values re-compute
price.value = 150
console.log('After price change:')
console.log('Subtotal:', subtotal.value)
console.log('Total:', total.value)`,
      name: 'Derived Signals',
    },
    'next-value': {
      code: `import { signal, nextValue } from '@vielzeug/stateit'

const status = signal('idle')

// nextValue: wait for the next emission that satisfies the predicate
const waitForDone = nextValue(status, (v) => v === 'done')

// Simulate async state transitions
setTimeout(() => { status.value = 'loading'; console.log('→ loading') }, 100)
setTimeout(() => { status.value = 'done'; console.log('→ done') }, 300)

const finalStatus = await waitForDone
console.log('Resolved to:', finalStatus)

// Without predicate — resolves on next emission
const counter = signal(0)
const next = nextValue(counter)
counter.value = 42
console.log('Next value:', await next)`,
      name: 'nextValue - Await Signal Change',
    },
    'store-basics': {
      code: `import { store } from '@vielzeug/stateit'

// Create an object-state store
const user = store({ name: 'Alice', age: 30, email: 'alice@example.com' })

console.log('Initial:', user.value)

// Shallow-merge partial updates
user.patch({ age: 31 })
console.log('After patch:', user.value)

// Derive next state via updater
user.update((s) => ({ ...s, name: 'Alice Smith' }))
console.log('After update:', user.value)

// Select a slice
const greeting = user.select((s) => \`\${s.name} (age \${s.age})\`)
console.log('Greeting:', greeting.value)

// Reset to initial state
user.reset()
console.log('After reset:', user.value)`,
      name: 'Store - Object State',
    },
    'store-todo-list': {
      code: `import { store, computed } from '@vielzeug/stateit'


const todos = store({
  items: [],
  filter: 'all',
})

const visible = todos.select((s) =>
  s.filter === 'active' ? s.items.filter((t) => !t.done)
  : s.filter === 'done' ? s.items.filter((t) => t.done)
  : s.items
)

// Add todos
todos.update((s) => ({
  ...s,
  items: [
    { id: 1, text: 'Learn stateit', done: false },
    { id: 2, text: 'Build app', done: false },
    { id: 3, text: 'Deploy', done: true },
  ],
}))

console.log('All:', visible.value.map((t) => t.text))

todos.patch({ filter: 'active' })
console.log('Active:', visible.value.map((t) => t.text))

todos.patch({ filter: 'done' })
console.log('Done:', visible.value.map((t) => t.text))`,
      name: 'Store - Todo List',
    },
    'watch-and-subscribe': {
      code: `import { signal, store, watch } from '@vielzeug/stateit'

const counter = signal(0)

// watch: fires whenever the signal changes
const sub = watch(counter, (next, prev) => {
  console.log(\`Count: \${prev} → \${next}\`)
})

counter.value = 1
counter.value = 2
counter.value = 3

sub.dispose()
counter.value = 4 // No log — disposed

// Store subscriptions
const cart = store({ items: 0, total: 0 })
const itemsSignal = cart.select((s) => s.items)

watch(itemsSignal, (n) => console.log('Items changed:', n))

cart.patch({ items: 2, total: 29.98 })
cart.patch({ items: 3 })`,
      name: 'Watch & Subscribe',
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
      code: `import { select } from '@vielzeug/toolkit'

const users = [
  { name: 'Alice', age: 25, active: true },
  { name: 'Bob', age: 30, active: false },
  { name: 'Charlie', age: 35, active: true },
  { name: 'David', age: 28, active: true }
]

// select as filter: identity callback + predicate
const activeUsers = select(users, u => u, u => u.active)
console.log('Active users:', activeUsers)

const over30 = select(users, u => u, u => u.age > 30)
console.log('Users over 30:', over30)

// select as map+filter combined
const activeNames = select(users, u => u.name, u => u.active)
console.log('Active user names:', activeNames)`,
      name: 'select - Filter and map array elements',
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
      code: `import { select } from '@vielzeug/toolkit'

const numbers = [1, 2, 3, 4, 5]

// select as map: transform all items
const doubled = select(numbers, n => n * 2)
console.log('Doubled:', doubled)

const strings = select(numbers, n => \`Number: \${n}\`)
console.log('Formatted:', strings)

// select: map and filter in one step
const evenDoubled = select(numbers, n => n * 2, n => n % 2 === 0)
console.log('Even numbers doubled:', evenDoubled)`,
      name: 'select - Transform array elements',
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

const changes = diff(after, before)
console.log('Changes detected:', changes)`,
      name: 'diff - Compare objects',
    },
    'object-merge': {
      code: `import { merge } from '@vielzeug/toolkit'

const obj1 = { a: 1, b: { c: 2 }, d: [1, 2] }
const obj2 = { b: { d: 3 }, e: 4, d: [3, 4] }
const obj3 = { a: 10, f: 5 }

const merged = merge('deep', obj1, obj2, obj3)
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

console.log('Merged configs:', merge('deep', config1, config2))`,
      name: 'merge - Deep merge objects',
    },
    'object-prune': {
      code: `import { prune } from '@vielzeug/toolkit'

const data = {
  name: '  Alice  ',
  age: 30,
  tags: ['js', null, '', 'ts', undefined],
  settings: { theme: 'dark', extra: null, empty: {} }
}

const cleaned = prune(data)
console.log('Pruned object:', cleaned)

// Prune array
const mixed = [1, null, 2, undefined, '', 3]
console.log('Pruned array:', prune(mixed))

// Prune string
console.log('Trimmed:', prune('  hello world  '))
console.log('Empty string:', prune('    ')) // undefined`,
      name: 'prune - Remove empty values',
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
  virtualit: {
    'basic-list': {
      code: `import { Virtualizer } from '@vielzeug/virtualit'

const ITEM_COUNT = 10_000
const ROW_HEIGHT = 40

// Build a scrollable container
const container = document.createElement('div')
container.style.cssText = 'height:400px;overflow-y:auto;border:1px solid #e5e5e5;border-radius:4px;position:relative;'
document.body.appendChild(container)

// Spacer div sets the total scroll height
const spacer = document.createElement('div')
const content = document.createElement('div')
content.style.cssText = 'position:absolute;top:0;left:0;right:0;'
container.appendChild(spacer)
container.appendChild(content)

const virtualizer = new Virtualizer({
  count: ITEM_COUNT,
  estimateSize: ROW_HEIGHT,
  onChange: (items, totalSize) => {
    spacer.style.height = totalSize + 'px'
    content.innerHTML = ''
    items.forEach(({ index, top, height }) => {
      const row = document.createElement('div')
      row.style.cssText = \`position:absolute;top:\${top}px;left:0;right:0;height:\${height}px;display:flex;align-items:center;padding:0 16px;border-bottom:1px solid #f0f0f0;\`
      row.textContent = \`Row #\${index + 1} of \${ITEM_COUNT}\`
      content.appendChild(row)
    })
  },
})

virtualizer.attach(container)

console.log('Virtualizer: rendering', ITEM_COUNT, 'rows efficiently')
console.log('Total height:', virtualizer.getTotalSize() + 'px')
console.log('Visible items:', virtualizer.getVirtualItems().length)`,
      name: 'Virtualizer - Basic List',
    },
    'dynamic-count': {
      code: `import { Virtualizer } from '@vielzeug/virtualit'

let items = ['Alpha', 'Beta', 'Gamma']

const container = document.createElement('div')
container.style.cssText = 'height:200px;overflow-y:auto;border:1px solid #e5e5e5;border-radius:4px;position:relative;'
document.body.appendChild(container)

const spacer = document.createElement('div')
const content = document.createElement('div')
content.style.cssText = 'position:absolute;top:0;left:0;right:0;'
container.appendChild(spacer)
container.appendChild(content)

const virtualizer = new Virtualizer({
  count: items.length,
  estimateSize: 44,
  onChange: (virtualItems, totalSize) => {
    spacer.style.height = totalSize + 'px'
    content.innerHTML = ''
    virtualItems.forEach(({ index, top, height }) => {
      const row = document.createElement('div')
      row.style.cssText = \`position:absolute;top:\${top}px;height:\${height}px;left:0;right:0;line-height:\${height}px;padding:0 16px;border-bottom:1px solid #f5f5f5;\`
      row.textContent = items[index]
      content.appendChild(row)
    })
  },
})

virtualizer.attach(container)
console.log('Initial count:', virtualizer.count)

// Dynamically add more items
setTimeout(() => {
  items = [...items, 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta']
  virtualizer.count = items.length   // triggers re-render
  console.log('Updated count:', virtualizer.count)
}, 300)`,
      name: 'Virtualizer - Dynamic Count',
    },
    'scroll-to-index': {
      code: `import { Virtualizer } from '@vielzeug/virtualit'

const ITEM_COUNT = 1_000

const container = document.createElement('div')
container.style.cssText = 'height:300px;overflow-y:auto;border:1px solid #e5e5e5;border-radius:4px;position:relative;'
document.body.appendChild(container)

const spacer = document.createElement('div')
const content = document.createElement('div')
content.style.cssText = 'position:absolute;top:0;left:0;right:0;'
container.appendChild(spacer)
container.appendChild(content)

const virtualizer = new Virtualizer({
  count: ITEM_COUNT,
  estimateSize: 48,
  onChange: (items, totalSize) => {
    spacer.style.height = totalSize + 'px'
    content.innerHTML = ''
    items.forEach(({ index, top, height }) => {
      const row = document.createElement('div')
      row.style.cssText = \`position:absolute;top:\${top}px;left:0;right:0;height:\${height}px;line-height:\${height}px;padding:0 16px;border-bottom:1px solid #f5f5f5;\`
      row.textContent = \`Item \${index}\`
      content.appendChild(row)
    })
  },
})

virtualizer.attach(container)

// Scroll to specific indexes
setTimeout(() => {
  console.log('Scrolling to index 500 (start align)')
  virtualizer.scrollToIndex(500, { align: 'start', behavior: 'smooth' })
}, 200)

setTimeout(() => {
  console.log('Scrolling to index 999 (end align)')
  virtualizer.scrollToIndex(999, { align: 'end', behavior: 'smooth' })
}, 800)

setTimeout(() => {
  console.log('Scrolling to index 250 (center align)')
  virtualizer.scrollToIndex(250, { align: 'center', behavior: 'smooth' })
}, 1400)`,
      name: 'Virtualizer - scrollToIndex',
    },
    'variable-height': {
      code: `import { Virtualizer } from '@vielzeug/virtualit'

const items = Array.from({ length: 500 }, (_, i) => ({
  id: i,
  text: 'Item ' + i + ': ' + 'lorem ipsum '.repeat(Math.floor(Math.random() * 3) + 1).trim(),
}))

const container = document.createElement('div')
container.style.cssText = 'height:400px;overflow-y:auto;border:1px solid #e5e5e5;border-radius:4px;position:relative;'
document.body.appendChild(container)

const spacer = document.createElement('div')
const content = document.createElement('div')
content.style.cssText = 'position:absolute;top:0;left:0;right:0;'
container.appendChild(spacer)
container.appendChild(content)

const virtualizer = new Virtualizer({
  count: items.length,
  estimateSize: 60,   // estimate — actual height measured after render
  onChange: (virtualItems, totalSize) => {
    spacer.style.height = totalSize + 'px'
    content.innerHTML = ''
    virtualItems.forEach(({ index, top }) => {
      const row = document.createElement('div')
      row.style.cssText = \`position:absolute;top:\${top}px;left:0;right:0;padding:12px 16px;border-bottom:1px solid #f0f0f0;word-wrap:break-word;\`
      row.textContent = items[index].text
      content.appendChild(row)
      // Report actual measured height back to the virtualizer
      requestAnimationFrame(() => {
        virtualizer.measureElement(index, row.offsetHeight)
      })
    })
  },
})

virtualizer.attach(container)
console.log('Variable height list with', items.length, 'items')`,
      name: 'Virtualizer - Variable Height',
    },
  },
  wireit: {
    'basic-container': {
      code: `import { createContainer, createToken } from '@vielzeug/wireit'

// 1. Define typed tokens
const ConfigToken  = createToken('AppConfig')
const LoggerToken  = createToken('Logger')

// 2. Create a root container
const container = createContainer()

// 3. Register providers
container
  .value(ConfigToken, { apiUrl: 'https://api.example.com', timeout: 5000 })
  .factory(LoggerToken, (config) => ({
    log: (msg) => console.log(\`[LOG] [\${config.apiUrl}] \${msg}\`)
  }), { deps: [ConfigToken] })

// 4. Resolve
const config = container.get(ConfigToken)
const logger  = container.get(LoggerToken)

logger.log('Container initialized!')
console.log('Timeout:', config.timeout, 'ms')

// 5. Batch resolution
const [cfg, log] = container.getAll([ConfigToken, LoggerToken])
log.log(\`getAll works — apiUrl = \${cfg.apiUrl}\`)`,
      name: 'Basic Container – value() & factory()',
    },
    'child-containers': {
      code: `import { createContainer, createToken } from '@vielzeug/wireit'

const ConfigToken   = createToken('Config')
const RequestToken  = createToken('Request')
const HandlerToken  = createToken('Handler')

// Root container — shared across all requests
const root = createContainer()
root
  .value(ConfigToken, { appName: 'MyApp', version: '2.0' })
  .factory(HandlerToken, (cfg, req) => ({
    handle: () => \`[\${cfg.appName}] handling \${req.id} for \${req.user}\`
  }), { deps: [ConfigToken, RequestToken] })

// Per-request child containers
function processRequest(id, user) {
  const child = root.createChild()
  child.value(RequestToken, { id, user })

  // Child inherits root providers; RequestToken is local
  const handler = child.get(HandlerToken)
  return handler.handle()
}

console.log(processRequest('req-001', 'alice'))
console.log(processRequest('req-002', 'bob'))

// Parent does NOT see the child's RequestToken
console.log('Root has RequestToken?', root.has(RequestToken))

// Debug shows full hierarchy
const { tokens } = root.createChild().debug()
console.log('Tokens visible from a new child:', tokens)`,
      name: 'Child Containers – inheritance & isolation',
    },
    'class-provider': {
      code: `import { createContainer, createToken } from '@vielzeug/wireit'

// Tokens
const DbToken   = createToken('Database')
const RepoToken = createToken('UserRepo')
const SvcToken  = createToken('UserService')

// Classes
class DatabaseImpl {
  private users = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ]
  getAll() { return this.users }
  findById(id) { return this.users.find(u => u.id === id) }
}

class UserRepoImpl {
  constructor(private db: DatabaseImpl) {}
  findAll()           { return this.db.getAll() }
  findById(id){ return this.db.findById(id) }
}

class UserServiceImpl {
  constructor(private repo: UserRepoImpl) {}
  listUsers()         { return this.repo.findAll() }
  getUser(id) { return this.repo.findById(id) }
}

// Wire everything with bind()
const container = createContainer()
container
  .bind(DbToken,   DatabaseImpl)
  .bind(RepoToken, UserRepoImpl,     { deps: [DbToken] })
  .bind(SvcToken,  UserServiceImpl,  { deps: [RepoToken] })

// Resolve & use
const svc = container.get(SvcToken)
console.log('All users:', svc.listUsers())
console.log('User #1:',   svc.getUser(1))`,
      name: 'Class Provider – bind() with deps',
    },
    lifetimes: {
      code: `import { createContainer, createToken } from '@vielzeug/wireit'

let singletonCount = 0
let transientCount = 0
let scopedCount    = 0

const SingletonT = createToken('Singleton')
const TransientT = createToken('Transient')
const ScopedT    = createToken('Scoped')

const container = createContainer()

container
  .factory(SingletonT, () => ({ id: ++singletonCount }))                       // singleton (default)
  .factory(TransientT, () => ({ id: ++transientCount }), { lifetime: 'transient' })
  .factory(ScopedT,    () => ({ id: ++scopedCount }),    { lifetime: 'scoped' })

// Singleton — always the same instance
const s1 = container.get(SingletonT)
const s2 = container.get(SingletonT)
console.log('Singleton ids:', s1.id, s2.id, '— same?', s1 === s2)

// Transient — new instance every call
const t1 = container.get(TransientT)
const t2 = container.get(TransientT)
console.log('Transient ids:', t1.id, t2.id, '— same?', t1 === t2)

// Scoped — one instance per child container
const child1 = container.createChild()
const child2 = container.createChild()
const sc1a = child1.get(ScopedT)
const sc1b = child1.get(ScopedT)  // same(within child1)
const sc2  = child2.get(ScopedT)  // different from sc1a (different child)
console.log('Scoped in child1:', sc1a.id, sc1b.id, '— same?', sc1a === sc1b)
console.log('Scoped child1 vs child2:', sc1a.id, sc2.id, '— same?', sc1a === sc2)`,
      name: 'Lifetimes – singleton, transient, scoped',
    },
    'scoped-execution': {
      code: `import { createContainer, createToken } from '@vielzeug/wireit'

const RequestIdToken = createToken('RequestId')
const UserToken      = createToken('User')
const HandlerToken   = createToken('Handler')

const container = createContainer()

container.factory(HandlerToken, async (id, user: { name: string }) => ({
  process: async () => {
    await new Promise(r => setTimeout(r, 10))  // simulate async work
    return \`Request \${id} processed for \${user.name}\`
  }
}), { deps: [RequestIdToken, UserToken] })

// runInScope() creates a child, runs fn, then disposes the child automatically
async function handleRequest(id, user: { name: string }) {
  return container.runInScope(async (scope) => {
    scope.value(RequestIdToken, id)
    scope.value(UserToken, user)

    const handler = await scope.getAsync(HandlerToken)
    return handler.process()
  })
}

// Simulate concurrent requests — each gets its own isolated scope
const results = await Promise.all([
  handleRequest('req-1', { name: 'Alice' }),
  handleRequest('req-2', { name: 'Bob' }),
  handleRequest('req-3', { name: 'Carol' }),
])

results.forEach(r => console.log(r))`,
      name: 'Scoped Execution – runInScope()',
    },
    testing: {
      code: `import { createContainer, createToken, createTestContainer } from '@vielzeug/wireit'

const DbToken  = createToken('Database')
const SvcToken = createToken('UserService')

// Production container
const appContainer = createContainer()
appContainer.factory(DbToken, () => ({
  users: { findAll: () => [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }] }
}))
appContainer.factory(SvcToken, (db) => ({
  listUsers: () => db.users.findAll()
}), { deps: [DbToken] })

// ── createTestContainer ───────────────────────────────────────────────────────
const { container, dispose } = createTestContainer(appContainer)

// Override only the parts you need
const fakeDb = { users: { findAll: () => [{ id: 99, name: 'TestUser' }] } }
container.value(DbToken, fakeDb, { overwrite: true })

const svc = container.get(SvcToken)
console.log('Test container result:', svc.listUsers())

await dispose()  // cleans up without touching appContainer

// ── container.mock() ─────────────────────────────────────────────────────────
const brokenDb = { users: { findAll: () => { throw new Error('DB down') } } }

try {
  await appContainer.mock(DbToken, brokenDb, async () => {
    appContainer.get(SvcToken).listUsers()
  })
} catch (e) {
  console.log('Caught inside mock():', e.message)
}

// DbToken is fully restored after mock()
console.log('After mock(), production users:', appContainer.get(SvcToken).listUsers())

// ── snapshot / restore ────────────────────────────────────────────────────────
const snap = appContainer.snapshot()
appContainer.value(DbToken, fakeDb, { overwrite: true })
console.log('After override:', appContainer.get(SvcToken).listUsers())

appContainer.restore(snap)
console.log('After restore:', appContainer.get(SvcToken).listUsers())`,
      name: 'Testing – mock(), createTestContainer(), snapshot()',
    },
  },
  workit: {
    'worker-abort': {
      code: `import { createWorker } from '@vielzeug/workit'

// Worker with a slow task
const worker = createWorker((input) => {
  // Busy-wait to simulate long processing
  const end = Date.now() + input.durationMs
  while (Date.now() < end) { /* busy wait */ }
  return 'completed after ' + input.durationMs + 'ms'
}, { size: 2 })

async function run() {
  // Run a short task normally
  const r1 = await worker.run({ durationMs: 10 })
  console.log('Short task:', r1)

  // Abort a queued (not yet started) task
  const controller = new AbortController()

  // Queue multiple tasks to fill the pool
  const p1 = worker.run({ durationMs: 300 })
  const p2 = worker.run({ durationMs: 300 })
  // This one will be queued and can be aborted before it starts
  const p3 = worker.run({ durationMs: 100 }, { signal: controller.signal })
    .then(r => console.log('p3 completed:', r))
    .catch(e => console.log('p3 aborted:', e.message))

  // Abort p3 before it gets a slot
  setTimeout(() => controller.abort(), 50)

  await Promise.allSettled([p1, p2, p3])

  // ES2025 'using' keyword for automatic cleanup
  {
    const w2 = createWorker((n) => n * n)
    const sq = await w2.run(7)
    console.log('7² =', sq)
  } // w2.dispose() called automatically here

  worker.dispose()
}

run()`,
      name: 'createWorker - AbortSignal & using',
    },
    'worker-basic': {
      code: `import { createWorker } from '@vielzeug/workit'

// IMPORTANT: The task function CANNOT reference outer-scope variables.
// It is serialized via .toString() and runs in an isolated Worker scope.
const worker = createWorker((input) => {
  // This runs in a Web Worker — no access to outer variables
  const { numbers } = input
  return numbers.reduce((sum, n) => sum + n, 0)
})

async function run() {
  console.log('Worker native:', worker.isNative)
  console.log('Worker size:', worker.size)
  console.log('Worker status:', worker.status)

  const result = await worker.run({ numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] })
  console.log('Sum of 1-10:', result)

  const result2 = await worker.run({ numbers: Array.from({ length: 100 }, (_, i) => i + 1) })
  console.log('Sum of 1-100:', result2)

  worker.dispose()
  console.log('Worker status after dispose:', worker.status)
}

run()`,
      name: 'createWorker - Basic',
    },
    'worker-errors': {
      code: `import { createWorker, TaskError, TaskTimeoutError, TerminatedError } from '@vielzeug/workit'

const worker = createWorker((input) => {
  // Self-contained — no outer scope access
  if (input.shouldThrow) {
    throw new Error('Task failed: ' + input.reason)
  }
  return 'success: ' + input.value
}, {
  timeout: 200,  // fail tasks that take over 200ms
})

const workerSlow = createWorker((input) => {
  // Simulate a slow task (busy loop, since setTimeout won't block the Worker)
  const end = Date.now() + 1000
  while (Date.now() < end) { /* busy wait */ }
  return 'done'
}, {
  timeout: 100,
})

async function run() {
  // Normal success
  const ok = await worker.run({ shouldThrow: false, value: 42 })
  console.log('Success:', ok)

  // Task throws → TaskError
  try {
    await worker.run({ shouldThrow: true, reason: 'bad input' })
  } catch (err) {
    if (err instanceof TaskError) {
      console.log('Caught TaskError:', err.message)
    }
  }

  // Timeout → TaskTimeoutError
  try {
    await workerSlow.run({})
  } catch (err) {
    if (err instanceof TaskTimeoutError) {
      console.log('Caught TaskTimeoutError:', err.message)
    }
  }

  // Dispose then run → TerminatedError
  worker.dispose()
  try {
    await worker.run({ shouldThrow: false, value: 0 })
  } catch (err) {
    if (err instanceof TerminatedError) {
      console.log('Caught TerminatedError:', err.message)
    }
  }

  workerSlow.dispose()
}

run()`,
      name: 'createWorker - Error Handling',
    },
    'worker-pool': {
      code: `import { createWorker } from '@vielzeug/workit'

// Create a pool of 3 worker threads for parallel processing
const pool = createWorker((input) => {
  // Self-contained task — no outer-scope references allowed
  const { data, chunkId } = input
  // Simulate CPU-intensive work
  let result = 0
  for (let i = 0; i < data.length; i++) {
    result += Math.sqrt(data[i]) * Math.PI
  }
  return { chunkId, result: +result.toFixed(4) }
}, {
  size: 3,        // 3 concurrent worker threads
  timeout: 5000,  // abort tasks after 5 seconds
})

async function processChunks() {
  console.log('Pool size:', pool.size, '| Native:', pool.isNative)

  // These run in parallel across the worker pool
  const chunks = [
    { chunkId: 'A', data: Array.from({ length: 1000 }, (_, i) => i) },
    { chunkId: 'B', data: Array.from({ length: 1000 }, (_, i) => i * 2) },
    { chunkId: 'C', data: Array.from({ length: 1000 }, (_, i) => i * 3) },
  ]

  const results = await Promise.all(chunks.map(c => pool.run(c)))
  results.forEach(r => console.log('Chunk', r.chunkId + ':', r.result))

  pool.dispose()
}

processChunks()`,
      name: 'createWorker - Pool',
    },
  },
};
