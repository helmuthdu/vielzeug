export const basicLoggingExample = {
  code: "import { defaultLogger } from '@vielzeug/rune'\n\n// message-only\ndefaultLogger.debug('app starting')\ndefaultLogger.info('ready')\n\n// context-first \u2014 structured data before message\ndefaultLogger.info({ port: 3000 }, 'server listening')\ndefaultLogger.warn({ retries: 3 }, 'retrying request')\n\n// Pass Error as a context field \u2014 auto-serialized to { message, name, stack }\nconst err = new Error('connection refused')\ndefaultLogger.error({ err }, 'service unavailable')\ndefaultLogger.error({ err, requestId: 'r-001' }, 'request failed')\n\nconsole.log('(Open DevTools console to see styled output)')",
  name: 'Basic Logging',
};
