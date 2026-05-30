import {
  computed,
  createContext,
  define,
  html,
  inject,
  onMounted,
  provide,
  signal,
  type ReadonlySignal,
  watch,
  prop,
} from '@vielzeug/craft';
import { resizeObserver } from '@vielzeug/craft/observers';

const listen = (
  el: EventTarget | null | undefined,
  name: string,
  handler: (e: any) => void,
  options?: AddEventListenerOptions,
): (() => void) => {
  if (!el) return () => {};

  el.addEventListener(name, handler as EventListener, options);

  return () => el.removeEventListener(name, handler as EventListener, options);
};

import type { ElevationLevel, RoundedSize, ThemeColor, VisualVariant } from '../../types';

import '../../content/icon/icon';
import {
  coarsePointerMixin,
  colorThemeMixin,
  elevationMixin,
  frostVariantMixin,
  reducedMotionMixin,
  roundedVariantMixin,
} from '../../styles';
import { computeSafeRel } from '../../utils';
import navbarStyles from './navbar.css?inline';

type NavbarMode = 'floating' | 'sticky';

const hasElementContent = (el: Element): boolean => {
  if (!(el instanceof HTMLElement)) return true;

  if (el.tagName.includes('-')) return true;

  if (el.childElementCount > 0) return true;

  return (el.textContent ?? '').trim().length > 0;
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

const findScrollContainer = (start: HTMLElement): HTMLElement | null => {
  let current: HTMLElement | null = start.parentElement;

  while (current) {
    const styles = window.getComputedStyle(current);
    const overflowY = styles.overflowY;

    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
      return current;
    }

    current = current.parentElement;
  }

  return null;
};

/** Context provided by `bit-navbar` to `bit-navbar-item` children. */
export type NavbarContext = {
  isMobile: ReadonlySignal<boolean>;
  mobileMenuOpen: ReadonlySignal<boolean>;
};

/** Injection key for navbar context. */
export const NAVBAR_CTX = createContext<NavbarContext>('NavbarContext');

/** Navbar component events */
export type BitNavbarEvents = {
  'mobile-menu-change': { open: boolean };
};

/** Navbar component element interface */
export type NavbarElement = HTMLElement &
  BitNavbarProps & {
    closeMobileMenu(): void;
    openMobileMenu(): void;
    toggleMobileMenu(): void;
  };

type MobileSidebarElement = HTMLElement & {
  closeMobile?: () => void;
  openMobile?: () => void;
  toggleMobile?: () => void;
};

/** Navbar component properties */
export type BitNavbarProps = {
  /** CSS media query used for mobile layout switching */
  breakpoint?: string;
  /** Theme color */
  color?: ThemeColor;
  /** Evaluate mobile breakpoint against container width only when possible. */
  'container-breakpoints'?: boolean;
  /** Shadow elevation level (0-5) */
  elevation?: ElevationLevel;
  /** Start as detached floating navbar */
  floating?: boolean;
  /** Accessible nav landmark label */
  label?: string;
  /** CSS selector for an external sidebar toggled by the mobile button */
  'mobile-sidebar'?: string;
  /** Border radius size */
  rounded?: RoundedSize;
  /** Scroll threshold in px used by floating+sticky transition */
  'scroll-threshold'?: number;
  /** Stick to top of viewport */
  sticky?: boolean;
  /** Visual style variant */
  variant?: Exclude<VisualVariant, 'ghost' | 'text'>;
};

/** Navbar item properties */
export type BitNavbarItemProps = {
  /** Whether this item represents the current page */
  active?: boolean;
  /** Whether this item is disabled */
  disabled?: boolean;
  /** Link target URL. Renders an anchor when provided. */
  href?: string;
  /** Relationship of linked URL (anchor-only) */
  rel?: string;
  /** Browsing context for link (anchor-only) */
  target?: string;
};

