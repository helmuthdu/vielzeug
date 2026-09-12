import '@vielzeug/refine/badge';
import '@vielzeug/refine/button';
import '@vielzeug/refine/card';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/skeleton';
import { html } from '@vielzeug/ore';
import { toast } from '@vielzeug/refine/toast';
import type { Experience } from '../../core/types';
import { money } from '../format';

export function experienceCard(experience: Experience) {
  return html`
    <ore-card class="experience-card" padding="none" elevation="1">
      <div class="experience-card__media" slot="media">
        <ore-skeleton class="experience-card__image" striped aria-hidden="true" radius="0"></ore-skeleton>
        <ore-badge color="primary" size="sm" variant="flat">${experience.curation}</ore-badge>
      </div>
      <div class="experience-card__body">
        <div class="experience-card__meta">
          <span>${experience.location} · ${experience.duration}</span>
          <span class="rating experience-card__rating" aria-label=${`Rated ${experience.rating} out of 5`}>
            <ore-icon name="star" size="14" aria-hidden="true"></ore-icon>
            ${experience.rating}
          </span>
        </div>
        <h3 class="experience-card__title">${experience.name}</h3>
        <p class="experience-card__description">${experience.description}</p>
        <div class="experience-card__footer">
          <p class="experience-card__price"><strong>${money(experience.price)}</strong><span>per person</span></p>
          <ore-button
            class="experience-card__action"
            color="primary"
            size="sm"
            rounded="full"
            variant="flat"
            aria-label=${`Add ${experience.name} to trip`}
            @click=${() => toast.add({ color: 'success', message: `${experience.name} added to your trip.` })}>
            <ore-icon slot="prefix" name="plus" size="14" aria-hidden="true"></ore-icon>
            Add to trip
          </ore-button>
        </div>
      </div>
    </ore-card>
  `;
}
