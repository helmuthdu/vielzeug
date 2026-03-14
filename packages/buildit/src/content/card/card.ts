import {
  aria,
  css,
  define,
  defineEmits,
  defineProps,
  handle,
  html,
  onMount,
  onSlotChange,
  ref,
  signal,
  watch,
} from '@vielzeug/craftit';
import { frostVariantMixin, reducedMotionMixin, surfaceMixins } from '../../styles';
import type { AddEventListeners, BitCardEvents, ElevationLevel, PaddingSize, ThemeColor } from '../../types';

const INTERACTIVE_DESCENDANT_SELECTOR =
  'button, a[href], input, select, textarea, summary, [role="button"], [role="link"], [contenteditable=""], [contenteditable="true"]';

function slotHasMeaningfulContent(slot: HTMLSlotElement | null | undefined): boolean {
  if (!slot) return false;
  return slot.assignedNodes({ flatten: true }).some((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) return true;
    if (node.nodeType === Node.TEXT_NODE) return !!node.textContent?.trim();
    return false;
  });
}

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

const componentStyles = /* css */ css`
  @layer buildit.base {
    :host {
      --_bg: var(--card-bg, var(--color-canvas));
      --_color: var(--card-color, var(--color-contrast-900));
      --_border: var(--card-border, var(--border));
      --_border-color: var(--card-border-color, var(--color-contrast-300));
      --_radius: var(--card-radius, var(--rounded-md));
      --_padding: var(--card-padding, var(--size-4));
      --_shadow: var(--card-shadow, var(--shadow-sm));
      --_hover-shadow: var(--card-hover-shadow, var(--shadow-md));

      display: block;
      position: relative;
    }

    .card {
      display: flex;
      flex-direction: column;
      background: var(--_bg);
      color: var(--_color);
      border-radius: var(--_radius);
      overflow: hidden;
      position: relative;
      transition: var(--_motion-transition,
        backdrop-filter var(--transition-slow),
        box-shadow var(--transition-normal),
        transform var(--transition-normal),
        background var(--transition-normal),
        border-color var(--transition-normal),
        opacity var(--transition-normal));
    }

    /* ── Card Structure ───────────────────────── */

    .card-media {
      overflow: hidden;
      flex-shrink: 0;
    }

    .card-media img {
      width: 100%;
      height: auto;
      object-fit: cover;
      display: block;
    }

    .card-body {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }

    .card-header,
    .card-content,
    .card-footer {
      padding: var(--_padding);
    }

    .card-header {
      padding-bottom: calc(var(--_padding) / 2);
    }

    .card-footer {
      padding-top: calc(var(--_padding) / 2);
    }

    .card-content {
      flex: 1;
    }

    .card-actions {
      display: flex;
      gap: var(--size-2);
      padding: var(--_padding);
      padding-top: calc(var(--_padding) / 2);
      align-items: center;
      flex-wrap: wrap;
    }

    [hidden] {
      display: none;
    }
  }

  @layer buildit.variants {
    /* Default (no variant) */
    :host(:not([variant]):not([color])) .card {
      box-shadow: var(--_shadow);
      border: var(--_border) solid var(--_border-color);
    }

    :host(:not([variant])[color]) .card {
      background: var(--_theme-backdrop);
      border: var(--_border) solid var(--_theme-border);
    }

    :host(:not([variant])[color]:hover) .card {
      background: color-mix(in srgb, var(--_theme-base) 16%, var(--color-contrast-50));
      border-color: var(--_theme-focus);
    }

    /* Solid */
    :host([variant='solid']) .card {
      background: var(--_theme-base);
      color: var(--_theme-contrast);
      border: var(--_border) solid var(--_theme-base);
      box-shadow: var(--_shadow);
    }

    /* Flat */
    :host([variant='flat']) .card {
      background: var(--_theme-backdrop);
      border: var(--_border) solid color-mix(in srgb, var(--_theme-border) 50%, transparent);
    }

    /* Glass */
    :host([variant='glass']) .card {
      backdrop-filter: blur(var(--blur-lg)) saturate(180%) brightness(1.05);
      -webkit-backdrop-filter: blur(var(--blur-lg)) saturate(180%) brightness(1.05);
      box-shadow: var(--shadow-md), var(--inset-shadow-xs);
      border: var(--_border) solid var(--_border-color);
      text-shadow: var(--text-shadow-xs);
    }

    :host([variant='glass']:hover) .card {
      backdrop-filter: blur(var(--blur-xl)) saturate(200%) brightness(1.1);
      -webkit-backdrop-filter: blur(var(--blur-xl)) saturate(200%) brightness(1.1);
      box-shadow: var(--shadow-xl), var(--inset-shadow-sm);
    }

    :host([variant='glass'][interactive]:hover) .card {
      box-shadow: var(--shadow-2xl), var(--inset-shadow-sm);
    }
  }

  @layer buildit.overrides {
    /* ── Loading bar ──────────────────────────── */

    /* Bar lives inside .card which already has overflow:hidden,
       so translateX can sweep freely without any overflow. */
    .loading-bar {
      display: none;
      position: absolute;
      top: 0;
      inset-inline-start: 0;
      width: 65%;
      height: 3px;
      background: linear-gradient(
        90deg,
        transparent 0%,
        var(--_theme-base, var(--color-primary)) 50%,
        transparent 100%
      );
    }

    :host([loading]) .loading-bar {
      display: block;
      animation: var(--_motion-animation, loading-bar 1.4s ease-in-out infinite);
    }

    /* In RTL the loading bar sweeps right-to-left */
    :host(:dir(rtl)[loading]) .loading-bar {
      animation-direction: reverse;
    }

    /* ── Disabled ─────────────────────────────── */

    :host([disabled]) {
      pointer-events: none;
      opacity: 0.6;
    }

    :host([disabled][interactive]) .card {
      cursor: not-allowed;
    }

    /* ── Interactive hover/active ─────────────── */

    :host([interactive]:not([disabled]):hover) .card {
      box-shadow: var(--_hover-shadow);
      transform: translateY(calc(-1 * var(--size-1))) scale(1.01);
      will-change: box-shadow, transform;
    }

    :host([interactive]) .card {
      cursor: pointer;
    }

    :host([interactive]:not([disabled]):active) .card {
      transform: translateY(0) scale(0.99);
      box-shadow: var(--_shadow);
      transition: var(--_motion-transition,
        box-shadow var(--transition-fast),
        transform var(--transition-fast));
    }

    :host([interactive]:focus-visible) .card {
      outline: var(--border-2) solid var(--_theme-focus, var(--color-primary));
      outline-offset: var(--border-2);
    }

    /* ── Horizontal orientation ───────────────── */

    :host([orientation='horizontal']) .card {
      flex-direction: row;
    }

    :host([orientation='horizontal']) .card-media {
      width: 30%;
      min-width: 192px;
      max-width: 320px;
    }

    :host([orientation='horizontal']) .card-media img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    :host([orientation='horizontal']) .card-body {
      flex: 1;
    }
  }

  @keyframes loading-bar {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(200%); }
  }
`;

