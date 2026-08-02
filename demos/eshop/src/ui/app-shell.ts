import '@vielzeug/refine/icon';
import '@vielzeug/refine/navbar';
import '@vielzeug/refine/badge';
import '@vielzeug/refine/command-palette';
import '@vielzeug/refine/toast';
import type { ToastElement } from '@vielzeug/refine/toast';

import { define, each, html, onCleanup, ref, when } from '@vielzeug/ore';
import { computed, effect, signal } from '@vielzeug/ripple';

import type { RouteNames } from '../core/router';

import { canAccessAdmin, currentUser } from '../core/auth';
import { cartCount, compareModels } from '../core/cart-store';
import { bus } from '../core/events';
import { t } from '../core/i18n';
import { activeRoute, activeRouteParams, router } from '../core/router';
import { modelIndex } from '../core/search-index';
import { openCompareDrawer } from './components/compare-drawer';
import './components/share-build-dialog';
import { createAdminView } from './views/admin';
import { createCartView } from './views/cart';
import { createCatalogView } from './views/catalog';
import { createCheckoutView } from './views/checkout';
import { createModelDetailView } from './views/model-detail';
import { createOrdersView } from './views/orders';
import { createSettingsView } from './views/settings';

interface PaletteItem {
  group: string;
  label: string;
  value: string;
}

/**
 * Two distinct nav tiers, not one flat row — real configurator retail sites (this app's own
 * design brief cites Mercedes-Benz Store, BMW's Neuwagensuche) separate "what you're shopping
 * for" (browse) from "your account" (utility: cart, orders, admin, search, account/settings).
 * `BROWSE_ITEMS` renders in the navbar's center slot on desktop; utility actions render
 * icon-only in the `end` slot. Both re-render in full (icon + visible label) inside the
 * `mobile-menu` slot — `ore-navbar` hides `start`/center/`end` entirely below its breakpoint and
 * only shows content placed in `mobile-menu`, so anything missing from there is simply
 * unreachable on a phone.
 */
type BrowseItem = { icon: string; kind: 'route'; route: RouteNames } | { icon: string; kind: 'compare' };

const BROWSE_ITEMS: BrowseItem[] = [
  { icon: 'car', kind: 'route', route: 'catalog' },
  { icon: 'git-compare', kind: 'compare' },
];

/** A single click-to-navigate-or-open action rendered in the navbar's utility tier. */
type UtilityAction = {
  activate: () => void;
  badge?: () => number;
  icon: string;
  isActive?: () => boolean;
  key: string;
  labelKey: string;
};

function browseItemKey(item: BrowseItem): string {
  return item.kind === 'compare' ? 'compare' : item.route;
}

function browseItemLabel(item: BrowseItem): string {
  return t(item.kind === 'compare' ? 'nav.compare' : `nav.${item.route}`);
}

function activateBrowseItem(item: BrowseItem): void {
  if (item.kind === 'compare') openCompareDrawer();
  else void router.navigate({ name: item.route });
}

function buildStaticItems(): PaletteItem[] {
  const items: PaletteItem[] = BROWSE_ITEMS.map((item) => ({
    group: t('command.navigate'),
    label: browseItemLabel(item),
    value: item.kind === 'compare' ? 'compare:open' : `nav:${item.route}`,
  }));

  items.push(
    { group: t('command.navigate'), label: t('nav.cart'), value: 'nav:cart' },
    { group: t('command.navigate'), label: t('nav.orders'), value: 'nav:orders' },
    { group: t('command.navigate'), label: t('nav.settings'), value: 'nav:settings' },
  );

  if (canAccessAdmin()) items.push({ group: t('command.navigate'), label: t('nav.admin'), value: 'nav:admin' });

  return items;
}

