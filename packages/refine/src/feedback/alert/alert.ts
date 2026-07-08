import { define, html, prop, getHost, useEmit, useSlots } from '@vielzeug/ore';

import type { ComponentSize, RoundedSize, ThemeColor } from '../../types';

import '../../content/icon/icon';
import { awaitExit } from '../../overlay/shared/await-exit';
import { roundableBundle, sizableBundle, themableBundle } from '../../shared';
import {
  coarsePointerMixin,
  colorThemeMixin,
  forcedColorsMixin,
  reducedMotionMixin,
  roundedVariantMixin,
  sizeVariantMixin,
} from '../../styles';
import componentStyles from './alert.css?inline';

export type OreAlertEvents = {
  dismiss: { originalEvent: MouseEvent };
};

export type OreAlertProps = {
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
 * @element ore-alert
 *
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} variant - Visual style: 'flat' | 'solid' | 'bordered'
 * @attr {string} size - Size: 'sm' | 'md' | 'lg'
 * @attr {string} rounded - Border radius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'
 * @attr {string} heading - Bold heading text above the content
 * @attr {boolean} dismissible - Show a close (×) button
 * @attr {boolean} accented - Add a left accent border (flat/bordered only)
 * @attr {boolean} horizontal - Position action buttons to the right instead of below
 *
 * @fires dismiss - Fired when the alert is dismissed. detail: { originalEvent: MouseEvent }
 *
 * @slot - Default slot for the alert message content
 * @slot icon - Icon on the left side
 * @slot meta - Metadata displayed alongside the heading (lighter, right-aligned)
 * @slot actions - Action buttons shown below the message
 *
 * @cssprop --alert-bg - Background color
 * @cssprop --alert-color - Text/icon color
 * @cssprop --alert-border-color - Border color
 * @cssprop --alert-shadow - Box shadow
 * @cssprop --alert-radius - Border radius
 * @cssprop --alert-padding - Padding
 * @cssprop --alert-gap - Gap between icon, body, and close button
 * @cssprop --alert-font-size - Font size
 *
 * @part alert - Alert root container.
 * @part icon - Icon container.
 * @part header - Header container.
 * @part heading - Heading text element.
 * @part meta - Meta text container.
 * @part body - Body content container.
 * @part content - Content container.
 * @part actions - Actions slot container.
 * @part close - Close action control.
 * @example
 * ```html
 * <ore-alert color="success">Your changes have been saved.</ore-alert>
 * <ore-alert color="error" variant="solid" dismissible heading="Something went wrong">
 *   Please try again later.
 * </ore-alert>
 * ```
 */
export const ALERT_TAG = 'ore-alert' as const;
define<OreAlertProps>(ALERT_TAG, {
  props: {
    ...themableBundle,
    ...sizableBundle,
    ...roundableBundle,
    accented: prop.bool(false),
    dismissible: prop.bool(false),
    heading: prop.string(),
    horizontal: prop.bool(false),
    variant: prop.string<'solid' | 'flat' | 'bordered'>(),
  },
  setup(props) {
    const el = getHost();
    const emit = useEmit<OreAlertEvents>();
    const slots = useSlots();

    let announceEl: HTMLElement | null = null;

    const announce = (message: string) => {
      if (!announceEl) return;

      announceEl.textContent = '';
      requestAnimationFrame(() => {
        if (announceEl) announceEl.textContent = message;
      });
    };

    const handleDismiss = (e: MouseEvent) => {
      if (!props.dismissible.value) return;

      el.setAttribute('dismissing', '');
      awaitExit(el, () => {
        el.removeAttribute('dismissing');
        el.setAttribute('dismissed', '');
        announce('Alert dismissed');
        emit('dismiss', { originalEvent: e });
      });
    };

    const alertRole = () => (props.color.value === 'error' ? 'alert' : 'status');

    return html`
      <span
        class="sr-announce"
        aria-live="polite"
        aria-atomic="true"
        ref="${(ref: HTMLElement) => {
          announceEl = ref;
        }}"></span>
      <div class="alert" :role="${alertRole}" part="alert">
        <span class="icon" part="icon" aria-hidden="true" ?hidden="${() => !slots.has('icon').value}">
          <slot name="icon"></slot>
        </span>
        <div class="header" part="header" ?hidden="${() => !props.heading.value}">
          <span class="heading" part="heading">${props.heading}</span>
          <span class="meta" part="meta">
            <slot name="meta"></slot>
          </span>
        </div>
        <div class="body" part="body">
          <div class="content" part="content">
            <slot></slot>
          </div>
        </div>
        <div class="actions" part="actions" ?hidden="${() => !slots.has('actions').value}">
          <slot name="actions"></slot>
        </div>
        <button
          class="close"
          part="close"
          type="button"
          aria-label="Dismiss alert"
          ?hidden="${() => !props.dismissible.value}"
          @click="${handleDismiss}">
          <ore-icon name="x" size="16" stroke-width="2.5" aria-hidden="true"></ore-icon>
        </button>
      </div>
    `;
  },
  styles: [
    colorThemeMixin,
    coarsePointerMixin,
    reducedMotionMixin,
    roundedVariantMixin,
    forcedColorsMixin,
    sizeVariantMixin({
      lg: { '--_padding': 'var(--size-4) var(--size-5)', fontSize: 'var(--text-base)', gap: 'var(--size-3-5)' },
      sm: { '--_padding': 'var(--size-2) var(--size-3)', fontSize: 'var(--text-xs)', gap: 'var(--size-2)' },
    }),
    componentStyles,
  ],
});
