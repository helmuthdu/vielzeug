import {
  computed,
  createContext,
  define,
  defineEmits,
  defineProps,
  defineSlots,
  effect,
  html,
  inject,
  onMount,
  provide,
  type ReadonlySignal,
} from '@vielzeug/craftit';

import { chevronLeftIcon, chevronRightIcon } from '../../icons';
import { coarsePointerMixin, reducedMotionMixin } from '../../styles';

// ─── Types ────────────────────────────────────────────────────────────────

type SidebarVariant = 'default' | 'floating' | 'inset';

/** Context provided by `bit-sidebar` to its `bit-sidebar-group` and `bit-sidebar-item` children. */
export type SidebarContext = {
  collapsed: ReadonlySignal<boolean>;
  variant: ReadonlySignal<SidebarVariant | undefined>;
};

/** Injection key for the sidebar context. */
export const SIDEBAR_CTX = createContext<SidebarContext>();

// ─── bit-sidebar styles ──────────────────────────────────────────────────────

import sidebarStyles from './sidebar.css?inline';

/** bit-sidebar element interface */
export type SidebarElement = HTMLElement &
  BitSidebarProps & {
    /** Collapse the sidebar. */
    collapse(): void;
    /** Expand the sidebar. */
    expand(): void;
    /** Toggle between collapsed and expanded. */
    toggle(): void;
  };

/** Sidebar component properties */

export type BitSidebarEvents = {
  collapse: undefined;
  expand: undefined;
};

export type BitSidebarGroupEvents = {
  toggle: { open: boolean };
};

export type BitSidebarProps = {
  /** Whether the sidebar is collapsed to icon-only mode */
  collapsed?: boolean;
  /** Whether the sidebar supports collapsing */
  collapsible?: boolean;
  /**
   * Accessible label for the navigation landmark.
   * Use to distinguish multiple navigation regions on a page.
   * @default 'Sidebar navigation'
   */
  label?: string;
  /** Visual style variant */
  variant?: SidebarVariant;
};

/**
 * `bit-sidebar` — A collapsible navigation sidebar with group and item support.
 *
 * @element bit-sidebar
 *
 * @attr {boolean} collapsed - Collapsed (icon-only) state
 * @attr {boolean} collapsible - Show the collapse toggle button
 * @attr {string} variant - Visual variant: 'default' | 'floating' | 'inset'
 * @attr {string} label - Accessible aria-label for the nav landmark
 *
 * @slot header - Branding or logo content above the nav
 * @slot - Navigation content (bit-sidebar-group / bit-sidebar-item)
 * @slot footer - Footer content below the nav (user info, settings, etc.)
 *
 * @fires collapse - Fired when the sidebar collapses
 * @fires expand - Fired when the sidebar expands
 *
 * @cssprop --sidebar-width - Expanded sidebar width (default: 16rem)
 * @cssprop --sidebar-collapsed-width - Collapsed sidebar width (default: 3.5rem)
 * @cssprop --sidebar-bg - Sidebar background color
 * @cssprop --sidebar-border-color - Border color
 *
 * @example
 * ```html
 * <bit-sidebar collapsible label="App navigation">
 *   <span slot="header">My App</span>
 *   <bit-sidebar-group label="Main">
 *     <bit-sidebar-item href="/dashboard" active>Dashboard</bit-sidebar-item>
 *     <bit-sidebar-item href="/settings">Settings</bit-sidebar-item>
 *   </bit-sidebar-group>
 * </bit-sidebar>
 * ```
 */
