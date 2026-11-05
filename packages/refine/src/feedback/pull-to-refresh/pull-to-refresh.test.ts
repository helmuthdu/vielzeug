import { type Fixture, mount } from '@vielzeug/ore/testing';
import type { PullToRefreshElement, PullToRefreshPhase } from './pull-to-refresh';

const pointer = { bubbles: true, composed: true, isPrimary: true, pointerType: 'touch' } as const;

/**
 * Drive the release spring to rest. Vitest fake timers would freeze
 * performance.now() (the spring's clock) while still firing animation frames,
 * so frames are driven synchronously with an advancing timestamp instead: the
 * mock runs each callback inline, recursing until the spring settles.
 */
function driveFrames(stepMs = 16): void {
  let now = 0;

  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
    now += stepMs;
    cb(now);

    return 1;
  });
}

describe('ore-pull-to-refresh', () => {
  let fixture: Fixture<PullToRefreshElement>;

  beforeAll(async () => {
    await (() => import('./pull-to-refresh'))();
  });

  afterEach(() => {
    fixture?.dispose();
    vi.restoreAllMocks();
  });

  const mountPtr = async (
    attrs: Record<string, string | number | boolean> = {},
  ): Promise<Fixture<PullToRefreshElement>> =>
    mount<PullToRefreshElement>('ore-pull-to-refresh', { attrs, html: '<p>content</p>' });

  const scroll = (): HTMLElement => fixture.query<HTMLElement>('.scroll')!;
  const content = (): HTMLElement => fixture.query<HTMLElement>('.content')!;
  const phase = (): PullToRefreshPhase | null => fixture.element.getAttribute('data-phase');

  const drag = (from: number, to: number, id = 1): void => {
    const target = scroll();

    target.dispatchEvent(new PointerEvent('pointerdown', { ...pointer, clientY: from, pointerId: id }));
    target.dispatchEvent(new PointerEvent('pointermove', { ...pointer, clientY: (from + to) / 2, pointerId: id }));
    target.dispatchEvent(new PointerEvent('pointermove', { ...pointer, clientY: to, pointerId: id }));
    target.dispatchEvent(new PointerEvent('pointerup', { ...pointer, clientY: to, pointerId: id }));
  };

  // ─── Rendering ───────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders the scroll, indicator, and content parts', async () => {
      fixture = await mountPtr();

      expect(fixture.query('[part="scroll"]')).toBeTruthy();
      expect(fixture.query('[part="indicator"]')).toBeTruthy();
      expect(fixture.query('[part="content"] slot')).toBeTruthy();
      expect(phase()).toBeNull();
    });

    it('exposes an accessible status region', async () => {
      fixture = await mountPtr();

      const status = fixture.query<HTMLElement>('[role="status"]');

      expect(status?.getAttribute('aria-live')).toBe('polite');
    });
  });

  // ─── Pull gesture ────────────────────────────────────────────────────────────

  describe('Pull gesture', () => {
    it('tracks the finger and reports the pulling phase below threshold', async () => {
      fixture = await mountPtr();

      const target = scroll();

      target.dispatchEvent(new PointerEvent('pointerdown', { ...pointer, clientY: 0, pointerId: 1 }));
      target.dispatchEvent(new PointerEvent('pointermove', { ...pointer, clientY: 30, pointerId: 1 }));

      expect(phase()).toBe('pulling');
      expect(content().style.transform).toBe('translateY(30px)');
    });

    it('rubber-bands past the threshold instead of tracking 1:1', async () => {
      fixture = await mountPtr({ threshold: '64' });

      const target = scroll();

      target.dispatchEvent(new PointerEvent('pointerdown', { ...pointer, clientY: 0, pointerId: 1 }));
      target.dispatchEvent(new PointerEvent('pointermove', { ...pointer, clientY: 148, pointerId: 1 }));

      // 64 + sqrt((148 - 64) * 64) ≈ 137.3: pulled 148, moved ~137.
      expect(content().style.transform).toBe(`translateY(${64 + Math.sqrt(84 * 64)}px)`);
      expect(phase()).toBe('ready');
    });

    it('reports the ready phase once the drag crosses the threshold', async () => {
      fixture = await mountPtr({ threshold: '64' });

      const target = scroll();

      target.dispatchEvent(new PointerEvent('pointerdown', { ...pointer, clientY: 0, pointerId: 1 }));
      target.dispatchEvent(new PointerEvent('pointermove', { ...pointer, clientY: 40, pointerId: 1 }));
      expect(phase()).toBe('pulling');

      target.dispatchEvent(new PointerEvent('pointermove', { ...pointer, clientY: 70, pointerId: 1 }));
      expect(phase()).toBe('ready');
    });

    it('emits refresh and holds at the threshold when released past it', async () => {
      fixture = await mountPtr({ threshold: '64' });
      driveFrames();
      const refreshes: number[] = [];

      fixture.element.addEventListener('refresh', () => refreshes.push(1));

      drag(0, 100);
      await fixture.flush();

      expect(refreshes).toHaveLength(1);
      expect(phase()).toBe('refreshing');
      expect(content().style.transform).toBe('translateY(64px)');
    });

    it('springs back without refreshing when released short of the threshold', async () => {
      fixture = await mountPtr({ threshold: '64' });
      driveFrames();
      const refreshes: number[] = [];

      fixture.element.addEventListener('refresh', () => refreshes.push(1));

      drag(0, 30);
      await fixture.flush();

      expect(refreshes).toHaveLength(0);
      expect(phase()).toBe('idle');
      expect(content().style.transform).toBe('translateY(0px)');
    });

    it('cancels back to rest on pointercancel', async () => {
      fixture = await mountPtr({ threshold: '64' });
      driveFrames();

      const target = scroll();

      target.dispatchEvent(new PointerEvent('pointerdown', { ...pointer, clientY: 0, pointerId: 1 }));
      target.dispatchEvent(new PointerEvent('pointermove', { ...pointer, clientY: 100, pointerId: 1 }));
      target.dispatchEvent(new PointerEvent('pointercancel', { ...pointer, clientY: 100, pointerId: 1 }));
      await fixture.flush();

      expect(phase()).toBe('idle');
      expect(content().style.transform).toBe('translateY(0px)');
    });

    it('does not start a pull while disabled', async () => {
      fixture = await mountPtr({ disabled: '' });

      const target = scroll();

      target.dispatchEvent(new PointerEvent('pointerdown', { ...pointer, clientY: 0, pointerId: 1 }));
      target.dispatchEvent(new PointerEvent('pointermove', { ...pointer, clientY: 120, pointerId: 1 }));

      expect(phase()).toBeNull();
      expect(content().style.transform).toBe('');
    });

    it('ignores drags while a refresh is in flight', async () => {
      fixture = await mountPtr({ threshold: '64' });
      driveFrames();

      drag(0, 100);
      await fixture.flush();
      expect(phase()).toBe('refreshing');

      drag(0, 120, 2);
      await fixture.flush();

      // Still holding at the refresh position, not re-pulled.
      expect(content().style.transform).toBe('translateY(64px)');
    });
  });

  // ─── Refresh lifecycle ───────────────────────────────────────────────────────

  describe('Refresh lifecycle', () => {
    it('retracts and returns to idle when refreshed() ends the refresh', async () => {
      fixture = await mountPtr({ threshold: '64' });
      driveFrames();

      drag(0, 100);
      await fixture.flush();
      expect(phase()).toBe('refreshing');

      fixture.element.refreshed();
      await fixture.flush();

      expect(phase()).toBe('idle');
      expect(content().style.transform).toBe('translateY(0px)');
    });

    it('reports the done phase while the indicator retracts', async () => {
      fixture = await mountPtr({ threshold: '64' });

      // Frames driven one step at a time: capture the phase mid-retraction.
      let frames = 0;

      vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
        frames += 1;
        cb(frames * 16);

        return 1;
      });

      drag(0, 100);
      await fixture.flush();

      fixture.element.refreshed();

      expect(phase()).toBe('done');
      await fixture.flush();
      expect(phase()).toBe('idle');
    });

    it('refreshed() is a no-op when idle', async () => {
      fixture = await mountPtr();

      expect(() => fixture.element.refreshed()).not.toThrow();
      expect(phase()).toBeNull();
    });

    it('supports a second refresh after the first completes', async () => {
      fixture = await mountPtr({ threshold: '64' });
      driveFrames();
      const refreshes: number[] = [];

      fixture.element.addEventListener('refresh', () => refreshes.push(1));

      drag(0, 100);
      await fixture.flush();
      fixture.element.refreshed();
      await fixture.flush();

      drag(0, 100, 2);
      await fixture.flush();

      expect(refreshes).toHaveLength(2);
      expect(phase()).toBe('refreshing');
    });
  });

  // ─── Threshold prop ──────────────────────────────────────────────────────────

  describe('Threshold', () => {
    it('honors a custom threshold', async () => {
      fixture = await mountPtr({ threshold: '120' });
      driveFrames();

      drag(0, 100);
      await fixture.flush();

      // 100 < 120: short of the custom threshold, so it snapped back.
      expect(phase()).toBe('idle');

      drag(0, 140, 2);
      await fixture.flush();

      expect(phase()).toBe('refreshing');
      expect(content().style.transform).toBe('translateY(120px)');
    });

    it('falls back to the default for a nonsensical threshold', async () => {
      fixture = await mountPtr({ threshold: '0' });
      driveFrames();

      drag(0, 100);
      await fixture.flush();

      // Default 64 applies: 100 commits, held at 64.
      expect(phase()).toBe('refreshing');
      expect(content().style.transform).toBe('translateY(64px)');
    });
  });
});
