export const typedIsExample = {
  code: `import { isDefined, isEmpty, isNil, isNumber, isPlainObject } from '@vielzeug/arsenal/guards'

const values = ['hello', 42, true, [1, 2, 3], {}, null, undefined]

values.forEach(value => {
  console.log({
    array: Array.isArray(value),
    defined: isDefined(value),
    empty: isEmpty(value),
    nil: isNil(value),
    number: isNumber(value),
    plainObject: isPlainObject(value),
    string: typeof value === 'string',
  })
})`,
  name: 'Guards and platform type checks',
};
