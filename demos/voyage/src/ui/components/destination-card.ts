import '@vielzeug/refine/badge';
import '@vielzeug/refine/card';
import '@vielzeug/refine/icon';
import { html } from '@vielzeug/ore';
import type { Destination } from '../../core/types';
import { navigate } from '../navigation';

export function destinationCard(destination: Destination, featured = false) {
  return html`
    <ore-card
      class=${featured ? 'destination-card destination-card--featured' : 'destination-card'}
      interactive
      padding="none"
      elevation="1"
      @activate=${() => navigate('destination', { slug: destination.id })}>
      <img
        slot="media"
        src=${destination.image}
        alt=${`${destination.name}, Japan`}
        loading="lazy"
        width="1200"
        height="800" />
      <div class="destination-card__overlay">
        <div class="destination-card__meta">
          ${
            featured && destination.highlight
              ? html`
                  <ore-badge color="warning" size="sm" variant="frost">${destination.highlight}</ore-badge>
                `
              : ''
          }
          <span>${destination.stays} stays</span>
        </div>
        <span class="destination-card__region">${destination.region}</span>
        <h3 class=${featured ? 'destination-card__title destination-card__title--featured' : 'destination-card__title'}>
          ${destination.name}
        </h3>
        <p
          class=${featured ? 'destination-card__description destination-card__description--featured' : 'destination-card__description'}>
          ${destination.description}
        </p>
        <span class=${featured ? 'destination-card__cta' : 'destination-card__arrow'}>
          ${featured ? `Explore ${destination.name} stays` : ''}
          <ore-icon name=${featured ? 'arrow-right' : 'arrow-up-right'} size="17" aria-hidden="true"></ore-icon>
        </span>
      </div>
    </ore-card>
  `;
}
