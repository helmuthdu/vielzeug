export const typedIsExample = {
  code: `import { allOf, anyOf, isEmpty, isEqual, isMatch, isPlainObject, noneOf, shallowEqual } from '@vielzeug/arsenal/guards'

const values = ['hello', 42, [1, 2, 3], {}, null]

values.forEach(value => {
  console.log({
    empty: isEmpty(value),
    plainObject: isPlainObject(value),
  })
})

// Deep structural equality (handles nested objects, arrays, Dates, Maps, Sets)
console.log('deep equal:', isEqual({ a: [1, 2] }, { a: [1, 2] })) // true

// Shallow equality (one level, uses Object.is so NaN === NaN)
console.log('shallow equal:', shallowEqual([1, 2, 3], [1, 2, 3])) // true

// Partial deep match — source properties must be present and equal
console.log('is match:', isMatch({ a: 1, b: 2, c: 3 }, { a: 1 })) // true

// Predicate combinators with vacuous-truth semantics
const isWorkingAge = allOf<number>(
  (n) => n >= 18,
  (n) => n < 65,
)
const isSpecial = anyOf<number>(
  (n) => n === 0,
  (n) => n === 100,
)
const isOdd = noneOf((n) => n % 2 === 0)

console.log('working age:', isWorkingAge(30)) // true
console.log('special:', isSpecial(100)) // true
console.log('odd:', [1, 2, 3, 4].filter(isOdd)) // [1, 3]`,
  name: 'Guards, equality, and predicate combinators',
};
