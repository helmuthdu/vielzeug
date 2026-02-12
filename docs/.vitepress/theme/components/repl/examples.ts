export const examples = {
  toolkit: {
    'array-chunk': {
      name: 'chunk - Split array into chunks',
      code: `import { chunk } from '@vielzeug/toolkit'

const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

console.log('Original:', numbers)
console.log('Chunks of 3:', chunk(numbers, 3))
console.log('Chunks of 4:', chunk(numbers, 4))`,
    },
    'array-filter': {
      name: 'filter - Filter array elements',
      code: `import { filter } from '@vielzeug/toolkit'

const users = [
  { name: 'Alice', age: 25, active: true },
  { name: 'Bob', age: 30, active: false },
  { name: 'Charlie', age: 35, active: true }
]

const activeUsers = filter(users, u => u.active)
console.log('Active users:', activeUsers)`,
    },
    'array-map': {
      name: 'map - Transform array elements',
      code: `import { map } from '@vielzeug/toolkit'

const numbers = [1, 2, 3, 4, 5]

const doubled = map(numbers, n => n * 2)
console.log('Doubled:', doubled)

const strings = map(numbers, n => \`Number: \${n}\`)
console.log('Formatted:', strings)`,
    },
    'array-group': {
      name: 'group - Group array by key',
      code: `import { group } from '@vielzeug/toolkit'

const items = [
  { type: 'fruit', name: 'apple' },
  { type: 'vegetable', name: 'carrot' },
  { type: 'fruit', name: 'banana' }
]

const byType = group(items, item => item.type)
console.log('Grouped:', byType)`,
    },
    'object-merge': {
      name: 'merge - Deep merge objects',
      code: `import { merge } from '@vielzeug/toolkit'

const obj1 = { a: 1, b: { c: 2 } }
const obj2 = { b: { d: 3 }, e: 4 }

const merged = merge(obj1, obj2)
console.log('Merged:', merged)`,
    },
    'object-clone': {
      name: 'clone - Deep clone object',
      code: `import { clone } from '@vielzeug/toolkit'

const original = { a: 1, b: { c: 2 } }
const copy = clone(original)

copy.b.c = 99
console.log('Original:', original)
console.log('Copy:', copy)`,
    },
    'string-camelcase': {
      name: 'camelCase - Convert to camelCase',
      code: `import { camelCase } from '@vielzeug/toolkit'

console.log(camelCase('hello world'))
console.log(camelCase('hello-world'))
console.log(camelCase('hello_world'))
console.log(camelCase('HelloWorld'))`,
    },
    'math-average': {
      name: 'average - Calculate average',
      code: `import { average } from '@vielzeug/toolkit'

const numbers = [10, 20, 30, 40, 50]
console.log('Average:', average(numbers))

const grades = [85, 90, 78, 92]
console.log('Grade average:', average(grades))`,
    },
    'function-debounce': {
      name: 'debounce - Debounce function',
      code: `import { debounce } from '@vielzeug/toolkit'

const handleSearch = (query) => {
  console.log('Searching for:', query)
}

const debouncedSearch = debounce(handleSearch, 300)

debouncedSearch('cat')
debouncedSearch('cats')
debouncedSearch('cats and dogs')`,
    },
    'function-pipe': {
      name: 'pipe - Compose functions',
      code: `import { pipe } from '@vielzeug/toolkit'

const add = (a, b) => a + b
const multiply = (n) => n * 2
const square = (n) => n * n

const calculate = pipe(
  () => add(2, 3),
  (x) => multiply(x),
  (x) => square(x)
)

console.log('Result:', calculate(3))`,
    },
    'async-parallel': {
      name: 'parallel - Process with controlled parallelism',
      code: `import { parallel } from '@vielzeug/toolkit'

const items = [1, 2, 3, 4, 5]

const results = await parallel(2, items, async (item) => {
  return item * 2
})

console.log('Results:', results)`,
    },
  },
  deposit: {
    'basic-setup': {
      name: 'Basic Setup - Initialize Deposit',
      code: `import { Deposit } from '@vielzeug/deposit'

const schema = {
  users: {
    key: 'id',
    record: { id: 0, name: '', email: '' }
  }
}

const db = new Deposit({
  type: 'localStorage',
  dbName: 'myapp',
  version: 1,
  schema
})

console.log('Deposit initialized!')`,
    },
  },
  fetchit: {
    'basic-client': {
      name: 'Create HTTP Client and Fetch Data',
      code: `import { createHttpClient } from '@vielzeug/fetchit'

const http = createHttpClient({
  baseUrl: 'https://jsonplaceholder.typicode.com'
})

console.log('Fetchit HTTP client created!')

// Perform a GET request to a public API
const result = await http.get('/todos/1')
console.log('Fetched data:', result)
`,
    },
  },
  formit: {
    'create-form': {
      name: 'Create Form',
      code: `import { createForm } from '@vielzeug/formit'

const form = createForm({
  initialValues: {
    name: '',
    email: '',
    age: 0
  }
})

console.log('Form created!')`,
    },
  },
  i18nit: {
    'basic-setup': {
      name: 'Basic Setup - Initialize i18n',
      code: `import { createI18n } from '@vielzeug/i18nit'

const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en: { hello: 'Hello', goodbye: 'Goodbye' },
    es: { hello: 'Hola', goodbye: 'Adiós' }
  }
})

console.log('i18n initialized!')`,
    },
  },
  logit: {
    'basic-logging': {
      name: 'Basic Logging',
      code: '// use your brownser console :D',
    },
  },
  permit: {
    'basic-setup': {
      name: 'Basic Setup',
      code: `import { Permit } from '@vielzeug/permit'

Permit.register('admin', 'users', {
  create: true, view: true, update: true, delete: true
})

Permit.register('user', 'profile', {
  view: true, update: true
})

console.log('Permit initialized!')`,
    },
  },
  stateit: {
    'basic-store': {
      name: 'Basic Store - Counter',
      code: `import { createStore } from '@vielzeug/stateit'

// Create a simple counter store
const counterStore = createStore({ count: 0 })

// Subscribe to changes
counterStore.subscribe((state, prev) => {
  console.log(\`Count changed: \${prev.count} → \${state.count}\`)
})

// Update state
console.log('Initial:', counterStore.get())
counterStore.set({ count: 1 })
counterStore.set({ count: 2 })
counterStore.set({ count: 3 })`,
    },
    'selective-subscription': {
      name: 'Selective Subscription',
      code: `import { createStore } from '@vielzeug/stateit'

const userStore = createStore({
  name: 'Alice',
  age: 30,
  email: 'alice@example.com'
})

// Subscribe to specific field only
userStore.subscribe(
  (state) => state.name,
  (name, prevName) => {
    console.log(\`Name: \${prevName} → \${name}\`)
  }
)

// Only name changes trigger the subscription
userStore.set({ name: 'Bob' }) // Logs
userStore.set({ age: 31 }) // Doesn't log
userStore.set({ email: 'bob@example.com' }) // Doesn't log
userStore.set({ name: 'Charlie' }) // Logs`,
    },
    'async-updates': {
      name: 'Async State Updates',
      code: `import { createStore } from '@vielzeug/stateit'

const dataStore = createStore({
  data: null,
  loading: false,
  error: null
})

// Subscribe to loading state
dataStore.subscribe(
  (state) => state.loading,
  (loading) => {
    console.log('Loading:', loading)
  }
)

// Simulate async data fetch
async function fetchData() {
  dataStore.set({ loading: true, error: null })
  
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    const data = { id: 1, title: 'Sample Data' }
    
    dataStore.set({ data, loading: false })
    console.log('Data loaded:', data)
  } catch (error) {
    dataStore.set({ error, loading: false })
    console.error('Error:', error)
  }
}

await fetchData()`,
    },
    'scoped-stores': {
      name: 'Scoped Stores - Isolated State',
      code: `import { createStore } from '@vielzeug/stateit'

const appStore = createStore({
  theme: 'light',
  language: 'en'
})

// Create child store with overrides
const draftStore = appStore.createChild({
  theme: 'dark'
})

console.log('Parent theme:', appStore.get().theme) // 'light'
console.log('Child theme:', draftStore.get().theme) // 'dark'

// Child changes don't affect parent
draftStore.set({ language: 'es' })
console.log('Parent language:', appStore.get().language) // 'en'
console.log('Child language:', draftStore.get().language) // 'es'`,
    },
    'computed-values': {
      name: 'Computed Values via Subscriptions',
      code: `import { createStore } from '@vielzeug/stateit'

const cartStore = createStore({
  items: [
    { id: 1, name: 'Apple', price: 1.5, quantity: 2 },
    { id: 2, name: 'Banana', price: 0.8, quantity: 3 }
  ]
})

// Subscribe to computed total
cartStore.subscribe(
  (state) => state.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  ),
  (total) => {
    console.log('Cart total: $' + total.toFixed(2))
  }
)

// Initial total logged
// Update cart
cartStore.set({
  items: [
    ...cartStore.get().items,
    { id: 3, name: 'Orange', price: 1.2, quantity: 4 }
  ]
})`,
    },
    'todo-list': {
      name: 'Todo List Example',
      code: `import { createStore } from '@vielzeug/stateit'

const todoStore = createStore({
  todos: [],
  filter: 'all' // 'all' | 'active' | 'completed'
})

// Subscribe to filtered todos
todoStore.subscribe(
  (state) => {
    const { todos, filter } = state
    switch (filter) {
      case 'active':
        return todos.filter(t => !t.completed)
      case 'completed':
        return todos.filter(t => t.completed)
      default:
        return todos
    }
  },
  (filtered) => {
    console.log('Filtered todos:', filtered)
  }
)

// Add todos
const todos = [
  { id: 1, text: 'Learn Stateit', completed: false },
  { id: 2, text: 'Build app', completed: false },
  { id: 3, text: 'Deploy', completed: false }
]

todoStore.set({ todos })

// Mark one as completed
const updatedTodos = todoStore.get().todos.map(t =>
  t.id === 1 ? { ...t, completed: true } : t
)
todoStore.set({ todos: updatedTodos })

// Change filter
todoStore.set({ filter: 'active' })
todoStore.set({ filter: 'completed' })`,
    },
  },
  validit: {
    'basic-schema': {
      name: 'Basic Schema',
      code: `import { v } from '@vielzeug/validit'

const userSchema = v.object({
  name: v.string().min(1).max(100),
  email: v.string().email(),
  age: v.number().min(0).max(150)
})

const result = userSchema.safeParse({
  name: 'John Doe',
  email: 'john@example.com',
  age: 30
})

console.log('Validation result:', result)`,
    },
  },
  wireit: {
    'basic-container': {
      name: 'Basic Container - Value Provider',
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
    },
    'class-provider': {
      name: 'Class Provider - Dependency Injection',
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
    },
    'factory-provider': {
      name: 'Factory Provider - Custom Creation',
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
    },
    lifetimes: {
      name: 'Lifetimes - Singleton vs Transient',
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
    },
    'child-containers': {
      name: 'Child Containers - Hierarchical DI',
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
    },
    'scoped-execution': {
      name: 'Scoped Execution - Request Scoping',
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
    },
  },
};
