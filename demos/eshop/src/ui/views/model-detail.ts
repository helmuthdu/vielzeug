import '@vielzeug/refine/select';
import '@vielzeug/refine/skeleton';
import '@vielzeug/refine/checkbox-group';
import '@vielzeug/refine/checkbox';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/number-input';
import '@vielzeug/refine/tooltip';
import '@vielzeug/refine/button';
import '@vielzeug/refine/icon';

import '../components/share-build-dialog';
import '../components/animated-price';
import '../components/model-card';

import { define, html, prop, when } from '@vielzeug/ore';
import { computed, effect, signal } from '@vielzeug/ripple';
import { buildConfigurationUrl } from '../../core/build-url';
import { compareModelIds, savedModelIds } from '../../core/cart-store';
import { getModelBySlug, modelsSignal } from '../../core/catalog';
import { controlValue } from '../../core/control-value';
import { currentCurrency, displayAmount, displayAmountToUsd, formatPrice } from '../../core/currency';
import { bus } from '../../core/events';
import { addToCart, toggleCompare, toggleSavedModel } from '../../core/history';
import { t } from '../../core/i18n';
import { computePriceBreakdown, estimateMonthlyPayment, resolveConfiguration } from '../../core/pricing';
import { activeRouteQuery, router } from '../../core/router';
import type { Configuration, FeatureKey, Model } from '../../core/types';
import { openShareBuildDialog } from '../components/share-build-dialog';

/** Icon per feature-card key (`model.features.*` in `core/i18n.ts` owns the label text) —
 * lucide names bundled through `@vielzeug/refine`'s own icon set. */
const FEATURE_ICON: Record<FeatureKey, string> = {
  adaptiveCruise: 'gauge',
  headUpDisplay: 'monitor',
  massageSeats: 'armchair',
  matrixLed: 'zap',
  panoramicRoof: 'sun',
  premiumAudio: 'volume-2',
  wirelessCharging: 'battery-charging',
};

/** A flat 4.9% APR / 60-month default — the same terms `checkout-payment`'s financing radio
 * defaults to — so the PDP's "as low as" figure and the number a shopper actually commits to at
 * checkout don't disagree without a reason. */
const FINANCE_DEFAULT_APR = 4.9;
const FINANCE_TERM_OPTIONS = [36, 48, 60, 72];

const RELATED_MODEL_LIMIT = 4;

type ModelConfiguratorProps = { model: Model | undefined };

/**
 * The configurator. Local, non-`ledger`-tracked draft state — trim/color/wheel/package picks
 * are transient page state until "Add to cart" commits them, mirroring how demos/crm never
 * wraps its task-dialog draft in the app's undo/redo ledger either (see core/history.ts's
 * module comment). Defined once at module scope with a `model` data prop — NOT dynamically
 * per-model, which would try to re-register the same custom element tag on a repeat visit.
 */
