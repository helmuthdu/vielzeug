import { expect, test } from '../../testing/fixtures';

test.describe('Swipe dismissal', () => {
  test('follows a reversing fling and cancels when a second touch appears', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-toast style="--toast-exit-duration: 600ms"></ore-toast>');
    const result = await page.evaluate(async () => {
      const runtime = (window as Window & { Refine?: typeof import('../../register') }).Refine;
      if (!runtime) throw new Error('Refine bundle did not load');
      const root = document.querySelector('.frame')!;
      const service = runtime.components.feedback.createToastService(root);
      service.add({ duration: 0, id: 'fling', message: 'Swipe me' });
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const host = root.querySelector('ore-toast')!;
      const wrapper = host.shadowRoot!.querySelector<HTMLElement>('.toast-wrapper')!;
      const inner = wrapper.querySelector<HTMLElement>('.toast-inner')!;
      const originalNow = performance.now.bind(performance);
      let clock = 0;
      Object.defineProperty(performance, 'now', { configurable: true, value: () => clock });
      const pointer = (type: string, x: number, pointerId = 1) =>
        wrapper.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            button: 0,
            clientX: x,
            composed: true,
            isPrimary: pointerId === 1,
            pointerId,
            pointerType: 'touch',
          }),
        );
      try {
        pointer('pointerdown', 200);
        clock = 20;
        pointer('pointermove', 280);
        pointer('pointerdown', 280, 2);
        const canceled = inner.style.transform === '';
        pointer('pointerup', 280);
        clock = 200;
        pointer('pointerdown', 200);
        clock = 300;
        pointer('pointermove', 400);
        clock = 320;
        pointer('pointermove', 260);
        pointer('pointerup', 260);
        return { canceled, transform: inner.style.transform };
      } finally {
        Object.defineProperty(performance, 'now', { configurable: true, value: originalNow });
        service.dispose();
      }
    });
    expect(result).toEqual({ canceled: true, transform: 'translateX(-120%)' });
  });
});
