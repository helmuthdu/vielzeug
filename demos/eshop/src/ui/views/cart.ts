import '@vielzeug/refine/async';
import '@vielzeug/refine/button';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/input';
import '@vielzeug/refine/number-input';
import '@vielzeug/refine/badge';

import '../components/car-silhouette';
import '../components/animated-price';

import { define, each, html, when } from '@vielzeug/ore';
import { signal } from '@vielzeug/ripple';
import { s } from '@vielzeug/spell';

import { cartLineBreakdowns, cartTotal } from '../../core/cart-store';
import { removeFromCart, setCartItemQuantity } from '../../core/history';
import { t } from '../../core/i18n';
import { resolveConfiguration } from '../../core/pricing';
import { router } from '../../core/router';

const PromoCodeSchema = s
  .string()
  .trim()
  .regex(/^VIELZEUG-\d{3,4}$/i, () => 'Format: VIELZEUG-1234');

define('cart-view', {
  setup() {
    const promoInput = signal('');
    const promoError = signal('');
    const promoApplied = signal(false);

    function applyPromo(): void {
      const result = PromoCodeSchema.safeParse(promoInput.value);

      if (!result.success) {
        promoError.value = t('cart.promoInvalid');
        promoApplied.value = false;

        return;
      }

      promoError.value = '';
      promoApplied.value = true;
    }

    return html`
      <h1>${() => t('cart.title')}</h1>
      ${when(
        () => cartLineBreakdowns.value.length === 0,
        () => html`
          <ore-async status="empty" empty-label=${() => t('cart.empty')}></ore-async>
        `,
        () => html`
          <div class="cart-view__lines">
            ${each(
              cartLineBreakdowns,
              (l) => l.item.id,
              (l) => {
                const resolved = () => resolveConfiguration(l.value.model, l.value.item.configuration);

                return html`
                  <div class="cart-line">
                    <car-silhouette
                      :body-type=${() => l.value.model.bodyType}
                      :color-hex=${() => resolved().color.hex}
                      :color-name=${() => resolved().color.name}
                      :hero-hue=${() => l.value.model.heroHue}></car-silhouette>
                    <div class="cart-line__info">
                      <h3>${() => l.value.model.name}</h3>
                      <p class="cart-line__config">
                        ${() => `${resolved().trim.name} · ${resolved().color.name} · ${resolved().wheel.name}`}
                      </p>
                      <ore-number-input
                        label=${() => t('cart.quantity')}
                        size="sm"
                        min="1"
                        max="5"
                        :value=${() => l.value.item.quantity}
                        @input=${(e: Event) =>
                          setCartItemQuantity(
                            l.value.item.id,
                            (e as CustomEvent<{ value: number | null }>).detail.value ?? 1,
                          )}></ore-number-input>
                    </div>
                    <div class="cart-line__price">
                      <strong><animated-price value-usd=${() => l.value.priceBreakdown.total}></animated-price></strong>
                      <ore-button rounded variant="ghost" size="sm" @click=${() => removeFromCart(l.value.item.id)}>
                        <ore-icon name="trash-2" size="14" aria-hidden="true"></ore-icon>
                        ${() => t('cart.remove')}
                      </ore-button>
                    </div>
                  </div>
                `;
              },
            )}
          </div>

          <div class="cart-view__promo">
            <ore-input
              placeholder=${() => t('cart.promoPlaceholder')}
              :value=${() => promoInput.value}
              :error=${() => promoError.value}
              @input=${(e: Event) => (promoInput.value = (e as CustomEvent<{ value: string }>).detail.value)}></ore-input>
            <ore-button rounded variant="bordered" @click=${applyPromo}>${() => t('cart.promoApply')}</ore-button>
            ${when(
              () => promoApplied.value,
              () => html`
                <ore-badge color="success" variant="flat">${() => t('cart.promoApplied', { percent: 10 })}</ore-badge>
              `,
            )}
          </div>

          <div class="cart-view__summary">
            <dl>
              <dt>${() => t('common.subtotal')}</dt>
              <dd><animated-price value-usd=${() => cartTotal.value.subtotal}></animated-price></dd>
              <dt>${() => t('common.tax')}</dt>
              <dd><animated-price value-usd=${() => cartTotal.value.tax}></animated-price></dd>
              <dt class="total">${() => t('common.total')}</dt>
              <dd class="total">
                <animated-price aria-live="polite" value-usd=${() => cartTotal.value.total}></animated-price>
              </dd>
            </dl>
            <ore-button
              rounded
              variant="solid"
              color="primary"
              size="lg"
              @click=${() => void router.navigate({ name: 'checkoutShipping' })}>
              ${() => t('cart.checkout')}
            </ore-button>
          </div>
        `,
      )}
    `;
  },
  shadow: false,
});

export function createCartView(): HTMLElement {
  const el = document.createElement('cart-view');

  el.className = 'cart-view';

  return el;
}
