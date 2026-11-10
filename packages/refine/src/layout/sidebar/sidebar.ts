import { captureFocus, type FocusRestorer } from '@vielzeug/focus';
import { createPanGesture, type PanGesture } from '@vielzeug/gesture';
import {
  bind,
  createContext,
  define,
  getHost,
  html,
  inject,
  onCleanup,
  onMounted,
  prop,
  provide,
  useEmit,
  useSlots,
} from '@vielzeug/ore';
import { computed, type Readable, signal, watch } from '@vielzeug/ripple';
import { truncationRevealRef } from '../../core';
import { createBackgroundLock } from '../../overlay/shared/background-lock';
import { projectFling } from '../../shared/fling';
import { touchTargetMixin } from '../../styles';
import { computeSafeRel } from '../../utils';
import { createResizeTracker, createResponsiveMode, type ResizeTracker, type ResponsiveMode } from '../shared';
import sidebarStyles from './sidebar.css?inline';
import groupStyles from './sidebar-group.css?inline';
import itemStyles from './sidebar-item.css?inline';

export { ICON_TAG } from '../../content/icon/icon';

// ─── Types ────────────────────────────────────────────────────────────────

const SIDEBAR_VARIANTS = ['floating', 'inset'] as const;
type SidebarVariant = (typeof SIDEBAR_VARIANTS)[number];
const SIDEBAR_BACKDROPS = ['opaque', 'blur', 'transparent'] as const;
type SidebarBackdrop = (typeof SIDEBAR_BACKDROPS)[number];
type SidebarCollapseSource = 'api' | 'responsive' | 'toggle';
type DrawerSource = 'api' | 'responsive' | 'toggle';
type SidebarMode = 'bottom-nav' | 'collapsed' | 'default';

type BottomNavItem = {
  active: boolean;
  disabled: boolean;
  href?: string;
  iconName?: string;
  label: string;
  source: HTMLElement;
};

/** Context provided by `ore-sidebar` to its `ore-sidebar-group` and `ore-sidebar-item` children. */
export type SidebarContext = {
  closeDrawer: () => void;
  closeOnSelect: Readable<boolean>;
  collapsed: Readable<boolean>;
  drawerOpen: Readable<boolean>;
  mode: Readable<SidebarMode>;
  variant: Readable<SidebarVariant | undefined>;
};

/** Injection key for the sidebar context. */
export const SIDEBAR_CTX = createContext<SidebarContext>('SidebarContext');

// ─── ore-sidebar styles ──────────────────────────────────────────────────────

/** ore-sidebar element interface */
export type SidebarElement = HTMLElement &
  OreSidebarProps & {
    /** Close the drawer. */
    closeDrawer(): void;
    /** Open the drawer. */
    openDrawer(): void;
    /** Set collapsed state imperatively. */
    setCollapsed(next: boolean): void;
    /** Toggle between collapsed and expanded. */
    toggle(): void;
    /** Toggle the drawer. */
    toggleDrawer(): void;
  };

/** Sidebar component properties */

export type OreSidebarEvents = {
  'collapsed-change': { collapsed: boolean; source: SidebarCollapseSource };
  'drawer-change': { open: boolean; source: DrawerSource };
};

export type OreSidebarGroupEvents = {
  'open-change': { open: boolean };
};

export type OreSidebarProps = {
  /** Backdrop style behind the open drawer: 'opaque' (default) | 'blur' | 'transparent' */
  backdrop?: SidebarBackdrop;
  /** CSS media query that switches the sidebar to bottom navigation + drawer mode */
  'bottom-nav-at'?: string;
  /** Close the drawer after a navigation item is activated (default: true) */
  'close-on-select'?: boolean;
  /** Controlled collapsed state */
  collapsed?: boolean;
  /** Whether the sidebar supports collapsing */
  collapsible?: boolean;
  'collapse-label'?: string;
  /** Evaluate responsive and bottom-nav breakpoints against container width only. */
  'container-breakpoints'?: boolean;
  /** Initial collapsed state in uncontrolled mode */
  'default-collapsed'?: boolean;
  /** Drawer-only mode: the sidebar exists solely as the overlay drawer (no inline panel, no bottom bar). */
  drawer?: boolean;
  /** Accessible label for the drawer close button. */
  'drawer-close-label'?: string;
  'expand-label'?: string;
  /**
   * Accessible label for the navigation landmark.
   * Use to distinguish multiple navigation regions on a page.
   * @default 'Sidebar navigation'
   */
  label?: string;
  /**
   * CSS media query that, when it matches, automatically collapses the sidebar.
   * Unset by default: no automatic collapse.
   * @example 'responsive="(max-width: 768px)"'
   */
  responsive?: string;
  /** Visual style variant */
  variant?: SidebarVariant;
};

