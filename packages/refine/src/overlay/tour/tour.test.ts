import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { fireClick } from '@vielzeug/assay';
import { type Fixture, mount } from '@vielzeug/ore/testing';
import { signal } from '@vielzeug/ripple';

import type { OreTourElement, TourStepSnapshot } from './tour';

const tourCss = readFileSync(join(import.meta.dirname, 'tour.css'), 'utf-8');

describe('ore-tour', () => {
  let fixture: Fixture<HTMLElement>;

  const openChangeEvents: Array<{ open: boolean; reason: string }> = [];
  const dismissEvents: Array<{ reason: string }> = [];

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

    if (!HTMLDialogElement.prototype.showModal) {
      HTMLDialogElement.prototype.showModal = function () {
        this.setAttribute('open', '');
      };
    }

    if (!HTMLDialogElement.prototype.close) {
      HTMLDialogElement.prototype.close = function () {
        this.removeAttribute('open');
        this.dispatchEvent(new Event('close'));
      };
    }

    (globalThis as typeof globalThis & { CSSTransition?: unknown }).CSSTransition ??= class {};

    await import('./tour');
  });

  afterEach(() => {
    fixture?.dispose();
    openChangeEvents.length = 0;
    dismissEvents.length = 0;
  });

  const mountCard = async (
    attrs: Record<string, string | number | boolean> = {},
    props: Record<string, unknown> = {},
    cardHtml = '',
  ): Promise<Fixture<HTMLElement>> => {
    fixture = await mount('ore-tour', { attrs, html: cardHtml, props });

    fixture.element.addEventListener('open-change', (event) => {
      const detail = (event as CustomEvent<{ open: boolean; reason: string }>).detail;

      openChangeEvents.push({ open: detail.open, reason: detail.reason });
    });
    fixture.element.addEventListener('dismiss', (event) => {
      dismissEvents.push((event as CustomEvent<{ reason: string }>).detail);
    });

    return fixture;
  };

  // The default footer actions live in the shadow tree: ore-button hosts, which
  // carry the component's own @click bindings.
  const footerButtons = (f: Fixture<HTMLElement>): HTMLElement[] => f.queryAll<HTMLElement>('.footer ore-button');

  // ─── Rendering ───────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders closed by default with both presentation shells hidden', async () => {
      fixture = await mountCard();

      expect(fixture.query('dialog')?.hasAttribute('open')).toBe(false);
      expect(fixture.query('.float')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('renders title and description', async () => {
      fixture = await mountCard({ description: 'Start here.', open: '', presentation: 'modal', title: 'Welcome' });

      expect(fixture.query('.title')?.textContent).toContain('Welcome');
      expect(fixture.query('.body')?.textContent).toContain('Start here.');
    });

    it('keeps the description when a named-slot child is present', async () => {
      // The coachmark case: a footer child (plus the whitespace between tags) is
      // assigned to the default slot, which would blank a slot-fallback description.
      fixture = await mountCard(
        { description: 'Share a board with your team.', open: '', presentation: 'popover' },
        {},
        '\n  <div slot="footer"><button>Got it</button></div>\n',
      );
      await Promise.resolve();

      expect(fixture.query('.body')?.textContent).toContain('Share a board with your team.');
    });

    it('replaces the description with slotted body content', async () => {
      fixture = await mountCard(
        { description: 'Fallback copy.', open: '', presentation: 'modal' },
        {},
        '<p>Custom body paragraph.</p>',
      );
      await Promise.resolve();

      const body = fixture.query('.body');

      // The slotted <p> lives in the light DOM, so it never appears in the
      // shadow-side textContent; the contract is that the description steps aside.
      expect(body?.textContent).not.toContain('Fallback copy.');

      const slot = body?.querySelector('slot');
      const assigned = (slot as HTMLSlotElement | undefined)?.assignedElements?.() ?? [];

      expect(assigned.map((node) => node.tagName)).toContain('P');
    });

    it('shows the segmented progress bar when total-steps is set', async () => {
      fixture = await mountCard({
        open: '',
        presentation: 'modal',
        'step-index': '1',
        title: 'Step two',
        'total-steps': '3',
      });

      const progress = fixture.query('ore-progress');

      expect(progress).toBeTruthy();
      expect(progress?.getAttribute('segments')).toBe('3');
      expect(progress?.getAttribute('value')).toBe('2');
      expect(progress?.getAttribute('value-text')).toBe('Step 2 of 3');
    });

    it('hides the progress bar without total-steps', async () => {
      fixture = await mountCard({ open: '', presentation: 'modal' });

      expect(fixture.query('ore-progress')).toBeFalsy();
    });

    it('shows the step counter text next to the progress bar', async () => {
      fixture = await mountCard({
        open: '',
        presentation: 'modal',
        'step-index': '1',
        title: 'Step two',
        'total-steps': '3',
      });

      expect(fixture.query('.step-count')?.textContent).toBe('Step 2 of 3');
    });

    it('hides the step counter without total-steps', async () => {
      fixture = await mountCard({ open: '', presentation: 'modal' });

      expect(fixture.query('.step-count')).toBeFalsy();
    });

    it('hides the media region while the media slot is empty', async () => {
      fixture = await mountCard({ open: '', presentation: 'modal' });

      expect(fixture.query('.media')?.hasAttribute('hidden')).toBe(true);
    });

    it('reveals the media region for slotted media', async () => {
      fixture = await mountCard(
        { open: '', presentation: 'modal' },
        {},
        '<img alt="Where the save button lives" slot="media" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==">',
      );
      await Promise.resolve();

      const media = fixture.query('.media');

      expect(media?.hasAttribute('hidden')).toBe(false);
      // The image is a light-DOM child distributed into the slot, so it is not
      // reachable by querying the shadow region; read the slot's assignment.
      const slot = media?.querySelector('slot[name="media"]');
      const assigned = (slot as HTMLSlotElement | undefined)?.assignedElements?.() ?? [];

      expect(assigned.map((node) => node.tagName)).toContain('IMG');
    });

    it('hides the close button when dismissible is false', async () => {
      fixture = await mountCard({ dismissible: 'false', open: '', presentation: 'modal' });

      expect(fixture.query('.close')?.hasAttribute('hidden')).toBe(true);
    });
  });

  // ─── Presentation resolution ─────────────────────────────────────────────────

  describe('Presentation', () => {
    it('resolves auto to popover on wide viewports (jsdom matchMedia never matches)', async () => {
      fixture = await mountCard({ open: '' });

      expect(fixture.query('.float')?.hasAttribute('data-open')).toBe(true);
      expect(fixture.query('dialog')?.hasAttribute('open')).toBe(false);
    });

    it('opens the native dialog for the modal presentation', async () => {
      fixture = await mountCard({ open: '', presentation: 'modal' });

      expect(fixture.query('dialog')?.hasAttribute('open')).toBe(true);
      expect(fixture.query('.float')?.hasAttribute('data-open')).toBe(false);
    });

    it('opens the native dialog for the bottom-sheet presentation', async () => {
      fixture = await mountCard({ open: '', presentation: 'bottom-sheet' });

      expect(fixture.query('dialog')?.hasAttribute('open')).toBe(true);
      expect(fixture.query('.panel')?.getAttribute('data-presentation')).toBe('bottom-sheet');
    });

    it('emits open-change when the open prop turns the popover on', async () => {
      fixture = await mountCard();

      await fixture.attr('open', true);

      expect(openChangeEvents).toEqual([{ open: true, reason: 'programmatic' }]);
    });

    it('closes the popover when the open prop is cleared', async () => {
      fixture = await mountCard({ open: '' });

      await fixture.attr('open', false);

      expect(fixture.query('.float')?.hasAttribute('data-open')).toBe(false);
      expect(openChangeEvents).toContainEqual({ open: false, reason: 'programmatic' });
    });

    it('does not emit dismiss when the presentation flips the dialog closed', async () => {
      // A presentation change (e.g. `auto` resolving bottom-sheet → popover on a
      // resize) closes the native dialog programmatically. That is a state sync,
      // not a user dismissal: the tour must stay open in its new presentation.
      fixture = await mountCard({ open: '', presentation: 'modal' });

      await fixture.attr('presentation', 'popover');

      expect(fixture.query('dialog')?.hasAttribute('open')).toBe(false);
      expect(openChangeEvents).toContainEqual({ open: false, reason: 'programmatic' });
      expect(dismissEvents).toEqual([]);
    });

    it('does not restore focus when the presentation flips the dialog closed', async () => {
      // Regression: the dialog's focus-restore used to run when its exit
      // animation finished, ~200ms after the popover had already taken focus.
      // The restore yanked focus back to the pre-open element, stranding
      // keyboard control (arrow keys) outside the card while the tour was
      // still open. The demo drives `open` as a property, so the tour stays
      // open across the flip and the popover keeps focus.
      const outside = document.createElement('button');
      document.body.appendChild(outside);
      outside.focus();

      fixture = await mountCard({ presentation: 'modal' }, { open: true });

      // jsdom cannot move focus into the shadow panel (panel.focus() is a
      // no-op), and re-focusing an already-focused element fires no event, so
      // watch the restore call itself: the restorer invokes focus() directly.
      let restoreCalls = 0;
      const nativeFocus = outside.focus.bind(outside);

      outside.focus = (...args: Parameters<HTMLElement['focus']>) => {
        restoreCalls += 1;
        nativeFocus(...args);
      };

      await fixture.attr('presentation', 'popover');

      expect(fixture.query('dialog')?.hasAttribute('open')).toBe(false);
      expect(fixture.query('.float')?.hasAttribute('data-open')).toBe(true);
      expect(restoreCalls).toBe(0);

      outside.focus = nativeFocus;
      outside.remove();
    });

    it('re-asserts panel focus after the flipped dialog closes', async () => {
      // The browser's own dialog-close focus restore lands in the same task as
      // the native `close` event — after the popover already took focus — and
      // strands keyboard control on <body> when the tour auto-started with
      // nothing focused. The card must re-assert focus on the live popover
      // panel after that restore, i.e. after the close event, not only when
      // the presentation prop flips.
      const outside = document.createElement('button');

      document.body.appendChild(outside);
      outside.focus();

      fixture = await mountCard({ presentation: 'modal' }, { open: true });

      const float = fixture.query<HTMLElement>('.float');
      const events: string[] = [];
      const nativeFocus = float.focus.bind(float);

      float.focus = (...args: Parameters<HTMLElement['focus']>) => {
        events.push('panel-focus');
        nativeFocus(...args);
      };
      fixture.query('dialog')?.addEventListener('close', () => events.push('dialog-close'));

      await fixture.attr('presentation', 'popover');
      // Flush the microtask chain the close runs through (awaitExit fallback
      // + the re-assert itself): a macrotask boundary drains all of them.
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(events).toContain('dialog-close');
      expect(events.indexOf('panel-focus')).toBeGreaterThan(-1);
      // At least one re-assertion happens after the native restore point.
      expect(events.lastIndexOf('panel-focus')).toBeGreaterThan(events.indexOf('dialog-close'));

      float.focus = nativeFocus;
      outside.remove();
    });

    it('freezes the auto presentation while open across a viewport change', async () => {
      // `auto` resolves once per open: crossing the narrow threshold mid-tour
      // must not rebuild the live card (a popover becoming a modal mid-step is
      // the failure mode). This jsdom has no matchMedia at all (the sentinel
      // would report unavailable), so the stub is a complete fake: never call
      // through to a native implementation.
      const listeners = new Set<() => void>();
      let matches = false;
      const nativeMatchMedia = window.matchMedia;

      const inertMediaList = (): MediaQueryList =>
        ({
          addEventListener: () => {},
          get matches() {
            return false;
          },
          removeEventListener: () => {},
        }) as unknown as MediaQueryList;

      window.matchMedia = ((query: string) => {
        if (!query.includes('640px')) return inertMediaList();

        return {
          addEventListener: (_: string, cb: () => void) => listeners.add(cb),
          get matches() {
            return matches;
          },
          removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
        } as unknown as MediaQueryList;
      }) as typeof window.matchMedia;

      try {
        fixture = await mountCard({ presentation: 'auto' }, { open: true });

        expect(fixture.query('.float')?.hasAttribute('data-open')).toBe(true);

        matches = true;
        for (const cb of [...listeners]) cb();
        await fixture.flush();

        // Still the popover: the open card never flips presentation.
        expect(fixture.query('.float')?.hasAttribute('data-open')).toBe(true);
        expect(fixture.query('dialog')?.hasAttribute('open')).toBe(false);
      } finally {
        window.matchMedia = nativeMatchMedia;
      }
    });
  });

  // ─── Actions ─────────────────────────────────────────────────────────────────

  describe('Actions', () => {
    it('emits next from the primary button on a middle step', async () => {
      fixture = await mountCard({ open: '', presentation: 'modal', 'step-index': '1', 'total-steps': '3' });

      const next = footerButtons(fixture).at(-1);

      expect(next?.textContent).toContain('Next');

      const seen: string[] = [];

      fixture.element.addEventListener('next', () => seen.push('next'));
      if (next) await fixture.act(() => fireClick(next));

      expect(seen).toEqual(['next']);
    });

    it('emits finish from the primary button on the last step', async () => {
      fixture = await mountCard({ open: '', presentation: 'modal', 'step-index': '2', 'total-steps': '3' });

      const primary = footerButtons(fixture).at(-1);

      expect(primary?.textContent).toContain('Finish');

      const seen: string[] = [];

      fixture.element.addEventListener('finish', () => seen.push('finish'));
      if (primary) await fixture.act(() => fireClick(primary));

      expect(seen).toEqual(['finish']);
    });

    it('emits skip and back from their buttons', async () => {
      fixture = await mountCard({ open: '', presentation: 'modal', 'step-index': '1', 'total-steps': '3' });

      const seen: string[] = [];

      fixture.element.addEventListener('back', () => seen.push('back'));
      fixture.element.addEventListener('skip', () => seen.push('skip'));

      // DOM order is Skip, Back, Next: Skip leads the row and is pushed to the
      // leading edge, so tab order matches the visual order.
      const [skip, back] = footerButtons(fixture);

      if (skip) await fixture.act(() => fireClick(skip));
      if (back) await fixture.act(() => fireClick(back));

      expect(seen).toEqual(['skip', 'back']);
    });

    it('hides Back on the first step and Skip on the last', async () => {
      fixture = await mountCard({ open: '', presentation: 'modal', 'step-index': '0', 'total-steps': '3' });

      const [skip, back] = fixture.queryAll('.action');

      expect(back?.getAttribute('data-hidden')).toBe('true');
      expect(skip?.getAttribute('data-hidden')).toBe('false');

      await fixture.attr('step-index', 2);

      expect(back?.getAttribute('data-hidden')).toBe('false');
      expect(skip?.getAttribute('data-hidden')).toBe('true');
    });

    it('requests dismissal from the close button in popover mode', async () => {
      fixture = await mountCard({ open: '' });

      const close = fixture.query<HTMLButtonElement>('.float .close');

      if (close) await fixture.act(() => fireClick(close));

      expect(dismissEvents).toEqual([{ reason: 'trigger' }]);
      // Popover mode never closes itself: the card stays open until the app syncs.
      expect(fixture.query('.float')?.hasAttribute('data-open')).toBe(true);
    });
  });

  // ─── Controller binding ──────────────────────────────────────────────────────

  describe('bind()', () => {
    const snapshot = (overrides: Partial<TourStepSnapshot> = {}): TourStepSnapshot => ({
      placement: 'auto',
      presentation: 'popover',
      rect: null,
      step: { description: 'Start here.', title: 'Welcome' },
      stepIndex: 0,
      totalSteps: 0,
      ...overrides,
    });

    it('renders the controller snapshot into the card', async () => {
      fixture = await mountCard();

      const card = fixture.element as OreTourElement;
      const current = signal<TourStepSnapshot>(snapshot());

      card.bind({ current, dismiss: () => {} });

      expect(card.open).toBe(true);
      expect(card.title).toBe('Welcome');
      expect(card.description).toBe('Start here.');
      expect(fixture.query('.float')?.hasAttribute('data-open')).toBe(true);

      current.value = snapshot({ step: null });

      await Promise.resolve();

      expect(card.open).toBe(false);
    });

    it('maps placement "auto" to the card default and passes explicit placements through', async () => {
      fixture = await mountCard();

      const card = fixture.element as OreTourElement;

      card.bind({ current: signal(snapshot({ placement: 'auto' })), dismiss: () => {} });
      expect(card.placement).toBe('bottom');

      card.bind({ current: signal(snapshot({ placement: 'right' })), dismiss: () => {} });
      expect(card.placement).toBe('right');
    });

    it('routes card actions into the controller', async () => {
      fixture = await mountCard();

      const card = fixture.element as OreTourElement;
      const seen: string[] = [];

      card.bind({
        current: signal(snapshot({ stepIndex: 1, totalSteps: 3 })),
        dismiss: () => seen.push('dismiss'),
        next: () => seen.push('next'),
      });

      const [skip, back, primary] = footerButtons(fixture);

      if (skip) await fixture.act(() => fireClick(skip));
      if (back) await fixture.act(() => fireClick(back));
      if (primary) await fixture.act(() => fireClick(primary));

      // Skip has no skip handler here: it must fall back to dismiss. Back is
      // hidden on this step's leading edge but still present in the DOM.
      expect(seen).toContain('dismiss');
      expect(seen).toContain('next');
    });

    it('falls back to dismiss for actions the controller does not implement', async () => {
      fixture = await mountCard();

      const card = fixture.element as OreTourElement;
      const seen: string[] = [];

      card.bind({
        current: signal(snapshot({ stepIndex: 1, totalSteps: 3 })),
        dismiss: () => seen.push('dismiss'),
      });

      const [, back] = footerButtons(fixture);

      if (back) await fixture.act(() => fireClick(back));

      expect(seen).toEqual(['dismiss']);
    });

    it('stops rendering after unsubscribe and replaces on rebind', async () => {
      fixture = await mountCard();

      const card = fixture.element as OreTourElement;
      const current = signal<TourStepSnapshot>(snapshot());

      const stop = card.bind({ current, dismiss: () => {} });

      stop();
      current.value = snapshot({ step: { title: 'Late' } });

      await Promise.resolve();

      expect(card.title).toBe('Welcome');

      // Rebinding replaces the previous controller cleanly.
      card.bind({ current: signal(snapshot({ step: { title: 'Second' } })), dismiss: () => {} });
      expect(card.title).toBe('Second');
    });
  });

  // ─── Keyboard ────────────────────────────────────────────────────────────────

  describe('Keyboard', () => {
    const keydown = (f: Fixture<HTMLElement>, key: string): void => {
      f.element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key }));
    };

    it('emits next/back on ArrowRight/ArrowLeft while open', async () => {
      fixture = await mountCard({ open: '' });

      const seen: string[] = [];

      fixture.element.addEventListener('next', () => seen.push('next'));
      fixture.element.addEventListener('back', () => seen.push('back'));

      keydown(fixture, 'ArrowRight');
      keydown(fixture, 'ArrowLeft');

      expect(seen).toEqual(['next', 'back']);
    });

    it('ignores arrow keys while closed', async () => {
      fixture = await mountCard();

      const seen: string[] = [];

      fixture.element.addEventListener('next', () => seen.push('next'));

      keydown(fixture, 'ArrowRight');

      expect(seen).toEqual([]);
    });

    it('requests dismissal on Escape in popover mode', async () => {
      fixture = await mountCard({ open: '' });

      keydown(fixture, 'Escape');

      expect(dismissEvents).toEqual([{ reason: 'escape' }]);
    });

    it('does not request dismissal on Escape when persistent', async () => {
      fixture = await mountCard({ open: '', persistent: '' });

      keydown(fixture, 'Escape');

      expect(dismissEvents).toEqual([]);
    });

    it('ignores arrow keys while typing in a field', async () => {
      fixture = await mountCard({ open: '' }, {});

      const input = document.createElement('input');

      fixture.element.append(input);

      const seen: string[] = [];

      fixture.element.addEventListener('next', () => seen.push('next'));

      input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }));

      expect(seen).toEqual([]);
    });
  });

  // ─── Spotlight ───────────────────────────────────────────────────────────────

  describe('Spotlight', () => {
    it('renders no spotlight by default', async () => {
      fixture = await mountCard({ open: '' });

      expect(fixture.query('ore-spotlight')).toBeFalsy();
    });

    it('renders a spotlight with the anchor rect when enabled', async () => {
      fixture = await mountCard({ open: '', spotlight: '' }, { anchor: { height: 40, width: 100, x: 8, y: 16 } });

      const spotlight = fixture.query('ore-spotlight');

      expect(spotlight).toBeTruthy();
      expect((spotlight as { rect?: { x: number } } | null)?.rect?.x).toBe(8);
    });

    it('renders no spotlight without a rect anchor', async () => {
      fixture = await mountCard({ open: '', spotlight: '' });

      expect(fixture.query('ore-spotlight')).toBeFalsy();
    });

    it('measures an element anchor for the spotlight cutout', async () => {
      const anchor = document.createElement('button');

      anchor.getBoundingClientRect = () => ({ height: 30, width: 120, x: 4, y: 200 }) as DOMRect;
      document.body.appendChild(anchor);

      fixture = await mountCard({ open: '', spotlight: '' }, { anchor });

      const spotlight = fixture.query('ore-spotlight');

      expect(spotlight).toBeTruthy();
      expect((spotlight as { rect?: { x: number; y: number } } | null)?.rect?.y).toBe(200);

      // Scrolling moves the element: the cutout follows it.
      anchor.getBoundingClientRect = () => ({ height: 30, width: 120, x: 4, y: 60 }) as DOMRect;
      window.dispatchEvent(new Event('scroll'));
      await fixture.flush();

      expect((spotlight as { rect?: { y: number } } | null)?.rect?.y).toBe(60);

      anchor.remove();
    });
  });

  // ─── Anchoring ───────────────────────────────────────────────────────────────

  describe('Anchoring', () => {
    const rect = { height: 40, width: 100, x: 8, y: 16 };

    it('marks the popover anchored when the anchor arrives after open', async () => {
      // Regression: a tour opens on an unanchored welcome step, and only later
      // steps carry a rect. `data-anchored` used to be decided once at open,
      // so anchored steps kept the docked-banner CSS (margin-inline: auto),
      // which centered the card over the page instead of parking it beside
      // its target.
      fixture = await mountCard({ open: '' });

      expect(fixture.query('.float')?.hasAttribute('data-anchored')).toBe(false);

      const card = fixture.element as OreTourElement;

      await fixture.act(() => {
        card.anchor = rect;
      });

      expect(fixture.query('.float')?.hasAttribute('data-anchored')).toBe(true);

      await fixture.act(() => {
        card.anchor = null;
      });

      expect(fixture.query('.float')?.hasAttribute('data-anchored')).toBe(false);
    });

    it('marks the popover anchored when it opens with an anchor already set', async () => {
      fixture = await mountCard({ open: '' }, { anchor: rect });

      expect(fixture.query('.float')?.hasAttribute('data-anchored')).toBe(true);
    });
  });

  // ─── Styles ──────────────────────────────────────────────────────────────────

  describe('Styles', () => {
    it('keeps the card chrome in dialog presentations', () => {
      // Regression: `.panel .card { border: none; box-shadow: none }` made the
      // modal card blend into the page (--color-canvas is the page background).
      // The card keeps its border/shadow everywhere; the panel only positions.
      expect(tourCss).not.toMatch(/\.panel \.card\s*\{[^}]*border:\s*none/);
    });

    it('rings the close button on keyboard focus', () => {
      expect(tourCss).toMatch(/\.close:focus-visible\s*\{[^}]*outline:\s*var\(--focus-ring\)/);
    });

    it('caps media height against the viewport', () => {
      // An uncapped hero in a bottom-sheet pushes the footer off-screen.
      expect(tourCss).toMatch(/max-height:\s*var\(--tour-media-max-height,\s*min\(38dvh/);
      expect(tourCss).toMatch(/max-height:\s*var\(--tour-media-max-height,\s*min\(26dvh/);
    });

    it('dims the dialog backdrop with the shared overlay veil', () => {
      // The veil must come from --overlay-veil (always darkens), never the
      // canvas wash that inverts to a bright fog in light mode.
      expect(tourCss).toMatch(/--_backdrop-bg:\s*var\(--tour-backdrop-bg,\s*var\(--overlay-veil\)\)/);
      expect(tourCss).toMatch(/:host\(\[backdrop='blur'\]\)\s*\{[^}]*--_backdrop-filter:\s*blur\(/);
      expect(tourCss).toMatch(/:host\(\[backdrop='transparent'\]\)\s*\{[^}]*--_backdrop-bg:\s*transparent/);
    });
  });

  // ─── Accessibility ───────────────────────────────────────────────────────────

  describe('Accessibility', () => {
    it('has no detectable violations in popover mode', async () => {
      fixture = await mountCard({ description: 'Start here.', open: '', title: 'Welcome', 'total-steps': '3' });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });

    it('has no detectable violations in modal mode', async () => {
      fixture = await mountCard({ open: '', presentation: 'modal', title: 'Welcome', 'total-steps': '3' });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });
});
