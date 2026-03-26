import { define, html } from '@vielzeug/craftit';

import type { ComponentSize, RoundedSize, ThemeColor } from '../../types';

import '../../content/icon/icon';
import { type PropBundle, roundableBundle, sizableBundle, themableBundle } from '../../inputs/shared/bundles';
import { forcedColorsMixin, formFieldMixins, sizeVariantMixin } from '../../styles';
import { awaitExit } from '../../utils/animation';
import componentStyles from './alert.css?inline';

export type BitAlertEvents = {
  dismiss: { originalEvent: MouseEvent };
};

export type BitAlertProps = {
  /** Show a left accent border (for flat/bordered variants) */
  accented?: boolean;
  /** Theme color */
  color?: ThemeColor;
  /** Show a dismissible (×) button */
  dismissible?: boolean;
  /** Heading text shown above the content */
  heading?: string;
  /** Position action buttons to the right instead of below */
  horizontal?: boolean;
  /** Border radius */
  rounded?: RoundedSize | '';
  /** Alert size */
  size?: ComponentSize;
  /** Visual style variant */
  variant?: 'solid' | 'flat' | 'bordered';
};

/**
 * A status/feedback banner with optional heading, icon slot, and dismiss button.
 *
 * @element bit-alert
 *
 * @attr {string} color - Theme color (primary/success/warning/error…)
 * @attr {string} variant - Visual style: 'flat' | 'solid' | 'bordered'
 * @attr {string} size - Size: 'sm' | 'md' | 'lg'
 * @attr {string} rounded - Border radius size
 * @attr {string} heading - Bold heading text above the content
 * @attr {boolean} dismissible - Show a close (×) button
 * @attr {boolean} accented - Add a left accent border (flat/bordered only)
 * @attr {boolean} horizontal - Position action buttons to the right instead of below
 *
 * @fires dismiss - Fired when the alert is dismissed
 *
 * @slot - Default slot for the alert message content
 * @slot icon - Icon on the left side
 * @slot meta - Metadata displayed alongside the heading (lighter, right-aligned)
 * @slot actions - Action buttons shown below the message
 *
 * @cssprop --alert-bg - Background color
 * @cssprop --alert-color - Text/icon color
 * @cssprop --alert-border-color - Border color
 * @cssprop --alert-radius - Border radius
 * @cssprop --alert-padding - Padding
 * @cssprop --alert-gap - Gap between icon, body, and close button
 * @cssprop --alert-font-size - Font size
 *
 * @example
 * ```html
 * <bit-alert color="success">Your changes have been saved.</bit-alert>
 * <bit-alert color="error" variant="solid" dismissible heading="Something went wrong">
 *   Please try again later.
 * </bit-alert>
 * ```
 */
export const ALERT_TAG = define<BitAlertProps, BitAlertEvents>('bit-alert', {
  props: {
    ...themableBundle,
    ...sizableBundle,
    ...roundableBundle,
    accented: false,
    dismissible: false,
    heading: '',
    horizontal: false,
    variant: undefined,
  } satisfies PropBundle<BitAlertProps>,
  setup({ emit, host, props, slots }) {
    const handleDismiss = (e: MouseEvent) => {
      if (!props.dismissible.value) return;

      host.el.setAttribute('dismissing', '');
      awaitExit(host.el, () => {
        host.el.removeAttribute('dismissing');
        host.el.setAttribute('dismissed', '');
        emit('dismiss', { originalEvent: e });
      });
    };

    return html`
      <div class="alert" :role="${() => (props.color.value === 'error' ? 'alert' : 'status')}" part="alert">
        <span class="icon" part="icon" aria-hidden="true" ?hidden=${() => !slots.has('icon').value}>
          <slot name="icon"></slot>
        </span>
        <div class="header" part="header" ?hidden=${() => !props.heading.value}>
          <span class="heading" part="heading">${() => props.heading.value}</span>
          <span class="meta" part="meta">
            <slot name="meta"></slot>
          </span>
        </div>
        <div class="body" part="body">
          <div class="content" part="content">
            <slot></slot>
          </div>
        </div>
        <div class="actions" part="actions" ?hidden=${() => !slots.has('actions').value}>
          <slot name="actions"></slot>
        </div>
        <button
          class="close"
          part="close"
          type="button"
          aria-label="Dismiss alert"
          ?hidden=${() => !props.dismissible.value}
          @click=${handleDismiss}>
          <bit-icon name="x" size="16" stroke-width="2.5" aria-hidden="true"></bit-icon>
        </button>
      </div>
    `;
  },
  styles: [
    ...formFieldMixins,
    forcedColorsMixin,
    sizeVariantMixin({
      lg: { '--_padding': 'var(--size-4) var(--size-5)', fontSize: 'var(--text-base)', gap: 'var(--size-3-5)' },
      sm: { '--_padding': 'var(--size-2) var(--size-3)', fontSize: 'var(--text-xs)', gap: 'var(--size-2)' },
    }),
    componentStyles,
  ],
});
