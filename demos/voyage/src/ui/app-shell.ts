import '@vielzeug/refine/avatar';
import '@vielzeug/refine/button';
import '@vielzeug/refine/icon';
import { define, html, ref } from '@vielzeug/ore';
import { effect } from '@vielzeug/ripple';
import { travelerProfile } from '../core/preferences';
import { activeRoute, type RouteName, router } from '../core/router';
import { theme, toggleTheme } from '../core/theme';

const primaryNav: { icon: string; label: string; route: RouteName }[] = [
  { icon: 'compass', label: 'Explore', route: 'explore' },
  { icon: 'map', label: 'Trips', route: 'trips' },
  { icon: 'ticket-check', label: 'Bookings', route: 'bookings' },
];

const secondaryNav: { icon: string; label: string; route: RouteName }[] = [
  { icon: 'user-round', label: 'Profile', route: 'profile' },
  { icon: 'settings-2', label: 'Settings', route: 'settings' },
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

    const navItem = (item: { icon: string; label: string; route: RouteName }, bottomNav = false) => html`
      <ore-sidebar-item
        ?active=${() => activeRoute.value === item.route}
        ?bottom-nav=${bottomNav}
        bottom-nav-label=${item.label}
        title=${item.label}
        @click=${() => void router.navigate({ name: item.route })}>
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

          <span class="sidebar-section-label">Travel</span>
          ${primaryNav.map((item) => navItem(item, true))}
          <span class="sidebar-section-label sidebar-section-label--account">Account</span>
          ${secondaryNav.map((item) => navItem(item, item.route === 'settings'))}
          <ore-sidebar-item title="Change theme" @click=${toggleTheme}>
            <ore-icon
              slot="icon"
              name=${() => (theme.value === 'dark' ? 'sun' : 'moon')}
              size="18"
              aria-hidden="true"></ore-icon>
            Theme
          </ore-sidebar-item>

          <div class="sidebar__footer" slot="footer">
            <ore-avatar
              size="sm"
              initials=${() => `${travelerProfile.value.firstName[0] ?? ''}${travelerProfile.value.lastName[0] ?? ''}`}
              alt=${() => `${travelerProfile.value.firstName} ${travelerProfile.value.lastName}`}></ore-avatar>
            <span>
              <strong>${() => travelerProfile.value.firstName}</strong>
              <small>Japan · 7 days</small>
            </span>
          </div>
        </ore-sidebar>
        <main class="app-main" id="main-content" ref=${main}></main>
      </ore-grid>
    `;
  },
  shadow: false,
});

export function createAppShell(): HTMLElement {
  return document.createElement('voyage-shell');
}
