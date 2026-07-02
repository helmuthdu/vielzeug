export const logLevelsExample = {
  code: `import { createLogger } from '@vielzeug/rune'

const entries = []
const log = createLogger({
  logLevel: 'debug',
  namespace: 'app',
  transports: [(e) => entries.push(e)],
})

// Threshold order: debug < info < warn < error < fatal < off
log.debug('msg')
log.info('msg')
log.warn('msg')
log.error('msg')
log.fatal('msg')
console.log('All levels:', entries.map((e) => e.level))
entries.length = 0

// child() with raised threshold — debug and info are suppressed
const prodLog = log.child({ logLevel: 'warn' })
prodLog.debug('suppressed')
prodLog.info('suppressed')
prodLog.warn('passes')
prodLog.error('passes')
console.log('Threshold warn:', entries.map((e) => e.level))
entries.length = 0

// Individual getters expose config without a snapshot object
console.log('log.logLevel:', log.logLevel)       // 'debug'
console.log('prodLog.logLevel:', prodLog.logLevel) // 'warn'
console.log('log.namespace:', log.namespace)      // 'app'

// enabled() guards expensive payload construction
console.log('debug enabled:', log.enabled('debug'))       // true
console.log('debug enabled (prod):', prodLog.enabled('debug')) // false`,
  name: 'Level Filtering',
};
