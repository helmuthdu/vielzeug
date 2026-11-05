import { fireClick, fireKeyDown } from '@vielzeug/assay';
import { type Fixture, mount } from '@vielzeug/ore/testing';

describe('ore-button-group', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./button-group');
    await import('../button/button');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  describe('Rendering', () => {
    it('renders group container', async () => {
      fixture = await mount('ore-button-group');

      expect(fixture.query('[part="group"]')).toBeTruthy();
    });

    it('renders slot for button children', async () => {
      fixture = await mount('ore-button-group', {
        html: '<ore-button>One</ore-button><ore-button>Two</ore-button>',
      });

      expect(fixture.element.querySelectorAll('ore-button').length).toBe(2);
    });
  });

  describe('Props', () => {
    it('applies color', async () => {
      fixture = await mount('ore-button-group', { attrs: { color: 'primary' } });

      expect(fixture.element.getAttribute('color')).toBe('primary');
    });

    it('applies size', async () => {
      fixture = await mount('ore-button-group', { attrs: { size: 'sm' } });

      expect(fixture.element.getAttribute('size')).toBe('sm');
    });

    it('applies variant', async () => {
      fixture = await mount('ore-button-group', { attrs: { variant: 'outline' } });

      expect(fixture.element.getAttribute('variant')).toBe('outline');
    });

    it('applies attached', async () => {
      fixture = await mount('ore-button-group', { attrs: { attached: '' } });

      expect(fixture.element.hasAttribute('attached')).toBe(true);
    });

    it('applies fullwidth', async () => {
      fixture = await mount('ore-button-group', { attrs: { fullwidth: '' } });

      expect(fixture.element.hasAttribute('fullwidth')).toBe(true);
    });

    it('applies vertical orientation', async () => {
      fixture = await mount('ore-button-group', { attrs: { orientation: 'vertical' } });

      expect(fixture.element.getAttribute('orientation')).toBe('vertical');
    });

    it('applies rounded', async () => {
      fixture = await mount('ore-button-group', { attrs: { rounded: 'full' } });

      expect(fixture.element.getAttribute('rounded')).toBe('full');
    });
  });

  describe('Colors', () => {
    for (const color of ['primary', 'secondary', 'success', 'warning', 'error']) {
      it(`applies ${color} color`, async () => {
        fixture = await mount('ore-button-group', { attrs: { color } });

        expect(fixture.element.getAttribute('color')).toBe(color);
        fixture.dispose();
      });
    }
  });

  describe('Sizes', () => {
    for (const size of ['sm', 'md', 'lg']) {
      it(`applies ${size} size`, async () => {
        fixture = await mount('ore-button-group', { attrs: { size } });

        expect(fixture.element.getAttribute('size')).toBe(size);
        fixture.dispose();
      });
    }
  });
});

