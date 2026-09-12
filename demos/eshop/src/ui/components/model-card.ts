import '@vielzeug/refine/badge';
import '@vielzeug/refine/button';
import '@vielzeug/refine/card';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/text';

import { define, getHost, html, prop, useEmit, when } from '@vielzeug/ore';
import { computed, signal } from '@vielzeug/ripple';
import { formatPrice } from '../../core/currency';
import { t } from '../../core/i18n';
import { computePriceBreakdown } from '../../core/pricing';
import type { ColorOption, Model } from '../../core/types';

type ModelCardProps = {
  inCompare: boolean;
  model: Model | undefined;
  saved: boolean;
};

export type ModelCardElement = HTMLElement & { inCompare: boolean; model: Model; saved: boolean };

type ModelCardEvents = {
  'toggle-compare': undefined;
  'toggle-save': undefined;
  view: undefined;
};

define<ModelCardProps>('model-card', {
  props: {
    inCompare: prop.bool(false),
    model: prop.data<Model>(),
    saved: prop.bool(false),
  },
  setup(props) {
    const emit = useEmit<ModelCardEvents>();
    const model = (): Model => props.model.value!;

    getHost().classList.add('model-card');

    return html`
      ${when(
        () => props.model.value !== undefined,
        () => {
          const colorId = signal(model().colors[0].id);
          const color = computed(
            () => model().colors.find((option) => option.id === colorId.value) ?? model().colors[0],
          );
          const configuredPrice = computed(() =>
            computePriceBreakdown(model(), {
              colorId: colorId.value,
              modelId: model().id,
              packageIds: [],
              trimId: model().trims[0].id,
              wheelId: model().wheels[0].id,
            }),
          );
          const surcharge = computed(() =>
            color.value.priceDelta === '0.00' ? t('model.included') : `+${formatPrice(color.value.priceDelta)}`,
          );
          const paintOpen = signal(false);
          const colorAt = (offset: number): ColorOption => {
            const colors = model().colors;
            const selectedIndex = colors.findIndex((option) => option.id === colorId.value);
            return colors[(selectedIndex + offset + colors.length) % colors.length];
          };
          let paintTrigger: HTMLButtonElement | undefined;
          let pointerActivation = false;
          let suppressFocusOpen = false;
          let swatchScroller: HTMLElement | undefined;
          let recentering = false;
          const onPaintPointerOver = (event: PointerEvent): void => {
            if (event.pointerType === 'mouse') paintOpen.value = true;
          };
          const onPaintPointerOut = (event: PointerEvent): void => {
            const disclosure = event.currentTarget as HTMLElement;
            if (
              event.pointerType === 'mouse' &&
              !disclosure.contains(event.relatedTarget as Node | null) &&
              !disclosure.contains(document.activeElement)
            ) {
              paintOpen.value = false;
            }
          };
          const onPaintFocusIn = (): void => {
            if (!pointerActivation && !suppressFocusOpen) paintOpen.value = true;
          };
          const onPaintFocusOut = (event: FocusEvent): void => {
            const disclosure = event.currentTarget as HTMLElement;
            requestAnimationFrame(() => {
              if (!disclosure.contains(document.activeElement)) paintOpen.value = false;
            });
          };
          const onPaintKeyDown = (event: KeyboardEvent): void => {
            if (event.key !== 'Escape') return;

            event.preventDefault();
            suppressFocusOpen = true;
            paintOpen.value = false;
            paintTrigger?.focus();
            queueMicrotask(() => {
              suppressFocusOpen = false;
            });
          };
          const togglePaint = (): void => {
            paintOpen.value = pointerActivation ? true : !paintOpen.value;
            pointerActivation = false;
          };
          const centerSelectedColor = (): void => {
            queueMicrotask(() => {
              const selected = [...(swatchScroller?.querySelectorAll<HTMLElement>('[data-cycle="1"]') ?? [])].find(
                (item) => item.dataset.colorId === colorId.value,
              );

              if (!swatchScroller || !selected) return;

              recentering = true;
              swatchScroller.scrollLeft = selected.offsetLeft - (swatchScroller.clientWidth - selected.offsetWidth) / 2;
              requestAnimationFrame(() => {
                recentering = false;
              });
            });
          };
          const selectColor = (id: string): void => {
            colorId.value = id;
            centerSelectedColor();
          };
          const normalizeSwatchScroll = (event: Event): void => {
            if (recentering) return;

            const scroller = event.currentTarget as HTMLElement;
            const cycleWidth = scroller.scrollWidth / 3;

            if (scroller.scrollLeft < cycleWidth / 2) scroller.scrollLeft += cycleWidth;
            else if (scroller.scrollLeft > cycleWidth * 1.5) scroller.scrollLeft -= cycleWidth;
          };
          const renderSwatch = (option: ColorOption, cycle: number) => {
            const swatch = html`
              <span class="swatch swatch--sm" aria-hidden="true" style=${`--swatch-color: ${option.hex}`}></span>
            `;

            return cycle === 1
              ? html`
                  <label
                    class="swatch-control"
                    aria-label=${option.name}
                    data-color-id=${option.id}
                    data-cycle=${cycle}
                    data-selected=${() => (colorId.value === option.id ? '' : null)}>
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
                      @change=${() => selectColor(option.id)} />
                    ${swatch}
                  </label>
                `
              : html`
                  <span
                    class="swatch-control"
                    aria-hidden="true"
                    data-color-id=${option.id}
                    data-cycle=${cycle}
                    data-selected=${() => (colorId.value === option.id ? '' : null)}
                    @click=${() => selectColor(option.id)}>
                    ${swatch}
                  </span>
                `;
          };
          const renderSpecs = () => {
            const current = model();
            const firstSpec =
              current.powertrain === 'electric' && current.rangeKm
                ? { label: t('model.range'), value: `${current.rangeKm} km` }
                : { label: t('catalog.powertrainLabel'), value: t(`catalog.powertrains.${current.powertrain}`) };
            const specs = [
              firstSpec,
              { label: t('model.zeroToHundred'), value: `${current.zeroToHundredSec}s` },
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
                <ore-skeleton class="model-card__image" striped aria-hidden="true" radius="0"></ore-skeleton>
                <ore-badge class="model-card__status" color="secondary" size="sm" variant="flat">
                  ${() => t('model.newVehicle')}
                </ore-badge>
                <ore-button
                  class="model-card__save"
                  color=${() => (props.saved.value ? 'primary' : undefined)}
                  icon-only
                  label=${() => (props.saved.value ? t('common.removeSavedVehicle') : t('common.saveVehicle'))}
                  rounded="full"
                  size="sm"
                  variant=${() => (props.saved.value ? 'solid' : 'frost')}
                  aria-pressed=${() => String(props.saved.value)}
                  @click=${() => emit('toggle-save')}>
                  <ore-icon name="heart" size="16" aria-hidden="true" ?solid=${() => props.saved.value}></ore-icon>
                </ore-button>
                <div
                  class="model-card__paint-disclosure"
                  data-open=${() => (paintOpen.value ? '' : null)}
                  @pointerover=${onPaintPointerOver}
                  @pointerout=${onPaintPointerOut}
                  @focusin=${onPaintFocusIn}
                  @focusout=${onPaintFocusOut}
                  @keydown=${onPaintKeyDown}>
                  <button
                    class="model-card__paint-trigger"
                    type="button"
                    aria-controls=${`paint-panel-${model().id}`}
                    aria-expanded=${() => String(paintOpen.value)}
                    aria-label=${() => `${t('model.selectColor')}: ${color.value.name}`}
                    ref=${(element: HTMLButtonElement | null) => {
                      paintTrigger = element ?? undefined;
                    }}
                    @pointerdown=${(event: PointerEvent) => {
                      pointerActivation = event.pointerType !== 'mouse';
                    }}
                    @click=${togglePaint}>
                    <span class="model-card__paint-dot" style=${() => `--swatch-color: ${colorAt(-1).hex}`}></span>
                    <span
                      class="model-card__paint-dot model-card__paint-dot--selected"
                      style=${() => `--swatch-color: ${colorAt(0).hex}`}></span>
                    <span class="model-card__paint-dot" style=${() => `--swatch-color: ${colorAt(1).hex}`}></span>
                  </button>
                  <fieldset
                    id=${`paint-panel-${model().id}`}
                    class="model-card__paint-picker model-card__paint-picker--media">
                    <legend>${() => t('model.selectColor')}</legend>
                    <div
                      class="model-card__swatches"
                      ref=${(element: HTMLElement | null) => {
                        swatchScroller = element ?? undefined;
                        if (element) centerSelectedColor();
                      }}
                      @scroll=${normalizeSwatchScroll}>
                      ${Array.from({ length: 3 }).flatMap((_, cycle) =>
                        model().colors.map((option) => renderSwatch(option, cycle)),
                      )}
                    </div>
                    <div class="model-card__paint-summary">
                      <span>${() => color.value.name}</span>
                      <strong>${surcharge}</strong>
                    </div>
                  </fieldset>
                </div>
              </div>

              <div slot="header" class="model-card__identity">
                <ore-text as="p" size="xs" color="tertiary">${() => model().segment}</ore-text>
                <ore-text as="h3" class="model-card__name" size="xl" weight="semibold" color="heading">
                  ${() => model().name}
                </ore-text>
                <ore-text as="p" class="model-card__tagline" size="sm" color="tertiary">
                  ${() => model().tagline}
                </ore-text>
              </div>

              <div class="model-card__specs">${renderSpecs}</div>

              <div class="model-card__commerce">
                <div class="model-card__price">
                  <small>
                    ${() => (color.value.priceDelta === '0.00' ? t('common.from') : t('model.configuredPrice'))}
                  </small>
                  <strong>${() => formatPrice(configuredPrice.value.subtotal)}</strong>
                </div>
                <span
                  class="model-card__availability"
                  data-availability=${() => model().availability}
                  aria-label=${() => t(`model.availability.${model().availability === 'coming-soon' ? 'comingSoon' : model().availability}`)}>
                  <i aria-hidden="true"></i>
                  ${() => t(`model.availability.${model().availability === 'coming-soon' ? 'comingSoon' : model().availability}`)}
                </span>
              </div>

              <div slot="actions" class="model-card__actions">
                <ore-button
                  class="model-card__view-btn"
                  color="secondary"
                  rounded
                  variant="solid"
                  @click=${() => emit('view')}>
                  ${() => t('common.viewDetails')}
                </ore-button>
                <ore-button
                  class="model-card__compare-btn"
                  rounded
                  variant=${() => (props.inCompare.value ? 'flat' : 'outline')}
                  color=${() => (props.inCompare.value ? 'primary' : undefined)}
                  aria-label=${() => (props.inCompare.value ? t('common.removeFromCompare') : t('common.addToCompare'))}
                  aria-pressed=${() => String(props.inCompare.value)}
                  title=${() => (props.inCompare.value ? t('common.removeFromCompare') : t('common.addToCompare'))}
                  @click=${() => emit('toggle-compare')}>
                  <ore-icon name="git-compare" size="16" aria-hidden="true"></ore-icon>
                  <span class="model-card__compare-label">
                    ${() => (props.inCompare.value ? t('common.compared') : t('common.addToCompare'))}
                  </span>
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
