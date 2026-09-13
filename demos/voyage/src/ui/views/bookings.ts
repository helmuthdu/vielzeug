import '@vielzeug/refine/button';
import '@vielzeug/refine/card';
import '@vielzeug/refine/grid';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/tab-item';
import '@vielzeug/refine/tabs';
import { define, html } from '@vielzeug/ore';
import { computed, signal } from '@vielzeug/ripple';
import { bookings, compareBookings } from '../../core/state';
import { openBookingDetails } from '../components/booking-detail-drawer';
import { openTravelSupportChat } from '../components/travel-support-chat';
import { navigate } from '../navigation';

define('bookings-view', {
  setup() {
    const timeframe = signal<'past' | 'upcoming'>('upcoming');
    const bookingsFor = (value: 'past' | 'upcoming') =>
      bookings.value.filter((booking) => booking.timeframe === value).sort(compareBookings);
    const visibleBookings = computed(() => bookingsFor(timeframe.value));
    const icon = (type: 'experience' | 'hotel' | 'transport') =>
      type === 'hotel' ? 'bed-double' : type === 'transport' ? 'train-front' : 'ticket';
    return html`
      <div class="page-content page-content--narrow">
        <header class="page-header bookings-header">
          <span class="eyebrow">TRAVEL, ORGANIZED</span>
          <h1>Your bookings</h1>
          <p>Every reservation for your Japan journey in one place.</p>
        </header>
        <ore-grid class="booking-toolbar" cols="1" cols-sm="2" gap="md" fullwidth>
          <ore-tabs
            class="booking-tabs"
            color="primary"
            density="compact"
            label="Bookings by timeframe"
            variant="ghost"
            value=${timeframe}
            @change=${(event: CustomEvent<{ value: 'past' | 'upcoming' }>) => {
              timeframe.value = event.detail.value;
            }}>
            <ore-tab-item slot="tabs" value="upcoming">
              Upcoming
              <span class="booking-tab-count">${() => bookingsFor('upcoming').length}</span>
            </ore-tab-item>
            <ore-tab-item slot="tabs" value="past">
              Past
              <span class="booking-tab-count">${() => bookingsFor('past').length}</span>
            </ore-tab-item>
          </ore-tabs>
          <ore-button color="primary" @click=${() => navigate('search')}>
            <ore-icon slot="prefix" name="bed-double" size="17" aria-hidden="true"></ore-icon>
            Find a stay
          </ore-button>
        </ore-grid>
        <ore-grid
          class="booking-list"
          cols="1"
          gap="md"
          fullwidth
          aria-live="polite"
          aria-label=${() => `${timeframe.value === 'past' ? 'Past' : 'Upcoming'} bookings`}>
          ${() =>
            visibleBookings.value.map(
              (booking) => html`
                <ore-card
                  class="booking-card"
                  interactive
                  padding="lg"
                  elevation="1"
                  @activate=${() => openBookingDetails(booking)}>
                  <span class=${`booking-card__icon booking-card__icon--${booking.type}`}>
                    <ore-icon name=${icon(booking.type)} size="22" aria-hidden="true"></ore-icon>
                  </span>
                  <div class="booking-card__main">
                    <span>${booking.type.toUpperCase()}</span>
                    <h2>${booking.title}</h2>
                    <p>${booking.location}</p>
                  </div>
                  <div class="booking-card__details">
                    <strong>${booking.dates}</strong>
                    <span>${booking.subtitle}</span>
                  </div>
                  <ore-icon class="booking-card__chevron" name="chevron-right" size="18" aria-hidden="true"></ore-icon>
                </ore-card>
              `,
            )}
        </ore-grid>
        <ore-grid
          class="booking-support"
          cols="1"
          cols-sm="2"
          gap="md"
          fullwidth
          role="region"
          aria-labelledby="booking-support-title">
          <div class="booking-support__copy">
            <span class="booking-support__icon">
              <ore-icon name="circle-question-mark" size="24" aria-hidden="true"></ore-icon>
            </span>
            <div>
              <h2 id="booking-support-title">Need help with a reservation?</h2>
              <p>Our fictional travel team is available around the clock.</p>
            </div>
          </div>
          <ore-button variant="outline" @click=${openTravelSupportChat}>
            Chat with us
            <ore-icon slot="suffix" name="message-circle" size="16" aria-hidden="true"></ore-icon>
          </ore-button>
        </ore-grid>
      </div>
      <booking-detail-drawer></booking-detail-drawer>
    `;
  },
  shadow: false,
});
