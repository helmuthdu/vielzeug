import { fireClick, fireKeyDown } from '@vielzeug/assay';
import { type Fixture, mount } from '@vielzeug/ore/testing';

describe('ore-text', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./text');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  describe('Rendering', () => {
    it('renders text content', async () => {
      fixture = await mount('ore-text', { html: 'Hello world' });

      expect(fixture.element.textContent?.trim()).toBe('Hello world');
    });

    it('renders slot for content', async () => {
      fixture = await mount('ore-text', { html: '<span>Text</span>' });

      expect(fixture.element.querySelector('span')).toBeTruthy();
    });
  });

  describe('as: ARIA semantics', () => {
    it.each(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const)(
      'as="%s" sets role="heading" and aria-level on the host',
      async (tag) => {
        fixture = await mount('ore-text', { attrs: { as: tag } });

        const level = Number(tag[1]);

        expect(fixture.element.getAttribute('role')).toBe('heading');
        expect(fixture.element.getAttribute('aria-level')).toBe(String(level));
        fixture.dispose();
      },
    );

    it('as="p" does not set role="heading"', async () => {
      fixture = await mount('ore-text', { attrs: { as: 'p' } });

      expect(fixture.element.getAttribute('role')).toBeNull();
      expect(fixture.element.getAttribute('aria-level')).toBeNull();
    });

    it('as="span" does not set role="heading"', async () => {
      fixture = await mount('ore-text', { attrs: { as: 'span' } });

      expect(fixture.element.getAttribute('role')).toBeNull();
    });

    it('without as, no role is set', async () => {
      fixture = await mount('ore-text', {});

      expect(fixture.element.getAttribute('role')).toBeNull();
    });

    it('switching from h2 to p removes role and aria-level', async () => {
      fixture = await mount('ore-text', { attrs: { as: 'h2' } });
      expect(fixture.element.getAttribute('role')).toBe('heading');

      await fixture.attr('as', 'p');
      expect(fixture.element.getAttribute('role')).toBeNull();
      expect(fixture.element.getAttribute('aria-level')).toBeNull();
    });
  });

  describe('lines: multi-line clamp', () => {
    it('sets --_lines CSS variable on the host when lines is provided', async () => {
      fixture = await mount('ore-text', { attrs: { lines: '3' } });

      expect(fixture.element.style.getPropertyValue('--_lines')).toBe('3');
    });

    it('does not set --_lines when lines is absent', async () => {
      fixture = await mount('ore-text', {});

      expect(fixture.element.style.getPropertyValue('--_lines')).toBe('');
    });
  });

  describe('truncate', () => {
    it('applies the truncate attribute to the host', async () => {
      fixture = await mount('ore-text', { attrs: { truncate: '' } });

      expect(fixture.element.hasAttribute('truncate')).toBe(true);
    });

    it('truncate does not remove content', async () => {
      fixture = await mount('ore-text', { attrs: { truncate: '' }, html: 'Long text' });

      expect(fixture.element.textContent?.trim()).toBe('Long text');
    });
  });

  describe('expandable', () => {
    it('wires button semantics only when expandable', async () => {
      fixture = await mount('ore-text', { attrs: { lines: '2' } });

      expect(fixture.element.hasAttribute('role')).toBe(false);
      expect(fixture.element.hasAttribute('tabindex')).toBe(false);
      expect(fixture.element.hasAttribute('aria-expanded')).toBe(false);

      fixture.dispose();
      fixture = await mount('ore-text', { attrs: { expandable: '', lines: '2' } });

      expect(fixture.element.getAttribute('role')).toBe('button');
      expect(fixture.element.getAttribute('tabindex')).toBe('0');
      expect(fixture.element.getAttribute('aria-expanded')).toBe('false');
    });

    it('drops aria-level when expandable overrides a heading role with button', async () => {
      fixture = await mount('ore-text', { attrs: { as: 'h3', expandable: '', lines: '2' } });

      expect(fixture.element.getAttribute('role')).toBe('button');
      // aria-level is only valid alongside role="heading"; the button override
      // must not leave an orphan aria-level behind.
      expect(fixture.element.hasAttribute('aria-level')).toBe(false);
    });

    it('toggles expansion on click and emits expand-change', async () => {
      fixture = await mount('ore-text', { attrs: { expandable: '', lines: '2' }, html: 'Long paragraph' });

      const onExpandChange = vi.fn();

      fixture.element.addEventListener('expand-change', onExpandChange);
      fireClick(fixture.element);
      await fixture.flush();

      expect(fixture.element.hasAttribute('data-expanded')).toBe(true);
      expect(fixture.element.getAttribute('aria-expanded')).toBe('true');
      expect((onExpandChange.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({ expanded: true });

      fireClick(fixture.element);
      await fixture.flush();

      expect(fixture.element.hasAttribute('data-expanded')).toBe(false);
      expect(fixture.element.getAttribute('aria-expanded')).toBe('false');
    });

    it('toggles expansion with Enter and Space', async () => {
      fixture = await mount('ore-text', { attrs: { expandable: '', lines: '2' } });

      fireKeyDown(fixture.element, { key: 'Enter' });
      await fixture.flush();

      expect(fixture.element.getAttribute('aria-expanded')).toBe('true');

      fireKeyDown(fixture.element, { key: ' ' });
      await fixture.flush();

      expect(fixture.element.getAttribute('aria-expanded')).toBe('false');
    });

    it('starts expanded with default-expanded', async () => {
      fixture = await mount('ore-text', { attrs: { 'default-expanded': '', expandable: '', lines: '2' } });

      expect(fixture.element.getAttribute('aria-expanded')).toBe('true');
      expect(fixture.element.hasAttribute('data-expanded')).toBe(true);
    });

    it('stays controlled when expanded is set: reflects the prop, emits, does not self-toggle', async () => {
      fixture = await mount('ore-text', { attrs: { expandable: '', expanded: 'false', lines: '2' } });

      const onExpandChange = vi.fn();

      fixture.element.addEventListener('expand-change', onExpandChange);
      fireClick(fixture.element);
      await fixture.flush();

      // The component asked to expand but the owner did not move the prop: state unchanged.
      expect((onExpandChange.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({ expanded: true });
      expect(fixture.element.getAttribute('aria-expanded')).toBe('false');
      expect(fixture.element.hasAttribute('data-expanded')).toBe(false);

      // The owner applying the change drives the state instead.
      fixture.element.setAttribute('expanded', '');
      await fixture.flush();

      expect(fixture.element.getAttribute('aria-expanded')).toBe('true');
      expect(fixture.element.hasAttribute('data-expanded')).toBe(true);
    });

    it('warns (dev) when expandable has nothing to clamp', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      fixture = await mount('ore-text', { attrs: { expandable: '' } });

      expect(warnSpy.mock.calls.some((args) => String(args[0]).includes('nothing to expand'))).toBe(true);
      vi.mocked(console.warn).mockRestore();
    });
  });

  describe('Variants', () => {
    for (const variant of ['body', 'heading', 'label', 'caption', 'overline', 'code'] as const) {
      it(`reflects ${variant} variant as host attribute`, async () => {
        fixture = await mount('ore-text', { attrs: { variant } });

        expect(fixture.element.getAttribute('variant')).toBe(variant);
        fixture.dispose();
      });
    }
  });

  describe('Weights', () => {
    for (const weight of ['normal', 'medium', 'semibold', 'bold'] as const) {
      it(`reflects ${weight} weight as host attribute`, async () => {
        fixture = await mount('ore-text', { attrs: { weight } });

        expect(fixture.element.getAttribute('weight')).toBe(weight);
        fixture.dispose();
      });
    }
  });

  describe('Sizes', () => {
    for (const size of ['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const) {
      it(`reflects ${size} size as host attribute`, async () => {
        fixture = await mount('ore-text', { attrs: { size } });

        expect(fixture.element.getAttribute('size')).toBe(size);
        fixture.dispose();
      });
    }
  });

  describe('Colors', () => {
    for (const color of [
      'primary',
      'secondary',
      'info',
      'success',
      'warning',
      'error',
      'heading',
      'body',
      'muted',
      'tertiary',
      'disabled',
      'contrast',
    ] as const) {
      it(`reflects ${color} color as host attribute`, async () => {
        fixture = await mount('ore-text', { attrs: { color } });

        expect(fixture.element.getAttribute('color')).toBe(color);
        fixture.dispose();
      });
    }
  });
});

describe('ore-text accessibility', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./text');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  describe('Content Accessibility', () => {
    it('exposes text content to accessibility tree', async () => {
      fixture = await mount('ore-text', { html: 'Screen reader text' });

      expect(fixture.element.textContent?.trim()).toBe('Screen reader text');
    });

    it('color attribute does not hide content', async () => {
      fixture = await mount('ore-text', { attrs: { color: 'muted' }, html: 'Visible' });

      expect(fixture.element.textContent?.trim()).toBe('Visible');
    });

    it('color="tertiary" does not hide content', async () => {
      fixture = await mount('ore-text', { attrs: { color: 'tertiary' }, html: 'Tertiary text' });

      expect(fixture.element.textContent?.trim()).toBe('Tertiary text');
    });

    it('italic does not hide content', async () => {
      fixture = await mount('ore-text', { attrs: { italic: '' }, html: 'Slanted' });

      expect(fixture.element.textContent?.trim()).toBe('Slanted');
    });
  });

  describe('Heading + size compound', () => {
    it('heading variant with size lg carries both attributes', async () => {
      fixture = await mount('ore-text', { attrs: { size: 'lg', variant: 'heading' } });

      expect(fixture.element.getAttribute('variant')).toBe('heading');
      expect(fixture.element.getAttribute('size')).toBe('lg');
    });

    it('heading variant with size 2xl carries both attributes', async () => {
      fixture = await mount('ore-text', { attrs: { size: '2xl', variant: 'heading' } });

      expect(fixture.element.getAttribute('variant')).toBe('heading');
      expect(fixture.element.getAttribute('size')).toBe('2xl');
    });
  });

  describe('Accessibility', () => {
    it('passes axe checks', async () => {
      fixture = await mount('ore-text', { html: 'Hello world' });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });
});
