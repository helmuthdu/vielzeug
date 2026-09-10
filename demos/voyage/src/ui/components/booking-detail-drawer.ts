import '@vielzeug/refine/badge';
import '@vielzeug/refine/button';
import '@vielzeug/refine/drawer';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/step';
import '@vielzeug/refine/stepper';
import { define, html, when } from '@vielzeug/ore';
import { signal } from '@vielzeug/ripple';
import type { Booking } from '../../core/types';
import { navigate } from '../navigation';

const selectedBooking = signal<Booking | null>(null);

export function openBookingDetails(booking: Booking): void {
  selectedBooking.value = booking;
}

define('booking-detail-drawer', {
  setup() {
    const close = (): void => {
      selectedBooking.value = null;
    };

    return html`
      <ore-drawer
        placement="right"
        size="lg"
        title="Booking details"
        ?open=${() => selectedBooking.value !== null}
        @open-change=${(event: Event) => {
          if (!(event as CustomEvent<{ open: boolean }>).detail.open) close();
        }}>
        ${when(
          () => selectedBooking.value !== null,
          () => html`
            <article class="booking-detail" tabindex="0">
              <header class="booking-detail__overview">
                <div class=${() => `booking-detail__icon booking-card__icon--${selectedBooking.value?.type}`}>
                  <ore-icon
                    name=${() =>
                      selectedBooking.value?.type === 'hotel'
                        ? 'bed-double'
                        : selectedBooking.value?.type === 'transport'
                          ? 'train-front'
                          : 'ticket'}
                    size="24"
                    aria-hidden="true"></ore-icon>
                </div>
                <div>
                  <span class="eyebrow">${() => selectedBooking.value?.type.toUpperCase()}</span>
                  <h2>${() => selectedBooking.value?.title}</h2>
                  <p>${() => selectedBooking.value?.location}</p>
                </div>
              </header>

              <div class="booking-detail__layout">
                <section aria-labelledby="booking-summary-title">
                  <h3 id="booking-summary-title">Reservation</h3>
                  <dl>
                    <div>
                      <dt>Date</dt>
                      <dd>${() => selectedBooking.value?.dates}</dd>
                    </div>
                    <div>
                      <dt>Details</dt>
                      <dd>${() => selectedBooking.value?.subtitle}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>
                        <ore-badge color="primary" variant="flat">${() => selectedBooking.value?.status}</ore-badge>
                      </dd>
                    </div>
                    <div>
                      <dt>Reference</dt>
                      <dd>${() => `#VYG-${selectedBooking.value?.id.slice(-4).toUpperCase()}`}</dd>
                    </div>
                  </dl>
                </section>

                <section class="booking-detail__timeline" aria-labelledby="booking-timeline-title">
                  <h3 id="booking-timeline-title">Booking timeline</h3>
                  <ore-stepper
                    orientation="vertical"
                    size="sm"
                    color="primary"
                    label="Booking timeline"
                    value=${() => (selectedBooking.value?.timeframe === 'past' ? 'completed' : 'upcoming')}>
                    <ore-step value="reserved">
                      Reserved
                      <span slot="description">Added to your Japan journey</span>
                    </ore-step>
                    <ore-step value="confirmed">
                      Confirmed
                      <span slot="description">Reservation secured with the provider</span>
                    </ore-step>
                    <ore-step value="upcoming">
                      Upcoming
                      <span slot="description">${() => selectedBooking.value?.dates}</span>
                    </ore-step>
                    <ore-step value="completed">
                      Completed
                      <span slot="description">
                        ${() => (selectedBooking.value?.timeframe === 'past' ? 'Completed after your trip' : 'Marked complete after your trip')}
                      </span>
                    </ore-step>
                  </ore-stepper>
                </section>
              </div>

              <div class="booking-detail__note">
                <ore-icon name="circle-check" size="18" aria-hidden="true"></ore-icon>
                ${() => (selectedBooking.value?.timeframe === 'past' ? 'This fictional booking was part of a completed journey.' : 'This fictional booking is included in your Japan itinerary.')}
              </div>
            </article>
          `,
        )}
        <div slot="footer">
          <ore-button variant="ghost" @click=${close}>Close</ore-button>
          <ore-button
            color="primary"
            @click=${() =>
              selectedBooking.value?.timeframe === 'past'
                ? navigate('explore')
                : navigate('trip', { id: 'japan-october' })}>
            ${() => (selectedBooking.value?.timeframe === 'past' ? 'Plan another trip' : 'View itinerary')}
            <ore-icon slot="suffix" name="arrow-right" size="16" aria-hidden="true"></ore-icon>
          </ore-button>
        </div>
      </ore-drawer>
    `;
  },
  shadow: false,
});
