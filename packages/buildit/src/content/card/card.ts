import {
  define,
  handle,
  html,
  onMount,
  onSlotChange,
  ref,
  signal,
  watch,
  defineProps,
  defineEmits,
} from '@vielzeug/craftit';

import type { ElevationLevel, PaddingSize, ThemeColor } from '../../types';

import { frostVariantMixin, reducedMotionMixin, surfaceMixins } from '../../styles';

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

import componentStyles from './card.css?inline';

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
export const CARD_TAG = define(
  'bit-card',
  ({ host }) => {
    const props = defineProps<BitCardProps>({
      color: { default: undefined },
      disabled: { default: false, type: Boolean },
      elevation: { default: undefined },
      interactive: { default: false, type: Boolean },
      loading: { default: false, type: Boolean },
      orientation: { default: undefined },
      padding: { default: undefined },
      variant: { default: undefined },
    });
    const emit = defineEmits<BitCardEvents>();

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
          host.setAttribute('aria-disabled', String(props.disabled.value));
        } else {
          host.removeAttribute('role');
          host.removeAttribute('tabindex');
          host.removeAttribute('aria-disabled');
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

    return html`
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
    `;
  },
  {
    styles: [...surfaceMixins, frostVariantMixin('.card'), reducedMotionMixin, componentStyles],
  },
);
