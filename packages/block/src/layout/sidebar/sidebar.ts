import { coarsePointerMixin, reducedMotionMixin } from '../../styles';
import { computeSafeRel } from '../../utils';
import '../../content/icon/icon';

import {
  define,
  computed,
  createContext,
  html,
  inject,
  provide,
  signal,
  type ReadonlySignal,
  watch,
  onMounted,
  prop,
} from '@vielzeug/craft';
import { resizeObserver } from '@vielzeug/craft/observers';

// ─── Types ────────────────────────────────────────────────────────────────

type SidebarVariant = 'floating' | 'inset';
type SidebarCollapseSource = 'api' | 'responsive' | 'toggle';
type SidebarMobileSource = 'api' | 'responsive' | 'toggle';
type SidebarMode = 'bottom-nav' | 'collapsed' | 'default';

type BottomNavItem = {
  active: boolean;
  disabled: boolean;
  href?: string;
  iconName?: string;
  label: string;
  source: HTMLElement;
};

const parseMaxWidthPx = (query: string | undefined): number | undefined => {
  const value = String(query ?? '').trim();

  if (!value) return undefined;

  const match = /max-width\s*:\s*([0-9]+(?:\.[0-9]+)?)px/i.exec(value);

  if (!match) return undefined;

  const parsed = Number.parseFloat(match[1]);

  return Number.isFinite(parsed) ? parsed : undefined;
};

const resolveContainerElement = (el: HTMLElement): HTMLElement | null => {
  let container = el.parentElement;

  while (container?.tagName.toLowerCase() === 'bit-grid-item') {
    container = container.parentElement;
  }

  return container;
};

const readContainerWidth = (el: HTMLElement): number => {
  const parentWidth = resolveContainerElement(el)?.clientWidth ?? 0;

  if (parentWidth > 0) return parentWidth;

  return el.offsetWidth;
};

/** Context provided by `bit-sidebar` to its `bit-sidebar-group` and `bit-sidebar-item` children. */
export type SidebarContext = {
  collapsed: ReadonlySignal<boolean>;
  mobileOpen: ReadonlySignal<boolean>;
  mode: ReadonlySignal<SidebarMode>;
  variant: ReadonlySignal<SidebarVariant | undefined>;
};

/** Injection key for the sidebar context. */
export const SIDEBAR_CTX = createContext<SidebarContext>('SidebarContext');

// ─── bit-sidebar styles ──────────────────────────────────────────────────────

import sidebarStyles from './sidebar.css?inline';

/** bit-sidebar element interface */
export type SidebarElement = HTMLElement &
  BitSidebarProps & {
    /** Close the drawer in bottom-nav mode. */
    closeMobile(): void;
    /** Open the drawer in bottom-nav mode. */
    openMobile(): void;
    /** Set collapsed state imperatively. */
    setCollapsed(next: boolean): void;
    /** Toggle between collapsed and expanded. */
    toggle(): void;
    /** Toggle the drawer in bottom-nav mode. */
    toggleMobile(): void;
  };

/** Sidebar component properties */

export type BitSidebarEvents = {
  'collapsed-change': { collapsed: boolean; source: SidebarCollapseSource };
  'mobile-open-change': { open: boolean; source: SidebarMobileSource };
};

export type BitSidebarGroupEvents = {
  'open-change': { open: boolean };
};

