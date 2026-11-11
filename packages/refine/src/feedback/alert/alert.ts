import { define, getHost, html, prop, useEmit, useSlots } from '@vielzeug/ore';
import { computed } from '@vielzeug/ripple';
import { warnMultiplePrimaryActions } from '../../_dev';
import { awaitExit } from '../../overlay/shared/await-exit';
import { roundableBundle, sizableBundle, themableBundle } from '../../shared';
import {
  colorThemeMixin,
  forcedColorsMixin,
  roundedVariantMixin,
  sizeVariantMixin,
  touchTargetMixin,
} from '../../styles';
import type { ComponentSize, RoundedSize, ThemeColor } from '../../types';

const ALERT_VARIANTS = ['solid', 'flat', 'bordered'] as const;

import componentStyles from './alert.css?inline';

export { ICON_TAG } from '../../content/icon/icon';
export type OreAlertEvents = {
  dismiss: { originalEvent: MouseEvent };
};

/**
 * Accessible strings for `ore-alert`, overridable through the `labels`
 * JS property (a `Partial<AlertLabels>` merged over the English defaults).
 * Same seam as `ore-pagination`'s `labels`: omit entries to keep the default.
 */
export type AlertLabels = {
  /** Accessible name of the close button. */
  dismiss: string;
  /** Live-region message announced after the alert is dismissed. */
  dismissed: string;
};

export const DEFAULT_ALERT_LABELS: AlertLabels = {
  dismiss: 'Dismiss alert',
  dismissed: 'Alert dismissed',
};

/**
 * Default glyph per theme color, mirroring `ore-toast`'s severity icons.
 * A colorless alert renders no automatic icon (host-driven surfaces such as
 * `ore-toast` tint through CSS and pass their own leading icon).
 */
const AUTO_ICON: Record<ThemeColor, string> = {
  error: 'circle-alert',
  info: 'info',
  primary: 'info',
  secondary: 'info',
  success: 'check',
  warning: 'triangle-alert',
};

export type OreAlertProps = {
  /** Show a left accent border (for flat/bordered variants) */
  accented?: boolean;
  /** Theme color */
  color?: ThemeColor;
  /** Show a dismissible (×) button */
  dismissible?: boolean;
  /**
   * Pin the alert to a viewport edge as a site banner: 'top' | 'bottom'.
   * Stays full-bleed by default; set `--alert-max-width` for a boxed card.
   */
  docked?: 'top' | 'bottom';
  /**
   * Render as a passive surface inside a host that owns lifecycle and
   * announcements (for example `ore-toast`): no live-region role, and the
   * close button only emits `dismiss` instead of hiding the alert.
   */
  embedded?: boolean;
  /** Heading text shown above the content */
  heading?: string;
  /**
   * Leading icon name. Overrides the glyph derived from `color`;
   * `"none"` renders no icon at all. The `icon` slot always wins.
   */
  icon?: string;
  /** Position action buttons to the right instead of below */
  horizontal?: boolean;
  /** Localized accessible strings (JS property only). */
  labels?: Partial<AlertLabels>;
  /** Single-line density: tighter padding and icon, text, and actions on one wrapping row. */
  slim?: boolean;
  /** Border radius */
  rounded?: RoundedSize | '';
  /** Alert size */
  size?: ComponentSize;
  /** Visual style variant */
  variant?: (typeof ALERT_VARIANTS)[number];
};

