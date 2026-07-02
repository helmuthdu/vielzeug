export const typedIsExample = {
  code: `import {
  isArray, isString, isNumber, isBoolean, isPlainObject,
  isFunction, isDate, isRegex, isNil, isEmpty
} from '@vielzeug/arsenal'

const values = [
  'hello', 42, true, [1, 2, 3], ['a', 'b'], {}, null, undefined,
  () => {}, new Date(), /test/
]

values.forEach(val => {
  console.log(\`Value: \${String(val)}\`)
  console.log(\`  String: \${isString(val)}\`)
  console.log(\`  Number: \${isNumber(val)}\`)
  console.log(\`  Array: \${isArray(val)}\`)
  // isArray with an item guard — narrows to string[]
  console.log(\`  Array<string>: \${isArray(val, isString)}\`)
  console.log(\`  PlainObject: \${isPlainObject(val)}\`)
  console.log(\`  Nil: \${isNil(val)}\`)
  console.log(\`  Empty: \${isEmpty(val)}\`)
  console.log('---')
})`,
  name: 'Type checking utilities',
};
