export const basicLoggingExample = {
  code: `import { createLogger } from '@vielzeug/rune'

const log = createLogger()

// message-only
log.debug('app starting')
log.info('ready')

// message + structured context
log.info('server listening', { port: 3000 })
log.warn('retrying request', { retries: 3 })

// Pass Error as a context field — auto-serialized to { message, name, stack }
const err = new Error('connection refused')
log.error('service unavailable', { err })
log.error('request failed', { err, requestId: 'r-001' })

console.log('(Open DevTools console to see styled output)')`,
  name: 'Basic Logging',
};
