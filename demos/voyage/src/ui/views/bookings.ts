import '@vielzeug/refine/badge';
import '@vielzeug/refine/button';
import '@vielzeug/refine/card';
import '@vielzeug/refine/icon';
import { define, html } from '@vielzeug/ore';
import { computed, signal } from '@vielzeug/ripple';
import { bookings } from '../../core/state';
import { openBookingDetails } from '../components/booking-detail-drawer';
import { navigate } from '../navigation';

define('bookings-view', {
  setup() {
    const timeframe = signal<'past' | 'upcoming'>('upcoming');
    const visibleBookings = computed(() => bookings.value.filter((booking) => booking.timeframe === timeframe.value));
    const icon = (type: 'experience' | 'hotel' | 'transport') =>
      type === 'hotel' ? 'bed-double' : type === 'transport' ? 'train-front' : 'ticket';
    return html`
      <div class="page-content page-content--narrow">
        <header class="page-header">
          <div>
            <span class="eyebrow">TRAVEL, ORGANIZED</span>
            <h1>Your bookings</h1>
            <p>Every reservation for your Japan journey in one place.</p>
          </div>
          <ore-button color="primary" @click=${() => navigate('search')}>
            <ore-icon slot="prefix" name="plus" size="17" aria-hidden="true"></ore-icon>
            Add booking
          </ore-button>
        </header>
        <div class="booking-filter">
          <ore-button
            color=${() => (timeframe.value === 'upcoming' ? 'primary' : undefined)}
            variant=${() => (timeframe.value === 'upcoming' ? 'flat' : 'text')}
            size="sm"
            aria-pressed=${() => String(timeframe.value === 'upcoming')}
            @click=${() => {
              timeframe.value = 'upcoming';
            }}>
            Upcoming
          </ore-button>
          <ore-button
            color=${() => (timeframe.value === 'past' ? 'primary' : undefined)}
            variant=${() => (timeframe.value === 'past' ? 'flat' : 'text')}
            size="sm"
            aria-pressed=${() => String(timeframe.value === 'past')}
            @click=${() => {
              timeframe.value = 'past';
            }}>
            Past
          </ore-button>
          <span>
            ${() => `${visibleBookings.value.length} ${timeframe.value === 'past' ? 'completed' : 'confirmed'}`}
          </span>
        </div>
        <section
          class="booking-list"
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
                  <ore-badge color="primary" variant="flat">
                    <ore-icon slot="prefix" name="check" size="13" aria-hidden="true"></ore-icon>
                    ${booking.status}
                  </ore-badge>
                  <ore-icon class="booking-card__chevron" name="chevron-right" size="18" aria-hidden="true"></ore-icon>
                </ore-card>
              `,
            )}
        </section>
        <section class="booking-help">
          <div>
            <ore-icon name="message-circle" size="22" aria-hidden="true"></ore-icon>
            <div>
              <h2>Need help with a reservation?</h2>
              <p>Our fictional travel team is available around the clock.</p>
            </div>
          </div>
        </section>
      </div>
      <booking-detail-drawer></booking-detail-drawer>
    `;
  },
  shadow: false,
});
