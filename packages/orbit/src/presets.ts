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
 * Ready-made middleware stacks for common floating UI patterns.
 *
 * Import from the dedicated entrypoint:
 * ```ts
 * import { presets } from '@vielzeug/orbit/presets';
 * ```
 *
 * @example
 * ```ts
 * const cleanup = float(trigger, tooltip, presets.tooltip());
 *
 * // Customize:
 * const cleanup = float(trigger, menu, {
 *   ...presets.dropdown({ placement: 'top-start' }),
 *   autoUpdate: { throttle: 16 },
 * });
 * ```
 */
export const presets = {
  /**
   * Right-click context menu anchored to cursor coordinates (virtual reference).
   * Stack: `[offset] → flip({ padding }) → shift({ padding })`
   */
  contextMenu(options: PresetOptions = {}): PositioningPreset {
    const padding = options.padding ?? 8;

    return {
      middleware: [...(options.offset ? [offset(options.offset)] : []), flip({ padding }), shift({ padding })],
      placement: options.placement ?? 'bottom-start',
    };
  },

  /**
   * Dropdown panel (select, combobox, menu).
   * Stack: `[offset] → flip({ padding }) → shift({ padding }) → size({ padding })`
   */
  dropdown(options: PresetOptions = {}): PositioningPreset {
    const padding = options.padding ?? 6;

    return {
      middleware: [
        ...(options.offset ? [offset(options.offset)] : []),
        flip({ padding }),
        shift({ padding }),
        size({ padding }),
      ],
      placement: options.placement ?? 'bottom-start',
    };
  },

  /**
   * Rich popover or flyout panel (often with an arrow and close button).
   * Stack: `offset(12) → flip({ padding }) → shift({ padding })`
   */
  popover(options: PresetOptions = {}): PositioningPreset {
    const padding = options.padding ?? 8;

    return {
      middleware: [offset(options.offset ?? 12), flip({ padding }), shift({ padding })],
      placement: options.placement ?? 'top',
    };
  },

  /**
   * Small informational tooltip.
   * Stack: `offset(8) → flip() → shift({ padding: 6 })`
   */
  tooltip(options: PresetOptions = {}): PositioningPreset {
    const padding = options.padding ?? 6;

    return {
      middleware: [offset(options.offset ?? 8), flip({ padding }), shift({ padding })],
      placement: options.placement ?? 'top',
    };
  },
} as const;
