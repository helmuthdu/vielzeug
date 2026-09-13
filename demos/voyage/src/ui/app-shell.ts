import '@vielzeug/refine/avatar';
import '@vielzeug/refine/icon';
import { define, html, ref } from '@vielzeug/ore';
import { effect } from '@vielzeug/ripple';
import { travelerProfile } from '../core/preferences';
import { activeRoute, type RouteName, router } from '../core/router';
import { navigate, routeHref } from './navigation';

if (sessionStorage.getItem('voyage-support-chat-open') === 'true') void import('./components/travel-support-chat');

const primaryNav: { icon: string; label: string; route: RouteName }[] = [
  { icon: 'compass', label: 'Explore', route: 'explore' },
  { icon: 'map', label: 'Trips', route: 'trips' },
  { icon: 'ticket-check', label: 'Bookings', route: 'bookings' },
];

const viewLoaders: Record<RouteName, () => Promise<unknown>> = {
  booking: () => import('./views/booking'),
  bookings: () => import('./views/bookings'),
  destination: () => import('./views/destination'),
  explore: () => import('./views/explore'),
  hotel: () => import('./views/hotel'),
  profile: () => import('./views/account'),
  search: () => import('./views/search'),
  settings: () => import('./views/account'),
  trip: () => import('./views/trip'),
  trips: () => import('./views/trips'),
};

const viewTags: Record<RouteName, string> = {
  booking: 'booking-view',
  bookings: 'bookings-view',
  destination: 'destination-view',
  explore: 'explore-view',
  hotel: 'hotel-view',
  profile: 'account-view',
  search: 'search-view',
  settings: 'account-view',
  trip: 'trip-view',
  trips: 'trips-view',
};

define('voyage-shell', {
  setup() {
    const main = ref<HTMLElement>();
    let renderId = 0;
    effect(() => {
      const route = activeRoute.value;
      const container = main.value;
      const currentRender = ++renderId;
      document.body.dataset.route = route ?? 'not-found';
      globalThis.scrollTo({ behavior: 'auto', top: 0 });
      if (!container) return undefined;
      if (!route) {
        container.replaceChildren(document.createTextNode('Not found'));
        return undefined;
      }

      const loading = document.createElement('div');
      loading.className = 'view-loading';
      loading.role = 'status';
      loading.textContent = 'Loading journey…';
      container.replaceChildren(loading);
      container.ariaBusy = 'true';
      void viewLoaders[route]()
        .then(() => {
          if (currentRender !== renderId) return;
          container.replaceChildren(document.createElement(viewTags[route]));
          container.ariaBusy = 'false';
        })
        .catch(() => {
          if (currentRender !== renderId) return;
          container.replaceChildren(document.createTextNode('Unable to load this view.'));
          container.ariaBusy = 'false';
        });
      return undefined;
    });

    const openRoute = (event: MouseEvent, route: RouteName, params: Record<string, string> = {}): void => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      navigate(route, params);
    };
    const navItem = (
      item: { icon: string; label: string; route: RouteName },
      bottomNav = false,
      mobileOnly = false,
    ) => html`
      <ore-sidebar-item
        class=${mobileOnly ? 'bottom-nav-source' : null}
        href=${routeHref(item.route)}
        ?active=${() => activeRoute.value === item.route}
        ?bottom-nav=${bottomNav}
        bottom-nav-label=${item.label}
        @click=${(event: MouseEvent) => openRoute(event, item.route)}>
        <ore-icon slot="icon" name=${item.icon} size="18" aria-hidden="true"></ore-icon>
        ${item.label}
      </ore-sidebar-item>
    `;

    return html`
      <nav class="skip-nav" aria-label="Skip navigation">
        <a class="skip-link" href="#main-content">Skip to content</a>
      </nav>
      <ore-grid class="app-layout" gap="none" fullwidth>
        <ore-sidebar
          id="voyage-sidebar"
          class="sidebar"
          label="Voyage navigation"
          close-on-select
          bottom-nav-at="(max-width: 680px)">
          <button
            class="brand"
            slot="header"
            type="button"
            @click=${() => void router.navigate({ name: 'explore' })}
            aria-label="Voyage home">
            <span class="brand__mark" aria-hidden="true"><ore-icon name="navigation" size="18"></ore-icon></span>
            <span>VOYAGE</span>
          </button>

          ${primaryNav.map((item) => navItem(item, true))}
          ${navItem({ icon: 'user-round', label: 'Profile', route: 'profile' }, true, true)}
          ${navItem({ icon: 'settings-2', label: 'Settings', route: 'settings' }, true, true)}

          <div class="sidebar__lower" slot="footer">
            <a
              class="sidebar__next-trip"
              href=${routeHref('trip', { id: 'japan-october' })}
              aria-label="View Japan itinerary, 12 to 19 October"
              aria-current=${() => (activeRoute.value === 'trip' ? 'page' : null)}
              @click=${(event: MouseEvent) => openRoute(event, 'trip', { id: 'japan-october' })}>
              <span class="sidebar__trip-label">Next trip</span>
              <strong>Japan</strong>
              <span class="sidebar__trip-route">Tokyo · Kyoto · Osaka</span>
              <span class="sidebar__trip-meta">
                <span>
                  <ore-icon name="calendar-days" size="14" aria-hidden="true"></ore-icon>
                  12–19 Oct
                </span>
                <ore-icon name="arrow-right" size="15" aria-hidden="true"></ore-icon>
              </span>
            </a>

            <div class="sidebar__account">
              ${navItem({ icon: 'settings-2', label: 'Settings', route: 'settings' })}
              <a
                class="sidebar__footer"
                href=${routeHref('profile')}
                aria-label=${() => `Open profile for ${travelerProfile.value.firstName} ${travelerProfile.value.lastName}`}
                aria-current=${() => (activeRoute.value === 'profile' ? 'page' : null)}
                @click=${(event: MouseEvent) => openRoute(event, 'profile')}>
                <ore-avatar
                  size="sm"
                  initials=${() => `${travelerProfile.value.firstName[0] ?? ''}${travelerProfile.value.lastName[0] ?? ''}`}
                  alt=""></ore-avatar>
                <span>
                  <strong>${() => `${travelerProfile.value.firstName} ${travelerProfile.value.lastName}`}</strong>
                  <small>Profile</small>
                </span>
              </a>
            </div>
          </div>
        </ore-sidebar>
        <main class="app-main" id="main-content" ref=${main}></main>
      </ore-grid>
      <travel-support-chat></travel-support-chat>
    `;
  },
  shadow: false,
});

export function createAppShell(): HTMLElement {
  return document.createElement('voyage-shell');
}
