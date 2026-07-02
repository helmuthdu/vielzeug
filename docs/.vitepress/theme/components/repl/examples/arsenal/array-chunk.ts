export const arrayChunkExample = {
  code: `import { chunk } from '@vielzeug/arsenal'

const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

console.log('Original:', numbers)
console.log('Chunks of 3:', chunk(numbers, 3))
console.log('Chunks of 4:', chunk(numbers, 4))

// Practical use case: Batch processing
const userIds = [101, 102, 103, 104, 105, 106, 107, 108]
const batches = chunk(userIds, 3)
console.log('User ID batches:', batches)`,
  name: 'chunk - Split array into chunks',
};
