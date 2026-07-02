export const objectHashExample = {
  code: `import { hash } from '@vielzeug/arsenal'

// Stable cache key regardless of object key insertion order
const key1 = hash({ sort: 'asc', filter: { role: 'admin' } })
const key2 = hash({ filter: { role: 'admin' }, sort: 'asc' })
console.log('Same key?', key1 === key2)  // true
console.log('Key:', key1)                // '{"filter":{"role":"admin"},"sort":"asc"}'

// Handles Date, RegExp, Set, Map, bigint
console.log(hash(new Date('2024-01-01T00:00:00Z')))  // '[Date:2024-01-01T00:00:00.000Z]'
console.log(hash(new Set([3, 1, 2])))                // '[Set:1,2,3]' — sorted
console.log(hash(new Map([['b', 2], ['a', 1]])))     // '[Map:"a"=>1,"b"=>2]' — sorted
console.log(hash(42n))                               // '42n'
console.log(hash(/foo/gi))                           // '[RegExp:foo/gi]'

// Circular references produce a sentinel — no stack overflow
const obj = { x: 1 }
obj.self = obj
console.log(hash(obj))  // '{"self":[Circular],"x":1}'

// Class instances coerce to String(instance) by default
class Point {
  constructor(x, y) { this.x = x; this.y = y }
  toString() { return \`Point(\${this.x},\${this.y})\` }
}
console.log(hash(new Point(1, 2)))  // 'Point(1,2)'`,
  name: 'hash - Deterministic cache key from any value',
};
