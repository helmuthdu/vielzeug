import {
  define,
  computed,
  createContext,
  html,
  inject,
  onMount,
  provide,
  signal,
  type ReadonlySignal,
  watch,
} from '@vielzeug/craftit';

import '../../content/icon/icon';
import { coarsePointerMixin, reducedMotionMixin } from '../../styles';

// ─── Types ────────────────────────────────────────────────────────────────

type SidebarVariant = 'floating' | 'inset';
type SidebarCollapseSource = 'api' | 'responsive' | 'toggle';

/** Context provided by `bit-sidebar` to its `bit-sidebar-group` and `bit-sidebar-item` children. */
export type SidebarContext = {
  collapsed: ReadonlySignal<boolean>;
  variant: ReadonlySignal<SidebarVariant | undefined>;
};

/** Injection key for the sidebar context. */
export const SIDEBAR_CTX = createContext<SidebarContext>('SidebarContext');

// ─── bit-sidebar styles ──────────────────────────────────────────────────────

import sidebarStyles from './sidebar.css?inline';

/** bit-sidebar element interface */
export type SidebarElement = HTMLElement &
  BitSidebarProps & {
    /** Set collapsed state imperatively. */
    setCollapsed(next: boolean): void;
    /** Toggle between collapsed and expanded. */
    toggle(): void;
  };

/** Sidebar component properties */

export type BitSidebarEvents = {
  'collapsed-change': { collapsed: boolean; source: SidebarCollapseSource };
};

export type BitSidebarGroupEvents = {
  'open-change': { open: boolean };
};

export type BitSidebarProps = {
  /** Controlled collapsed state */
  collapsed?: boolean;
  /** Whether the sidebar supports collapsing */
  collapsible?: boolean;
  /** Initial collapsed state in uncontrolled mode */
  'default-collapsed'?: boolean;
  /**
   * Accessible label for the navigation landmark.
   * Use to distinguish multiple navigation regions on a page.
   * @default 'Sidebar navigation'
   */
  label?: string;
  /**
   * CSS media query that, when it matches, automatically collapses the sidebar.
   * Unset by default — no automatic collapse.
   * @example 'responsive="(max-width: 768px)"'
   */
  responsive?: string;
  /** Visual style variant */
  variant?: SidebarVariant;
};

/**
 * `bit-sidebar` — A collapsible navigation sidebar with group and item support.
 *
 * @element bit-sidebar
 *
 * @attr {boolean} collapsed - Controlled collapsed state
 * @attr {boolean} default-collapsed - Initial collapsed state for uncontrolled sidebars
 * @attr {boolean} collapsible - Show the collapse toggle button
 * @attr {string} variant - Visual variant: 'floating' | 'inset'
 * @attr {string} label - Accessible aria-label for the nav landmark
 *
 * @slot header - Branding or logo content above the nav
 * @slot - Navigation content (bit-sidebar-group / bit-sidebar-item)
 * @slot footer - Footer content below the nav (user info, settings, etc.)
 *
 * @fires collapsed-change - Fired when collapsed state changes
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
 *
 * <!-- Auto-collapse on mobile -->
 * <bit-sidebar collapsible responsive="(max-width: 768px)">...</bit-sidebar>
 * ```
 */
