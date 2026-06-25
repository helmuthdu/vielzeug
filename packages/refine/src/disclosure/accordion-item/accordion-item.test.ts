import { type Fixture, mount } from '@vielzeug/ore/testing';

describe('ore-accordion-item', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./accordion-item');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('renders details element in shadow DOM', async () => {
      fixture = await mount('ore-accordion-item');

      expect(fixture.query('details')).toBeTruthy();
    });

    it('renders summary element', async () => {
      fixture = await mount('ore-accordion-item');

      expect(fixture.query('summary')).toBeTruthy();
    });

    it('renders title slot content', async () => {
      fixture = await mount('ore-accordion-item', { html: '<span slot="title">My Title</span>' });

      expect(fixture.element.querySelector('[slot="title"]')?.textContent).toBe('My Title');
    });

    it('renders default slot content', async () => {
      fixture = await mount('ore-accordion-item', { html: '<p>Content</p>' });

      expect(fixture.element.textContent?.trim()).toBe('Content');
    });
  });

  describe('Expanded State', () => {
    it('is collapsed by default', async () => {
      fixture = await mount('ore-accordion-item');

      const details = fixture.query<HTMLDetailsElement>('details');

      expect(details?.open ?? false).toBe(false);
    });

    it('is open when expanded attribute is present', async () => {
      fixture = await mount('ore-accordion-item', { attrs: { expanded: '' } });

      const details = fixture.query<HTMLDetailsElement>('details');

      expect(details?.open).toBe(true);
    });

    it('summary has aria-expanded false when collapsed', async () => {
      fixture = await mount('ore-accordion-item');

      expect(fixture.query('summary')?.getAttribute('aria-expanded')).toBe('false');
    });

    it('summary has aria-expanded true when expanded', async () => {
      fixture = await mount('ore-accordion-item', { attrs: { expanded: '' } });

      expect(fixture.query('summary')?.getAttribute('aria-expanded')).toBe('true');
    });
  });

  describe('Disabled State', () => {
    it('summary has aria-disabled when disabled', async () => {
      fixture = await mount('ore-accordion-item', { attrs: { disabled: '' } });

      expect(fixture.query('summary')?.getAttribute('aria-disabled')).toBe('true');
    });

    it('summary has aria-disabled false when not disabled', async () => {
      fixture = await mount('ore-accordion-item');

      expect(fixture.query('summary')?.getAttribute('aria-disabled')).toBe('false');
    });
  });

  describe('Touch Interaction', () => {
    const fireTap = (target: Element, startY = 100, endY = 100) => {
      const touch = (y: number) => new Touch({ clientY: y, identifier: 1, target });

      target.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [touch(startY)] }));
      target.dispatchEvent(
        new TouchEvent('touchend', { bubbles: true, cancelable: true, changedTouches: [touch(endY)] }),
      );
    };

    it('opens on touchend tap', async () => {
      fixture = await mount('ore-accordion-item');

      const summary = fixture.query<HTMLElement>('summary')!;
      const details = fixture.query<HTMLDetailsElement>('details')!;

      fireTap(summary);

      expect(details.open).toBe(true);
    });

    it('closes on second touchend tap', async () => {
      fixture = await mount('ore-accordion-item', { attrs: { expanded: '' } });

      const summary = fixture.query<HTMLElement>('summary')!;
      const details = fixture.query<HTMLDetailsElement>('details')!;

      fireTap(summary);

      expect(details.open).toBe(false);
    });

    it('ignores scroll gestures (dy > 10)', async () => {
      fixture = await mount('ore-accordion-item');

      const summary = fixture.query<HTMLElement>('summary')!;
      const details = fixture.query<HTMLDetailsElement>('details')!;

      fireTap(summary, 100, 120);

      expect(details.open).toBe(false);
    });

    it('does not double-toggle when synthesized click follows touchend', async () => {
      fixture = await mount('ore-accordion-item');

      const summary = fixture.query<HTMLElement>('summary')!;
      const details = fixture.query<HTMLDetailsElement>('details')!;

      fireTap(summary);
      summary.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

      expect(details.open).toBe(true);
    });
  });

  describe('Events', () => {
    it('fires expand event when opened', async () => {
      fixture = await mount('ore-accordion-item');

      const handler = vi.fn();

      fixture.element.addEventListener('expand', handler);

      const details = fixture.query<HTMLDetailsElement>('details')!;

      details.open = true;
      details.dispatchEvent(new Event('toggle'));

      expect(handler).toHaveBeenCalled();
    });

    it('fires collapse event when closed', async () => {
      fixture = await mount('ore-accordion-item', { attrs: { expanded: '' } });

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
      fixture = await mount('ore-accordion-item', { attrs: { variant: 'bordered' } });

      expect(fixture.element.getAttribute('variant')).toBe('bordered');
    });

    it('applies size', async () => {
      fixture = await mount('ore-accordion-item', { attrs: { size: 'lg' } });

      expect(fixture.element.getAttribute('size')).toBe('lg');
    });
  });
});

describe('ore-accordion-item accessibility', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./accordion-item');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('WAI-ARIA Attributes', () => {
    it('summary has aria-disabled true when disabled', async () => {
      fixture = await mount('ore-accordion-item', { attrs: { disabled: '' } });

      expect(fixture.query('summary')?.getAttribute('aria-disabled')).toBe('true');
    });
  });

  describe('Native Keyboard Support', () => {
    it('details element enables native keyboard toggle', async () => {
      fixture = await mount('ore-accordion-item');

      const details = fixture.query('details');

      expect(details).toBeTruthy();
    });

    it('summary is the interactive control', async () => {
      fixture = await mount('ore-accordion-item');

      const summary = fixture.query('summary');

      expect(summary).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('passes axe checks', async () => {
      fixture = await mount('ore-accordion-item', {
        html: '<span slot="header">Section title</span><p>Section body</p>',
      });

      const results = await axeCheck(fixture.element, { rules: { 'summary-name': { enabled: false } } });

      expect(results.violations).toHaveLength(0);
    });
  });
});
