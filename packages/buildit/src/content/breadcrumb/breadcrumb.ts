import { css, define, defineProps, effect, html, onMount, onSlotChange } from '@vielzeug/craftit';

// ============================================
// Types
// ============================================

export interface BreadcrumbProps {
  label?: string;
  separator?: string;
}

export interface BreadcrumbItemProps {
  href?: string;
  active?: boolean;
  separator?: string;
}

// ============================================
// Breadcrumb Item Component
// ============================================

const itemStyles = /* css */ css`
  @layer buildit.base {
    :host {
      align-items: center;
      display: inline-flex;
    }

    .item {
      align-items: center;
      display: inline-flex;
    }

    .separator {
      color: var(--color-contrast-400);
      display: none;
      font-size: var(--text-sm);
      font-weight: var(--font-normal);
      padding-inline: var(--size-2);
    }

    :host([data-show-separator]) .separator {
      display: inline-block;
    }

    .link {
      align-items: center;
      border-radius: var(--rounded-sm);
      color: var(--color-contrast-600);
      display: inline-flex;
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      gap: var(--size-1);
      outline-offset: 2px;
      text-decoration: none;
      transition: color var(--transition-fast);
    }

    .link:hover {
      color: var(--color-contrast-900);
      text-decoration: underline;
    }

    .link:focus-visible {
      outline: var(--border-2) solid currentColor;
      outline-offset: var(--border-2);
    }

    :host([active]) .link {
      color: var(--color-contrast-900);
      font-weight: var(--font-semibold);
      pointer-events: none;
      text-decoration: none;
    }

    /* Icon slot */
    .icon {
      display: contents;
    }

    .label {
      max-width: var(--breadcrumb-item-max-width, 20ch);
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
`;

/**
 * `bit-breadcrumb-item` — A single crumb within a `<bit-breadcrumb>` list.
 *
 * @example
 * ```html
 * <bit-breadcrumb-item href="/">Home</bit-breadcrumb-item>
 * <bit-breadcrumb-item active>Current Page</bit-breadcrumb-item>
 * ```
 */
export const ITEM_TAG = define('bit-breadcrumb-item', () => {
  const props = defineProps<BreadcrumbItemProps>({
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

const componentStyles = /* css */ css`
  @layer buildit.base {
    :host {
      display: block;
    }

    nav {
      display: block;
    }

    ol {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 0;
      list-style: none;
      margin: 0;
      padding: 0;
    }
  }
`;

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
export const TAG = define('bit-breadcrumb', ({ host }) => {
  const props = defineProps<BreadcrumbProps>({
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