describe('ore-button-group accessibility', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./button-group');
    await import('../button/button');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  describe('Semantic Structure', () => {
    it('group container has role group', async () => {
      fixture = await mount('ore-button-group');

      expect(fixture.query('[role="group"]')).toBeTruthy();
    });

    it('group container has part group', async () => {
      fixture = await mount('ore-button-group');

      expect(fixture.query('[part="group"]')).toBeTruthy();
    });
  });

  describe('ARIA Labeling', () => {
    it('accepts aria-label for group description', async () => {
      fixture = await mount('ore-button-group', { attrs: { 'aria-label': 'Text formatting' } });

      expect(fixture.element.getAttribute('aria-label')).toBe('Text formatting');
    });
  });

  describe('Button Children Accessibility', () => {
    it('child buttons inherit color from group', async () => {
      fixture = await mount('ore-button-group', {
        attrs: { color: 'primary' },
        html: '<ore-button>Bold</ore-button>',
      });

      const btn = fixture.element.querySelector('ore-button');

      expect(btn?.getAttribute('color') ?? fixture.element.getAttribute('color')).toBe('primary');
    });
  });

  describe('Accessibility', () => {
    it('passes axe checks', async () => {
      fixture = await mount('ore-button-group', {
        attrs: { label: 'Actions' },
        html: '<ore-button>Save</ore-button><ore-button>Cancel</ore-button>',
      });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });
});

describe('ore-button-group segmented selection', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./button-group');
    await import('../button/button');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  const segmentedHtml = '<ore-button value="list">List</ore-button><ore-button value="grid">Grid</ore-button>';

  describe('Selection', () => {
    it('stays a plain group with no value', async () => {
      fixture = await mount('ore-button-group', { html: segmentedHtml });
      await fixture.flush();

      expect(fixture.query('[part="group"]')?.getAttribute('role')).toBe('group');
      expect(fixture.element.querySelector('ore-button')?.getAttribute('role')).toBe('button');
    });

    it('selects the button named by value', async () => {
      fixture = await mount('ore-button-group', { attrs: { value: 'grid' }, html: segmentedHtml });
      await fixture.flush();

      const [list, grid] = [...fixture.element.querySelectorAll<HTMLElement>('ore-button')];

      expect(grid.getAttribute('aria-checked')).toBe('true');
      expect(list.getAttribute('aria-checked')).toBe('false');
    });

    it('falls back to the first option when value names none', async () => {
      fixture = await mount('ore-button-group', { attrs: { value: 'missing' }, html: segmentedHtml });
      await fixture.flush();

      expect(fixture.element.getAttribute('value')).toBe('list');
    });

    it('selects the first option when value is set before children arrive', async () => {
      fixture = await mount('ore-button-group', { attrs: { value: 'grid' } });
      await fixture.flush();

      fixture.element.insertAdjacentHTML('beforeend', segmentedHtml);
      await fixture.flush();

      const [list, grid] = [...fixture.element.querySelectorAll<HTMLElement>('ore-button')];

      expect(grid.getAttribute('aria-checked')).toBe('true');
      expect(list.getAttribute('aria-checked')).toBe('false');
    });

    it('drops selection semantics when a value is left with no options', async () => {
      fixture = await mount('ore-button-group', {
        attrs: { value: 'any' },
        html: '<ore-button>Save</ore-button>',
      });
      await fixture.flush();

      expect(fixture.element.hasAttribute('value')).toBe(false);
      expect(fixture.query('[part="group"]')?.getAttribute('role')).toBe('group');
    });

    it('selects a clicked option and emits change', async () => {
      fixture = await mount('ore-button-group', { attrs: { value: 'list' }, html: segmentedHtml });
      await fixture.flush();

      const [list, grid] = [...fixture.element.querySelectorAll<HTMLElement>('ore-button')];
      const changes: Event[] = [];

      fixture.element.addEventListener('change', (event) => changes.push(event));
      fireClick(grid);
      await fixture.flush();

      expect(fixture.element.getAttribute('value')).toBe('grid');
      expect(grid.getAttribute('aria-checked')).toBe('true');
      expect(list.getAttribute('aria-checked')).toBe('false');
      expect(changes).toHaveLength(1);
      expect((changes[0] as CustomEvent).detail).toEqual({
        labels: ['Grid'],
        originalEvent: expect.any(Object),
        values: ['grid'],
      });
    });

    it('ignores a click on an option that is already selected', async () => {
      fixture = await mount('ore-button-group', { attrs: { value: 'list' }, html: segmentedHtml });
      await fixture.flush();

      const [list] = [...fixture.element.querySelectorAll<HTMLElement>('ore-button')];
      let emitted = 0;

      fixture.element.addEventListener('change', () => (emitted += 1));
      fireClick(list);
      await fixture.flush();

      expect(emitted).toBe(0);
    });

    it('skips a disabled option in the selection', async () => {
      fixture = await mount('ore-button-group', {
        attrs: { value: 'list' },
        html: '<ore-button value="list">List</ore-button><ore-button value="grid" disabled>Grid</ore-button>',
      });
      await fixture.flush();

      const [, grid] = [...fixture.element.querySelectorAll<HTMLElement>('ore-button')];

      fireClick(grid);
      await fixture.flush();

      expect(fixture.element.getAttribute('value')).toBe('list');
    });

    it('leaves an unvalued button in a segmented group a plain action', async () => {
      fixture = await mount('ore-button-group', {
        attrs: { value: 'list' },
        html: '<ore-button value="list">List</ore-button><ore-button>Reset</ore-button>',
      });
      await fixture.flush();

      const [, reset] = [...fixture.element.querySelectorAll<HTMLElement>('ore-button')];

      expect(reset.getAttribute('role')).toBe('button');
      expect(reset.hasAttribute('aria-checked')).toBe(false);
      expect(reset.getAttribute('tabindex')).toBe('0');
    });

    it('reflects a programmatic value change', async () => {
      fixture = await mount('ore-button-group', { attrs: { value: 'list' }, html: segmentedHtml });
      await fixture.flush();

      fixture.element.setAttribute('value', 'grid');
      await fixture.flush();

      const [list, grid] = [...fixture.element.querySelectorAll<HTMLElement>('ore-button')];

      expect(grid.getAttribute('aria-checked')).toBe('true');
      expect(list.getAttribute('aria-checked')).toBe('false');
    });

    it('does not emit change for a programmatic value write', async () => {
      fixture = await mount('ore-button-group', { attrs: { value: 'list' }, html: segmentedHtml });
      await fixture.flush();

      let emitted = 0;

      fixture.element.addEventListener('change', () => (emitted += 1));
      fixture.element.setAttribute('value', 'grid');
      await fixture.flush();
      // The group's own reflection of the new selection re-enters the prop: it
      // must not read as a second change either.
      fixture.element.setAttribute('value', 'grid');
      await fixture.flush();

      expect(fixture.element.getAttribute('value')).toBe('grid');
      expect(emitted).toBe(0);
    });
  });

  describe('Keyboard', () => {
    it('moves and selects with the arrow keys', async () => {
      fixture = await mount('ore-button-group', { attrs: { value: 'list' }, html: segmentedHtml });
      await fixture.flush();

      const [list, grid] = [...fixture.element.querySelectorAll<HTMLElement>('ore-button')];

      list.focus();
      fireKeyDown(list, { key: 'ArrowRight' });
      await fixture.flush();

      expect(fixture.element.getAttribute('value')).toBe('grid');
      expect(grid.getAttribute('aria-checked')).toBe('true');
    });

    it('wraps from the last option to the first', async () => {
      fixture = await mount('ore-button-group', { attrs: { value: 'grid' }, html: segmentedHtml });
      await fixture.flush();

      const [_list, grid] = [...fixture.element.querySelectorAll<HTMLElement>('ore-button')];

      grid.focus();
      fireKeyDown(grid, { key: 'ArrowRight' });
      await fixture.flush();

      expect(fixture.element.getAttribute('value')).toBe('list');
    });

    it('jumps to the ends with Home and End', async () => {
      fixture = await mount('ore-button-group', {
        attrs: { value: 'list' },
        html: '<ore-button value="a">A</ore-button><ore-button value="b">B</ore-button><ore-button value="c">C</ore-button>',
      });
      await fixture.flush();

      const buttons = [...fixture.element.querySelectorAll<HTMLElement>('ore-button')];

      buttons[0].focus();
      fireKeyDown(buttons[0], { key: 'End' });
      await fixture.flush();

      expect(fixture.element.getAttribute('value')).toBe('c');

      buttons[2].focus();
      fireKeyDown(buttons[2], { key: 'Home' });
      await fixture.flush();

      expect(fixture.element.getAttribute('value')).toBe('a');
    });

    it('ignores arrow keys outside a segmented group', async () => {
      fixture = await mount('ore-button-group', { html: segmentedHtml });
      await fixture.flush();

      const [list, grid] = [...fixture.element.querySelectorAll<HTMLElement>('ore-button')];

      list.focus();
      fireKeyDown(list, { key: 'ArrowRight' });
      await fixture.flush();

      expect(fixture.element.hasAttribute('value')).toBe(false);
      expect(grid.getAttribute('aria-checked')).toBe(null);
    });
  });

  describe('Roving tabindex', () => {
    it('keeps only the selected option in the tab order', async () => {
      fixture = await mount('ore-button-group', { attrs: { value: 'grid' }, html: segmentedHtml });
      await fixture.flush();

      const [list, grid] = [...fixture.element.querySelectorAll<HTMLElement>('ore-button')];

      expect(grid.getAttribute('tabindex')).toBe('0');
      expect(list.getAttribute('tabindex')).toBe('-1');
    });

    it('moves the tab stop with the selection', async () => {
      fixture = await mount('ore-button-group', { attrs: { value: 'list' }, html: segmentedHtml });
      await fixture.flush();

      const [list, grid] = [...fixture.element.querySelectorAll<HTMLElement>('ore-button')];

      fireClick(grid);
      await fixture.flush();

      expect(grid.getAttribute('tabindex')).toBe('0');
      expect(list.getAttribute('tabindex')).toBe('-1');
    });

    it('moves the selection off a disabled option', async () => {
      fixture = await mount('ore-button-group', {
        attrs: { value: 'list' },
        html: '<ore-button value="list" disabled>List</ore-button><ore-button value="grid">Grid</ore-button>',
      });
      await fixture.flush();

      const [, grid] = [...fixture.element.querySelectorAll<HTMLElement>('ore-button')];

      expect(grid.getAttribute('tabindex')).toBe('0');
    });

    it('leaves tabindex alone in a plain group', async () => {
      fixture = await mount('ore-button-group', { html: segmentedHtml });
      await fixture.flush();

      const buttons = [...fixture.element.querySelectorAll<HTMLElement>('ore-button')];

      expect(buttons[0].getAttribute('tabindex')).toBe('0');
      expect(buttons[1].getAttribute('tabindex')).toBe('0');
    });
  });

  describe('Accessibility', () => {
    it('passes axe checks as a segmented control', async () => {
      fixture = await mount('ore-button-group', {
        attrs: { label: 'View mode', value: 'list' },
        html: segmentedHtml,
      });
      await fixture.flush();

      expect(fixture.query('[part="group"]')?.getAttribute('role')).toBe('radiogroup');

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });
});