export type BitSidebarProps = {
  /** CSS media query that switches the sidebar to bottom navigation mode */
  'bottom-nav-at'?: string;
  /** Controlled collapsed state */
  collapsed?: boolean;
  /** Whether the sidebar supports collapsing */
  collapsible?: boolean;
  /** Evaluate responsive and bottom-nav breakpoints against container width only. */
  'container-breakpoints'?: boolean;
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
 * @fires collapsed-change - Fired when collapsed state changes
 *
 * @slot header - Branding or logo content above the nav
 * @slot - Navigation content (bit-sidebar-group / bit-sidebar-item)
 * @slot footer - Footer content below the nav (user info, settings, etc.)
 *
 * @cssprop --sidebar-width - Expanded sidebar width (default: 16rem)
 * @cssprop --sidebar-collapsed-width - Collapsed sidebar width (default: 3.5rem)
 * @cssprop --sidebar-bg - Sidebar background color
 * @cssprop --sidebar-border-color - Border color
 *
 * @part mobile-backdrop - Backdrop shown for mobile overlays.
 * @part nav - Navigation container.
 * @part header - Header container.
 * @part toggle-btn - Shadow part for the `toggle-btn` element.
 * @part content - Content container.
 * @part footer - Footer container.
 * @part bottom-bar - Bottom bar container.
 * @part group - Group container.
 * @part group-header - Group header container.
 * @part group-icon - Group icon container.
 * @part group-label - Group label container.
 * @part group-items - Group items container.
 * @part item-icon - Leading item icon container.
 * @part item-label - Item label container.
 * @part item-end - Trailing item content container.
 * @part item - Item root element.
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
    'bottom-nav-at': prop.string(),
    collapsed: prop.bool(false),
    collapsible: prop.bool(false),
    'container-breakpoints': prop.bool(false),
    'default-collapsed': prop.bool(false),
    label: prop.string('Sidebar navigation'),
    responsive: prop.string(),
    variant: prop.string<SidebarVariant>(),
  },
  setup(props, { bind, el, emit, slots }) {
    const hasHeader = () => slots.has('header').value;
    const hasFooter = () => slots.has('footer').value;
    const hasLogo = () => slots.has('logo').value;

    const isControlled = signal(el.hasAttribute('collapsed'));
    const collapsedState = signal(isControlled.value ? el.hasAttribute('collapsed') : props['default-collapsed'].value);
    const isBottomNav = signal(false);
    const isMobileOpen = signal(false);
    const bottomNavItems = signal<BottomNavItem[]>([]);
    const responsiveMediaMatches = signal(false);
    const responsiveSizeMatches = signal(false);
    const responsiveMaxWidthPx = signal<number | undefined>(parseMaxWidthPx(props.responsive.value));
    const hasResponsiveQuery = signal(Boolean(String(props.responsive.value ?? '').trim()));
    const bottomNavMediaMatches = signal(false);
    const bottomNavSizeMatches = signal(false);
    const bottomNavMaxWidthPx = signal<number | undefined>(parseMaxWidthPx(props['bottom-nav-at'].value));
    const isPreviewMode = signal(false);

    const isCollapsed = () => collapsedState.value;
    const mode = computed<SidebarMode>(() => {
      if (isBottomNav.value) return 'bottom-nav';

      return collapsedState.value ? 'collapsed' : 'default';
    });

    const applyResponsiveState = () => {
      const useContainerBreakpoints = props['container-breakpoints'].value;
      const responsiveMatched = useContainerBreakpoints
        ? responsiveSizeMatches.value
        : responsiveMediaMatches.value || responsiveSizeMatches.value;
      const bottomMatched = useContainerBreakpoints
        ? bottomNavSizeMatches.value
        : bottomNavMediaMatches.value || bottomNavSizeMatches.value;

      isBottomNav.value = bottomMatched;

      if (!bottomMatched) {
        setMobileOpen(false, 'responsive');
      }

      if (hasResponsiveQuery.value) {
        setCollapsed(responsiveMatched, 'responsive');
      }
    };

    const readBottomNavItems = () => {
      const next = slots
        .elements()
        .value.filter(
          (el): el is HTMLElement => el instanceof HTMLElement && el.tagName.toLowerCase() === 'bit-sidebar-item',
        )
        .map((el, index) => {
          const iconSlotEl =
            (el.querySelector(':scope > [slot="icon"]') as HTMLElement | null) ??
            (el.querySelector('[slot="icon"]') as HTMLElement | null);
          const directIconName =
            iconSlotEl?.tagName.toLowerCase() === 'bit-icon' ? iconSlotEl.getAttribute('name') : null;
          const nestedIconName = iconSlotEl?.querySelector('bit-icon')?.getAttribute('name') ?? null;
          const rawLabel = (el.textContent ?? '').trim();

          return {
            active: el.hasAttribute('active'),
            disabled: el.hasAttribute('disabled'),
            href: el.getAttribute('href') ?? undefined,
            iconName: directIconName ?? nestedIconName ?? undefined,
            label: rawLabel || `Item ${index + 1}`,
            source: el,
          } satisfies BottomNavItem;
        });

      bottomNavItems.value = next;
    };

    provide(SIDEBAR_CTX, {
      collapsed: computed(() => !isBottomNav.value && collapsedState.value) as ReadonlySignal<boolean>,
      mobileOpen: computed(() => isBottomNav.value && isMobileOpen.value) as ReadonlySignal<boolean>,
      mode: mode as ReadonlySignal<SidebarMode>,
      variant: props.variant,
    });

    const setCollapsed = (next: boolean, source: SidebarCollapseSource) => {
      if (isCollapsed() === next) return;

      if (!isControlled.value) {
        collapsedState.value = next;
      }

      emit('collapsed-change', { collapsed: next, source });
    };

    const setMobileOpen = (next: boolean, source: SidebarMobileSource) => {
      const open = Boolean(next);

      if (!isBottomNav.value) {
        if (isMobileOpen.value) {
          isMobileOpen.value = false;
        }

        return;
      }

      if (isMobileOpen.value === open) return;

      isMobileOpen.value = open;
      emit('mobile-open-change', { open, source });
    };

    const doToggle = () => {
      setCollapsed(!isCollapsed(), 'toggle');
    };

    bind({
      attr: {
        'data-bottom-nav': () => (isBottomNav.value ? true : undefined),
        'data-collapsed': () => (isCollapsed() && !isBottomNav.value ? true : undefined),
        'data-mobile-open': () => (isBottomNav.value && isMobileOpen.value ? true : undefined),
        'data-preview-mode': () => (isPreviewMode.value ? true : undefined),
      },
    });

    onMounted(() => {
      const sidebarEl = el as SidebarElement;

      sidebarEl.setCollapsed = (next) => setCollapsed(Boolean(next), 'api');
      sidebarEl.toggle = doToggle;
      sidebarEl.openMobile = () => setMobileOpen(true, 'api');
      sidebarEl.closeMobile = () => setMobileOpen(false, 'api');
      sidebarEl.toggleMobile = () => setMobileOpen(!isMobileOpen.value, 'toggle');

      // Suppress transitions during initial layout so the sidebar doesn't
      // animate from a collapsed/0 state before the first ResizeObserver fires.
      el.setAttribute('data-no-transition', '');

      let transitionUnlocked = false;
      const unlockTransition = () => {
        if (transitionUnlocked) return;

        transitionUnlocked = true;
        el.removeAttribute('data-no-transition');
      };

      // Fallback: unlock after two frames in case ResizeObserver doesn't fire.
      requestAnimationFrame(() => requestAnimationFrame(unlockTransition));

      let mediaCleanup: (() => void) | undefined;
      let bottomNavCleanup: (() => void) | undefined;
      const itemObservers = new Map<HTMLElement, MutationObserver>();
      const observer = new MutationObserver(() => {
        if (!el.hasAttribute('collapsed') && !isControlled.value) return;

        isControlled.value = true;
        collapsedState.value = el.hasAttribute('collapsed');
      });

      observer.observe(el, {
        attributeFilter: ['collapsed'],
        attributes: true,
      });

      watch(
        props.responsive,
        (query) => {
          mediaCleanup?.();
          mediaCleanup = undefined;

          const mediaQuery = String(query ?? '').trim();

          hasResponsiveQuery.value = Boolean(mediaQuery);
          responsiveMaxWidthPx.value = parseMaxWidthPx(mediaQuery);
          responsiveMediaMatches.value = false;

          const width = readContainerWidth(el);

          responsiveSizeMatches.value =
            width > 0 && responsiveMaxWidthPx.value != null ? width <= responsiveMaxWidthPx.value : false;
          applyResponsiveState();

          // For parseable max-width queries, keep behavior container-driven.
          // This avoids preview viewport controls being overridden by window width.
          if (props['container-breakpoints'].value && responsiveMaxWidthPx.value != null) {
            return;
          }

          if (!mediaQuery) {
            return;
          }

          const mql = window.matchMedia(mediaQuery);
          const onChange = (event: MediaQueryListEvent) => {
            responsiveMediaMatches.value = event.matches;
            applyResponsiveState();
          };

          responsiveMediaMatches.value = mql.matches;
          applyResponsiveState();
          mql.addEventListener('change', onChange);

          mediaCleanup = () => {
            mql.removeEventListener('change', onChange);
          };
        },
        { immediate: true },
      );

      watch(
        props['bottom-nav-at'],
        (query) => {
          bottomNavCleanup?.();
          bottomNavCleanup = undefined;

          const mediaQuery = String(query ?? '').trim();

          bottomNavMaxWidthPx.value = parseMaxWidthPx(mediaQuery);
          bottomNavMediaMatches.value = false;

          const width = readContainerWidth(el);

          bottomNavSizeMatches.value =
            width > 0 && bottomNavMaxWidthPx.value != null ? width <= bottomNavMaxWidthPx.value : false;
          applyResponsiveState();

          // For parseable max-width queries, keep behavior container-driven.
          // This avoids preview viewport controls being overridden by window width.
          if (props['container-breakpoints'].value && bottomNavMaxWidthPx.value != null) {
            return;
          }

          if (!mediaQuery) {
            return;
          }

          const mql = window.matchMedia(mediaQuery);
          const onChange = (event: MediaQueryListEvent) => {
            bottomNavMediaMatches.value = event.matches;
            applyResponsiveState();
          };

          bottomNavMediaMatches.value = mql.matches;
          applyResponsiveState();

          mql.addEventListener('change', onChange);
          bottomNavCleanup = () => {
            mql.removeEventListener('change', onChange);
          };
        },
        { immediate: true },
      );

      const stopResizeEffect =
        typeof ResizeObserver === 'function'
          ? (() => {
              const hostSize = resizeObserver(el);
              const wrapperEl = el.parentElement;
              const containerEl = resolveContainerElement(el);
              const wrapperSize = wrapperEl ? resizeObserver(wrapperEl) : undefined;
              const parentSize = containerEl && containerEl !== wrapperEl ? resizeObserver(containerEl) : undefined;
              let rafId: number | undefined;

              const onResize = () => {
                cancelAnimationFrame(rafId!);
                rafId = requestAnimationFrame(() => {
                  const resolvedContainer = resolveContainerElement(el);
                  const width = readContainerWidth(el);
                  const responsiveWasMatched = responsiveSizeMatches.value;
                  const bottomNavWasMatched = bottomNavSizeMatches.value;
                  const parentWidth = resolvedContainer?.clientWidth ?? 0;

                  isPreviewMode.value = parentWidth > 0 && parentWidth < window.innerWidth;

                  responsiveSizeMatches.value =
                    width > 0 && responsiveMaxWidthPx.value != null ? width <= responsiveMaxWidthPx.value : false;
                  bottomNavSizeMatches.value =
                    width > 0 && bottomNavMaxWidthPx.value != null ? width <= bottomNavMaxWidthPx.value : false;

                  if (
                    responsiveWasMatched !== responsiveSizeMatches.value ||
                    bottomNavWasMatched !== bottomNavSizeMatches.value
                  ) {
                    applyResponsiveState();
                  }

                  unlockTransition();
                });
              };

              return watch(
                computed(() => [
                  hostSize.value.width,
                  hostSize.value.height,
                  wrapperSize?.value.width,
                  wrapperSize?.value.height,
                  parentSize?.value.width,
                  parentSize?.value.height,
                ]),
                onResize,
              );
            })()
          : undefined;

      const bindItemObservers = (items: HTMLElement[]) => {
        const set = new Set(items);

        for (const [item, cleanup] of itemObservers) {
          if (set.has(item)) continue;

          cleanup.disconnect();
          itemObservers.delete(item);
        }

        for (const item of items) {
          if (itemObservers.has(item)) continue;

          const itemObserver = new MutationObserver(() => {
            // Only update if in bottom-nav mode to minimize re-renders
            if (isBottomNav.value) {
              readBottomNavItems();
            }
          });

          // Only watch attributes that affect bottom-nav rendering; skip childList/subtree/characterData
          itemObserver.observe(item, {
            attributeFilter: ['active', 'disabled', 'href'],
            attributes: true,
          });
          itemObservers.set(item, itemObserver);
        }
      };

      watch(
        slots.elements(),
        (elements) => {
          const directItems = elements.filter(
            (el): el is HTMLElement => el instanceof HTMLElement && el.tagName.toLowerCase() === 'bit-sidebar-item',
          );

          bindItemObservers(directItems);
          readBottomNavItems();
        },
        { immediate: true },
      );

      return () => {
        observer.disconnect();
        mediaCleanup?.();
        bottomNavCleanup?.();
        stopResizeEffect?.();

        for (const itemObserver of itemObservers.values()) {
          itemObserver.disconnect();
        }

        itemObservers.clear();
      };
    });

    return html`
      <button
        class="mobile-backdrop"
        part="mobile-backdrop"
        type="button"
        aria-label="Close sidebar"
        ?hidden=${() => !isBottomNav.value || !isMobileOpen.value}
        @click=${() => setMobileOpen(false, 'toggle')}></button>
      <nav aria-label="${props.label}" part="nav">
        <div class="sidebar-header" part="header" ?hidden=${() => !hasHeader() && !props.collapsible.value}>
          <span class="sidebar-logo" ?hidden=${() => !hasLogo()}>
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
            aria-label="${() => (isCollapsed() ? 'Expand sidebar' : 'Collapse sidebar')}"
            aria-expanded="${() => !isCollapsed()}"
            @click="${doToggle}">
            <span class="toggle-icon" aria-hidden="true">
              <bit-icon name="chevron-left" size="16" stroke-width="2" aria-hidden="true"></bit-icon>
            </span>
          </button>
        </div>
        <div class="sidebar-content" part="content">
          <slot></slot>
        </div>
        <div class="sidebar-footer" part="footer" ?hidden=${() => !hasFooter()}>
          <slot name="footer"></slot>
        </div>
      </nav>

      <div class="bottom-bar" part="bottom-bar" ?hidden=${() => !isBottomNav.value}>
        ${() =>
          bottomNavItems.value.map((item) => {
            const className = `bottom-tab${item.active ? ' bottom-tab-active' : ''}`;

            if (item.href && !item.disabled) {
              return html`
                <a
                  class="${className}"
                  href="${item.href}"
                  aria-current="${item.active ? 'page' : null}"
                  data-active="${item.active ? 'true' : null}">
                  <span class="bottom-tab-icon" aria-hidden="true" ?hidden=${() => !item.iconName}>
                    <bit-icon :name="${item.iconName}" size="18" stroke-width="2"></bit-icon>
                  </span>
                  <span class="bottom-tab-label">${item.label}</span>
                </a>
              `;
            }

            return html`
              <button
                class="${className}"
                type="button"
                ?disabled=${item.disabled}
                aria-current="${item.active ? 'page' : null}"
                data-active="${item.active ? 'true' : null}"
                @click=${() => item.source.click()}>
                <span class="bottom-tab-icon" aria-hidden="true" ?hidden=${() => !item.iconName}>
                  <bit-icon :name="${item.iconName}" size="18" stroke-width="2"></bit-icon>
                </span>
                <span class="bottom-tab-label">${item.label}</span>
              </button>
            `;
          })}
      </div>
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
 * @fires open-change - Fired when the group open state changes (collapsible groups only)
 *
 * @slot - Navigation items (`bit-sidebar-item`)
 * @slot icon - Icon displayed before the label
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
    collapsible: prop.bool(false),
    'default-open': prop.bool(true),
    label: prop.string(),
    open: {
      default: undefined as boolean | undefined,
      parse: (value: string | null) => (value == null ? undefined : value === '' || value === 'true'),
      reflect: false,
    },
  },
  setup(props, { bind, el: _el, slots }) {
    const hasIcon = () => slots.has('icon').value;
    const sidebarCtx = inject(SIDEBAR_CTX);

    bind({
      attr: {
        'sidebar-bottom-nav': () =>
          sidebarCtx?.mode.value === 'bottom-nav' && !sidebarCtx?.mobileOpen.value ? true : undefined,
        'sidebar-collapsed': () => (sidebarCtx?.collapsed.value ? true : undefined),
      },
    });

    const isControlled = () => props.open.value !== undefined;
    const openState = signal(props['default-open'].value);
    const isOpen = computed(() => {
      if (!props.collapsible.value) return true;

      if (isControlled()) return props.open.value ?? false;

      return openState.value;
    });

    watch(props.open, (value) => {
      if (value === undefined) return;

      openState.value = value;
    });

    bind({
      attr: {
        open: () => (isOpen.value ? true : undefined),
      },
    });

    return html`
      <details class="group" part="group" ?open=${isOpen}>
        <summary
          class="group-header"
          part="group-header"
          aria-expanded="${() => (props.collapsible.value ? String(props.open.value) : null)}"
          @click=${(e: MouseEvent) => {
            if (!props.collapsible.value) {
              e.preventDefault();
            }
          }}>
          <span class="group-icon" part="group-icon" ?hidden=${() => !hasIcon()} aria-hidden="true">
            <slot name="icon"></slot>
          </span>
          <span class="group-label" part="group-label">${props.label}</span>
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
 * @cssprop --sidebar-item-color - Default text color
 * @cssprop --sidebar-item-hover-bg - Hover background
 * @cssprop --sidebar-item-hover-color - Hover text color
 * @cssprop --sidebar-item-active-bg - Active background
 * @cssprop --sidebar-item-active-color - Active text color
 * @cssprop --sidebar-item-indicator - Active indicator bar color
 *
 * @part item - The inner anchor or button element
 * @part item-icon - The icon wrapper
 * @part item-label - The label wrapper
 * @part item-end - The trailing content wrapper
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
    active: prop.bool(false),
    disabled: prop.bool(false),
    href: prop.string(),
    rel: prop.string(),
    target: prop.string(),
  },
  setup(props, { bind, el: _el, slots }) {
    const hasIcon = () => slots.has('icon').value;
    const hasEnd = () => slots.has('end').value;
    const sidebarCtx = inject(SIDEBAR_CTX);

    bind({
      attr: {
        'sidebar-bottom-nav': () =>
          sidebarCtx?.mode.value === 'bottom-nav' && !sidebarCtx?.mobileOpen.value ? true : undefined,
        'sidebar-collapsed': () => (sidebarCtx?.collapsed.value ? true : undefined),
      },
    });

    const isLink = () => !!props.href.value && !props.disabled.value;

    // Prevent reverse tabnapping: auto-inject noopener + noreferrer for _blank links.
    const effectiveRel = computed(() => computeSafeRel(props.rel.value, props.target.value));

    const renderItemContent = () => html`
      <span class="item-icon" part="item-icon" ?hidden=${() => !hasIcon()} aria-hidden="true">
        <slot name="icon"></slot>
      </span>
      <span class="item-label" part="item-label"><slot></slot></span>
      <span class="item-end" part="item-end" ?hidden=${() => !hasEnd()}>
        <slot name="end"></slot>
      </span>
    `;

    return html`
      ${() => {
        if (isLink()) {
          return html`
            <a
              class="item"
              part="item"
              href="${props.href}"
              :rel="${effectiveRel}"
              :target="${props.target}"
              aria-current="${() => (props.active.value ? 'page' : null)}">
              ${renderItemContent()}
            </a>
          `;
        }

        if (props.disabled.value) {
          return html`
            <div
              class="item"
              part="item"
              aria-disabled="true"
              tabindex="-1"
              aria-current="${() => (props.active.value ? 'page' : null)}">
              ${renderItemContent()}
            </div>
          `;
        }

        return html`
          <button
            class="item"
            part="item"
            type="button"
            ?disabled="${props.disabled}"
            aria-current="${() => (props.active.value ? 'page' : null)}">
            ${renderItemContent()}
          </button>
        `;
      }}
    `;
  },
  styles: [coarsePointerMixin, itemStyles],
});
