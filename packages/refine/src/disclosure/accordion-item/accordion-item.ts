import { define, html, inject, prop, ref, getHost, onMounted, useEmit, watchEffect } from '@vielzeug/ore';

import type { ComponentSize, SurfaceVariant } from '../../types';

import '../../content/icon/icon';
import { elementDirection } from '../../headless/direction';
import { disablableBundle } from '../../shared';
import { coarsePointerMixin } from '../../styles';
import { ACCORDION_CTX } from '../accordion/accordion';
import styles from './accordion-item.css?inline';

/** Accordion item component properties */

export type OreAccordionItemEvents = {
  collapse: { expanded: boolean; item: HTMLElement };
  expand: { expanded: boolean; item: HTMLElement };
};

export type OreAccordionItemProps = {
  /** Disable accordion item interaction */
  disabled?: boolean;
  /** Whether the item is expanded/open */
  expanded?: boolean;
  /** Item size */
  size?: ComponentSize;
  /** Visual style variant */
  variant?: SurfaceVariant;
};

/**
 * An individual accordion item with expand/collapse functionality using native details/summary.
 *
 * @element ore-accordion-item
 *
 * @attr {boolean} expanded - Whether the item is expanded/open
 * @attr {boolean} disabled - Disable accordion item interaction
 * @attr {string} size - Item size: 'sm' | 'md' | 'lg'
 * @attr {string} variant - Visual variant: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'text' | 'glass' | 'frost'
 *
 * @fires expand - Emitted when item expands. detail: { expanded: boolean; item: HTMLElement }
 * @fires collapse - Emitted when item collapses. detail: { expanded: boolean; item: HTMLElement }
 *
 * @slot prefix - Content before the title (e.g., icons)
 * @slot title - Main accordion item title
 * @slot subtitle - Optional subtitle text
 * @slot suffix - Content after the title (e.g., badges)
 * @slot - Accordion item content (shown when expanded)
 *
 * @cssprop --accordion-item-bg - Background color
 * @cssprop --accordion-item-hover-bg - Background color on hover
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
 * @part item - Item root element.
 * @part summary - Summary trigger row.
 * @part header - Header container.
 * @part title - Title text element.
 * @part subtitle - Subtitle text element.
 * @part content - Content container.
 * @example
 * ```html
 * <ore-accordion-item><span slot="title">Click to expand</span><p>Content</p></ore-accordion-item>
 * <ore-accordion-item expanded variant="bordered"><span slot="title">Title</span><p>Content</p></ore-accordion-item>
 * ```
 */

