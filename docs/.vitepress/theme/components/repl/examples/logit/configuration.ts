export const configurationExample = {
  code: "import { Logit } from '@vielzeug/logit'\n\n// Configure Logit\nLogit.setConfig({\n  variant: 'symbol', // 'text' | 'symbol' | 'icon'\n  logLevel: 'debug',\n  environment: true,\n  timestamp: true\n})\n\nLogit.info('Configured with symbols')\n\n// Change variant\nLogit.setConfig({ variant: 'text' })\nLogit.info('Now using text variant')\n\nLogit.setConfig({ variant: 'icon' })\nLogit.info('Now using icon variant')\n\n// Toggle environment indicator\nLogit.setConfig({ environment: false })\nLogit.info('Environment indicator hidden')\n\nconsole.log('Check browser console!')",
  name: 'Configuration Options',
};
