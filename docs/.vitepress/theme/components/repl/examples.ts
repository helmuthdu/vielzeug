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
};
