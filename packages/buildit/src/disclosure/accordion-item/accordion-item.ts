import {
  computed,
  css,
  define,
  defineEmits,
  defineProps,
  handle,
  html,
  inject,
  onMount,
  ref,
  syncContextProps,
  watch,
} from '@vielzeug/craftit';
import { coarsePointerMixin } from '../../styles';
import type { AddEventListeners, BitAccordionItemEvents, ComponentSize, VisualVariant } from '../../types';
import { ACCORDION_CTX } from '../accordion/accordion';

const styles = /* css */ css`
  @layer buildit.base {
    /* ========================================
       Base Styles & Defaults
       ======================================== */

    :host {
      display: block;
      color: var(--accordion-item-body-color, var(--text-color-body));
      --accordion-details-radius: var(--rounded-md);
      --accordion-item-transition: var(--transition-normal);
    }

    details {
      width: 100%;
      border-radius: var(--accordion-item-radius);
      overflow: hidden;
      transition: all var(--accordion-item-transition);
    }

    summary {
      border-radius: var(--accordion-details-radius);
      list-style: none;
      cursor: pointer;
      display: flex;
      font-size: var(--accordion-item-title);
      align-items: center;
      gap: var(--size-4);
      padding: var(--accordion-item-details-padding, var(--size-3) var(--size-4));
      user-select: none;
      transition: all var(--accordion-item-transition);
      outline: none;
      position: relative;
      background: var(--accordion-item-bg);
      border: var(--border) solid var(--accordion-item-border-color);
      min-height: var(--_touch-target);
    }

    summary::-webkit-details-marker {
      display: none;
    }

    summary:focus {
      outline: none;
    }

    summary:focus-visible {
      outline: var(--border-2) solid currentColor;
      outline-offset: var(--border-2);
      box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 20%, transparent);
    }

    .header-content {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    }

    .subtitle {
      font-size: var(--accordion-item-subtitle-size);
      color: var(--accordion-item-subtitle-color, var(--text-color-secondary));
      line-height: var(--leading-normal);
    }

    .title {
      font-weight: var(--font-medium);
      color: var(--accordion-item-title-color, var(--text-color-heading));
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .content-wrapper {
      font-size: var(--accordion-item-body);
      display: grid;
      grid-template-rows: 0fr;
      transition: grid-template-rows var(--accordion-item-transition);
      background: var(--accordion-item-bg);
      border-inline: 1px solid var(--accordion-item-border-color);
      border-bottom: 1px solid var(--accordion-item-border-color);
      border-radius: var(--accordion-summary-radius);
    }

    details[open] .content-wrapper {
      grid-template-rows: 1fr;
    }

    .content-inner {
      overflow: hidden;
      padding: var(--accordion-item-summary-padding, var(--size-2) var(--size-4));
    }
  }

  @layer buildit.variants {
    /* ========================================
       Visual Variants
       ======================================== */

    :host,
    :host([variant='solid']) {
      --accordion-item-bg: var(--color-contrast-50);
      --accordion-item-border-color: transparent;
    }

    :host summary:hover,
    :host([variant='solid']) summary:hover {
      --accordion-item-bg: var(--color-contrast-200);
    }

    :host([variant='flat']) {
      --accordion-item-bg: var(--color-contrast-100);
    }

    :host([variant='flat']) summary:hover {
      --accordion-item-bg: var(--color-contrast-200);
    }

    :host([variant='bordered']) {
      --accordion-item-bg: var(--color-contrast-100);
      --accordion-item-border-color: var(--color-contrast-300);

      box-shadow: var(--inset-shadow-xs), var(--shadow-2xs);
    }

    :host([variant='bordered']) summary:hover {
      background: var(--color-contrast-200);
    }

    :host([variant='outline']) {
      --accordion-item-bg: transparent;
      --accordion-item-border-color: var(--color-contrast-300);
    }

    :host([variant='outline']) summary:hover {
      background: var(--color-contrast-300);
    }

    :host([variant='ghost']) {
      --accordion-item-bg: transparent;
      --accordion-item-border-color: transparent;
    }

    :host([variant='ghost']) summary:hover {
      background: var(--color-contrast-200);
    }

    :host([variant='text']) {
      --accordion-item-bg: transparent;
      --accordion-item-border-color: transparent;
    }

    :host([variant='text']) summary:hover {
      background: transparent;
    }

    /* Glass & Frost - Shared Styles */
    :host([variant='glass']) details,
    :host([variant='frost']) details {
      border-radius: inherit;
    }

    :host([variant='glass']) summary,
    :host([variant='frost']) summary {
      border-radius: inherit;
      backdrop-filter: blur(var(--blur-lg)) saturate(180%);
    }

    :host([variant='glass']) .content-wrapper,
    :host([variant='frost']) .content-wrapper {
      backdrop-filter: blur(var(--blur-lg)) saturate(180%);
      border-radius: 0;
    }

    /* Glass */
    :host([variant='glass']) {
      --accordion-item-bg: color-mix(in srgb, var(--color-secondary) 30%, var(--color-contrast) 10%);
      --accordion-item-border-color: transparent;
      --accordion-item-title-color: color-mix(in srgb, var(--color-secondary-contrast) 100%, transparent);
      --accordion-item-subtitle-color: color-mix(in srgb, var(--color-secondary-contrast) 60%, transparent);
      --accordion-item-body-color: color-mix(in srgb, var(--color-secondary-contrast) 80%, transparent);
    }

    :host([variant='glass']) summary {
      text-shadow: var(--text-shadow-xs);
    }

    :host([variant='glass']) summary:hover {
      background: color-mix(in srgb, var(--color-secondary) 20%, transparent);
    }

    :host([variant='glass']) .content-wrapper {
      filter: brightness(1.05);
    }

    /* Frost */
    :host([variant='frost']) {
      --accordion-item-bg: color-mix(in srgb, var(--color-canvas) 55%, transparent);
      --accordion-item-border-color: transparent;
    }

    :host([variant='frost']) summary {
      text-shadow: var(--text-shadow-2xs);
    }

    :host([variant='frost']) summary:hover {
      background: color-mix(in srgb, var(--color-canvas) 20%, transparent);
    }

    /* ========================================
     Size Variants
     ======================================== */

    :host([size='sm']) {
      --accordion-item-details-padding: var(--size-2) var(--size-4);
      --accordion-item-summary-padding: var(--size-1) var(--size-5);
      --accordion-item-title: var(--text-sm);
      --accordion-item-subtitle-size: var(--text-xs);
      --accordion-item-body: var(--text-xs);
    }

    :host(:not([size])),
    :host([size='md']) {
      --accordion-item-details-padding: var(--size-3) var(--size-4);
      --accordion-item-summary-padding: var(--size-1) var(--size-5);
      --accordion-item-title: var(--text-base);
      --accordion-item-subtitle-size: var(--text-sm);
      --accordion-item-body: var(--text-sm);
    }

    :host([size='lg']) {
      --accordion-item-details-padding: var(--size-4) var(--size-4);
      --accordion-item-summary-padding: var(--size-1) var(--size-5);
      --accordion-item-title: var(--text-lg);
      --accordion-item-subtitle-size: var(--text-base);
      --accordion-item-body: var(--text-base);
    }

    /* ========================================
     States
     ======================================== */

    :host([disabled]) {
      opacity: 0.6;
      pointer-events: none;
    }

    /* ========================================
     Chevron Animation
     ======================================== */

    .chevron {
      width: var(--size-5);
      height: var(--size-5);
      transition: transform var(--accordion-item-transition);
      margin-inline-start: auto;
    }

    details[open] .chevron {
      transform: rotate(-90deg);
    }

    /* Expanded state - adjust border radius */
    :host([expanded]) {
      --accordion-details-radius: var(--rounded-md) var(--rounded-md) 0 0;
      --accordion-summary-radius: 0 0 var(--rounded-md) var(--rounded-md);
    }

    @media (forced-colors: active) {
      /* Default variant uses a transparent border — ensure a visible border
         renders in HCM so the summary is distinguishable from the body */
      summary {
        border-color: ButtonText;
      }
    }
  }
`;

