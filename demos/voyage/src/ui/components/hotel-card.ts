import '@vielzeug/refine/badge';
import '@vielzeug/refine/button';
import '@vielzeug/refine/card';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/skeleton';
import { html } from '@vielzeug/ore';
import type { Hotel } from '../../core/types';
import { money } from '../format';
import { navigate } from '../navigation';

export function hotelCard(hotel: Hotel) {
  return html`
    <ore-card class="hotel-card" padding="none" elevation="1">
      <ore-skeleton class="hotel-card__media" slot="media" striped aria-hidden="true"></ore-skeleton>
      <div class="hotel-card__body">
        <div class="card-row">
          <ore-badge color="primary" variant="flat" size="sm">Guest favorite</ore-badge>
          <span class="rating">
            <ore-icon name="star" size="14" aria-hidden="true"></ore-icon>
            ${hotel.rating}
          </span>
        </div>
        <h3>${hotel.name}</h3>
        <p>${hotel.location}</p>
        <div class="amenity-line">${hotel.amenities.slice(0, 3).join(' · ')}</div>
        <div class="card-row hotel-card__footer">
          <span>
            From
            <strong>${money(hotel.price)}</strong>
            / night
          </span>
          <ore-button size="sm" color="primary" @click=${() => navigate('hotel', { slug: hotel.id })}>
            View rooms
          </ore-button>
        </div>
      </div>
    </ore-card>
  `;
}
