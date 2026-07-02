export const arrayMapExample = {
  code: `import { filterMap } from '@vielzeug/arsenal'

const numbers = [1, 2, 3, 4, 5]

const doubled = filterMap(numbers, number => number * 2)
console.log('Doubled:', doubled)

const strings = filterMap(numbers, number => \`Number: \${number}\`)
console.log('Formatted:', strings)

const evenDoubled = filterMap(numbers, number =>
  number % 2 === 0 ? number * 2 : undefined
)
console.log('Even numbers doubled:', evenDoubled)`,
  name: 'filterMap - Transform array elements',
};