/** Accordion item component properties */
export interface AccordionItemProps {
  /** Whether the item is expanded/open */
  expanded?: boolean;
  /** Disable accordion item interaction */
  disabled?: boolean;
  /** Item size */
  size?: ComponentSize;
  /** Visual style variant */
  variant?: VisualVariant;
}

/**
 * An individual accordion item with expand/collapse functionality using native details/summary.
 *
 * @element bit-accordion-item
 *
 * @attr {boolean} expanded - Whether the item is expanded/open
 * @attr {boolean} disabled - Disable accordion item interaction
 * @attr {string} size - Item size: 'sm' | 'md' | 'lg'
 * @attr {string} variant - Visual variant: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'text' | 'glass' | 'frost'
 *
 * @fires expand - Emitted when item expands
 * @fires collapse - Emitted when item collapses
 *
 * @slot prefix - Content before the title (e.g., icons)
 * @slot title - Main accordion item title
 * @slot subtitle - Optional subtitle text
 * @slot suffix - Content after the title (e.g., badges)
 * @slot - Accordion item content (shown when expanded)
 *
 * @cssprop --accordion-item-bg - Background color
 * @cssprop --accordion-item-border-color - Border color
 * @cssprop --accordion-item-title-color - Title text color
 * @cssprop --accordion-item-subtitle-color - Subtitle text color
 * @cssprop --accordion-item-body-color - Body text color
 * @cssprop --accordion-item-radius - Border radius
 * @cssprop --accordion-item-transition - Transition duration
 * @cssprop --accordion-item-title - Title font size
 * @cssprop --accordion-item-subtitle-size - Subtitle font size
 * @cssprop --accordion-item-body - Body font size
 * @cssprop --accordion-item-details-padding - Summary/header padding
 * @cssprop --accordion-item-summary-padding - Content padding
 *
 * @example
 * ```html
 * <bit-accordion-item><span slot="title">Click to expand</span><p>Content</p></bit-accordion-item>
 * <bit-accordion-item expanded variant="bordered"><span slot="title">Title</span><p>Content</p></bit-accordion-item>
 * ```
 */

