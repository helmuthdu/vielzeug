import { mapIconifyIcons } from './_iconify-map.js';
import type { IconDefinition } from './definition.js';
import type { IconifyIcon } from './iconify.js';

export type { IconifyIcon } from './iconify.js';

/**
 * Convert caller-named individual `@iconify-icons/heroicons` data, not `@heroicons/react` components.
 * Preserves app keys and SVG presentation; requires DOMParser. No imports or registration of icon sets.
 */
export function heroiconsIcons(icons: Readonly<Record<string, IconifyIcon>>): Record<string, IconDefinition> {
  return mapIconifyIcons(icons);
}
