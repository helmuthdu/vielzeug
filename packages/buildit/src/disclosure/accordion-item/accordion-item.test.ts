import { type Fixture, mount } from '@vielzeug/craftit/testing';

describe('bit-accordion-item', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./accordion-item');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('renders details element in shadow DOM', async () => {
      fixture = await mount('bit-accordion-item');

      expect(fixture.query('details')).toBeTruthy();
    });

    it('renders summary element', async () => {
      fixture = await mount('bit-accordion-item');

      expect(fixture.query('summary')).toBeTruthy();
    });

    it('renders title slot content', async () => {
      fixture = await mount('bit-accordion-item', { html: '<span slot="title">My Title</span>' });

      expect(fixture.element.querySelector('[slot="title"]')?.textContent).toBe('My Title');
    });

    it('renders default slot content', async () => {
      fixture = await mount('bit-accordion-item', { html: '<p>Content</p>' });

      expect(fixture.element.textContent?.trim()).toBe('Content');
    });
  });

  describe('Expanded State', () => {
    it('is collapsed by default', async () => {
      fixture = await mount('bit-accordion-item');

      const details = fixture.query<HTMLDetailsElement>('details');

      expect(details?.open ?? false).toBe(false);
    });

    it('is open when expanded attribute is present', async () => {
      fixture = await mount('bit-accordion-item', { attrs: { expanded: '' } });

      const details = fixture.query<HTMLDetailsElement>('details');

      expect(details?.open).toBe(true);
    });

    it('summary has aria-expanded false when collapsed', async () => {
      fixture = await mount('bit-accordion-item');

      expect(fixture.query('summary')?.getAttribute('aria-expanded')).toBe('false');
    });

    it('summary has aria-expanded true when expanded', async () => {
      fixture = await mount('bit-accordion-item', { attrs: { expanded: '' } });

      expect(fixture.query('summary')?.getAttribute('aria-expanded')).toBe('true');
    });
  });

  describe('Disabled State', () => {
    it('summary has aria-disabled when disabled', async () => {
      fixture = await mount('bit-accordion-item', { attrs: { disabled: '' } });

      expect(fixture.query('summary')?.getAttribute('aria-disabled')).toBe('true');
    });

    it('summary has aria-disabled false when not disabled', async () => {
      fixture = await mount('bit-accordion-item');

      expect(fixture.query('summary')?.getAttribute('aria-disabled')).toBe('false');
    });
  });

  describe('Events', () => {
    it('fires expand event when opened', async () => {
      fixture = await mount('bit-accordion-item');

      const handler = vi.fn();

      fixture.element.addEventListener('expand', handler);

      const details = fixture.query<HTMLDetailsElement>('details')!;

      details.open = true;
      details.dispatchEvent(new Event('toggle'));

      expect(handler).toHaveBeenCalled();
    });

    it('fires collapse event when closed', async () => {
      fixture = await mount('bit-accordion-item', { attrs: { expanded: '' } });

      const handler = vi.fn();

      fixture.element.addEventListener('collapse', handler);

      const details = fixture.query<HTMLDetailsElement>('details')!;

      details.open = false;
      details.dispatchEvent(new Event('toggle'));

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Props', () => {
    it('applies variant', async () => {
      fixture = await mount('bit-accordion-item', { attrs: { variant: 'bordered' } });

      expect(fixture.element.getAttribute('variant')).toBe('bordered');
    });

    it('applies size', async () => {
      fixture = await mount('bit-accordion-item', { attrs: { size: 'lg' } });

      expect(fixture.element.getAttribute('size')).toBe('lg');
    });
  });
});

describe('bit-accordion-item accessibility', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./accordion-item');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('WAI-ARIA Attributes', () => {
    it('summary has aria-disabled true when disabled', async () => {
      fixture = await mount('bit-accordion-item', { attrs: { disabled: '' } });

      expect(fixture.query('summary')?.getAttribute('aria-disabled')).toBe('true');
    });
  });

  describe('Native Keyboard Support', () => {
    it('details element enables native keyboard toggle', async () => {
      fixture = await mount('bit-accordion-item');

      const details = fixture.query('details');

      expect(details).toBeTruthy();
    });

    it('summary is the interactive control', async () => {
      fixture = await mount('bit-accordion-item');

      const summary = fixture.query('summary');

      expect(summary).toBeTruthy();
    });
  });
});