export const ACCORDION_ITEM_TAG = 'ore-accordion-item' as const;
define<OreAccordionItemProps>(ACCORDION_ITEM_TAG, {
  props: {
    ...disablableBundle,
    expanded: prop.bool(false),
    size: prop.string<ComponentSize>(),
    variant: prop.string<SurfaceVariant>(),
  },

  setup(props) {
    const el = getHost();
    const emit = useEmit<OreAccordionItemEvents>();
    const watch = watchEffect;

    // Inherit size/variant from a parent ore-accordion when present.
    const accordionCtx = inject(ACCORDION_CTX);

    if (accordionCtx) {
      watch(() => {
        const size = accordionCtx.size.value;
        const variant = accordionCtx.variant.value;

        if (size !== undefined) el.setAttribute('size', size);

        if (variant !== undefined) el.setAttribute('variant', variant);
      });
    }

    const titleId = 'accordion-item-title';
    const detailsRef = ref<HTMLDetailsElement>();
    const summaryRef = ref<HTMLElement>();
    let isAnimating = false;

    const openItem = () => {
      const details = detailsRef.value;

      if (!details || details.open) return;

      details.classList.add('opening');
      details.open = true;

      el.toggleAttribute('expanded', true);
      emit('expand', { expanded: true, item: el });

      requestAnimationFrame(() => {
        const inner = details.querySelector<HTMLElement>('.content-inner');

        if (!inner) {
          details.classList.remove('opening');
          isAnimating = false;

          return;
        }

        const onDone = () => {
          details.classList.remove('opening');
          isAnimating = false;
        };
        const transitions = inner.getAnimations?.().filter((a) => a instanceof CSSTransition) ?? [];

        if (transitions.length > 0) {
          Promise.allSettled(transitions.map((a) => a.finished)).then(onDone);
        } else {
          onDone();
        }
      });
    };

    const closeItem = () => {
      const details = detailsRef.value;

      if (!details || !details.open || isAnimating) return;

      isAnimating = true;

      details.classList.add('closing');

      const inner = details.querySelector<HTMLElement>('.content-inner');
      const onDone = () => {
        details.classList.remove('closing');
        details.open = false;
        el.toggleAttribute('expanded', false);
        emit('collapse', { expanded: false, item: el });
        isAnimating = false;
      };

      if (inner) {
        const transitions = inner.getAnimations?.().filter((a) => a instanceof CSSTransition) ?? [];

        if (transitions.length > 0) {
          Promise.allSettled(transitions.map((a) => a.finished)).then(onDone);
        } else {
          onDone();
        }
      } else {
        onDone();
      }
    };

    let touchHandled = false;
    let touchStartY = 0;

    const toggleDetails = () => {
      if (props.disabled.value) return;

      const details = detailsRef.value;

      if (!details) return;

      if (details.open) {
        closeItem();
      } else {
        openItem();
      }
    };

    const handleSummaryTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0]?.clientY ?? 0;
    };

    const handleSummaryTouchEnd = (e: TouchEvent) => {
      const dy = Math.abs((e.changedTouches[0]?.clientY ?? 0) - touchStartY);

      if (dy > 10) return;

      e.preventDefault();
      touchHandled = true;
      toggleDetails();
    };

    const handleSummaryClick = (e: Event) => {
      if (touchHandled) {
        touchHandled = false;
        e.preventDefault();

        return;
      }

      e.preventDefault();
      toggleDetails();
    };

    const handleToggle = () => {
      // Only fires for programmatic open/close (e.g. from accordion parent)
      const isOpen = detailsRef.value?.open ?? false;
      const wasExpanded = Boolean(props.expanded.value);

      if (isOpen && !wasExpanded) {
        el.toggleAttribute('expanded', true);
        emit('expand', { expanded: true, item: el });
      } else if (!isOpen && wasExpanded) {
        el.toggleAttribute('expanded', false);
        emit('collapse', { expanded: false, item: el });
      }
    };

    onMounted(() => {
      const details = detailsRef.value;
      const summary = summaryRef.value;

      if (!details || !summary) return;

      // Detect RTL so plain CSS classes can target it (see `elementDirection` for the
      // ancestor-dir / computed-style resolution rule).
      const checkRTL = () => {
        details.classList.toggle('rtl', elementDirection(el) === 'rtl');
      };

      // Check initially
      checkRTL();

      // Re-check when `dir` changes on this element's own ancestor chain (not the whole
      // document — `elementDirection` only ever looks at `el`'s ancestors, so that's all we
      // need to watch).
      const observer = new MutationObserver((mutations) => {
        const dirChanged = mutations.some((m) => m.attributeName === 'dir');

        if (dirChanged) {
          checkRTL();
        }
      });

      for (let ancestor: Element | null = el; ancestor; ancestor = ancestor.parentElement) {
        observer.observe(ancestor, { attributeFilter: ['dir'], attributes: true });
      }

      details.addEventListener('toggle', handleToggle);
      summary.addEventListener('touchstart', handleSummaryTouchStart, { passive: true });
      summary.addEventListener('touchend', handleSummaryTouchEnd, { passive: false });
      summary.addEventListener('click', handleSummaryClick);

      return () => {
        observer.disconnect();
        details.removeEventListener('toggle', handleToggle);
        summary.removeEventListener('touchstart', handleSummaryTouchStart);
        summary.removeEventListener('touchend', handleSummaryTouchEnd);
        summary.removeEventListener('click', handleSummaryClick);
      };
    });

    return html` <details part="item" ?open="${props.expanded}" ref="${detailsRef}">
      <summary
        part="summary"
        :aria-expanded="${() => String(props.expanded.value)}"
        :aria-disabled="${() => (props.disabled.value ? 'true' : 'false')}"
        :tabindex="${() => (props.disabled.value ? '-1' : null)}"
        ref="${summaryRef}">
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
        <ore-icon class="chevron" name="chevron-down" size="20" stroke-width="2" aria-hidden="true"></ore-icon>
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
