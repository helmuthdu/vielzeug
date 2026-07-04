import type { AxisConfig, AxisPosition } from '../types';

import { createSvgElement, removeChildren, setAttributes } from '../svg/element';
import { createTextElement } from '../svg/text';
import { type AnyScale, mapTick } from './scale-utils';

const defaultTickFormat = (v: Date | number | string): string =>
  v instanceof Date ? v.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : String(v);

/**
 * Resolves the tick count an axis will render for a given scale/length — shared with
 * `renderGrid` so gridlines line up with axis ticks. `defaultPosition` must match the
 * one passed to the corresponding `renderAxis` call ('bottom' for xAxis, 'left' for yAxis).
 */
export function resolveTickCount(config: AxisConfig, length: number, defaultPosition: AxisPosition): number {
  const position = config.position ?? defaultPosition;
  const isHorizontal = position === 'bottom' || position === 'top';
  const defaultTickCount = isHorizontal ? Math.max(2, Math.floor(length / 80)) : Math.max(2, Math.floor(length / 50));

  return config.tickCount ?? defaultTickCount;
}

/**
 * `defaultPosition` is applied when `config.position` is unset — pass `'bottom'` for an
 * xAxis call and `'left'` for a yAxis call so an unconfigured axis renders on its
 * conventional side instead of always defaulting to a horizontal bottom axis.
 */
export function renderAxis(
  parent: SVGGElement,
  scale: AnyScale,
  config: AxisConfig,
  length: number,
  defaultPosition: AxisPosition = 'bottom',
): void {
  removeChildren(parent);

  const position = config.position ?? defaultPosition;
  const isHorizontal = position === 'bottom' || position === 'top';
  const isInverted = position === 'top' || position === 'left';
  const tickSize = 6;
  const tickDirection = isInverted ? -1 : 1;

  const axisLine = createSvgElement('line', {
    'aria-hidden': 'true',
    class: 'prism-axis-line',
    x1: isHorizontal ? 0 : 0,
    x2: isHorizontal ? length : 0,
    y1: isHorizontal ? 0 : 0,
    y2: isHorizontal ? 0 : length,
  });

  parent.appendChild(axisLine);

  const ticks = scale.ticks(resolveTickCount(config, length, defaultPosition));
  const format = config.tickFormat ?? defaultTickFormat;

  for (const tick of ticks) {
    const pos = mapTick(scale, tick);
    const tickLine = createSvgElement('line', {
      'aria-hidden': 'true',
      class: 'prism-axis-tick',
      x1: isHorizontal ? pos : 0,
      x2: isHorizontal ? pos : tickSize * tickDirection,
      y1: isHorizontal ? 0 : pos,
      y2: isHorizontal ? tickSize * tickDirection : pos,
    });

    parent.appendChild(tickLine);

    const label = createTextElement(format(tick), {
      'aria-hidden': 'true',
      class: 'prism-axis-label',
      'dominant-baseline': isHorizontal ? (isInverted ? 'auto' : 'hanging') : 'middle',
      'text-anchor': isHorizontal ? 'middle' : isInverted ? 'end' : 'start',
      x: isHorizontal ? pos : tickSize * tickDirection * 1.5,
      y: isHorizontal ? tickSize * tickDirection * 1.5 : pos,
    });

    parent.appendChild(label);
  }

  if (config.label) {
    const labelEl = createTextElement(config.label, {
      class: 'prism-axis-title',
      'dominant-baseline': 'middle',
      'text-anchor': 'middle',
    });

    if (isHorizontal) {
      setAttributes(labelEl, { x: length / 2, y: tickSize * tickDirection * 3.5 });
    } else {
      setAttributes(labelEl, {
        transform: `translate(${tickSize * tickDirection * 4}, ${length / 2}) rotate(-90)`,
      });
    }

    parent.appendChild(labelEl);
  }
}
