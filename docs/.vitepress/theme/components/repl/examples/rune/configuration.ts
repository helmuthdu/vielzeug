export const configurationExample = {
  code: `import { createLogger } from '@vielzeug/rune'

// A custom inline transport captures entries synchronously
const entries = []
const log = createLogger({
  logLevel: 'debug',
  namespace: 'app',
  transports: [(entry) => entries.push(entry)],
})

log.info({ path: '/users', method: 'GET' }, 'request')
log.warn('cache miss')
log.error({ err: new Error('timeout') }, 'request failed')

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