function itemsForQuery(query: string): PaletteItem[] {
  // Reading `currentUser.value` registers it as a dependency of the `paletteItems` computed
  // below (transitively, via `buildStaticItems()`'s `canAccessAdmin()` call) — without this,
  // switching roles in Settings wouldn't refresh the palette's admin entry until the next
  // search keystroke actually changed `paletteQuery`.
  void currentUser.value;

  const q = query.trim().toLowerCase();
  const staticItems = buildStaticItems();

  if (!q) return staticItems;

  const matchedStatic = staticItems.filter((item) => item.label.toLowerCase().includes(q));
  const modelResults = modelIndex.search(q, { limit: 8 }).map((r) => ({
    group: t('nav.catalog'),
    label: r.item.name,
    value: `model:${r.item.slug}`,
  }));

  return [...matchedStatic, ...modelResults];
}

/** Browse nav item — identical markup reused for the desktop center slot and the mobile-menu. */
function renderBrowseItem(item: BrowseItem) {
  return html`
    <ore-navbar-item
      ?active=${() => item.kind === 'route' && activeRoute.value === item.route}
      @click=${() => activateBrowseItem(item)}>
      <ore-icon slot="icon" name=${item.icon} size="14" stroke-width="1.75" aria-hidden="true"></ore-icon>
      ${() => browseItemLabel(item)}
      ${when(
        () => item.kind === 'compare' && compareModels.value.length > 0,
        () => html`
          <ore-badge slot="end" size="sm" color="primary">${() => compareModels.value.length}</ore-badge>
        `,
      )}
    </ore-navbar-item>
  `;
}

/**
 * Utility action — `compact` renders icon-only (desktop `end` slot, name conveyed via
 * `aria-label`); non-compact renders icon + visible label (mobile-menu, where every item needs
 * to be self-explanatory without a hover tooltip).
 */
function renderUtilityAction(action: UtilityAction, compact: boolean) {
  return html`
    <ore-navbar-item
      aria-label=${() => t(action.labelKey)}
      ?active=${() => action.isActive?.() ?? false}
      ?icon-only=${() => compact}
      @click=${action.activate}>
      <ore-icon slot="icon" name=${action.icon} size="14" stroke-width="1.75" aria-hidden="true"></ore-icon>
      ${when(
        () => !compact,
        () => html`
          ${() => t(action.labelKey)}
        `,
      )}
      ${when(
        () => Boolean(action.badge?.()),
        () => html`
          <ore-badge slot="end" size="sm" color="primary">${() => action.badge?.()}</ore-badge>
        `,
      )}
    </ore-navbar-item>
  `;
}

/** Account entry — folds "Settings" into a visible account affordance (name + icon) instead of
 * a plain "Settings" label with no identity signal, matching how every retail site surfaces
 * account/role state next to cart rather than burying it inside a settings page. */
function renderAccountItem(compact: boolean) {
  return html`
    <ore-navbar-item
      aria-label=${() => `${t('nav.settings')}: ${currentUser.value.name}`}
      ?active=${() => activeRoute.value === 'settings'}
      ?icon-only=${() => compact}
      @click=${() => void router.navigate({ name: 'settings' })}>
      <ore-icon slot="icon" name="user" size="14" stroke-width="1.75" aria-hidden="true"></ore-icon>
      ${when(
        () => !compact,
        () => html`
          ${() => currentUser.value.name.split(' ')[0]}
        `,
      )}
    </ore-navbar-item>
  `;
}

/** A single footer link — same shape regardless of which column it's in or what it actually
 * does (navigate, open the compare drawer, open the command palette), so `renderFooterLink`
 * below doesn't need to branch on link "kind" the way `BrowseItem`/`UtilityAction` do. */
type FooterLink = { activate: () => void; labelKey: string };

/** Footer "Shop" column — the same browse destinations `BROWSE_ITEMS` exposes in the navbar,
 * repeated here because a footer is the other place shoppers instinctively look for site-wide
 * navigation once they've scrolled past the header, not a second, different set of routes. */
const FOOTER_SHOP_LINKS: FooterLink[] = [
  { activate: () => void router.navigate({ name: 'catalog' }), labelKey: 'nav.catalog' },
  { activate: openCompareDrawer, labelKey: 'nav.compare' },
];

function renderFooterLink(link: FooterLink) {
  return html`
    <button type="button" class="app-footer__link" @click=${link.activate}>${() => t(link.labelKey)}</button>
  `;
}

