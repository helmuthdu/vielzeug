import type { Middleware, Placement } from './types';

import { flip } from './middleware/flip';
import { offset } from './middleware/offset';
import { shift } from './middleware/shift';
import { size } from './middleware/size';

/**
 * A positioning preset — a pre-configured `placement` and `middleware` array
 * ready to spread into `float()` or `computePosition()` options.
 */
export interface PositioningPreset {
  placement: Placement;
  middleware: Middleware[];
}

export interface PresetOptions {
  /** Gap between the reference and floating element in pixels. */
  offset?: number;
  /** Padding to keep the floating element away from the boundary edge. */
  padding?: number;
  /** Override the default placement. */
  placement?: Placement;
}

/**
 * Small informational tooltip.
 * Stack: `offset(8) → flip({ padding }) → shift({ padding })`
 *
 * @example
 * ```ts
 * import { tooltip } from '@vielzeug/orbit/presets';
 * const cleanup = float(trigger, tooltipEl, tooltip());
 * ```
 */
export function tooltip(options: PresetOptions = {}): PositioningPreset {
  const padding = options.padding ?? 6;

  return {
    middleware: [offset(options.offset ?? 8), flip({ padding }), shift({ padding })],
    placement: options.placement ?? 'top',
  };
}

/**
 * Dropdown panel (select, combobox, menu).
 * Stack: `offset(4) → flip({ padding }) → shift({ padding }) → size({ padding })`
 *
 * @example
 * ```ts
 * import { dropdown } from '@vielzeug/orbit/presets';
 * const cleanup = float(trigger, panel, dropdown());
 * ```
 */
export function dropdown(options: PresetOptions = {}): PositioningPreset {
  const padding = options.padding ?? 6;

  return {
    middleware: [offset(options.offset ?? 4), flip({ padding }), shift({ padding }), size({ padding })],
    placement: options.placement ?? 'bottom-start',
  };
}

/**
 * Rich popover or flyout panel (often with an arrow and close button).
 * Stack: `offset(12) → flip({ padding }) → shift({ padding })`
 *
 * @example
 * ```ts
 * import { popover } from '@vielzeug/orbit/presets';
 * const cleanup = float(trigger, panel, popover());
 * ```
 */
export function popover(options: PresetOptions = {}): PositioningPreset {
  const padding = options.padding ?? 8;

  return {
    middleware: [offset(options.offset ?? 12), flip({ padding }), shift({ padding })],
    placement: options.placement ?? 'top',
  };
}

/**
 * Right-click context menu anchored to cursor coordinates (virtual reference).
 * Stack: `offset(2) → flip({ padding }) → shift({ padding })`
 *
 * @example
 * ```ts
 * import { contextMenu } from '@vielzeug/orbit/presets';
 * document.addEventListener('contextmenu', (e) => {
 *   const vref = { getBoundingClientRect: () => ({ x: e.clientX, y: e.clientY, width: 0, height: 0, ... }) };
 *   float(vref, menu, contextMenu());
 * });
 * ```
 */
export function contextMenu(options: PresetOptions = {}): PositioningPreset {
  const padding = options.padding ?? 8;

  return {
    middleware: [offset(options.offset ?? 2), flip({ padding }), shift({ padding })],
    placement: options.placement ?? 'bottom-start',
  };
}
