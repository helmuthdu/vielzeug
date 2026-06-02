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
