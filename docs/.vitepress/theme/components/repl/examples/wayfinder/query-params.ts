export const queryParamsExample = {
  code: `import { createMemoryHistory, createRouter } from '@vielzeug/wayfinder'

// coerceSearch normalises raw URL strings into typed values before data() runs.
const router = createRouter({
  history: createMemoryHistory('/'),
  routes: {
    home: { path: '/' },
    search: {
      path: '/search',
      coerceSearch: (raw) => ({
        page: Math.max(1, Number(raw.page ?? 1)),
        q:    String(raw.q ?? ''),
        tags: Array.isArray(raw.tags) ? raw.tags : raw.tags ? [raw.tags] : [],
      }),
      data: async ({ query }) => ({
        // ctx.query here is the coerced result, not raw URL strings.
        results: \`searched "\${query.q}" page \${query.page} tags:\${query.tags}\`,
      }),
    },
    userPosts: {
      path: '/users/:id/posts',
      data: async ({ params, query }) => ({
        userId: params.id,
        status: query.status ?? 'all',
        limit:  Number(query.limit ?? 10),
      }),
    },
  },
})

await router.navigate({ name: 'search', query: { page: 2, q: 'wayfinder', tags: ['docs', 'routing'] } })
console.log('search data:', JSON.stringify(router.getSnapshot().matches.at(-1)?.data))

await router.navigate({ name: 'userPosts', params: { id: '42' }, query: { status: 'published', limit: 20 } })
console.log('posts data:', JSON.stringify(router.getSnapshot().matches.at(-1)?.data))

// Raw URL query is always string values; coerced values live in ctx.query.
const loc = router.getSnapshot().location
console.log('raw location.query:', JSON.stringify(loc.query))

router.dispose()`,
  name: 'Query Parameters — Coercion and URL State',
};
