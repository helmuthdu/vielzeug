export const description = 'Type-safe schema validation with advanced error handling.';

export const loader = () => import('@vielzeug/spell');

export const apiExports = ['s', 'ValidationError', 'ErrorCode', 'errorsAt', 'configure'] as const;
