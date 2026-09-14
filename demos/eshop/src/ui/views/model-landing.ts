import '@vielzeug/refine/accordion';
import '@vielzeug/refine/accordion-item';
import '@vielzeug/refine/box';
import '@vielzeug/refine/button';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/grid';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/navbar';
import '@vielzeug/refine/skeleton';
import '@vielzeug/refine/tab-item';
import '@vielzeug/refine/tabs';
import '@vielzeug/refine/text';

import { define, getHost, html, onCleanup, onMounted, prop } from '@vielzeug/ore';
import { computed, signal } from '@vielzeug/ripple';
import { compareModelIds, savedModelIds } from '../../core/cart-store';
import { getModelBySlug, modelsSignal } from '../../core/catalog';
import { formatPrice } from '../../core/currency';
import { toggleCompare, toggleSavedModel } from '../../core/history';
import { currentLocale, t } from '../../core/i18n';
import { router } from '../../core/router';
import type { Model } from '../../core/types';
import { openModelAdvisorChat } from '../components/model-advisor-chat';

type ModelLandingProps = { model?: Model };
type ModelSection = 'design' | 'experience' | 'interior' | 'specifications' | 'trims';

function scrollToSection(section: ModelSection): void {
  document.getElementById(`model-${section}`)?.scrollIntoView({
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  });
}

function relatedReason(current: Model, related: Model): string {
  if (related.powertrain === 'electric' && current.powertrain !== 'electric') return 'electric';
  if (related.bodyType !== current.bodyType) return related.bodyType;
  if (related.topSpeedKph > current.topSpeedKph) return 'performance';
  return 'similar';
}

function routeHref(path: string): string {
  return import.meta.env.BASE_URL === '/' ? path : `${import.meta.env.BASE_URL}#${path}`;
}

function shortModelName(model: Model): string {
  return model.name.replace(/^Vielzeug\s+/, '');
}

function landingHref(model: Model): string {
  return routeHref(`/models/${encodeURIComponent(model.slug)}`);
}

function configure(event: Event, model: Model, trimId?: string): void {
  event.preventDefault();
  void router.navigate({
    name: 'modelConfigurator',
    params: { slug: model.slug },
    query: trimId ? { trim: trimId } : {},
  });
}

function openModel(event: Event, model: Model): void {
  event.preventDefault();
  void router.navigate({ name: 'modelLanding', params: { slug: model.slug } });
}

function availabilityCopy(model: Model): string {
  const value = model.availability === 'coming-soon' ? 'comingSoon' : model.availability;
  return t(`modelLanding.availabilityValues.${value}`);
}

function equipmentCopy(id: string, field: 'description' | 'name'): string {
  return t(`modelLanding.packages.${id}.${field}`);
}

function trimDescription(id: string): string {
  return t(`modelLanding.trimDescriptions.${id}`);
}

function landingCopy(
  model: Model,
  key:
    | 'design'
    | 'designTitle'
    | 'driving'
    | 'experienceTitle'
    | 'interior'
    | 'interiorTitle'
    | 'intro'
    | 'positioning'
    | 'practicality'
    | 'tagline',
): string {
  return t(`modelLanding.copy.${model.id}.${key}`);
}