define<ModelConfiguratorProps>('model-configurator', {
  props: {
    model: prop.data<Model>(),
  },
  setup(props) {
    const model = (): Model => props.model.value!;

    const queryValue = (key: string): string | null => {
      const value = activeRouteQuery.value[key];
      return typeof value === 'string' ? value : null;
    };
    const requestedTrim = queryValue('trim');
    const requestedColor = queryValue('color');
    const requestedWheel = queryValue('wheel');
    const initialTrim = model().trims.find((option) => option.id === requestedTrim) ?? model().trims[0];
    const trimId = signal(initialTrim.id);
    const colorId = signal(
      model().colors.some((option) => option.id === requestedColor) ? requestedColor! : model().colors[0].id,
    );
    const wheelId = signal(
      model().wheels.some((option) => option.id === requestedWheel) ? requestedWheel! : model().wheels[0].id,
    );
    const extraPackageIds = signal(
      (queryValue('packages')?.split(',') ?? []).filter(
        (id) => model().packages.some((option) => option.id === id) && !initialTrim.includedPackageIds.includes(id),
      ),
    );

    const trim = computed(() => model().trims.find((option) => option.id === trimId.value)!);
    const color = computed(() => model().colors.find((option) => option.id === colorId.value)!);
    const configurationStatus = signal('');
    const optionalPackages = computed(() =>
      model().packages.filter((p) => !trim.value.includedPackageIds.includes(p.id)),
    );
    const includedPackages = computed(() =>
      model().packages.filter((p) => trim.value.includedPackageIds.includes(p.id)),
    );

    const configuration = computed<Configuration>(() => ({
      colorId: colorId.value,
      modelId: model().id,
      packageIds: extraPackageIds.value,
      trimId: trimId.value,
      wheelId: wheelId.value,
    }));

    const breakdown = computed(() => computePriceBreakdown(model(), configuration.value));
    const purchaseLabel = computed(() =>
      model().availability === 'coming-soon' ? t('model.notifyMe') : t('common.addToCart'),
    );
    const trimOptions = computed(() =>
      model().trims.map((t) => ({ label: `${t.name} — ${formatPrice(t.priceDelta)}`, value: t.id })),
    );
    const wheelOptions = computed(() =>
      model().wheels.map((w) => ({ label: `${w.name} — ${formatPrice(w.priceDelta)}`, value: w.id })),
    );

    const financeDownPaymentUsd = signal((Number.parseFloat(model().basePrice) * 0.1).toFixed(2));
    const financeDownPaymentEdited = signal(false);
    const financeTermMonths = signal(60);
    const financeDownPaymentDisplay = computed(() => Number(displayAmount(financeDownPaymentUsd.value)));
    const financeMaximumDisplay = computed(() => Number(displayAmount(breakdown.value.total)));
    const monthlyEstimate = computed(() =>
      estimateMonthlyPayment(
        breakdown.value.total,
        financeDownPaymentUsd.value,
        FINANCE_DEFAULT_APR,
        financeTermMonths.value,
      ),
    );

    effect(() => {
      const total = Number.parseFloat(breakdown.value.total);
      const downPayment = Number.parseFloat(financeDownPaymentUsd.value);

      if (!financeDownPaymentEdited.value) {
        financeDownPaymentUsd.value = (total * 0.1).toFixed(2);

        return undefined;
      }

      if (downPayment <= total) return undefined;

      financeDownPaymentUsd.value = total.toFixed(2);
      configurationStatus.value = t('model.finance.downPaymentAdjusted');

      return undefined;
    });

    const relatedModels = computed(() =>
      modelsSignal.value
        .filter((m) => m.id !== model().id && m.bodyType === model().bodyType)
        .slice(0, RELATED_MODEL_LIMIT),
    );

    const formatOptionPrice = (price: string): string =>
      price === '0.00' ? t('model.included') : `+${formatPrice(price)}`;
    let paintScroller: HTMLElement | undefined;
    const revealPaintOption = (id: string): void => {
      queueMicrotask(() => {
        const control = [...(paintScroller?.querySelectorAll<HTMLInputElement>('input') ?? [])].find(
          (input) => input.value === id,
        )?.parentElement;
        if (!paintScroller || !control) return;

        const scrollerRect = paintScroller.getBoundingClientRect();
        const controlRect = control.getBoundingClientRect();
        paintScroller.scrollTo({
          behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
          left:
            paintScroller.scrollLeft +
            controlRect.left -
            scrollerRect.left -
            (scrollerRect.width - controlRect.width) / 2,
        });
      });
    };

    const announceConfigurationChange = (change: string): void => {
      configurationStatus.value = t('model.totalUpdated', { change, total: formatPrice(breakdown.value.total) });
    };

    function onTrimChange(event: Event): void {
      const nextTrimId = controlValue(event);

      if (!nextTrimId || !model().trims.some((trim) => trim.id === nextTrimId)) return;

      trimId.value = nextTrimId;

      const nextTrim = model().trims.find((t) => t.id === nextTrimId);

      if (!nextTrim) return;

      const newlyIncluded = extraPackageIds.value.filter((id) => nextTrim.includedPackageIds.includes(id));

      extraPackageIds.value = extraPackageIds.value.filter((id) => !nextTrim.includedPackageIds.includes(id));
      announceConfigurationChange(
        newlyIncluded.length
          ? t('model.trimChangedWithPackages', { count: newlyIncluded.length, trim: nextTrim.name })
          : t('model.trimChanged', { trim: nextTrim.name }),
      );
    }

    function onWheelChange(event: Event): void {
      const next = controlValue(event);

      if (!next || !model().wheels.some((wheel) => wheel.id === next)) return;

      wheelId.value = next;
      announceConfigurationChange(
        t('model.wheelsChanged', {
          wheels: model().wheels.find((wheel) => wheel.id === next)?.name,
        }),
      );
    }

    function onPackagesChange(e: Event): void {
      extraPackageIds.value = [...new Set((e as CustomEvent<{ values: string[] }>).detail.values)];
      announceConfigurationChange(t('model.packagesChanged', { count: extraPackageIds.value.length }));
    }

    function onAddToCart(): void {
      if (model().availability === 'coming-soon') {
        bus.emit('toast:show', { message: t('model.notifyMeSuccess'), variant: 'success' });
        return;
      }

      if (!addToCart(configuration.value)) return;
      if (model().availability === 'limited') {
        bus.emit('toast:show', { message: t('model.limitedAvailabilityNotice'), variant: 'info' });
      }
      void router.navigate({ name: 'cart' });
    }

    function focusSection(id: string): void {
      const section = document.getElementById(id);
      if (!section) return;

      section.focus({ preventScroll: true });
      section.scrollIntoView({
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'center',
      });
    }

    function onViewPriceDetails(): void {
      focusSection('configurator-price-details');
    }

    function onShareBuild(): void {
      const resolved = resolveConfiguration(model(), configuration.value);
      openShareBuildDialog({
        breakdown: breakdown.value,
        model: model(),
        selections: {
          color: resolved.color.name,
          packages: resolved.extraPackages.map((option) => option.name),
          trim: resolved.trim.name,
          wheels: resolved.wheel.name,
        },
        url: buildConfigurationUrl(model(), configuration.value),
      });
    }

    return html`
      <div class="configurator__product-builder">
        <!-- The name/tagline caption is pinned inside the hero's own bottom-left corner (see
           .configurator__intro in app.css) rather than sitting in a separate block underneath —
           the hero photo is the reason a shopper is here, and the caption reads as part of that
           product shot instead of a second, competing headline below it. -->
        <div class="configurator__hero">
          <ore-skeleton
            striped
            role="img"
            aria-label=${() => `${model().name} in ${color.value.name}, exterior view`}></ore-skeleton>
          <span class="configurator__preview-label">${() => color.value.name}</span>
          <ore-button
            class="configurator__save"
            color=${() => (savedModelIds.value.includes(model().id) ? 'primary' : undefined)}
            icon-only
            label=${() => (savedModelIds.value.includes(model().id) ? t('common.removeSavedVehicle') : t('common.saveVehicle'))}
            rounded="full"
            variant=${() => (savedModelIds.value.includes(model().id) ? 'solid' : 'frost')}
            aria-pressed=${() => String(savedModelIds.value.includes(model().id))}
            @click=${() => toggleSavedModel(model().id)}>
            <ore-icon
              name="heart"
              size="18"
              aria-hidden="true"
              ?solid=${() => savedModelIds.value.includes(model().id)}></ore-icon>
          </ore-button>
          <div class="configurator__intro">
            <span class="configurator__category">${() => model().segment}</span>
            <h1>${() => model().name}</h1>
            <p class="configurator__tagline">${() => model().tagline}</p>
          </div>
        </div>

        <section class="configurator__spec-bar" aria-label=${() => t('model.specs')}>
          <div class="configurator__specs">
            <div class="spec">
              <span class="spec__label">${() => t('model.topSpeed')}</span>
              <ore-tooltip content=${() => t('model.topSpeedTooltip')}>
                <strong class="configurator__spec-value configurator__tooltip-trigger" tabindex="0">${() => `${model().topSpeedKph} km/h`}</strong>
              </ore-tooltip>
            </div>
            <div class="spec">
              <span class="spec__label">${() => t('model.zeroToHundred')}</span>
              <ore-tooltip content=${() => t('model.zeroToHundredTooltip')}>
                <strong class="configurator__spec-value configurator__tooltip-trigger" tabindex="0">${() => `${model().zeroToHundredSec}s`}</strong>
              </ore-tooltip>
            </div>
            <div class="spec">
              <span class="spec__label">${() => t('model.seats')}</span>
              <strong class="configurator__spec-value">${() => model().seats}</strong>
            </div>
            ${when(
              () => model().rangeKm !== null,
              () => html`
                <div class="spec">
                  <span class="spec__label">${() => t('model.range')}</span>
                  <ore-tooltip content=${() => t('model.rangeTooltip')}>
                    <strong class="configurator__spec-value configurator__tooltip-trigger" tabindex="0">${() => `${model().rangeKm} km`}</strong>
                  </ore-tooltip>
                </div>
              `,
              () => html`
                <div class="spec">
                  <span class="spec__label">${() => t('model.fuelEconomy')}</span>
                  <strong class="configurator__spec-value">${() => `${model().fuelEconomyLPer100Km} L/100km`}</strong>
                </div>
              `,
            )}
          </div>
        </section>

        <section class="configurator__build-summary" aria-label=${() => t('model.configuration')}>
          <div class="configurator__build-controls">
            <fieldset class="configurator__build-field configurator__paint-field">
              <legend class="configurator__build-field-label">${() => t('model.selectColor')}</legend>
              <div
                class="swatches"
                ref=${(element: HTMLElement | null) => {
                  paintScroller = element ?? undefined;
                }}>
                ${model().colors.map(
                  (option) => html`
                    <label
                      class="swatch-control"
                      aria-label=${() => `${option.name} — ${formatOptionPrice(option.priceDelta)}`}>
                      <input
                        class="swatch-control__input"
                        type="radio"
                        name=${`paint-${model().id}`}
                        value=${option.id}
                        ?checked=${() => colorId.value === option.id}
                        ref=${(input: HTMLInputElement | null) => {
                          if (!input) return;

                          queueMicrotask(() => {
                            input.checked = colorId.value === option.id;
                            input.value = option.id;
                          });
                        }}
                        @change=${() => {
                          colorId.value = option.id;
                          revealPaintOption(option.id);
                          announceConfigurationChange(
                            t('model.selectedPaintWithPrice', {
                              name: option.name,
                              price: formatOptionPrice(option.priceDelta),
                            }),
                          );
                        }} />
                      <span class="swatch" aria-hidden="true" style=${`--swatch-color: ${option.hex}`}></span>
                    </label>
                  `,
                )}
              </div>
              <div class="configurator__paint-summary">
                <span>${() => color.value.name}</span>
                <strong class="configurator__paint-price">${() => formatOptionPrice(color.value.priceDelta)}</strong>
              </div>
            </fieldset>
            <div class="configurator__build-field configurator__trim-field">
              <ore-select
                size="sm"
                label=${() => t('model.selectTrim')}
                options=${trimOptions}
                value=${() => trimId.value}
                @change=${onTrimChange}></ore-select>
            </div>
            <div class="configurator__build-field configurator__wheel-field">
              <ore-select
                size="sm"
                label=${() => t('model.selectWheels')}
                options=${wheelOptions}
                value=${() => wheelId.value}
                @change=${onWheelChange}></ore-select>
            </div>
            <div class="configurator__build-action">
              <div class="configurator__build-purchase">
                <span class="configurator__build-total">
                  <span class="configurator__build-total-label">${() => t('model.configuredPrice')}</span>
                  <span class="configurator__build-price">
                    <animated-price value-usd=${() => breakdown.value.total}></animated-price>
                    <ore-button
                      icon-only
                      label=${() => t('model.priceDetails')}
                      title=${() => t('model.priceDetails')}
                      rounded="full"
                      size="sm"
                      variant="text"
                      @click=${onViewPriceDetails}>
                      <ore-icon name="info" size="16" aria-hidden="true"></ore-icon>
                    </ore-button>
                  </span>
                  <small data-availability=${() => model().availability}>
                    <i class="configurator__availability-dot" aria-hidden="true"></i>
                    ${() =>
                      t(
                        `model.availability.${model().availability === 'coming-soon' ? 'comingSoon' : model().availability}`,
                      )}
                  </small>
                </span>
                <div class="configurator__purchase-actions">
                  <ore-button
                    icon-only
                    label=${() => t('confirmation.shareBuild')}
                    title=${() => t('confirmation.shareBuild')}
                    rounded="full"
                    size="md"
                    variant="outline"
                    @click=${onShareBuild}>
                    <ore-icon name="share-2" size="17" aria-hidden="true"></ore-icon>
                  </ore-button>
                  <ore-button
                    effect="shine"
                    variant="solid"
                    color="primary"
                    size="md"
                    rounded
                    aria-label=${() => purchaseLabel.value}
                    @click=${onAddToCart}>
                    ${() => purchaseLabel.value}
                  </ore-button>
                </div>
              </div>
            </div>
          </div>
          <p class="configurator__status" role="status" aria-live="polite" aria-atomic="true">
            ${() => configurationStatus.value}
          </p>
        </section>
      </div>

      <div class="configurator__mobile-bar">
        <span class="configurator__mobile-bar-total">
          <span class="configurator__sticky-total-label">${() => t('common.total')}</span>
          <animated-price value-usd=${() => breakdown.value.total}></animated-price>
        </span>
        <div class="configurator__mobile-bar-actions">
          <ore-button
            icon-only
            label=${() => t('confirmation.shareBuild')}
            title=${() => t('confirmation.shareBuild')}
            rounded="full"
            variant="outline"
            @click=${onShareBuild}>
            <ore-icon name="share-2" size="17" aria-hidden="true"></ore-icon>
          </ore-button>
          <ore-button
            rounded
            variant="solid"
            color="primary"
            aria-label=${() => purchaseLabel.value}
            @click=${onAddToCart}>
            ${() => purchaseLabel.value}
          </ore-button>
        </div>
      </div>

      <section class="configurator__section" id="packages-section">
        <h2>
          <ore-tooltip content=${() => t('model.packagesTooltip')}>
            <span class="configurator__tooltip-trigger" tabindex="0">${() => t('model.packages')}</span>
          </ore-tooltip>
        </h2>
        ${when(
          () => includedPackages.value.length > 0,
          () => html`
            <p class="configurator__helper">${() => t('model.includedPackages')}</p>
            <div class="package-chips">
              ${includedPackages.value.map(
                (p) => html`
                  <ore-chip size="sm" variant="flat">${p.name}</ore-chip>
                `,
              )}
            </div>
          `,
        )}
        ${when(
          () => optionalPackages.value.length > 0,
          () => html`
            <p class="configurator__helper">${() => t('model.optionalPackages')}</p>
            <ore-checkbox-group
              label=${() => t('model.packages')}
              values=${() => extraPackageIds.value.join(',')}
              @change=${onPackagesChange}>
              ${optionalPackages.value.map(
                (p) => html`
                  <ore-checkbox value=${p.id}>${p.name} — ${formatPrice(p.priceDelta)}</ore-checkbox>
                  <p class="configurator__package-option">${p.description}</p>
                `,
              )}
            </ore-checkbox-group>
          `,
        )}
      </section>

      <section class="configurator__section">
        <h2>${() => t('model.standardWithBuild')}</h2>
        <div class="feature-grid">
          ${model().features.map(
            (key) => html`
              <div class="feature-card">
                <ore-skeleton striped class="feature-card__media" aria-hidden="true"></ore-skeleton>
                <span class="feature-card__label">
                  <ore-icon name=${FEATURE_ICON[key]} size="20" aria-hidden="true"></ore-icon>
                  <span>${() => t(`model.features.${key}`)}</span>
                </span>
              </div>
            `,
          )}
        </div>
      </section>

      <div class="configurator__summary">
        <section class="configurator__finance">
          <h2>${() => t('model.finance.title')}</h2>
          <div class="finance-calculator">
            <ore-number-input
              label=${() => t('model.finance.downPayment', { currency: currentCurrency.value.code })}
              min="0"
              step="500"
              max=${() => financeMaximumDisplay.value}
              value=${() => financeDownPaymentDisplay.value}
              @input=${(event: Event) => {
                const next = Math.max(0, Math.min(financeMaximumDisplay.value, Number(controlValue(event)) || 0));

                financeDownPaymentEdited.value = true;
                financeDownPaymentUsd.value = displayAmountToUsd(next.toFixed(2));
              }}></ore-number-input>
            <ore-select
              label=${() => t('model.finance.term')}
              options=${FINANCE_TERM_OPTIONS.map((months) => ({ label: t('checkout.payment.termOption', { months }), value: String(months) }))}
              value=${() => String(financeTermMonths.value)}
              @change=${(event: Event) => {
                const next = Number(controlValue(event));

                if (FINANCE_TERM_OPTIONS.includes(next)) financeTermMonths.value = next;
              }}></ore-select>
            <div class="finance-calculator__result" role="status" aria-live="polite" aria-atomic="true">
              <span>${() => t('model.finance.monthlyEstimate')}</span>
              <strong>
                ${() => formatPrice(monthlyEstimate.value)}
                <span>/mo*</span>
              </strong>
            </div>
          </div>
          <p class="configurator__helper configurator__panel-footer">
            *${() => t('model.finance.disclaimer')} (${() => t('model.finance.apr', { apr: FINANCE_DEFAULT_APR })})
          </p>
        </section>

        <section
          id="configurator-price-details"
          class="configurator__breakdown configurator__price-breakdown"
          tabindex="-1">
          <h2>${() => t('model.priceBreakdown')}</h2>
          <dl>
            <div class="configurator__price-row">
              <dt>${() => t('model.base')}</dt>
              <dd><animated-price value-usd=${() => breakdown.value.base}></animated-price></dd>
            </div>
            <div class="configurator__price-row">
              <dt>${() => t('model.selectTrim')}</dt>
              <dd data-included=${() => (breakdown.value.trim === '0.00' ? '' : null)}>
                ${() => formatOptionPrice(breakdown.value.trim)}
              </dd>
            </div>
            <div class="configurator__price-row">
              <dt>${() => t('model.selectColor')}</dt>
              <dd data-included=${() => (breakdown.value.color === '0.00' ? '' : null)}>
                ${() => formatOptionPrice(breakdown.value.color)}
              </dd>
            </div>
            <div class="configurator__price-row">
              <dt>${() => t('model.selectWheels')}</dt>
              <dd data-included=${() => (breakdown.value.wheels === '0.00' ? '' : null)}>
                ${() => formatOptionPrice(breakdown.value.wheels)}
              </dd>
            </div>
            <div class="configurator__price-row">
              <dt>${() => t('model.packages')}</dt>
              <dd data-included=${() => (breakdown.value.packages === '0.00' ? '' : null)}>
                ${() => formatOptionPrice(breakdown.value.packages)}
              </dd>
            </div>
            <div class="configurator__price-row configurator__price-row--subtotal">
              <dt>${() => t('common.subtotal')}</dt>
              <dd><animated-price value-usd=${() => breakdown.value.subtotal}></animated-price></dd>
            </div>
            <div class="configurator__price-row configurator__price-row--tax">
              <dt>${() => t('model.estimatedTax')}</dt>
              <dd>${() => `+${formatPrice(breakdown.value.tax)}`}</dd>
            </div>
            <div class="configurator__price-row configurator__price-row--total">
              <dt>${() => t('model.estimatedTotal')}</dt>
              <dd><animated-price value-usd=${() => breakdown.value.total}></animated-price></dd>
            </div>
          </dl>
          <p class="configurator__price-disclaimer configurator__panel-footer">${() => t('model.priceDisclaimer')}</p>
        </section>
      </div>

      ${when(
        // A single match reads as a broken/unfinished layout (one narrow card adrift in an
        // otherwise-empty row) rather than a deliberate "just one other option" state — the
        // rail only earns its section once there's an actual set to browse.
        () => relatedModels.value.length >= 2,
        () => html`
          <section class="configurator__section configurator__related">
            <h2>${() => t('model.related.title')}</h2>
            <div class="related-models">
              ${relatedModels.value.map(
                (m) => html`
                  <model-card
                    model=${() => m}
                    in-compare=${() => compareModelIds.value.includes(m.id)}
                    saved=${() => savedModelIds.value.includes(m.id)}
                    @toggle-compare=${() => toggleCompare(m.id)}
                    @toggle-save=${() => toggleSavedModel(m.id)}
                    @view=${() => void router.navigate({ name: 'modelDetail', params: { slug: m.slug } })}></model-card>
                `,
              )}
            </div>
          </section>
        `,
      )}
    `;
  },
  shadow: false,
});

/** Renders the "no such model" dead end — a mistyped/shared/bookmarked `/models/:slug` URL — as
 * a real empty state (heading, message, a way back to the catalog) instead of one bare, unstyled
 * sentence with no escape route. Built imperatively rather than through `define()`/`html` since
 * it's a one-shot render with no reactive state of its own. */
function createModelNotFoundView(): HTMLElement {
  const el = document.createElement('div');

  el.className = 'configurator configurator--not-found';

  const heading = document.createElement('h2');

  heading.textContent = t('model.notFoundTitle');

  const message = document.createElement('p');

  message.textContent = t('model.notFound');

  const backButton = document.createElement('ore-button');

  backButton.setAttribute('variant', 'solid');
  backButton.setAttribute('color', 'primary');
  backButton.textContent = t('model.notFoundBack');
  backButton.addEventListener('click', () => void router.navigate({ name: 'catalog' }));

  el.append(heading, message, backButton);

  return el;
}

export function createModelDetailView(slug: string): HTMLElement {
  const model = getModelBySlug(slug);

  if (!model) return createModelNotFoundView();

  const el = document.createElement('model-configurator') as HTMLElement & ModelConfiguratorProps;

  el.className = 'configurator';
  el.model = model;

  return el;
}
