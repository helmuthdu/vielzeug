export const functionDebounceExample = {
  code: "import { debounce } from '@vielzeug/toolkit'\n\nlet searchCount = 0\nconst handleSearch = (query) => {\n  searchCount++\n  console.log(`Search #${searchCount}: \"${query}\"`)\n}\n\nconst debouncedSearch = debounce(handleSearch, 300)\n\n// Only the last call within 300ms will execute\ndebouncedSearch('c')\ndebouncedSearch('ca')\ndebouncedSearch('cat')\n\nsetTimeout(() => {\n  console.log('Final search count:', searchCount) // Should be 1\n}, 500)",
  name: 'debounce - Debounce function',
};
