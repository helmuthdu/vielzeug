import { define, defineProps, effect, html, onMount, onSlotChange } from '@vielzeug/craftit';

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
export const BREADCRUMB_ITEM_TAG = define('bit-breadcrumb-item', () => {
  const props = defineProps<BitBreadcrumbItemProps>({
    active: { default: false },
    href: { default: '' },
    separator: { default: '/' },
  });

  return html`
    <style>
      ${itemStyles}
    </style>
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
export const BREADCRUMB_TAG = define('bit-breadcrumb', ({ host }) => {
  const props = defineProps<BitBreadcrumbProps>({
    label: { default: 'Breadcrumb' },
    separator: { default: '' },
  });

  const getItems = () => {
    const slot = host.shadowRoot?.querySelector<HTMLSlotElement>('slot');

    if (!slot) return [];

    return slot
      .assignedElements({ flatten: true })
      .filter((el) => el.tagName.toLowerCase() === 'bit-breadcrumb-item') as HTMLElement[];
  };

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
  });

  effect(syncSeparatorVar);
  effect(syncItems);

  return html`
    <style>
      ${componentStyles}
    </style>
    <nav aria-label="${() => props.label.value}" part="nav">
      <ol role="list" part="list">
        <slot></slot>
      </ol>
    </nav>
  `;
});
