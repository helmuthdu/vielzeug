import { css, define, defineEmits, defineProps, guard, html, onMount, onSlotChange, signal } from '@vielzeug/craftit';
import { forcedColorsMixin, formFieldMixins, sizeVariantMixin } from '../../styles';
import type { AddEventListeners, BitAlertEvents, ComponentSize, RoundedSize, ThemeColor } from '../../types';

const componentStyles = /* css */ css`
  @layer buildit.base {
    :host {
      --_bg: var(--alert-bg, var(--_theme-backdrop));
      --_color: var(--alert-color, var(--_theme-base));
      --_border-color: var(--alert-border-color, var(--_theme-border));
      --_radius: var(--alert-radius, var(--rounded-md));
      --_padding: var(--alert-padding, var(--size-4));
      --_gap: var(--alert-gap, var(--size-3));
      --_font-size: var(--alert-font-size, var(--text-sm));
      --_shadow: var(--alert-shadow, var(--shadow-none));

      display: block;
    }

    :host([dismissed]) {
      display: none;
    }

    :host([dismissing]) {
      animation: var(--_motion-animation, bit-alert-exit var(--transition-slow, 0.3s) ease forwards);
      pointer-events: none;
      overflow: hidden;
    }

    @keyframes bit-alert-exit {
      0% { opacity: 1; transform: scaleY(1); max-height: 200px; margin-bottom: var(--size-3); }
      60% { opacity: 0; transform: scaleY(0.8); }
      100% { opacity: 0; transform: scaleY(0); max-height: 0; margin-bottom: 0; padding-top: 0; padding-bottom: 0; }
    }

    .alert {
      display: grid;
      grid-template-columns: auto 1fr auto;
      row-gap: var(--size-1);
      padding: var(--_padding);
      background: var(--_bg);
      border: var(--border) solid var(--_border-color);
      border-radius: var(--_radius);
      box-shadow: var(--_shadow);
      font-size: var(--_font-size);
      line-height: var(--leading-normal);
      color: var(--_color);
      overflow: hidden;
      transition:
        background var(--transition-normal),
        border-color var(--transition-normal),
        box-shadow var(--transition-normal),
        color var(--transition-normal);
    }

    /* ── Icon ──────────────────────────────────────── */

    .icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      grid-column: 1;
      grid-row: 1;
      align-self: start;
      margin-inline-end: var(--_gap);
    }

    /* Without heading: icon aligns with the body content */
    .alert:has(.header[hidden]) .icon {
      align-self: center;
    }

    .icon[hidden] {
      display: none;
    }

    /* ── Header row (heading + meta) ───────────────── */

    .header {
      grid-column: 2;
      grid-row: 1;
      display: flex;
      align-items: baseline;
      gap: var(--size-2);
    }

    .header[hidden] {
      display: none;
    }

    .heading {
      font-weight: var(--font-semibold);
      line-height: var(--leading-normal);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .meta {
      font-size: var(--text-xs);
      opacity: 0.7;
      white-space: nowrap;
      margin-inline-start: auto;
    }

    :host(:not(:has([slot='meta']))) .meta {
      display: none;
    }

    /* ── Body ──────────────────────────────────────── */

    .body {
      grid-column: 1 / -1;
      grid-row: 2;
      min-width: 0;
      margin-top: var(--size-1);
    }

    /* Without heading: body moves up to share row with icon and close */
    .alert:has(.header[hidden]) .body {
      grid-column: 2;
      grid-row: 1;
      margin-top: 0;
    }

    /* ── Content ───────────────────────────────────── */

    .content {
      line-height: var(--leading-relaxed);
    }

    /* ── Actions ───────────────────────────────────── */

    .actions {
      grid-column: 1 / -1;
      grid-row: 3;
      display: flex;
      flex-wrap: wrap;
      gap: var(--size-2);
      margin-top: var(--size-2);
    }

    /* Without heading: actions move to row 2 */
    .alert:has(.header[hidden]) .actions {
      grid-row: 2;
    }

    .actions[hidden] {
      display: none;
    }

    /* Inline mode: 4-column grid — icon | body | actions | close */
    :host([inline]) .alert {
      grid-template-columns: auto 1fr auto auto;
    }

    :host([inline]) .body {
      grid-column: 2;
      grid-row: 1;
      margin-top: 0;
      align-self: center;
    }

    :host([inline]) .actions:not([hidden]) {
      grid-column: 3;
      grid-row: 1;
      margin-top: 0;
      flex-wrap: nowrap;
    }

    :host([inline]) .close {
      grid-column: 4;
      align-self: center;
    }

    /* ── Close button ──────────────────────────────── */

    .close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      grid-column: 3;
      grid-row: 1;
      align-self: start;
      margin-inline-start: var(--_gap);
      width: var(--size-5);
      height: var(--size-5);
      min-height: var(--_touch-target);
      min-width: var(--_touch-target);
      padding: 0;
      border: none;
      border-radius: var(--rounded-sm);
      background: transparent;
      color: inherit;
      cursor: pointer;
      opacity: 0.7;
      transition: var(--_motion-transition,
        opacity var(--transition-fast),
        background var(--transition-fast));
    }

    :host(:not([dismissible])) .close {
      display: none;
    }

    .close:hover {
      opacity: 1;
      background: color-mix(in srgb, currentColor 12%, transparent);
    }

    .close:focus-visible {
      outline: var(--border-2) solid currentColor;
      outline-offset: var(--border-2);
      opacity: 1;
    }

    /* Accented left border for flat and bordered variants */
    :host([variant='flat'][accented]) .alert,
    :host([variant='bordered'][accented]) .alert {
      border-inline-start-width: var(--border-4, 4px);
    }
  }

  @layer buildit.variants {
    :host(:not([variant])) .alert,
    :host([variant='flat']) .alert {
      background: var(--color-canvas);
      border-color: var(--_theme-base);
      color: var(--_theme-base);
      box-shadow: var(--shadow-none);
    }

    :host([variant='solid']) .alert {
      background: var(--_theme-base);
      border-color: var(--_theme-base);
      color: var(--_theme-contrast);
      box-shadow: var(--shadow-xs);
    }

    :host([variant='solid']) .close {
      color: var(--_theme-contrast);
    }

    :host([variant='bordered']) .alert {
      background: color-mix(in srgb, var(--_theme-backdrop), var(--color-canvas));
      border-color: color-mix(in srgb, var(--_theme-focus) 30%, transparent);
      color: var(--_theme-base);
      box-shadow: var(--inset-shadow-2xs);
    }
  }
`;

