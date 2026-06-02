import { createContext, define, html, prop, provide, type ReadonlySignal } from '@vielzeug/craft';

import { sizableBundle, themableBundle } from '../../shared';
import styles from './button-group.css?inline';

/** Button group properties */
export type BitButtonGroupProps = {
  /** Join buttons together into a single unit */
  attached?: boolean;
  /** Theme color tint for all child buttons */
  color?: string;
  /** Group children span full width */
  fullwidth?: boolean;
  /** Label for screen readers */
  label?: string;
  /** Layout direction */
  orientation?: 'horizontal' | 'vertical';
  /** Shared size for all child buttons */
  size?: string;
  /** Shared visual variant for all child buttons */
  variant?: string;
};

/** Shared context for button groups */
export type ButtonGroupContext = {
  color: ReadonlySignal<string | undefined>;
  size: ReadonlySignal<string | undefined>;
  variant: ReadonlySignal<string | undefined>;
};

export const BUTTON_GROUP_CTX = createContext<ButtonGroupContext | undefined>('BitButtonGroup');

/**
 * A container for grouping related buttons.
 * Child `bit-button` components automatically inherit the group's color, size, and variant.
 *
 * @element bit-button-group
 *
 * @attr {boolean} attached - Join buttons together into a unit
 * @attr {string} color - Shared color tint
 * @attr {boolean} fullwidth - Group spans full width
 * @attr {string} label - Accessible label
 * @attr {string} orientation - 'horizontal' | 'vertical'
 * @attr {string} size - Shared size
 * @attr {string} variant - Shared visual variant
 *
 * @slot - Place bit-button elements here
 *
 * @cssprop --button-border-start - Button styling token.
 * @cssprop --button-border-top - Button styling token.
 * @cssprop --button-radius - Button styling token.
 * @cssprop --group-gap - Group layout/styling token.
 * @cssprop --group-radius - Group layout/styling token.
 * @cssprop --rounded-lg - Border radius token.
 * @cssprop --size-2 - Spacing/sizing token.
 * @part group - Group container.
 * @example
 * ```html
 * <bit-button-group><bit-button>First</bit-button><bit-button>Second</bit-button></bit-button-group>
 * ```
 */
export const BUTTON_GROUP_TAG = 'bit-button-group' as const;
define<BitButtonGroupProps>(BUTTON_GROUP_TAG, {
  props: {
    ...themableBundle,
    ...sizableBundle,
    attached: prop.bool(false),
    fullwidth: prop.bool(false),
    label: prop.string(),
    orientation: prop.string<'horizontal' | 'vertical'>(),
    variant: prop.string(),
  },
  setup(props) {
    provide(BUTTON_GROUP_CTX, {
      color: props.color!,
      size: props.size!,
      variant: props.variant!,
    });

    return html`
      <div class="button-group" part="group" role="group" :aria-label="${props.label}">
        <slot></slot>
      </div>
    `;
  },
  styles: [styles],
});
