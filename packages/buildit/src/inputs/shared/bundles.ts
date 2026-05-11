/**
 * Shared prop bundles for BuildIt components.
 *
 * Each bundle is a plain object of prop defaults/config. Components merge these
 * with object spread to avoid duplicating prop definitions across the library
 * while keeping `define<Props>('tag-name', { props: { ... } })` as the only prop
 * authoring pattern.
 *
 * @example
 * ```ts
 * import { define } from '@vielzeug/craftit';
 * import { themableBundle, sizableBundle, disablableBundle, type PropsDef } from '../shared/bundles';
 *
 * const myProps = {
 *   ...themableBundle,
 *   ...sizableBundle,
 *   ...disablableBundle,
 *   label: '',
 * } satisfies PropsDef<{ color?: string; disabled?: boolean; label?: string; size?: string }>;
 *
 * define('my-el', {
 *   props: myProps,
 *   setup(props, {  }) {
 *     const props = useProps<{ color?: string; disabled?: boolean; label?: string; size?: string }>();
 *
 *     return props.label.value ?? '';
 *   },
 * });
 * ```
 */

export type { PropsDef } from '@vielzeug/craftit';

import type { ComponentSize, RoundedSize, ThemeColor } from '../../types';

/**
 * Prop bundle for components that support a theme colour.
 * Exposes a `color` signal typed as `ThemeColor | undefined`.
 */
export const themableBundle = {
  color: undefined as ThemeColor | undefined,
};

/**
 * Prop bundle for components with discrete size variants.
 * Exposes a `size` signal typed as `ComponentSize | undefined`.
 */
export const sizableBundle = {
  size: undefined as ComponentSize | undefined,
};

/**
 * Prop bundle for interactive components that can be disabled.
 * Exposes a `disabled` signal typed as `boolean`.
 */
export const disablableBundle = {
  disabled: false,
};

/**
 * Prop bundle for components with a loading / busy state.
 * Exposes a `loading` signal typed as `boolean`.
 */
export const loadableBundle = {
  loading: false,
};

/**
 * Prop bundle for components with configurable border-radius.
 * Exposes a `rounded` signal typed as `RoundedSize | undefined`.
 */
export const roundableBundle = {
  rounded: undefined as RoundedSize | undefined,
};

/**
 * Prop bundle for components with an elevation / box-shadow.
 * Exposes a `elevation` signal typed as `number | undefined`.
 */
export const elevatableBundle = {
  elevation: undefined,
};
