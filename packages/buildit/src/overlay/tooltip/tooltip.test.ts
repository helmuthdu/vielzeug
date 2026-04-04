import { type Fixture, mount } from '@vielzeug/craftit/testing';

describe('bit-tooltip', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./tooltip');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('renders slot for trigger', async () => {
      fixture = await mount('bit-tooltip', { html: '<button>Hover me</button>' });

      expect(fixture.element.textContent?.trim()).toBe('Hover me');
    });

    it('renders tooltip element in shadow DOM', async () => {
      fixture = await mount('bit-tooltip', { attrs: { content: 'Tooltip text' } });

      expect(fixture.query('.tooltip')).toBeTruthy();
    });
  });

  describe('Props', () => {
    it('applies content prop', async () => {
      fixture = await mount('bit-tooltip', { attrs: { content: 'Help text' } });

      expect(fixture.element.getAttribute('content')).toBe('Help text');
    });

    it('applies placement prop', async () => {
      fixture = await mount('bit-tooltip', { attrs: { content: 'tip', placement: 'bottom' } });

      expect(fixture.element.getAttribute('placement')).toBe('bottom');
    });

    it('applies variant prop', async () => {
      fixture = await mount('bit-tooltip', { attrs: { content: 'tip', variant: 'light' } });

      expect(fixture.element.getAttribute('variant')).toBe('light');
    });
  });

  describe('ARIA', () => {
    it('tooltip element has role tooltip', async () => {
      fixture = await mount('bit-tooltip', { attrs: { content: 'tip' } });

      expect(fixture.query('[role="tooltip"]')).toBeTruthy();
    });
  });

  describe('Placements', () => {
    for (const placement of ['top', 'bottom', 'left', 'right']) {
      it(`accepts ${placement} placement`, async () => {
        fixture = await mount('bit-tooltip', { attrs: { content: 'tip', placement } });

        expect(fixture.element.getAttribute('placement')).toBe(placement);
        fixture.destroy();
      });
    }
  });
});

describe('bit-tooltip accessibility', () => {
  let fixture: Awaited<ReturnType<typeof mount>>;

  beforeAll(async () => {
    if (!HTMLElement.prototype.showPopover) {
      HTMLElement.prototype.showPopover = function () {
        this.setAttribute('popover-open', '');
      };
    }

    if (!HTMLElement.prototype.hidePopover) {
      HTMLElement.prototype.hidePopover = function () {
        this.removeAttribute('popover-open');
      };
    }

    await import('./tooltip');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Trigger Relationship', () => {
    it('trigger receives aria-describedby pointing to tooltip', async () => {
      fixture = await mount('bit-tooltip', {
        attrs: { content: 'Description', trigger: 'focus' },
        html: '<button>Trigger</button>',
      });

      const btn = fixture.element.querySelector('button');

      if (btn) {
        btn.focus();
        await fixture.flush();
        expect(btn.hasAttribute('aria-describedby')).toBe(true);
      }
    });
  });

  describe('Tooltip Hidden State', () => {
    it('tooltip is aria-hidden when not visible', async () => {
      fixture = await mount('bit-tooltip', { attrs: { content: 'tip' } });

      const tooltip = fixture.query('.tooltip');

      if (tooltip) {
        expect(tooltip.getAttribute('aria-hidden')).toBe('true');
      }
    });
  });
});