function renderFooterColumn(headingKey: string, links: FooterLink[] | (() => FooterLink[])) {
  const resolved = typeof links === 'function' ? computed(links) : links;

  return html`
    <div class="app-footer__col">
      <h3 class="app-footer__heading">${() => t(headingKey)}</h3>
      <nav class="app-footer__links" aria-label=${() => t(headingKey)}>
        ${each(
          resolved,
          (l) => l.labelKey,
          (l) => renderFooterLink(l.value),
        )}
      </nav>
    </div>
  `;
}

define('app-shell', {
  setup() {
    const toastRef = ref<ToastElement>();

    const unsubscribeToast = bus.on('toast:show', ({ message, variant }) => {
      toastRef.value?.add({ color: variant, message });
    });

    onCleanup(unsubscribeToast);

    const paletteQuery = signal('');
    const paletteItems = computed(() => itemsForQuery(paletteQuery.value));
    const paletteRef = ref<HTMLElement & { open: boolean }>();

    const onPaletteSelect = (e: Event): void => {
      const value = (e as CustomEvent<{ value: string }>).detail.value;

      if (value === 'compare:open') openCompareDrawer();
      else if (value.startsWith('nav:')) void router.navigate({ name: value.slice(4) as RouteNames });
      else if (value.startsWith('model:'))
        void router.navigate({ name: 'modelDetail', params: { slug: value.slice(6) } });
    };

    const openPalette = (): void => {
      paletteQuery.value = '';

      const palette = paletteRef.value;

      if (palette) palette.open = true;
    };

    // Search is a utility action alongside cart/orders/admin, not a separately-styled button —
    // one shape for every icon-triggered action in the navbar's utility tier.
    const utilityActions = computed<UtilityAction[]>(() => {
      const actions: UtilityAction[] = [
        { activate: openPalette, icon: 'search', key: 'search', labelKey: 'common.search' },
        {
          activate: () => void router.navigate({ name: 'cart' }),
          badge: () => cartCount.value,
          icon: 'shopping-cart',
          isActive: () => activeRoute.value === 'cart',
          key: 'cart',
          labelKey: 'nav.cart',
        },
        {
          activate: () => void router.navigate({ name: 'orders' }),
          icon: 'receipt',
          isActive: () => activeRoute.value === 'orders',
          key: 'orders',
          labelKey: 'nav.orders',
        },
      ];

      if (canAccessAdmin()) {
        actions.push({
          activate: () => void router.navigate({ name: 'admin' }),
          icon: 'shield',
          isActive: () => activeRoute.value === 'admin',
          key: 'admin',
          labelKey: 'nav.admin',
        });
      }

      return actions;
    });

    // Footer "Account" column — always the same three destinations, no admin branch (the
    // footer's own "Support" column below is where the conditional admin link lives instead, so
    // "Account" stays a stable, always-three-item list).
    const footerAccountLinks: FooterLink[] = [
      { activate: () => void router.navigate({ name: 'cart' }), labelKey: 'nav.cart' },
      { activate: () => void router.navigate({ name: 'orders' }), labelKey: 'nav.orders' },
      { activate: () => void router.navigate({ name: 'settings' }), labelKey: 'nav.settings' },
    ];

    // Footer "Support" column — reuses the same `openPalette`/admin-gating logic as the navbar's
    // own utility tier above, just surfaced a second time for shoppers who scrolled past it.
    const footerSupportLinks = (): FooterLink[] => {
      const links: FooterLink[] = [{ activate: openPalette, labelKey: 'common.search' }];

      if (canAccessAdmin())
        links.push({ activate: () => void router.navigate({ name: 'admin' }), labelKey: 'nav.admin' });

      return links;
    };

    // `scrollRef` is `.app-main` itself — the actual scroll container (see styles/app.css's
    // `.app-shell`/`.app-main` comment) — while `viewRef` is the swappable content node nested
    // inside it, alongside the persistent `.app-footer` below. Splitting the two means route
    // changes only ever wipe the view, never the footer sitting after it.
    const scrollRef = ref<HTMLElement>();
    const viewRef = ref<HTMLElement>();

    function renderView(): void {
      const view = viewRef.value;

      if (!view) return;

      view.replaceChildren();

      const routeName = activeRoute.value;

      if (routeName === 'catalog') view.appendChild(createCatalogView());
      else if (routeName === 'modelDetail') {
        const slug = activeRouteParams.value['slug'] as string | undefined;

        view.appendChild(createModelDetailView(slug ?? ''));
      } else if (routeName === 'cart') view.appendChild(createCartView());
      else if (routeName?.startsWith('checkout')) view.appendChild(createCheckoutView(routeName));
      else if (routeName === 'orders') view.appendChild(createOrdersView());
      else if (routeName === 'admin') view.appendChild(createAdminView());
      else if (routeName === 'settings') view.appendChild(createSettingsView());
      else view.appendChild(document.createTextNode('Not found'));

      // Nothing resets scroll position by default: swapping the view's children here doesn't
      // touch `.app-main`'s own scrollTop, so navigating in from a scrolled-down list (e.g. the
      // catalog) landed on the new view already scrolled to wherever the old one left off.
      const scroller = scrollRef.value;

      if (scroller) scroller.scrollTop = 0;
    }

    // Re-runs once `viewRef` resolves and again on every route change — `activeRoute` /
    // `activeRouteParams` are genuinely ripple-reactive (see core/router.ts), unlike
    // `router.getSnapshot()` itself.
    effect(() => {
      void activeRoute.value;
      void activeRouteParams.value;
      renderView();
    });

    const currentYear = new Date().getFullYear();

    return html`
      <ore-navbar sticky elevation="1">
        <span slot="logo" class="brand-logo">Vielzeug Motors</span>

        ${each(BROWSE_ITEMS, browseItemKey, (n) => renderBrowseItem(n.value))}

        <div slot="end" class="navbar-end">
          ${each(
            utilityActions,
            (a) => a.key,
            (a) => renderUtilityAction(a.value, true),
          )}
          ${renderAccountItem(true)}
        </div>

        <div slot="mobile-menu" class="navbar-mobile-menu">
          ${each(BROWSE_ITEMS, browseItemKey, (n) => renderBrowseItem(n.value))}
          ${each(
            utilityActions,
            (a) => a.key,
            (a) => renderUtilityAction(a.value, false),
          )}
          ${renderAccountItem(false)}
        </div>
      </ore-navbar>
      <main class="app-main" ref=${scrollRef}>
        <div class="app-content">
          <div class="app-view" ref=${viewRef}></div>
        </div>
        <footer class="app-footer">
          <div class="app-footer__inner">
            <div class="app-footer__grid">
              <div class="app-footer__brand">
                <span class="brand-logo">Vielzeug Motors</span>
                <p class="app-footer__tagline">${() => t('footer.tagline')}</p>
                <p class="app-footer__blurb">${() => t('footer.blurb')}</p>
              </div>
              ${renderFooterColumn('footer.shopHeading', FOOTER_SHOP_LINKS)}
              ${renderFooterColumn('footer.accountHeading', footerAccountLinks)}
              ${renderFooterColumn('footer.supportHeading', footerSupportLinks)}
            </div>
            <div class="app-footer__bottom">
              <p class="app-footer__copyright">${() => t('footer.copyright', { year: currentYear })}</p>
              <p class="app-footer__disclaimer">${() => t('footer.disclaimer')}</p>
            </div>
          </div>
        </footer>
      </main>
      <ore-command-palette
        ref=${paletteRef}
        label="Command palette"
        placeholder="Search models, jump to a view…"
        no-filter
        items=${paletteItems}
        @search=${(e: Event) => {
          paletteQuery.value = (e as CustomEvent<{ query: string }>).detail.query;
        }}
        @select=${onPaletteSelect}></ore-command-palette>
      <share-build-dialog></share-build-dialog>
      <compare-drawer></compare-drawer>
      <ore-toast ref=${toastRef} position="bottom-right"></ore-toast>
    `;
  },
  shadow: false,
});

export function createAppShell(): HTMLElement {
  const shell = document.createElement('app-shell');

  shell.className = 'app-shell';

  return shell;
}
