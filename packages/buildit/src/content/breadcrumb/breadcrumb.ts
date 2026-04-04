import { define, effect, html } from '@vielzeug/craftit';

import itemStyles from './breadcrumb-item.css?inline';

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
 * `bit-breadcrumb-item` — A single crumb within a `<bit-breadcrumb>` list.
 *
 * @example
 * ```html
 * <bit-breadcrumb-item href="/">Home</bit-breadcrumb-item>
 * <bit-breadcrumb-item active>Current Page</bit-breadcrumb-item>
 * ```
 */
export const BREADCRUMB_ITEM_TAG = define<BitBreadcrumbItemProps>('bit-breadcrumb-item', {
  props: {
    active: false,
    href: '',
    separator: '/',
  },
  setup({ props }) {
    return html`
      <li class="item" role="listitem">
        <span class="separator" part="separator" aria-hidden="true">${() => props.separator.value || '/'}</span>
        <a
          class="link"
          href="${() => props.href.value || undefined}"
          aria-current="${() => (props.active.value ? 'page' : null)}"
          tabindex="${() => (props.active.value ? '-1' : null)}"
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
 * `bit-breadcrumb` — Accessible navigation breadcrumb.
 *
 * Wrap `<bit-breadcrumb-item>` elements as children.
 * The last/current item should have `active` attribute.
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
    label: 'Breadcrumb',
    separator: '',
  },
  setup({ host, props, slots }) {
    // ────────────────────────────────────────────────────────────────
    // Item & Separator Synchronization
    // ────────────────────────────────────────────────────────────────

    const getItems = (): HTMLElement[] => Array.from(host.el.getElementsByTagName('bit-breadcrumb-item'));

    const syncItems = () => {
      const sep = props.separator.value || '/';
      const items = getItems();

      for (let i = 0; i < items.length; i++) {
        items[i].setAttribute('separator', sep);
        items[i].toggleAttribute('data-show-separator', i > 0);
      }

      // Sync CSS variable for CSS-based separator (if used)
      if (sep) host.el.style.setProperty('--breadcrumb-separator', `'${sep}'`);
      else host.el.style.removeProperty('--breadcrumb-separator');
    };

    // ────────────────────────────────────────────────────────────────
    // Lifecycle
    // ────────────────────────────────────────────────────────────────

    effect(() => {
      void slots.elements().value;
      syncItems();
    });

    return html`
      <nav aria-label="${() => props.label.value}" part="nav">
        <ol role="list" part="list">
          <slot></slot>
        </ol>
      </nav>
    `;
  },
  styles: [componentStyles],
});
