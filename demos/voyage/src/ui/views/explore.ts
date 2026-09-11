import '@vielzeug/refine/button';
import '@vielzeug/refine/date-picker';
import '@vielzeug/refine/grid';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/input';
import '@vielzeug/refine/marquee';
import '@vielzeug/refine/navbar';
import '@vielzeug/refine/select';
import '@vielzeug/refine/skeleton';
import { define, html, onMounted, ref } from '@vielzeug/ore';
import { computed, signal } from '@vielzeug/ripple';
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

const shortDate = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' });
const formatShortDate = (value: string): string => shortDate.format(new Date(`${value}T00:00:00`));

define('explore-view', {
  setup() {
    const destinationError = signal('');
    const dateError = signal('');
    const searchNavbar = ref<HTMLElement>();
    const stayCount = computed(() => upcomingBookings.value.filter((booking) => booking.type === 'hotel').length);
    const experienceCount = computed(
      () => upcomingBookings.value.filter((booking) => booking.type === 'experience').length,
    );
    const searchSummary = computed(
      () =>
        `${formatShortDate(searchDeparture.value)}–${formatShortDate(searchReturn.value)} · ${searchTravelers.value}`,
    );
    onMounted(() => {
      const navbar = searchNavbar.value;
      if (!navbar) return;
      let frame = 0;
      const update = (): void => {
        frame = 0;
        navbar.toggleAttribute('data-stuck', navbar.getBoundingClientRect().top <= 0);
      };
      const schedule = (): void => {
        if (!frame) frame = requestAnimationFrame(update);
      };
      globalThis.addEventListener('scroll', schedule, { passive: true });
      globalThis.addEventListener('resize', schedule);
      update();
      return () => {
        if (frame) cancelAnimationFrame(frame);
        globalThis.removeEventListener('scroll', schedule);
        globalThis.removeEventListener('resize', schedule);
      };
    });

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

    const searchFields = (mobile: boolean) => html`
      <ore-input
        required
        name="destination"
        label="Where"
        value=${searchDestination}
        placeholder="City or destination"
        error=${destinationError}
        @input=${(event: Event) => {
          searchDestination.value = valueOf(event);
          destinationError.value = '';
        }}
        variant="frost"
        size="md"
        @keydown=${(event: KeyboardEvent) => {
          if (event.key === 'Enter') submitSearch(event);
        }}>
        <ore-icon slot="prefix" name="map-pin" size="17" aria-hidden="true"></ore-icon>
      </ore-input>
      <ore-date-picker
        required
        name="departure"
        label="Departure"
        value=${searchDeparture}
        min="2026-01-01"
        rounded="lg"
        error=${dateError}
        variant="frost"
        size="md"
        @change=${(event: Event) => {
          searchDeparture.value = valueOf(event);
          dateError.value = '';
        }}></ore-date-picker>
      <ore-date-picker
        required
        name="return"
        label="Return"
        value=${searchReturn}
        min=${searchDeparture}
        rounded="lg"
        error=${dateError}
        variant="frost"
        size="md"
        @change=${(event: Event) => {
          searchReturn.value = valueOf(event);
          dateError.value = '';
        }}></ore-date-picker>
      <div class="search-panel__actions">
        <ore-select
          name="travelers"
          label="Travelers"
          rounded="lg"
          value=${() => searchTravelers.value.split(' ')[0]}
          options=${[
            { label: '1', value: '1' },
            { label: '2', value: '2' },
            { label: '3', value: '3' },
            { label: '4', value: '4' },
          ]}
          variant="frost"
          size="md"
          @change=${(event: Event) => {
            searchTravelers.value = `${valueOf(event)} travelers`;
          }}></ore-select>
        ${
          mobile
            ? html`
                <ore-button type="submit" class="search-panel__submit" color="primary" size="lg" rounded="lg">
                  <ore-icon slot="prefix" name="search" size="18" aria-hidden="true"></ore-icon>
                  Search
                </ore-button>
              `
            : html`
                <ore-button
                  type="submit"
                  class="search-panel__submit"
                  color="primary"
                  size="lg"
                  rounded="lg"
                  icon-only
                  label="Search travel">
                  <ore-icon name="search" size="18" aria-hidden="true"></ore-icon>
                </ore-button>
              `
        }
      </div>
    `;

    return html`
      <section class="explore-hero" aria-labelledby="explore-title">
        <ore-skeleton class="explore-hero__media" striped aria-hidden="true"></ore-skeleton>
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
      </section>
      <ore-navbar
        class="search-navbar"
        ref=${searchNavbar}
        label="Travel search"
        variant="frost"
        rounded="2xl"
        elevation="1"
        sticky
        breakpoint="(max-width: 680px)"
        menu-icon="search"
        menu-open-label="Edit search"
        menu-close-label="Close search">
        <div class="mobile-search-summary" slot="logo">
          <span>
            <strong>${searchDestination}</strong>
            <small>${searchSummary}</small>
          </span>
        </div>
        <form
          class="search-panel search-panel--desktop"
          role="search"
          aria-label="Search travel"
          @submit=${submitSearch}>
          ${searchFields(false)}
        </form>
        <form
          class="search-panel search-panel--mobile"
          slot="mobile-menu"
          role="search"
          aria-label="Edit travel search"
          @submit=${submitSearch}>
          ${searchFields(true)}
        </form>
      </ore-navbar>

      <div class="page-content page-content--home">
        <section class="content-section" aria-labelledby="destinations-title">
          ${sectionHeading('DISCOVER', 'Japan, one place at a time', 'From kinetic cities to still mountain mornings—find the pace that feels right.')}
          <ore-grid
            class="destination-grid"
            id="destinations-title"
            cols="1"
            cols-sm="2"
            cols-lg="6"
            gap="lg"
            fullwidth>
            ${destinations.map((destination, index) => destinationCard(destination, index < 2))}
          </ore-grid>
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
      </div>
    `;
  },
  shadow: false,
});
