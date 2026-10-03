/**
 * The synchronous icon registry `ore-icon` resolves names from. Kept as a leaf
 * module (no component imports) so both `icon.ts` and icon-set modules can
 * import it without cycles. It starts with the icons refine's own components
 * render (`core/icons.ts`) and grows through `registerIcons()`.
 */

/** One icon: SVG child tags with their attributes, in render order. */
export type IconNode = Array<[string, Record<string, string | number | undefined>]>;

const registry = new Map<string, IconNode>();

/**
 * Register icons (or override existing ones) by name. Keys may be kebab-case or
 * PascalCase: both resolve.
 */
export function registerIcons(icons: Record<string, IconNode>): void {
  for (const [name, node] of Object.entries(icons)) {
    registry.set(name, node);
  }
}

const toPascalCase = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join('');

export const resolveIcon = (name: string): IconNode | undefined =>
  registry.get(name) ?? registry.get(toPascalCase(name));
