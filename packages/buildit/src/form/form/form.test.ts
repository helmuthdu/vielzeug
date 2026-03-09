import { type Fixture, mount } from '@vielzeug/craftit/test';

describe('bit-form', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./form');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Core Functionality', () => {
    it('renders native form element in shadow DOM', async () => {
      fixture = await mount('bit-form');

      expect(fixture.query('form')).toBeTruthy();
    });

    it('emits submit event with formData payload', async () => {
      fixture = await mount('bit-form');
      const onSubmit = vi.fn();
      fixture.element.addEventListener('submit', onSubmit);

      fixture.query('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      expect(onSubmit).toHaveBeenCalledTimes(1);
      const detail = (onSubmit.mock.calls[0][0] as CustomEvent).detail;
      expect(detail.formData).toBeInstanceOf(FormData);
      expect(detail.originalEvent).toBeDefined();
    });

    it('emits reset event', async () => {
      fixture = await mount('bit-form');
      const onReset = vi.fn();
      fixture.element.addEventListener('reset', onReset);

      fixture.query('form')?.dispatchEvent(new Event('reset', { bubbles: true }));

      expect(onReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('sets aria-disabled when disabled', async () => {
      fixture = await mount('bit-form', { attrs: { disabled: '' } });

      expect(fixture.query('form')?.getAttribute('aria-disabled')).toBe('true');
    });

    it('supports novalidate mode for custom validation messaging', async () => {
      fixture = await mount('bit-form', { attrs: { novalidate: '' } });

      expect(fixture.query('form')?.hasAttribute('novalidate')).toBe(true);
    });

    it('defaults to vertical orientation', async () => {
      fixture = await mount('bit-form');

      expect(fixture.element.getAttribute('orientation')).toBe('vertical');
    });

    it('supports horizontal orientation', async () => {
      fixture = await mount('bit-form', { attrs: { orientation: 'horizontal' } });

      expect(fixture.element.getAttribute('orientation')).toBe('horizontal');
    });
  });
});
