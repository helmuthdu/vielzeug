import type { IconDefinition } from './definition.js';
import { type IconifyIcon, iconifyIcon } from './iconify.js';

/** Keep app keys and the shared Iconify geometry, presentation, and validation contract. */
export function mapIconifyIcons(icons: Readonly<Record<string, IconifyIcon>>): Record<string, IconDefinition> {
  return Object.fromEntries(Object.entries(icons).map(([name, data]) => [name, iconifyIcon(data)]));
}
