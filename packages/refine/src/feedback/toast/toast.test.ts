import { delay, fireClick, retry } from '@vielzeug/assay';
import { type Fixture, mount } from '@vielzeug/ore/testing';

import { createToastService } from './toast';

const completeExit = async (fixture: Fixture<HTMLElement>, flush: () => Promise<void>) => {
  fixture
    .query<HTMLElement>('.toast-inner.exiting')
    ?.dispatchEvent(new TransitionEvent('transitionend', { bubbles: true }));
  await flush();
};

const getCloseButton = (fixture: Fixture<HTMLElement>): HTMLElement | null =>
  fixture.query<HTMLElement>('ore-alert')?.shadowRoot?.querySelector<HTMLElement>('[part="close"]') ?? null;

describe('ore-toast', () => {
  let fixture: Fixture<HTMLElement>;
  let service: ReturnType<typeof createToastService>;

  beforeAll(async () => {
    await import('../alert/alert');
    await import('./toast');
  });

  beforeEach(async () => {
    fixture = await mount('ore-toast');
    service = createToastService(fixture.element.parentElement!);
  });

  afterEach(() => {
    service?.dispose();
    fixture?.dispose();
  });

  it('is a declarative host without public mutation methods', () => {
    expect('add' in fixture.element).toBe(false);
    expect('clear' in fixture.element).toBe(false);
    expect('dismiss' in fixture.element).toBe(false);
    expect('update' in fixture.element).toBe(false);
  });

  it('renders the service store in polite and assertive live regions', async () => {
    service.add({ duration: 0, message: 'Saved' });
    service.add({ color: 'error', duration: 0, message: 'Failed' });
    await fixture.flush();

    expect(fixture.query('[aria-live="polite"] ore-alert')?.textContent).toContain('Saved');
    expect(fixture.query('[aria-live="assertive"] ore-alert')?.textContent).toContain('Failed');
  });

  it('renders configured host attributes declaratively', () => {
    expect(fixture.element.getAttribute('position')).toBe('bottom-right');
    expect(fixture.element.getAttribute('max')).toBe('5');
  });

  it('dismisses from the service after the exit transition', async () => {
    const dismissed = vi.fn();
    const id = service.add({ duration: 0, message: 'Dismiss me', onDismiss: dismissed });

    await fixture.flush();

    service.dismiss(id);
    await fixture.flush();
    expect(fixture.query('.toast-inner.exiting')).toBeTruthy();

    await completeExit(fixture, fixture.flush);

    expect(fixture.query(`[data-toast-id="${id}"]`)).toBeNull();
    expect(dismissed).toHaveBeenCalledOnce();
  });

  it('allows the alert close button to dismiss through its bound store', async () => {
    service.add({ duration: 0, message: 'Closable' });
    await fixture.flush();

    fireClick(getCloseButton(fixture)!);
    await fixture.flush();
    await completeExit(fixture, fixture.flush);

    expect(fixture.query('ore-alert')).toBeNull();
  });

  it('evicts the oldest notification when the scoped service max is reached', async () => {
    service.dispose();

    fixture.dispose();

    fixture = await mount('ore-toast', { attrs: { max: '1' } });

    service = createToastService(fixture.element.parentElement!);

    const first = service.add({ duration: 0, message: 'First' });

    service.add({ duration: 0, message: 'Second' });
    await fixture.flush();

    expect(fixture.query(`[data-toast-id="${first}"] .toast-inner.exiting`)).toBeTruthy();
  });

  it('pauses service-owned timers on hover and resumes them afterward', async () => {
    service.add({ duration: 40, message: 'Read me' });

    await fixture.flush();

    const container = fixture.element.shadowRoot!.querySelector('.toast-container')!;

    container.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));

    await delay(80);

    expect(fixture.query('ore-alert')).toBeTruthy();

    container.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));

    await delay(80);

    await completeExit(fixture, fixture.flush);
    expect(fixture.query('ore-alert')).toBeNull();
  });

  it('dismisses a toast after a committed swipe', async () => {
    const originalMatchMedia = window.matchMedia;

    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    const id = service.add({ duration: 0, message: 'Swipe me' });

    await fixture.flush();

    const wrapper = fixture.query<HTMLElement>(`[data-toast-id="${id}"]`)!;

    const inner = wrapper.querySelector<HTMLElement>('.toast-inner')!;

    wrapper.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 0, pointerId: 1 }));
    wrapper.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 300, pointerId: 1 }));
    inner.dispatchEvent(new TransitionEvent('transitionend', { bubbles: true, propertyName: 'transform' }));
    await fixture.flush();

    expect(fixture.query(`[data-toast-id="${id}"]`)).toBeNull();

    window.matchMedia = originalMatchMedia;
  });

  it('passes axe checks', async () => {
    const results = await axeCheck(fixture.element);

    expect(results.violations).toHaveLength(0);
  });
});