/**
 * `bit-navbar` — Responsive navigation with sticky/floating modes and a mobile overflow panel.
 *
 * @element bit-navbar
 *
 * @attr {string} label - Accessible nav landmark label
 * @attr {boolean} sticky - Makes navbar sticky at top
 * @attr {boolean} floating - Makes navbar detached and floating
 * @attr {number} scroll-threshold - Scroll threshold for floating+sticky transition
 * @attr {string} breakpoint - CSS media query used for mobile mode
 * @attr {boolean} container-breakpoints - Evaluates parseable max-width breakpoints against container width
 * @attr {string} variant - Visual variant
 * @attr {string} color - Theme color
 * @attr {string} rounded - Border radius token
 * @attr {string} elevation - Shadow elevation level
 *
 * @fires mobile-menu-change - Emitted when mobile menu open state changes
 *
 * @slot logo - Brand/logo content rendered at the leading edge
 * @slot start - Content rendered in the left/start region
 * @slot - Center navigation content rendered between the start and end regions
 * @slot end - Content rendered in the right/end region
 * @slot mobile-menu - Controls and links rendered inside the mobile overflow panel
 *
 * @cssprop --blur-lg - Blur strength for floating navbar backdrops
 * @cssprop --blur-md - Blur strength for the mobile panel backdrop
 * @cssprop --border - Border token used by the navbar surface and separators
 * @cssprop --color-canvas - Base navbar and mobile panel background
 * @cssprop --color-contrast-100 - Hover/active background for navbar chrome
 * @cssprop --color-contrast-200 - Divider and border contrast color
 * @cssprop --color-contrast-400 - Muted text color for secondary navbar content
 * @cssprop --color-contrast-50 - Soft background for mobile and floating states
 * @cssprop --color-contrast-500 - Secondary text color in the navbar chrome
 * @cssprop --color-contrast-700 - Strong text color for navbar items
 * @cssprop --color-contrast-900 - Deep contrast color used in navbar shadows
 * @cssprop --color-primary - Accent color for active and highlighted navbar states
 * @part nav - Outer navigation landmark
 * @part bar - Main navbar row container
 * @part logo - Logo slot container
 * @part start - Leading action/content region
 * @part center - Center content region
 * @part end - Trailing action/content region
 * @part mobile-toggle - Mobile menu toggle button
 * @part mobile-menu - Mobile overflow panel
 * @part item-icon - Leading icon inside navbar items
 * @part item-label - Label text inside navbar items
 * @part item-end - Trailing content inside navbar items
 * @part item - Clickable navbar item root
 * @example
 * ```html
 * <bit-navbar></bit-navbar>
 * ```
 */
