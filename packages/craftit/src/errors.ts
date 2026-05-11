export const CRAFTIT_ERRORS = {
  cleanupFailed: 'One or more cleanup callbacks failed during dispose',
  defineDuplicate: (tag: string): string => `define('${tag}') was called more than once`,
  defineFieldRequiresFormAssociated: (tag: string): string =>
    `defineField() requires define('${tag}', { formAssociated: true })`,
  defineRequiresTag: 'define() requires a non-empty tag name',
  eachDuplicateKey: (key: string, index: number): string => `each() received duplicate key "${key}" at index ${index}`,
  injectStrictFailed: (key: string, tag: string): string => `injectStrict() could not resolve key "${key}" in <${tag}>`,
  lifecycleOutsideSetup: 'Lifecycle hooks must be called synchronously during component setup',
  styleReplaceFailed: 'Style sheet replace failed',
  unhandledComponentError: (tag: string): string => `<${tag}> threw an unhandled error during setup`,
} as const;