export const SIDEBAR_TAG = define<BitSidebarProps, BitSidebarEvents>('bit-sidebar', {
  props: {
    collapsed: { default: undefined, type: Boolean },
    collapsible: false,
    'default-collapsed': false,
    label: 'Sidebar navigation',
    responsive: undefined,
    variant: undefined,
  },
  setup({ emit, host, props, slots }) {
    const hasHeader = computed(() => slots.has('header').value);
    const hasFooter = computed(() => slots.has('footer').value);
    const hasLogo = computed(() => slots.has('logo').value);

    const isControlled = signal(host.el.hasAttribute('collapsed'));
    const collapsedState = signal(
      isControlled.value ? host.el.hasAttribute('collapsed') : props['default-collapsed'].value,
    );

    const isCollapsed = computed(() => collapsedState.value);

    provide(SIDEBAR_CTX, {
      collapsed: isCollapsed as ReadonlySignal<boolean>,
      variant: props.variant,
    });

    const setCollapsed = (next: boolean, source: SidebarCollapseSource) => {
      if (isCollapsed.value === next) return;

      if (!isControlled.value) {
        collapsedState.value = next;
      }

      emit('collapsed-change', { collapsed: next, source });
    };
    const doToggle = () => {
      setCollapsed(!isCollapsed.value, 'toggle');
    };

    host.bind('attr', {
      'data-collapsed': () => (isCollapsed.value ? true : undefined),
    });

    onMount(() => {
      const el = host.el as SidebarElement;

      el.setCollapsed = (next) => setCollapsed(Boolean(next), 'api');
      el.toggle = doToggle;

      let mediaCleanup: (() => void) | undefined;
      const observer = new MutationObserver(() => {
        if (!host.el.hasAttribute('collapsed') && !isControlled.value) return;

        isControlled.value = true;
        collapsedState.value = host.el.hasAttribute('collapsed');
      });

      observer.observe(host.el, {
        attributeFilter: ['collapsed'],
        attributes: true,
      });

      watch(
        props.responsive,
        (query) => {
          mediaCleanup?.();
          mediaCleanup = undefined;

          const mediaQuery = String(query ?? '').trim();

          if (!mediaQuery) return;

          const mql = window.matchMedia(mediaQuery);
          const onChange = (event: MediaQueryListEvent) => {
            setCollapsed(event.matches, 'responsive');
          };

          setCollapsed(mql.matches, 'responsive');
          mql.addEventListener('change', onChange);

          mediaCleanup = () => {
            mql.removeEventListener('change', onChange);
          };
        },
        { immediate: true },
      );

      return () => {
        observer.disconnect();
        mediaCleanup?.();
      };
    });

    return html`
      <nav aria-label="${() => props.label.value}" part="nav">
        <div class="sidebar-header" part="header" ?hidden=${() => !hasHeader.value && !props.collapsible.value}>
          <span class="sidebar-logo" ?hidden=${() => !hasLogo.value}>
            <slot name="logo"></slot>
          </span>
          <span class="sidebar-header-content">
            <slot name="header"></slot>
          </span>
          <button
            class="toggle-btn"
            part="toggle-btn"
            type="button"
            ?hidden=${() => !props.collapsible.value}
            aria-label="${() => (isCollapsed.value ? 'Expand sidebar' : 'Collapse sidebar')}"
            aria-expanded="${() => String(!isCollapsed.value)}"
            @click="${doToggle}">
            <span class="toggle-icon" aria-hidden="true">
              <bit-icon name="chevron-left" size="16" stroke-width="2" aria-hidden="true"></bit-icon>
            </span>
          </button>
        </div>
        <div class="sidebar-content" part="content">
          <slot></slot>
        </div>
        <div class="sidebar-footer" part="footer" ?hidden=${() => !hasFooter.value}>
          <slot name="footer"></slot>
        </div>
      </nav>
    `;
  },
  styles: [coarsePointerMixin, reducedMotionMixin, sidebarStyles],
});

// ─── bit-sidebar-group styles ────────────────────────────────────────────────

import groupStyles from './sidebar-group.css?inline';

/** Sidebar group properties */
export type BitSidebarGroupProps = {
  /** Whether this group can be collapsed */
  collapsible?: boolean;
  /** Initial open state in uncontrolled mode */
  'default-open'?: boolean;
  /** Accessible label for the group */
  label?: string;
  /** Controlled open state */
  open?: boolean;
};

/**
 * `bit-sidebar-group` — A labelled section within `bit-sidebar`.
 *
 * @element bit-sidebar-group
 *
 * @attr {string} label - Group label text
 * @attr {boolean} collapsible - Whether this group can be toggled open/closed
 * @attr {boolean} open - Controlled expanded state
 * @attr {boolean} default-open - Initial expanded state in uncontrolled mode
 *
 * @slot - Navigation items (`bit-sidebar-item`)
 * @slot icon - Icon displayed before the label
 *
 * @fires open-change - Fired when the group open state changes (collapsible groups only)
 *
 * @example
 * ```html
 * <bit-sidebar-group label="Main" collapsible open>
 *   <bit-sidebar-item href="/home">Home</bit-sidebar-item>
 * </bit-sidebar-group>
 * ```
 */
