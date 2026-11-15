export const pointersBasicExample = {
  code: `import { getIn, parsePointer, formatPointer } from '@vielzeug/patchwork'

const doc = { inventory: { 'iron/sword': { qty: 2 }, '~rare~': true } }

// Read through a pointer without walking the object yourself
console.log(getIn(doc, '/inventory/iron~1sword/qty'))
console.log(getIn(doc, '/inventory/~0rare~0'))
console.log(getIn(doc, '/inventory/missing'))

// Pointers are data: split, transform, re-join
const tokens = parsePointer('/inventory/iron~1sword/qty')
console.log(tokens.join(' -> '))

tokens[1] = 'iron~1axe'
console.log(formatPointer(tokens))`,
  name: 'getIn - JSON Pointer Round-Trips',
};
