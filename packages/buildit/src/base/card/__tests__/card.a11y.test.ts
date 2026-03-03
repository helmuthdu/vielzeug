import { mount } from '@vielzeug/craftit/test';
import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';

describe('bit-card accessibility', () => {
  beforeAll(async () => {
    await import('../card');
  });

  describe('WCAG 2.1 Compliance', () => {
    it('should have no accessibility violations', async () => {
      const fixture = await mount('bit-card');
      fixture.element.textContent = 'Card content';

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations with header and footer', async () => {
      const fixture = await mount('bit-card');

      const header = document.createElement('div');
      header.slot = 'header';
      header.textContent = 'Card Header';
      fixture.element.appendChild(header);

      const content = document.createElement('p');
      content.textContent = 'Card content text';
      fixture.element.appendChild(content);

      const footer = document.createElement('div');
      footer.slot = 'footer';
      footer.textContent = 'Card Footer';
      fixture.element.appendChild(footer);

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations when hoverable', async () => {
      const fixture = await mount('bit-card', { attrs: { hoverable: true } });
      fixture.element.textContent = 'Hoverable card';

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations when clickable', async () => {
      const fixture = await mount('bit-card', { attrs: { clickable: true } });
      fixture.element.textContent = 'Clickable card';

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations with solid variant', async () => {
      const fixture = await mount('bit-card', { attrs: { variant: 'solid' } });
      fixture.element.textContent = 'Solid card';

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations with outline variant', async () => {
      const fixture = await mount('bit-card', { attrs: { variant: 'outline' } });
      fixture.element.textContent = 'Outline card';

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations with flat variant', async () => {
      const fixture = await mount('bit-card', { attrs: { variant: 'flat' } });
      fixture.element.textContent = 'Flat card';

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations with bordered variant', async () => {
      const fixture = await mount('bit-card', { attrs: { variant: 'bordered' } });
      fixture.element.textContent = 'Bordered card';

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations with ghost variant', async () => {
      const fixture = await mount('bit-card', { attrs: { variant: 'ghost' } });
      fixture.element.textContent = 'Ghost card';

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations with text variant', async () => {
      const fixture = await mount('bit-card', { attrs: { variant: 'text' } });
      fixture.element.textContent = 'Text card';

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations with glass variant', async () => {
      const fixture = await mount('bit-card', { attrs: { variant: 'glass' } });
      fixture.element.textContent = 'Glass card';

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations with frost variant', async () => {
      const fixture = await mount('bit-card', { attrs: { variant: 'frost' } });
      fixture.element.textContent = 'Frost card';

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations with padding variants', async () => {
      const paddings = ['none', 'sm', 'md', 'lg'] as const;

      for (const padding of paddings) {
        const fixture = await mount('bit-card', { attrs: { padding } });
        fixture.element.textContent = `${padding} padding card`;

        const results = await axe.run(fixture.element);
        expect(results.violations).toHaveLength(0);

        fixture.destroy();
      }
    });
  });

  describe('Semantic Structure', () => {
    it('should properly structure content with slots', async () => {
      const fixture = await mount('bit-card');

      const header = document.createElement('h2');
      header.slot = 'header';
      header.textContent = 'Card Title';
      fixture.element.appendChild(header);

      const content = document.createElement('p');
      content.textContent = 'This is the card content';
      fixture.element.appendChild(content);

      const footer = document.createElement('div');
      footer.slot = 'footer';
      footer.textContent = 'Footer actions';
      fixture.element.appendChild(footer);

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should maintain proper heading hierarchy', async () => {
      const fixture = await mount('bit-card');

      const header = document.createElement('h3');
      header.slot = 'header';
      header.textContent = 'Section Card';
      fixture.element.appendChild(header);

      const content = document.createElement('p');
      content.textContent = 'Card content with proper hierarchy';
      fixture.element.appendChild(content);

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });
  });

  describe('Interactive Accessibility', () => {
    it('should be accessible when clickable', async () => {
      const fixture = await mount('bit-card', { attrs: { clickable: true } });

      const header = document.createElement('h2');
      header.slot = 'header';
      header.textContent = 'Clickable Card';
      fixture.element.appendChild(header);

      const content = document.createElement('p');
      content.textContent = 'This card can be clicked';
      fixture.element.appendChild(content);

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });
  });
});
