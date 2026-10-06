import { expect, test } from '../../testing/fixtures';

test.describe('Layout', () => {
  test('keeps a label-hidden header control at the trailing edge despite child margin resets', async ({
    page,
    refinePage,
  }) => {
    await refinePage.mountComponent(
      '<style>ore-select { margin: 0; }</style><ore-counter label="Damage" value="3" style="width:24rem"><ore-select slot="header-end" label="Stance" hide-label value="1" style="width:7rem"><option value="1">Stance 1</option><option value="2">Stance 2</option></ore-select></ore-counter>',
    );
    const bounds = await page.locator('ore-counter').evaluate((element) => {
      const header = element.shadowRoot!.querySelector('[part="header"]')!.getBoundingClientRect();
      const control = element.querySelector('ore-select')!.getBoundingClientRect();
      return { controlRight: control.right, controlTop: control.top, headerRight: header.right, headerTop: header.top };
    });
    expect(Math.abs(bounds.headerRight - bounds.controlRight)).toBeLessThanOrEqual(1);
    expect(bounds.controlTop).toBeGreaterThanOrEqual(bounds.headerTop);
    await expect(page.locator('ore-counter').getByRole('spinbutton', { name: 'Damage' })).toHaveAttribute(
      'aria-valuenow',
      '3',
    );
  });

  test('frost variant applies the glass surface treatment', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-counter color="error" variant="frost" label="Wounds" value="1" max="3"></ore-counter>',
    );

    const styles = await page.locator('ore-counter').evaluate((element) => {
      const counter = element.shadowRoot?.querySelector('.counter');

      if (!counter) throw new Error('Missing counter surface');

      const computed = getComputedStyle(counter);

      return {
        backdropFilter: computed.backdropFilter || computed.getPropertyValue('-webkit-backdrop-filter'),
        boxShadow: computed.boxShadow,
      };
    });

    expect(styles.backdropFilter).toContain('blur');
    expect(styles.boxShadow).not.toBe('none');
  });
});
