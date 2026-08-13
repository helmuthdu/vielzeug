import { fireKeyDown } from '@vielzeug/assay';
import { type Fixture, flush, mount } from '@vielzeug/ore/testing';

describe('ore-stepper', () => {
  let fixture: Fixture<HTMLElement>;

  const htmlSteps = `
    <ore-step value="cart">Cart</ore-step>
    <ore-step value="shipping">Shipping</ore-step>
    <ore-step value="payment">Payment</ore-step>
  `;

  beforeAll(async () => {
    // ore-stepper projects/queries `ore-step` children, so both must be registered.
    await import('./step');
    await import('./stepper');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  // ─── Rendering ───────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders a nav landmark and an ordered list of steps', async () => {
      fixture = await mount('ore-stepper', { html: htmlSteps });

      expect(fixture.query('nav')).toBeTruthy();
      expect(fixture.query('ol.steps')).toBeTruthy();
    });

    it('applies a default nav label', async () => {
      fixture = await mount('ore-stepper', { html: htmlSteps });

      expect(fixture.query('nav')?.getAttribute('aria-label')).toBe('Progress');
    });

    it('applies a custom nav label', async () => {
      fixture = await mount('ore-stepper', { attrs: { label: 'Checkout progress' }, html: htmlSteps });

      expect(fixture.query('nav')?.getAttribute('aria-label')).toBe('Checkout progress');
    });

    it('defaults to the first step when no value is set', async () => {
      fixture = await mount('ore-stepper', { html: htmlSteps });
      await fixture.flush();

      expect(fixture.element.getAttribute('value')).toBe('cart');
    });

    it('numbers each step 1-based via the index attribute', async () => {
      fixture = await mount('ore-stepper', { attrs: { value: 'shipping' }, html: htmlSteps });
      await fixture.flush();

      const steps = fixture.element.querySelectorAll('ore-step');

      expect(steps[0].getAttribute('index')).toBe('1');
      expect(steps[1].getAttribute('index')).toBe('2');
      expect(steps[2].getAttribute('index')).toBe('3');
      expect(steps[0].getAttribute('total')).toBe('3');
    });

    // Regression: `mount()`'s `innerHTML` assignment parses every child before the stepper
    // itself ever connects, so `ore-stepper` always sees its full child list the first time it
    // reads it — that's the *one* mounting pattern this bug doesn't reproduce under. A browser
    // parsing `<ore-stepper><ore-step>...` with both tags already `customElements.define()`d
    // (true of any consumer whose bundler/module loader registers components before rendering
    // markup — e.g. every sandboxed live-preview iframe, since it explicitly registers custom
    // elements first specifically so they upgrade as their tags are parsed) upgrades each
    // element as its own tag is reached, so `ore-stepper` provides its context to the *first*
    // `ore-step` while the rest of its siblings don't exist in the light DOM yet. Rebuilding
    // that with raw `appendChild` calls (each one upgrading synchronously, since both elements
    // are already registered by `beforeAll` above) is the only way to exercise it in jsdom.
    it('renders every step correctly when steps are appended one at a time after the stepper connects', async () => {
      const stepper = document.createElement('ore-stepper');

      stepper.setAttribute('value', 'shipping');
      document.body.appendChild(stepper);

      const values = ['cart', 'shipping', 'payment'];
      const steps = values.map((value) => {
        const step = document.createElement('ore-step');

        step.setAttribute('value', value);
        step.textContent = value;
        stepper.appendChild(step);

        return step;
      });

      await flush();

      try {
        for (const [index, step] of steps.entries()) {
          expect(step.shadowRoot?.querySelector('.control'), `${values[index]} has no rendered control`).toBeTruthy();
          expect(step.getAttribute('index')).toBe(String(index + 1));
        }

        expect(steps[0].hasAttribute('completed')).toBe(true);
        expect(steps[1].hasAttribute('current')).toBe(true);
      } finally {
        stepper.remove();
      }
    });
  });

  // ─── State Propagation ────────────────────────────────────────────────────────
  //
  // These attributes are now derived by each ore-step from ore-stepper's context (see
  // stepper.ts's module doc comment) rather than pushed onto every child imperatively — the
  // resulting DOM contract asserted below is unchanged.

  describe('State Propagation', () => {
    it('marks the matching step current and preceding steps completed', async () => {
      fixture = await mount('ore-stepper', { attrs: { value: 'shipping' }, html: htmlSteps });
      await fixture.flush();

      const steps = fixture.element.querySelectorAll('ore-step');

      expect(steps[0].hasAttribute('completed')).toBe(true);
      expect(steps[1].hasAttribute('current')).toBe(true);
      expect(steps[1].hasAttribute('completed')).toBe(false);
      expect(steps[2].hasAttribute('current')).toBe(false);
      expect(steps[2].hasAttribute('completed')).toBe(false);
    });

    it('propagates color, size, and orientation to steps', async () => {
      fixture = await mount('ore-stepper', {
        attrs: { color: 'primary', orientation: 'vertical', size: 'lg', value: 'cart' },
        html: htmlSteps,
      });
      await fixture.flush();

      const step = fixture.element.querySelector('ore-step')!;

      expect(step.getAttribute('color')).toBe('primary');
      expect(step.getAttribute('size')).toBe('lg');
      expect(step.getAttribute('orientation')).toBe('vertical');
    });

    it('marks no step navigable by default (display-only progress)', async () => {
      fixture = await mount('ore-stepper', { attrs: { value: 'cart' }, html: htmlSteps });
      await fixture.flush();

      const steps = fixture.element.querySelectorAll('ore-step');

      steps.forEach((step) => expect(step.hasAttribute('navigable')).toBe(false));
    });

    it('marks non-disabled steps navigable when clickable is set', async () => {
      fixture = await mount('ore-stepper', {
        attrs: { clickable: 'true', value: 'cart' },
        html: `${htmlSteps}<ore-step value="review" disabled>Review</ore-step>`,
      });
      await fixture.flush();

      const steps = fixture.element.querySelectorAll('ore-step');

      expect(steps[0].hasAttribute('navigable')).toBe(true);
      expect(steps[1].hasAttribute('navigable')).toBe(true);
      expect(steps[3].hasAttribute('navigable')).toBe(false);
    });

    it('restricts navigable steps to completed + current when linear', async () => {
      fixture = await mount('ore-stepper', {
        attrs: { clickable: 'true', linear: 'true', value: 'shipping' },
        html: htmlSteps,
      });
      await fixture.flush();

      const steps = fixture.element.querySelectorAll('ore-step');

      expect(steps[0].hasAttribute('navigable')).toBe(true); // completed
      expect(steps[1].hasAttribute('navigable')).toBe(true); // current
      expect(steps[2].hasAttribute('navigable')).toBe(false); // upcoming
    });

    it('disabling the whole stepper prevents any step from being navigable', async () => {
      fixture = await mount('ore-stepper', {
        attrs: { clickable: 'true', disabled: 'true', value: 'cart' },
        html: htmlSteps,
      });
      await fixture.flush();

      const steps = fixture.element.querySelectorAll('ore-step');

      steps.forEach((step) => expect(step.hasAttribute('navigable')).toBe(false));
    });
  });

  // ─── Navigation ──────────────────────────────────────────────────────────────

  describe('Navigation', () => {
    it('clicking a navigable step updates the value and fires change', async () => {
      fixture = await mount('ore-stepper', { attrs: { clickable: 'true', value: 'cart' }, html: htmlSteps });
      await fixture.flush();

      const onChange = vi.fn();

      fixture.element.addEventListener('change', onChange);

      const shippingStep = fixture.element.querySelector('ore-step[value="shipping"]')!;

      shippingStep.dispatchEvent(new CustomEvent('click', { bubbles: true, composed: true }));

      expect(fixture.element.getAttribute('value')).toBe('shipping');
      expect(onChange).toHaveBeenCalledTimes(1);
      expect((onChange.mock.calls[0][0] as CustomEvent).detail.value).toBe('shipping');
    });

    it('clicking a step is a no-op when the stepper is not clickable', async () => {
      fixture = await mount('ore-stepper', { attrs: { value: 'cart' }, html: htmlSteps });
      await fixture.flush();

      const onChange = vi.fn();

      fixture.element.addEventListener('change', onChange);

      const shippingStep = fixture.element.querySelector('ore-step[value="shipping"]')!;

      shippingStep.dispatchEvent(new CustomEvent('click', { bubbles: true, composed: true }));

      expect(fixture.element.getAttribute('value')).toBe('cart');
      expect(onChange).not.toHaveBeenCalled();
    });

    it('clicking a step beyond the linear boundary is a no-op', async () => {
      fixture = await mount('ore-stepper', {
        attrs: { clickable: 'true', linear: 'true', value: 'cart' },
        html: htmlSteps,
      });
      await fixture.flush();

      const paymentStep = fixture.element.querySelector('ore-step[value="payment"]')!;

      paymentStep.dispatchEvent(new CustomEvent('click', { bubbles: true, composed: true }));

      expect(fixture.element.getAttribute('value')).toBe('cart');
    });

    it('supports arrow-key navigation between navigable steps', async () => {
      fixture = await mount('ore-stepper', { attrs: { clickable: 'true', value: 'cart' }, html: htmlSteps });
      await fixture.flush();

      const steps = fixture.element.querySelectorAll<HTMLElement>('ore-step');

      fireKeyDown(steps[0], { key: 'ArrowRight' });
      expect(fixture.element.getAttribute('value')).toBe('shipping');
    });

    it('does not include disabled steps in keyboard navigation order', async () => {
      fixture = await mount('ore-stepper', {
        attrs: { clickable: 'true', value: 'cart' },
        html: `
          <ore-step value="cart">Cart</ore-step>
          <ore-step value="shipping" disabled>Shipping</ore-step>
          <ore-step value="payment">Payment</ore-step>
        `,
      });
      await fixture.flush();

      const steps = fixture.element.querySelectorAll<HTMLElement>('ore-step');

      fireKeyDown(steps[0], { key: 'ArrowRight' });
      expect(fixture.element.getAttribute('value')).toBe('payment');
    });

    // Regression: the first step's `completed` attribute (and the connector styling that
    // depends on it) used to go permanently stale after it had been `current` at least once
    // and then moved past — a later click that should mark it completed again would silently
    // leave it with neither `current` nor `completed`. Cycling back onto (and away from) the
    // first step, then re-selecting a later one, exercises exactly that path.
    it('re-marks an earlier step completed after it was current and selection moves past it again', async () => {
      fixture = await mount('ore-stepper', { attrs: { clickable: 'true', value: 'payment' }, html: htmlSteps });
      await fixture.flush();

      const click = (value: string) => {
        fixture.element
          .querySelector(`ore-step[value="${value}"]`)
          ?.dispatchEvent(new CustomEvent('click', { bubbles: true, composed: true }));
      };
      const cart = () => fixture.element.querySelector('ore-step[value="cart"]')!;

      click('cart');
      await fixture.flush();
      expect(cart().hasAttribute('current')).toBe(true);
      expect(cart().hasAttribute('completed')).toBe(false);

      click('shipping');
      await fixture.flush();
      expect(cart().hasAttribute('current')).toBe(false);
      expect(cart().hasAttribute('completed')).toBe(true);

      click('payment');
      await fixture.flush();
      expect(cart().hasAttribute('completed')).toBe(true);
    });
  });

  // ─── Accessibility ────────────────────────────────────────────────────────────

  describe('Accessibility', () => {
    it('marks the current step with aria-current="step"', async () => {
      fixture = await mount('ore-stepper', { attrs: { clickable: 'true', value: 'shipping' }, html: htmlSteps });
      await fixture.flush();

      const shippingStep = fixture.element.querySelector('ore-step[value="shipping"]')!;
      const control = shippingStep.shadowRoot?.querySelector('.control');

      expect(control?.getAttribute('aria-current')).toBe('step');
    });

    it('renders navigable steps as buttons and display-only steps as static content', async () => {
      const clickableFixture = await mount('ore-stepper', {
        attrs: { clickable: 'true', value: 'cart' },
        html: htmlSteps,
      });

      await clickableFixture.flush();
      expect(
        clickableFixture.element.querySelector('ore-step')?.shadowRoot?.querySelector('button.control'),
      ).toBeTruthy();
      clickableFixture.dispose();

      const displayFixture = await mount('ore-stepper', { attrs: { value: 'cart' }, html: htmlSteps });

      await displayFixture.flush();
      expect(displayFixture.element.querySelector('ore-step')?.shadowRoot?.querySelector('button.control')).toBeFalsy();
      expect(displayFixture.element.querySelector('ore-step')?.shadowRoot?.querySelector('div.control')).toBeTruthy();
      displayFixture.dispose();
    });

    it('passes axe checks (display-only)', async () => {
      fixture = await mount('ore-stepper', { attrs: { value: 'shipping' }, html: htmlSteps });
      await fixture.flush();

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });

    it('passes axe checks (clickable navigation)', async () => {
      fixture = await mount('ore-stepper', { attrs: { clickable: 'true', value: 'shipping' }, html: htmlSteps });
      await fixture.flush();

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });
});
