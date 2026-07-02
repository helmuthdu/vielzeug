export const dataLoggingExample = {
  code: `import { createLogger, lazy } from '@vielzeug/rune'

const entries = []
const log = createLogger({ transports: [(e) => entries.push(e)] })

// lazy() defers factory evaluation until after the level check
let callCount = 0
const reqLog = log.withBindings({
  snapshot: lazy(() => ({ n: ++callCount, size: 1024 })),
})

reqLog.debug('trace')  // snapshot() called — callCount becomes 1
reqLog.info('step 2') // snapshot() called — callCount becomes 2

// Suppress debug: lazy factory is never called
const quietLog = log.child({ logLevel: 'warn' })
const quietReq = quietLog.withBindings({ val: lazy(() => ++callCount) })
quietReq.debug('not emitted') // factory skipped

console.log('Factory calls:', callCount) // 2, not 3

// time() measures execution and emits { duration_ms } in data
const parsed = log.time('parse', () => JSON.parse('[1,2,3]'))
console.log('Parsed:', parsed)
console.log('Timer data:', entries[entries.length - 1].data)

// When the timed fn throws, { err } is also included in data
try {
  log.time('risky', () => { throw new Error('oops') })
} catch {}
console.log('Error data:', entries[entries.length - 1].data)

// dispose() marks the logger as disposed; subsequent calls become no-ops
log.dispose()
log.info('silenced') // no-op
console.log('disposed:', log.disposed) // true`,
  name: 'Lazy Bindings & Timing',
};