/** Card component properties */
export interface CardProps {
  /** Visual style variant */
  variant?: 'solid' | 'flat' | 'glass' | 'frost';
  /** Theme color */
  color?: ThemeColor;
  /** Internal padding size */
  padding?: PaddingSize;
  /** Shadow elevation level (0-5) */
  elevation?: `${ElevationLevel}`;
  /** Card orientation */
  orientation?: 'horizontal';
  /** Make the card interactive (role=button, keyboard nav, emits activate) */
  interactive?: boolean;
  /** Disable interaction */
  disabled?: boolean;
  /** Show a loading progress bar */
  loading?: boolean;
}

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
export const TAG = define('bit-card', ({ host }) => {
  const props = defineProps<CardProps>({
    color: { default: undefined },
    disabled: { default: false, type: Boolean },
    elevation: { default: undefined },
    interactive: { default: false, type: Boolean },
    loading: { default: false, type: Boolean },
    orientation: { default: undefined },
    padding: { default: undefined },
    variant: { default: undefined },
  });

  const mediaSlot = ref<HTMLSlotElement>();
  const headerSlot = ref<HTMLSlotElement>();
  const contentSlot = ref<HTMLSlotElement>();
  const footerSlot = ref<HTMLSlotElement>();
  const actionsSlot = ref<HTMLSlotElement>();

  const hasMedia = signal(false);
  const hasHeader = signal(false);
  const hasContent = signal(false);
  const hasFooter = signal(false);
  const hasActions = signal(false);

  const emit = defineEmits<{
    activate: {
      originalEvent: MouseEvent | KeyboardEvent;
      trigger: 'pointer' | 'keyboard';
    };
  }>();

  function updateSlotState() {
    hasMedia.value = slotHasMeaningfulContent(mediaSlot.value);
    hasHeader.value = slotHasMeaningfulContent(headerSlot.value);
    hasContent.value = slotHasMeaningfulContent(contentSlot.value);
    hasFooter.value = slotHasMeaningfulContent(footerSlot.value);
    hasActions.value = slotHasMeaningfulContent(actionsSlot.value);
  }

  onMount(() => {
    onSlotChange('media', updateSlotState);
    onSlotChange('header', updateSlotState);
    onSlotChange('default', updateSlotState);
    onSlotChange('footer', updateSlotState);
    onSlotChange('actions', updateSlotState);
  });

  watch(
    [props.interactive, props.disabled, props.loading, props.variant, props.color, props.padding, props.orientation],
    () => {
      if (props.interactive.value) {
        host.setAttribute('role', 'button');
        host.setAttribute('tabindex', props.disabled.value ? '-1' : '0');
        aria({ disabled: () => props.disabled.value });
      } else {
        host.removeAttribute('role');
        host.removeAttribute('tabindex');
        aria({ disabled: () => null });
      }

      host.setAttribute('aria-busy', props.loading.value ? 'true' : 'false');
    },
    { immediate: true },
  );

  const handleClick = (e: MouseEvent) => {
    if (!props.interactive.value || props.disabled.value) return;
    if (isNestedInteractiveTarget(host, e)) return;
    emit('activate', { originalEvent: e, trigger: 'pointer' });
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (!props.interactive.value || props.disabled.value) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      emit('activate', { originalEvent: e, trigger: 'keyboard' });
    }
  };

  handle(host, 'click', handleClick);
  handle(host, 'keydown', handleKeydown);

  return {
    styles: [...surfaceMixins, frostVariantMixin('.card'), reducedMotionMixin, componentStyles],
    template: html`
      <div class="card" part="card">
        <div class="loading-bar" part="loading-bar"></div>
        <div class="card-media" part="media" ?hidden="${() => !hasMedia.value}">
          <slot ref=${mediaSlot} name="media"></slot>
        </div>
        <div class="card-body" part="body">
          <div class="card-header" part="header" ?hidden="${() => !hasHeader.value}">
            <slot ref=${headerSlot} name="header"></slot>
          </div>
          <div class="card-content" part="content" ?hidden="${() => !hasContent.value}">
            <slot ref=${contentSlot}></slot>
          </div>
          <div class="card-footer" part="footer" ?hidden="${() => !hasFooter.value}">
            <slot ref=${footerSlot} name="footer"></slot>
          </div>
          <div class="card-actions" part="actions" ?hidden="${() => !hasActions.value}">
            <slot ref=${actionsSlot} name="actions"></slot>
          </div>
        </div>
      </div>
    `,
  };
});

declare global {
  interface HTMLElementTagNameMap {
    'bit-card': HTMLElement & CardProps & AddEventListeners<BitCardEvents>;
  }
}
