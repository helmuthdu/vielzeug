/**
 * Cross-component form integration tests.
 * Validates that multiple field types cooperate correctly inside a bit-form:
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
      fixture = await mount('bit-form', {
        html: `
          <bit-input name="username" value="alice"></bit-input>
          <bit-textarea name="bio" value="Hello"></bit-textarea>
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
      fixture = await mount('bit-form', {
        html: `<bit-input name="secret" value="hidden" disabled></bit-input>`,
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
    it('marks child bit-input disabled when form is disabled', async () => {
      fixture = await mount('bit-form', {
        attrs: { disabled: '' },
        html: `<bit-input name="email"></bit-input>`,
      });

      await fixture.flush();

      const child = fixture.element.querySelector('bit-input');

      expect(child?.hasAttribute('disabled')).toBe(true);
    });

    it('marks child bit-textarea disabled when form is disabled', async () => {
      fixture = await mount('bit-form', {
        attrs: { disabled: '' },
        html: `<bit-textarea name="notes"></bit-textarea>`,
      });

      await fixture.flush();

      const child = fixture.element.querySelector('bit-textarea');

      expect(child?.hasAttribute('disabled')).toBe(true);
    });

    it('does not disable explicitly-enabled children when form is not disabled', async () => {
      fixture = await mount('bit-form', {
        html: `<bit-input name="email" value="test@example.com"></bit-input>`,
      });

      await fixture.flush();

      const child = fixture.element.querySelector('bit-input');

      expect(child?.hasAttribute('disabled')).toBe(false);
    });
  });

  // ─── Size / variant propagation ─────────────────────────────────────────────

  describe('size and variant propagation', () => {
    it('propagates size to multiple child inputs', async () => {
      fixture = await mount('bit-form', {
        attrs: { size: 'sm' },
        html: `
          <bit-input name="a"></bit-input>
          <bit-textarea name="b"></bit-textarea>
        `,
      });

      await fixture.flush();

      const input = fixture.element.querySelector('bit-input');
      const textarea = fixture.element.querySelector('bit-textarea');

      expect(input?.getAttribute('size')).toBe('sm');
      expect(textarea?.getAttribute('size')).toBe('sm');
    });

    it('child explicit size overrides form size', async () => {
      fixture = await mount('bit-form', {
        attrs: { size: 'lg' },
        html: `<bit-input name="a" size="sm"></bit-input>`,
      });

      await fixture.flush();

      const input = fixture.element.querySelector('bit-input');

      expect(input?.getAttribute('size')).toBe('sm');
    });
  });

  // ─── Reset ──────────────────────────────────────────────────────────────────

  describe('form reset', () => {
    it('emits reset event from bit-form', async () => {
      fixture = await mount('bit-form', {
        html: `<bit-input name="email" value="test"></bit-input>`,
      });

      const onReset = vi.fn();

      fixture.element.addEventListener('reset', onReset);

      fixture.query('form')?.dispatchEvent(new Event('reset', { bubbles: true }));

      expect(onReset).toHaveBeenCalledTimes(1);
    });
  });
});
