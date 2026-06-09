import type { BandScale, Scale, TransitionConfig } from '../../types';

import { animate } from '../../animation/transition';
import { createSvgElement, setAttributes } from '../../svg/element';

export interface BarRenderOptions {
  borderRadius: number;
  color: string;
  seriesCount: number;
  seriesIndex: number;
  transition?: TransitionConfig;
}

export function renderBars(
  parent: SVGGElement,
  data: { x: string; y: number }[],
  xScale: BandScale,
  yScale: Scale<number>,
  baselineY: number,
  options: BarRenderOptions,
): void {
  while (parent.children.length > data.length) {
    parent.removeChild(parent.lastChild!);
  }

  const bandwidth = xScale.bandwidth();
  const barWidth = bandwidth / options.seriesCount;
  const offset = barWidth * options.seriesIndex;

  for (let i = 0; i < data.length; i++) {
    const d = data[i];
    const x = xScale.map(d.x) + offset;
    const y = yScale.map(d.y);
    const height = Math.abs(baselineY - y);
    const barY = Math.min(y, baselineY);

    let rect = parent.children[i] as SVGRectElement | undefined;

    if (!rect) {
      rect = createSvgElement('rect', { class: 'prism-bar' });
      parent.appendChild(rect);
    }

    const finalHeight = Math.max(0, height);
    const finalY = barY;
    const isNew = !rect.hasAttribute('data-init');

    setAttributes(rect, {
      fill: options.color,
      rx: options.borderRadius,
      ry: options.borderRadius,
      width: Math.max(0, barWidth - 1),
      x,
    });

    if (options.transition && isNew) {
      rect.setAttribute('data-init', '1');
      setAttributes(rect, { height: 0, y: baselineY });
      animate(
        [{ attrs: { height: { from: 0, to: finalHeight }, y: { from: baselineY, to: finalY } }, el: rect }],
        options.transition,
      );
    } else {
      rect.setAttribute('data-init', '1');
      setAttributes(rect, { height: finalHeight, y: finalY });

      if (options.transition) {
        animate(
          [
            {
              attrs: {
                height: { from: Number(rect.getAttribute('height') ?? finalHeight), to: finalHeight },
                y: { from: Number(rect.getAttribute('y') ?? finalY), to: finalY },
              },
              el: rect,
            },
          ],
          options.transition,
        );
      }
    }
  }
}
