import '@vielzeug/refine/button';
import '@vielzeug/refine/card';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/select';
import { define, html } from '@vielzeug/ore';
import { computed, signal } from '@vielzeug/ripple';
import { destinationById, destinations, hotels } from '../../core/data';
import { searchDates, searchDestinationId, searchTravelers } from '../../core/state';
import { destinationMaps } from '../components/destination-map';
import { hotelCard } from '../components/hotel-card';
import { formatDateRange, isIsoDate, valueOf } from '../format';
import { navigate, queryValue } from '../navigation';

define('search-view', {
  setup() {
    const selectedDestination = computed(() => {
      const requestedId = queryValue('destination');
      return destinationById(
        destinations.some((destination) => destination.id === requestedId) ? requestedId : searchDestinationId.value,
      );
    });
    const selectedMap = computed(() => destinationMaps[selectedDestination.value.id] ?? destinationMaps.tokyo);
    const underTwoHundred = signal(false);
    const highlyRated = signal(false);
    const breakfastIncluded = signal(false);
    const mapOpen = signal(false);
    const sortBy = signal<'recommended' | 'price' | 'rating'>('recommended');
    const visibleHotels = computed(() =>
      hotels
        .filter(
          (hotel) =>
            hotel.destinationId === selectedDestination.value.id &&
            (!underTwoHundred.value || hotel.price < 200) &&
            (!highlyRated.value || hotel.rating >= 4.8) &&
            (!breakfastIncluded.value || hotel.amenities.includes('Breakfast')),
        )
        .sort((a, b) =>
          sortBy.value === 'price' ? a.price - b.price : sortBy.value === 'rating' ? b.rating - a.rating : 0,
        ),
    );
    const criteriaDates = computed(() => {
      const departure = queryValue('from');
      const arrival = queryValue('to');
      return isIsoDate(departure) && isIsoDate(arrival) && arrival > departure
        ? formatDateRange(departure, arrival)
        : searchDates.value;
    });
    const criteriaTravelers = computed(() => {
      const travelers = Number.parseInt(queryValue('travelers'), 10);
      return travelers >= 1 && travelers <= 4 ? `${travelers} travelers` : searchTravelers.value;
    });

    return html`
      <div class="page-content page-content--narrow">
        <header class="page-header search-header">
          <div>
            <span class="eyebrow">STAYS IN JAPAN</span>
            <h1>${() => selectedDestination.value.name}</h1>
            <p>
              ${() => `${visibleHotels.value.length} stays available · ${criteriaDates.value} · ${criteriaTravelers.value}`}
            </p>
          </div>
          <ore-button variant="outline" @click=${() => navigate('explore')}>
            <ore-icon slot="prefix" name="pencil" size="16" aria-hidden="true"></ore-icon>
            Edit search
          </ore-button>
        </header>
        <div class="filter-bar">
          <div class="filter-options" role="group" aria-label="Search filters">
            <ore-chip mode="action" variant="outline" @click=${() => navigate('explore')}>
              ${() => criteriaDates.value}
            </ore-chip>
            <ore-chip mode="action" variant="outline" @click=${() => navigate('explore')}>
              ${() => criteriaTravelers.value}
            </ore-chip>
            <ore-chip
              mode="selectable"
              color=${() => (underTwoHundred.value ? 'primary' : undefined)}
              variant=${() => (underTwoHundred.value ? 'flat' : 'outline')}
              ?checked=${() => underTwoHundred.value}
              @change=${(event: Event) => {
                underTwoHundred.value = (event as CustomEvent<{ checked: boolean }>).detail.checked;
              }}>
              Under €200
            </ore-chip>
            <ore-chip
              mode="selectable"
              color=${() => (highlyRated.value ? 'primary' : undefined)}
              variant=${() => (highlyRated.value ? 'flat' : 'outline')}
              ?checked=${() => highlyRated.value}
              @change=${(event: Event) => {
                highlyRated.value = (event as CustomEvent<{ checked: boolean }>).detail.checked;
              }}>
              Rating 4.8+
            </ore-chip>
            <ore-chip
              mode="selectable"
              color=${() => (breakfastIncluded.value ? 'primary' : undefined)}
              variant=${() => (breakfastIncluded.value ? 'flat' : 'outline')}
              ?checked=${() => breakfastIncluded.value}
              @change=${(event: Event) => {
                breakfastIncluded.value = (event as CustomEvent<{ checked: boolean }>).detail.checked;
              }}>
              Breakfast
            </ore-chip>
          </div>
          <div class="result-controls">
            <span class="filter-count" aria-live="polite">${() => `${visibleHotels.value.length} stays`}</span>
            <div class="search-sort">
              <span>Sort</span>
              <ore-select
                label="Sort stays"
                hide-label
                rounded="lg"
                variant="outline"
                value=${sortBy}
                options=${[
                  { label: 'Recommended', value: 'recommended' },
                  { label: 'Lowest price', value: 'price' },
                  { label: 'Highest rated', value: 'rating' },
                ]}
                @change=${(event: Event) => {
                  sortBy.value = valueOf(event) as 'recommended' | 'price' | 'rating';
                }}></ore-select>
            </div>
          </div>
        </div>
        <ore-button
          class="mobile-map-toggle"
          variant="outline"
          fullwidth
          aria-expanded=${() => String(mapOpen.value)}
          @click=${() => {
            mapOpen.value = !mapOpen.value;
          }}>
          <ore-icon slot="prefix" name="map" size="16" aria-hidden="true"></ore-icon>
          ${() => (mapOpen.value ? 'Hide map' : 'Show map')}
        </ore-button>
        <div class="results-layout">
          <section aria-labelledby="results-title">
            <h2 class="sr-only" id="results-title">${() => `${selectedDestination.value.name} hotel results`}</h2>
            <div class="hotel-results">
              ${() =>
                visibleHotels.value.length > 0
                  ? visibleHotels.value.map((hotel) => hotelCard(hotel, { horizontal: true }))
                  : html`
                      <ore-card class="empty-results" padding="xl" elevation="1">
                        <ore-icon name="bed-double" size="28" aria-hidden="true"></ore-icon>
                        <h2>No demo stays yet</h2>
                        <p>Try Tokyo, Kyoto, or Osaka for bookable accommodation.</p>
                        <ore-button variant="outline" @click=${() => navigate('explore')}>
                          Change destination
                        </ore-button>
                      </ore-card>
                    `}
            </div>
          </section>
          <aside
            class="search-map"
            data-mobile-open=${() => String(mapOpen.value)}
            aria-label=${() => `Map of ${selectedDestination.value.name} hotel results`}>
            <iframe
              class="osm-frame"
              title=${() => `OpenStreetMap of ${selectedDestination.value.name} hotel results`}
              src=${() => `https://www.openstreetmap.org/export/embed.html?bbox=${selectedMap.value.bbox}&layer=mapnik`}
              loading="lazy"></iframe>
            <a
              class="map-attribution"
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer">
              © OpenStreetMap contributors
            </a>
            <ore-button
              class="map-expand"
              size="sm"
              variant="solid"
              href=${() => `https://www.openstreetmap.org/#map=${selectedMap.value.center}`}
              target="_blank"
              rel="noopener noreferrer">
              <ore-icon slot="prefix" name="maximize-2" size="15" aria-hidden="true"></ore-icon>
              Open map
            </ore-button>
          </aside>
        </div>
      </div>
    `;
  },
  shadow: false,
});
