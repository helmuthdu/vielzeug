import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTooltip } from '../interaction/tooltip';
import type { Datum, Series } from '../types';

const datum: Datum = { key: 'Nov', value: 10 };
const series: Series = { data: [datum], name: 'Docs Service' };

/** Pins an element's measured box: `width` x `height`, with its top at `top` (viewport coords). */
const stubRect = (target: unknown, width: number, height: number, top: number): void => {
  Object.defineProperty(target, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      bottom: top + height,
      height,
      left: 0,
      right: width,
      top,
      width,
      x: 0,
      y: top,
    }),
  });
};

describe('tooltip placement inside the host box', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    // The reporting page is 900px tall; the chart card sits well below its top edge.
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 });
    container.remove();
  });

  it('flips below the anchor when a clipping card cuts the other side', () => {
    // Geometry from the report: a 260px chart whose card starts at viewport y=441.
    stubRect(container, 800, 260, 441);

    const tooltip = createTooltip(container, true);
    // A comparison tooltip for many series: far taller than the chart itself.
    stubRect(tooltip.el, 260, 483, 0);

    // Hovered bar top 17px into the container (y=458). Above it the tooltip would span
    // y=-33..450, and the card's `overflow: hidden` swallows everything above y=441: the
    // title and most rows. Only 33px would leave the *viewport* there, so scoring `flip`
    // against the viewport (its default) keeps that side; scoring it against the host box
    // — what the user can actually see — chooses the side below the anchor instead.
    tooltip.show(400, 17, datum, series, 'Nov: 10');

    expect(Number.parseFloat(tooltip.el.style.top)).toBeCloseTo(25, 5);

    tooltip.dispose();
  });

  it('stays above the anchor when the container has room above it', () => {
    stubRect(container, 800, 260, 441);

    const tooltip = createTooltip(container, true);
    stubRect(tooltip.el, 200, 60, 0);

    tooltip.show(400, 200, datum, series, 'Nov: 10');

    expect(Number.parseFloat(tooltip.el.style.top)).toBeCloseTo(132, 5);

    tooltip.dispose();
  });

  it('honours a configured offset', () => {
    stubRect(container, 800, 260, 441);

    const tooltip = createTooltip(container, { offset: 24 });
    stubRect(tooltip.el, 200, 60, 0);

    tooltip.show(400, 200, datum, series, 'Nov: 10');

    expect(Number.parseFloat(tooltip.el.style.top)).toBeCloseTo(200 - 24 - 60, 5);

    tooltip.dispose();
  });
});
