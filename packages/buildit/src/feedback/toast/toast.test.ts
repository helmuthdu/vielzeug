import { type Fixture, mount, waitFor } from '@vielzeug/craftit/testing';

import type { ToastItem } from './toast';

describe('bit-toast', () => {
  let fixture: Fixture<HTMLElement & { add(toast: ToastItem): string; dismiss(id: string): void }>;

  beforeAll(async () => {
    await import('./toast');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('renders toast container with live region', async () => {
      fixture = await mount('bit-toast');

      expect(fixture.query('[role="region"]')).toBeTruthy();
    });

    it('live region has aria-live polite', async () => {
      fixture = await mount('bit-toast');

      expect(fixture.query('[aria-live]')?.getAttribute('aria-live')).toBe('polite');
    });

    it('live region has accessible label', async () => {
      fixture = await mount('bit-toast');

      expect(fixture.query('[aria-label]')?.getAttribute('aria-label')).toBe('Notifications');
    });
  });

  describe('Props', () => {
    it('applies position attribute', async () => {
      fixture = await mount('bit-toast', { attrs: { position: 'top-left' } });

      expect(fixture.element.getAttribute('position')).toBe('top-left');
    });

    it('applies max attribute', async () => {
      fixture = await mount('bit-toast', { attrs: { max: '3' } });

      expect(fixture.element.getAttribute('max')).toBe('3');
    });
  });

  describe('Push Method', () => {
    it('shows toast item after push', async () => {
      fixture = (await mount('bit-toast')) as typeof fixture;

      const el = fixture.element as HTMLElement & { add(toast: ToastItem): void };

      el.add({ message: 'Test notification' });
      await fixture.flush();

      await waitFor(() => {
        expect(fixture.query('bit-alert')?.textContent?.trim()).toContain('Test notification');
      });
    });

    it('shows body text of toast', async () => {
      fixture = (await mount('bit-toast')) as typeof fixture;

      const el = fixture.element as HTMLElement & { add(toast: ToastItem): void };

      el.add({ message: 'Something happened' });
      await fixture.flush();

      await waitFor(() => {
        expect(fixture.query('bit-alert')?.textContent?.trim()).toContain('Something happened');
      });
    });

    it('does not leave active toasts stuck in exiting state on rapid remove + add', async () => {
      fixture = (await mount('bit-toast')) as typeof fixture;

      const el = fixture.element as HTMLElement & { add(toast: ToastItem): string; dismiss(id: string): void };

      const id1 = el.add({ duration: 0, message: 'First' });
      const id2 = el.add({ duration: 0, message: 'Second' });

      await fixture.flush();

      el.dismiss(id1);

      const id3 = el.add({ duration: 0, message: 'Third' });

      await fixture.flush();

      const exiting = fixture.query<HTMLElement>(`[data-toast-id="${id1}"]`);

      exiting?.dispatchEvent(new Event('animationend'));
      await fixture.flush();

      const second = fixture.query<HTMLElement>(`[data-toast-id="${id2}"]`);
      const third = fixture.query<HTMLElement>(`[data-toast-id="${id3}"]`);

      expect(second?.classList.contains('exiting')).toBe(false);
      expect(third?.classList.contains('exiting')).toBe(false);
    });
  });

  describe('Positions', () => {
    for (const position of ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right']) {
      it(`accepts ${position} position`, async () => {
        fixture = await mount('bit-toast', { attrs: { position } });

        expect(fixture.element.getAttribute('position')).toBe(position);
        fixture.destroy();
      });
    }
  });
});

describe('bit-toast accessibility', () => {
  let fixture: Awaited<ReturnType<typeof mount>>;

  beforeAll(async () => {
    await import('./toast');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Live Region', () => {
    it('container has role region', async () => {
      fixture = await mount('bit-toast');

      expect(fixture.query('[role="region"]')).toBeTruthy();
    });

    it('has aria-live polite', async () => {
      fixture = await mount('bit-toast');

      expect(fixture.query('[aria-live]')?.getAttribute('aria-live')).toBe('polite');
    });

    it('has aria-relevant additions removals', async () => {
      fixture = await mount('bit-toast');

      const region = fixture.query('[aria-live]');

      expect(region?.getAttribute('aria-relevant')).toBe('additions removals');
    });

    it('has aria-atomic false for individual updates', async () => {
      fixture = await mount('bit-toast');

      const region = fixture.query('[aria-live]');

      expect(region?.getAttribute('aria-atomic')).toBe('false');
    });

    it('region has accessible label Notifications', async () => {
      fixture = await mount('bit-toast');

      expect(fixture.query('[aria-label]')?.getAttribute('aria-label')).toBe('Notifications');
    });
  });

  describe('Toast Items', () => {
    it('pushed toast is announced in live region', async () => {
      fixture = await mount('bit-toast');

      const el = fixture.element as HTMLElement & { add(toast: ToastItem): void };

      el.add({ message: 'Success!' });
      await fixture.flush();

      await waitFor(() => {
        expect(fixture.query('bit-alert')?.textContent?.trim()).toContain('Success!');
      });
    });
  });
});
