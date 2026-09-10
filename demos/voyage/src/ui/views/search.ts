import '@vielzeug/refine/button';
import '@vielzeug/refine/card';
import '@vielzeug/refine/icon';
import { define, html } from '@vielzeug/ore';
import { computed, signal } from '@vielzeug/ripple';
import { destinationById, destinations, hotels } from '../../core/data';
import { searchDates, searchDestinationId, searchTravelers } from '../../core/state';
import { destinationMaps } from '../components/destination-map';
import { hotelCard } from '../components/hotel-card';
import { formatDateRange, isIsoDate } from '../format';
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
    const visibleHotels = computed(() =>
      hotels.filter(
        (hotel) =>
          hotel.destinationId === selectedDestination.value.id &&
          (!underTwoHundred.value || hotel.price < 200) &&
          (!highlyRated.value || hotel.rating >= 4.8) &&
          (!breakfastIncluded.value || hotel.amenities.includes('Breakfast')),
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
              ${() => `${selectedDestination.value.stays} stays · ${criteriaDates.value} · ${criteriaTravelers.value}`}
            </p>
          </div>
          <ore-button variant="outline" @click=${() => navigate('explore')}>
            <ore-icon slot="prefix" name="pencil" size="16" aria-hidden="true"></ore-icon>
            Edit search
          </ore-button>
        </header>
        <div class="filter-bar" aria-label="Search filters">
          <ore-button size="sm" variant="outline" @click=${() => navigate('explore')}>Dates</ore-button>
          <ore-button size="sm" variant="outline" @click=${() => navigate('explore')}>Guests</ore-button>
          <ore-button
            size="sm"
            color=${() => (underTwoHundred.value ? 'primary' : undefined)}
            variant=${() => (underTwoHundred.value ? 'flat' : 'outline')}
            aria-pressed=${() => String(underTwoHundred.value)}
            @click=${() => {
              underTwoHundred.value = !underTwoHundred.value;
            }}>
            Under €200
          </ore-button>
          <ore-button
            size="sm"
            color=${() => (highlyRated.value ? 'primary' : undefined)}
            variant=${() => (highlyRated.value ? 'flat' : 'outline')}
            aria-pressed=${() => String(highlyRated.value)}
            @click=${() => {
              highlyRated.value = !highlyRated.value;
            }}>
            Rating 4.8+
          </ore-button>
          <ore-button
            size="sm"
            color=${() => (breakfastIncluded.value ? 'primary' : undefined)}
            variant=${() => (breakfastIncluded.value ? 'flat' : 'outline')}
            aria-pressed=${() => String(breakfastIncluded.value)}
            @click=${() => {
              breakfastIncluded.value = !breakfastIncluded.value;
            }}>
            Breakfast
          </ore-button>
          <span class="filter-count">${() => `${visibleHotels.value.length} demo stays`}</span>
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
                  ? visibleHotels.value.map(hotelCard)
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
