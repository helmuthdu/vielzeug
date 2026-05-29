export const configurationExample = {
  code: "import { createLogger } from '/rune'\n\n// A custom inline transport captures entries synchronously\nconst entries = []\nconst log = createLogger({\n  logLevel: 'debug',\n  namespace: 'app',\n  transports: [(entry) => entries.push(entry)],\n})\n\nlog.info({ path: '/users', method: 'GET' }, 'request')\nlog.warn('cache miss')\nlog.error(new Error('timeout'))\n\n// Inspect the structured LogEntry objects captured by the transport\nentries.forEach((e, i) => {\n  console.log('Entry ' + (i + 1) + ' [' + e.level + ']:', JSON.stringify({\n    namespace: e.namespace,\n    message: e.message,\n    context: e.context,\n  }))\n})",
  name: 'Transport Pipeline',
};
