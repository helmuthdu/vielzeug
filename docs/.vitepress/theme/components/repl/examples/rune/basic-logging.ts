export const basicLoggingExample = {
  code: `import { defaultLogger } from '@vielzeug/rune'

// message-only
defaultLogger.debug('app starting')
defaultLogger.info('ready')

// context-first — structured data before message
defaultLogger.info({ port: 3000 }, 'server listening')
defaultLogger.warn({ retries: 3 }, 'retrying request')

// Pass Error as a context field — auto-serialized to { message, name, stack }
const err = new Error('connection refused')
defaultLogger.error({ err }, 'service unavailable')
defaultLogger.error({ err, requestId: 'r-001' }, 'request failed')

console.log('(Open DevTools console to see styled output)')`,
  name: 'Basic Logging',
};
