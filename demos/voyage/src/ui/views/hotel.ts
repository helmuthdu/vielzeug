import '@vielzeug/refine/badge';
import '@vielzeug/refine/button';
import '@vielzeug/refine/card';
import '@vielzeug/refine/dialog';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/skeleton';
import { define, html } from '@vielzeug/ore';
import { toast } from '@vielzeug/refine/toast';
import { computed, signal } from '@vielzeug/ripple';
import { hotelById } from '../../core/data';
import { activeRouteParams } from '../../core/router';
import { savedHotelIds, toggleSavedHotel } from '../../core/state';
import { sectionHeading } from '../components/section-heading';
import { money } from '../format';
import { navigate } from '../navigation';

define('hotel-view', {
  setup() {
    const hotel = computed(() => hotelById(activeRouteParams.value.slug));
    const galleryOpen = signal(false);
    const saved = computed(() => savedHotelIds.value.includes(hotel.value.id));
    const toggleSaved = (): void => {
      const isSaved = toggleSavedHotel(hotel.value.id);
      toast.add({
        color: isSaved ? 'success' : 'info',
        message: isSaved ? `${hotel.value.name} saved.` : `${hotel.value.name} removed.`,
      });
    };
    return html`
      <div class="page-content page-content--narrow hotel-page">
        <ore-button class="inline-back" color="primary" size="sm" variant="solid" @click=${() => navigate('search')}>
          <ore-icon slot="prefix" name="arrow-left" size="16" aria-hidden="true"></ore-icon>
          ${() => `${hotel.value.location.split(',').at(-1)?.trim()} stays`}
        </ore-button>
        <header class="hotel-heading">
          <div>
            <div
              class="rating"
              aria-label=${() =>
                `Rated ${hotel.value.rating} out of 5 from ${hotel.value.reviewCount} reviews${hotel.value.badge ? `, ${hotel.value.badge}` : ''}`}>
              <ore-icon name="star" size="15" aria-hidden="true"></ore-icon>
              ${() => `${hotel.value.rating} (${hotel.value.reviewCount})${hotel.value.badge ? ` · ${hotel.value.badge}` : ''}`}
            </div>
            <h1>${() => hotel.value.name}</h1>
            <p>${() => hotel.value.location}</p>
          </div>
          <ore-button
            color=${() => (saved.value ? 'primary' : undefined)}
            variant=${() => (saved.value ? 'flat' : 'outline')}
            aria-label=${() => (saved.value ? 'Remove saved hotel' : 'Save hotel')}
            aria-pressed=${() => String(saved.value)}
            @click=${toggleSaved}>
            <ore-icon slot="prefix" name="heart" size="17" aria-hidden="true"></ore-icon>
            ${() => (saved.value ? 'Saved' : 'Save')}
          </ore-button>
        </header>
        <div class="gallery">
          <ore-skeleton class="gallery__main" striped aria-hidden="true"></ore-skeleton>
          <ore-skeleton class="gallery__secondary" striped aria-hidden="true"></ore-skeleton>
          <ore-skeleton class="gallery__secondary" striped aria-hidden="true"></ore-skeleton>
          <ore-button
            class="gallery__button"
            color="primary"
            size="sm"
            variant="solid"
            @click=${() => {
              galleryOpen.value = true;
            }}>
            <ore-icon slot="prefix" name="images" size="16" aria-hidden="true"></ore-icon>
            View all photos
          </ore-button>
        </div>
        <div class="hotel-layout">
          <div class="hotel-story">
            <section>
              <span class="eyebrow">THE STAY</span>
              <h2>${() => hotel.value.storyHeading}</h2>
              <p>${() => hotel.value.description}</p>
            </section>
            <section>
              <h2>Everything you need</h2>
              <div class="amenities">
                ${() =>
                  hotel.value.amenities.map(
                    (amenity, index) => html`
                      <span>
                        <ore-icon
                          name=${['coffee', 'waves', 'wifi', 'martini'][index] ?? 'circle-check'}
                          size="19"
                          aria-hidden="true"></ore-icon>
                        ${amenity}
                      </span>
                    `,
                  )}
              </div>
            </section>
          </div>
          <aside class="reservation-card">
            <span>From</span>
            <div>
              <strong>${() => money(hotel.value.price)}</strong>
              / night
            </div>
            <div class="reservation-card__dates">
              <span>
                <small>CHECK IN</small>
                12 Oct
              </span>
              <span>
                <small>CHECK OUT</small>
                16 Oct
              </span>
            </div>
            <p>
              <ore-icon name="users" size="16" aria-hidden="true"></ore-icon>
              2 guests · 1 room
            </p>
            <ore-button
              color="primary"
              size="lg"
              fullwidth
              @click=${() => navigate('booking', { slug: hotel.value.id })}>
              Choose a room
            </ore-button>
            <small>No payment required for this demo</small>
          </aside>
        </div>
        <section class="rooms content-section">
          <div class="heading-row">
            ${sectionHeading('ROOMS', 'Choose your space')}
            <span>12–16 October · 4 nights</span>
          </div>
          ${() =>
            hotel.value.rooms.map(
              (room) => html`
                <ore-card class="room-card" padding="lg" elevation="1">
                  <div>
                    <ore-badge variant="flat" color="primary" size="sm">Available</ore-badge>
                    <h3>${room.name}</h3>
                    <p>${room.guests} guests · ${room.size} m² · King bed</p>
                  </div>
                  <div>
                    <strong>${money(room.price)}</strong>
                    <span>/ night</span>
                    <ore-button color="primary" @click=${() => navigate('booking', { slug: hotel.value.id })}>
                      Reserve
                    </ore-button>
                  </div>
                </ore-card>
              `,
            )}
        </section>
      </div>
      <ore-dialog
        label=${() => `${hotel.value.name} gallery`}
        size="lg"
        dismissible
        ?open=${() => galleryOpen.value}
        @open-change=${(event: Event) => {
          galleryOpen.value = (event as CustomEvent<{ open: boolean }>).detail.open;
        }}>
        <div class="gallery-dialog-grid">
          ${Array.from(
            { length: 3 },
            () => html`<ore-skeleton class="gallery-dialog__media" striped aria-hidden="true"></ore-skeleton>`,
          )}
        </div>
      </ore-dialog>
    `;
  },
  shadow: false,
});
