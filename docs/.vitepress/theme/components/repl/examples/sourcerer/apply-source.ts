export const applyExample = {
  code: `import { createPageSource } from '@vielzeug/sourcerer'

const allUsers = ['Ada Lovelace', 'Grace Hopper', 'Linus Torvalds', 'Ada Byron']

const source = createPageSource({
  load: async ({ page, pageSize, params: { search } }) => {
    const matching = search ? allUsers.filter((name) => name.includes(search)) : allUsers
    const start = (page - 1) * pageSize
    return { items: matching.slice(start, start + pageSize), totalItems: matching.length }
  },
  pageSize: 2,
  params: { search: '' },
})

await source.reload()

// One call, one request: page and filters arrive together
await source.apply({ page: 2, params: { search: '' } })
console.log('Page 2:', source.state.items)

// A structurally identical params object is a no-op, so a re-render cannot refetch
await source.apply({ params: { search: '' } })
console.log('Still page 2:', source.state.pagination.page)

// New params reset to page 1 unless a page is given
await source.apply({ params: { search: 'Ada' } })
console.log('Filtered:', source.state.items, 'page', source.state.pagination.page)

source.dispose()`,
  name: 'apply - Page and params in one call',
};
