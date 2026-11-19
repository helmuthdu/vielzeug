import { expect, test } from '../../testing/fixtures';

test.describe('Interrupted motion', () => {
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
