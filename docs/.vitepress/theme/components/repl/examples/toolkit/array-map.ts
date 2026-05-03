export const arrayMapExample = {
  code: "import { select } from '@vielzeug/toolkit'\n\nconst numbers = [1, 2, 3, 4, 5]\n\n// select as map: transform all items\nconst doubled = select(numbers, n => n * 2)\nconsole.log('Doubled:', doubled)\n\nconst strings = select(numbers, n => `Number: ${n}`)\nconsole.log('Formatted:', strings)\n\n// select: map and filter in one step\nconst evenDoubled = select(numbers, n => n * 2, n => n % 2 === 0)\nconsole.log('Even numbers doubled:', evenDoubled)",
  name: 'select - Transform array elements',
};
