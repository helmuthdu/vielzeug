import { type Fixture, mount } from '@vielzeug/craftit/test';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

describe('bit-tooltip', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('../tooltip');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('should render with required shadow DOM elements', async () => {
      fixture = await mount('bit-tooltip', { attrs: { content: 'Tip' } });
      fixture.element.innerHTML = '<button>Trigger</button>';

      expect(fixture.query('.tooltip')).toBeTruthy();
      expect(fixture.query('.arrow')).toBeTruthy();
      expect(fixture.query('slot:not([name])')).toBeTruthy();
    });

    it('should render content and trigger slots', async () => {
      fixture = await mount('bit-tooltip');
      fixture.element.innerHTML = '<button>Trigger</button><span slot="content">Rich tip</span>';

      const defaultSlot = fixture.query('slot:not([name])');
      const contentSlot = fixture.query('slot[name="content"]');

      expect(defaultSlot).toBeTruthy();
      expect(contentSlot).toBeTruthy();
    });

    it('should be hidden by default (not visible without interaction)', async () => {
      fixture = await mount('bit-tooltip', { attrs: { content: 'Hello' } });
      fixture.element.innerHTML = '<button>Hover me</button>';

      const tooltipEl = fixture.query('.tooltip');
      // Tooltip should not have data-visible attribute by default
      expect(tooltipEl?.hasAttribute('data-visible')).toBe(false);
    });
  });

  describe('Content Attribute', () => {
    it('should set content attribute', async () => {
      fixture = await mount('bit-tooltip', { attrs: { content: 'Copy to clipboard' } });
      expect(fixture.element.getAttribute('content')).toBe('Copy to clipboard');
    });

    it('should update content dynamically', async () => {
      fixture = await mount('bit-tooltip', { attrs: { content: 'Old tip' } });
      await fixture.attr('content', 'New tip');

      expect(fixture.element.getAttribute('content')).toBe('New tip');
    });
  });

  describe('Placement Attribute', () => {
    const placements = ['top', 'bottom', 'left', 'right'] as const;

    placements.forEach((placement) => {
      it(`should apply placement="${placement}"`, async () => {
        fixture = await mount('bit-tooltip', { attrs: { content: 'Tip', placement } });
        expect(fixture.element.getAttribute('placement')).toBe(placement);
      });
    });

    it('should default to top placement', async () => {
      fixture = await mount('bit-tooltip', { attrs: { content: 'Tip' } });
      // Default is top — may not be set as attribute explicitly
      const placement = fixture.element.getAttribute('placement');
      expect(placement === null || placement === 'top').toBe(true);
    });

    it('should update placement dynamically', async () => {
      fixture = await mount('bit-tooltip', { attrs: { content: 'Tip', placement: 'top' } });
      await fixture.attr('placement', 'bottom');

      expect(fixture.element.getAttribute('placement')).toBe('bottom');
    });
  });

  describe('Trigger Attribute', () => {
    it('should set trigger attribute', async () => {
      fixture = await mount('bit-tooltip', { attrs: { content: 'Tip', trigger: 'click' } });
      expect(fixture.element.getAttribute('trigger')).toBe('click');
    });

    it('should support comma-separated multiple triggers', async () => {
      fixture = await mount('bit-tooltip', { attrs: { content: 'Tip', trigger: 'hover,focus' } });
      expect(fixture.element.getAttribute('trigger')).toBe('hover,focus');
    });

    it('should update trigger dynamically', async () => {
      fixture = await mount('bit-tooltip', { attrs: { content: 'Tip', trigger: 'hover' } });
      await fixture.attr('trigger', 'click');

      expect(fixture.element.getAttribute('trigger')).toBe('click');
    });
  });

  describe('Delay Attribute', () => {
    it('should set delay attribute', async () => {
      fixture = await mount('bit-tooltip', { attrs: { content: 'Tip', delay: 500 } });
      expect(fixture.element.getAttribute('delay')).toBe('500');
    });

    it('should update delay dynamically', async () => {
      fixture = await mount('bit-tooltip', { attrs: { content: 'Tip', delay: 200 } });
      await fixture.attr('delay', 800);

      expect(fixture.element.getAttribute('delay')).toBe('800');
    });
  });

  describe('Variants', () => {
    it('should apply dark variant', async () => {
      fixture = await mount('bit-tooltip', { attrs: { content: 'Tip', variant: 'dark' } });
      expect(fixture.element.getAttribute('variant')).toBe('dark');
    });

    it('should apply light variant', async () => {
      fixture = await mount('bit-tooltip', { attrs: { content: 'Tip', variant: 'light' } });
      expect(fixture.element.getAttribute('variant')).toBe('light');
    });

    it('should update variant dynamically', async () => {
      fixture = await mount('bit-tooltip', { attrs: { content: 'Tip', variant: 'dark' } });
      await fixture.attr('variant', 'light');

      expect(fixture.element.getAttribute('variant')).toBe('light');
    });
  });

  describe('Sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;

    sizes.forEach((size) => {
      it(`should apply ${size} size`, async () => {
        fixture = await mount('bit-tooltip', { attrs: { content: 'Tip', size } });
        expect(fixture.element.getAttribute('size')).toBe(size);
      });
    });
  });

  describe('Disabled State', () => {
    it('should apply disabled attribute', async () => {
      fixture = await mount('bit-tooltip', { attrs: { content: 'Tip', disabled: true } });
      expect(fixture.element.hasAttribute('disabled')).toBe(true);
    });

    it('should toggle disabled dynamically', async () => {
      fixture = await mount('bit-tooltip', { attrs: { content: 'Tip' } });
      await fixture.attr('disabled', true);
      expect(fixture.element.hasAttribute('disabled')).toBe(true);

      await fixture.attr('disabled', false);
      expect(fixture.element.hasAttribute('disabled')).toBe(false);
    });
  });
});