/**
 * `ore-sidebar`: A collapsible navigation sidebar with group and item support.
 *
 * @element ore-sidebar
 * @element ore-sidebar-group - Labelled group of navigation items
 * @element ore-sidebar-item - Individual navigation link or button
 *
 * @attr {boolean} collapsed - Controlled collapsed state
 * @attr {boolean} default-collapsed - Initial collapsed state for uncontrolled sidebars
 * @attr {boolean} collapsible - Show the collapse toggle button
 * @attr {boolean} drawer - Drawer-only mode: the sidebar exists solely as the overlay drawer
 * @attr {string} backdrop - Backdrop style: none (default, click-to-close only) | 'opaque' | 'blur' | 'transparent'
 * @attr {boolean} close-on-select - Close the drawer after item activation (default: true)
 * @attr {string} variant - Visual variant: 'floating' | 'inset'
 * @attr {string} label - Accessible aria-label for the nav landmark
 *
 * @fires collapsed-change - Fired when collapsed state changes. detail: { collapsed: boolean; source: string }
 * @fires drawer-change - Fired when the drawer open state changes. detail: { open: boolean; source: string }
 *
 * @slot header - Branding or logo content above the nav
 * @slot - Navigation content (ore-sidebar-group / ore-sidebar-item)
 * @slot footer - Footer content below the nav (user info, settings, etc.)
 *
 * @cssprop --sidebar-width - Expanded sidebar width (default: 16rem)
 * @cssprop --sidebar-collapsed-width - Collapsed sidebar width (default: 3.5rem)
 * @cssprop --sidebar-drawer-width - Drawer panel width (default: min(--sidebar-width, 85vw))
 * @cssprop --sidebar-drawer-backdrop-bg - Backdrop color behind the open drawer (default: transparent; the dimming modes use var(--overlay-veil))
 * @cssprop --sidebar-drawer-shadow - Shadow on the open drawer panel (default: shadow-xl)
 * @cssprop --sidebar-bg - Sidebar background color
 * @cssprop --sidebar-border-color - Border color
 *
 * @part drawer-backdrop - Backdrop behind the open drawer (click closes it; dimming is opt-in via `backdrop`).
 * @part drawer-close-btn - Close button shown in the header while the drawer is open (sidebars without header content keep the drawer headerless and close via backdrop, swipe, Escape, or the navbar toggle).
 * @part swipe-handle - Grabber nub on the drawer edge that drag-closes it (touch/mouse pan).
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
 * <ore-sidebar collapsible label="App navigation">
 *   <span slot="header">My App</span>
 *   <ore-sidebar-group label="Main">
 *     <ore-sidebar-item href="/dashboard" active>Dashboard</ore-sidebar-item>
 *     <ore-sidebar-item href="/settings">Settings</ore-sidebar-item>
 *   </ore-sidebar-group>
 * </ore-sidebar>
 *
 * <!-- Auto-collapse on mobile -->
 * <ore-sidebar collapsible responsive="(max-width: 768px)">...</ore-sidebar>
 * ```
 */