export const SIDEBAR_TAG = define('bit-sidebar', ({ host }) => {
  const slots = defineSlots<{ default: unknown; footer: unknown; header: unknown }>();

  const props = defineProps<BitSidebarProps>({
    collapsed: { default: false },
    collapsible: { default: false },
    label: { default: 'Sidebar navigation' },
    variant: { default: undefined },
  });

  const emit = defineEmits<BitSidebarEvents>();

  const hasHeader = computed(() => slots.has('header').value);
  const hasFooter = computed(() => slots.has('footer').value);

  provide(SIDEBAR_CTX, {
    collapsed: props.collapsed as ReadonlySignal<boolean>,
    variant: props.variant as ReadonlySignal<SidebarVariant | undefined>,
  });

  const doToggle = () => {
    const next = !props.collapsed.value;

    if (next) {
      host.setAttribute('collapsed', '');
      emit('collapse', undefined);
    } else {
      host.removeAttribute('collapsed');
      emit('expand', undefined);
    }
  };

  onMount(() => {
    const el = host as SidebarElement;

    el.collapse = () => {
      if (!props.collapsed.value) {
        host.setAttribute('collapsed', '');
        emit('collapse', undefined);
      }
    };
    el.expand = () => {
      if (props.collapsed.value) {
        host.removeAttribute('collapsed');
        emit('expand', undefined);
      }
    };
    el.toggle = doToggle;
  });

  return {
    styles: [coarsePointerMixin, reducedMotionMixin, sidebarStyles],
    template: html`
      <nav aria-label="${() => props.label.value}" part="nav">
        <div class="sidebar-header" part="header" ?hidden=${() => !hasHeader.value && !props.collapsible.value}>
          <slot name="header"></slot>
          <button
            class="toggle-btn"
            part="toggle-btn"
            type="button"
            ?hidden=${() => !props.collapsible.value}
            aria-label="${() => (props.collapsed.value ? 'Expand sidebar' : 'Collapse sidebar')}"
            aria-expanded="${() => String(!props.collapsed.value)}"
            @click="${doToggle}">
            <span class="toggle-icon" aria-hidden="true">${chevronLeftIcon}</span>
          </button>
        </div>
        <div class="sidebar-content" part="content">
          <slot></slot>
        </div>
        <div class="sidebar-footer" part="footer" ?hidden=${() => !hasFooter.value}>
          <slot name="footer"></slot>
        </div>
      </nav>
    `,
  };
});

// ─── bit-sidebar-group styles ────────────────────────────────────────────────

import groupStyles from './sidebar-group.css?inline';

/** Sidebar group properties */
export type BitSidebarGroupProps = {
  /** Whether this group can be collapsed */
  collapsible?: boolean;
  /** Accessible label for the group */
  label?: string;
  /** Whether this collapsible group is open */
  open?: boolean;
};

/**
 * `bit-sidebar-group` — A labelled section within `bit-sidebar`.
 *
 * @element bit-sidebar-group
 *
 * @attr {string} label - Group label text
 * @attr {boolean} collapsible - Whether this group can be toggled open/closed
 * @attr {boolean} open - Expanded state (when collapsible)
 *
 * @slot - Navigation items (`bit-sidebar-item`)
 * @slot icon - Icon displayed before the label
 *
 * @fires toggle - Fired when the group is toggled (collapsible groups only)
 *
 * @example
 * ```html
 * <bit-sidebar-group label="Main" collapsible open>
 *   <bit-sidebar-item href="/home">Home</bit-sidebar-item>
 * </bit-sidebar-group>
 * ```
 */
export const SIDEBAR_GROUP_TAG = define('bit-sidebar-group', ({ host }) => {
  const slots = defineSlots<{ default: unknown; icon: unknown }>();
  const hasIcon = computed(() => slots.has('icon').value);

  const props = defineProps<BitSidebarGroupProps>({
    collapsible: { default: false },
    label: { default: '' },
    open: { default: true },
  });

  const emit = defineEmits<BitSidebarGroupEvents>();

  const sidebarCtx = inject(SIDEBAR_CTX, undefined);

  effect(() => {
    host.toggleAttribute('sidebar-collapsed', sidebarCtx?.collapsed.value ?? false);
  });

  const isCollapsible = computed(() => props.collapsible.value);
  const isOpen = computed(() => !isCollapsible.value || props.open.value);

  const toggle = () => {
    if (!props.collapsible.value) return;

    const next = !props.open.value;

    if (next) {
      host.setAttribute('open', '');
    } else {
      host.removeAttribute('open');
    }

    emit('toggle', { open: next });
  };

  return {
    styles: [reducedMotionMixin, groupStyles],
    template: html`
      <div
        class="group-header"
        part="group-header"
        role="${() => (isCollapsible.value ? 'button' : null)}"
        tabindex="${() => (isCollapsible.value ? '0' : null)}"
        aria-expanded="${() => (isCollapsible.value ? String(props.open.value) : null)}"
        @click="${toggle}"
        @keydown="${(e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
        }}">
        <span class="group-icon" part="group-icon" ?hidden=${() => !hasIcon.value} aria-hidden="true">
          <slot name="icon"></slot>
        </span>
        <span class="group-label" part="group-label">${() => props.label.value}</span>
        <span class="chevron" ?hidden=${() => !isCollapsible.value} aria-hidden="true">${chevronRightIcon}</span>
      </div>
      <div class="group-items" part="group-items" role="list" ?hidden=${() => !isOpen.value}>
        <slot></slot>
      </div>
    `,
  };
});

// ─── bit-sidebar-item styles ─────────────────────────────────────────────────

import itemStyles from './sidebar-item.css?inline';

