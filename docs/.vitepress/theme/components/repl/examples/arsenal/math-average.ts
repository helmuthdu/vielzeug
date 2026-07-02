export const mathAverageExample = {
  code: `import { average, sum, min, max, median } from '@vielzeug/arsenal'

const numbers = [10, 20, 30, 40, 50]
console.log('Numbers:', numbers)
console.log('Average:', average(numbers))
console.log('Sum:', sum(numbers))
console.log('Min:', min(numbers))
console.log('Max:', max(numbers))
console.log('Median:', median(numbers))

const grades = [85, 90, 78, 92, 88]
console.log('\\nGrades:', grades)
console.log('Average grade:', average(grades).toFixed(2))`,
  name: 'average - Calculate average',
};