describe('createToastService', () => {
  let container: HTMLElement;

  beforeAll(async () => {
    await import('../alert/alert');
    await import('./toast');
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('reuses one scoped store and declarative host per root', async () => {
    const fixture = await mount('ore-toast', { container });

    const first = createToastService(container);

    const second = createToastService(container);

    const id = first.add({ duration: 0, message: 'Scoped' });

    await fixture.flush();

    expect(second).toBe(first);
    expect(container.querySelectorAll('ore-toast')).toHaveLength(1);
    expect(fixture.query(`[data-toast-id="${id}"]`)).toBeTruthy();
    fixture.dispose();
  });

  it('isolates services and notifications by scope', async () => {
    const other = document.createElement('div');

    document.body.appendChild(other);

    const fixtureA = await mount('ore-toast', { container });

    const fixtureB = await mount('ore-toast', { container: other });

    const idA = createToastService(container).add({ duration: 0, message: 'A' });

    const idB = createToastService(other).add({ duration: 0, message: 'B' });

    await fixtureA.flush();
    await fixtureB.flush();

    expect(fixtureA.query(`[data-toast-id="${idA}"]`)).toBeTruthy();
    expect(fixtureA.query(`[data-toast-id="${idB}"]`)).toBeNull();
    expect(fixtureB.query(`[data-toast-id="${idB}"]`)).toBeTruthy();
    other.remove();
    fixtureA.dispose();
    fixtureB.dispose();
  });

  it('applies configuration before lazily creating its host', () => {
    const service = createToastService(container);

    service.configure({ max: 3, position: 'top-left' });

    service.add({ duration: 0, message: 'Configured' });

    const host = container.querySelector('ore-toast')!;

    expect(host.getAttribute('max')).toBe('3');
    expect(host.getAttribute('position')).toBe('top-left');
  });

  it('cleans up timers and subscriptions when disposed', async () => {
    const fixture = await mount('ore-toast', { container });

    const service = createToastService(container);

    service.add({ duration: 1000, message: 'Pending' });

    await fixture.flush();

    service.dispose();
    await fixture.flush();

    expect(service.disposed).toBe(true);
    expect(service.disposalSignal.aborted).toBe(true);
    expect(fixture.query('ore-alert')).toBeNull();
    fixture.dispose();
  });
});

describe('toast service shortcuts and promises', () => {
  let fixture: Fixture<HTMLElement>;
  let service: ReturnType<typeof createToastService>;

  beforeAll(async () => {
    await import('../alert/alert');
    await import('./toast');
  });

  beforeEach(async () => {
    fixture = await mount('ore-toast');

    service = createToastService(fixture.element.parentElement!);
  });

  afterEach(() => {
    service?.dispose();
    fixture?.dispose();
  });

  it.each([
    ['success', 'success'],
    ['error', 'error'],
    ['info', 'info'],
    ['warning', 'warning'],
  ] as const)('%s shortcut uses the %s colour', async (shortcut, color) => {
    service[shortcut]('Message', { duration: 0 });
    await fixture.flush();

    expect(fixture.query('ore-alert')?.getAttribute('color')).toBe(color);
  });

  it('updates its loading toast when a promise resolves', async () => {
    const result = service.promise(Promise.resolve('file'), {
      error: 'Failed',
      loading: 'Uploading',
      success: (file) => `Uploaded ${file}`,
    });

    await result;
    await fixture.flush();

    await retry(() => {
      expect(fixture.query('ore-alert')?.textContent).toContain('Uploaded file');
    });
    expect(fixture.query('ore-alert')?.getAttribute('color')).toBe('success');
  });
});
