/**
 * Global default configuration for @vielzeug/buildit.
 *
 * Set once at app startup — all components read these defaults when their own
 * props are not explicitly set.
 *
 * @example
 * ```ts
 * import { configure } from '@vielzeug/buildit';
 *
 * configure({
 *   defaultColor: 'primary',
 *   defaultSize: 'md',
 *   defaultVariant: 'solid',
 *   defaultRounded: 'md',
 * });
 * ```
 */

import type { ComponentSize, RoundedSize, ThemeColor, VisualVariant } from '../types/shared';

export interface BitConfig {
  /** Default theme color applied to all components. */
  defaultColor?: ThemeColor;
  /** Default component size. */
  defaultSize?: ComponentSize;
  /** Default visual variant. */
  defaultVariant?: VisualVariant;
  /** Default border-radius size. */
  defaultRounded?: RoundedSize;
}

let _config: Required<BitConfig> = {
  defaultColor: undefined as unknown as ThemeColor,
  defaultRounded: undefined as unknown as RoundedSize,
  defaultSize: undefined as unknown as ComponentSize,
  defaultVariant: undefined as unknown as VisualVariant,
};

/**
 * Returns the current global configuration.
 * Components call this when resolving their own prop defaults.
 */
export function getConfig(): Readonly<Required<BitConfig>> {
  return _config;
}

/**
 * Set global defaults. Partial — only the supplied keys are updated.
 * Should be called once before any component is rendered.
 */
export function configure(config: BitConfig): void {
  _config = { ..._config, ...config };
}
