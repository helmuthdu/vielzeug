import '@vielzeug/refine/badge';
import '@vielzeug/refine/button';
import '@vielzeug/refine/card';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/skeleton';
import { html } from '@vielzeug/ore';
import { toast } from '@vielzeug/refine/toast';
import { savedHotelIds, toggleSavedHotel } from '../../core/state';
import type { Hotel } from '../../core/types';
import { money } from '../format';
import { navigate, routeHref } from '../navigation';

export function hotelCard(hotel: Hotel) {
  const hotelParams = { slug: hotel.id };
  const toggleSaved = (): void => {
    const saved = toggleSavedHotel(hotel.id);
    toast.add({
      color: saved ? 'success' : 'info',
      message: saved ? `${hotel.name} saved.` : `${hotel.name} removed.`,
    });
  };
  const openHotel = (event: MouseEvent): void => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate('hotel', hotelParams);
  };
  const visibleAmenities = hotel.amenities.slice(0, 2);
  const remainingAmenities = hotel.amenities.length - visibleAmenities.length;

  return html`
    <ore-card class="hotel-card" padding="none" elevation="1">
      <div class="hotel-card__media" slot="media">
        <ore-skeleton class="hotel-card__image" striped aria-hidden="true" radius="0"></ore-skeleton>
        ${
          hotel.badge
            ? html`
                <ore-badge
                  class="hotel-card__badge"
                  color=${hotel.badge === 'Only 2 rooms left' ? 'warning' : 'primary'}
                  size="sm"
                  variant="flat">
                  ${hotel.badge}
                </ore-badge>
              `
            : ''
        }
        <ore-button
          class="hotel-card__save"
          color=${() => (savedHotelIds.value.includes(hotel.id) ? 'primary' : undefined)}
          icon-only
          label=${() => (savedHotelIds.value.includes(hotel.id) ? 'Remove saved hotel' : 'Save hotel')}
          rounded="full"
          size="sm"
          variant=${() => (savedHotelIds.value.includes(hotel.id) ? 'solid' : 'frost')}
          aria-pressed=${() => String(savedHotelIds.value.includes(hotel.id))}
          @click=${toggleSaved}>
          <ore-icon
            name="heart"
            size="16"
            aria-hidden="true"
            ?solid=${() => savedHotelIds.value.includes(hotel.id)}></ore-icon>
        </ore-button>
      </div>

      <div class="hotel-card__body">
        <div class="hotel-card__meta">
          <span>${hotel.propertyType}</span>
          <span
            class="rating hotel-card__rating"
            aria-label=${`Rated ${hotel.rating} out of 5 from ${hotel.reviewCount} reviews`}>
            <ore-icon name="star" size="14" aria-hidden="true"></ore-icon>
            <strong>${hotel.rating}</strong>
            <small>(${hotel.reviewCount})</small>
          </span>
        </div>
        <h3 class="hotel-card__title">
          <a href=${routeHref('hotel', hotelParams)} @click=${openHotel}>${hotel.name}</a>
        </h3>
        <p class="hotel-card__location">${hotel.location}</p>
        <ul class="hotel-card__amenities" aria-label="Top amenities">
          ${visibleAmenities.map(
            (amenity) => html`
              <li>${amenity}</li>
            `,
          )}
          ${
            remainingAmenities
              ? html`
                  <li aria-label=${`${remainingAmenities} more amenities`}>+${remainingAmenities}</li>
                `
              : ''
          }
        </ul>
        <div class="hotel-card__footer">
          <span class="hotel-card__price">
            <small class="hotel-card__price-label">From</small>
            <span>
              <strong>${money(hotel.price)}</strong>
              <small class="hotel-card__price-unit">/ night</small>
            </span>
          </span>
          <ore-button size="sm" color="primary" @click=${() => navigate('hotel', hotelParams)}>View rooms</ore-button>
        </div>
      </div>
    </ore-card>
  `;
}
