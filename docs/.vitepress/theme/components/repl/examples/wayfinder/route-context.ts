export const routeContextExample = {
  code: `import { createMemoryHistory, createRouter } from '@vielzeug/wayfinder'

// RouteContext is the full object available in middleware and data().
// Middleware receives ctx without a 'data' property; data() adds the signal.
const router = createRouter({
  history: createMemoryHistory('/'),
  routes: {
    home: { path: '/' },
    postDetail: {
      path: '/users/:userId/posts/:postId',
      meta: { title: 'Post Detail', breadcrumbs: ['Home', 'Users', 'Posts'] },
      middleware: [
        async (ctx, next) => {
          // Middleware can read params, query, hash, historyState, locals, navigate.
          ctx.locals.user = { id: Number(ctx.params.userId), name: 'Alice' }
          console.log('middleware | pathname:', ctx.pathname)
          console.log('middleware | params:  ', JSON.stringify(ctx.params))
          console.log('middleware | query:   ', JSON.stringify(ctx.query))
          console.log('middleware | state:   ', JSON.stringify(ctx.historyState))
          await next()
        },
      ],
      data: async (ctx) => {
        // data() gets the same context plus an AbortSignal for cancellation.
        console.log('data()     | user from locals:', ctx.locals.user.name)
        console.log('data()     | leaf meta:', JSON.stringify(ctx.matches.at(-1)?.meta))
        return { postId: ctx.params.postId, author: ctx.locals.user.name }
      },
    },
  },
})

await router.navigate(
  { name: 'postDetail', params: { userId: '42', postId: '123' }, query: { tab: 'comments' } },
  { state: { from: 'feed' } },
)

console.log('snapshot data:', JSON.stringify(router.getSnapshot().matches.at(-1)?.data))
router.dispose()`,
  name: 'Route Context — Full Context Access',
};
