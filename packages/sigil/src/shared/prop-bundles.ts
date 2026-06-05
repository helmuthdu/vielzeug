import { prop } from '@vielzeug/craft';

import type { ComponentSize, ElevationLevel, RoundedSize, ThemeColor } from './types';

/** Prop bundle for components that support a theme colour. */
export const themableBundle = {
  color: prop.string<ThemeColor>(),
};

/** Prop bundle for components with discrete size variants. */
export const sizableBundle = {
  size: prop.string<ComponentSize>(),
};

/** Prop bundle for interactive components that can be disabled. */
export const disablableBundle = {
  disabled: prop.bool(false),
};

/** Prop bundle for components with a loading / busy state. */
export const loadableBundle = {
  loading: prop.bool(false),
};

/** Prop bundle for components with configurable border-radius. */
export const roundableBundle = {
  rounded: prop.string<RoundedSize>(),
};

/** Prop bundle for components with an elevation / box-shadow. */
export const elevatableBundle = {
  elevation: prop.number<ElevationLevel>(),
};

/**
 * Convenience bundle combining the five most common interactive-component props:
 * `color`, `size`, `disabled`, `loading`, and `rounded`.
 *
 * Use this single spread instead of five separate bundle spreads when a
 * component needs all of them.
 *
 * @example
 * ```ts
 * props: { ...commonProps, href: prop.string() }
 * ```
 */
export const commonProps = {
  ...themableBundle,
  ...sizableBundle,
  ...disablableBundle,
  ...loadableBundle,
  ...roundableBundle,
};
