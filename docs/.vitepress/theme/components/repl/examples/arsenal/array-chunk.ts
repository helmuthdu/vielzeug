export const arrayChunkExample = {
  code: "import { chunk } from '@vielzeug/arsenal'\n\nconst numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]\n\nconsole.log('Original:', numbers)\nconsole.log('Chunks of 3:', chunk(numbers, 3))\nconsole.log('Chunks of 4:', chunk(numbers, 4))\n\n// Practical use case: Batch processing\nconst userIds = [101, 102, 103, 104, 105, 106, 107, 108]\nconst batches = chunk(userIds, 3)\nconsole.log('User ID batches:', batches)",
  name: 'chunk - Split array into chunks',
};
