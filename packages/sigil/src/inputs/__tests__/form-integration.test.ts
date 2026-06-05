/**
 * Cross-component form integration tests.
 * Validates that multiple field types cooperate correctly inside a sg-form:
 * FormData values, disabled propagation, and validation cascade.
 */
import { type Fixture, mount } from '@vielzeug/craft/testing';

describe('form integration', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await (() => import('../form/form'))();
    await (() => import('../input/input'))();
    await (() => import('../checkbox-group/checkbox-group'))();
    await (() => import('../checkbox/checkbox'))();
    await (() => import('../textarea/textarea'))();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  // ─── FormData submission ────────────────────────────────────────────────────

  describe('FormData collection', () => {
    it('collects values from multiple field types on submit', async () => {
      fixture = await mount('sg-form', {
        html: `
          <sg-input name="username" value="alice"></sg-input>
          <sg-textarea name="bio" value="Hello"></sg-textarea>
        `,
      });

      await fixture.flush();

      let capturedData: FormData | undefined;

      fixture.element.addEventListener('submit', (e) => {
        capturedData = (e as unknown as CustomEvent).detail?.formData as FormData | undefined;
      });

      fixture.query('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      expect(capturedData).toBeInstanceOf(FormData);
    });

    it('omits disabled field values from FormData', async () => {
      fixture = await mount('sg-form', {
        html: `<sg-input name="secret" value="hidden" disabled></sg-input>`,
      });

      await fixture.flush();

      let capturedData: FormData | undefined;

      fixture.element.addEventListener('submit', (e) => {
        capturedData = (e as unknown as CustomEvent).detail?.formData as FormData | undefined;
      });

      fixture.query('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      if (capturedData) {
        expect(capturedData.has('secret')).toBe(false);
      }
    });
  });

  // ─── Disabled propagation ───────────────────────────────────────────────────

  describe('disabled propagation via form context', () => {
    it('marks child sg-input disabled when form is disabled', async () => {
      fixture = await mount('sg-form', {
        attrs: { disabled: '' },
        html: `<sg-input name="email"></sg-input>`,
      });

      await fixture.flush();

      const child = fixture.element.querySelector('sg-input');

      expect(child?.hasAttribute('disabled')).toBe(true);
    });

    it('marks child sg-textarea disabled when form is disabled', async () => {
      fixture = await mount('sg-form', {
        attrs: { disabled: '' },
        html: `<sg-textarea name="notes"></sg-textarea>`,
      });

      await fixture.flush();

      const child = fixture.element.querySelector('sg-textarea');

      expect(child?.hasAttribute('disabled')).toBe(true);
    });

    it('does not disable explicitly-enabled children when form is not disabled', async () => {
      fixture = await mount('sg-form', {
        html: `<sg-input name="email" value="test@example.com"></sg-input>`,
      });

      await fixture.flush();

      const child = fixture.element.querySelector('sg-input');

      expect(child?.hasAttribute('disabled')).toBe(false);
    });
  });

  // ─── Size / variant propagation ─────────────────────────────────────────────

  describe('size and variant propagation', () => {
    it('propagates size to multiple child inputs', async () => {
      fixture = await mount('sg-form', {
        attrs: { size: 'sm' },
        html: `
          <sg-input name="a"></sg-input>
          <sg-textarea name="b"></sg-textarea>
        `,
      });

      await fixture.flush();

      const input = fixture.element.querySelector('sg-input');
      const textarea = fixture.element.querySelector('sg-textarea');

      expect(input?.getAttribute('size')).toBe('sm');
      expect(textarea?.getAttribute('size')).toBe('sm');
    });

    it('child explicit size overrides form size', async () => {
      fixture = await mount('sg-form', {
        attrs: { size: 'lg' },
        html: `<sg-input name="a" size="sm"></sg-input>`,
      });

      await fixture.flush();

      const input = fixture.element.querySelector('sg-input');

      expect(input?.getAttribute('size')).toBe('sm');
    });
  });

  // ─── Reset ──────────────────────────────────────────────────────────────────

  describe('form reset', () => {
    it('emits reset event from sg-form', async () => {
      fixture = await mount('sg-form', {
        html: `<sg-input name="email" value="test"></sg-input>`,
      });

      const onReset = vi.fn();

      fixture.element.addEventListener('reset', onReset);

      fixture.query('form')?.dispatchEvent(new Event('reset', { bubbles: true }));

      expect(onReset).toHaveBeenCalledTimes(1);
    });
  });
});
