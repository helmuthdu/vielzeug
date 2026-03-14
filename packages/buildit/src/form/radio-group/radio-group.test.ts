import { css } from '@vielzeug/craftit';
import { type Fixture, mount, user } from '@vielzeug/craftit/test';

vi.mock('../../styles', () => ({
  colorThemeMixin: css``,
  disabledStateMixin: () => css``,
  sizeVariantMixin: () => css``,
}));

describe('bit-radio-group', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./radio-group');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  const radioHtml = `
    <bit-radio value="a">A</bit-radio>
    <bit-radio value="b">B</bit-radio>
    <bit-radio value="c">C</bit-radio>
  `;

  describe('Core Functionality', () => {
    it('renders semantic fieldset and grouped items', async () => {
      fixture = await mount('bit-radio-group', { attrs: { label: 'Choose one' }, html: radioHtml });
      await fixture.flush();

      expect(fixture.query('fieldset')).toBeTruthy();
      expect(fixture.query('.radio-group-items')).toBeTruthy();
    });

    it('syncs name and selected state to slotted radios', async () => {
      fixture = await mount('bit-radio-group', {
        attrs: { name: 'letters', value: 'b' },
        html: radioHtml,
      });
      await fixture.flush();
      await fixture.flush();

      const radios = fixture.element.querySelectorAll<HTMLElement>('bit-radio');

      expect(radios[1].hasAttribute('checked')).toBe(true);
      expect(radios[1].getAttribute('name')).toBe('letters');
    });

    it('emits change when slotted radio dispatches change', async () => {
      fixture = await mount('bit-radio-group', { attrs: { name: 'letters' }, html: radioHtml });
      await fixture.flush();

      const onChange = vi.fn();

      fixture.element.addEventListener('change', onChange);

      const second = fixture.element.querySelectorAll<HTMLElement>('bit-radio')[1];

      second.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

      expect(onChange).toHaveBeenCalled();

      const changeWithDetail = onChange.mock.calls
        .map((call) => call[0] as CustomEvent<{ value?: string }>)
        .find((event) => event?.detail?.value === 'b');

      expect(changeWithDetail).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('uses radiogroup role with required semantics', async () => {
      fixture = await mount('bit-radio-group', {
        attrs: { label: 'Choose one', required: '' },
        html: radioHtml,
      });
      await fixture.flush();

      const fieldset = fixture.query('fieldset[role="radiogroup"]');

      expect(fieldset).toBeTruthy();
      expect(fieldset?.getAttribute('aria-required')).toBe('true');
      expect(fixture.query('legend')?.textContent).toContain('Choose one');
    });

    it('associates helper text through aria-describedby', async () => {
      fixture = await mount('bit-radio-group', {
        attrs: { helper: 'Use arrows to navigate', label: 'Choose one' },
        html: radioHtml,
      });
      await fixture.flush();

      const helper = fixture.query('.helper-text');

      expect(helper?.hasAttribute('hidden')).toBe(false);
      expect(helper?.textContent).toContain('Use arrows to navigate');

      const describedBy = fixture.query('fieldset')?.getAttribute('aria-describedby') ?? '';

      expect(describedBy.length).toBeGreaterThan(0);
    });

    it('announces errors with alert role and invalid state', async () => {
      fixture = await mount('bit-radio-group', {
        attrs: { error: 'Selection required', label: 'Choose one' },
        html: radioHtml,
      });
      await fixture.flush();

      expect(fixture.query('fieldset')?.getAttribute('aria-invalid')).toBe('true');
      expect(fixture.query('.error-text[role="alert"]')?.textContent).toContain('Selection required');
    });

    it('supports roving tabindex and arrow-key navigation', async () => {
      fixture = await mount('bit-radio-group', {
        attrs: { name: 'letters', value: 'a' },
        html: radioHtml,
      });
      await fixture.flush();
      await fixture.flush();

      const radios = fixture.element.querySelectorAll<HTMLElement>('bit-radio');

      radios[0].focus();
      await user.press(fixture.element, 'ArrowRight');

      expect(radios[1].hasAttribute('checked')).toBe(true);
      expect(radios[1].getAttribute('tabindex')).toBe('0');
    });
  });
});
