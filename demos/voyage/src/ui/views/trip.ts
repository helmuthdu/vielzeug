import '@vielzeug/refine/badge';
import '@vielzeug/refine/button';
import '@vielzeug/refine/dialog';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/input';
import '@vielzeug/refine/select';
import { define, html, onMounted, ref, when } from '@vielzeug/ore';
import { toast } from '@vielzeug/refine/toast';
import { signal } from '@vielzeug/ripple';
import {
  addItineraryItem,
  itinerary,
  moveItineraryItem,
  removeItineraryItem,
  upcomingBookings,
} from '../../core/state';
import type { ItineraryItem } from '../../core/types';
import { projectJourney, type RouteGeometry } from '../components/journey-route';
import { valueOf } from '../format';
import { navigate } from '../navigation';

define('trip-view', {
  setup() {
    const activityOpen = signal(false);
    const marker = signal<'Tokyo' | 'Kyoto' | 'Osaka' | null>(null);
    const routeMap = ref<HTMLElement>();
    const routeGeometry = signal(projectJourney(734, 390));
    const activityTitle = signal('Evening neighborhood walk');
    const activityTime = signal('18:00');
    const addActivity = (): void => {
      addItineraryItem(1, {
        id: `activity-${Date.now()}`,
        subtitle: 'Shibuya',
        time: activityTime.value,
        title: activityTitle.value,
        type: 'activity',
      });
      activityOpen.value = false;
      toast.add({ color: 'success', message: 'Activity added to 13 October.' });
    };
    const markerStyle = (city: keyof RouteGeometry['points']): string => {
      const point = routeGeometry.value.points[city];
      return `--marker-x:${point.x}px;--marker-y:${point.y}px`;
    };

    onMounted(() => {
      const map = routeMap.value;
      if (!map) return;
      const update = (): void => {
        routeGeometry.value = projectJourney(map.clientWidth, map.clientHeight);
      };
      const observer = new ResizeObserver(update);
      observer.observe(map);
      update();
      return () => observer.disconnect();
    });

    const itemIcon = (type: ItineraryItem['type']): string =>
      type === 'transport'
        ? 'train-front'
        : type === 'accommodation'
          ? 'bed-double'
          : type === 'food'
            ? 'utensils'
            : 'sparkles';
    return html`
      <article class="trip-detail">
        <header class="trip-header">
          <div class="trip-header__top">
            <ore-button variant="frost" size="sm" @click=${() => navigate('trips')}>
              <ore-icon slot="prefix" name="arrow-left" size="16" aria-hidden="true"></ore-icon>
              All trips
            </ore-button>
            <div>
              <ore-button
                variant="frost"
                size="sm"
                @click=${() => {
                  toast.add({ color: 'info', message: 'A private trip link was copied.' });
                }}>
                <ore-icon slot="prefix" name="share-2" size="16" aria-hidden="true"></ore-icon>
                Share
              </ore-button>
              <ore-button
                color="primary"
                size="sm"
                @click=${() => {
                  activityOpen.value = true;
                }}>
                <ore-icon slot="prefix" name="plus" size="16" aria-hidden="true"></ore-icon>
                Add activity
              </ore-button>
            </div>
          </div>
          <div class="trip-header__title">
            <span class="eyebrow eyebrow--light">12–19 OCTOBER · 7 DAYS</span>
            <h1>Japan</h1>
            <p>
              Tokyo
              <i></i>
              Kyoto
              <i></i>
              Osaka
            </p>
          </div>
          <div class="trip-stats">
            <span>
              <strong>3</strong>
              <small>Cities</small>
            </span>
            <span>
              <strong>${() => upcomingBookings.value.length}</strong>
              <small>Bookings</small>
            </span>
            <span>
              <strong>2</strong>
              <small>Travelers</small>
            </span>
            <span>
              <strong>7</strong>
              <small>Days</small>
            </span>
          </div>
        </header>
        <div class="trip-workspace">
          <section class="journey-map" aria-labelledby="journey-map-title">
            <header>
              <div>
                <span class="eyebrow">YOUR ROUTE</span>
                <h2 id="journey-map-title">Across Japan</h2>
              </div>
              <ore-button
                size="sm"
                variant="outline"
                href="https://www.openstreetmap.org/#map=7/35.25/137.7"
                target="_blank"
                rel="noopener noreferrer">
                <ore-icon slot="prefix" name="maximize-2" size="15" aria-hidden="true"></ore-icon>
                Open map
              </ore-button>
            </header>
            <div class="route-map" ref=${routeMap}>
              <iframe
                class="osm-frame"
                title="OpenStreetMap route from Tokyo through Kyoto to Osaka"
                src="https://www.openstreetmap.org/export/embed.html?bbox=135.1%2C34.3%2C140.2%2C36.2&amp;layer=mapnik"
                loading="lazy"></iframe>
              <a
                class="map-attribution"
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noopener noreferrer">
                © OpenStreetMap contributors
              </a>
              <span class="map-static-label">Static route preview</span>
              <svg
                class="route-path"
                viewBox=${() => `0 0 ${routeGeometry.value.width} ${routeGeometry.value.height}`}
                preserveAspectRatio="none"
                aria-hidden="true">
                <path d=${() => routeGeometry.value.path}></path>
              </svg>
              <button
                class="city-marker city-marker--tokyo"
                style=${() => markerStyle('Tokyo')}
                type="button"
                aria-label="Tokyo, 4 bookings"
                @click=${() => {
                  marker.value = marker.value === 'Tokyo' ? null : 'Tokyo';
                }}>
                <i></i>
                <strong>Tokyo</strong>
                <small>12–15 Oct</small>
              </button>
              <button
                class="city-marker city-marker--kyoto"
                style=${() => markerStyle('Kyoto')}
                type="button"
                aria-label="Kyoto, 3 bookings"
                @click=${() => {
                  marker.value = marker.value === 'Kyoto' ? null : 'Kyoto';
                }}>
                <i></i>
                <strong>Kyoto</strong>
                <small>15–18 Oct</small>
              </button>
              <button
                class="city-marker city-marker--osaka"
                style=${() => markerStyle('Osaka')}
                type="button"
                aria-label="Osaka, 2 bookings"
                @click=${() => {
                  marker.value = marker.value === 'Osaka' ? null : 'Osaka';
                }}>
                <i></i>
                <strong>Osaka</strong>
                <small>18–19 Oct</small>
              </button>
              ${when(
                () => marker.value !== null,
                () => html`
                  <div class="marker-card">
                    <ore-badge size="sm" variant="flat" color="primary">${() => marker.value}</ore-badge>
                    <strong>
                      ${() => (marker.value === 'Tokyo' ? '4 bookings · 3 activities' : marker.value === 'Kyoto' ? '3 bookings · 3 activities' : '2 bookings · 2 activities')}
                    </strong>
                    <ore-button
                      size="sm"
                      variant="text"
                      @click=${() => document.querySelector('.itinerary')?.scrollIntoView({ behavior: 'smooth' })}>
                      View itinerary
                    </ore-button>
                  </div>
                `,
              )}
            </div>
            <footer>
              <span>
                <i class="legend-dot legend-dot--stay"></i>
                Stay
              </span>
              <span>
                <i class="legend-dot legend-dot--route"></i>
                Rail route
              </span>
              <span>511 km by train</span>
            </footer>
          </section>
          <aside class="trip-bookings">
            <header>
              <span class="eyebrow">BOOKED</span>
              <h2>Reservations</h2>
            </header>
            ${() =>
              upcomingBookings.value.slice(0, 4).map(
                (booking) => html`
                  <div class="mini-booking">
                    <span class=${`booking-icon booking-icon--${booking.type}`}>
                      <ore-icon
                        name=${booking.type === 'hotel' ? 'bed-double' : booking.type === 'transport' ? 'train-front' : 'utensils'}
                        size="17"
                        aria-hidden="true"></ore-icon>
                    </span>
                    <div>
                      <strong>${booking.title}</strong>
                      <span>${booking.dates}</span>
                    </div>
                    <ore-icon name="check-circle-2" size="17" aria-label="Confirmed"></ore-icon>
                  </div>
                `,
              )}
            <ore-button fullwidth variant="outline" @click=${() => navigate('bookings')}>View all bookings</ore-button>
          </aside>
        </div>
        <section class="itinerary page-content page-content--narrow" aria-labelledby="itinerary-title">
          <header class="heading-row">
            <div>
              <span class="eyebrow">DAY BY DAY</span>
              <h2 id="itinerary-title">Your itinerary</h2>
              <p>Four unhurried days from arrival to Osaka.</p>
            </div>
            <ore-button
              color="primary"
              @click=${() => {
                activityOpen.value = true;
              }}>
              <ore-icon slot="prefix" name="plus" size="16" aria-hidden="true"></ore-icon>
              Add activity
            </ore-button>
          </header>
          <div class="itinerary-days">
            ${() =>
              itinerary.value.map(
                (day, dayIndex) => html`
                  <article class="itinerary-day" id=${`day-${dayIndex}`}>
                    <header>
                      <div>
                        <span>${day.date}</span>
                        <strong>${day.city}</strong>
                      </div>
                      <small>DAY ${dayIndex + 1}</small>
                    </header>
                    <div class="timeline">
                      ${day.items.map(
                        (item, itemIndex) => html`
                          <div class="timeline-item">
                            <time>${item.time}</time>
                            <span class=${`timeline-icon timeline-icon--${item.type}`}>
                              <ore-icon name=${itemIcon(item.type)} size="17" aria-hidden="true"></ore-icon>
                            </span>
                            <div>
                              <strong>${item.title}</strong>
                              ${
                                item.subtitle
                                  ? html`
                                      <span>${item.subtitle}</span>
                                    `
                                  : ''
                              }
                            </div>
                            <div class="timeline-actions">
                              <ore-button
                                icon-only
                                size="sm"
                                variant="ghost"
                                label="Move earlier"
                                ?disabled=${itemIndex === 0}
                                @click=${() => moveItineraryItem(dayIndex, itemIndex, -1)}>
                                <ore-icon name="arrow-up" size="14" aria-hidden="true"></ore-icon>
                              </ore-button>
                              <ore-button
                                icon-only
                                size="sm"
                                variant="ghost"
                                label="Move later"
                                ?disabled=${itemIndex === day.items.length - 1}
                                @click=${() => moveItineraryItem(dayIndex, itemIndex, 1)}>
                                <ore-icon name="arrow-down" size="14" aria-hidden="true"></ore-icon>
                              </ore-button>
                              <ore-button
                                icon-only
                                size="sm"
                                variant="ghost"
                                label=${`Remove ${item.title}`}
                                @click=${() => removeItineraryItem(dayIndex, item.id)}>
                                <ore-icon name="x" size="14" aria-hidden="true"></ore-icon>
                              </ore-button>
                            </div>
                          </div>
                        `,
                      )}
                    </div>
                  </article>
                `,
              )}
          </div>
        </section>
        <ore-dialog
          label="Add activity"
          size="sm"
          dismissible
          ?open=${() => activityOpen.value}
          @open-change=${(event: Event) => {
            activityOpen.value = (event as CustomEvent<{ open: boolean }>).detail.open;
          }}>
          <div class="activity-form">
            <p>Add a moment to 13 October in Tokyo.</p>
            <ore-input
              label="Activity"
              label-placement="outside"
              value=${activityTitle}
              @input=${(event: Event) => {
                activityTitle.value = valueOf(event);
              }}></ore-input>
            <ore-input
              type="time"
              label="Time"
              label-placement="outside"
              value=${activityTime}
              @input=${(event: Event) => {
                activityTime.value = valueOf(event);
              }}></ore-input>
            <ore-select
              label="Type"
              label-placement="outside"
              value="activity"
              options=${[
                { label: 'Activity', value: 'activity' },
                { label: 'Food', value: 'food' },
                { label: 'Transport', value: 'transport' },
              ]}></ore-select>
          </div>
          <div slot="footer">
            <ore-button
              variant="ghost"
              @click=${() => {
                activityOpen.value = false;
              }}>
              Cancel
            </ore-button>
            <ore-button color="primary" @click=${addActivity}>Add to itinerary</ore-button>
          </div>
        </ore-dialog>
      </article>
    `;
  },
  shadow: false,
});
