import { type Fixture, mount } from '@vielzeug/ore/testing';

describe('ore-step', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    // Some cases below nest ore-step inside a real ore-stepper to exercise context-derived
    // state (current/completed/index); others mount it standalone (no parent context).
    await import('./step');
    await import('./stepper');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  describe('Rendering', () => {
    it('renders the step number when not completed and no icon slot is provided', async () => {
      fixture = await mount('ore-stepper', {
        attrs: { value: 'shipping' },
        html: `
          <ore-step value="cart">Cart</ore-step>
          <ore-step value="shipping">Shipping</ore-step>
          <ore-step value="payment">Payment</ore-step>
        `,
      });
      await fixture.flush();

      const shippingStep = fixture.element.querySelector('ore-step[value="shipping"]')!;

      expect(shippingStep.shadowRoot?.querySelector('.number')?.textContent).toBe('2');
    });

    it('renders a check icon when completed', async () => {
      fixture = await mount('ore-stepper', {
        attrs: { value: 'shipping' },
        html: `<ore-step value="cart">Cart</ore-step><ore-step value="shipping">Shipping</ore-step>`,
      });
      await fixture.flush();

      const cartStep = fixture.element.querySelector('ore-step[value="cart"]')!;

      expect(cartStep.shadowRoot?.querySelector('ore-icon[name="check"]')).toBeTruthy();
    });

    it('renders an error icon when error is set, even if completed', async () => {
      fixture = await mount('ore-stepper', {
        attrs: { value: 'shipping' },
        html: `<ore-step value="cart" error>Cart</ore-step><ore-step value="shipping">Shipping</ore-step>`,
      });
      await fixture.flush();

      const cartStep = fixture.element.querySelector('ore-step[value="cart"]')!;

      expect(cartStep.shadowRoot?.querySelector('ore-icon[name="x"]')).toBeTruthy();
    });

    // Regression: `completed` used to be gated on `!error`, so an error step positioned before
    // the current one lost the `completed` attribute entirely — breaking the continuous
    // connector color chain right at that step (step.css colors both connector segments off
    // `:host([completed])`), even though it visually still sits "before" the current step.
    it('still reflects the completed attribute on an error step positioned before the current one', async () => {
      fixture = await mount('ore-stepper', {
        attrs: { value: 'payment' },
        html: `
          <ore-step value="cart">Cart</ore-step>
          <ore-step value="shipping" error>Shipping</ore-step>
          <ore-step value="payment">Payment</ore-step>
        `,
      });
      await fixture.flush();

      const shippingStep = fixture.element.querySelector('ore-step[value="shipping"]')!;

      expect(shippingStep.hasAttribute('completed')).toBe(true);
      expect(shippingStep.hasAttribute('error')).toBe(true);
      // Icon still shows the error state, not the completed checkmark.
      expect(shippingStep.shadowRoot?.querySelector('ore-icon[name="x"]')).toBeTruthy();
      expect(shippingStep.shadowRoot?.querySelector('ore-icon[name="check"]')).toBeFalsy();
    });

    it('renders an optional hint when optional is set', async () => {
      fixture = await mount('ore-step', { attrs: { optional: 'true', value: 'address' }, html: 'Address' });

      expect(fixture.query('.optional-hint')).toBeTruthy();
    });

    it('renders slotted description text', async () => {
      fixture = await mount('ore-step', {
        attrs: { value: 'shipping' },
        html: 'Shipping<span slot="description">Choose a delivery method</span>',
      });

      expect(fixture.query('.description')?.hasAttribute('hidden')).toBe(false);
    });
  });

  // ─── Standalone Rendering ─────────────────────────────────────────────────────
  //
  // ore-step is documented as "must be a direct child of ore-stepper", but shouldn't misbehave
  // if mounted on its own (e.g. in isolation in a design-system playground) — `inject()` returns
  // undefined with no parent context, and every context-derived value below has a sane fallback.

  describe('Standalone Rendering (no parent ore-stepper)', () => {
    it('renders as static (non-navigable) content', async () => {
      fixture = await mount('ore-step', { attrs: { value: 'cart' }, html: 'Cart' });

      expect(fixture.query('button.control')).toBeFalsy();
      expect(fixture.query('div.control')).toBeTruthy();
    });

    it('does not reflect current/completed/navigable/total attributes', async () => {
      fixture = await mount('ore-step', { attrs: { value: 'cart' }, html: 'Cart' });

      expect(fixture.element.hasAttribute('current')).toBe(false);
      expect(fixture.element.hasAttribute('completed')).toBe(false);
      expect(fixture.element.hasAttribute('navigable')).toBe(false);
      expect(fixture.element.hasAttribute('total')).toBe(false);
    });

    it('falls back to "Step 1 of 1" for the sr-only position label', async () => {
      fixture = await mount('ore-step', { attrs: { value: 'cart' }, html: 'Cart' });

      expect(fixture.query('.sr-only')?.textContent).toBe('Step 1 of 1');
    });
  });
});
