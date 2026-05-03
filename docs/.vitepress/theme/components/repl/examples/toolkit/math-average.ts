export const mathAverageExample = {
  code: "import { average, sum, min, max, median } from '@vielzeug/toolkit'\n\nconst numbers = [10, 20, 30, 40, 50]\nconsole.log('Numbers:', numbers)\nconsole.log('Average:', average(numbers))\nconsole.log('Sum:', sum(numbers))\nconsole.log('Min:', min(numbers))\nconsole.log('Max:', max(numbers))\nconsole.log('Median:', median(numbers))\n\nconst grades = [85, 90, 78, 92, 88]\nconsole.log('\\nGrades:', grades)\nconsole.log('Average grade:', average(grades).toFixed(2))",
  name: 'average - Calculate average',
};