/** Sidebar item properties */
export type BitSidebarItemProps = {
  /** Whether this item represents the current page/section */
  active?: boolean;
  /** Whether this item is disabled */
  disabled?: boolean;
  /** Navigation href — renders an `<a>` when set, otherwise a `<button>` */
  href?: string;
  /**
   * Relationship of the linked URL (`rel` attribute on the inner `<a>`).
   * Only applies when `href` is set.
   */
  rel?: string;
  /**
   * Browsing context for the link (`target` attribute on the inner `<a>`).
   * Only applies when `href` is set.
   */
  target?: string;
};

/**
 * `bit-sidebar-item` — An individual navigation item in a `bit-sidebar`.
 *
 * Renders as an `<a>` when `href` is provided, otherwise as a `<button>`.
 * Marks the active page via `aria-current="page"` when the `active` attribute is set.
 *
 * @element bit-sidebar-item
 *
 * @attr {string} href - Link URL; renders an anchor when set
 * @attr {boolean} active - Marks the item as the current page
 * @attr {boolean} disabled - Disables the item
 * @attr {string} rel - Anchor `rel` attribute (links only)
 * @attr {string} target - Anchor `target` attribute (links only)
 *
 * @slot - Label text
 * @slot icon - Leading icon
 * @slot end - Trailing content (badge, shortcut, arrow, etc.)
 *
 * @part item - The inner anchor or button element
 * @part item-icon - The icon wrapper
 * @part item-label - The label wrapper
 * @part item-end - The trailing content wrapper
 *
 * @cssprop --sidebar-item-color - Default text color
 * @cssprop --sidebar-item-hover-bg - Hover background
 * @cssprop --sidebar-item-hover-color - Hover text color
 * @cssprop --sidebar-item-active-bg - Active background
 * @cssprop --sidebar-item-active-color - Active text color
 * @cssprop --sidebar-item-indicator - Active indicator bar color
 *
 * @example
 * ```html
 * <bit-sidebar-item href="/dashboard" active>
 *   <span slot="icon">🏠</span>
 *   Dashboard
 * </bit-sidebar-item>
 *
 * <bit-sidebar-item href="/users">
 *   <span slot="icon">👤</span>
 *   Users
 *   <bit-badge slot="end" color="primary">3</bit-badge>
 * </bit-sidebar-item>
 * ```
 */
export const SIDEBAR_ITEM_TAG = define('bit-sidebar-item', ({ host }) => {
  const slots = defineSlots<{ default: unknown; end: unknown; icon: unknown }>();
  const hasIcon = computed(() => slots.has('icon').value);
  const hasEnd = computed(() => slots.has('end').value);

  const props = defineProps<BitSidebarItemProps>({
    active: { default: false },
    disabled: { default: false },
    href: { default: undefined },
    rel: { default: undefined },
    target: { default: undefined },
  });

  const sidebarCtx = inject(SIDEBAR_CTX, undefined);

  effect(() => {
    host.toggleAttribute('sidebar-collapsed', sidebarCtx?.collapsed.value ?? false);
  });

  const isLink = computed(() => !!props.href.value);

  return {
    styles: [coarsePointerMixin, itemStyles],
    template: html`
      ${() =>
        isLink.value
          ? html`
              <a
                class="item"
                part="item"
                href="${() => props.href.value}"
                :rel="${() => props.rel.value ?? null}"
                :target="${() => props.target.value ?? null}"
                :aria-current="${() => (props.active.value ? 'page' : null)}"
                :aria-disabled="${() => (props.disabled.value ? 'true' : null)}"
                tabindex="${() => (props.disabled.value ? '-1' : null)}">
                <span class="item-icon" part="item-icon" ?hidden=${() => !hasIcon.value} aria-hidden="true">
                  <slot name="icon"></slot>
                </span>
                <span class="item-label" part="item-label"><slot></slot></span>
                <span class="item-end" part="item-end" ?hidden=${() => !hasEnd.value}>
                  <slot name="end"></slot>
                </span>
              </a>
            `
          : html`
              <button
                class="item"
                part="item"
                type="button"
                :aria-current="${() => (props.active.value ? 'page' : null)}"
                :disabled="${() => props.disabled.value || null}">
                <span class="item-icon" part="item-icon" ?hidden=${() => !hasIcon.value} aria-hidden="true">
                  <slot name="icon"></slot>
                </span>
                <span class="item-label" part="item-label"><slot></slot></span>
                <span class="item-end" part="item-end" ?hidden=${() => !hasEnd.value}>
                  <slot name="end"></slot>
                </span>
              </button>
            `}
    `,
  };
});
