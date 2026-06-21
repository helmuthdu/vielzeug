export const description = 'Structured logger with level filtering, scoped namespaces, and more.';

export const loader = () => import('@vielzeug/rune');

export const apiExports = [
  'Rune',
  'createLogger',
  'lazy',
  'consoleTransport',
  'remoteTransport',
  'jsonTransport',
  'batchTransport',
  'sampleTransport',
  'redactTransport',
] as const;