export const SIDEBAR_GROUP_TAG = define<BitSidebarGroupProps, BitSidebarGroupEvents>('bit-sidebar-group', {
  props: {
    collapsible: false,
    'default-open': true,
    label: '',
    open: { default: undefined, type: Boolean },
  },
  setup({ host, props, slots }) {
    const hasIcon = computed(() => slots.has('icon').value);
    const sidebarCtx = inject(SIDEBAR_CTX, undefined);

    host.bind('attr', {
      'sidebar-collapsed': () => (sidebarCtx?.collapsed.value ? true : undefined),
    });

    const isControlled = computed(() => props.open.value !== undefined);
    const openState = signal(props['default-open'].value);
    const isOpen = computed(() => {
      if (!props.collapsible.value) return true;

      if (isControlled.value) return props.open.value ?? false;

      return openState.value;
    });

    watch(props.open, (value) => {
      if (value === undefined) return;

      openState.value = value;
    });

    host.bind('attr', {
      open: () => (isOpen.value ? true : undefined),
    });

    return html`
      <details class="group" part="group" ?open=${() => isOpen.value}>
        <summary
          class="group-header"
          part="group-header"
          :aria-expanded="${() => (props.collapsible.value ? String(props.open.value) : null)}"
          @click=${(e: MouseEvent) => {
            if (!props.collapsible.value) {
              e.preventDefault();
            }
          }}>
          <span class="group-icon" part="group-icon" ?hidden=${() => !hasIcon.value} aria-hidden="true">
            <slot name="icon"></slot>
          </span>
          <span class="group-label" part="group-label">${() => props.label.value}</span>
          <span class="chevron" ?hidden=${() => !props.collapsible.value} aria-hidden="true">
            <bit-icon name="chevron-right" size="12" stroke-width="2" aria-hidden="true"></bit-icon>
          </span>
        </summary>
        <div class="group-items" part="group-items" role="list">
          <slot></slot>
        </div>
      </details>
    `;
  },
  styles: [reducedMotionMixin, groupStyles],
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
export const SIDEBAR_ITEM_TAG = define<BitSidebarItemProps>('bit-sidebar-item', {
  props: {
    active: false,
    disabled: false,
    href: undefined,
    rel: undefined,
    target: undefined,
  },
  setup({ host, props, slots }) {
    const hasIcon = computed(() => slots.has('icon').value);
    const hasEnd = computed(() => slots.has('end').value);
    const sidebarCtx = inject(SIDEBAR_CTX, undefined);

    host.bind('attr', {
      'sidebar-collapsed': () => (sidebarCtx?.collapsed.value ? true : undefined),
    });

    const isLink = computed(() => !!props.href.value && !props.disabled.value);
    const renderItemContent = () => html`
      <span class="item-icon" part="item-icon" ?hidden=${() => !hasIcon.value} aria-hidden="true">
        <slot name="icon"></slot>
      </span>
      <span class="item-label" part="item-label"><slot></slot></span>
      <span class="item-end" part="item-end" ?hidden=${() => !hasEnd.value}>
        <slot name="end"></slot>
      </span>
    `;

    return html`
      ${() => {
        if (isLink.value) {
          return html`
            <a
              class="item"
              part="item"
              href="${() => props.href.value}"
              :rel="${() => props.rel.value ?? null}"
              :target="${() => props.target.value ?? null}"
              :aria-current="${() => (props.active.value ? 'page' : null)}">
              ${renderItemContent()}
            </a>
          `;
        } else if (props.disabled.value) {
          return html` <div class="item" part="item" tabindex="-1" aria-disabled="true">${renderItemContent()}</div> `;
        } else {
          return html`
            <button
              class="item"
              part="item"
              type="button"
              :aria-current="${() => (props.active.value ? 'page' : null)}">
              ${renderItemContent()}
            </button>
          `;
        }
      }}
    `;
  },
  styles: [coarsePointerMixin, itemStyles],
});
