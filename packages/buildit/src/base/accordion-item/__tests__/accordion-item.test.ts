import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { type ComponentFixture, createFixture } from '../../../utils/testing';

describe('bit-accordion-item', () => {
  let fixture: ComponentFixture<HTMLElement>;

  beforeAll(async () => {
    await import('../accordion-item');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('should render with details and summary elements', async () => {
      fixture = await createFixture('bit-accordion-item');

      const details = fixture.query('details');
      const summary = fixture.query('summary');

      expect(details).toBeTruthy();
      expect(summary).toBeTruthy();
      expect(summary?.getAttribute('aria-expanded')).toBe('false');
    });

    it('should render all slots', async () => {
      fixture = await createFixture('bit-accordion-item');
      fixture.element.innerHTML = `
        <span slot="prefix">📌</span>
        <span slot="title">Title</span>
        <span slot="subtitle">Subtitle</span>
        <span slot="suffix">✓</span>
        <p>Content</p>
      `;

      const slots = ['title', 'subtitle', 'prefix', 'suffix'];
      slots.forEach((name) => {
        expect(fixture.query(`slot[name="${name}"]`)).toBeTruthy();
      });
      expect(fixture.query('slot:not([name])')).toBeTruthy();
    });

    it('should render chevron icon', async () => {
      fixture = await createFixture('bit-accordion-item');

      const chevron = fixture.query('.chevron');
      expect(chevron).toBeTruthy();
      expect(chevron?.tagName).toBe('svg');
    });
  });

  describe('Expanded State', () => {
    it('should be collapsed by default', async () => {
      fixture = await createFixture('bit-accordion-item');

      const details = fixture.query<HTMLDetailsElement>('details');
      expect(details?.open).toBe(false);
      expect(fixture.element.hasAttribute('expanded')).toBe(false);
    });

    it('should expand when expanded attribute is set', async () => {
      fixture = await createFixture('bit-accordion-item', { expanded: true });

      const details = fixture.query<HTMLDetailsElement>('details');
      const summary = fixture.query('summary');

      expect(details?.open).toBe(true);
      expect(summary?.getAttribute('aria-expanded')).toBe('true');
    });

    it('should sync expanded attribute with details state', async () => {
      fixture = await createFixture('bit-accordion-item');
      const details = fixture.query<HTMLDetailsElement>('details');

      details!.open = true;
      details!.dispatchEvent(new Event('toggle'));
      expect(fixture.element.hasAttribute('expanded')).toBe(true);

      details!.open = false;
      details!.dispatchEvent(new Event('toggle'));
      expect(fixture.element.hasAttribute('expanded')).toBe(false);
    });

    it('should update details when expanded attribute changes', async () => {
      fixture = await createFixture('bit-accordion-item');
      const details = fixture.query<HTMLDetailsElement>('details');

      await fixture.setAttribute('expanded', true);
      expect(details?.open).toBe(true);
      expect(fixture.element.hasAttribute('expanded')).toBe(true);

      // Manually close details to trigger sync back to attribute
      details!.open = false;
      details!.dispatchEvent(new Event('toggle'));

      expect(fixture.element.hasAttribute('expanded')).toBe(false);
      expect(details?.open).toBe(false);
    });
  });

  describe('Disabled State', () => {
    it('should not be disabled by default', async () => {
      fixture = await createFixture('bit-accordion-item');

      expect(fixture.element.hasAttribute('disabled')).toBe(false);
    });

    it('should apply disabled attribute', async () => {
      fixture = await createFixture('bit-accordion-item', { disabled: true });

      const summary = fixture.query('summary');
      expect(summary?.getAttribute('aria-disabled')).toBe('true');
    });
  });

  describe('Sizes', () => {
    it('should default to medium size', async () => {
      fixture = await createFixture('bit-accordion-item');

      expect(fixture.element.getAttribute('size')).toBeNull();
    });

    it('should apply small size', async () => {
      fixture = await createFixture('bit-accordion-item', { size: 'sm' });

      expect(fixture.element.getAttribute('size')).toBe('sm');
    });

    it('should apply large size', async () => {
      fixture = await createFixture('bit-accordion-item', { size: 'lg' });

      expect(fixture.element.getAttribute('size')).toBe('lg');
    });

    it('should update size dynamically', async () => {
      fixture = await createFixture('bit-accordion-item', { size: 'sm' });

      await fixture.setAttribute('size', 'lg');
      expect(fixture.element.getAttribute('size')).toBe('lg');
    });
  });

  describe('Variants', () => {
    const variants = ['solid', 'flat', 'bordered', 'outline', 'ghost', 'text', 'glass', 'frost'];

    variants.forEach((variant) => {
      it(`should apply ${variant} variant`, async () => {
        fixture = await createFixture('bit-accordion-item', { variant });

        expect(fixture.element.getAttribute('variant')).toBe(variant);
      });
    });

    it('should update variant dynamically', async () => {
      fixture = await createFixture('bit-accordion-item', { variant: 'solid' });

      await fixture.setAttribute('variant', 'ghost');
      expect(fixture.element.getAttribute('variant')).toBe('ghost');
    });
  });

  describe('Events', () => {
    it('should emit expand event when opened', async () => {
      fixture = await createFixture('bit-accordion-item');
      const details = fixture.query<HTMLDetailsElement>('details');

      const expandSpy = vi.fn();
      fixture.element.addEventListener('expand', expandSpy);

      details!.open = true;
      details!.dispatchEvent(new Event('toggle'));

      expect(expandSpy).toHaveBeenCalledOnce();
      expect(expandSpy.mock.calls[0][0].detail).toMatchObject({
        expanded: true,
        item: fixture.element,
      });
    });

    it('should emit collapse event when closed', async () => {
      fixture = await createFixture('bit-accordion-item', { expanded: true });
      const details = fixture.query<HTMLDetailsElement>('details');

      const collapseSpy = vi.fn();
      fixture.element.addEventListener('collapse', collapseSpy);

      details!.open = false;
      details!.dispatchEvent(new Event('toggle'));

      expect(collapseSpy).toHaveBeenCalledOnce();
      expect(collapseSpy.mock.calls[0][0].detail).toMatchObject({
        expanded: false,
        item: fixture.element,
      });
    });

    it('should bubble events', async () => {
      const container = document.createElement('div');
      fixture = await createFixture('bit-accordion-item');
      container.appendChild(fixture.element);

      const expandSpy = vi.fn();
      container.addEventListener('expand', expandSpy);

      const details = fixture.query<HTMLDetailsElement>('details');
      details!.open = true;
      details!.dispatchEvent(new Event('toggle'));

      expect(expandSpy).toHaveBeenCalledOnce();
    });

    it('should not emit events when already in the same state', async () => {
      fixture = await createFixture('bit-accordion-item', { expanded: true });
      const details = fixture.query<HTMLDetailsElement>('details');

      const expandSpy = vi.fn();
      fixture.element.addEventListener('expand', expandSpy);

      details!.open = true;
      details!.dispatchEvent(new Event('toggle'));

      expect(expandSpy).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', async () => {
      fixture = await createFixture('bit-accordion-item');

      const summary = fixture.query('summary');
      const contentWrapper = fixture.query('.content-wrapper');

      expect(summary?.getAttribute('aria-expanded')).toBe('false');
      expect(summary?.getAttribute('aria-disabled')).toBe('false');
      expect(contentWrapper?.getAttribute('role')).toBe('region');
      expect(contentWrapper?.getAttribute('aria-labelledby')).toBeTruthy();
    });

    it('should update aria-expanded when state changes', async () => {
      fixture = await createFixture('bit-accordion-item');
      const summary = fixture.query('summary');

      await fixture.setAttribute('expanded', true);
      expect(summary?.getAttribute('aria-expanded')).toBe('true');
    });

    it('should link content region to title', async () => {
      fixture = await createFixture('bit-accordion-item');

      const title = fixture.query('.title');
      const contentWrapper = fixture.query('.content-wrapper');
      const titleId = title?.getAttribute('id');

      expect(titleId).toBeTruthy();
      expect(contentWrapper?.getAttribute('aria-labelledby')).toBe(titleId);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing title slot', async () => {
      fixture = await createFixture('bit-accordion-item');

      expect(fixture.query('slot[name="title"]')).toBeTruthy();
    });

    it('should handle rapid toggle', async () => {
      fixture = await createFixture('bit-accordion-item');
      const details = fixture.query<HTMLDetailsElement>('details');

      details!.open = true;
      details!.dispatchEvent(new Event('toggle'));
      details!.open = false;
      details!.dispatchEvent(new Event('toggle'));
      details!.open = true;
      details!.dispatchEvent(new Event('toggle'));

      expect(details?.open).toBe(true);
      expect(fixture.element.hasAttribute('expanded')).toBe(true);
    });
  });
});
