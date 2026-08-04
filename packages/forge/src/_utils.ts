export { flattenPaths as flattenValues } from '@vielzeug/arsenal/object';

export function sanitizeForLog(text: string, maxLength = 200): string {
  return text.replace(/\p{C}/gu, '?').slice(0, maxLength);
}
