import { createFixture } from '@vielzeug/craftit/testing';
import axe from 'axe-core';

/**
 * Accessibility tests for bit-grid-item component using axe-core
 * Tests WCAG 2.1 Level AA compliance
 */
describe('bit-grid-item accessibility', () => {
  beforeAll(async () => {
    await import('../grid-item');
    await import('../../grid/grid');
  });

  describe('WCAG 2.1 Compliance', () => {
    it('should have no accessibility violations for default grid item', async () => {
      const fixture = await createFixture('bit-grid-item');
      fixture.element.innerHTML = 'Grid item content';

      await new Promise((resolve) => setTimeout(resolve, 10));

      const results = await axe.run(fixture.element);

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });

    it('should have no violations with column span', async () => {
      const gridFixture = await createFixture('bit-grid', { cols: '4' });
      gridFixture.element.innerHTML = `
        <bit-grid-item colSpan="2">Spans 2 columns</bit-grid-item>
        <bit-grid-item>Single column</bit-grid-item>
        <bit-grid-item>Single column</bit-grid-item>
      `;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const results = await axe.run(gridFixture.element);

      expect(results.violations).toHaveLength(0);
      gridFixture.destroy();
    });

    it('should have no violations with row span', async () => {
      const gridFixture = await createFixture('bit-grid', { cols: '3' });
      gridFixture.element.innerHTML = `
        <bit-grid-item rowSpan="2">Spans 2 rows</bit-grid-item>
        <bit-grid-item>Item 1</bit-grid-item>
        <bit-grid-item>Item 2</bit-grid-item>
        <bit-grid-item>Item 3</bit-grid-item>
      `;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const results = await axe.run(gridFixture.element);

      expect(results.violations).toHaveLength(0);
      gridFixture.destroy();
    });

    it('should have no violations with alignment', async () => {
      const gridFixture = await createFixture('bit-grid', { cols: '2' });
      gridFixture.element.innerHTML = `
        <bit-grid-item align="center" justify="center">Centered</bit-grid-item>
        <bit-grid-item align="start">Top aligned</bit-grid-item>
      `;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const results = await axe.run(gridFixture.element);

      expect(results.violations).toHaveLength(0);
      gridFixture.destroy();
    });

    it('should have no violations with custom placement', async () => {
      const gridFixture = await createFixture('bit-grid', { cols: '4' });
      gridFixture.element.innerHTML = `
        <bit-grid-item colStart="1" colEnd="3">Columns 1-2</bit-grid-item>
        <bit-grid-item colStart="3" colEnd="5">Columns 3-4</bit-grid-item>
      `;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const results = await axe.run(gridFixture.element);

      expect(results.violations).toHaveLength(0);
      gridFixture.destroy();
    });

    it('should have no violations with interactive content', async () => {
      const gridFixture = await createFixture('bit-grid', { cols: '2' });
      gridFixture.element.innerHTML = `
        <bit-grid-item colSpan="2">
          <button>Action Button</button>
        </bit-grid-item>
        <bit-grid-item>
          <a href="#">Link 1</a>
        </bit-grid-item>
        <bit-grid-item>
          <a href="#">Link 2</a>
        </bit-grid-item>
      `;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const results = await axe.run(gridFixture.element);

      expect(results.violations).toHaveLength(0);
      gridFixture.destroy();
    });
  });

  describe('Semantic Structure', () => {
    it('should maintain proper document structure', async () => {
      const gridFixture = await createFixture('bit-grid', { cols: '2' });
      gridFixture.element.innerHTML = `
        <bit-grid-item>
          <article>
            <h2>Article Title</h2>
            <p>Article content</p>
          </article>
        </bit-grid-item>
        <bit-grid-item>
          <article>
            <h2>Another Article</h2>
            <p>More content</p>
          </article>
        </bit-grid-item>
      `;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const results = await axe.run(gridFixture.element);

      expect(results.violations).toHaveLength(0);
      gridFixture.destroy();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should preserve tab order for nested focusable elements', async () => {
      const gridFixture = await createFixture('bit-grid', { cols: '3' });
      gridFixture.element.innerHTML = `
        <bit-grid-item colSpan="2">
          <button>Button 1</button>
          <button>Button 2</button>
        </bit-grid-item>
        <bit-grid-item>
          <button>Button 3</button>
        </bit-grid-item>
        <bit-grid-item>
          <a href="#">Link</a>
        </bit-grid-item>
      `;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const results = await axe.run(gridFixture.element);

      expect(results.violations).toHaveLength(0);
      gridFixture.destroy();
    });
  });

  describe('Screen Reader Support', () => {
    it('should have proper text alternatives for media', async () => {
      const gridFixture = await createFixture('bit-grid', { cols: '2' });
      gridFixture.element.innerHTML = `
        <bit-grid-item>
          <img src="placeholder1.jpg" alt="Description 1" />
        </bit-grid-item>
        <bit-grid-item>
          <img src="placeholder2.jpg" alt="Description 2" />
        </bit-grid-item>
      `;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const results = await axe.run(gridFixture.element);

      expect(results.violations).toHaveLength(0);
      gridFixture.destroy();
    });
  });
});