/**
 * A status/feedback banner with optional heading, icon slot, and dismiss button.
 * With `docked` it becomes a slim site banner pinned to a viewport edge, and
 * `slim` packs icon, text, and actions onto one wrapping row.
 *
 * @element ore-alert
 *
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} variant - Visual style: 'flat' | 'solid' | 'bordered'
 * @attr {string} size - Size: 'sm' | 'md' | 'lg'
 * @attr {string} rounded - Border radius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'
 * @attr {boolean} slim - Single-line density: tighter padding; icon, text, and actions share one wrapping row
 * @attr {string} docked - Pin to a viewport edge as a site banner: 'top' | 'bottom' (full-bleed; box it with --alert-max-width)
 * @attr {string} heading - Bold heading text above the content
 * @attr {string} icon - Leading icon name; overrides the glyph derived from `color`, "none" disables it
 * @attr {boolean} dismissible - Show a close (×) button
 * @attr {boolean} embedded - Passive surface for a host that owns lifecycle and announcements; the close button only emits `dismiss`
 * @attr {boolean} accented - Add a left accent border (flat/bordered only)
 * @attr {boolean} horizontal - Position action buttons to the right instead of below
 *
 * @prop {Partial<AlertLabels>} [labels] - Localized accessible strings (`dismiss`, `dismissed`) merged over the English defaults (JS property only)
 *
 * @fires dismiss - Fired when the alert is dismissed (after the exit animation, or immediately when `embedded`). detail: { originalEvent: MouseEvent }
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
 * @cssprop --alert-icon-size - Size of the automatic leading icon (default --size-5)
 * @cssprop --alert-max-width - Content width for a boxed look (default full width)
 * @cssprop --alert-dock-inset - Distance from the viewport edges when docked (default --size-4, plus safe-area insets)
 * @cssprop --alert-dock-z-index - Stacking order when docked (default --z-fixed)
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
 * <ore-alert docked="bottom" slim color="primary" variant="solid" dismissible>
 *   New: dark mode is live.
 *   <ore-button slot="actions" variant="ghost" size="sm">Try it</ore-button>
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
    docked: prop.oneOf(['top', 'bottom'] as const),
    embedded: prop.bool(false),
    heading: prop.string(),
    horizontal: prop.bool(false),
    icon: prop.string(),
    labels: prop.data<Partial<AlertLabels>>(),
    slim: prop.bool(false),
    variant: prop.oneOf(ALERT_VARIANTS),
  },
  setup(props) {
    const el = getHost();
    const emit = useEmit<OreAlertEvents>();
    const slots = useSlots();

    const labels = computed<AlertLabels>(() => ({ ...DEFAULT_ALERT_LABELS, ...props.labels.value }));

    // Slot content always wins; `icon="none"` opts out; otherwise a set
    // color picks the glyph (colorless alerts stay bare for host-driven uses).
    const autoIcon = computed<string | undefined>(() => {
      if (slots.has('icon').value) return undefined;

      const explicit = props.icon.value;
      if (explicit === 'none') return undefined;
      if (explicit) return explicit;

      return props.color.value ? AUTO_ICON[props.color.value] : undefined;
    });

    let announceEl: HTMLElement | null = null;

    const checkActions = (e: Event) => {
      const slot = e.target as HTMLSlotElement;

      warnMultiplePrimaryActions(slot.assignedElements({ flatten: true }), 'ore-alert actions');
    };

    const announce = (message: string) => {
      if (!announceEl) return;

      announceEl.textContent = '';
      requestAnimationFrame(() => {
        if (announceEl) announceEl.textContent = message;
      });
    };

    const handleDismiss = (e: MouseEvent) => {
      if (!props.dismissible.value) return;

      if (props.embedded.value) {
        emit('dismiss', { originalEvent: e });

        return;
      }

      el.setAttribute('dismissing', '');
      awaitExit(el, () => {
        el.removeAttribute('dismissing');
        el.setAttribute('dismissed', '');
        announce(labels.value.dismissed);
        emit('dismiss', { originalEvent: e });
      });
    };

    const alertRole = () => {
      if (props.embedded.value) return 'presentation';

      return props.color.value === 'error' ? 'alert' : 'status';
    };

    return html`
      <span
        class="sr-announce"
        aria-live="polite"
        aria-atomic="true"
        ref="${(ref: HTMLElement) => {
          announceEl = ref;
        }}"></span>
      <div class="alert" role="${alertRole}" part="alert">
        <span
          class="icon"
          part="icon"
          aria-hidden="true"
          ?hidden="${() => !slots.has('icon').value && !autoIcon.value}">
          <slot name="icon"></slot>
          ${() =>
            !slots.has('icon').value && autoIcon.value
              ? html`<ore-icon class="auto-icon" name="${autoIcon.value}" aria-hidden="true"></ore-icon>`
              : null}
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
          <slot name="actions" @slotchange="${checkActions}"></slot>
        </div>
        <button
          class="close"
          part="close"
          type="button"
          aria-label="${() => labels.value.dismiss}"
          ?hidden="${() => !props.dismissible.value}"
          @click="${handleDismiss}">
          <ore-icon name="x" size="16" stroke-width="2.5" aria-hidden="true"></ore-icon>
        </button>
      </div>
    `;
  },
  styles: [
    colorThemeMixin,
    touchTargetMixin,
    roundedVariantMixin,
    forcedColorsMixin,
    sizeVariantMixin({
      lg: { '--_padding': 'var(--size-4) var(--size-5)', fontSize: 'var(--text-base)', gap: 'var(--size-3-5)' },
      sm: { '--_padding': 'var(--size-2) var(--size-3)', fontSize: 'var(--text-xs)', gap: 'var(--size-2)' },
    }),
    componentStyles,
  ],
});
