import { createContext, define, html, prop, provide, type ReadonlySignal } from '@vielzeug/craft';

import type { ComponentSize, ThemeColor } from '../../shared';
import type { ButtonVariant } from '../button/button';

import { sizableBundle, themableBundle } from '../../shared';
import styles from './button-group.css?inline';

/** Button group properties */
export type SgButtonGroupProps = {
  /** Join buttons together into a single unit */
  attached?: boolean;
  /** Theme color tint for all child buttons */
  color?: ThemeColor;
  /** Group children span full width */
  fullwidth?: boolean;
  /** Label for screen readers */
  label?: string;
  /** Layout direction */
  orientation?: 'horizontal' | 'vertical';
  /** Shared size for all child buttons */
  size?: ComponentSize;
  /** Shared visual variant for all child buttons */
  variant?: ButtonVariant;
};

/** Shared context propagated from sg-button-group to child sg-button elements */
export type ButtonGroupContext = {
  color: ReadonlySignal<ThemeColor | undefined>;
  size: ReadonlySignal<ComponentSize | undefined>;
  variant: ReadonlySignal<ButtonVariant | undefined>;
};

export const BUTTON_GROUP_CTX = createContext<ButtonGroupContext | undefined>('SgButtonGroup');

/**
 * A container for grouping related buttons.
 * Child `sg-button` components automatically inherit the group's color, size, and variant.
 *
 * @element sg-button-group
 *
 * @attr {boolean} attached - Join buttons together into a unit
 * @attr {string} color - Shared color tint: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {boolean} fullwidth - Group spans full width
 * @attr {string} label - Accessible label
 * @attr {string} orientation - 'horizontal' | 'vertical'
 * @attr {string} size - Shared size: 'sm' | 'md' | 'lg'
 * @attr {string} variant - Shared visual variant: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'frost' | 'glass'
 *
 * @slot - Place sg-button elements here
 *
 * @cssprop --group-gap - Gap between buttons (non-attached mode)
 * @cssprop --group-radius - Border radius of the group container
 * @cssprop --button-radius - Passed through to child buttons to control corner radius
 * @cssprop --button-border-start - Passed through to suppress start borders in attached mode
 * @cssprop --button-border-top - Passed through to suppress top borders in vertical attached mode
 * @part group - Group container.
 * @example
 * ```html
 * <sg-button-group attached>
 *   <sg-button variant="solid" color="primary">Save</sg-button>
 *   <sg-button variant="solid" color="primary">Save &amp; Continue</sg-button>
 * </sg-button-group>
 * <sg-button-group orientation="vertical" size="sm">
 *   <sg-button>Top</sg-button>
 *   <sg-button>Middle</sg-button>
 *   <sg-button>Bottom</sg-button>
 * </sg-button-group>
 * ```
 */
export const BUTTON_GROUP_TAG = 'sg-button-group' as const;
define<SgButtonGroupProps>(BUTTON_GROUP_TAG, {
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
