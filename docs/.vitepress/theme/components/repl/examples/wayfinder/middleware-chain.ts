export const middlewareChainExample = {
  code: `import { createMemoryHistory, createRouter } from '@vielzeug/wayfinder'

// Execution order is always: global middleware → route middleware → data().
const logger = async (ctx, next) => {
  console.log('[global]  entering', ctx.pathname)
  await next()
  console.log('[global]  leaving', ctx.pathname)
}

const loadUser = async (ctx, next) => {
  console.log('[route]   loading user')
  ctx.locals.user = { id: 1, name: 'Alice', role: 'admin' }
  await next()
}

const requireAdmin = async (ctx, next) => {
  console.log('[route]   checking role:', ctx.locals.user?.role)
  if (ctx.locals.user?.role !== 'admin') {
    console.log('[route]   permission denied — aborting navigation')
    return // do not call next(); cancels the navigation
  }
  await next()
}

const router = createRouter({
  history: createMemoryHistory('/'),
  middleware: [logger],
  routes: {
    home:  { path: '/' },
    admin: {
      path: '/admin',
      middleware: [loadUser, requireAdmin],
      data: async (ctx) => {
        console.log('[data()]  fetching panel data for', ctx.locals.user.name)
        return { loaded: true, user: ctx.locals.user.name }
      },
    },
  },
})

await router.waitFor('home')
console.log('--- navigate to /admin ---')
await router.navigate({ name: 'admin' })
console.log('data:', JSON.stringify(router.getSnapshot().matches.at(-1)?.data))

router.dispose()`,
  name: 'Middleware Chain — Execution Flow',
};
