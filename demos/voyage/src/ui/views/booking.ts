import '@vielzeug/refine/button';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/input';
import '@vielzeug/refine/skeleton';
import { define, html, when } from '@vielzeug/ore';
import { computed, signal } from '@vielzeug/ripple';
import { hotelById } from '../../core/data';
import { activeRouteParams } from '../../core/router';
import { addBooking } from '../../core/state';
import { money, valueOf } from '../format';
import { navigate, tripRoute } from '../navigation';

define('booking-view', {
  setup() {
    const hotel = computed(() => hotelById(activeRouteParams.value.slug));
    const step = signal<1 | 2 | 3>(1);
    const roomId = signal(hotel.value.rooms[0]?.id ?? 'deluxe-king');
    const firstName = signal('Avery');
    const lastName = signal('Morgan');
    const email = signal('avery@example.com');
    const error = signal('');
    const selectedRoom = computed(
      () => hotel.value.rooms.find((room) => room.id === roomId.value) ?? hotel.value.rooms[0],
    );
    const total = computed(() => (selectedRoom.value?.price ?? hotel.value.price) * 4 + 48);
    const confirm = (): void => {
      if (!firstName.value.trim() || !lastName.value.trim() || !email.value.includes('@')) {
        error.value = 'Enter a name and valid email address.';
        return;
      }
      addBooking({
        dates: '12–16 October',
        id: `booking-${hotel.value.id}`,
        location: hotel.value.location,
        status: 'Confirmed',
        subtitle: `${selectedRoom.value.name} · 2 guests`,
        timeframe: 'upcoming',
        title: hotel.value.name,
        type: 'hotel',
      });
      step.value = 3;
    };
    return html`
      <div class="booking-page">
        <header class="booking-header">
          <button class="brand brand--booking" type="button" @click=${() => navigate('explore')}>
            <span class="brand__mark"><ore-icon name="navigation" size="18" aria-hidden="true"></ore-icon></span>
            VOYAGE
          </button>
          <span>Secure demo reservation</span>
        </header>
        <div class="booking-shell">
          <div class="booking-main">
            <ore-button
              class="inline-back"
              color="primary"
              size="sm"
              variant="solid"
              @click=${() => (step.value === 1 ? navigate('hotel', { slug: hotel.value.id }) : (step.value = 1))}>
              <ore-icon slot="prefix" name="arrow-left" size="16" aria-hidden="true"></ore-icon>
              ${() => (step.value === 1 ? 'Hotel details' : 'Room selection')}
            </ore-button>
            <div class="stepper" aria-label="Booking progress">
              <span class=${() => (step.value >= 1 ? 'is-active' : '')}>
                <i>1</i>
                Reservation
              </span>
              <b></b>
              <span class=${() => (step.value >= 2 ? 'is-active' : '')}>
                <i>2</i>
                Guest details
              </span>
              <b></b>
              <span class=${() => (step.value >= 3 ? 'is-active' : '')}>
                <i>3</i>
                Confirmed
              </span>
            </div>
            ${when(
              () => step.value === 1,
              () => html`
                <section class="booking-step">
                  <span class="eyebrow">STEP 1 OF 2</span>
                  <h1>Choose your room</h1>
                  <p>Every room includes breakfast and full spa access.</p>
                  <div class="room-options">
                    ${() =>
                      hotel.value.rooms.map(
                        (room) => html`
                          <label class=${() => (roomId.value === room.id ? 'room-option is-selected' : 'room-option')}>
                            <input
                              type="radio"
                              name="room"
                              value=${room.id}
                              ?checked=${() => roomId.value === room.id}
                              @change=${() => {
                                roomId.value = room.id;
                              }} />
                            <span>
                              <strong>${room.name}</strong>
                              <small>${room.guests} guests · ${room.size} m² · King bed</small>
                            </span>
                            <span>
                              <strong>${money(room.price)}</strong>
                              <small>per night</small>
                            </span>
                          </label>
                        `,
                      )}
                  </div>
                  <ore-button
                    color="primary"
                    size="lg"
                    @click=${() => {
                      step.value = 2;
                    }}>
                    Continue to guest details
                    <ore-icon slot="suffix" name="arrow-right" size="17" aria-hidden="true"></ore-icon>
                  </ore-button>
                </section>
              `,
            )}
            ${when(
              () => step.value === 2,
              () => html`
                <section class="booking-step">
                  <span class="eyebrow">STEP 2 OF 2</span>
                  <h1>Who is checking in?</h1>
                  <p>We’ll send the fictional confirmation to this guest.</p>
                  <div class="guest-form">
                    <ore-input
                      required
                      label="First name"
                      label-placement="outside"
                      value=${firstName}
                      @input=${(event: Event) => {
                        firstName.value = valueOf(event);
                      }}></ore-input>
                    <ore-input
                      required
                      label="Last name"
                      label-placement="outside"
                      value=${lastName}
                      @input=${(event: Event) => {
                        lastName.value = valueOf(event);
                      }}></ore-input>
                    <ore-input
                      class="guest-form__email"
                      required
                      type="email"
                      label="Email"
                      label-placement="outside"
                      value=${email}
                      error=${error}
                      @input=${(event: Event) => {
                        email.value = valueOf(event);
                        error.value = '';
                      }}></ore-input>
                  </div>
                  <ore-button color="primary" size="lg" @click=${confirm}>
                    Confirm demo booking
                    <ore-icon slot="suffix" name="check" size="17" aria-hidden="true"></ore-icon>
                  </ore-button>
                </section>
              `,
            )}
            ${when(
              () => step.value === 3,
              () => html`
                <section class="confirmation" aria-live="polite">
                  <div class="confirmation__mark"><ore-icon name="check" size="30" aria-hidden="true"></ore-icon></div>
                  <span class="eyebrow">RESERVATION CONFIRMED</span>
                  <h1>You’re booked.</h1>
                  <p>${() => hotel.value.name} is ready to welcome you to Japan.</p>
                  <div class="confirmation__ticket">
                    <div>
                      <small>STAY</small>
                      <strong>${() => hotel.value.name}</strong>
                      <span>${() => selectedRoom.value.name}</span>
                    </div>
                    <div>
                      <small>DATES</small>
                      <strong>12–16 October</strong>
                      <span>4 nights · 2 guests</span>
                    </div>
                    <div>
                      <small>CONFIRMATION</small>
                      <strong>#VYG-2841</strong>
                      <span>Demo reservation</span>
                    </div>
                  </div>
                  <div class="confirmation__actions">
                    <ore-button color="primary" size="lg" @click=${tripRoute}>Add to Japan trip</ore-button>
                    <ore-button variant="outline" size="lg" @click=${() => navigate('bookings')}>
                      View bookings
                    </ore-button>
                  </div>
                </section>
              `,
            )}
          </div>
          <aside class="booking-summary">
            <ore-skeleton class="booking-summary__media" striped radius="0" aria-hidden="true"></ore-skeleton>
            <div>
              <span class="rating">
                <ore-icon name="star" size="14" aria-hidden="true"></ore-icon>
                ${() => hotel.value.rating}
              </span>
              <h2>${() => hotel.value.name}</h2>
              <p>${() => hotel.value.location}</p>
            </div>
            <dl>
              <div>
                <dt>Dates</dt>
                <dd>12–16 October</dd>
              </div>
              <div>
                <dt>Room</dt>
                <dd>${() => selectedRoom.value.name}</dd>
              </div>
              <div>
                <dt>Guests</dt>
                <dd>2 adults</dd>
              </div>
              <div>
                <dt>4 nights</dt>
                <dd>${() => money((selectedRoom.value?.price ?? hotel.value.price) * 4)}</dd>
              </div>
              <div>
                <dt>Taxes & fees</dt>
                <dd>€48</dd>
              </div>
              <div class="booking-summary__total">
                <dt>Total</dt>
                <dd>${() => money(total.value)}</dd>
              </div>
            </dl>
            <p>
              <ore-icon name="shield-check" size="16" aria-hidden="true"></ore-icon>
              Free cancellation until 8 October
            </p>
          </aside>
        </div>
      </div>
    `;
  },
  shadow: false,
});