define<ModelLandingProps>('model-landing', {
  props: { model: prop.data<Model>() },
  setup(props) {
    const host = getHost();
    const model = () => props.model.value!;
    const activeSection = signal<ModelSection>('design');
    const selectedTrimId = signal('');
    const selectedTrim = computed(
      () => model().trims.find(({ id }) => id === selectedTrimId.value) ?? model().trims[0]!,
    );
    const relatedModels = computed(() =>
      modelsSignal.value
        .filter((candidate) => candidate.id !== model().id)
        .toSorted((left, right) => {
          const bodyMatch = Number(right.bodyType === model().bodyType) - Number(left.bodyType === model().bodyType);
          return (
            bodyMatch ||
            Math.abs(Number(left.basePrice) - Number(model().basePrice)) -
              Math.abs(Number(right.basePrice) - Number(model().basePrice))
          );
        })
        .slice(0, 3),
    );
    const number = (value: number, unit: string): string =>
      `${new Intl.NumberFormat(currentLocale.value).format(value)} ${unit}`;
    const technicalRows = (rows: Array<[string, string | number]>) => html`
      <dl>
        ${rows.map(
          ([label, value]) => html`
            <div class="model-landing-technical__row">
              <dt>${label}</dt>
              <dd>${value}</dd>
            </div>
          `,
        )}
      </dl>
    `;
    const renderTechnical = () => html`
      <section
        id="model-specifications"
        class="model-landing-section model-landing-technical"
        aria-labelledby="model-technical-title">
        <div class="model-landing-section__heading">
          <ore-text variant="overline" color="primary" size="xs">${() => t('modelLanding.technicalEyebrow')}</ore-text>
          <ore-text as="h2" id="model-technical-title" variant="heading" size="2xl">
            ${() => t('modelLanding.technicalTitle', { name: shortModelName(model()) })}
          </ore-text>
        </div>
        <ore-grid class="model-landing-technical__desktop" cols="1" cols-md="2" cols-lg="3" gap="md" fullwidth>
          <ore-box variant="flat" padding="lg" fullwidth>
            <ore-text variant="heading" size="md">${() => t('modelLanding.overview')}</ore-text>
            <dl>
              <div class="model-landing-technical__row">
                <dt>${() => t('modelLanding.bodyStyle')}</dt>
                <dd>${() => t(`catalog.bodyTypes.${model().bodyType}`)}</dd>
              </div>
              <div class="model-landing-technical__row">
                <dt>${() => t('model.seats')}</dt>
                <dd>${() => model().seats}</dd>
              </div>
              <div class="model-landing-technical__row">
                <dt>${() => t('modelLanding.cargo')}</dt>
                <dd>${() => number(model().technical.cargoLitres, 'L')}</dd>
              </div>
              <div class="model-landing-technical__row">
                <dt>${() => t('modelLanding.towing')}</dt>
                <dd>${() => number(model().technical.towingCapacityKg, 'kg')}</dd>
              </div>
            </dl>
          </ore-box>
          <ore-box variant="flat" padding="lg" fullwidth>
            <ore-text variant="heading" size="md">${() => t('modelLanding.performance')}</ore-text>
            <dl>
              <div class="model-landing-technical__row">
                <dt>${() => t('modelLanding.power')}</dt>
                <dd>${() => number(model().technical.powerKw, 'kW')}</dd>
              </div>
              <div class="model-landing-technical__row">
                <dt>${() => t('modelLanding.torque')}</dt>
                <dd>${() => number(model().technical.torqueNm, 'Nm')}</dd>
              </div>
              <div class="model-landing-technical__row">
                <dt>${() => t('modelLanding.drivetrain')}</dt>
                <dd>${() => t(`modelLanding.drivetrains.${model().technical.drivetrain}`)}</dd>
              </div>
              <div class="model-landing-technical__row">
                <dt>${() => t('model.zeroToHundred')}</dt>
                <dd>${() => `${model().zeroToHundredSec} s`}</dd>
              </div>
              <div class="model-landing-technical__row">
                <dt>${() => t('model.topSpeed')}</dt>
                <dd>${() => `${model().topSpeedKph} km/h`}</dd>
              </div>
            </dl>
          </ore-box>
          <ore-box variant="flat" padding="lg" fullwidth>
            <ore-text variant="heading" size="md">${() => t('modelLanding.dimensions')}</ore-text>
            <dl>
              <div class="model-landing-technical__row">
                <dt>${() => t('modelLanding.length')}</dt>
                <dd>${() => number(model().technical.lengthMm, 'mm')}</dd>
              </div>
              <div class="model-landing-technical__row">
                <dt>${() => t('modelLanding.width')}</dt>
                <dd>${() => number(model().technical.widthMm, 'mm')}</dd>
              </div>
              <div class="model-landing-technical__row">
                <dt>${() => t('modelLanding.height')}</dt>
                <dd>${() => number(model().technical.heightMm, 'mm')}</dd>
              </div>
              <div class="model-landing-technical__row">
                <dt>${() => t('modelLanding.wheelbase')}</dt>
                <dd>${() => number(model().technical.wheelbaseMm, 'mm')}</dd>
              </div>
              <div class="model-landing-technical__row">
                <dt>${() => t('modelLanding.curbWeight')}</dt>
                <dd>${() => number(model().technical.curbWeightKg, 'kg')}</dd>
              </div>
            </dl>
          </ore-box>
          <ore-box variant="flat" padding="lg" fullwidth>
            <ore-text variant="heading" size="md">${() => t('modelLanding.efficiency')}</ore-text>
            <dl>
              <div class="model-landing-technical__row">
                <dt>${() => t(model().rangeKm !== null ? 'model.range' : 'model.fuelEconomy')}</dt>
                <dd>
                  ${() => (model().rangeKm !== null ? `${model().rangeKm} km` : `${model().fuelEconomyLPer100Km} L/100 km`)}
                </dd>
              </div>
              <div class="model-landing-technical__row">
                <dt>
                  ${() => t(model().technical.batteryKwh !== null ? 'modelLanding.battery' : 'modelLanding.tank')}
                </dt>
                <dd>
                  ${() => (model().technical.batteryKwh !== null ? number(model().technical.batteryKwh!, 'kWh') : number(model().technical.tankLitres!, 'L'))}
                </dd>
              </div>
              ${() =>
                model().technical.chargeMinutes !== null
                  ? html`
                      <div class="model-landing-technical__row">
                        <dt>${() => t('modelLanding.charging')}</dt>
                        <dd>${() => number(model().technical.chargeMinutes!, 'min')}</dd>
                      </div>
                    `
                  : html``}
            </dl>
          </ore-box>
          <ore-box variant="flat" padding="lg" fullwidth>
            <ore-text variant="heading" size="md">${() => t('modelLanding.ownership')}</ore-text>
            <dl>
              <div class="model-landing-technical__row">
                <dt>${() => t('modelLanding.warranty')}</dt>
                <dd>${() => t('modelLanding.years', { count: model().technical.warrantyYears })}</dd>
              </div>
              <div class="model-landing-technical__row">
                <dt>${() => t('modelLanding.service')}</dt>
                <dd>
                  ${() => (model().technical.serviceIntervalKm === null ? t('modelLanding.conditionBased') : number(model().technical.serviceIntervalKm!, 'km'))}
                </dd>
              </div>
              <div class="model-landing-technical__row">
                <dt>${() => t('modelLanding.delivery')}</dt>
                <dd>${() => t('modelLanding.weeks', { count: model().technical.deliveryWeeks })}</dd>
              </div>
              <div class="model-landing-technical__row">
                <dt>${() => t('modelLanding.availability')}</dt>
                <dd>${() => availabilityCopy(model())}</dd>
              </div>
            </dl>
          </ore-box>
        </ore-grid>
        <ore-accordion class="model-landing-technical__mobile">
          <ore-accordion-item>
            <span slot="title">${() => t('modelLanding.overview')}</span>
            ${() =>
              technicalRows([
                [t('modelLanding.bodyStyle'), t(`catalog.bodyTypes.${model().bodyType}`)],
                [t('model.seats'), model().seats],
                [t('modelLanding.cargo'), number(model().technical.cargoLitres, 'L')],
                [t('modelLanding.towing'), number(model().technical.towingCapacityKg, 'kg')],
              ])}
          </ore-accordion-item>
          <ore-accordion-item>
            <span slot="title">${() => t('modelLanding.performance')}</span>
            ${() =>
              technicalRows([
                [t('modelLanding.power'), number(model().technical.powerKw, 'kW')],
                [t('modelLanding.torque'), number(model().technical.torqueNm, 'Nm')],
                [t('modelLanding.drivetrain'), t(`modelLanding.drivetrains.${model().technical.drivetrain}`)],
                [t('model.zeroToHundred'), `${model().zeroToHundredSec} s`],
                [t('model.topSpeed'), `${model().topSpeedKph} km/h`],
              ])}
          </ore-accordion-item>
          <ore-accordion-item>
            <span slot="title">${() => t('modelLanding.dimensions')}</span>
            ${() =>
              technicalRows([
                [t('modelLanding.length'), number(model().technical.lengthMm, 'mm')],
                [t('modelLanding.width'), number(model().technical.widthMm, 'mm')],
                [t('modelLanding.height'), number(model().technical.heightMm, 'mm')],
                [t('modelLanding.wheelbase'), number(model().technical.wheelbaseMm, 'mm')],
                [t('modelLanding.curbWeight'), number(model().technical.curbWeightKg, 'kg')],
              ])}
          </ore-accordion-item>
          <ore-accordion-item>
            <span slot="title">${() => t('modelLanding.efficiency')}</span>
            ${() =>
              technicalRows([
                [
                  t(model().rangeKm !== null ? 'model.range' : 'model.fuelEconomy'),
                  model().rangeKm !== null ? `${model().rangeKm} km` : `${model().fuelEconomyLPer100Km} L/100 km`,
                ],
                [
                  t(model().technical.batteryKwh !== null ? 'modelLanding.battery' : 'modelLanding.tank'),
                  model().technical.batteryKwh !== null
                    ? number(model().technical.batteryKwh!, 'kWh')
                    : number(model().technical.tankLitres!, 'L'),
                ],
                ...(model().technical.chargeMinutes !== null
                  ? [[t('modelLanding.charging'), number(model().technical.chargeMinutes!, 'min')] as [string, string]]
                  : []),
              ])}
          </ore-accordion-item>
          <ore-accordion-item>
            <span slot="title">${() => t('modelLanding.ownership')}</span>
            ${() =>
              technicalRows([
                [t('modelLanding.warranty'), t('modelLanding.years', { count: model().technical.warrantyYears })],
                [
                  t('modelLanding.service'),
                  model().technical.serviceIntervalKm === null
                    ? t('modelLanding.conditionBased')
                    : number(model().technical.serviceIntervalKm!, 'km'),
                ],
                [t('modelLanding.delivery'), t('modelLanding.weeks', { count: model().technical.deliveryWeeks })],
                [t('modelLanding.availability'), availabilityCopy(model())],
              ])}
          </ore-accordion-item>
        </ore-accordion>
      </section>
    `;

    onMounted(() => {
      const root = host.closest<HTMLElement>('.app-main');
      const stickyNavigation = host.querySelector<HTMLElement>('.model-landing-nav');
      const sections = (['design', 'interior', 'experience', 'specifications', 'trims'] as const)
        .map((section) => document.getElementById(`model-${section}`))
        .filter((section): section is HTMLElement => section !== null);
      let frame = 0;
      const update = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const rootTop = root?.getBoundingClientRect().top ?? 0;
          const threshold = rootTop + 120;
          if (root && stickyNavigation) {
            stickyNavigation.style.setProperty('--model-nav-viewport-width', `${root.clientWidth}px`);
            stickyNavigation.toggleAttribute(
              'data-stuck',
              root.scrollTop > 0 && stickyNavigation.getBoundingClientRect().top <= rootTop + 1,
            );
          }
          activeSection.value = sections.reduce<ModelSection>(
            (active, section) =>
              section.getBoundingClientRect().top <= threshold ? (section.id.slice(6) as ModelSection) : active,
            'design',
          );
          const target = host.querySelector<HTMLElement>(`[data-section-target="${activeSection.value}"]`);
          const navigation = target?.parentElement;
          if (target && navigation)
            navigation.scrollTo({ left: target.offsetLeft - (navigation.clientWidth - target.offsetWidth) / 2 });
        });
      };
      const resizeObserver = root ? new ResizeObserver(update) : undefined;
      if (root) resizeObserver?.observe(root);
      root?.addEventListener('scroll', update, { passive: true });
      update();
      onCleanup(() => {
        cancelAnimationFrame(frame);
        resizeObserver?.disconnect();
        root?.removeEventListener('scroll', update);
      });
    });

    return html`
      <article class="model-landing-page">
        <div class="model-landing-intro">
          <section class="model-landing-hero" aria-labelledby="model-landing-title">
            <ore-skeleton
              striped
              role="img"
              aria-label=${() => t('modelLanding.imageLabel', { name: model().name })}></ore-skeleton>
            <div class="model-landing-hero__copy">
              <ore-text variant="overline" size="xs">
                ${() => `${landingCopy(model(), 'positioning')} · ${t(`catalog.powertrains.${model().powertrain}`)}`}
              </ore-text>
              <ore-text id="model-landing-title" as="h1" variant="heading" size="3xl">${() => model().name}</ore-text>
              <ore-text class="model-landing-hero__tagline" size="lg">
                ${() => landingCopy(model(), 'tagline')}
              </ore-text>
              <ore-text class="model-landing-hero__intro">${() => landingCopy(model(), 'intro')}</ore-text>
              <ore-button
                class="model-landing-hero__explore"
                variant="frost"
                size="lg"
                rounded="full"
                @click=${() => scrollToSection('design')}>
                ${() => t('modelLanding.explore', { name: shortModelName(model()) })}
                <ore-icon slot="suffix" name="arrow-down" size="16" aria-hidden="true"></ore-icon>
              </ore-button>
            </div>
            <ore-button
              class="model-landing-hero__save"
              icon-only
              size="lg"
              variant="frost"
              label=${() => t(savedModelIds.value.includes(model().id) ? 'common.removeSavedVehicle' : 'common.saveVehicle')}
              aria-pressed=${() => String(savedModelIds.value.includes(model().id))}
              @click=${() => toggleSavedModel(model().id)}>
              <ore-icon
                name="heart"
                size="18"
                aria-hidden="true"
                ?solid=${() => savedModelIds.value.includes(model().id)}></ore-icon>
            </ore-button>
          </section>
        </div>
        <ore-navbar
          class="model-landing-nav"
          breakpoint="(max-width: 0px)"
          label=${() => t('modelLanding.pageNavigation')}>
          <ore-text slot="logo" class="model-landing-nav__identity" weight="semibold">${() => model().name}</ore-text>
          <div slot="end" class="model-landing-nav__links">
            <button
              type="button"
              class="model-landing-nav__item"
              data-section-target="design"
              aria-current=${() => (activeSection.value === 'design' ? 'location' : undefined)}
              @click=${() => scrollToSection('design')}>
              ${() => t('modelLanding.designNav')}
            </button>
            <button
              type="button"
              class="model-landing-nav__item"
              data-section-target="interior"
              aria-current=${() => (activeSection.value === 'interior' ? 'location' : undefined)}
              @click=${() => scrollToSection('interior')}>
              ${() => t('modelLanding.interiorNav')}
            </button>
            <button
              type="button"
              class="model-landing-nav__item"
              data-section-target="experience"
              aria-current=${() => (activeSection.value === 'experience' ? 'location' : undefined)}
              @click=${() => scrollToSection('experience')}>
              ${() => t('modelLanding.experienceNav')}
            </button>
            <button
              type="button"
              class="model-landing-nav__item"
              data-section-target="specifications"
              aria-current=${() => (activeSection.value === 'specifications' ? 'location' : undefined)}
              @click=${() => scrollToSection('specifications')}>
              ${() => t('modelLanding.specificationsTitle')}
            </button>
            <button
              type="button"
              class="model-landing-nav__item"
              data-section-target="trims"
              aria-current=${() => (activeSection.value === 'trims' ? 'location' : undefined)}
              @click=${() => scrollToSection('trims')}>
              ${() => t('modelLanding.configurationsNav')}
            </button>
          </div>
        </ore-navbar>

        <section id="model-design" class="model-landing-story" aria-labelledby="model-story-title">
          <ore-skeleton
            striped
            role="img"
            radius="0"
            aria-label=${() => t('modelLanding.storyImageLabel', { name: model().name })}></ore-skeleton>
          <ore-box variant="flat" padding="xl" fullwidth>
            <ore-text as="h2" id="model-story-title" variant="heading" size="2xl">
              ${() => landingCopy(model(), 'designTitle')}
            </ore-text>
            <ore-text color="muted">${() => landingCopy(model(), 'design')}</ore-text>
          </ore-box>
        </section>

        <section
          id="model-interior"
          class="model-landing-story model-landing-story--reverse"
          aria-labelledby="model-interior-title">
          <ore-box variant="flat" padding="xl" fullwidth>
            <ore-text as="h2" id="model-interior-title" variant="heading" size="2xl">
              ${() => landingCopy(model(), 'interiorTitle')}
            </ore-text>
            <ore-text color="muted">${() => landingCopy(model(), 'interior')}</ore-text>
          </ore-box>
          <ore-skeleton
            striped
            role="img"
            radius="0"
            aria-label=${() => t('modelLanding.interiorImageLabel', { name: model().name })}></ore-skeleton>
        </section>

        <section
          id="model-experience"
          class="model-landing-section model-landing-experience"
          aria-labelledby="model-experience-title">
          <div class="model-landing-section__heading">
            <ore-text as="h2" id="model-experience-title" variant="heading" size="2xl">
              ${() => landingCopy(model(), 'experienceTitle')}
            </ore-text>
          </div>
          <ore-grid cols="1" cols-md="2" gap="md" fullwidth>
            <ore-box variant="flat" padding="xl" fullwidth>
              <ore-icon class="model-landing-experience__icon" name="gauge" size="22" aria-hidden="true"></ore-icon>
              <ore-text variant="heading" size="lg">${() => t('modelLanding.drivingTitle')}</ore-text>
              <ore-text color="muted">${() => landingCopy(model(), 'driving')}</ore-text>
            </ore-box>
            <ore-box variant="flat" padding="xl" fullwidth>
              <ore-icon class="model-landing-experience__icon" name="route" size="22" aria-hidden="true"></ore-icon>
              <ore-text variant="heading" size="lg">${() => t('modelLanding.practicalityTitle')}</ore-text>
              <ore-text color="muted">${() => landingCopy(model(), 'practicality')}</ore-text>
            </ore-box>
          </ore-grid>
        </section>

        ${renderTechnical()}

        <ore-box class="model-advisor-callout" variant="flat" padding="lg" fullwidth>
          <div class="model-advisor-callout__identity">
            <ore-icon name="headset" size="32" color="primary"></ore-icon>
            <div>
              <ore-text variant="heading" size="lg">
                ${() => t('modelAdvisor.calloutTitle', { name: shortModelName(model()) })}
              </ore-text>
              <ore-text color="muted">${() => t('modelAdvisor.calloutHint')}</ore-text>
            </div>
          </div>
          <ore-button variant="outline" rounded="full" @click=${openModelAdvisorChat}>
            ${() => t('modelAdvisor.open')}
            <ore-icon slot="suffix" name="message-circle" size="16" aria-hidden="true"></ore-icon>
          </ore-button>
        </ore-box>

        <section id="model-trims" class="model-landing-section model-landing-trims" aria-labelledby="model-trims-title">
          <div class="model-landing-section__heading">
            <ore-text variant="overline" color="primary" size="xs">${() => t('modelLanding.trimsEyebrow')}</ore-text>
            <ore-text as="h2" id="model-trims-title" variant="heading" size="2xl">
              ${() => t('modelLanding.trimsTitle', { name: shortModelName(model()) })}
            </ore-text>
            <ore-text color="muted">${() => t('modelLanding.trimsHint')}</ore-text>
          </div>
          <ore-tabs
            class="model-landing-trim-tabs"
            variant="ghost"
            label=${() => t('modelLanding.trimsTitle', { name: shortModelName(model()) })}
            value=${() => selectedTrim.value.id}
            @change=${(event: CustomEvent<{ value: string }>) => {
              selectedTrimId.value = event.detail.value;
            }}>
            ${() =>
              model().trims.map(
                (trim) => html`
                  <ore-tab-item slot="tabs" value=${trim.id} variant="ghost">
                    <span>${trim.name}</span>
                    <small class="model-landing-trim-tab__price">
                      ${formatPrice(String(Number(model().basePrice) + Number(trim.priceDelta)))}
                    </small>
                  </ore-tab-item>
                `,
              )}
          </ore-tabs>
          <ore-box class="model-landing-trim-explorer" variant="flat" padding="xl" fullwidth>
            <div class="model-landing-trim-explorer__intro">
              <ore-text variant="overline" color="primary" size="xs">${() => t('modelLanding.selectedTrim')}</ore-text>
              <ore-text variant="heading" size="2xl">${() => selectedTrim.value.name}</ore-text>
              <ore-text color="muted">${() => trimDescription(selectedTrim.value.id)}</ore-text>
            </div>
            <div class="model-landing-trim-explorer__packages">
              <ore-text variant="heading" size="sm">${() => t('model.includedPackages')}</ore-text>
              ${() =>
                selectedTrim.value.includedPackageIds.map((packageId) => {
                  const option = model().packages.find(({ id }) => id === packageId);
                  return option
                    ? html`
                        <div class="model-landing-trim-package">
                          <ore-icon name="check" size="16" aria-hidden="true"></ore-icon>
                          <span class="model-landing-trim-package__copy">
                            <strong>${() => equipmentCopy(option.id, 'name')}</strong>
                            <small class="model-landing-trim-package__description">
                              ${() => equipmentCopy(option.id, 'description')}
                            </small>
                          </span>
                        </div>
                      `
                    : html``;
                })}
            </div>
            <div class="model-landing-trim-explorer__action">
              <span>
                <ore-text variant="caption" color="muted">${() => t('common.startingAt')}</ore-text>
                <ore-text variant="heading" size="xl">
                  ${() => formatPrice(String(Number(model().basePrice) + Number(selectedTrim.value.priceDelta)))}
                </ore-text>
              </span>
              <ore-button
                class="model-landing-cta"
                color="primary"
                rounded="full"
                effect="shine"
                @click=${(event: Event) => configure(event, model(), selectedTrim.value.id)}>
                ${() => t('modelLanding.configureTrim', { trim: selectedTrim.value.name })}
              </ore-button>
            </div>
            <ore-text class="model-landing-trim-explorer__disclaimer" variant="caption" color="muted">
              ${() => t('modelLanding.priceDisclaimer')}
            </ore-text>
          </ore-box>
        </section>

        <ore-box class="model-landing-compare-discovery" variant="flat" padding="lg" fullwidth>
          <div class="model-landing-compare-discovery__copy">
            <ore-text variant="heading" size="lg">${() => t('modelLanding.compareDiscoveryTitle')}</ore-text>
            <ore-text color="muted">${() => t('modelLanding.compareDiscoveryHint', { name: model().name })}</ore-text>
          </div>
          <ore-button
            class="model-landing-compare-discovery__action"
            variant="outline"
            aria-pressed=${() => String(compareModelIds.value.includes(model().id))}
            @click=${() => toggleCompare(model().id)}>
            <ore-icon slot="prefix" name="git-compare" size="16" aria-hidden="true"></ore-icon>
            ${() => t(compareModelIds.value.includes(model().id) ? 'common.compared' : 'common.addToCompare')}
          </ore-button>
          <ore-text class="sr-only" role="status" aria-live="polite">
            ${() => t('modelLanding.compareStatus', { count: compareModelIds.value.length })}
          </ore-text>
        </ore-box>

        <section class="model-landing-section" aria-labelledby="related-models-title">
          <div class="model-landing-section__heading">
            <ore-text as="h2" id="related-models-title" variant="heading" size="2xl">
              ${() => t('modelLanding.relatedTitle')}
            </ore-text>
          </div>
          <ore-grid class="model-landing-related-rail" cols="1" cols-sm="3" gap="md" fullwidth>
            ${() =>
              relatedModels.value.map(
                (related) => html`
                  <a
                    class="model-landing-related"
                    href=${landingHref(related)}
                    @click=${(event: Event) => openModel(event, related)}>
                    <ore-box variant="flat" padding="none" fullwidth>
                      <ore-skeleton striped aria-hidden="true" radius="0"></ore-skeleton>
                      <div class="model-landing-related__copy">
                        <ore-text variant="overline" size="xs" color="primary">
                          ${() => landingCopy(related, 'positioning')}
                        </ore-text>
                        <ore-text variant="heading" size="lg">${related.name}</ore-text>
                        <ore-text color="muted">${() => landingCopy(related, 'tagline')}</ore-text>
                        <ore-text class="model-landing-related__reason" variant="caption" color="primary">
                          ${() => t(`modelLanding.relatedReasons.${relatedReason(model(), related)}`)}
                        </ore-text>
                        <span class="model-landing-related__action">
                          ${() => t('modelLanding.exploreModel')}
                          <ore-icon name="arrow-right" size="15" aria-hidden="true"></ore-icon>
                        </span>
                      </div>
                    </ore-box>
                  </a>
                `,
              )}
          </ore-grid>
        </section>
        <model-advisor-chat model=${() => model()}></model-advisor-chat>
      </article>
    `;
  },
  shadow: false,
});

export function createModelLandingView(slug: string): HTMLElement {
  const model = getModelBySlug(slug);
  if (!model) {
    const empty = document.createElement('div');
    const heading = document.createElement('h1');
    const message = document.createElement('p');
    empty.className = 'model-landing-empty';
    heading.textContent = t('model.notFoundTitle');
    message.textContent = t('model.notFound');
    empty.append(heading, message);
    return empty;
  }
  const element = document.createElement('model-landing') as HTMLElement & { model: Model };
  element.model = model;
  return element;
}
