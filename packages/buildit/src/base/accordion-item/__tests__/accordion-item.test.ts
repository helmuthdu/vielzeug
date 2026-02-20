import { createFixture } from '@vielzeug/craftit/testing';
import { beforeAll, describe, expect, it } from 'vitest';

describe('bit-accordion-item', () => {
  beforeAll(async () => {
    await import('../accordion-item');
  });

  describe('Rendering', () => {
    it('should render with details and summary', async () => {
      const fixture = await createFixture('bit-accordion-item');
      const details = fixture.query('details');
      const summary = fixture.query('summary');
      expect(details).toBeTruthy();
      expect(summary).toBeTruthy();
      fixture.destroy();
    });

    it('should render slots', async () => {
      const fixture = await createFixture('bit-accordion-item');
      fixture.element.innerHTML = `
        <span slot="title">Accordion Title</span>
        <span slot="subtitle">Accordion Subtitle</span>
        <p>Accordion Content</p>
      `;
      const titleSlot = fixture.query('slot[name="title"]');
      const subtitleSlot = fixture.query('slot[name="subtitle"]');
      const defaultSlot = fixture.query('slot:not([name])');
      expect(titleSlot).toBeTruthy();
      expect(subtitleSlot).toBeTruthy();
      expect(defaultSlot).toBeTruthy();
      fixture.destroy();
    });
  });

  describe('States', () => {
    it('should expand when expanded attribute is set', async () => {
      const fixture = await createFixture('bit-accordion-item', { expanded: true });
      const details = fixture.query<HTMLDetailsElement>('details');
      expect(details?.open).toBe(true);
      fixture.destroy();
    });

    it('should reflect details toggle to expanded attribute', async () => {
      const fixture = await createFixture('bit-accordion-item');
      const details = fixture.query<HTMLDetailsElement>('details');

      details!.open = true;
      details!.dispatchEvent(new Event('toggle'));

      expect(fixture.element.hasAttribute('expanded')).toBe(true);
      fixture.destroy();
    });
  });

  describe('Sizes', () => {
    it('should apply size attribute', async () => {
      const fixture = await createFixture('bit-accordion-item', { size: 'sm' });
      expect(fixture.element.getAttribute('size')).toBe('sm');
      fixture.destroy();
    });

    it('should apply large size', async () => {
      const fixture = await createFixture('bit-accordion-item', { size: 'lg' });
      expect(fixture.element.getAttribute('size')).toBe('lg');
      fixture.destroy();
    });
  });

  describe('Events', () => {
    it('should emit expand/collapse events', async () => {
      const fixture = await createFixture('bit-accordion-item');
      const details = fixture.query<HTMLDetailsElement>('details');
      let expanded = false;
      let collapsed = false;

      fixture.element.addEventListener('expand', () => (expanded = true));
      fixture.element.addEventListener('collapse', () => (collapsed = true));

      details!.open = true;
      details!.dispatchEvent(new Event('toggle'));
      expect(expanded).toBe(true);

      details!.open = false;
      details!.dispatchEvent(new Event('toggle'));
      expect(collapsed).toBe(true);

      fixture.destroy();
    });
  });
});
