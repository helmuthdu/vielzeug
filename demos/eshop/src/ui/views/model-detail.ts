import '@vielzeug/refine/select';
import '@vielzeug/refine/skeleton';
import '@vielzeug/refine/checkbox-group';
import '@vielzeug/refine/checkbox';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/number-input';
import '@vielzeug/refine/button';
import '@vielzeug/refine/icon';

import '../components/spec-tooltip';
import '../components/share-build-dialog';
import '../components/animated-price';
import '../components/model-card';

import { define, html, prop, when } from '@vielzeug/ore';
import { computed, effect, signal } from '@vielzeug/ripple';
import { compareModelIds } from '../../core/cart-store';
import { getModelBySlug, modelsSignal } from '../../core/catalog';
import { controlValue } from '../../core/control-value';
import { currentCurrency, displayAmount, displayAmountToUsd, formatPrice } from '../../core/currency';
import { addToCart, toggleCompare } from '../../core/history';
import { t } from '../../core/i18n';
import { computePriceBreakdown, estimateMonthlyPayment, resolveConfiguration } from '../../core/pricing';
import { router } from '../../core/router';
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
 * are transient page state until "Add to cart" commits them, mirroring how demos/kanban never
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

    const trimId = signal(model().trims[0].id);
    const colorId = signal(model().colors[0].id);
    const wheelId = signal(model().wheels[0].id);
    const extraPackageIds = signal<string[]>([]);

    const trim = computed(() => model().trims.find((t) => t.id === trimId.value)!);
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
      addToCart(configuration.value);
      void router.navigate({ name: 'cart' });
    }

    function onShareBuild(): void {
      const resolved = resolveConfiguration(model(), configuration.value);

      openShareBuildDialog({
        breakdown: breakdown.value,
        model: model(),
        selections: { color: resolved.color.name, trim: resolved.trim.name, wheels: resolved.wheel.name },
      });
    }

    return html`
      <!-- The name/tagline caption is pinned inside the hero's own bottom-left corner (see
           .configurator__intro in app.css) rather than sitting in a separate block underneath —
           the hero photo is the reason a shopper is here, and the caption reads as part of that
           product shot instead of a second, competing headline below it. -->
      <div class="configurator__hero">
        <ore-skeleton striped aria-hidden="true"></ore-skeleton>
        <span class="configurator__preview-label">${() => t('model.paintPreview')}</span>
        <div class="configurator__intro">
          <h1>${() => model().name}</h1>
          <p class="configurator__tagline">${() => `${model().segment} — ${model().tagline}`}</p>
        </div>
      </div>

      <!-- Reuses ore-navbar's own sticky mode (same primitive the app shell's main nav is built
           on, not a bespoke pinned div) — but themed as its own compact, opaque summary strip
           (shorter, no blur, a primary-colored top edge) rather than a second copy of the main
           nav's translucent glass bar, which read as a duplicate header rather than a contextual
           price strip. Carries the spec sheet too — one full-width strip below hero+intro
           instead of two, and it's the one row worth keeping visible (and sticky) the whole time
           a shopper is deciding.

           Desktop/tablet only (app.css hides this at ore-navbar's own 768px mobile breakpoint —
           see .configurator__mobile-bar below). ore-navbar's mobile mode collapses
           .navbar-start/-center/-end down to just the logo slot with no substitute, which
           silently dropped the running total AND the "Add to cart" CTA on every phone-width
           screen — this bar's own code comment above ("the one row worth keeping visible... the
           whole time") was never actually true on mobile. Rather than fight the shared nav
           primitive's mobile collapse (a slot="mobile-menu" fallback would still hide the
           total/CTA behind a tap, not keep them visible), a real fixed-position mobile
           counterpart replaces it below 768px instead. -->
      <section class="configurator__spec-bar" aria-label=${() => t('model.specs')}>
        <strong class="configurator__spec-name">${() => model().name}</strong>
        <div class="configurator__specs">
          <div class="spec">
            <span class="spec__label">${() => t('model.topSpeed')}</span>
            <spec-tooltip text=${() => t('model.topSpeedTooltip')}>
              <strong>${() => `${model().topSpeedKph} km/h`}</strong>
            </spec-tooltip>
          </div>
          <div class="spec">
            <span class="spec__label">${() => t('model.zeroToHundred')}</span>
            <spec-tooltip text=${() => t('model.zeroToHundredTooltip')}>
              <strong>${() => `${model().zeroToHundredSec}s`}</strong>
            </spec-tooltip>
          </div>
          <div class="spec">
            <span class="spec__label">${() => t('model.seats')}</span>
            <strong>${() => model().seats}</strong>
          </div>
          ${when(
            () => model().rangeKm !== null,
            () => html`
              <div class="spec">
                <span class="spec__label">${() => t('model.range')}</span>
                <spec-tooltip text=${() => t('model.rangeTooltip')}>
                  <strong>${() => `${model().rangeKm} km`}</strong>
                </spec-tooltip>
              </div>
            `,
            () => html`
              <div class="spec">
                <span class="spec__label">${() => t('model.fuelEconomy')}</span>
                <strong>${() => `${model().fuelEconomyLPer100Km} L/100km`}</strong>
              </div>
            `,
          )}
        </div>
      </section>

      <!-- The mobile counterpart to .configurator__sticky-bar above — app.css shows this
           only below 768px via plain position: fixed, which pins to the real viewport
           regardless of .app-main's own scroll container (unlike position: sticky, which is
           what left the desktop bar unable to just "become" this on narrow screens). Condensed
           to the two things a shopper actually needs mid-scroll on a phone — the running total
           and the primary action — not the full spec sheet, which already appears inline in the
           sticky bar's desktop layout and again in the intro above. -->
      <div class="configurator__mobile-bar">
        <span class="configurator__mobile-bar-total">
          <span class="configurator__sticky-total-label">${() => t('common.total')}</span>
          <animated-price value-usd=${() => breakdown.value.total}></animated-price>
        </span>
        <ore-button
          rounded
          variant="solid"
          color="primary"
          aria-label=${() => t('model.addToCartFromSummary')}
          @click=${onAddToCart}>
          ${() => t('common.addToCart')}
        </ore-button>
      </div>

      <section class="configurator__build-summary" aria-label=${() => t('model.yourBuild')}>
        <div class="configurator__build-controls">
          <fieldset class="configurator__build-field configurator__paint-field">
            <legend></legend>
            <span class="configurator__build-field-label">${() => t('model.selectColor')}</span>
            <div class="swatches">
              ${model().colors.map(
                (c) => html`
                <label class="swatch-control" aria-label=${() => `${c.name} — ${formatPrice(c.priceDelta)}`}>
                  <input
                    class="swatch-control__input"
                    type="radio"
                    name=${`paint-${model().id}`}
                    value=${c.id}
                    ?checked=${() => colorId.value === c.id}
                    ref=${(input: HTMLInputElement | null) => {
                      if (!input) return;

                      queueMicrotask(() => {
                        input.checked = colorId.value === c.id;
                        input.value = c.id;
                      });
                    }}
                    @change=${() => {
                      colorId.value = c.id;
                      announceConfigurationChange(
                        t('model.selectedPaintWithPrice', {
                          name: c.name,
                          price: formatPrice(c.priceDelta),
                        }),
                      );
                    }} />
                  <span class="swatch" aria-hidden="true" style=${`--swatch-color: ${c.hex}`}></span>
                </label>
              `,
              )}
            </div>
          </fieldset>
          <div class="configurator__build-field">
            <ore-select
              size="sm"
              label=${() => t('model.selectWheels')}
              options=${wheelOptions}
              value=${() => wheelId.value}
              @change=${onWheelChange}></ore-select>
          </div>
          <div class="configurator__build-field">
            <ore-select
              size="sm"
              label=${() => t('model.selectTrim')}
              options=${trimOptions}
              value=${() => trimId.value}
              @change=${onTrimChange}></ore-select>
          </div>
          <span class="configurator__build-spacer" aria-hidden="true"></span>
          <div class="configurator__build-action">
            <span>
              <span class="configurator__sticky-total-label">${() => t('common.total')}</span>
              <animated-price value-usd=${() => breakdown.value.total}></animated-price>
            </span>
            <ore-button
              variant="solid"
              color="primary"
              size="md"
              rounded
              aria-label=${() => t('model.addToCartFromSummary')}
              @click=${onAddToCart}>
              ${() => t('common.addToCart')}
            </ore-button>
          </div>
        </div>
        <p class="configurator__status" role="status" aria-live="polite" aria-atomic="true">
          ${() => configurationStatus.value}
        </p>
      </section>

      <section class="configurator__section" id="packages-section">
        <h2>
          <spec-tooltip text=${() => t('model.packagesTooltip')}>${() => t('model.packages')}</spec-tooltip>
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

      <!-- Financing and the final price are the same decision, side by side on desktop instead
           of one long stacked read — each panel gets identical card treatment (see
           .configurator__finance/.configurator__breakdown in app.css) so they read as a
           matched pair, not a plain section next to a boxed one. Stacks back to Financing above
           Price breakdown on tablet/mobile via the same 900px breakpoint the rest of the page
           collapses at. -->
      <div class="configurator__summary" aria-label=${() => t('model.reviewBuild')}>
        <h2 class="configurator__review-heading">${() => t('model.reviewBuild')}</h2>
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
          <p class="configurator__helper">
            *${() => t('model.finance.disclaimer')} (${() => t('model.finance.apr', { apr: FINANCE_DEFAULT_APR })})
          </p>
        </section>

        <section class="configurator__breakdown">
          <h2>${() => t('model.priceBreakdown')}</h2>
          <dl>
            <dt>${() => t('model.base')}</dt>
            <dd><animated-price value-usd=${() => breakdown.value.base}></animated-price></dd>
            <dt>${() => t('model.selectTrim')}</dt>
            <dd><animated-price value-usd=${() => breakdown.value.trim}></animated-price></dd>
            <dt>${() => t('model.selectColor')}</dt>
            <dd><animated-price value-usd=${() => breakdown.value.color}></animated-price></dd>
            <dt>${() => t('model.selectWheels')}</dt>
            <dd><animated-price value-usd=${() => breakdown.value.wheels}></animated-price></dd>
            <dt>${() => t('model.packages')}</dt>
            <dd><animated-price value-usd=${() => breakdown.value.packages}></animated-price></dd>
            <dt>${() => t('common.subtotal')}</dt>
            <dd><animated-price value-usd=${() => breakdown.value.subtotal}></animated-price></dd>
            <dt>${() => t('model.estimatedTax')}</dt>
            <dd><animated-price value-usd=${() => breakdown.value.tax}></animated-price></dd>
            <dt class="total">${() => t('common.total')}</dt>
            <dd class="total">
              <animated-price value-usd=${() => breakdown.value.total}></animated-price>
            </dd>
          </dl>
          <div class="configurator__actions">
            <ore-button-group fullwidth attached rounded>
              <ore-button variant="outline" @click=${onShareBuild}>${() => t('confirmation.shareBuild')}</ore-button>
              <ore-button variant="solid" color="primary" @click=${onAddToCart}>
                ${() => t('common.addToCart')}
              </ore-button>
            </ore-button-group>
          </div>
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
                    @toggle-compare=${() => toggleCompare(m.id)}
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
