import { expect, test } from '../../testing/fixtures';

test.describe('Interrupted motion', () => {
  test('keeps details open until the closing row transition completes', async ({ page, refinePage }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await refinePage.mountComponent(`
      <ore-accordion-item expanded>
        <span slot="title">Details</span>
        <p>Expandable content.</p>
      </ore-accordion-item>
    `);
    const state = await page.locator('ore-accordion-item').evaluate(async (host) => {
      const details = host.shadowRoot!.querySelector('details')!;
      const wrapper = host.shadowRoot!.querySelector<HTMLElement>('.content-wrapper')!;
      host.shadowRoot!.querySelector('summary')!.click();
      const row = wrapper.getAnimations().find((animation) => animation instanceof CSSTransition);
      if (!row) return { animating: false, openAfter: details.open, openDuring: details.open };
      const openDuring = details.open;
      await row.finished;
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      return { animating: true, openAfter: details.open, openDuring };
    });
    expect(state).toEqual({ animating: true, openAfter: false, openDuring: true });
  });

  test('honors reduced motion with customized accordion timing and remains keyboard operable', async ({
    page,
    refinePage,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await refinePage.mountComponent(`
      <ore-accordion-item style="--accordion-item-row-duration: 2s; --accordion-item-fade-duration: 2s; --accordion-item-fade-delay: 1s; --accordion-item-transition: 2s linear">
        <span slot="title">Details</span>
        <p>Expandable content.</p>
      </ore-accordion-item>
    `);
    const item = page.locator('ore-accordion-item');
    const summary = item.locator('summary');
    const timings = () =>
      item.evaluate((host) => {
        const shadow = host.shadowRoot!;
        return ['summary', '.content-wrapper', '.content-inner', '.chevron'].map((selector) => {
          const element = shadow.querySelector(selector);
          if (!element) throw new Error(`Missing ${selector}`);
          return getComputedStyle(element).transitionProperty;
        });
      });

    await expect.poll(timings).toEqual(['none', 'none', 'none', 'none']);
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(item).toHaveAttribute('expanded', '');
    await page.keyboard.press('Enter');
    await expect(item).not.toHaveAttribute('expanded', '');
    await page.locator('html').evaluate((root) => root.setAttribute('data-motion', 'full'));
    await expect
      .poll(timings)
      .toEqual(['background, border-color, color', 'grid-template-rows', 'opacity, transform', 'transform']);
  });

  test('reopens when activated during an in-flight close', async ({ page, refinePage }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await refinePage.mountComponent(`
      <ore-accordion-item expanded>
        <span slot="title">Details</span>
        <p>Expandable content.</p>
      </ore-accordion-item>
    `);

    const item = page.locator('ore-accordion-item');
    const summary = item.locator('summary');

    await summary.click();
    await summary.click();

    await item.evaluate(async (host) => {
      const details = host.shadowRoot?.querySelector('details');

      if (!details) throw new Error('Expected accordion details in its shadow root.');

      await Promise.allSettled(details.getAnimations({ subtree: true }).map((animation) => animation.finished));
    });

    await expect(item).toHaveAttribute('expanded', '');
    await expect(summary).toHaveAttribute('aria-expanded', 'true');
  });

  test('does not emit collapse after disconnecting during the close transition', async ({ page, refinePage }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await refinePage.mountComponent(`
      <ore-accordion-item expanded>
        <span slot="title">Details</span>
        <p>Expandable content.</p>
      </ore-accordion-item>
    `);

    const result = await page.locator('ore-accordion-item').evaluate(async (host) => {
      let collapseEmitted = false;
      host.addEventListener('collapse', () => {
        collapseEmitted = true;
      });

      const details = host.shadowRoot?.querySelector('details');
      const content = host.shadowRoot?.querySelector<HTMLElement>('.content-inner');
      const summary = host.shadowRoot?.querySelector('summary');

      if (!details || !content || !summary) throw new Error('Expected accordion controls in its shadow root.');

      summary.click();
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const transitions = content.getAnimations();
      host.remove();
      await Promise.resolve();

      return {
        collapseEmitted,
        transitionsCancelled:
          transitions.length > 0 && transitions.every((animation) => animation.playState === 'idle'),
      };
    });

    expect(result.transitionsCancelled).toBe(true);
    expect(result.collapseEmitted).toBe(false);
  });
});
