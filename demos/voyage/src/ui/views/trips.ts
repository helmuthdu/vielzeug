import '@vielzeug/refine/badge';
import '@vielzeug/refine/button';
import '@vielzeug/refine/card';
import '@vielzeug/refine/grid';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/skeleton';
import { define, html } from '@vielzeug/ore';
import { upcomingBookings } from '../../core/state';
import { navigate, tripRoute } from '../navigation';

define('trips-view', {
  setup() {
    return html`
      <div class="page-content page-content--narrow">
        <header class="page-header">
          <div>
            <span class="eyebrow">MY JOURNEYS</span>
            <h1>Trips</h1>
            <p>Everything you need, from first idea to final train.</p>
          </div>
          <ore-button color="primary" @click=${() => navigate('explore')}>
            <ore-icon slot="prefix" name="plus" size="17" aria-hidden="true"></ore-icon>
            Plan a trip
          </ore-button>
        </header>
        <section>
          <h2 class="subheading">Upcoming</h2>
          <ore-card class="trip-card" interactive padding="none" elevation="1" @activate=${tripRoute}>
            <ore-skeleton
              class="trip-card__media"
              slot="media"
              striped
              aria-hidden="true"></ore-skeleton>
            <div class="trip-card__shade"></div>
            <div class="trip-card__content">
              <ore-badge variant="frost" size="sm">UPCOMING · 32 DAYS</ore-badge>
              <h2>Japan</h2>
              <p>Tokyo · Kyoto · Osaka</p>
              <div>
                <span>
                  <ore-icon name="calendar-days" size="17" aria-hidden="true"></ore-icon>
                  12–19 October
                </span>
                <span>
                  <ore-icon name="map-pin" size="17" aria-hidden="true"></ore-icon>
                  3 cities
                </span>
                <span>
                  <ore-icon name="ticket-check" size="17" aria-hidden="true"></ore-icon>
                  ${() => upcomingBookings.value.length} bookings
                </span>
              </div>
              <span class="trip-card__link">
                View trip
                <ore-icon name="arrow-right" size="17" aria-hidden="true"></ore-icon>
              </span>
            </div>
          </ore-card>
        </section>
        <section class="past-trips">
          <h2 class="subheading">Past journeys</h2>
          <ore-grid cols="1" cols-sm="2" gap="md" fullwidth>
            <ore-card padding="none">
              <ore-skeleton class="past-trip__media" slot="media" striped aria-hidden="true"></ore-skeleton>
              <div>
                <h3>Nordic summer</h3>
                <p>Copenhagen · Stockholm</p>
                <span>June 2025</span>
              </div>
            </ore-card>
            <ore-card padding="none">
              <ore-skeleton class="past-trip__media" slot="media" striped aria-hidden="true"></ore-skeleton>
              <div>
                <h3>Kyoto weekend</h3>
                <p>Kyoto · Nara</p>
                <span>April 2025</span>
              </div>
            </ore-card>
          </ore-grid>
        </section>
      </div>
    `;
  },
  shadow: false,
});
