export const CRAFTIT_ERRORS = {
  cleanupFailed: '[craftit:E13] One or more cleanup callbacks failed',
  defineDuplicate: (tag: string): string => `[craftit:E10] define('${tag}', ...) called more than once`,
  defineFieldRequiresFormAssociated: (tag: string): string =>
    `[craftit:E8] defineField() requires define(..., { formAssociated: true, ... }) for <${tag}>`,
  defineRequiresTag: '[craftit:E4] registerComponent(tag, ...) requires a tag name',
  injectStrictFailed: (key: string, tag: string): string =>
    `[craftit:E11] injectStrict(...) failed for key "${key}" in <${tag}>`,
  lifecycleOutsideSetup: '[craftit:E1] lifecycle outside setup',
  styleReplaceFailed: '[craftit:E2] style replace failed',
  unhandledComponentError: (tag: string): string => `[craftit:E3] <${tag}>`,
} as const;
