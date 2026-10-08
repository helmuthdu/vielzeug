import { createSvgElement } from '../svg/element';
import type { Datum, Series } from '../types';

export interface Announcer {
  announce(text: string): void;
  clear(): void;
}

/** "Label: A 6, B 9": the comparison text shared by tooltips and announcements. */
export function describeValues(
  label: string,
  values: readonly { datum: Datum | undefined; series: Series }[],
  format: (value: number, datum: Datum, series: Series) => string = String,
): string {
  return `${label}: ${values
    .map(({ datum, series }) => `${series.name} ${datum ? format(datum.value, datum, series) : 'n/a'}`)
    .join(', ')}`;
}

/** Polite status region for charts whose visuals are aria-hidden. */
export function createAnnouncer(parent: SVGElement, className: string): Announcer {
  // Off-canvas rather than CSS-hidden so announcements work without prism's stylesheet.
  const region = createSvgElement('text', {
    'aria-live': 'polite',
    class: className,
    role: 'status',
    x: -9999,
    y: -9999,
  });

  parent.appendChild(region);

  return {
    announce(text) {
      region.textContent = text;
    },
    clear() {
      region.textContent = '';
    },
  };
}
