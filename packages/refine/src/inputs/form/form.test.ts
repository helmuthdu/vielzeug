import { type Fixture, mount } from '@vielzeug/ore/testing';

describe('ore-form', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await (() => import('./form'))();
    await (() => import('../input/input'))();
  });

  afterEach(() => {
    fixture?.dispose();
  });

  describe('Core Functionality', () => {
    it('renders native form element in shadow DOM', async () => {
      fixture = await mount('ore-form');

      expect(fixture.query('form')).toBeTruthy();
    });

    it('emits submit event with formData payload', async () => {
      fixture = await mount('ore-form');

      const onSubmit = vi.fn();

      fixture.element.addEventListener('submit', onSubmit);

      fixture.query('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      expect(onSubmit).toHaveBeenCalledTimes(1);

      const detail = (onSubmit.mock.calls[0][0] as CustomEvent).detail;

      expect(detail.formData).toBeInstanceOf(FormData);
      expect(detail.originalEvent).toBeDefined();
    });

    it('emits reset event', async () => {
      fixture = await mount('ore-form');

      const onReset = vi.fn();

      fixture.element.addEventListener('reset', onReset);

      fixture.query('form')?.dispatchEvent(new Event('reset', { bubbles: true }));

      expect(onReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('sets aria-disabled when disabled', async () => {
      fixture = await mount('ore-form', { attrs: { disabled: '' } });

      expect(fixture.query('form')?.getAttribute('aria-disabled')).toBe('true');
    });

    it('supports novalidate mode for custom validation messaging', async () => {
      fixture = await mount('ore-form', { attrs: { novalidate: '' } });

      expect(fixture.query('form')?.hasAttribute('novalidate')).toBe(true);
    });

    it('defaults to vertical orientation', async () => {
      fixture = await mount('ore-form');

      expect(fixture.element.getAttribute('orientation')).toBe('vertical');
    });

    it('supports horizontal orientation', async () => {
      fixture = await mount('ore-form', { attrs: { orientation: 'horizontal' } });

      expect(fixture.element.getAttribute('orientation')).toBe('horizontal');
    });
  });

  describe('Context Propagation', () => {
    it('propagates disabled/size/variant to child controls', async () => {
      fixture = await mount('ore-form', {
        attrs: { disabled: '', size: 'lg', variant: 'flat' },
        html: '<ore-input></ore-input>',
      });

      await fixture.flush();

      const child = fixture.element.querySelector('ore-input');

      expect(child?.hasAttribute('disabled')).toBe(true);
      expect(child?.getAttribute('size')).toBe('lg');
      expect(child?.getAttribute('variant')).toBe('flat');
    });

    it('does not override explicit child size/variant', async () => {
      fixture = await mount('ore-form', {
        attrs: { size: 'lg', variant: 'flat' },
        html: '<ore-input size="sm" variant="bordered"></ore-input>',
      });

      await fixture.flush();

      const child = fixture.element.querySelector('ore-input');

      expect(child?.getAttribute('size')).toBe('sm');
      expect(child?.getAttribute('variant')).toBe('bordered');
    });
  });

  describe('Accessibility', () => {
    it('passes axe checks', async () => {
      fixture = await mount('ore-form', {
        html: '<ore-input label="Email"></ore-input>',
      });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });
});
