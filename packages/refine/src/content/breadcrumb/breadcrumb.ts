import { define, html, prop } from '@vielzeug/ore';

import itemStyles from './breadcrumb-item.css?inline';
import componentStyles from './breadcrumb.css?inline';

export type OreBreadcrumbProps = {
  label?: string;
  separator?: string;
};

export type OreBreadcrumbItemProps = {
  active?: boolean;
  href?: string;
  separator?: string;
};

/**
 * A single breadcrumb entry rendered inside `<ore-breadcrumb>`.
 *
 * @element ore-breadcrumb-item
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
 * <ore-breadcrumb-item href="/">Home</ore-breadcrumb-item>
 * <ore-breadcrumb-item active>Current Page</ore-breadcrumb-item>
 * ```
 */
export const BREADCRUMB_ITEM_TAG = 'ore-breadcrumb-item' as const;
define<OreBreadcrumbItemProps>(BREADCRUMB_ITEM_TAG, {
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
 * @element ore-breadcrumb
 *
 * @attr {string} label - Accessible label for the internal `<nav>` landmark
 * @attr {string} separator - Separator text propagated to child `<ore-breadcrumb-item>` elements
 *
 * @slot - One or more `<ore-breadcrumb-item>` children
 *
 * @part nav - Internal navigation landmark element
 * @part list - Internal ordered list container
 *
 * @cssprop --breadcrumb-separator - Optional custom separator text synced to child items
 *
 * @example
 * ```html
 * <ore-breadcrumb label="Page breadcrumb">
 *   <ore-breadcrumb-item href="/">Home</ore-breadcrumb-item>
 *   <ore-breadcrumb-item href="/blog">Blog</ore-breadcrumb-item>
 *   <ore-breadcrumb-item active>My Post</ore-breadcrumb-item>
 * </ore-breadcrumb>
 * ```
 */
export const BREADCRUMB_TAG = 'ore-breadcrumb' as const;
define<OreBreadcrumbProps>(BREADCRUMB_TAG, {
  props: {
    label: prop.string('Breadcrumb'),
    separator: prop.string(),
  },
  setup(props, { el, slots, watch }) {
    // ────────────────────────────────────────────────────────────────
    // Item & Separator Synchronization
    // ────────────────────────────────────────────────────────────────

    const getItems = (): HTMLElement[] => Array.from(el.getElementsByTagName('ore-breadcrumb-item'));

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

    watch(() => {
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
