import { css } from '@vielzeug/craftit/core';
import { type Fixture, mount } from '@vielzeug/craftit/test';
import { user } from '@vielzeug/craftit/test';

vi.mock('../../styles', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../styles')>();

  return {
    ...actual,
    colorThemeMixin: css``,
    disabledStateMixin: () => css``,
    sizeVariantMixin: () => css``,
  };
});

describe('bit-checkbox-group', () => {
  let fixture: Fixture<HTMLElement>;
  const getCheckboxes = (): HTMLElement[] =>
    Array.from(fixture.element.getElementsByTagName('bit-checkbox')) as HTMLElement[];

  beforeAll(async () => {
    await (() => import('../checkbox/checkbox'))();
    await (() => import('./checkbox-group'))();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  const checkboxHtml = `
    <bit-checkbox value="a">A</bit-checkbox>
    <bit-checkbox value="b">B</bit-checkbox>
    <bit-checkbox value="c">C</bit-checkbox>
  `;

  describe('Core Functionality', () => {
    it('renders semantic fieldset and grouped items', async () => {
      fixture = await mount('bit-checkbox-group', {
        attrs: { label: 'Choose options' },
        html: checkboxHtml,
      });
      await fixture.flush();

      expect(fixture.query('fieldset')).toBeTruthy();
      expect(fixture.query('.checkbox-group-items')).toBeTruthy();
    });

    it('syncs checked state to slotted checkboxes from values attribute', async () => {
      fixture = await mount('bit-checkbox-group', {
        attrs: { values: 'a,c' },
        html: checkboxHtml,
      });
      await fixture.flush();
      await fixture.flush();

      const checkboxes = getCheckboxes();

      expect(checkboxes[0].hasAttribute('checked')).toBe(true);
      expect(checkboxes[1].hasAttribute('checked')).toBe(false);
      expect(checkboxes[2].hasAttribute('checked')).toBe(true);
    });

    it('propagates color to slotted checkboxes', async () => {
      fixture = await mount('bit-checkbox-group', {
        attrs: { color: 'primary' },
        html: checkboxHtml,
      });
      await fixture.flush();
      await fixture.flush();

      const checkboxes = getCheckboxes();

      for (const checkbox of checkboxes) {
        expect(checkbox.getAttribute('color')).toBe('primary');
      }
    });

    it('propagates size to slotted checkboxes', async () => {
      fixture = await mount('bit-checkbox-group', {
        attrs: { size: 'lg' },
        html: checkboxHtml,
      });
      await fixture.flush();
      await fixture.flush();

      const checkboxes = getCheckboxes();

      for (const checkbox of checkboxes) {
        expect(checkbox.getAttribute('size')).toBe('lg');
      }
    });

    it('updates slotted checkbox size when group size changes', async () => {
      fixture = await mount('bit-checkbox-group', {
        attrs: { size: 'sm' },
        html: checkboxHtml,
      });
      await fixture.flush();
      await fixture.flush();

      await fixture.attr('size', 'lg');
      await fixture.flush();

      const checkboxes = getCheckboxes();

      for (const checkbox of checkboxes) {
        expect(checkbox.getAttribute('size')).toBe('lg');
      }
    });

    it('propagates disabled to slotted checkboxes', async () => {
      fixture = await mount('bit-checkbox-group', {
        attrs: { disabled: '' },
        html: checkboxHtml,
      });
      await fixture.flush();
      await fixture.flush();

      const checkboxes = getCheckboxes();

      for (const checkbox of checkboxes) {
        expect(checkbox.hasAttribute('disabled')).toBe(true);
      }
    });

    it('emits change when slotted checkbox dispatches change', async () => {
      fixture = await mount('bit-checkbox-group', { html: checkboxHtml });
      await fixture.flush();

      const onChange = vi.fn();

      fixture.element.addEventListener('change', onChange);

      const first = getCheckboxes()[0];

      first.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

      expect(onChange).toHaveBeenCalled();

      const evt = onChange.mock.calls
        .map(
          (call) =>
            call[0] as CustomEvent<{ labels?: string[]; originalEvent?: Event; value?: string; values?: string[] }>,
        )
        .find((event) => Array.isArray(event?.detail?.values));

      expect(evt).toBeTruthy();
      expect(evt?.detail.values).toContain('a');
      expect(evt?.detail.value).toBe('a');
      expect(evt?.detail.labels).toContain('A');
      expect(evt?.detail.originalEvent).toBeDefined();
    });

    it('toggles value off if already checked', async () => {
      fixture = await mount('bit-checkbox-group', {
        attrs: { values: 'a,b' },
        html: checkboxHtml,
      });
      await fixture.flush();
      await fixture.flush();

      const onChange = vi.fn();

      fixture.element.addEventListener('change', onChange);

      const first = getCheckboxes()[0];

      first.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

      const evt = onChange.mock.calls[0][0] as CustomEvent<{
        labels: string[];
        originalEvent?: Event;
        value: string;
        values: string[];
      }>;

      expect(evt.detail.values).not.toContain('a');
      expect(evt.detail.values).toContain('b');
      expect(evt.detail.value).toBe('b');
      expect(evt.detail.labels).toEqual(['B']);
      expect(evt.detail.originalEvent).toBeDefined();
    });

    it('toggles value when clicking slotted checkbox', async () => {
      fixture = await mount('bit-checkbox-group', {
        attrs: { values: 'a' },
        html: checkboxHtml,
      });
      await fixture.flush();
      await fixture.flush();

      const second = getCheckboxes()[1];

      await user.click(second);
      await fixture.flush();

      expect(fixture.element.getAttribute('values')).toBe('a,b');
      expect(getCheckboxes()[0].hasAttribute('checked')).toBe(true);
      expect(getCheckboxes()[1].hasAttribute('checked')).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('uses group role with required semantics', async () => {
      fixture = await mount('bit-checkbox-group', {
        attrs: { label: 'Choose options', required: '' },
        html: checkboxHtml,
      });
      await fixture.flush();

      const fieldset = fixture.query('fieldset[role="group"]');

      expect(fieldset).toBeTruthy();
      expect(fieldset?.getAttribute('aria-required')).toBe('true');
      expect(fixture.query('legend')?.textContent).toContain('Choose options');
    });

    it('shows required asterisk when required is set', async () => {
      fixture = await mount('bit-checkbox-group', {
        attrs: { label: 'Options', required: '' },
        html: checkboxHtml,
      });
      await fixture.flush();

      expect(fixture.query('legend')?.textContent).toContain('*');
    });

    it('associates error text through aria-errormessage', async () => {
      fixture = await mount('bit-checkbox-group', {
        attrs: { error: 'Please select at least one.', label: 'Pick one' },
        html: checkboxHtml,
      });
      await fixture.flush();

      const fieldset = fixture.query('fieldset');
      const errorEl = fixture.query('.error-text');

      expect(fieldset?.getAttribute('aria-invalid')).toBe('true');
      expect(fieldset?.getAttribute('aria-errormessage')).toBe(errorEl?.id);
    });

    it('associates helper text through aria-describedby', async () => {
      fixture = await mount('bit-checkbox-group', {
        attrs: { helper: 'You can choose multiple.', label: 'Pick one' },
        html: checkboxHtml,
      });
      await fixture.flush();

      const fieldset = fixture.query('fieldset');
      const helperEl = fixture.query('.helper-text');

      expect(fieldset?.getAttribute('aria-describedby')).toBe(helperEl?.id);
    });

    it('hides legend when no label is set', async () => {
      fixture = await mount('bit-checkbox-group', { html: checkboxHtml });
      await fixture.flush();

      expect(fixture.query('legend[hidden]')).toBeTruthy();
    });
  });

  describe('Orientation', () => {
    it('defaults to vertical orientation', async () => {
      fixture = await mount('bit-checkbox-group', { html: checkboxHtml });
      expect(fixture.element.getAttribute('orientation')).toBe('vertical');
    });

    it('applies horizontal orientation', async () => {
      fixture = await mount('bit-checkbox-group', {
        attrs: { orientation: 'horizontal' },
      });
      expect(fixture.element.getAttribute('orientation')).toBe('horizontal');
    });
  });
});
