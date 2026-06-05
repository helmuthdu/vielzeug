import { define, effect, html, prop } from '@vielzeug/craft';

import itemStyles from './breadcrumb-item.css?inline';
import componentStyles from './breadcrumb.css?inline';

export type SgBreadcrumbProps = {
  label?: string;
  separator?: string;
};

export type SgBreadcrumbItemProps = {
  active?: boolean;
  href?: string;
  separator?: string;
};

/**
 * A single breadcrumb entry rendered inside `<sg-breadcrumb>`.
 *
 * @element sg-breadcrumb-item
 *
 * @attr {boolean} active - Marks this item as the current page (`aria-current="page"`)
 * @attr {string} href - Link target for this breadcrumb item
 * @attr {string} separator - Separator text shown before the item (except first item)
 *
 * @slot - Item label/content
 * @slot icon - Optional leading icon for the crumb
 *
 * @part separator - Separator element before the item label
 * @part link - The interactive anchor element
 *
 * @example
 * ```html
 * <sg-breadcrumb-item href="/">Home</sg-breadcrumb-item>
 * <sg-breadcrumb-item active>Current Page</sg-breadcrumb-item>
 * ```
 */
export const BREADCRUMB_ITEM_TAG = 'sg-breadcrumb-item' as const;
define<SgBreadcrumbItemProps>(BREADCRUMB_ITEM_TAG, {
  props: {
    active: prop.bool(),
    href: prop.string(),
    separator: prop.string('/'),
  },
  setup(props) {
    return html`
      <li class="item" role="listitem">
        <span class="separator" part="separator" aria-hidden="true">${props.separator}</span>
        <a
          class="link"
          :href="${props.href}"
          :aria-current="${() => (props.active.value ? 'page' : null)}"
          :tabindex="${() => (props.active.value ? '-1' : null)}"
          part="link">
          <span class="icon"><slot name="icon"></slot></span>
          <span class="label"><slot></slot></span>
        </a>
      </li>
    `;
  },
  styles: [itemStyles],
});

// ============================================
// Breadcrumb Component
// ============================================

/**
 * Accessible breadcrumb navigation container.
 *
 * @element sg-breadcrumb
 *
 * @attr {string} label - Accessible label for the internal `<nav>` landmark
 * @attr {string} separator - Separator text propagated to child `<sg-breadcrumb-item>` elements
 *
 * @slot - One or more `<sg-breadcrumb-item>` children
 *
 * @part nav - Internal navigation landmark element
 * @part list - Internal ordered list container
 *
 * @cssprop --breadcrumb-separator - Optional custom separator text synced to child items
 *
 * @example
 * ```html
 * <sg-breadcrumb label="Page breadcrumb">
 *   <sg-breadcrumb-item href="/">Home</sg-breadcrumb-item>
 *   <sg-breadcrumb-item href="/blog">Blog</sg-breadcrumb-item>
 *   <sg-breadcrumb-item active>My Post</sg-breadcrumb-item>
 * </sg-breadcrumb>
 * ```
 */
export const BREADCRUMB_TAG = 'sg-breadcrumb' as const;
define<SgBreadcrumbProps>(BREADCRUMB_TAG, {
  props: {
    label: prop.string('Breadcrumb'),
    separator: prop.string(),
  },
  setup(props, { bind: _bind, el, slots }) {
    // ────────────────────────────────────────────────────────────────
    // Item & Separator Synchronization
    // ────────────────────────────────────────────────────────────────

    const getItems = (): HTMLElement[] => Array.from(el.getElementsByTagName('sg-breadcrumb-item'));

    const syncItems = () => {
      const sep = props.separator.value || '/';
      const items = getItems();

      for (let i = 0; i < items.length; i++) {
        items[i].setAttribute('separator', sep);
        items[i].toggleAttribute('data-show-separator', i > 0);
      }

      // Sync CSS variable for CSS-based separator (if used)
      if (sep) el.style.setProperty('--breadcrumb-separator', `'${sep}'`);
      else el.style.removeProperty('--breadcrumb-separator');
    };

    // ────────────────────────────────────────────────────────────────
    // Lifecycle
    // ────────────────────────────────────────────────────────────────

    effect(() => {
      void slots.elements().value;
      syncItems();
    });

    return html`
      <nav part="nav" :aria-label="${props.label}">
        <ol role="list" part="list">
          <slot></slot>
        </ol>
      </nav>
    `;
  },
  styles: [componentStyles],
});
