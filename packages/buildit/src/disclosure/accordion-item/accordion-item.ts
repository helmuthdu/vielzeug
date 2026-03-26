import { define, computed, html, inject, onMount, ref, syncContextProps } from '@vielzeug/craftit';

import type { ComponentSize, VisualVariant } from '../../types';

import '../../content/icon/icon';
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

export const ACCORDION_ITEM_TAG = define<BitAccordionItemProps, BitAccordionItemEvents>('bit-accordion-item', {
  props: {
    disabled: false,
    expanded: false,
    size: undefined,
    variant: undefined,
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
      const wasExpanded = Boolean(props.expanded.value);

      // Notify accordion parent for single-selection management
      if (isOpen && !wasExpanded) {
        props.expanded.value = true;
        emit('expand', { expanded: true, item: host.el });
      } else if (!isOpen && wasExpanded) {
        props.expanded.value = false;
        emit('collapse', { expanded: false, item: host.el });
      }
    };

    onMount(() => {
      const details = detailsRef.value;
      const summary = summaryRef.value;

      if (!details || !summary) return;

      // Detect RTL by preferring the closest explicit dir="..." ancestor.
      const checkRTL = () => {
        let isRTL: boolean | undefined;

        // 1) Closest ancestor dir always wins (supports local RTL sections).
        let parent: HTMLElement | null = host.el;

        while (parent) {
          const dir = parent.getAttribute('dir');

          if (dir === 'rtl') {
            isRTL = true;
            break;
          }

          if (dir === 'ltr') {
            isRTL = false;
            break;
          }

          parent = parent.parentElement;
        }

        // 2) Fallback to computed direction when no explicit dir is found.
        if (isRTL === undefined) {
          isRTL = getComputedStyle(host.el).direction === 'rtl';
        }

        // 3) Keep markup simple for CSS targeting.
        details.classList.toggle('rtl', isRTL);
      };

      // Check initially
      checkRTL();

      // Re-check when DOM attributes change
      const observer = new MutationObserver((mutations) => {
        const dirChanged = mutations.some((m) => m.attributeName === 'dir');

        if (dirChanged) {
          checkRTL();
        }
      });

      observer.observe(document.documentElement, {
        attributeFilter: ['dir'],
        attributes: true,
        subtree: true,
      });

      details.addEventListener('toggle', handleToggle);

      return () => {
        observer.disconnect();
        details.removeEventListener('toggle', handleToggle);
      };
    });

    const isExpanded = computed(() => Boolean(props.expanded.value));
    const ariaExpanded = computed(() => String(isExpanded.value));
    const ariaDisabled = computed(() => (props.disabled.value ? 'true' : 'false'));

    return html` <details part="item" ?open=${isExpanded} ref=${detailsRef}>
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
        <bit-icon class="chevron" name="chevron-down" size="20" stroke-width="2" aria-hidden="true"></bit-icon>
      </summary>
      <div class="content-wrapper" part="content" role="region" aria-labelledby="${titleId}">
        <div class="content-inner">
          <slot></slot>
        </div>
      </div>
    </details>`;
  },
  styles: [coarsePointerMixin, styles],
});
