export const basicLoggingExample = {
  code: "import { Rune } from '@vielzeug/rune'\n\n// message-only\nRune.debug('app starting')\nRune.info('ready')\n\n// context-first \u2014 structured data before message\nRune.info({ port: 3000 }, 'server listening')\nRune.warn({ retries: 3 }, 'retrying request')\n\n// Pass Error as a context field \u2014 auto-serialized to { message, name, stack }\nconst err = new Error('connection refused')\nRune.error({ err }, 'service unavailable')\nRune.error({ err, requestId: 'r-001' }, 'request failed')\n\nconsole.log('(Open DevTools console to see styled output)')",
  name: 'Basic Logging',
};
