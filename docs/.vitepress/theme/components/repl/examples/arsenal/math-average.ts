export const mathAverageExample = {
  code: `import { average, median, sum } from '@vielzeug/arsenal/math'

const numbers = [10, 20, 30, 40, 50]
console.log('Average:', average(numbers))
console.log('Sum:', sum(numbers))
console.log('Min:', Math.min(...numbers))
console.log('Max:', Math.max(...numbers))
console.log('Median:', median(numbers))`,
  name: 'average - Calculate average',
};
