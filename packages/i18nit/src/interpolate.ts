import type { Vars } from './types';

import { resolvePath } from './helpers';

/* -------------------- Interpolation -------------------- */

const INTERPOLATION_PATTERN = /\{([\p{ID_Continue}\-.]+)\}/gu;

/**
 * Interpolates `{name}` and `{user.name}` placeholders.
 */
export function interpolate(template: string, vars?: Vars): string {
  if (!vars || !template.includes('{')) return template;

  return template.replace(INTERPOLATION_PATTERN, (_match, key: string) => {
    const value = resolvePath(vars, key);

    return value == null ? '' : String(value);
  });
}
