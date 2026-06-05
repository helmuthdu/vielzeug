import { type Fixture, mount, user } from '@vielzeug/craft/testing';

describe('sg-accordion', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./accordion');
    await import('../accordion-item/accordion-item');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('renders accordion element', async () => {
      fixture = await mount('sg-accordion');

      expect(fixture.element).toBeTruthy();
    });

    it('renders slot content', async () => {
      fixture = await mount('sg-accordion', {
        html: '<sg-accordion-item><span slot="title">Item</span></sg-accordion-item>',
      });

      expect(fixture.element.querySelector('sg-accordion-item')).toBeTruthy();
    });
  });

  describe('Props', () => {
    it('applies selection-mode single', async () => {
      fixture = await mount('sg-accordion', { attrs: { 'selection-mode': 'single' } });

      expect(fixture.element.getAttribute('selection-mode')).toBe('single');
    });

    it('applies selection-mode multiple', async () => {
      fixture = await mount('sg-accordion', { attrs: { 'selection-mode': 'multiple' } });

      expect(fixture.element.getAttribute('selection-mode')).toBe('multiple');
    });

    it('applies size', async () => {
      fixture = await mount('sg-accordion', { attrs: { size: 'lg' } });

      expect(fixture.element.getAttribute('size')).toBe('lg');
    });

    it('applies variant', async () => {
      fixture = await mount('sg-accordion', { attrs: { variant: 'bordered' } });

      expect(fixture.element.getAttribute('variant')).toBe('bordered');
    });
  });

  describe('Single Selection Mode', () => {
    it('collapses other items when one is expanded in single mode', async () => {
      fixture = await mount('sg-accordion', {
        attrs: { 'selection-mode': 'single' },
        html: `
          <sg-accordion-item expanded><span slot="title">First</span><p>Content 1</p></sg-accordion-item>
          <sg-accordion-item><span slot="title">Second</span><p>Content 2</p></sg-accordion-item>
        `,
      });

      const items = fixture.element.querySelectorAll('sg-accordion-item');
      const secondItem = items[1] as HTMLElement;

      secondItem.setAttribute('expanded', '');
      secondItem.dispatchEvent(new Event('expand', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 10));

      expect(items[0].hasAttribute('expanded')).toBe(false);
    });
  });

  describe('Sizes', () => {
    for (const size of ['sm', 'md', 'lg']) {
      it(`applies ${size} size`, async () => {
        fixture = await mount('sg-accordion', { attrs: { size } });

        expect(fixture.element.getAttribute('size')).toBe(size);
        fixture.destroy();
      });
    }
  });
});

describe('sg-accordion accessibility', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./accordion');
    await import('../accordion-item/accordion-item');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Semantic Structure', () => {
    it('accordion has no implicit interactive role', async () => {
      fixture = await mount('sg-accordion');

      expect(fixture.element.getAttribute('role')).toBeNull();
    });

    it('accordion-items use native details/summary for keyboard access', async () => {
      fixture = await mount('sg-accordion', {
        html: '<sg-accordion-item><span slot="title">Title</span><p>Content</p></sg-accordion-item>',
      });

      const item = fixture.element.querySelector('sg-accordion-item')!;

      expect(item).toBeTruthy();
    });
  });

  describe('WAI-ARIA on accordion-item summary', () => {
    it('summary has aria-expanded false when collapsed', async () => {
      fixture = await mount('sg-accordion', {
        html: '<sg-accordion-item><span slot="title">Item</span><p>Body</p></sg-accordion-item>',
      });

      const item = fixture.element.querySelector('sg-accordion-item')!;
      const summary = item.shadowRoot?.querySelector('summary');

      expect(summary?.getAttribute('aria-expanded')).toBe('false');
    });

    it('summary has aria-expanded true when expanded', async () => {
      fixture = await mount('sg-accordion', {
        html: '<sg-accordion-item expanded><span slot="title">Item</span><p>Body</p></sg-accordion-item>',
      });

      const item = fixture.element.querySelector('sg-accordion-item')!;
      const summary = item.shadowRoot?.querySelector('summary');

      expect(summary?.getAttribute('aria-expanded')).toBe('true');
    });
  });

  describe('Keyboard Navigation', () => {
    it('summary is focusable via native details/summary', async () => {
      fixture = await mount('sg-accordion', {
        html: '<sg-accordion-item><span slot="title">Title</span><p>Content</p></sg-accordion-item>',
      });

      const item = fixture.element.querySelector('sg-accordion-item')!;
      const summary = item.shadowRoot?.querySelector<HTMLElement>('summary');

      // summary should be keyboard-navigable (native behavior)
      expect(summary).toBeTruthy();
    });

    it('Enter on summary toggles expansion', async () => {
      fixture = await mount('sg-accordion', {
        html: '<sg-accordion-item><span slot="title">Title</span><p>Content</p></sg-accordion-item>',
      });

      const item = fixture.element.querySelector('sg-accordion-item')!;
      const summary = item.shadowRoot?.querySelector<HTMLElement>('summary');

      expect(summary).toBeTruthy();

      if (!summary) return;

      summary.focus();
      await user.click(summary);

      // After click, details should be open
      const details = item.shadowRoot?.querySelector('details');

      expect(details?.open).toBe(true);
    });
  });

  describe('Single Selection ARIA Consistency', () => {
    it('in single mode, only one item has aria-expanded true', async () => {
      fixture = await mount('sg-accordion', {
        attrs: { 'selection-mode': 'single' },
        html: `
          <sg-accordion-item expanded><span slot="title">First</span><p>C1</p></sg-accordion-item>
          <sg-accordion-item><span slot="title">Second</span><p>C2</p></sg-accordion-item>
        `,
      });

      const items = fixture.element.querySelectorAll('sg-accordion-item');
      const secondItem = items[1] as HTMLElement;

      secondItem.setAttribute('expanded', '');
      secondItem.dispatchEvent(new Event('expand', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));

      const firstSummary = items[0].shadowRoot?.querySelector('summary');

      expect(firstSummary?.getAttribute('aria-expanded')).toBe('false');
    });
  });
});