export const TAG = define('bit-accordion-item', ({ host }) => {
  const props = defineProps<AccordionItemProps>({
    disabled: { default: false },
    expanded: { default: false },
    size: { default: undefined },
    variant: { default: undefined },
  });

  // Inherit size/variant from a parent bit-accordion when present.
  const accordionCtx = inject(ACCORDION_CTX, undefined);
  syncContextProps(accordionCtx, props, ['size', 'variant']);

  const titleId = 'accordion-item-title';
  const detailsRef = ref<HTMLDetailsElement>();
  const summaryRef = ref<HTMLElement>();
  const emit = defineEmits<{
    collapse: { expanded: boolean; item: HTMLElement };
    expand: { expanded: boolean; item: HTMLElement };
  }>();

  const handleToggle = () => {
    const isOpen = detailsRef.value?.open ?? false;
    // Notify accordion parent for single-selection management
    if (isOpen && !host.hasAttribute('expanded')) {
      host.setAttribute('expanded', '');
      emit('expand', { expanded: true, item: host });
    } else if (!isOpen && host.hasAttribute('expanded')) {
      host.removeAttribute('expanded');
      emit('collapse', { expanded: false, item: host });
    }
  };

  onMount(() => {
    const details = detailsRef.value;
    const summary = summaryRef.value;
    if (!details || !summary) return;

    // Sync details.open when expanded prop changes (needs live DOM refs)
    watch(
      props.expanded,
      (v) => {
        details.open = v;
        summary.setAttribute('aria-expanded', v ? 'true' : 'false');
      },
      { immediate: true },
    );

    handle(details, 'toggle', handleToggle);
  });

  const ariaExpanded = computed(() => (props.expanded.value ? 'true' : 'false'));
  const ariaDisabled = computed(() => (props.disabled.value ? 'true' : 'false'));

  return {
    styles: [coarsePointerMixin, styles],
    template: html` <details part="item" ?open=${props.expanded} ref=${detailsRef}>
      <summary part="summary" :aria-expanded=${ariaExpanded} :aria-disabled=${ariaDisabled} ref=${summaryRef}>
        <slot name="prefix"></slot>
        <div class="header-content" part="header">
          <span class="title" part="title" id="${titleId}">
            <slot name="title"></slot>
          </span>
          <span class="subtitle" part="subtitle">
            <slot name="subtitle"></slot>
          </span>
        </div>
        <slot name="suffix"></slot>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="chevron"
          part="chevron"
          xmlns="http://www.w3.org/2000/svg">
          <path d="m 14.999979,5.9999793 -5.9999997,5.9999997 5.9999997,6" />
        </svg>
      </summary>
      <div class="content-wrapper" part="content" role="region" aria-labelledby="${titleId}">
        <div class="content-inner">
          <slot></slot>
        </div>
      </div>
    </details>`,
  };
});

declare global {
  interface HTMLElementTagNameMap {
    'bit-accordion-item': HTMLElement & AccordionItemProps & AddEventListeners<BitAccordionItemEvents>;
  }
}
