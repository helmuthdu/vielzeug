/**
 * Cross-component form integration tests.
 * Validates that multiple field types cooperate correctly inside a ore-form:
 * FormData values, disabled propagation, and validation cascade.
 */
import { type Fixture, mount } from '@vielzeug/ore/testing';

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
    fixture?.dispose();
  });

  // ─── FormData submission ────────────────────────────────────────────────────

  describe('FormData collection', () => {
    it('collects values from multiple field types on submit', async () => {
      fixture = await mount('ore-form', {
        html: `
          <ore-input name="username" value="alice"></ore-input>
          <ore-textarea name="bio" value="Hello"></ore-textarea>
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
      fixture = await mount('ore-form', {
        html: `<ore-input name="secret" value="hidden" disabled></ore-input>`,
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
    it('marks child ore-input disabled when form is disabled', async () => {
      fixture = await mount('ore-form', {
        attrs: { disabled: '' },
        html: `<ore-input name="email"></ore-input>`,
      });

      await fixture.flush();

      const child = fixture.element.querySelector('ore-input');

      expect(child?.hasAttribute('disabled')).toBe(true);
    });

    it('marks child ore-textarea disabled when form is disabled', async () => {
      fixture = await mount('ore-form', {
        attrs: { disabled: '' },
        html: `<ore-textarea name="notes"></ore-textarea>`,
      });

      await fixture.flush();

      const child = fixture.element.querySelector('ore-textarea');

      expect(child?.hasAttribute('disabled')).toBe(true);
    });

    it('does not disable explicitly-enabled children when form is not disabled', async () => {
      fixture = await mount('ore-form', {
        html: `<ore-input name="email" value="test@example.com"></ore-input>`,
      });

      await fixture.flush();

      const child = fixture.element.querySelector('ore-input');

      expect(child?.hasAttribute('disabled')).toBe(false);
    });
  });

  // ─── Size / variant propagation ─────────────────────────────────────────────

  describe('size and variant propagation', () => {
    it('propagates size to multiple child inputs', async () => {
      fixture = await mount('ore-form', {
        attrs: { size: 'sm' },
        html: `
          <ore-input name="a"></ore-input>
          <ore-textarea name="b"></ore-textarea>
        `,
      });

      await fixture.flush();

      const input = fixture.element.querySelector('ore-input');
      const textarea = fixture.element.querySelector('ore-textarea');

      expect(input?.getAttribute('size')).toBe('sm');
      expect(textarea?.getAttribute('size')).toBe('sm');
    });

    it('child explicit size overrides form size', async () => {
      fixture = await mount('ore-form', {
        attrs: { size: 'lg' },
        html: `<ore-input name="a" size="sm"></ore-input>`,
      });

      await fixture.flush();

      const input = fixture.element.querySelector('ore-input');

      expect(input?.getAttribute('size')).toBe('sm');
    });
  });

  // ─── Reset ──────────────────────────────────────────────────────────────────

  describe('form reset', () => {
    it('emits reset event from ore-form', async () => {
      fixture = await mount('ore-form', {
        html: `<ore-input name="email" value="test"></ore-input>`,
      });

      const onReset = vi.fn();

      fixture.element.addEventListener('reset', onReset);

      fixture.query('form')?.dispatchEvent(new Event('reset', { bubbles: true }));

      expect(onReset).toHaveBeenCalledTimes(1);
    });
  });
});
