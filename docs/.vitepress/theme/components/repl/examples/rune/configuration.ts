export const configurationExample = {
  code: "import { Rune } from '/rune'\n\n// Configure Rune\nRune.setConfig({\n  variant: 'symbol', // 'text' | 'symbol' | 'icon'\n  logLevel: 'debug',\n  environment: true,\n  timestamp: true\n})\n\nRune.info('Configured with symbols')\n\n// Change variant\nRune.setConfig({ variant: 'text' })\nRune.info('Now using text variant')\n\nRune.setConfig({ variant: 'icon' })\nRune.info('Now using icon variant')\n\n// Toggle environment indicator\nRune.setConfig({ environment: false })\nRune.info('Environment indicator hidden')\n\nconsole.log('Check browser console!')",
  name: 'Configuration Options',
};
