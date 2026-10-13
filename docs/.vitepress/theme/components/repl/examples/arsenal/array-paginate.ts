export const arrayPaginateExample = {
  code: `import { paginate } from '@vielzeug/arsenal'

const rows = Array.from({ length: 45 }, (_, index) => ({ id: index + 1 }))

const first = paginate(rows, { pageSize: 10 })
console.log('Page:', first.page, 'of', first.totalPages)
console.log('Items:', first.items.map((row) => row.id))

// A zero-based caller (Spring-style) gets its own base back
const zeroBased = paginate(rows, { page: 0, pageSize: 10, pageOffset: 0 })
console.log('Zero-based page:', zeroBased.page, zeroBased.items.length)

// Pages past the last echo the request instead of clamping it
const past = paginate(rows, { page: 9, pageSize: 10 })
console.log('Past the end:', past.items, 'of', past.totalItems)`,
  name: 'paginate - Page an array',
};
