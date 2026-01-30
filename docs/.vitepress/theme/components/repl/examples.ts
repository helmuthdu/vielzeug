export const examples: Record<string, string> = {
  'array-chunk': `import { chunk } from '@vielzeug/toolkit'

// Split an array into smaller arrays of a specified size
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

console.log('Original:', numbers)
console.log('Chunks of 3:', chunk(numbers, 3))
console.log('Chunks of 4:', chunk(numbers, 4))
console.log('Chunks of 7:', chunk(numbers, 7))`,

  'array-filter': `import { filter } from '@vielzeug/toolkit'

const users = [
  { name: 'Alice', age: 25, active: true },
  { name: 'Bob', age: 30, active: false },
  { name: 'Charlie', age: 35, active: true },
  { name: 'David', age: 19, active: true }
]

// Filter by boolean property
const activeUsers = filter(users, user => user.active)
console.log('Active users:', activeUsers)

// Filter by multiple conditions
const youngActive = filter(users, user => user.active && user.age < 25)
console.log('Young & Active:', youngActive)`,

  'array-map': `import { map } from '@vielzeug/toolkit'

const products = [
  { id: 1, name: 'Laptop', price: 1000 },
  { id: 2, name: 'Phone', price: 500 },
  { id: 3, name: 'Tablet', price: 300 }
]

// Extract property
const names = map(products, p => p.name)
console.log('Product names:', names)

// Transform objects
const discounted = map(products, p => ({
  ...p,
  salePrice: p.price * 0.9
}))
console.log('Discounted products:', discounted)

// Using index
const indexed = map(names, (name, i) => \`\${i + 1}. \${name}\`)
console.log('Indexed:', indexed)`,

  'array-group': `import { group } from '@vielzeug/toolkit'

const inventory = [
  { category: 'fruit', name: 'apple', stock: 10 },
  { category: 'vegetable', name: 'carrot', stock: 20 },
  { category: 'fruit', name: 'banana', stock: 15 },
  { category: 'vegetable', name: 'broccoli', stock: 5 },
  { category: 'meat', name: 'chicken', stock: 8 }
]

// Group by a simple key
const byCategory = group(inventory, item => item.category)
console.log('Grouped by category:', byCategory)

// Group by stock level
const byAvailability = group(inventory, item => item.stock > 10 ? 'high' : 'low')
console.log('Grouped by availability:', byAvailability)`,

  'array-sort': `import { sort } from '@vielzeug/toolkit'

// Simple sorting
const letters = ['d', 'a', 'c', 'b']
console.log('Sorted letters:', sort(letters))

const numbers = [10, 2, 33, 4, 1]
console.log('Sorted numbers (numeric):', sort(numbers))

// Custom sort (descending)
const descending = sort(numbers, (a, b) => b - a)
console.log('Descending:', descending)

// Sorting objects
const users = [
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 20 },
  { name: 'Charlie', age: 30 }
]
const byAge = sort(users, (a, b) => a.age - b.age)
console.log('Users by age:', byAge)`,

  'array-alternate': `// alternate - Pick elements from multiple arrays in turn
import { alternate } from '@vielzeug/toolkit'

const arr1 = [1, 2, 3]
const arr2 = ['a', 'b', 'c']
const arr3 = [true, false]

console.log('Alternated (2 arrays):', alternate(arr1, arr2))
console.log('Alternated (3 arrays):', alternate(arr1, arr2, arr3))`,

  'object-merge': `import { merge } from '@vielzeug/toolkit'

const defaultSettings = {
  theme: 'light',
  notifications: { email: true, push: false },
  languages: ['en']
}

const userSettings = {
  theme: 'dark',
  notifications: { push: true },
  languages: ['de']
}

// Deep merge: nested objects are merged
const deep = merge('deep', defaultSettings, userSettings)
console.log('Deep merged:', deep)

// Array replacement strategy
const replace = merge('arrayReplace', defaultSettings, userSettings)
console.log('Array replace merged:', replace)

// Last wins strategy (shallow)
const last = merge('lastWins', defaultSettings, userSettings)
console.log('Last wins (shallow):', last)`,

  'object-clone': `import { clone } from '@vielzeug/toolkit'

const original = {
  user: 'admin',
  meta: {
    lastLogin: new Date(),
    permissions: ['read', 'write']
  }
}

// Create a deep copy
const copy = clone(original)

// Modify copy
copy.meta.permissions.push('delete')
copy.user = 'guest'

console.log('Original remains unchanged:', original.meta.permissions)
console.log('Copy modified:', copy.meta.permissions)
console.log('Original user:', original.user)
console.log('Copy user:', copy.user)`,

  'object-path': `import { path, seek } from '@vielzeug/toolkit'

const config = {
  api: {
    endpoints: {
      users: '/v1/users',
      posts: '/v1/posts'
    },
    timeout: 5000
  }
}

// Get nested value safely
console.log('Users endpoint:', path(config, 'api.endpoints.users'))

// Missing path returns undefined (no crash)
console.log('Missing path:', path(config, 'api.version'))

// seek can find keys anywhere in the object
const posts = seek(config, 'posts')
console.log('Seek posts:', posts)`,

  'object-diff': `import { diff } from '@vielzeug/toolkit'

const v1 = {
  id: 1,
  status: 'pending',
  tags: ['new'],
  meta: { author: 'John' }
}

const v2 = {
  id: 1,
  status: 'completed',
  tags: ['new', 'processed'],
  meta: { author: 'John', date: '2024-01-01' }
}

const changes = diff(v1, v2)
console.log('Differences:', changes)
// Output shows only what changed or was added in v2`,

  'string-camelcase': `import { 
  camelCase, 
  kebabCase, 
  pascalCase, 
  snakeCase,
  similarity 
} from '@vielzeug/toolkit'

const phrase = 'User Profile_Settings-API'

console.log('Original:', phrase)
console.log('camelCase:', camelCase(phrase))
console.log('kebab-case:', kebabCase(phrase))
console.log('PascalCase:', pascalCase(phrase))
console.log('snake_case:', snakeCase(phrase))

console.log('---')
console.log('Similarity ("apple", "apply"):', similarity('apple', 'apply'))
console.log('Similarity ("hello", "world"):', similarity('hello', 'world'))`,

  'string-truncate': `import { truncate } from '@vielzeug/toolkit'

const longText = 'Vielzeug is a Swiss-army knife for TypeScript developers, providing essential utilities.'

console.log('Default truncate:', truncate(longText, 25))
console.log('Custom suffix:', truncate(longText, 25, '...'))
console.log('Very short:', truncate('Hello', 10))`,

  'math-average': `import { 
  average, 
  median, 
  sum, 
  max, 
  min, 
  round,
  clamp 
} from '@vielzeug/toolkit'

const data = [10, 2, 33, 4, 1, 10, 8]

console.log('Data:', data)
console.log('Sum:', sum(data))
console.log('Average:', round(average(data), 2))
console.log('Median:', median(data))
console.log('Max/Min:', max(data), '/', min(data))

console.log('---')
console.log('Clamp 15 between 0-10:', clamp(15, 0, 10))
console.log('Clamp 5 between 0-10:', clamp(5, 0, 10))
console.log('Clamp -5 between 0-10:', clamp(-5, 0, 10))`,

  'math-range': `import { range } from '@vielzeug/toolkit'

// Simple range
console.log('0 to 5:', range(0, 5))

// With step
console.log('1 to 10 step 2:', range(1, 10, 2))

// Negative/Descending
console.log('5 down to 0:', range(5, 0))
console.log('-5 to 5:', range(-5, 5))`,

  'date-expires': `import { expires, interval } from '@vielzeug/toolkit'

const tomorrow = new Date()
tomorrow.setDate(tomorrow.getDate() + 1)

const yesterday = new Date()
yesterday.setDate(yesterday.getDate() - 1)

console.log('Tomorrow expired?', expires(tomorrow))
console.log('Yesterday expired?', expires(yesterday))

console.log('---')
const start = new Date('2024-01-01T00:00:00')
const end = new Date('2024-01-02T12:30:45')
console.log('Interval:', interval(start, end))`,

  'date-timediff': `import { timeDiff } from '@vielzeug/toolkit'

const now = new Date()
const wayBack = new Date('2020-01-01')

console.log('Since 2020:', timeDiff(wayBack, now))
console.log('Default relative:', timeDiff(new Date(Date.now() - 3600000))) // 1 hour ago

// Custom units
const future = new Date(Date.now() + 100000000)
console.log('Custom units (Days/Hours):', timeDiff(now, future, ['DAY', 'HOUR']))`,

  'function-debounce': `import { debounce, delay } from '@vielzeug/toolkit'

let count = 0
const increment = debounce(() => {
  count++
  console.log('Function executed! Count:', count)
}, 100)

console.log('Calling increment 5 times quickly...')
increment(); increment(); increment(); increment(); increment()

console.log('Waiting 200ms...')
await delay(200)
console.log('Final count:', count) // Should be 1`,

  'function-throttle': `import { throttle, delay } from '@vielzeug/toolkit'

let count = 0
const increment = throttle(() => {
  count++
  console.log('Function executed! Count:', count)
}, 100)

console.log('Triggering throttle...')
increment() // Executes immediately
increment() // Throttled
increment() // Throttled

await delay(150)
increment() // Executes again after 100ms passed

console.log('Done.')`,

  'function-pipe': `import { pipe, compose } from '@vielzeug/toolkit'

const trim = (s) => s.trim()
const capitalize = (s) => s.toUpperCase()
const exclaim = (s) => \`\${s}!\`

// pipe: left-to-right (trim -> capitalize -> exclaim)
const processPipe = pipe(trim, capitalize, exclaim)
console.log('Pipe result:', processPipe('  hello  '))

// compose: right-to-left (exclaim -> capitalize -> trim)
const processCompose = compose(exclaim, capitalize, trim)
console.log('Compose result:', processCompose('  world  '))`,

  'typed-isarray': `import { 
  isArray, 
  isEmpty, 
  isObject, 
  isPrimitive,
  typeOf 
} from '@vielzeug/toolkit'

const test = (val) => {
  console.log(\`Value: \${JSON.stringify(val)} | Type: \${typeOf(val)}\`)
  console.log(\`  isArray: \${isArray(val)} | isEmpty: \${isEmpty(val)}\`)
  console.log(\`  isObject: \${isObject(val)} | isPrimitive: \${isPrimitive(val)}\`)
  console.log('---')
}

test([1, 2])
test([])
test({ a: 1 })
test({})
test("hello")
test(42)`,

  'typed-isempty': `import { isEmpty } from '@vielzeug/toolkit'

console.log('Collections:')
console.log('  [] is empty:', isEmpty([]))
console.log('  [1] is empty:', isEmpty([1]))
console.log('  {} is empty:', isEmpty({}))
console.log('  {a:1} is empty:', isEmpty({a:1}))

console.log('Strings:')
console.log('  "" is empty:', isEmpty(""))
console.log('  " " is empty:', isEmpty(" ")) // Not empty!

console.log('Nil values:')
console.log('  null is empty:', isEmpty(null))
console.log('  undefined is empty:', isEmpty(undefined))`,

  'typed-isequal': `import { isEqual } from '@vielzeug/toolkit'

// Deep equality for objects
const obj1 = { a: 1, b: { c: 2 } }
const obj2 = { a: 1, b: { c: 2 } }
const obj3 = { a: 1, b: { c: 3 } }

console.log('obj1 === obj2:', isEqual(obj1, obj2))
console.log('obj1 === obj3:', isEqual(obj1, obj3))

// Deep equality for arrays
console.log('Arrays equal:', isEqual([1, [2, 3]], [1, [2, 3]]))

// Mixed types
console.log('String vs Number:', isEqual("1", 1))`,

  'typed-is': `// is - General type check against various types
import { is } from '@vielzeug/toolkit'

console.log('Is string:', is('hello', String))
console.log('Is number:', is(123, Number))
console.log('Is array:', is([], Array))
console.log('Is date:', is(new Date(), Date))

class MyClass {}
const instance = new MyClass()
console.log('Is instance of MyClass:', is(instance, MyClass))`,

  'typed-ismatch': `// isMatch - Check if value matches a pattern (object or regex)
import { isMatch } from '@vielzeug/toolkit'

const user = { name: 'Alice', age: 25, role: 'admin' }

// Partial object match
console.log('Is admin:', isMatch(user, { role: 'admin' }))
console.log('Is Alice:', isMatch(user, { name: 'Alice' }))
console.log('Is 30:', isMatch(user, { age: 30 }))

// Regex match
console.log('Name starts with A:', isMatch(user.name, /^A/))`,

  'random-utils': `import { random, shuffle, uuid } from '@vielzeug/toolkit'

console.log('Random number (1-100):', random(1, 100))
console.log('Random float (0-1):', random())

const items = ['apple', 'banana', 'cherry', 'date']
console.log('Original items:', items)
console.log('Shuffled items:', shuffle([...items]))

console.log('Generated UUID:', uuid())`,

  'random-draw': `// draw - Pick a random item from an array
import { draw } from '@vielzeug/toolkit'

const colors = ['red', 'green', 'blue', 'yellow', 'purple']
console.log('Lucky color:', draw(colors))

const participants = ['Alice', 'Bob', 'Charlie', 'Dave']
console.log('Winner:', draw(participants))`,
};
