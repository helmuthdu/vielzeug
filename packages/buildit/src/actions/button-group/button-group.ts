import { createContext, define, defineProps, html, provide } from '@vielzeug/craftit';

import type { ComponentSize, ThemeColor, VisualVariant } from '../../types';

/** Context provided by bit-button-group to its bit-button children. */
export type ButtonGroupContext = {
  color: import('@vielzeug/craftit').ReadonlySignal<ThemeColor | undefined>;
  size: import('@vielzeug/craftit').ReadonlySignal<ComponentSize | undefined>;
  variant: import('@vielzeug/craftit').ReadonlySignal<Exclude<VisualVariant, 'glass'> | undefined>;
};
/** Injection key for the button-group context. */
export const BUTTON_GROUP_CTX = createContext<ButtonGroupContext>();

import styles from './button-group.css?inline';

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
export const BUTTON_GROUP_TAG = define('bit-button-group', () => {
  const props = defineProps<BitButtonGroupProps>({
    attached: { default: false },
    color: { default: undefined },
    fullwidth: { default: false },
    label: { default: undefined },
    orientation: { default: undefined },
    size: { default: undefined },
    variant: { default: undefined },
  });

  provide(BUTTON_GROUP_CTX, {
    color: props.color,
    size: props.size,
    variant: props.variant,
  });

  return {
    styles: [styles],
    template: html`
      <div class="button-group" part="group" role="group" :aria-label="${() => props.label.value ?? null}">
        <slot></slot>
      </div>
    `,
  };
});
