import itemStyles from './breadcrumb-item.css?inline';

import { define, prop, effect, html } from '@vielzeug/craft';

export type BitBreadcrumbProps = {
  label?: string;
  separator?: string;
};

export type BitBreadcrumbItemProps = {
  active?: boolean;
  href?: string;
  separator?: string;
};

/**
 * A single breadcrumb entry rendered inside `<bit-breadcrumb>`.
 *
 * @element bit-breadcrumb-item
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
 * <bit-breadcrumb-item href="/">Home</bit-breadcrumb-item>
 * <bit-breadcrumb-item active>Current Page</bit-breadcrumb-item>
 * ```
 */
export const BREADCRUMB_ITEM_TAG = define<BitBreadcrumbItemProps>('bit-breadcrumb-item', {
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

import componentStyles from './breadcrumb.css?inline';

/**
 * Accessible breadcrumb navigation container.
 *
 * @element bit-breadcrumb
 *
 * @attr {string} label - Accessible label for the internal `<nav>` landmark
 * @attr {string} separator - Separator text propagated to child `<bit-breadcrumb-item>` elements
 *
 * @slot - One or more `<bit-breadcrumb-item>` children
 *
 * @part nav - Internal navigation landmark element
 * @part list - Internal ordered list container
 *
 * @cssprop --breadcrumb-separator - Optional custom separator text synced to child items
 *
 * @example
 * ```html
 * <bit-breadcrumb label="Page breadcrumb">
 *   <bit-breadcrumb-item href="/">Home</bit-breadcrumb-item>
 *   <bit-breadcrumb-item href="/blog">Blog</bit-breadcrumb-item>
 *   <bit-breadcrumb-item active>My Post</bit-breadcrumb-item>
 * </bit-breadcrumb>
 * ```
 */
export const BREADCRUMB_TAG = define<BitBreadcrumbProps>('bit-breadcrumb', {
  props: {
    label: prop.string('Breadcrumb'),
    separator: prop.string(),
  },
  setup(props, { bind: _bind, el, slots }) {
    // ────────────────────────────────────────────────────────────────
    // Item & Separator Synchronization
    // ────────────────────────────────────────────────────────────────

    const getItems = (): HTMLElement[] => Array.from(el.getElementsByTagName('bit-breadcrumb-item'));

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
