import { type Fixture, mount } from '@vielzeug/ore/testing';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

async function mountQrCode(
  value = 'https://example.com',
  attrs: Record<string, string> = {},
): Promise<Fixture<HTMLElement>> {
  return mount('ore-qr-code', { attrs: { value, ...attrs } });
}

describe('ore-qr-code', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./qr-code');
  });

  afterEach(() => {
    fixture?.dispose();
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders an inline SVG for the value', async () => {
      fixture = await mountQrCode('HELLO WORLD');

      const svg = fixture.element.shadowRoot?.querySelector('svg');

      expect(svg).toBeTruthy();
      expect(svg?.getAttribute('viewBox')).toBe('0 0 29 29'); // 21 + 2×4 margin
    });

    it('marks the SVG as role=img with the label', async () => {
      fixture = await mountQrCode('x', { label: 'Pairing code' });

      const svg = fixture.element.shadowRoot?.querySelector('svg');

      expect(svg?.getAttribute('role')).toBe('img');
      expect(svg?.getAttribute('aria-label')).toBe('Pairing code');
      expect(svg?.querySelector('title')?.textContent).toBe('Pairing code');
    });

    it('re-renders when value changes', async () => {
      fixture = await mountQrCode('first');
      const before = fixture.element.shadowRoot?.querySelector('svg')?.innerHTML;

      fixture.element.setAttribute('value', 'a much longer payload that bumps the version');
      await new Promise((r) => setTimeout(r));

      const after = fixture.element.shadowRoot?.querySelector('svg')?.innerHTML;
      expect(after).not.toBe(before);
    });

    it('emits render with version and size', async () => {
      fixture = await mountQrCode('HELLO WORLD');
      const events: Array<{ version: number; size: number }> = [];
      fixture.element.addEventListener('render', (e) => events.push((e as CustomEvent).detail));
      // Re-trigger encode.
      fixture.element.setAttribute('value', 'HELLO WORLD 2');
      await new Promise((r) => setTimeout(r));

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].version).toBeGreaterThanOrEqual(1);
      expect(events[0].size).toBe(192); // md default
    });

    it('renders the caption slot', async () => {
      fixture = await mount('ore-qr-code', {
        attrs: { value: 'x' },
        html: '<span slot="caption">Scan me</span>',
      });

      const caption = fixture.element.shadowRoot?.querySelector('[part="caption"]');

      expect(caption?.hasAttribute('hidden')).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('renders the error part and emits error on capacity overflow', async () => {
      const errors: unknown[] = [];
      fixture = await mount('ore-qr-code', { attrs: { value: 'x' } });
      fixture.element.addEventListener('error', (e) => errors.push((e as CustomEvent).detail));
      fixture.element.setAttribute('value', 'a'.repeat(3000));
      await new Promise((r) => setTimeout(r));

      const error = fixture.element.shadowRoot?.querySelector('[part="error"]');
      expect(error).toBeTruthy();
      expect(errors.length).toBeGreaterThan(0);
    });

    it('recovers when value returns to an encodable input', async () => {
      fixture = await mountQrCode('a'.repeat(3000));
      await new Promise((r) => setTimeout(r));
      expect(fixture.element.shadowRoot?.querySelector('[part="error"]')).toBeTruthy();

      fixture.element.setAttribute('value', 'ok');
      await new Promise((r) => setTimeout(r));

      expect(fixture.element.shadowRoot?.querySelector('svg')).toBeTruthy();
      expect(fixture.element.shadowRoot?.querySelector('[part="error"]')).toBeFalsy();
    });
  });

  describe('Accessibility', () => {
    it('has no axe violations', async () => {
      fixture = await mountQrCode('https://example.com', { label: 'Example link' });

      const results = await axeCheck(fixture.element);
      expect(results.violations).toEqual([]);
    });
  });
});
