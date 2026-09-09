export const configurationExample = {
  code: `import { createLogger } from '@vielzeug/rune'

// A custom inline transport captures entries synchronously
const entries = []
const log = createLogger({
  logLevel: 'debug',
  namespace: 'app',
  transports: [(entry) => entries.push(entry)],
})

log.info('request', { path: '/users', method: 'GET' })
log.warn('cache miss')
log.error('request failed', { err: new Error('timeout') })

// Inspect the structured LogEntry objects captured by the transport
entries.forEach((e, i) => {
  console.log('Entry ' + (i + 1) + ' [' + e.level + ']:', JSON.stringify({
    namespace: e.namespace,
    message: e.message,
    data: e.data,
  }))
})`,
  name: 'Transport Pipeline',
};
