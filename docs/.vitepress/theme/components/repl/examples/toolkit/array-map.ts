export const arrayMapExample = {
  code: "import { filterMap } from '@vielzeug/toolkit'\n\nconst numbers = [1, 2, 3, 4, 5]\n\nconst doubled = filterMap(numbers, number => number * 2)\nconsole.log('Doubled:', doubled)\n\nconst strings = filterMap(numbers, number => `Number: ${number}`)\nconsole.log('Formatted:', strings)\n\nconst evenDoubled = filterMap(numbers, number =>\n  number % 2 === 0 ? number * 2 : undefined\n)\nconsole.log('Even numbers doubled:', evenDoubled)",
  name: 'filterMap - Transform array elements',
};
