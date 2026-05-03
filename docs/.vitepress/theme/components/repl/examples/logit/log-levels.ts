export const logLevelsExample = {
  code: "import { Logit } from '@vielzeug/logit'\n\n// Get current level\nconsole.log('Current level:', Logit.config.logLevel)\n\n// Set to only show warnings and errors\nLogit.setConfig({ logLevel: 'warn' })\n\nLogit.debug('This will not appear')\nLogit.info('This will not appear')\nLogit.warn('This will appear')\nLogit.error('This will appear')\n\n// Reset to show all\nLogit.setConfig({ logLevel: 'debug' })\nconsole.log('\\nAll logs enabled again')",
  name: 'Log Levels',
};
