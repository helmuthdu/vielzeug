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
 * import { define, themableBundle, sizableBundle, disablableBundle } from '../shared/bundles';
 *
 * const myProps = {
 *   ...themableBundle, *   ...sizableBundle, *   ...disablableBundle, *   label: '', * } satisfies PropBundle<{ color?: string; disabled?: boolean; label?: string; size?: string }>;
 *
 * define('my-el', { props: myProps, setup({ props }) { ... } });
 * ```
 */

import type { PropsInput } from '@vielzeug/craftit';

import type { ComponentSize, RoundedSize, ThemeColor } from '../../types';

export type PropBundle<Props extends Record<string, unknown>> = PropsInput<Props>;

/**
 * Prop bundle for components that support a theme colour.
 * Exposes a `color` signal typed as `ThemeColor | undefined`.
 */
export const themableBundle = {
  color: undefined,
} satisfies PropBundle<{ color?: ThemeColor }>;

/**
 * Prop bundle for components with discrete size variants.
 * Exposes a `size` signal typed as `ComponentSize | undefined`.
 */
export const sizableBundle = {
  size: undefined,
} satisfies PropBundle<{ size?: ComponentSize }>;

/**
 * Prop bundle for interactive components that can be disabled.
 * Exposes a `disabled` signal typed as `boolean`.
 */
export const disablableBundle = {
  disabled: false,
} satisfies PropBundle<{ disabled?: boolean }>;

/**
 * Prop bundle for components with a loading / busy state.
 * Exposes a `loading` signal typed as `boolean`.
 */
export const loadableBundle = {
  loading: false,
} satisfies PropBundle<{ loading?: boolean }>;

/**
 * Prop bundle for components with configurable border-radius.
 * Exposes a `rounded` signal typed as `RoundedSize | undefined`.
 */
export const roundableBundle = {
  rounded: undefined,
} satisfies PropBundle<{ rounded?: RoundedSize }>;
