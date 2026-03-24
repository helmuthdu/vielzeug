import {
  computed,
  defineComponent,
  handle,
  html,
  typed,
  inject,
  onMount,
  ref,
  syncContextProps,
  watch,
} from '@vielzeug/craftit';

import type { ComponentSize, VisualVariant } from '../../types';

import { coarsePointerMixin } from '../../styles';
import { ACCORDION_CTX } from '../accordion/accordion';
import styles from './accordion-item.css?inline';

/** Accordion item component properties */

export type BitAccordionItemEvents = {
  collapse: { expanded: boolean; item: HTMLElement };
  expand: { expanded: boolean; item: HTMLElement };
};

export type BitAccordionItemProps = {
  /** Disable accordion item interaction */
  disabled?: boolean;
  /** Whether the item is expanded/open */
  expanded?: boolean;
  /** Item size */
  size?: ComponentSize;
  /** Visual style variant */
  variant?: VisualVariant;
};

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

export const ACCORDION_ITEM_TAG = defineComponent<BitAccordionItemProps, BitAccordionItemEvents>({
  props: {
    disabled: typed<boolean>(false),
    expanded: typed<boolean>(false),
    size: typed<BitAccordionItemProps['size']>(undefined),
    variant: typed<BitAccordionItemProps['variant']>(undefined),
  },
  setup({ emit, host, props }) {
    // Inherit size/variant from a parent bit-accordion when present.
    const accordionCtx = inject(ACCORDION_CTX, undefined);

    syncContextProps(accordionCtx, props, ['size', 'variant']);

    const titleId = 'accordion-item-title';
    const detailsRef = ref<HTMLDetailsElement>();
    const summaryRef = ref<HTMLElement>();
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
          const expanded = Boolean(v);

          details.open = expanded;
          summary.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        },
        { immediate: true },
      );
      handle(details, 'toggle', handleToggle);
    });

    const ariaExpanded = computed(() => (props.expanded.value ? 'true' : 'false'));
    const ariaDisabled = computed(() => (props.disabled.value ? 'true' : 'false'));

    return html` <details part="item" ?open=${props.expanded} ref=${detailsRef}>
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
    </details>`;
  },
  styles: [coarsePointerMixin, styles],
  tag: 'bit-accordion-item',
});