/** Alert component properties */
export interface AlertProps {
  /** Show a left accent border (for flat/bordered variants) */
  accented?: boolean;
  /** Theme color */
  color?: ThemeColor;
  /** Show a dismiss (×) button */
  dismissible?: boolean;
  /** Heading text shown above the content */
  heading?: string;
  /** Position action buttons inline instead of below */
  inline?: boolean;
  /** Border radius */
  rounded?: RoundedSize | '';
  /** Alert size */
  size?: ComponentSize;
  /** Visual style variant */
  variant?: 'solid' | 'flat' | 'bordered';
}

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
 * @attr {boolean} inline - Position action buttons to the right instead of below
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
export const TAG = define('bit-alert', ({ host }) => {
  const props = defineProps<AlertProps>({
    accented: { default: false },
    color: { default: undefined },
    dismissible: { default: false },
    heading: { default: '' },
    inline: { default: false },
    rounded: { default: undefined },
    size: { default: undefined },
    variant: { default: undefined },
  });

  const emit = defineEmits<{
    dismiss: { originalEvent: MouseEvent };
  }>();

  const handleDismiss = guard(
    () => props.dismissible.value,
    (e: MouseEvent) => {
      host.setAttribute('dismissing', '');

      let finished = false;
      let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

      const finalizeDismiss = () => {
        if (finished) return;
        finished = true;

        if (fallbackTimer) {
          clearTimeout(fallbackTimer);
          fallbackTimer = null;
        }

        host.removeEventListener('animationend', onEnd);
        host.removeAttribute('dismissing');
        host.setAttribute('dismissed', '');
        emit('dismiss', { originalEvent: e });
      };

      const onEnd = () => {
        finalizeDismiss();
      };

      host.addEventListener('animationend', onEnd);

      // Fallback for reduced-motion or overridden styles where animationend never fires.
      queueMicrotask(() => {
        const styles = getComputedStyle(host);
        const names = styles.animationName.split(',').map((v) => v.trim());
        const durations = styles.animationDuration
          .split(',')
          .map((v) => v.trim())
          .map((duration) => {
            if (duration.endsWith('ms')) return Number.parseFloat(duration);
            if (duration.endsWith('s')) return Number.parseFloat(duration) * 1000;
            return 0;
          });

        const hasAnimation = names.some((name) => name && name !== 'none');
        const maxDuration = Math.max(0, ...durations);

        if (!hasAnimation || maxDuration <= 0) {
          finalizeDismiss();
          return;
        }

        fallbackTimer = setTimeout(() => {
          finalizeDismiss();
        }, maxDuration + 50);
      });
    },
  );

  const hasIcon = signal(false);
  const hasActions = signal(false);

  onMount(() => {
    onSlotChange('icon', (els) => {
      hasIcon.value = els.length > 0;
    });
    onSlotChange('actions', (els) => {
      hasActions.value = els.length > 0;
    });
  });

  return {
    styles: [
      ...formFieldMixins,
      forcedColorsMixin,
      sizeVariantMixin({
        lg: { '--_padding': 'var(--size-4) var(--size-5)', fontSize: 'var(--text-base)', gap: 'var(--size-3-5)' },
        sm: { '--_padding': 'var(--size-2) var(--size-3)', fontSize: 'var(--text-xs)', gap: 'var(--size-2)' },
      }),
      componentStyles,
    ],
    template: html`
      <div
        class="alert"
        role="alert"
        part="alert"
        aria-live=${() => (props.color.value === 'error' ? 'assertive' : 'polite')}
      >
        <span class="icon" part="icon" aria-hidden="true" ?hidden=${() => !hasIcon.value}>
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
        <div class="actions" part="actions" ?hidden=${() => !hasActions.value}>
          <slot name="actions"></slot>
        </div>
        <button
          class="close"
          part="close"
          type="button"
          aria-label="Dismiss alert"
          @click=${handleDismiss}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    `,
  };
});

declare global {
  interface HTMLElementTagNameMap {
    'bit-alert': HTMLElement & AlertProps & AddEventListeners<BitAlertEvents>;
  }
}
