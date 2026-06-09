import type { LegendConfig, LegendPosition } from '../types';

export interface LegendState {
  el: HTMLDivElement;
  destroy(): void;
  update(series: { color: string; name: string }[]): void;
}

function resolvePosition(config: LegendConfig | true): LegendPosition {
  if (config === true) return 'bottom';

  return config.position ?? 'bottom';
}

export function createLegend(container: HTMLElement, config: LegendConfig | true): LegendState {
  const position = resolvePosition(config);
  const el = document.createElement('div');

  el.className = `prism-legend prism-legend--${position}`;

  if (position === 'top') {
    container.insertBefore(el, container.firstChild);
  } else {
    container.appendChild(el);
  }

  return {
    destroy() {
      el.remove();
    },
    el,
    update(series) {
      el.innerHTML = '';
      for (const s of series) {
        const item = document.createElement('div');

        item.className = 'prism-legend-item';

        const dot = document.createElement('span');

        dot.className = 'prism-legend-dot';
        dot.style.backgroundColor = s.color;

        const label = document.createElement('span');

        label.className = 'prism-legend-label';
        label.textContent = s.name;

        item.appendChild(dot);
        item.appendChild(label);
        el.appendChild(item);
      }
    },
  };
}