export const SIDEBAR_TAG = 'ore-sidebar' as const;
define<OreSidebarProps>(SIDEBAR_TAG, {
  props: {
    backdrop: prop.oneOf(SIDEBAR_BACKDROPS),
    'bottom-nav-at': prop.string(),
    'close-on-select': prop.bool(true),
    'collapse-label': prop.string('Collapse sidebar'),
    collapsed: prop.bool(false),
    collapsible: prop.bool(false),
    'container-breakpoints': prop.bool(false),
    'default-collapsed': prop.bool(false),
    drawer: prop.bool(false),
    'drawer-close-label': prop.string('Close sidebar'),
    'expand-label': prop.string('Expand sidebar'),
    label: prop.string('Sidebar navigation'),
    responsive: prop.string(),
    variant: prop.oneOf(SIDEBAR_VARIANTS),
  },
  setup(props) {
    const el = getHost();
    const emit = useEmit<OreSidebarEvents>();
    const slots = useSlots();

    const hasHeader = () => slots.has('header').value;
    const hasFooter = () => slots.has('footer').value;
    const hasLogo = () => slots.has('logo').value;

    const isControlled = signal(el.hasAttribute('collapsed'));
    const collapsedState = signal(isControlled.value ? el.hasAttribute('collapsed') : props['default-collapsed'].value);
    const isBottomNav = signal(false);
    const isDrawerOpen = signal(false);
    const bottomNavItems = signal<BottomNavItem[]>([]);
    // Declared before `applyResponsiveState` (which reads them) and assigned at the
    // end of `setup()`; always defined by the time bind/render runs.
    let responsiveMode: ResponsiveMode | undefined;
    let bottomNavMode: ResponsiveMode | undefined;
    let resizeTracker: ResizeTracker | undefined;
    // Assigned in `onMounted`; the resize callback reaches it through this reference.
    let unlockTransition: (() => void) | undefined;
    const bgLock = createBackgroundLock();
    let restoreDrawerFocus: FocusRestorer | null = null;

    const isCollapsed = () => collapsedState.value;
    const mode = computed<SidebarMode>(() => {
      if (isBottomNav.value) return 'bottom-nav';

      return collapsedState.value ? 'collapsed' : 'default';
    });

    const applyResponsiveState = () => {
      const responsiveMatched = responsiveMode?.matches.value ?? false;
      const bottomMatched = bottomNavMode?.matches.value ?? false;

      // If the drawer is currently open, stay in bottom-nav mode
      // regardless of the responsive match. This prevents the drawer from
      // disappearing mid-animation or if forced open via the API on desktop.
      // Drawer-only mode keeps the overlay presentation permanently: the panel
      // rests off-screen instead of falling back to a visible inline block.
      if (!isDrawerOpen.value) {
        isBottomNav.value = bottomMatched || Boolean(props.drawer.value);
      }

      if (!bottomMatched && !isDrawerOpen.value && !props.drawer.value) {
        setDrawerOpen(false, 'responsive');
      }

      if (String(props.responsive.value ?? '').trim()) {
        setCollapsed(responsiveMatched, 'responsive');
      }
    };

    const readBottomNavItems = () => {
      if (props.drawer.value) {
        bottomNavItems.value = [];

        return;
      }

      const directItems = slots
        .elements()
        .value.filter(
          (item): item is HTMLElement =>
            item instanceof HTMLElement && item.tagName.toLowerCase() === 'ore-sidebar-item',
        );
      const promotedItems = [...el.querySelectorAll<HTMLElement>('ore-sidebar-item[bottom-nav]')];
      const sourceItems = promotedItems.length > 0 ? promotedItems : directItems;
      const next = sourceItems.map((item, index) => {
        const el = item;
        const iconSlotEl =
          (el.querySelector(':scope > [slot="icon"]') as HTMLElement | null) ??
          (el.querySelector('[slot="icon"]') as HTMLElement | null);
        const directIconName =
          iconSlotEl?.tagName.toLowerCase() === 'ore-icon' ? iconSlotEl.getAttribute('name') : null;
        const nestedIconName = iconSlotEl?.querySelector('ore-icon')?.getAttribute('name') ?? null;
        const rawLabel = (el.textContent ?? '').trim();

        return {
          active: el.hasAttribute('active'),
          disabled: el.hasAttribute('disabled'),
          href: el.getAttribute('href') ?? undefined,
          iconName: directIconName ?? nestedIconName ?? undefined,
          label: el.getAttribute('bottom-nav-label')?.trim() || rawLabel || `Item ${index + 1}`,
          source: el,
        } satisfies BottomNavItem;
      });

      bottomNavItems.value = next;
    };

    provide(SIDEBAR_CTX, {
      closeDrawer: () => setDrawerOpen(false, 'toggle'),
      closeOnSelect: props['close-on-select'],
      collapsed: computed(() => !isBottomNav.value && collapsedState.value) as Readable<boolean>,
      drawerOpen: computed(() => isDrawerOpen.value) as Readable<boolean>,
      mode: mode as Readable<SidebarMode>,
      variant: props.variant,
    });

    const setCollapsed = (next: boolean, source: SidebarCollapseSource) => {
      if (isCollapsed() === next) return;

      if (!isControlled.value) {
        collapsedState.value = next;
      }

      emit('collapsed-change', { collapsed: next, source });
    };

    const setDrawerOpen = (next: boolean, source: DrawerSource) => {
      const open = Boolean(next);

      // Opening the drawer forces the sidebar out of its inline panel into the
      // overlay presentation until the drawer closes again.
      if (open && !isBottomNav.value) {
        isBottomNav.value = true;
      }

      if (isDrawerOpen.value === open) return;

      if (open) {
        restoreDrawerFocus = captureFocus();
        // Inert the background where the DOM structure allows (see createBackgroundLock) and
        // refocus the panel whenever focus escapes the sidebar: together these keep Tab and
        // Escape working on the open drawer even in apps where the page shares one wrapper
        // element and the background cannot be inerted.
        bgLock.lock(el);
      }

      isDrawerOpen.value = open;

      // If closing, re-evaluate responsive state to potentially exit forced bottom-nav mode
      if (!open) {
        bgLock.unlock();
        applyResponsiveState();
        queueMicrotask(() => {
          restoreDrawerFocus?.();
          restoreDrawerFocus = null;
        });
      } else {
        queueMicrotask(() => el.shadowRoot?.querySelector<HTMLElement>('nav')?.focus());
      }

      emit('drawer-change', { open, source });
    };

    const doToggle = () => {
      setCollapsed(!isCollapsed(), 'toggle');
    };

    const sidebarEl = el as SidebarElement;

    sidebarEl.setCollapsed = (next) => setCollapsed(Boolean(next), 'api');
    sidebarEl.toggle = doToggle;
    sidebarEl.openDrawer = () => setDrawerOpen(true, 'api');
    sidebarEl.closeDrawer = () => setDrawerOpen(false, 'api');
    sidebarEl.toggleDrawer = () => setDrawerOpen(!isDrawerOpen.value, 'toggle');

    responsiveMode = createResponsiveMode(el, props.responsive, props['container-breakpoints'], applyResponsiveState);
    bottomNavMode = createResponsiveMode(
      el,
      props['bottom-nav-at'],
      props['container-breakpoints'],
      applyResponsiveState,
    );
    resizeTracker = createResizeTracker(el, () => {
      responsiveMode?.remeasure();
      bottomNavMode?.remeasure();
      unlockTransition?.();
      applyResponsiveState();
    });
    onCleanup(() => {
      responsiveMode?.dispose();
      bottomNavMode?.dispose();
      resizeTracker?.dispose();
    });

    bind({
      attr: {
        'data-bottom-nav': () => (isBottomNav.value ? true : undefined),
        'data-collapsed': () => (isCollapsed() && !isBottomNav.value ? true : undefined),
        'data-drawer-open': () => (isDrawerOpen.value ? true : undefined),
        'data-has-logo': () => (hasLogo() ? true : undefined),
        'data-preview-mode': () => (resizeTracker?.isPreviewMode.value ? true : undefined),
      },
    });

    onMounted(() => {
      // Suppress transitions during initial layout so the sidebar doesn't
      // animate from a collapsed/0 state before the first ResizeObserver fires.
      el.setAttribute('data-no-transition', '');

      let transitionUnlocked = false;
      unlockTransition = () => {
        if (transitionUnlocked) return;

        transitionUnlocked = true;
        el.removeAttribute('data-no-transition');
      };

      // Fallback: unlock after two frames in case ResizeObserver doesn't fire.
      requestAnimationFrame(() => requestAnimationFrame(() => unlockTransition?.()));

      // Re-sync once mounted: the helpers ran at setup, when the host may not be
      // laid out yet; sizes are only trustworthy after mount.
      responsiveMode?.remeasure();
      bottomNavMode?.remeasure();
      applyResponsiveState();
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
      const closeOnEscape = (event: KeyboardEvent) => {
        if (event.key !== 'Escape' || !isDrawerOpen.value) return;

        event.preventDefault();
        setDrawerOpen(false, 'toggle');
      };
      el.addEventListener('keydown', closeOnEscape);

      // Swipe-to-dismiss: the grabber nub on the drawer's trailing edge pans the
      // panel toward its off-screen rest position; releasing past the threshold
      // closes it. Clearing the inline styles lets the CSS transition animate the
      // commit (or the snap-back) from the dragged position without a jump.
      const swipeHandle = el.shadowRoot?.querySelector<HTMLElement>('.swipe-handle');
      let swipe: PanGesture | undefined;

      if (swipeHandle) {
        const isRtl = () => getComputedStyle(el).direction === 'rtl';
        const closingDistance = (distance: number) => (isRtl() ? Math.max(0, distance) : Math.max(0, -distance));
        const snapThreshold = (panel: HTMLElement) => Math.min(96, Math.max(36, panel.offsetWidth * 0.18));
        const dragTranslate = (distance: number) =>
          `translateX(${isRtl() ? Math.max(0, distance) : Math.min(0, distance)}px)`;

        swipe = createPanGesture(swipeHandle, {
          axis: 'x',
          disabled: () => !isDrawerOpen.value,
          onEnd: ({ distance, velocity, reason }) => {
            const panel = el.shadowRoot?.querySelector<HTMLElement>('nav');

            if (!panel) return;

            // Velocity-aware commit: a flick counts like a long drag, a
            // counter-flick cancels (see shared/fling).
            if (reason === 'release' && closingDistance(projectFling(distance, velocity)) >= snapThreshold(panel)) {
              // Continue from the dragged position instead of snapping back to
              // rest: park the panel at its off-screen position (no transition),
              // close, then hand back to CSS once the closed attribute has
              // flushed — its closed transform matches, so the handover is invisible.
              const panelSize = panel.offsetWidth;

              panel.style.transition = 'none';
              panel.style.transform = dragTranslate(isRtl() ? panelSize : -panelSize);
              panel.style.opacity = '0';
              void panel.offsetWidth;
              setDrawerOpen(false, 'toggle');
              queueMicrotask(() => {
                panel.style.transition = '';
                panel.style.transform = '';
                panel.style.opacity = '';
              });

              return;
            }

            panel.style.transition = '';
            panel.style.transform = '';
            panel.style.opacity = '';
          },
          onMove: ({ distance }) => {
            const panel = el.shadowRoot?.querySelector<HTMLElement>('nav');

            if (!panel) return;

            const progress = Math.min(closingDistance(distance) / snapThreshold(panel), 1);

            panel.style.transition = 'none';
            panel.style.transform = dragTranslate(distance);
            panel.style.opacity = String(1 - progress * 0.4);
          },
        });
      }

      // Focus containment: createBackgroundLock inertes background siblings, but apps that wrap
      // the whole page in one root element (so nothing can be inerted) still let Tab walk out of
      // the open drawer, and once focus is outside the host, its Escape handler is unreachable.
      // Pull focus back to the panel whenever it lands outside the sidebar. focusin is composed,
      // so its target is retargeted to this host for focus inside the shadow root.
      const keepFocusInDrawer = (event: FocusEvent) => {
        if (!isDrawerOpen.value) return;

        const target = event.target;

        if (target instanceof Node && (el === target || el.contains(target))) return;

        el.shadowRoot?.querySelector<HTMLElement>('nav')?.focus();
      };
      document.addEventListener('focusin', keepFocusInDrawer);

      watch(props.drawer, () => {
        applyResponsiveState();
        readBottomNavItems();
      });

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

          // Watch attributes and content that affect bottom-nav rendering.
          itemObserver.observe(item, {
            attributeFilter: ['active', 'bottom-nav', 'bottom-nav-label', 'disabled', 'href'],
            attributes: true,
            characterData: true,
            childList: true,
            subtree: true,
          });
          itemObservers.set(item, itemObserver);
        }
      };

      const syncBottomNavItems = () => {
        bindItemObservers([...el.querySelectorAll<HTMLElement>('ore-sidebar-item')]);
        readBottomNavItems();
      };
      watch(slots.elements(), syncBottomNavItems, { immediate: true });
      const nestedItemsObserver = new MutationObserver(syncBottomNavItems);
      nestedItemsObserver.observe(el, { childList: true, subtree: true });

      return () => {
        swipe?.dispose();
        swipe = undefined;
        observer.disconnect();
        nestedItemsObserver.disconnect();
        el.removeEventListener('keydown', closeOnEscape);
        document.removeEventListener('focusin', keepFocusInDrawer);
        bgLock.unlock();

        for (const itemObserver of itemObservers.values()) {
          itemObserver.disconnect();
        }

        itemObservers.clear();
      };
    });

    return html`
      <div
        class="drawer-backdrop"
        part="drawer-backdrop"
        aria-hidden="true"
        @click=${() => setDrawerOpen(false, 'toggle')}></div>
      <nav
        aria-label="${props.label}"
        aria-hidden=${() => ((isBottomNav.value || props.drawer.value) && !isDrawerOpen.value ? 'true' : null)}
        part="nav"
        tabindex="-1"
        ?inert=${() => (isBottomNav.value || props.drawer.value) && !isDrawerOpen.value}>
        <div class="swipe-handle" part="swipe-handle" aria-hidden="true"></div>
        <div
          class="sidebar-header"
          part="header"
          ?hidden=${() => !hasHeader() && !props.collapsible.value}>
          <span class="sidebar-logo" ?hidden=${() => !hasLogo()}>
            <slot name="logo"></slot>
          </span>
          <span class="sidebar-header-content">
            <slot name="header"></slot>
          </span>
          <button
            class="drawer-close-btn"
            part="drawer-close-btn"
            type="button"
            aria-label="${props['drawer-close-label']}"
            ?hidden=${() => !isDrawerOpen.value || (!hasHeader() && !props.collapsible.value)}
            @click=${() => setDrawerOpen(false, 'toggle')}>
            <ore-icon name="x" size="16" stroke-width="2.5" aria-hidden="true"></ore-icon>
          </button>
          <button
            class="toggle-btn"
            part="toggle-btn"
            type="button"
            ?hidden=${() => !props.collapsible.value}
            aria-label="${() => (isCollapsed() ? props['expand-label'].value : props['collapse-label'].value)}"
            aria-expanded="${() => !isCollapsed()}"
            @click="${doToggle}">
            <ore-icon
              class="toggle-icon"
              name=${() => (isCollapsed() ? 'panel-left-open' : 'panel-left-close')}
              size="18"
              stroke-width="2"
              aria-hidden="true"></ore-icon>
          </button>
        </div>
        <div class="sidebar-content" part="content">
          <slot></slot>
        </div>
        <div class="sidebar-footer" part="footer" ?hidden=${() => !hasFooter()}>
          <slot name="footer"></slot>
        </div>
      </nav>

      <div class="bottom-bar" part="bottom-bar" ?hidden=${() => !isBottomNav.value || props.drawer.value}>
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
                    <ore-icon name="${item.iconName}" size="18" stroke-width="2"></ore-icon>
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
                  <ore-icon name="${item.iconName}" size="18" stroke-width="2"></ore-icon>
                </span>
                <span class="bottom-tab-label">${item.label}</span>
              </button>
            `;
          })}
      </div>
    `;
  },
  styles: [touchTargetMixin, sidebarStyles],
});

// ─── ore-sidebar-group styles ────────────────────────────────────────────────

/** Sidebar group properties */
export type OreSidebarGroupProps = {
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
 * `ore-sidebar-group`: A labelled section within `ore-sidebar`.
 *
 * @element ore-sidebar-group
 *
 * @attr {string} label - Group label text
 * @attr {boolean} collapsible - Whether this group can be toggled open/closed
 * @attr {boolean} open - Controlled expanded state
 * @attr {boolean} default-open - Initial expanded state in uncontrolled mode
 *
 * A collapsible group opens itself when a contained item is `active`, so a
 * deep-linked page never starts with its current location folded away. Later user
 * collapses are respected: the group reopens only when `active` moves in again.
 *
 * @fires open-change - Fired when the group open state changes (collapsible groups only). detail: { open: boolean }
 *
 * @slot - Navigation items (`ore-sidebar-item`)
 * @slot icon - Icon displayed before the label
 * @slot end - Trailing content (badge, count) after the label
 *
 * @example
 * ```html
 * <ore-sidebar-group label="Main" collapsible open>
 *   <ore-sidebar-item href="/home">Home</ore-sidebar-item>
 * </ore-sidebar-group>
 * ```
 */
export const SIDEBAR_GROUP_TAG = 'ore-sidebar-group' as const;
define<OreSidebarGroupProps>(SIDEBAR_GROUP_TAG, {
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
  setup(props) {
    const slots = useSlots();
    const emit = useEmit<OreSidebarGroupEvents>();

    const hasIcon = () => slots.has('icon').value;
    const hasEnd = () => slots.has('end').value;
    const sidebarCtx = inject(SIDEBAR_CTX);

    bind({
      attr: {
        'sidebar-bottom-nav': () =>
          sidebarCtx?.mode.value === 'bottom-nav' && !sidebarCtx?.drawerOpen.value ? true : undefined,
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

    // Reflect to data-open, never the open attribute: the open attribute is the
    // controlled prop's source, so writing it back would make every uncontrolled
    // open group read itself as controlled and reject its own toggles.
    bind({
      attr: {
        'data-open': () => (isOpen.value ? true : undefined),
      },
    });

    // Native <details> toggling must flow through the component state: the
    // toggle handler syncs the signal (so the host [open] attribute, the
    // chevron, and aria-expanded stay in step with the panel) and emits the
    // documented open-change event. Controlled groups veto native toggling so
    // the open prop stays the single source of truth.
    // Auto-expand for the active item: an uncontrolled collapsible group opens
    // when an item inside it gains `active` (deep links, router changes). Once
    // open — or once the user collapses it with `active` still inside — it stays
    // put; only a fresh activation reopens it.
    const activeWatchers = new Map<HTMLElement, MutationObserver>();

    const syncActiveExpand = () => {
      if (!props.collapsible.value || isControlled() || openState.value) return;

      const items = slots.elements().value;

      if (items.some((item) => item instanceof HTMLElement && item.hasAttribute('active'))) {
        openState.value = true;
        emit('open-change', { open: true });
      }
    };

    watch(
      slots.elements(),
      (rawItems) => {
        const next = new Set(rawItems.filter((item): item is HTMLElement => item instanceof HTMLElement));

        for (const [item, watcher] of activeWatchers) {
          if (next.has(item)) continue;

          watcher.disconnect();
          activeWatchers.delete(item);
        }

        for (const item of next) {
          if (activeWatchers.has(item)) continue;

          const watcher = new MutationObserver(syncActiveExpand);
          watcher.observe(item, { attributeFilter: ['active'], attributes: true });
          activeWatchers.set(item, watcher);
        }

        syncActiveExpand();
      },
      { immediate: true },
    );

    onCleanup(() => {
      for (const watcher of activeWatchers.values()) watcher.disconnect();

      activeWatchers.clear();
    });

    const handleToggle = (event: Event) => {
      if (!props.collapsible.value || isControlled()) return;

      const next = (event.currentTarget as HTMLDetailsElement).open;

      if (openState.value === next) return;

      openState.value = next;
      emit('open-change', { open: next });
    };

    return html`
      <details class="group" part="group" ?open=${isOpen} @toggle=${handleToggle}>
        <summary
          class="group-header"
          part="group-header"
          aria-expanded="${() => (props.collapsible.value ? String(isOpen.value) : null)}"
          @click=${(e: MouseEvent) => {
            if (!props.collapsible.value || isControlled()) {
              e.preventDefault();
            }
          }}>
          <span class="group-icon" part="group-icon" ?hidden=${() => !hasIcon()} aria-hidden="true">
            <slot name="icon"></slot>
          </span>
          <span class="group-label" part="group-label">${props.label}</span>
          <span class="group-end" part="group-end" ?hidden=${() => !hasEnd()}>
            <slot name="end"></slot>
          </span>
          <span class="chevron" ?hidden=${() => !props.collapsible.value} aria-hidden="true">
            <ore-icon name="chevron-right" size="12" stroke-width="2" aria-hidden="true"></ore-icon>
          </span>
        </summary>
        <div class="group-items" part="group-items" role="list">
          <slot></slot>
        </div>
      </details>
    `;
  },
  styles: [groupStyles],
});

// ─── ore-sidebar-item styles ─────────────────────────────────────────────────

/** Sidebar item properties */
export type OreSidebarItemProps = {
  /** Whether this item represents the current page/section */
  active?: boolean;
  'bottom-nav'?: boolean;
  'bottom-nav-label'?: string;
  /** Whether this item is disabled */
  disabled?: boolean;
  /** Navigation href: renders an `<a>` when set, otherwise a `<button>` */
  href?: string;
  label?: string;
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
 * `ore-sidebar-item`: An individual navigation item in a `ore-sidebar`.
 *
 * Renders as an `<a>` when `href` is provided, otherwise as a `<button>`.
 * Marks the active page via `aria-current="page"` when the `active` attribute is set.
 *
 * @element ore-sidebar-item
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
 *
 * On a collapsed sidebar the label becomes a fixed-position bubble on
 * hover/focus, so icon-only navigation stays explainable.
 *
 * @part item - The inner anchor or button element
 * @part item-icon - The icon wrapper
 * @part item-label - The label wrapper
 * @part item-end - The trailing content wrapper
 * @part item-reveal - The collapsed-mode label bubble
 *
 * @cssprop --sidebar-item-reveal-bg - Label bubble background
 * @cssprop --sidebar-item-reveal-color - Label bubble text color
 * @cssprop --sidebar-item-reveal-radius - Label bubble corner radius
 * @cssprop --sidebar-item-reveal-shadow - Label bubble shadow
 *
 * @example
 * ```html
 * <ore-sidebar-item href="/dashboard" active>
 *   <span slot="icon">🏠</span>
 *   Dashboard
 * </ore-sidebar-item>
 *
 * <ore-sidebar-item href="/users">
 *   <span slot="icon">👤</span>
 *   Users
 *   <ore-badge slot="end" color="primary">3</ore-badge>
 * </ore-sidebar-item>
 * ```
 */
export const SIDEBAR_ITEM_TAG = 'ore-sidebar-item' as const;
define<OreSidebarItemProps>(SIDEBAR_ITEM_TAG, {
  props: {
    active: prop.bool(false),
    'bottom-nav': prop.bool(false),
    'bottom-nav-label': prop.string(),
    disabled: prop.bool(false),
    href: prop.string(),
    label: prop.string(),
    rel: prop.string(),
    target: prop.string(),
  },
  setup(props) {
    const el = getHost();
    const slots = useSlots();

    const hasIcon = () => slots.has('icon').value;
    const hasEnd = () => slots.has('end').value;
    const sidebarCtx = inject(SIDEBAR_CTX);

    bind({
      attr: {
        'sidebar-bottom-nav': () =>
          sidebarCtx?.mode.value === 'bottom-nav' && !sidebarCtx?.drawerOpen.value ? true : undefined,
        'sidebar-collapsed': () => (sidebarCtx?.collapsed.value ? true : undefined),
      },
    });

    const isLink = () => !!props.href.value && !props.disabled.value;

    // Prevent reverse tabnapping: auto-inject noopener + noreferrer for _blank links.
    const effectiveRel = computed(() => computeSafeRel(props.rel.value, props.target.value));
    const closeDrawerOnSelect = (event: MouseEvent) => {
      if (!sidebarCtx?.closeOnSelect.value || !sidebarCtx.drawerOpen.value) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      queueMicrotask(sidebarCtx.closeDrawer);
    };

    // Collapsed-rail label bubble: fixed positioning escapes the sidebar's
    // scroll container (which would clip an absolutely positioned bubble), and
    // the content is filled on demand from the slotted label.
    const showReveal = () => {
      if (!sidebarCtx?.collapsed.value) return;

      const bubble = el.shadowRoot?.querySelector<HTMLElement>('.item-reveal');

      if (!bubble) return;

      // Only the default slot: the label, never the trailing `end` badge text.
      const text = (
        (el.shadowRoot?.querySelector('.item-label slot') as HTMLSlotElement | null)
          ?.assignedNodes({ flatten: true })
          .map((node) => node.textContent)
          .join(' ') ?? ''
      )
        .replace(/\s+/g, ' ')
        .trim();

      if (!text) return;

      bubble.textContent = text;

      const rect = el.getBoundingClientRect();
      const rtl = getComputedStyle(el).direction === 'rtl';

      bubble.dataset.side = rtl ? 'left' : 'right';
      bubble.style.left = `${rtl ? rect.left - 8 : rect.right + 8}px`;
      bubble.style.top = `${rect.top + rect.height / 2}px`;
    };

    const renderItemContent = () => html`
      <span class="item-icon" part="item-icon" ?hidden=${() => !hasIcon()} aria-hidden="true">
        <slot name="icon"></slot>
      </span>
      <span class="item-label" part="item-label" ref=${truncationRevealRef()}><slot></slot></span>
      <span class="item-end" part="item-end" ?hidden=${() => !hasEnd()}>
        <slot name="end"></slot>
      </span>
      <span class="item-reveal" part="item-reveal" aria-hidden="true"></span>
    `;

    return html`
      ${() => {
        if (isLink()) {
          return html`
            <a
              class="item"
              part="item"
              href="${props.href}"
              rel="${effectiveRel}"
              target="${props.target}"
              aria-label="${props.label}"
              aria-current="${() => (props.active.value ? 'page' : null)}"
              @click=${closeDrawerOnSelect}
              @pointerenter=${showReveal}
              @focusin=${showReveal}>
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
              aria-label="${props.label}"
              aria-current="${() => (props.active.value ? 'page' : null)}"
              @pointerenter=${showReveal}
              @focusin=${showReveal}>
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
            aria-label="${props.label}"
            aria-current="${() => (props.active.value ? 'page' : null)}"
            @click=${closeDrawerOnSelect}
            @pointerenter=${showReveal}
            @focusin=${showReveal}>
            ${renderItemContent()}
          </button>
        `;
      }}
    `;
  },
  styles: [touchTargetMixin, itemStyles],
});
