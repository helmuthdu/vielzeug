import { define, effect, html } from '@vielzeug/craftit';
import { createPressControl } from '@vielzeug/craftit/controls';

import type { ElevationLevel, PaddingSize, ThemeColor } from '../../types';

import { disablableBundle, loadableBundle, type PropBundle, themableBundle } from '../../inputs/shared/bundles';
import { frostVariantMixin, reducedMotionMixin, surfaceMixins } from '../../styles';
import componentStyles from './card.css?inline';

const INTERACTIVE_DESCENDANT_SELECTOR =
  'button, a[href], input, select, textarea, summary, [role="button"], [role="link"], [contenteditable=""], [contenteditable="true"]';

function isNestedInteractiveTarget(host: HTMLElement, event: Event): boolean {
  for (const node of event.composedPath()) {
    if (!(node instanceof HTMLElement)) continue;

    if (node === host) return false;

    if (node.matches(INTERACTIVE_DESCENDANT_SELECTOR) || !!node.closest(INTERACTIVE_DESCENDANT_SELECTOR)) {
      return true;
    }
  }

  return false;
}

/** Card component properties */

export type BitCardEvents = {
  activate: { originalEvent: MouseEvent | KeyboardEvent; trigger: 'pointer' | 'keyboard' };
};

export type BitCardProps = {
  /** Theme color */
  color?: ThemeColor;
  /** Disable interaction */
  disabled?: boolean;
  /** Shadow elevation level (0-5) */
  elevation?: `${ElevationLevel}`;
  /** Make the card interactive (role=button, keyboard nav, emits activate) */
  interactive?: boolean;
  /** Show a loading progress bar */
  loading?: boolean;
  /** Card orientation */
  orientation?: 'horizontal';
  /** Internal padding size */
  padding?: PaddingSize;
  /** Visual style variant */
  variant?: 'solid' | 'flat' | 'glass' | 'frost';
};

/**
 * A versatile card container with semantic slots for media, header, body, footer, and actions.
 *
 * @element bit-card
 *
 * @attr {string} variant - Visual variant: 'solid' | 'flat' | 'glass' | 'frost'
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} padding - Internal padding: 'none' | 'sm' | 'md' | 'lg' | 'xl'
 * @attr {string} elevation - Shadow elevation: '0' | '1' | '2' | '3' | '4' | '5'
 * @attr {string} orientation - Card layout: 'horizontal'
 * @attr {boolean} interactive - Enable pointer/keyboard activation
 * @attr {boolean} disabled - Disable card interaction
 * @attr {boolean} loading - Show loading progress bar
 *
 * @fires activate - Emitted when an interactive card is activated
 *
 * @slot media - Media content displayed at top/left
 * @slot header - Card header (title, subtitle)
 * @slot - Main card content
 * @slot footer - Card footer content
 * @slot actions - Action buttons or links
 *
 * @cssprop --card-bg - Background color
 * @cssprop --card-color - Text color
 * @cssprop --card-border - Border width
 * @cssprop --card-border-color - Border color
 * @cssprop --card-radius - Border radius
 * @cssprop --card-padding - Internal padding
 * @cssprop --card-shadow - Box shadow
 * @cssprop --card-hover-shadow - Shadow on hover
 *
 * @example
 * ```html
 * <bit-card elevation="2"><h3 slot="header">Title</h3><p>Content</p></bit-card>
 * <bit-card interactive color="primary"><h3 slot="header">Click me</h3></bit-card>
 * <bit-card variant="frost" color="secondary">Frosted card</bit-card>
 * ```
 */
export const CARD_TAG = define<BitCardProps, BitCardEvents>('bit-card', {
  props: {
    ...themableBundle,
    ...disablableBundle,
    ...loadableBundle,
    elevation: undefined,
    interactive: false,
    orientation: undefined,
    padding: undefined,
    variant: undefined,
  } satisfies PropBundle<BitCardProps>,
  setup({ emit, host, props, slots }) {
    host.bind('attr', {
      ariaBusy: () => (props.loading.value ? 'true' : 'false'),
      ariaDisabled: () => (props.interactive.value ? String(props.disabled.value) : null),
      role: () => (props.interactive.value ? 'button' : null),
    });

    effect(() => {
      if (props.interactive.value) {
        host.el.setAttribute('tabindex', props.disabled.value ? '-1' : '0');
      } else {
        host.el.removeAttribute('tabindex');
      }
    });

    // ────────────────────────────────────────────────────────────────
    // Event Handlers
    // ────────────────────────────────────────────────────────────────

    const pressControl = createPressControl({
      disabled: () => !props.interactive.value || Boolean(props.disabled.value),
      onPress: (originalEvent, trigger) => {
        emit('activate', { originalEvent, trigger });
      },
    });

    const handleClick = (e: MouseEvent) => {
      if (!props.interactive.value || props.disabled.value) return;

      if (isNestedInteractiveTarget(host.el, e)) return;

      pressControl.handleClick(e);
    };

    const handleKeydown = (e: KeyboardEvent) => {
      pressControl.handleKeydown(e);
    };

    host.bind('on', {
      click: (e) => handleClick(e),
      keydown: (e) => handleKeydown(e),
    });

    // ────────────────────────────────────────────────────────────────
    // Template
    // ────────────────────────────────────────────────────────────────

    return html`
      <div class="card" part="card">
        <div class="loading-bar" part="loading-bar"></div>
        <div class="card-media" part="media" ?hidden="${() => !slots.has('media').value}">
          <slot name="media"></slot>
        </div>
        <div class="card-body" part="body">
          <div class="card-header" part="header" ?hidden="${() => !slots.has('header').value}">
            <slot name="header"></slot>
          </div>
          <div class="card-content" part="content" ?hidden="${() => !slots.has().value}">
            <slot></slot>
          </div>
          <div class="card-footer" part="footer" ?hidden="${() => !slots.has('footer').value}">
            <slot name="footer"></slot>
          </div>
          <div class="card-actions" part="actions" ?hidden="${() => !slots.has('actions').value}">
            <slot name="actions"></slot>
          </div>
        </div>
      </div>
    `;
  },
  styles: [...surfaceMixins, frostVariantMixin('.card'), reducedMotionMixin, componentStyles],
});
