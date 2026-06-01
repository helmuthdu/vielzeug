export const middlewareAuthExample = {
  code: `import { createMemoryHistory, createRouter, redirectTo } from '@vielzeug/wayfinder'

// Middleware runs before data(); use it for auth checks, redirects, and analytics.
const session = { currentUser: null }

const requireAuth = async (ctx, next) => {
  if (!session.currentUser) {
    console.log('not authenticated — redirecting to /login')
    await ctx.navigate({ name: 'login' }, { replace: true })
    return // do not call next(); cancels navigation to the protected route
  }
  ctx.locals.user = session.currentUser
  await next()
}

const router = createRouter({
  history: createMemoryHistory('/'),
  routes: {
    login:     { path: '/login' },
    dashboard: {
      path: '/dashboard',
      middleware: [requireAuth],
      data: (ctx) => ({ welcome: 'Hello, ' + ctx.locals.user.name }),
    },
    // redirectTo() is shorthand for an unconditional redirect middleware.
    legacy:    { path: '/old-dashboard', middleware: [redirectTo({ name: 'dashboard' }, { replace: true })] },
  },
})

console.log('--- unauthenticated ---')
await router.navigate({ name: 'dashboard' })
console.log('location after blocked nav:', router.getSnapshot().location.pathname)

session.currentUser = { name: 'Alice' }
console.log('--- authenticated ---')
await router.navigate({ name: 'dashboard' })
console.log('data:', JSON.stringify(router.getSnapshot().matches.at(-1)?.data))

console.log('--- legacy redirect ---')
await router.navigate({ path: '/old-dashboard' })
console.log('location after redirect:', router.getSnapshot().location.pathname)

router.dispose()`,
  name: 'Guards and Redirects — Auth Flows',
};
