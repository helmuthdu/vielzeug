import { defineComponent, effect, html, onMount, onSlotChange } from '@vielzeug/craftit/core';

// ============================================
// Types
// ============================================

export type BitBreadcrumbProps = {
  label?: string;
  separator?: string;
};

export type BitBreadcrumbItemProps = {
  active?: boolean;
  href?: string;
  separator?: string;
};

// ============================================
// Breadcrumb Item Component
// ============================================

import itemStyles from './breadcrumb-item.css?inline';

/**
 * `bit-breadcrumb-item` — A single crumb within a `<bit-breadcrumb>` list.
 *
 * @example
 * ```html
 * <bit-breadcrumb-item href="/">Home</bit-breadcrumb-item>
 * <bit-breadcrumb-item active>Current Page</bit-breadcrumb-item>
 * ```
 */
export const BREADCRUMB_ITEM_TAG = defineComponent<BitBreadcrumbItemProps>({
  props: {
    active: { default: false },
    href: { default: '' },
    separator: { default: '/' },
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
  tag: 'bit-breadcrumb-item',
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
export const BREADCRUMB_TAG = defineComponent<BitBreadcrumbProps>({
  props: {
    label: { default: 'Breadcrumb' },
    separator: { default: '' },
  },
  setup({ host, props }) {
    const getItems = (): HTMLElement[] => Array.from(host.getElementsByTagName('bit-breadcrumb-item')) as HTMLElement[];
    const syncSeparatorVar = () => {
      const sep = props.separator.value;

      if (sep) {
        host.style.setProperty('--breadcrumb-separator', `'${sep}'`);
      } else {
        host.style.removeProperty('--breadcrumb-separator');
      }
    };
    const syncItems = () => {
      const sep = props.separator.value || '/';
      const items = getItems();

      for (let i = 0; i < items.length; i += 1) {
        items[i].setAttribute('separator', sep);

        if (i === 0) {
          items[i].removeAttribute('data-show-separator');
        } else {
          items[i].setAttribute('data-show-separator', '');
        }
      }
    };

    onMount(() => {
      onSlotChange('default', syncItems);
      // Ensure initial slotted items are normalized once on mount.
      syncItems();
    });
    effect(syncSeparatorVar);
    effect(syncItems);

    return html`
      <nav aria-label="${() => props.label.value}" part="nav">
        <ol role="list" part="list">
          <slot></slot>
        </ol>
      </nav>
    `;
  },
  styles: [componentStyles],
  tag: 'bit-breadcrumb',
});
