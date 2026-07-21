import { createContext, define, html, prop, provide } from '@vielzeug/ore';
import { type Readable } from '@vielzeug/ripple';

import type { ComponentSize, ThemeColor } from '../../shared';
import type { ButtonVariant } from '../button/button';

import { sizableBundle, themableBundle } from '../../shared';
import componentStyles from './button-group.css?inline';

/** Button group properties */
export type OreButtonGroupProps = {
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

/** Shared context propagated from ore-button-group to child ore-button elements */
export type ButtonGroupContext = {
  color: Readable<ThemeColor | undefined>;
  size: Readable<ComponentSize | undefined>;
  variant: Readable<ButtonVariant | undefined>;
};

export const BUTTON_GROUP_CTX = createContext<ButtonGroupContext | undefined>('OreButtonGroup');

/**
 * A container for grouping related buttons.
 * Child `ore-button` components automatically inherit the group's color, size, and variant.
 *
 * @element ore-button-group
 *
 * @attr {boolean} attached - Join buttons together into a unit
 * @attr {string} color - Shared color tint: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {boolean} fullwidth - Group spans full width
 * @attr {string} label - Accessible label
 * @attr {string} orientation - 'horizontal' | 'vertical'
 * @attr {string} size - Shared size: 'sm' | 'md' | 'lg'
 * @attr {string} variant - Shared visual variant: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'frost'
 *
 * @slot - Place ore-button elements here
 *
 * @cssprop --group-gap - Gap between buttons (non-attached mode)
 * @cssprop --group-radius - Border radius of the group container
 * @cssprop --button-radius - Passed through to child buttons to control corner radius
 * @cssprop --button-border-start - Passed through to suppress start borders in attached mode
 * @cssprop --button-border-top - Passed through to suppress top borders in vertical attached mode
 * @part group - Group container.
 * @example
 * ```html
 * <ore-button-group attached>
 *   <ore-button variant="solid" color="primary">Save</ore-button>
 *   <ore-button variant="solid" color="primary">Save &amp; Continue</ore-button>
 * </ore-button-group>
 * <ore-button-group orientation="vertical" size="sm">
 *   <ore-button>Top</ore-button>
 *   <ore-button>Middle</ore-button>
 *   <ore-button>Bottom</ore-button>
 * </ore-button-group>
 * ```
 */
export const BUTTON_GROUP_TAG = 'ore-button-group' as const;
define<OreButtonGroupProps>(BUTTON_GROUP_TAG, {
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
  styles: [componentStyles],
});
