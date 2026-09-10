import '@vielzeug/refine/button';
import '@vielzeug/refine/card';
import '@vielzeug/refine/icon';
import { define, html } from '@vielzeug/ore';
import { computed } from '@vielzeug/ripple';
import { destinationById, experiences, hotels } from '../../core/data';
import { activeRouteParams, router } from '../../core/router';
import { experienceCard } from '../components/experience-card';
import { hotelCard } from '../components/hotel-card';
import { sectionHeading } from '../components/section-heading';
import { navigate, tripRoute } from '../navigation';

define('destination-view', {
  setup() {
    const destination = computed(() => destinationById(activeRouteParams.value.slug));
    const destinationHotels = computed(() => hotels.filter((hotel) => hotel.destinationId === destination.value.id));
    const destinationExperiences = computed(() =>
      experiences.filter((experience) =>
        experience.location.toLowerCase().includes(destination.value.name.toLowerCase()),
      ),
    );
    return html`
      <article>
        <header class="destination-hero">
          <img
            src=${() => destination.value.image}
            alt=${() => `${destination.value.name}, Japan`}
            width="1800"
            height="1013" />
          <div class="destination-hero__shade"></div>
          <div class="destination-hero__copy">
            <ore-button class="back-button" size="sm" variant="frost" @click=${() => navigate('explore')}>
              <ore-icon slot="prefix" name="arrow-left" size="16" aria-hidden="true"></ore-icon>
              Explore
            </ore-button>
            <span class="eyebrow eyebrow--light">${() => destination.value.region.toUpperCase()} · JAPAN</span>
            <h1>${() => destination.value.name}</h1>
            <p>${() => destination.value.description}</p>
            <ore-button color="primary" size="lg" @click=${tripRoute}>Add to Japan trip</ore-button>
          </div>
        </header>
        <div class="page-content page-content--narrow">
          <section class="editorial-intro">
            <span>
              ${() => destination.value.coordinates.latitude}
              <br />
              ${() => destination.value.coordinates.longitude}
            </span>
            <div>
              <span class="eyebrow">WHY GO</span>
              <h2>${() => destination.value.editorial.heading}</h2>
              <p>${() => destination.value.editorial.description}</p>
            </div>
          </section>
          <section class="content-section">
            <div class="heading-row">
              ${sectionHeading('STAY', `Recommended in ${destination.value.name}`)}
              <ore-button
                variant="text"
                @click=${() => void router.navigate(`/search?destination=${destination.value.id}`)}>
                View all stays
                <ore-icon slot="suffix" name="arrow-right" size="16" aria-hidden="true"></ore-icon>
              </ore-button>
            </div>
            <div class="hotel-grid">
              ${() =>
                destinationHotels.value.length
                  ? destinationHotels.value.map(hotelCard)
                  : html`
                      <ore-card class="empty-results" padding="xl">
                        <h3>No demo stays yet</h3>
                        <p>Explore another destination for bookable accommodation.</p>
                      </ore-card>
                    `}
            </div>
          </section>
          <section class="split-feature">
            <img
              src=${() => destination.value.feature.image}
              alt=${() => destination.value.feature.imageAlt}
              loading="lazy"
              width="1200"
              height="750" />
            <div>
              <span class="eyebrow">A DAY TO REMEMBER</span>
              <h2>${() => destination.value.feature.heading}</h2>
              <p>${() => destination.value.feature.description}</p>
            </div>
          </section>
          <section class="content-section">
            ${sectionHeading('DO', 'Experiences worth traveling for')}
            <div class="experience-grid">${() => destinationExperiences.value.map(experienceCard)}</div>
          </section>
        </div>
      </article>
    `;
  },
  shadow: false,
});
