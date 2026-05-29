export const scopedLoggingExample = {
  code: "import { Rune } from '/rune'\n\n// Create scoped loggers\nconst apiLogger = Rune.scope('API')\nconst dbLogger = Rune.scope('Database')\nconst authLogger = Rune.scope('Auth')\n\napiLogger.info('Making HTTP request')\ndbLogger.success('Connected to database')\nauthLogger.warn('Token expiring soon')\napiLogger.error('Request failed')\n\nconsole.log('Check browser console for scoped output!')",
  name: 'Scoped Logging',
};
