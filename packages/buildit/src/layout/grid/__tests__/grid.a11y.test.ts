import axe from 'axe-core';
import { createFixture } from '../../../utils/trial';

/**
 * Accessibility tests for bit-grid component using axe-core
 * Tests WCAG 2.1 Level AA compliance
 */
describe('bit-grid accessibility', () => {
  beforeAll(async () => {
    await import('../grid');
  });

  describe('WCAG 2.1 Compliance', () => {
    it('should have no accessibility violations for default grid', async () => {
      const fixture = await createFixture('bit-grid');
      fixture.element.innerHTML = `
        <div>Item 1</div>
        <div>Item 2</div>
        <div>Item 3</div>
      `;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const results = await axe.run(fixture.element);

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });

    it('should have no violations for multi-column grid', async () => {
      const fixture = await createFixture('bit-grid', { cols: '3', gap: 'md' });
      fixture.element.innerHTML = `
        <div>Item 1</div>
        <div>Item 2</div>
        <div>Item 3</div>
        <div>Item 4</div>
        <div>Item 5</div>
        <div>Item 6</div>
      `;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const results = await axe.run(fixture.element);

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });

    it('should have no violations for responsive grid', async () => {
      const fixture = await createFixture('bit-grid', { gap: 'lg', responsive: true });
      fixture.element.innerHTML = `
        <div>Item 1</div>
        <div>Item 2</div>
        <div>Item 3</div>
      `;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const results = await axe.run(fixture.element);

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });

    it('should have no violations with interactive content', async () => {
      const fixture = await createFixture('bit-grid', { cols: '2', gap: 'md' });
      fixture.element.innerHTML = `
        <button>Button 1</button>
        <button>Button 2</button>
        <a href="#">Link 1</a>
        <a href="#">Link 2</a>
      `;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const results = await axe.run(fixture.element);

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });

    it('should have no violations with various alignment options', async () => {
      const fixture = await createFixture('bit-grid', {
        align: 'center',
        cols: '3',
        gap: 'md',
        justify: 'between',
      });
      fixture.element.innerHTML = `
        <div>Item 1</div>
        <div>Item 2</div>
        <div>Item 3</div>
      `;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const results = await axe.run(fixture.element);

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });

    it('should have no violations with dense packing', async () => {
      const fixture = await createFixture('bit-grid', { cols: '3', dense: true, gap: 'sm' });
      fixture.element.innerHTML = `
        <div>Item 1</div>
        <div>Item 2</div>
        <div>Item 3</div>
        <div>Item 4</div>
      `;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const results = await axe.run(fixture.element);

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });
  });

  describe('Semantic Structure', () => {
    it('should maintain proper document structure', async () => {
      const fixture = await createFixture('bit-grid');
      fixture.element.innerHTML = `
        <article>
          <h2>Title 1</h2>
          <p>Content 1</p>
        </article>
        <article>
          <h2>Title 2</h2>
          <p>Content 2</p>
        </article>
      `;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const results = await axe.run(fixture.element);

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });

    it('should work with landmark regions', async () => {
      const fixture = await createFixture('bit-grid', { cols: '2' });
      fixture.element.innerHTML = `
        <nav aria-label="Primary navigation">
          <a href="#">Nav Link</a>
        </nav>
        <main>
          <h1>Main Content</h1>
        </main>
      `;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const results = await axe.run(fixture.element);

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should preserve tab order for focusable elements', async () => {
      const fixture = await createFixture('bit-grid', { cols: '3' });
      fixture.element.innerHTML = `
        <button>Button 1</button>
        <button>Button 2</button>
        <button>Button 3</button>
        <a href="#">Link 1</a>
        <a href="#">Link 2</a>
        <input type="text" placeholder="Input" />
      `;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const focusableElements = fixture.element.querySelectorAll('button, a, input');
      expect(focusableElements.length).toBe(6);

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });
  });

  describe('Screen Reader Support', () => {
    it('should have proper text alternatives for content', async () => {
      const fixture = await createFixture('bit-grid', { cols: '2' });
      fixture.element.innerHTML = `
        <img src="placeholder.jpg" alt="Description 1" />
        <img src="placeholder.jpg" alt="Description 2" />
      `;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const results = await axe.run(fixture.element);

      expect(results.violations).toHaveLength(0);
      fixture.destroy();
    });
  });
});
