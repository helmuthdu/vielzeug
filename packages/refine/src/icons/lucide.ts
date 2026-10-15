import type { IconDefinition } from './definition';

/** Structural Lucide data: no Lucide runtime or full icon pack is imported. */
export type LucideIconData = readonly (readonly [string, Readonly<Record<string, string | number | undefined>>])[];

export function lucideIcons(icons: Readonly<Record<string, LucideIconData>>): Record<string, IconDefinition> {
  return Object.fromEntries(
    Object.entries(icons).map(([name, nodes]) => [
      name,
      {
        children: nodes.map(([tag, attrs]) => ({ attrs, tag })),
        presentation: {
          fill: 'none',
          stroke: 'currentColor',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          'stroke-width': 2,
        },
        viewBox: [0, 0, 24, 24],
      },
    ]),
  );
}