export const NAVBAR_TAG = 'bit-navbar' as const;
define<BitNavbarProps, BitNavbarEvents>(NAVBAR_TAG, {
  props: {
    breakpoint: prop.string('(max-width: 768px)'),
    color: prop.string<ThemeColor>(),
    'container-breakpoints': prop.bool(false),
    elevation: prop.json(undefined as ElevationLevel | undefined),
    floating: prop.bool(false),
    label: prop.string('Main navigation'),
    'mobile-sidebar': prop.string(),
    rounded: prop.string<RoundedSize>(),
    'scroll-threshold': prop.number(80),
    sticky: prop.bool(false),
    variant: prop.string<'flat' | 'solid' | 'bordered' | 'outline' | 'frost' | 'glass'>(),
  },
  setup(props, { bind, el, emit, slots }) {
    const hasLogo = () => slots.has('logo').value;
    const hasMobileMenu = () => slots.elements('mobile-menu').value.some(hasElementContent);
    const mobileSidebarTarget = signal<MobileSidebarElement | null>(null);
    const isExternalMobileMode = signal(false);
    const isExternalMobileOpen = signal(false);
    const isMobile = signal(false);
    const isMobileMenuOpen = signal(false);
    const isModeTransitioning = signal(false);
    const isScrolled = signal(false);
    const scrollBase = signal(0);
    const mediaMatches = signal(false);
    const sizeMatches = signal(false);
    const maxWidthPx = signal<number | undefined>(parseMaxWidthPx(props.breakpoint.value));
    const isPreviewMode = signal(false);

    provide(NAVBAR_CTX, {
      isMobile: computed(() => isMobile.value) as ReadonlySignal<boolean>,
      mobileMenuOpen: computed(() => isMobileMenuOpen.value) as ReadonlySignal<boolean>,
    });

    const computeMode = (): NavbarMode | undefined => {
      if (props.floating.value && props.sticky.value) {
        return isScrolled.value ? 'sticky' : 'floating';
      }

      if (props.floating.value) return 'floating';

      if (props.sticky.value) return 'sticky';

      return undefined;
    };

    const setMobileMenu = (next: boolean) => {
      const open = Boolean(next);

      if (mobileSidebarTarget.value && !hasMobileMenu()) {
        if (open) mobileSidebarTarget.value.openMobile?.();
        else mobileSidebarTarget.value.closeMobile?.();

        return;
      }

      if (open && !hasMobileMenu()) return;

      if (isMobileMenuOpen.value === open) return;

      isMobileMenuOpen.value = open;
      emit('mobile-menu-change', { open });
    };

    const closeMobileMenu = () => setMobileMenu(false);
    const openMobileMenu = () => setMobileMenu(true);
    const toggleMobileMenu = () => {
      if (mobileSidebarTarget.value && !hasMobileMenu()) {
        mobileSidebarTarget.value.toggleMobile?.();

        return;
      }

      setMobileMenu(!isMobileMenuOpen.value);
    };

    const syncMobileMode = () => {
      const next =
        (mobileSidebarTarget.value && !hasMobileMenu() ? isExternalMobileMode.value : false) ||
        mediaMatches.value ||
        sizeMatches.value;

      isMobile.value = next;

      if (!next) closeMobileMenu();
    };

    const readScrollOffset = (scrollContainer: HTMLElement | null): number => {
      if (scrollContainer) {
        return scrollContainer.scrollTop || 0;
      }

      return window.scrollY || document.documentElement.scrollTop || 0;
    };

    const resetScrollBase = (scrollContainer: HTMLElement | null) => {
      scrollBase.value = readScrollOffset(scrollContainer);
    };

    const updateScrolled = (scrollContainer: HTMLElement | null = null) => {
      if (!(props.floating.value && props.sticky.value)) {
        if (isScrolled.value) isScrolled.value = false;

        return;
      }

      const threshold = Math.max(0, Number(props['scroll-threshold'].value) || 0);
      const currentOffset = readScrollOffset(scrollContainer);
      const delta = currentOffset - scrollBase.value;

      isScrolled.value = delta > threshold;
    };

    bind({
      attr: {
        'data-mobile': () => (isMobile.value ? true : undefined),
        'data-mobile-open': () => (isMobile.value && isMobileMenuOpen.value ? true : undefined),
        'data-mode': () => computeMode() ?? null,
        'data-mode-transitioning': () => (isModeTransitioning.value ? true : undefined),
        'data-preview-mode': () => (isPreviewMode.value ? true : undefined),
        'data-scrolled': () => (props.floating.value && props.sticky.value && isScrolled.value ? true : undefined),
      },
    });

    onMounted(() => {
      const navbarEl = el as NavbarElement;
      const scrollContainer = findScrollContainer(el);

      navbarEl.closeMobileMenu = closeMobileMenu;
      navbarEl.openMobileMenu = openMobileMenu;
      navbarEl.toggleMobileMenu = toggleMobileMenu;

      const stopScroll = listen(
        window,
        'scroll',
        () => {
          updateScrolled(scrollContainer);
        },
        { passive: true },
      );
      const stopContainerScroll = scrollContainer
        ? listen(
            scrollContainer,
            'scroll',
            () => {
              updateScrolled(scrollContainer);
            },
            { passive: true },
          )
        : undefined;
      const stopEscape = listen(el, 'keydown', (event: KeyboardEvent) => {
        if (event.key !== 'Escape' || !isMobileMenuOpen.value) return;

        closeMobileMenu();
      });

      let mediaCleanup: (() => void) | undefined;
      let mobileSidebarCleanup: (() => void) | undefined;
      let modeTransitionTimeout: ReturnType<typeof setTimeout> | undefined;
      let previousMode: NavbarMode | undefined;

      const resolveMobileSidebarTarget = () => {
        mobileSidebarCleanup?.();
        mobileSidebarCleanup = undefined;
        mobileSidebarTarget.value = null;
        isExternalMobileMode.value = false;
        isExternalMobileOpen.value = false;

        const selector = String(props['mobile-sidebar'].value ?? '').trim();

        if (!selector) return;

        const root = el.getRootNode();
        const scopedTarget =
          root instanceof ShadowRoot || root instanceof Document
            ? (root.querySelector(selector) as MobileSidebarElement | null)
            : null;
        const target = scopedTarget ?? (document.querySelector(selector) as MobileSidebarElement | null);

        if (!target) return;

        const syncTargetState = () => {
          isExternalMobileMode.value = target.hasAttribute('data-bottom-nav');
          isExternalMobileOpen.value = target.hasAttribute('data-mobile-open');
          syncMobileMode();
        };

        const targetObserver = new MutationObserver(() => {
          syncTargetState();
        });

        syncTargetState();
        targetObserver.observe(target, {
          attributeFilter: ['data-bottom-nav', 'data-mobile-open'],
          attributes: true,
        });
        target.addEventListener('mobile-open-change', syncTargetState as EventListener);
        mobileSidebarCleanup = () => {
          targetObserver.disconnect();
          target.removeEventListener('mobile-open-change', syncTargetState as EventListener);
        };
        mobileSidebarTarget.value = target;
      };

      const triggerModeTransition = () => {
        isModeTransitioning.value = true;

        if (modeTransitionTimeout != null) clearTimeout(modeTransitionTimeout);

        modeTransitionTimeout = setTimeout(() => {
          isModeTransitioning.value = false;
          modeTransitionTimeout = undefined;
        }, 220);
      };

      const stopModeWatch = watch(
        computed(() => props.floating.value && props.sticky.value),
        (enabled) => {
          if (!enabled) {
            if (isScrolled.value) isScrolled.value = false;

            if (isModeTransitioning.value) isModeTransitioning.value = false;

            previousMode = undefined;

            if (modeTransitionTimeout != null) {
              clearTimeout(modeTransitionTimeout);
              modeTransitionTimeout = undefined;
            }

            return;
          }

          resetScrollBase(scrollContainer);
          updateScrolled(scrollContainer);

          const currentMode = computeMode();

          previousMode = currentMode;
        },
        { immediate: true },
      );

      const stopMobileSidebarWatch = watch(
        props['mobile-sidebar'],
        () => {
          resolveMobileSidebarTarget();
        },
        { immediate: true },
      );

      const stopModeTransitionWatch = watch(
        computed(() => computeMode()),
        (nextMode) => {
          const comboEnabled = props.floating.value && props.sticky.value;

          if (!comboEnabled) {
            previousMode = nextMode ?? undefined;

            return;
          }

          const next = nextMode ?? undefined;

          if (previousMode && next && previousMode !== next) {
            triggerModeTransition();
          }

          previousMode = next;
        },
        { immediate: true },
      );

      const stopMobileMenuSlotWatch = watch(
        computed(() => hasMobileMenu()),
        (hasContent) => {
          if (!hasContent && isMobileMenuOpen.value) {
            closeMobileMenu();
          }
        },
        { immediate: true },
      );

      watch(
        props.breakpoint,
        (query) => {
          mediaCleanup?.();
          mediaCleanup = undefined;

          const mediaQuery = String(query ?? '').trim();

          maxWidthPx.value = parseMaxWidthPx(mediaQuery);
          mediaMatches.value = false;

          const width = readContainerWidth(el);

          sizeMatches.value = width > 0 && maxWidthPx.value != null ? width <= maxWidthPx.value : false;
          syncMobileMode();

          if (props['container-breakpoints'].value && maxWidthPx.value != null) {
            return;
          }

          if (!mediaQuery) {
            return;
          }

          if (typeof window.matchMedia !== 'function') {
            return;
          }

          const mql = window.matchMedia(mediaQuery);
          const syncMedia = (next: boolean) => {
            mediaMatches.value = next;
            syncMobileMode();
          };
          const onChange = (event: MediaQueryListEvent) => {
            syncMedia(event.matches);
          };

          syncMedia(mql.matches);
          mql.addEventListener('change', onChange);

          mediaCleanup = () => {
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

              return watch(
                computed(() => [
                  hostSize.value.width,
                  hostSize.value.height,
                  wrapperSize?.value.width,
                  wrapperSize?.value.height,
                  parentSize?.value.width,
                  parentSize?.value.height,
                ]),
                () => {
                  const width = readContainerWidth(el);
                  const parentWidth = resolveContainerElement(el)?.clientWidth ?? 0;

                  sizeMatches.value = width > 0 && maxWidthPx.value != null ? width <= maxWidthPx.value : false;
                  isPreviewMode.value = parentWidth > 0 && parentWidth < window.innerWidth;
                  syncMobileMode();
                },
              );
            })()
          : undefined;

      return () => {
        stopEscape?.();
        stopScroll?.();
        stopContainerScroll?.();
        stopModeWatch?.dispose();
        stopModeTransitionWatch?.dispose();
        stopMobileMenuSlotWatch?.dispose();
        stopMobileSidebarWatch?.dispose();
        mediaCleanup?.();
        mobileSidebarCleanup?.();
        stopResizeEffect?.dispose();

        if (modeTransitionTimeout != null) {
          clearTimeout(modeTransitionTimeout);
          modeTransitionTimeout = undefined;
        }
      };
    });

    return html`
      <nav part="nav" aria-label="${props.label}">
        <div class="navbar" part="bar">
          <div class="navbar-logo" part="logo" ?hidden=${() => !hasLogo()}>
            <slot name="logo"></slot>
          </div>

          <div class="navbar-start" part="start">
            <slot name="start"></slot>
          </div>

          <div class="navbar-center" part="center">
            <slot></slot>
          </div>

          <div class="navbar-end" part="end">
            <slot name="end"></slot>
          </div>

          <button
            class="mobile-toggle"
            part="mobile-toggle"
            type="button"
            aria-label="${() =>
              hasMobileMenu()
                ? isMobileMenuOpen.value
                  ? 'Close navigation menu'
                  : 'Open navigation menu'
                : isExternalMobileOpen.value
                  ? 'Close navigation menu'
                  : 'Open navigation menu'}"
            aria-controls="mobile-menu-panel"
            aria-expanded="${() => String(hasMobileMenu() ? isMobileMenuOpen.value : isExternalMobileOpen.value)}"
            ?hidden=${() => !isMobile.value || (!hasMobileMenu() && !mobileSidebarTarget.value)}
            @click="${toggleMobileMenu}">
            <bit-icon
              name="${() => ((hasMobileMenu() ? isMobileMenuOpen.value : isExternalMobileOpen.value) ? 'x' : 'menu')}"
              size="18"
              stroke-width="2.5"
              aria-hidden="true"></bit-icon>
          </button>
        </div>

        <div
          id="mobile-menu-panel"
          class="mobile-menu-panel"
          part="mobile-menu"
          role="navigation"
          :aria-label="${() => `${props.label.value} mobile menu`}"
          ?hidden=${() => !isMobile.value || !isMobileMenuOpen.value || !hasMobileMenu()}>
          <slot name="mobile-menu"></slot>
        </div>
      </nav>
    `;
  },
  styles: [
    colorThemeMixin,
    elevationMixin,
    roundedVariantMixin,
    coarsePointerMixin,
    reducedMotionMixin,
    frostVariantMixin('.navbar'),
    navbarStyles,
  ],
});

/**
 * `bit-navbar-item` — Navigation item for navbar slots.
 *
 * Renders as an anchor when `href` is provided and item is not disabled.
 *
 * @element bit-navbar-item
 */
export const NAVBAR_ITEM_TAG = 'bit-navbar-item' as const;
define<BitNavbarItemProps>(NAVBAR_ITEM_TAG, {
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
    const navbarCtx = inject(NAVBAR_CTX);

    bind({
      attr: {
        'navbar-mobile': () => (navbarCtx?.isMobile.value ? true : undefined),
        'navbar-mobile-open': () => (navbarCtx?.mobileMenuOpen.value ? true : undefined),
      },
    });

    const isLink = () => Boolean(props.href.value) && !props.disabled.value;

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
          return html`<div class="item" part="item" tabindex="-1" aria-disabled="true">${renderItemContent()}</div>`;
        }

        return html`<button class="item" part="item" type="button">${renderItemContent()}</button>`;
      }}
    `;
  },
  styles: [coarsePointerMixin, navbarStyles],
});
