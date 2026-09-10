import '@vielzeug/refine/button';
import '@vielzeug/refine/date-picker';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/input';
import '@vielzeug/refine/marquee';
import '@vielzeug/refine/select';
import { define, html } from '@vielzeug/ore';
import { computed, signal } from '@vielzeug/ripple';
import { assetUrl } from '../../core/asset-url';
import { destinations, experiences } from '../../core/data';
import { router } from '../../core/router';
import {
  searchDeparture,
  searchDestination,
  searchDestinationId,
  searchReturn,
  searchTravelers,
  upcomingBookings,
} from '../../core/state';
import { destinationCard } from '../components/destination-card';
import { experienceCard } from '../components/experience-card';
import { sectionHeading } from '../components/section-heading';
import { valueOf } from '../format';
import { tripRoute } from '../navigation';

define('explore-view', {
  setup() {
    const destinationError = signal('');
    const dateError = signal('');
    const stayCount = computed(() => upcomingBookings.value.filter((booking) => booking.type === 'hotel').length);
    const experienceCount = computed(
      () => upcomingBookings.value.filter((booking) => booking.type === 'experience').length,
    );
    const submitSearch = (event: Event): void => {
      event.preventDefault();
      const requestedDestination = searchDestination.value.trim().toLowerCase();
      const destination = destinations.find(
        (candidate) =>
          candidate.id.toLowerCase() === requestedDestination || candidate.name.toLowerCase() === requestedDestination,
      );
      destinationError.value = destination ? '' : 'Choose Tokyo, Kyoto, Osaka, Hakone, or Hokkaido.';
      dateError.value = searchReturn.value > searchDeparture.value ? '' : 'Return must be after departure.';
      if (!destination || dateError.value) return;

      searchDestination.value = destination.name;
      searchDestinationId.value = destination.id;
      const travelers = Number.parseInt(searchTravelers.value, 10) || 2;
      void router.navigate(
        `/search?destination=${destination.id}&from=${searchDeparture.value}&to=${searchReturn.value}&travelers=${travelers}`,
      );
    };

    return html`
      <section class="explore-hero" aria-labelledby="explore-title">
        <img src=${assetUrl('images/tokyo.webp')} alt="Tokyo skyline at golden hour" width="1800" height="1013" />
        <div class="explore-hero__shade"></div>
        <div class="explore-hero__copy">
          <span class="eyebrow eyebrow--light">CURATED JOURNEYS · JAPAN</span>
          <h1 id="explore-title">
            The journey begins
            <br />
            before you leave.
          </h1>
          <p>Discover remarkable stays and experiences, then shape every day into a trip that is entirely yours.</p>
        </div>
        <form class="search-panel" role="search" aria-label="Search travel" @submit=${submitSearch}>
          <ore-input
            required
            name="destination"
            label="Where"
            label-placement="outside"
            value=${searchDestination}
            placeholder="City or destination"
            error=${destinationError}
            @input=${(event: Event) => {
              searchDestination.value = valueOf(event);
              destinationError.value = '';
            }}
            variant="frost"
            @keydown=${(event: KeyboardEvent) => {
              if (event.key === 'Enter') submitSearch(event);
            }}>
            <ore-icon slot="prefix" name="map-pin" size="17" aria-hidden="true"></ore-icon>
          </ore-input>
          <ore-date-picker
            required
            name="departure"
            label="Departure"
            label-placement="outside"
            value=${searchDeparture}
            min="2026-01-01"
            rounded="lg"
            error=${dateError}
            variant="frost"
            @change=${(event: Event) => {
              searchDeparture.value = valueOf(event);
              dateError.value = '';
            }}></ore-date-picker>
          <ore-date-picker
            required
            name="return"
            label="Return"
            label-placement="outside"
            value=${searchReturn}
            min=${searchDeparture}
            rounded="lg"
            error=${dateError}
            variant="frost"
            @change=${(event: Event) => {
              searchReturn.value = valueOf(event);
              dateError.value = '';
            }}></ore-date-picker>
          <ore-select
            name="travelers"
            label="Travelers"
            label-placement="outside"
            rounded="lg"
            value=${() => searchTravelers.value.split(' ')[0]}
            options=${[
              { label: '1', value: '1' },
              { label: '2', value: '2' },
              { label: '3', value: '3' },
              { label: '4', value: '4' },
            ]}
            variant="frost"
            @change=${(event: Event) => {
              searchTravelers.value = `${valueOf(event)} travelers`;
            }}></ore-select>
          <ore-button type="submit" class="search-panel__submit" color="primary" size="md" rounded="lg">
            <ore-icon name="search" slot="prefix" size="18" aria-hidden="true"></ore-icon>
            Search
          </ore-button>
        </form>
      </section>

      <div class="page-content page-content--home">
        <section class="content-section" aria-labelledby="destinations-title">
          ${sectionHeading('DISCOVER', 'Japan, one place at a time', 'From kinetic cities to still mountain mornings—find the pace that feels right.')}
          <div class="destination-grid" id="destinations-title">
            ${destinations.map((destination, index) => destinationCard(destination, index < 2))}
          </div>
        </section>
        <section class="content-section content-section--tint" aria-labelledby="experiences-title">
          ${sectionHeading('EXPERIENCE', 'More than a place to stay', 'Small-group moments selected for craft, character, and a genuine sense of place.')}
          <ore-marquee
            class="experience-marquee"
            id="experiences-title"
            color="primary"
            duration="63"
            pause-on-hover
            aria-label="Recommended experiences">
            ${experiences.map(experienceCard)}
          </ore-marquee>
        </section>
        <section class="trip-promo" aria-labelledby="active-trip-title">
          <header class="trip-promo__summary">
            <span class="eyebrow">YOUR OCTOBER JOURNEY</span>
            <h2 id="active-trip-title">Tokyo → Kyoto → Osaka</h2>
            <p>12–19 October · 7 days</p>
          </header>
          <div class="trip-promo__route" aria-label="Tokyo to Kyoto by Shinkansen, then Kyoto to Osaka by rapid train">
            <span class="trip-promo__city">
              <i>TYO</i>
              <strong>Tokyo</strong>
              <small>12 Oct</small>
            </span>
            <span class="trip-promo__leg">
              <ore-icon name="train-front" size="15" aria-hidden="true"></ore-icon>
              <strong>Shinkansen</strong>
              <small>2h 15m</small>
            </span>
            <span class="trip-promo__city">
              <i>KYO</i>
              <strong>Kyoto</strong>
              <small>15 Oct</small>
            </span>
            <span class="trip-promo__leg">
              <ore-icon name="train-front" size="15" aria-hidden="true"></ore-icon>
              <strong>Rapid train</strong>
              <small>30m</small>
            </span>
            <span class="trip-promo__city">
              <i>OSA</i>
              <strong>Osaka</strong>
              <small>18 Oct</small>
            </span>
          </div>
          <footer class="trip-promo__footer">
            <div>
              <span class="trip-promo__stat">
                ${() => `${stayCount.value} ${stayCount.value === 1 ? 'stay' : 'stays'} confirmed`}
              </span>
              <span class="trip-promo__stat">
                ${() => `${experienceCount.value} ${experienceCount.value === 1 ? 'experience' : 'experiences'} selected`}
              </span>
            </div>
            <ore-button color="primary" size="lg" rounded="lg" @click=${tripRoute}>
              Open itinerary
              <ore-icon slot="suffix" name="arrow-right" size="18" aria-hidden="true"></ore-icon>
            </ore-button>
          </footer>
        </section>
        <p class="photo-credit">
          Travel photography: David Kernan, Victor Porof, Mc681, MaedaAkihiko, Ryan Cragun, Mx. Granger, MichaelMaggs,
          and Abasaa via Wikimedia Commons.
        </p>
      </div>
    `;
  },
  shadow: false,
});
