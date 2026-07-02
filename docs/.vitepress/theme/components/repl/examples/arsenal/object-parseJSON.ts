export const objectParseJSONExample = {
  code: `import { parseJSON } from '@vielzeug/arsenal'

// Happy path
console.log(parseJSON('{"a":1}'))              // { a: 1 }
console.log(parseJSON('[1,2,3]'))              // [1, 2, 3]

// Invalid JSON → fallback
console.log(parseJSON('bad', { fallback: {} })) // {}

// Null input → fallback
console.log(parseJSON(null, { fallback: 'empty' })) // 'empty'

// JSON string 'null' → null (not fallback!)
console.log(parseJSON('null'))                // null
console.log(parseJSON('null', { fallback: 'oops' })) // null (not 'oops')

// JSON false/0 are preserved correctly
console.log(parseJSON('false'))               // false
console.log(parseJSON('0'))                   // 0

// validator — reject structurally invalid results
const isUser = (v) => v !== null && typeof v === 'object' && typeof v.id === 'number'
const defaultUser = { id: 0, name: 'unknown' }
console.log(parseJSON('{"id":1,"name":"Alice"}', { validator: isUser, fallback: defaultUser }))
// { id: 1, name: 'Alice' }
console.log(parseJSON('{"id":"bad"}', { validator: isUser, fallback: defaultUser }))
// { id: 0, name: 'unknown' }  — validator failed, fallback returned`,
  name: 'parseJSON - Safe JSON parsing with fallback and validator',
};
