import '@vielzeug/refine/card';
import '@vielzeug/refine/button';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/skeleton';
import '@vielzeug/refine/text';

import { define, getHost, html, prop, useEmit, when } from '@vielzeug/ore';
import { computed, signal } from '@vielzeug/ripple';
import { formatPrice } from '../../core/currency';
import { t } from '../../core/i18n';
import type { Model } from '../../core/types';

type ModelCardProps = {
  inCompare: boolean;
  model: Model | undefined;
};

export type ModelCardElement = HTMLElement & { inCompare: boolean; model: Model };

type ModelCardEvents = { 'toggle-compare': undefined; view: undefined };

/**
 * `<model-card>` renders in light DOM so the catalog can own layout and responsive presentation.
 * It waits for its JS-only `model` prop before reading model data because declarative bindings
 * arrive after the custom element connects.
 */
define<ModelCardProps>('model-card', {
  props: {
    // `prop.bool` (not `prop.data<boolean>`): `prop.data`'s parser always returns its default,
    // discarding whatever it's called with — correct for JS-only, non-serialisable values set
    // via a real property assignment, but this prop is set through a template attribute binding
    // (`in-compare=` in catalog.ts's `each()`), which round-trips every primitive through that
    // parser. `prop.bool` reads the string it's given, so the boolean this component actually
    // needs to react to (`props.inCompare.value`) survives the round-trip.
    inCompare: prop.bool(false),
    model: prop.data<Model>(),
  },
  setup(props) {
    const emit = useEmit<ModelCardEvents>();
    const model = (): Model => props.model.value!;

    getHost().classList.add('model-card');

    return html`
      ${when(
        () => props.model.value !== undefined,
        () => {
          // Local preview-only pick — never leaves this card (not persisted to the cart or the
          // router), same as how the full configurator's own draft state stays local until
          // "Add to cart" commits it (see ui/views/model-detail.ts's module comment). Reset
          // per-instance rather than shared, so browsing the catalog with several cards open
          // doesn't cross-contaminate each other's preview color.
          const colorId = signal(model().colors[0].id);
          const color = computed(() => model().colors.find((c) => c.id === colorId.value) ?? model().colors[0]);
          const paintSummary = computed(() => {
            const selected = color.value;
            const price = formatPrice(selected.priceDelta);

            return selected.priceDelta === '0.00'
              ? t('model.selectedPaint', { name: selected.name })
              : t('model.selectedPaintWithPrice', { name: selected.name, price });
          });

          const renderSpecs = () => {
            const current = model();
            const specs =
              current.powertrain === 'electric'
                ? [
                    { label: t('model.range'), value: `${current.rangeKm} km` },
                    { label: t('model.zeroToHundred'), value: `${current.zeroToHundredSec}s` },
                    { label: t('model.seats'), value: String(current.seats) },
                  ]
                : current.bodyType === 'suv'
                  ? [
                      { label: t('model.seats'), value: String(current.seats) },
                      { label: t('model.zeroToHundred'), value: `${current.zeroToHundredSec}s` },
                      { label: t('model.topSpeed'), value: `${current.topSpeedKph} km/h` },
                    ]
                  : [
                      { label: t('model.zeroToHundred'), value: `${current.zeroToHundredSec}s` },
                      { label: t('model.topSpeed'), value: `${current.topSpeedKph} km/h` },
                      { label: t('model.seats'), value: String(current.seats) },
                    ];

            return specs.map(
              (spec) => html`
                <div class="spec">
                  <ore-text as="span" size="xs" color="tertiary">${spec.label}</ore-text>
                  <ore-text as="span" weight="bold">${spec.value}</ore-text>
                </div>
              `,
            );
          };

          return html`
            <ore-card elevation="1" class="model-card__surface" data-model-id=${() => model().id}>
              <div slot="media" class="model-card__media" style=${() => `--model-hue: ${model().heroHue}deg`}>
                <ore-skeleton striped aria-hidden="true"></ore-skeleton>
                <div style="position: absolute; bottom: var(--size-6); display: flex; justify-content: center; flex-direction: column; align-items: center;">
                <fieldset class="model-card__paint-picker">
                  <legend>${() => t('model.selectColor')}</legend>
                  <div class="model-card__swatches">
                    ${model().colors.map(
                      (c) => html`
                        <label class="swatch-control" aria-label=${c.name}>
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
                            }} />
                          <span class="swatch swatch--sm" aria-hidden="true" style=${`--swatch-color: ${c.hex}`}></span>
                        </label>
                      `,
                    )}
                  </div>
                </fieldset>
                <p class="model-card__paint">${() => paintSummary.value}</p>
                </div>
              </div>
              <div slot="header">
                <ore-text as="p" size="xs" color="tertiary">${() => model().segment}</ore-text>
                <ore-text as="h3" class="model-card__name" size="lg" weight="medium" color="heading">
                  ${() => model().name}
                </ore-text>
                <ore-text as="p" class="model-card__tagline" size="sm" color="tertiary">
                  ${() => model().tagline}
                </ore-text>
              </div>
              <div class="model-card__specs">${renderSpecs}</div>
              <div slot="footer" class="model-card__footer">
                <ore-text as="span" size="xs" color="tertiary">${() => t('common.startingAt')}</ore-text>
                <ore-text as="span" class="model-card__price" size="lg" weight="bold">
                  ${() => formatPrice(model().basePrice)}
                </ore-text>
              </div>
              <div slot="actions" class="model-card__actions">
                <ore-button class="model-card__view-btn" rounded variant="solid" color="secondary" @click=${() => emit('view')}>
                  ${() => t('common.viewDetails')}
                </ore-button>
                <ore-button
                  class="model-card__compare-btn"
                  rounded
                  icon-only
                  variant=${() => (props.inCompare.value ? 'flat' : 'outline')}
                  color=${() => (props.inCompare.value ? 'primary' : undefined)}
                  aria-label=${() => (props.inCompare.value ? t('common.removeFromCompare') : t('common.addToCompare'))}
                  aria-pressed=${() => String(props.inCompare.value)}
                  @click=${() => emit('toggle-compare')}>
                  <ore-icon name="git-compare" size="16" aria-hidden="true"></ore-icon>
                </ore-button>
              </div>
            </ore-card>
          `;
        },
      )}
    `;
  },
  shadow: false,
});
