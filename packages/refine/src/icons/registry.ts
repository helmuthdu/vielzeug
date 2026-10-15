import { RefineError } from '../errors';
import type { IconDefinition } from './definition';
import { validateIcon } from './svg';

const registry = new Map<string, IconDefinition>();
const defaults = new Map<string, IconDefinition>();
const keyOf = (name: string): string => name.replace(/[-_]/g, '').toLowerCase();

/** Register trusted, synchronous SVG data. Re-registration replaces an application icon. */
export function registerIcons(icons: Readonly<Record<string, IconDefinition>>): void {
  const entries = Object.entries(icons).map(([name, icon]) => {
    if (!/^[a-zA-Z0-9][\w:.-]*$/.test(name)) throw new RefineError('Invalid icon name');
    validateIcon(icon);
    return [keyOf(name), structuredClone(icon)] as const;
  });

  for (const [name, icon] of entries) registry.set(name, icon);
}

/** Internal defaults never replace application registrations, in either import order. */
export function registerDefaultIcons(icons: Readonly<Record<string, IconDefinition>>): void {
  for (const [name, icon] of Object.entries(icons)) {
    validateIcon(icon);
    defaults.set(keyOf(name), icon);
  }
}

export const resolveIcon = (name: string): IconDefinition | undefined =>
  registry.get(keyOf(name)) ?? defaults.get(keyOf(name));
