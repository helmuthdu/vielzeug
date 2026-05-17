export const scopedLoggingExample = {
  code: "import { Logit } from '@vielzeug/logit'\n\n// Create scoped loggers\nconst apiLogger = Logit.scope('API')\nconst dbLogger = Logit.scope('Database')\nconst authLogger = Logit.scope('Auth')\n\napiLogger.info('Making HTTP request')\ndbLogger.success('Connected to database')\nauthLogger.warn('Token expiring soon')\napiLogger.error('Request failed')\n\nconsole.log('Check browser console for scoped output!')",
  name: 'Scoped Logging',
};
