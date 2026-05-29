export const logLevelsExample = {
  code: "import { Rune } from '/rune'\n\n// Get current level\nconsole.log('Current level:', Rune.config.logLevel)\n\n// Set to only show warnings and errors\nRune.setConfig({ logLevel: 'warn' })\n\nRune.debug('This will not appear')\nRune.info('This will not appear')\nRune.warn('This will appear')\nRune.error('This will appear')\n\n// Reset to show all\nRune.setConfig({ logLevel: 'debug' })\nconsole.log('\\nAll logs enabled again')",
  name: 'Log Levels',
};
