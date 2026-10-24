import { fireClick } from '@vielzeug/assay';
import { type Fixture, mount } from '@vielzeug/ore/testing';

describe('ore-tooltip', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./tooltip');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  describe('Rendering', () => {
    it('renders slot for trigger', async () => {
      fixture = await mount('ore-tooltip', { html: '<button>Hover me</button>' });

      expect(fixture.element.textContent?.trim()).toBe('Hover me');
    });

    it('renders tooltip element in shadow DOM', async () => {
      fixture = await mount('ore-tooltip', { attrs: { content: 'Tooltip text' } });

      expect(fixture.query('.tooltip')).toBeTruthy();
    });

    it('renders prop content inside fallback text wrapper', async () => {
      fixture = await mount('ore-tooltip', { attrs: { content: 'Line 1\nLine 2' } });

      const text = fixture.query('.tooltip-text');

      expect(text?.textContent).toContain('Line 1');
      expect(text?.textContent).toContain('Line 2');
    });

    it('prefers named slot content over fallback text wrapper', async () => {
      fixture = await mount('ore-tooltip', {
        attrs: { content: 'Fallback text' },
        html: '<button>Trigger</button><span slot="content">Slotted text</span>',
      });

      const contentSlot = fixture.query('slot[name="content"]') as HTMLSlotElement | null;
      const assigned = contentSlot?.assignedElements({ flatten: true }) ?? [];

      expect(assigned.length).toBe(1);
      expect(assigned[0]?.textContent).toContain('Slotted text');
    });
  });

  describe('Props', () => {
    it('applies content prop', async () => {
      fixture = await mount('ore-tooltip', { attrs: { content: 'Help text' } });

      expect(fixture.element.getAttribute('content')).toBe('Help text');
    });

    it('applies placement prop', async () => {
      fixture = await mount('ore-tooltip', { attrs: { content: 'tip', placement: 'bottom' } });

      expect(fixture.element.getAttribute('placement')).toBe('bottom');
    });

    it('applies variant prop', async () => {
      fixture = await mount('ore-tooltip', { attrs: { content: 'tip', variant: 'light' } });

      expect(fixture.element.getAttribute('variant')).toBe('light');
    });

    it('initializes an uncontrolled tooltip with default-open', async () => {
      fixture = await mount('ore-tooltip', {
        attrs: { content: 'tip', 'default-open': '' },
        html: '<button>Trigger</button>',
      });

      expect(fixture.query('.tooltip')?.getAttribute('aria-hidden')).toBe('false');
    });

    it('emits open-change when a click trigger opens the tooltip', async () => {
      fixture = await mount('ore-tooltip', {
        attrs: { content: 'tip', trigger: 'click' },
        html: '<button>Trigger</button>',
      });

      const onOpenChange = vi.fn();

      fixture.element.addEventListener('open-change', onOpenChange);
      fireClick(fixture.element.querySelector<HTMLButtonElement>('button')!);
      await fixture.flush();

      expect((onOpenChange.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({ open: true, reason: 'click' });
    });
  });

  // HIG: hover needs a dwell so sweeping a toolbar does not fire every tooltip;
  // focus and click are deliberate and stay immediate.
  describe('Dwell', () => {
    const hover = (host: HTMLElement): void => {
      host.querySelector('button')?.dispatchEvent(new Event('pointerenter'));
    };

    const leave = (host: HTMLElement): void => {
      host.querySelector('button')?.dispatchEvent(new Event('pointerleave'));
    };

    const hidden = (host: HTMLElement): boolean =>
      host.shadowRoot?.querySelector('.tooltip')?.getAttribute('aria-hidden') === 'true';

    afterEach(() => {
      vi.useRealTimers();
    });

    it('holds an unset hover delay for the dwell period', async () => {
      fixture = await mount('ore-tooltip', {
        attrs: { content: 'tip', trigger: 'hover' },
        html: '<button>Trigger</button>',
      });
      await fixture.flush();
      // Only setTimeout is faked: fixture.flush() awaits requestAnimationFrame, which
      // full fake timers would also intercept and never advance.
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

      hover(fixture.element);
      expect(hidden(fixture.element)).toBe(true);

      vi.advanceTimersByTime(299);
      await fixture.flush();
      expect(hidden(fixture.element)).toBe(true);

      vi.advanceTimersByTime(1);
      await fixture.flush();
      expect(hidden(fixture.element)).toBe(false);
    });

    it('opens immediately on focus without a dwell', async () => {
      fixture = await mount('ore-tooltip', {
        attrs: { content: 'tip', trigger: 'focus' },
        html: '<button>Trigger</button>',
      });
      await fixture.flush();

      fixture.element.querySelector('button')?.dispatchEvent(new Event('focusin'));
      await fixture.flush();

      expect(hidden(fixture.element)).toBe(false);
    });

    it('honours an explicit zero delay on hover', async () => {
      fixture = await mount('ore-tooltip', {
        attrs: { content: 'tip', delay: '0', trigger: 'hover' },
        html: '<button>Trigger</button>',
      });
      await fixture.flush();

      hover(fixture.element);
      await fixture.flush();

      expect(hidden(fixture.element)).toBe(false);
    });

    it('respects an explicit hover delay', async () => {
      fixture = await mount('ore-tooltip', {
        attrs: { content: 'tip', delay: '500', trigger: 'hover' },
        html: '<button>Trigger</button>',
      });
      await fixture.flush();
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

      hover(fixture.element);
      vi.advanceTimersByTime(300);
      await fixture.flush();
      expect(hidden(fixture.element)).toBe(true);

      vi.advanceTimersByTime(200);
      await fixture.flush();
      expect(hidden(fixture.element)).toBe(false);
    });

    it('grace-periods pointer leave before closing', async () => {
      fixture = await mount('ore-tooltip', {
        attrs: { content: 'tip', delay: '0', trigger: 'hover' },
        html: '<button>Trigger</button>',
      });
      await fixture.flush();
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

      hover(fixture.element);
      await fixture.flush();
      expect(hidden(fixture.element)).toBe(false);

      leave(fixture.element);
      await fixture.flush();
      expect(hidden(fixture.element)).toBe(false);

      vi.advanceTimersByTime(100);
      await fixture.flush();
      expect(hidden(fixture.element)).toBe(true);
    });

    it('closes immediately when focus leaves', async () => {
      fixture = await mount('ore-tooltip', {
        attrs: { content: 'tip', trigger: 'focus' },
        html: '<button>Trigger</button>',
      });
      await fixture.flush();

      const btn = fixture.element.querySelector('button')!;

      btn.dispatchEvent(new Event('focusin'));
      await fixture.flush();
      expect(hidden(fixture.element)).toBe(false);

      btn.dispatchEvent(new Event('focusout'));
      await fixture.flush();
      expect(hidden(fixture.element)).toBe(true);
    });
  });

  describe('ARIA', () => {
    it('tooltip element has role tooltip', async () => {
      fixture = await mount('ore-tooltip', { attrs: { content: 'tip' } });

      expect(fixture.query('[role="tooltip"]')).toBeTruthy();
    });
  });

  describe('Placements', () => {
    for (const placement of ['top', 'bottom', 'left', 'right']) {
      it(`accepts ${placement} placement`, async () => {
        fixture = await mount('ore-tooltip', { attrs: { content: 'tip', placement } });

        expect(fixture.element.getAttribute('placement')).toBe(placement);
        fixture.dispose();
      });
    }
  });
});

describe('ore-tooltip accessibility', () => {
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
    fixture?.dispose();
  });

  describe('Trigger Relationship', () => {
    it('trigger receives aria-describedby pointing to tooltip', async () => {
      fixture = await mount('ore-tooltip', {
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
      fixture = await mount('ore-tooltip', { attrs: { content: 'tip' } });

      const tooltip = fixture.query('.tooltip');

      if (tooltip) {
        expect(tooltip.getAttribute('aria-hidden')).toBe('true');
      }
    });
  });

  describe('Accessibility', () => {
    it('passes axe checks', async () => {
      fixture = await mount('ore-tooltip', {
        attrs: { content: 'More information' },
        html: '<button>Info</button>',
      });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });
});
