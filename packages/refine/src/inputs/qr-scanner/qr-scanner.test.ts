import { type Fixture, mount } from '@vielzeug/ore/testing';
import type { QrScanner, QrScannerStatus, QrScanResult, SigilEvent } from '@vielzeug/sigil';
import { SigilPermissionError, SigilUnsupportedError } from '@vielzeug/sigil';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { QrScannerFactory } from './qr-scanner';

type FakeBehavior = { startError?: Error; scanValue?: string };

function fakeScanner(behavior: FakeBehavior = {}): QrScanner & { start: ReturnType<typeof vi.fn> } {
  const taps = new Set<(event: SigilEvent) => void>();
  const handlers = new Set<(result: QrScanResult) => void>();
  let status: QrScannerStatus = 'idle';

  const setStatus = (next: QrScannerStatus): void => {
    status = next;
    for (const tap of [...taps]) tap({ status: next, type: 'status-change' });
  };

  const scanner = {
    disposalSignal: new AbortController().signal,
    dispose: vi.fn(() => {
      scanner.disposed = true;
    }),
    disposed: false,
    onResult: (handler: (result: QrScanResult) => void) => {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    start: vi.fn(async () => {
      if (behavior.startError) throw behavior.startError;
      setStatus('starting');
      setStatus('scanning');
      if (behavior.scanValue !== undefined) {
        for (const handler of [...handlers]) handler({ value: behavior.scanValue });
        setStatus('stopped');
      }
    }),
    get status() {
      return status;
    },
    stop: vi.fn(() => setStatus('stopped')),
    tap: (handler: (event: SigilEvent) => void) => {
      taps.add(handler);
      return () => taps.delete(handler);
    },
    [Symbol.dispose]() {
      scanner.dispose();
    },
  };

  return scanner as QrScanner & { start: ReturnType<typeof vi.fn> };
}

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

async function mountScanner(
  behavior: FakeBehavior = {},
  attrs: Record<string, string> = {},
  html = '',
): Promise<{ fixture: Fixture<HTMLElement>; scanner: ReturnType<typeof fakeScanner>; factory: QrScannerFactory }> {
  const scanner = fakeScanner(behavior);
  const factory: QrScannerFactory = vi.fn(() => scanner);
  const fixture = await mount('ore-qr-scanner', { attrs, html, props: { scannerFactory: factory } });
  return { factory, fixture, scanner };
}

describe('ore-qr-scanner', () => {
  let fixture: Fixture<HTMLElement> | undefined;

  beforeAll(async () => {
    await import('./qr-scanner');
  });

  afterEach(() => {
    fixture?.dispose();
    fixture = undefined;
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders a labelled region with a live status line and Start control', async () => {
      ({ fixture } = await mountScanner({}, { label: 'Pairing scanner' }));

      const root = fixture.element.shadowRoot!;
      expect(root.querySelector('[part="wrapper"]')?.getAttribute('role')).toBe('region');
      expect(root.querySelector('[part="wrapper"]')?.getAttribute('aria-label')).toBe('Pairing scanner');
      expect(root.querySelector('[part="status"]')?.getAttribute('role')).toBe('status');
      expect(root.querySelector('video')).toBeTruthy();
      expect(root.querySelector('ore-button')?.textContent?.trim()).toBe('Start camera');
    });

    it('hides the video until scanning starts', async () => {
      ({ fixture } = await mountScanner());

      const video = fixture.element.shadowRoot!.querySelector('video')!;

      expect(video.hasAttribute('hidden')).toBe(true);
      expect(video.getAttribute('playsinline')).not.toBeNull();
      expect(video.getAttribute('muted')).not.toBeNull();
    });
  });

  describe('Interaction', () => {
    it('starts the camera via the internal Start control and emits status', async () => {
      const mounted = await mountScanner();
      fixture = mounted.fixture;
      const statuses: string[] = [];
      fixture.element.addEventListener('status', (e) => statuses.push((e as CustomEvent).detail.status));

      fixture.element.shadowRoot!.querySelector('ore-button')!.click();
      await tick();

      expect(mounted.scanner.start).toHaveBeenCalledOnce();
      expect(statuses).toContain('scanning');
      const video = fixture.element.shadowRoot!.querySelector('video')!;
      expect(video.hasAttribute('hidden')).toBe(false);
      expect(fixture.element.shadowRoot!.querySelector('[part="viewfinder"]')!.hasAttribute('hidden')).toBe(false);
    });

    it('stops scanning via the Stop control', async () => {
      const mounted = await mountScanner();
      fixture = mounted.fixture;
      fixture.element.shadowRoot!.querySelector('ore-button')!.click();
      await tick();

      fixture.element.shadowRoot!.querySelector('ore-button')!.click();
      await tick();

      expect(mounted.scanner.stop).toHaveBeenCalled();
    });

    it('starts automatically when active is set', async () => {
      const mounted = await mountScanner({}, { active: 'true' });
      fixture = mounted.fixture;
      await tick();

      expect(mounted.scanner.start).toHaveBeenCalledOnce();
    });

    it('emits scan and lands on the result state when once', async () => {
      const mounted = await mountScanner({ scanValue: 'mesh://offer/abc' });
      fixture = mounted.fixture;
      const scans: string[] = [];
      fixture.element.addEventListener('scan', (e) => scans.push((e as CustomEvent).detail.value));

      fixture.element.setAttribute('active', '');
      await tick();

      expect(scans).toEqual(['mesh://offer/abc']);
      const state = fixture.element.shadowRoot!.querySelector('[part="state"]');
      expect(state?.getAttribute('data-state')).toBe('result');
      expect(fixture.element.shadowRoot!.querySelector('ore-button')!.textContent!.trim()).toBe('Scan again');
    });
  });

  describe('Error states', () => {
    it('renders the denied state on permission errors and emits error', async () => {
      const mounted = await mountScanner({ startError: new SigilPermissionError('Camera permission denied') });
      fixture = mounted.fixture;
      const errors: unknown[] = [];
      fixture.element.addEventListener('error', (e) => errors.push((e as CustomEvent).detail.error));

      fixture.element.setAttribute('active', '');
      await tick();

      const state = fixture.element.shadowRoot!.querySelector('[part="state"]');
      expect(state?.getAttribute('data-state')).toBe('denied');
      expect(errors.length).toBe(1);
      expect(fixture.element.shadowRoot!.querySelector('ore-button')!.textContent!.trim()).toBe('Retry');
    });

    it('renders the unsupported state and slot on unsupported errors', async () => {
      const mounted = await mountScanner(
        { startError: new SigilUnsupportedError('BarcodeDetector is not available') },
        {},
        '<input slot="unsupported" />',
      );
      fixture = mounted.fixture;

      fixture.element.setAttribute('active', '');
      await tick();

      const state = fixture.element.shadowRoot!.querySelector('[part="state"]');
      expect(state?.getAttribute('data-state')).toBe('unsupported');
      // The fallback slot replaces the state icon/text; controls are hidden.
      expect(fixture.element.shadowRoot!.querySelector('slot[name="unsupported"]')).toBeTruthy();
      expect(fixture.element.shadowRoot!.querySelector('[part="controls"]')).toBeFalsy();
    });

    it('retries after a failed start', async () => {
      const mounted = await mountScanner({ startError: new SigilPermissionError('denied') });
      fixture = mounted.fixture;
      fixture.element.setAttribute('active', '');
      await tick();
      expect(fixture.element.shadowRoot!.querySelector('[part="state"]')?.getAttribute('data-state')).toBe('denied');

      mounted.scanner.start.mockImplementation(async () => {});
      fixture.element.shadowRoot!.querySelector('ore-button')!.click();
      await tick();

      expect(mounted.scanner.start).toHaveBeenCalledTimes(2);
    });
  });

  describe('Lifecycle', () => {
    it('rebuilds the scanner when facing-mode changes', async () => {
      const mounted = await mountScanner({}, { active: 'true' });
      fixture = mounted.fixture;
      await tick();
      const first = mounted.scanner;

      fixture.element.setAttribute('facing-mode', 'user');
      await tick();

      expect(first.dispose).toHaveBeenCalled();
      expect(mounted.factory).toHaveBeenCalledTimes(2);
      // The new scanner picks up the running intent.
      const second = (mounted.factory as ReturnType<typeof vi.fn>).mock.results[1].value;
      expect(second.start).toHaveBeenCalledOnce();
    });

    it('disposes the scanner on disconnect', async () => {
      const mounted = await mountScanner();
      fixture = mounted.fixture;

      fixture.dispose();
      fixture = undefined;

      expect(mounted.scanner.dispose).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has no axe violations in the idle state', async () => {
      ({ fixture } = await mountScanner());

      const results = await axeCheck(fixture.element);
      expect(results.violations).toEqual([]);
    });
  });
});
