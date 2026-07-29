import '@vielzeug/refine/card';
import '@vielzeug/refine/button';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/text';
import '@vielzeug/refine/tooltip';

import './car-silhouette';

import { define, getHost, html, prop, useEmit, when } from '@vielzeug/ore';
import { computed, signal } from '@vielzeug/ripple';

import type { Model } from '../../core/types';

import { formatPrice } from '../../core/currency';
import { t } from '../../core/i18n';

type ModelCardProps = {
  inCompare: boolean;
  model: Model | undefined;
};

export type ModelCardElement = HTMLElement & { inCompare: boolean; model: Model };

type ModelCardEvents = { 'toggle-compare': void; view: void };

/**
 * `<model-card>` — light-DOM (`shadow: false`) so `styles/app.css` can target `.model-card`
 * descendant selectors directly, the same rationale as demos/kanban's `<task-card>`.
 *
 * `model` has no safe default (`prop.data<Model>()` — a placeholder `Model` would be worse than
 * just waiting): when this element is created *declaratively* inside `each()` (as it is in
 * `ui/views/catalog.ts`), ore connects/upgrades it — running `setup()` — before applying the
 * parent template's `:model=` binding (see demos/kanban's board-column.ts comment on the same
 * hazard). Reading `props.model.value` unconditionally at the top of `setup()` — or via `bind()`,
 * which runs its effect immediately and unconditionally, unlike a template's own bindings —
 * threw here on that first, still-`undefined` pass, aborting `setup()` before it ever reached
 * `return html\`...\`` and leaving the whole card empty. Wrapping the entire body in `when()`
 * defers every `model()` read until the directive's own effect actually sees a defined value,
 * and re-renders once it lands, self-correcting exactly like board-column's prop reads do.
 *
 * `<ore-card>` owns 100% of the surface chrome (border/background/radius/shadow) through its
 * own `elevation` prop and default padding — `.model-card__surface` in app.css only contributes
 * layout (flex/height), never re-paints border/background itself. Painting both would stack two
 * mismatched-radius boxes with a redundant `backdrop-filter` between them for no visible gain.
 * `interactive` makes the whole card clickable (keyboard-operable too) and gets its hover/focus
 * treatment straight from the primitive; `ore-card`'s built-in nested-interactive-target
 * detection excludes clicks on either footer button, so "Add/remove compare" keeps working
 * independently of the card's own `@activate` → `view` navigation.
 */
define<ModelCardProps>('model-card', {
  props: {
    // `prop.bool` (not `prop.data<boolean>`): `prop.data`'s parser always returns its default,
    // discarding whatever it's called with — correct for JS-only, non-serialisable values set
    // via a real property assignment, but this prop is set through a template attribute binding
    // (`:in-compare=` in catalog.ts's `each()`), which round-trips every primitive through that
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

          return html`
            <ore-card
              interactive
              elevation="1"
              class="model-card__surface"
              data-model-id=${() => model().id}
              @activate=${() => emit('view')}>
              <div slot="media" class="model-card__media">
                <car-silhouette
                  :body-type=${() => model().bodyType}
                  :color-hex=${() => color.value.hex}
                  :color-name=${() => color.value.name}
                  :hero-hue=${() => model().heroHue}></car-silhouette>
                <div class="model-card__swatches" role="radiogroup" aria-label=${() => t('model.selectColor')}>
                  ${model().colors.map(
                    (c) => html`
                      <button
                        type="button"
                        class="swatch swatch--sm"
                        role="radio"
                        aria-checked=${() => (colorId.value === c.id ? 'true' : 'false')}
                        style=${`--swatch-color: ${c.hex}`}
                        title=${c.name}
                        aria-label=${c.name}
                        @click.stop=${() => (colorId.value = c.id)}></button>
                    `,
                  )}
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
              <div class="model-card__specs">
                <div class="spec">
                  <ore-text as="span" size="xs" color="tertiary">${() => t('model.zeroToHundred')}</ore-text>
                  <ore-text as="span" weight="bold">${() => `${model().zeroToHundredSec}s`}</ore-text>
                </div>
                <div class="spec">
                  <ore-text as="span" size="xs" color="tertiary">${() => t('model.topSpeed')}</ore-text>
                  <ore-text as="span" weight="bold">${() => `${model().topSpeedKph} km/h`}</ore-text>
                </div>
                ${when(
                  () => model().powertrain === 'electric',
                  () => html`
                    <div class="spec">
                      <ore-text as="span" size="xs" color="tertiary">${() => t('model.range')}</ore-text>
                      <ore-text as="span" weight="bold">${() => `${model().rangeKm} km`}</ore-text>
                    </div>
                  `,
                )}
              </div>
              <div slot="footer" class="model-card__footer">
                <ore-text as="span" size="xs" color="tertiary">${() => t('common.startingAt')}</ore-text>
                <ore-text as="span" class="model-card__price" size="lg" weight="bold">
                  ${() => formatPrice(model().basePrice)}
                </ore-text>
              </div>
              <div slot="actions" class="model-card__actions">
                <ore-button
                  class="model-card__view-btn"
                  rounded
                  variant="solid"
                  color="primary"
                  @click=${() => emit('view')}>
                  ${() => t('common.viewDetails')}
                </ore-button>
                <ore-tooltip
                  :content="${() => (props.inCompare.value ? t('common.removeFromCompare') : t('common.addToCompare'))}"
                  placement="top">
                  <ore-button
                    rounded
                    icon-only
                    :variant=${() => (props.inCompare.value ? 'flat' : 'outline')}
                    :color=${() => (props.inCompare.value ? 'primary' : undefined)}
                    aria-pressed=${() => String(props.inCompare.value)}
                    @click=${() => emit('toggle-compare')}>
                    <ore-icon name="git-compare" size="14" aria-hidden="true"></ore-icon>
                  </ore-button>
                </ore-tooltip>
              </div>
            </ore-card>
          `;
        },
      )}
    `;
  },
  shadow: false,
});
