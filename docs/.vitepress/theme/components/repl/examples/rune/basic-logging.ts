export const basicLoggingExample = {
  code: "import { Rune } from '/rune'\n\n// message-only\nRune.debug('app starting')\nRune.info('ready')\n\n// context-first \u2014 structured data before message\nRune.info({ port: 3000 }, 'server listening')\nRune.warn({ retries: 3 }, 'retrying request')\n\n// Error auto-serializes into context.err\nconst err = new Error('connection refused')\nRune.error(err)\nRune.fatal(err, 'service unavailable') // message override\n\nconsole.log('(Open DevTools console to see styled output)')",
  name: 'Basic Logging',
};
