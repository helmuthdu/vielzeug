export const scopedLoggingExample = {
  code: `import { defaultLogger } from '@vielzeug/rune'

// child() dot-joins namespaces automatically
const api = defaultLogger.child({ namespace: 'api' })    // 'api'
const auth = api.child({ namespace: 'auth' })   // 'api.auth'
const worker = api.child({ namespace: 'worker' }) // 'api.worker'

// Individual getters — no config snapshot
console.log('root:', defaultLogger.namespace)   // ''
console.log('api:', api.namespace)     // 'api'
console.log('auth:', auth.namespace)   // 'api.auth'
console.log('worker:', worker.namespace) // 'api.worker'

// withBindings() pins fields to every call
const reqLog = auth.withBindings({ requestId: 'r-001', userId: 'u-42' })
reqLog.info('token check')
reqLog.warn({ expired: false }, 'token refreshed')

console.log('bindings snapshot:', reqLog.bindings)

// enabled() checks whether a level passes the logger threshold
console.log('debug enabled:', api.enabled('debug')) // true (default level is debug)
const warnLog = api.child({ logLevel: 'warn' })
console.log('warnLog debug:', warnLog.enabled('debug')) // false

console.log('(Open DevTools console to see styled output)')`,
  name: 'Scoped Loggers',
};
