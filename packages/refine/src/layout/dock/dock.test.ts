import { type Fixture, mount } from '@vielzeug/ore/testing';

import type { OreDockProps } from './dock';

describe('ore-dock', () => {
  let fixture: Fixture<HTMLElement & OreDockProps>;

  beforeAll(async () => {
    await import('./dock');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  // ─── Rendering ───────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders a toolbar landmark inside the bar', async () => {
      fixture = await mount('ore-dock');

      const bar = fixture.shadow?.querySelector('[part="bar"]');

      expect(bar?.getAttribute('role')).toBe('toolbar');
      expect(bar?.getAttribute('aria-orientation')).toBe('horizontal');
    });

    it('names the landmark from the label prop', async () => {
      fixture = await mount('ore-dock', { attrs: { label: 'Hunt actions' } });

      expect(fixture.shadow?.querySelector('[part="bar"]')?.getAttribute('aria-label')).toBe('Hunt actions');
    });

    it('falls back to a generic landmark name', async () => {
      fixture = await mount('ore-dock');

      expect(fixture.shadow?.querySelector('[part="bar"]')?.getAttribute('aria-label')).toBe('Page actions');
    });

    it('renders all four places', async () => {
      fixture = await mount('ore-dock');

      for (const part of ['bar', 'start', 'center', 'tools', 'commit']) {
        expect(fixture.shadow?.querySelector(`[part="${part}"]`)).toBeTruthy();
      }
    });
  });

  // ─── Slot claim ──────────────────────────────────────────────────────────────

  describe('Slot claim', () => {
    // A `<slot>` always matches `:empty` and `:has()` cannot see slotted content, so the bar
    // computes claim state in JS and reflects it: this is the only channel its CSS can read.
    const claimed = (el: HTMLElement) =>
      ['start', 'center', 'tools', 'commit'].map((place) => (el.hasAttribute(`data-${place}-claimed`) ? place : null));

    it('reflects no claimed place for an empty dock', async () => {
      fixture = await mount('ore-dock');

      expect(claimed(fixture.element)).toEqual([null, null, null, null]);
    });

    it('reflects each claimed place', async () => {
      fixture = await mount('ore-dock', {
        html: '<b slot="start">back</b><i slot="center">clock</i><em>tool</em><s slot="commit">done</s>',
      });

      expect(claimed(fixture.element)).toEqual(['start', 'center', 'tools', 'commit']);
    });

    it('marks a place unclaimed when its slot is left empty', async () => {
      fixture = await mount('ore-dock', { html: '<em>tool</em>' });

      expect(claimed(fixture.element)).toEqual([null, null, 'tools', null]);
    });

    it('hides an unclaimed place so it leaves no gap', async () => {
      fixture = await mount('ore-dock', { html: '<em>tool</em>' });

      expect(fixture.shadow?.querySelector('[part="start"]')?.hasAttribute('hidden')).toBe(true);
      expect(fixture.shadow?.querySelector('[part="center"]')?.hasAttribute('hidden')).toBe(true);
      expect(fixture.shadow?.querySelector('[part="commit"]')?.hasAttribute('hidden')).toBe(true);
      expect(fixture.shadow?.querySelector('[part="tools"]')?.hasAttribute('hidden')).toBe(false);
    });

    it('shows a place once content is assigned to it', async () => {
      fixture = await mount('ore-dock');

      expect(fixture.shadow?.querySelector('[part="commit"]')?.hasAttribute('hidden')).toBe(true);

      const commit = document.createElement('button');

      commit.slot = 'commit';
      commit.textContent = 'Done';
      fixture.element.append(commit);
      await new Promise((resolve) => {
        requestAnimationFrame(resolve);
      });

      expect(fixture.element.hasAttribute('data-commit-claimed')).toBe(true);
      expect(fixture.shadow?.querySelector('[part="commit"]')?.hasAttribute('hidden')).toBe(false);
    });

    it('drops the claim when the last child of a place is removed', async () => {
      fixture = await mount('ore-dock', { html: '<b slot="start">back</b>' });

      expect(fixture.element.hasAttribute('data-start-claimed')).toBe(true);

      fixture.element.querySelector('[slot="start"]')?.remove();
      await new Promise((resolve) => {
        requestAnimationFrame(resolve);
      });

      expect(fixture.element.hasAttribute('data-start-claimed')).toBe(false);
    });
  });

  // ─── Props ───────────────────────────────────────────────────────────────────

  describe('Props', () => {
    it('defaults to a sticky bottom bar', async () => {
      fixture = await mount('ore-dock');

      expect(fixture.element.getAttribute('side')).toBe('bottom');
      expect(fixture.element.hasAttribute('sticky')).toBe(true);
      expect(fixture.element.getAttribute('mobile-layout')).toBe('auto');
    });

    it('reflects side', async () => {
      fixture = await mount('ore-dock', { attrs: { side: 'top' } });

      expect(fixture.element.getAttribute('side')).toBe('top');
    });

    it('drops sticky positioning when sticky is cleared', async () => {
      fixture = await mount('ore-dock', { props: { sticky: false } });

      expect(fixture.element.hasAttribute('sticky')).toBe(false);
    });

    it('reflects attached mode', async () => {
      fixture = await mount('ore-dock', { attrs: { attached: true } });

      expect(fixture.element.hasAttribute('attached')).toBe(true);
    });

    it.each(['auto', 'full', 'compact'])('reflects the %s mobile layout', async (mobileLayout) => {
      fixture = await mount('ore-dock', { attrs: { 'mobile-layout': mobileLayout } });

      expect(fixture.element.getAttribute('mobile-layout')).toBe(mobileLayout);
    });

    it('updates mobile layout through its property', async () => {
      fixture = await mount('ore-dock');
      await fixture.act(() => {
        fixture.element.mobileLayout = 'full';
      });

      expect(fixture.element.getAttribute('mobile-layout')).toBe('full');
    });
  });

  // ─── Pinned state ────────────────────────────────────────────────────────────

  describe('Pinned state', () => {
    // jsdom has no layout: every rect is zero, so the bar can never observe itself pinned, and
    // `onMounted` does not run. That is the whole assertion here: the state stays at its CSS
    // fallback rather than firing on a zero-sized rect. Real pinning is `dock.e2e.ts`'s job.
    it('stays unpinned without layout', async () => {
      fixture = await mount('ore-dock', { html: '<em>tool</em>' });

      expect(fixture.element.hasAttribute('data-pinned')).toBe(false);
    });
  });

  // ─── Accessibility ───────────────────────────────────────────────────────────

  describe('Accessibility', () => {
    it('has no violations with every place claimed', async () => {
      fixture = await mount('ore-dock', {
        attrs: { label: 'Hunt actions' },
        html: '<button slot="start">Back</button><span slot="center">02:31</span><button>Share</button><button slot="commit">Done</button>',
      });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });

    it('has no violations with only a tool row', async () => {
      fixture = await mount('ore-dock', { html: '<button>Import</button><button>New</button>' });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });
});
