import { define, createContext, html, provide, type ReadonlySignal } from '@vielzeug/craftit';

import type { ComponentSize, ThemeColor, VisualVariant } from '../../types';

import { type PropBundle, sizableBundle, themableBundle } from '../shared/bundles';
import styles from './button-group.css?inline';

/** Context provided by bit-button-group to its bit-button children. */
export type ButtonGroupContext = {
  color: ReadonlySignal<ThemeColor | undefined>;
  size: ReadonlySignal<ComponentSize | undefined>;
  variant: ReadonlySignal<Exclude<VisualVariant, 'glass'> | undefined>;
};
/** Injection key for the button-group context. */
export const BUTTON_GROUP_CTX = createContext<ButtonGroupContext>('ButtonGroupContext');

/** Button group component properties */
export type BitButtonGroupProps = {
  /** Attach buttons together (no gap, rounded only on edges) */
  attached?: boolean;
  /** Button color for all children (propagated) */
  color?: ThemeColor;
  /** Make all buttons full width */
  fullwidth?: boolean;
  /** Accessible group label */
  label?: string;
  /** Group orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Button size for all children (propagated) */
  size?: ComponentSize;
  /** Button variant for all children (propagated) */
  variant?: Exclude<VisualVariant, 'glass'>;
};

// -------------------- Component Definition --------------------
/**
 * A container for grouping buttons with coordinated styling and layout.
 *
 * @element bit-button-group
 *
 * @attr {string} size - Button size: 'sm' | 'md' | 'lg'
 * @attr {string} variant - Visual variant: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'frost'
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} orientation - Group orientation: 'horizontal' | 'vertical'
 * @attr {boolean} attached - Attach buttons together (no gap, rounded only on edges)
 * @attr {boolean} fullwidth - Make all buttons full width
 * @attr {string} label - Accessible group label
 *
 * @slot - Button elements (bit-button)
 *
 * @cssprop --group-gap - Gap between buttons
 * @cssprop --group-radius - Border radius for edge buttons
 *
 * @example
 * ```html
 * <bit-button-group><bit-button>First</bit-button><bit-button>Second</bit-button></bit-button-group>
 * ```
 */
export const BUTTON_GROUP_TAG = define<BitButtonGroupProps>('bit-button-group', {
  props: {
    ...themableBundle,
    ...sizableBundle,
    attached: false,
    fullwidth: false,
    label: undefined,
    orientation: undefined,
    variant: undefined,
  } satisfies PropBundle<BitButtonGroupProps>,
  setup({ props }) {
    provide(BUTTON_GROUP_CTX, {
      color: props.color,
      size: props.size,
      variant: props.variant,
    });

    return html`
      <div class="button-group" part="group" role="group" :aria-label="${() => props.label ?? null}">
        <slot></slot>
      </div>
    `;
  },
  styles: [styles],
});
