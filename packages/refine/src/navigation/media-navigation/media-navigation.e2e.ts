import { axeCheck, expect, test } from '../../testing/fixtures';

test.describe('Interaction', () => {
  test('keeps 50 items compact and keyboard focus follows the moving window', async ({ page, refinePage }) => {
    for (const width of [390, 1280]) {
      await page.setViewportSize({ height: 844, width });
      await refinePage.mountComponent(
        '<ore-media-navigation count="50" active-index="8" label="Browse deck"></ore-media-navigation>',
      );
      const navigation = page.locator('ore-media-navigation');
      await navigation.evaluate((el) =>
        el.addEventListener('navigate', (event) =>
          el.setAttribute('active-index', String((event as CustomEvent<{ index: number }>).detail.index)),
        ),
      );
      await expect(navigation.locator('[part="indicator"]')).toHaveCount(7);
      const bar = await navigation.boundingBox();
      expect(bar!.width).toBeLessThanOrEqual(250);
      expect(bar!.height).toBeLessThanOrEqual(60);
      await page.getByRole('button', { exact: true, name: 'Go to item 9' }).focus();
      await page.keyboard.press('ArrowRight');
      await expect(page.getByRole('button', { exact: true, name: 'Go to item 10' })).toBeFocused();
      await page.keyboard.press('End');
      await expect(page.getByRole('button', { exact: true, name: 'Go to item 50' })).toBeFocused();
      await expect(navigation).toHaveAttribute('active-index', '49');
      await expect(navigation.locator('[part="indicator"]')).toHaveCount(7);
      await navigation.evaluate((el) => el.setAttribute('max-indicators', '5'));
      await expect(navigation.locator('[part="indicator"]')).toHaveCount(5);
      await expect(page.getByRole('button', { exact: true, name: 'Go to item 50' })).toBeFocused();
      await page.keyboard.press('Home');
      await expect(page.getByRole('button', { exact: true, name: 'Go to item 1' })).toBeFocused();
      await page.getByRole('button', { name: 'Next item' }).click();
      await expect(page.getByRole('button', { name: 'Next item' })).toBeFocused();
      expect((await axeCheck(page)).violations).toEqual([]);
    }
  });

  test('animates indicators entering the window when it slides', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-media-navigation count="50" active-index="5"></ore-media-navigation>');
    const navigation = page.locator('ore-media-navigation');
    await expect(navigation.locator('[part="indicator"]')).toHaveCount(7);
    // Window [2..8] slides to [1..7]: dot 1 enters, dot 8 leaves, the active dot stays centered.
    await navigation.evaluate((el) => el.setAttribute('active-index', '4'));
    await expect(navigation.locator('[part="indicator"]')).toHaveCount(7);
    await expect(navigation.locator('[part="indicator"][data-index="8"]')).toHaveCount(0);
    const entering = navigation.locator('[part="indicator"][data-index="1"]');
    await expect(entering).toHaveCount(1);
    expect(await entering.evaluate((el) => getComputedStyle(el).animationName)).toContain(
      'media-navigation-indicator-in',
    );
  });

  test('shifts indicator progress from the previous to the current item', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-media-navigation count="3" active-index="0"></ore-media-navigation>');
    const navigation = page.locator('ore-media-navigation');
    const previous = navigation.locator('[part="indicator"][data-index="0"]');
    const current = navigation.locator('[part="indicator"][data-index="1"]');
    await expect(previous.locator('ore-progress')).toHaveAttribute('value', '100');
    await expect(current.locator('ore-progress')).toHaveAttribute('value', '0');
    // Choreography: the previous pill holds its width while the fill drains, then collapses;
    // the new pill widens first and its fill rises after the expansion.
    const choreography = await navigation.evaluate(async (el) => {
      el.setAttribute('active-index', '1');
      const root = el.shadowRoot!;
      const previousDot = root.querySelector<HTMLElement>('.indicator[data-index="0"]')!;
      const currentDot = root.querySelector<HTMLElement>('.indicator[data-index="1"]')!;
      for (let frame = 0; frame < 2; frame++) await new Promise<number>(requestAnimationFrame);
      for (const animation of root.getAnimations({ subtree: true })) animation.pause();
      const fillOf = (dot: HTMLElement) =>
        dot.querySelector('ore-progress')!.shadowRoot!.querySelector('[part="fill"]')!;
      return {
        current: currentDot.getBoundingClientRect().width,
        currentFill: fillOf(currentDot).getBoundingClientRect().width,
        previous: previousDot.getBoundingClientRect().width,
        previousFill: fillOf(previousDot).getBoundingClientRect().width,
      };
    });
    // Previous: still full width, fill mid-drain. Current: widening, fill not yet risen.
    expect(choreography.previous).toBeGreaterThan(31);
    expect(choreography.previousFill).toBeGreaterThan(0);
    expect(choreography.previousFill).toBeLessThan(31);
    expect(choreography.current).toBeGreaterThan(8);
    expect(choreography.current).toBeLessThan(32);
    expect(choreography.currentFill).toBeLessThan(1);
    const settled = await navigation.evaluate(async (el) => {
      await Promise.allSettled(
        el.shadowRoot!.getAnimations({ subtree: true }).map((animation) => (animation.play(), animation.finished)),
      );
      const dot = (index: string) =>
        el.shadowRoot!.querySelector<HTMLElement>(`.indicator[data-index="${index}"]`)!.getBoundingClientRect().width;
      return { current: dot('1'), previous: dot('0') };
    });
    expect(settled.previous).toBe(8);
    expect(settled.current).toBe(32);
    await expect(current).toHaveClass(/indicator-active/);
    await expect(previous).not.toHaveClass(/indicator-active/);
  });

  test('leads backward moves with the previous pill collapsing leftward', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-media-navigation count="3" active-index="1"></ore-media-navigation>');
    const navigation = page.locator('ore-media-navigation');
    await navigation.evaluate((el) => el.setAttribute('active-index', '0'));
    const choreography = await navigation.evaluate(async (el) => {
      const root = el.shadowRoot!;
      for (let frame = 0; frame < 2; frame++) await new Promise<number>(requestAnimationFrame);
      for (const animation of root.getAnimations({ subtree: true })) animation.pause();
      const dot = (index: string) =>
        root.querySelector<HTMLElement>(`.indicator[data-index="${index}"]`)!.getBoundingClientRect().width;
      const fill = (index: string) =>
        root
          .querySelector(`.indicator[data-index="${index}"]`)!
          .querySelector('ore-progress')!
          .shadowRoot!.querySelector('[part="fill"]')!
          .getBoundingClientRect().width;
      return {
        current: dot('0'),
        movingBack: root.querySelector<HTMLElement>('[part="bar"]')!.className.includes('indicator-moving-back'),
        previous: dot('1'),
        previousFill: fill('1'),
      };
    });
    // Two frames in of a backward move: the old pill holds its width while the fill drains and the
    // new slot has not started widening, so no layout motion points rightward.
    expect(choreography.movingBack).toBe(true);
    expect(choreography.previous).toBeGreaterThan(31);
    expect(choreography.previousFill).toBeGreaterThan(0);
    expect(choreography.previousFill).toBeLessThan(31);
    expect(choreography.current).toBeLessThan(8.5);
    await expect(navigation.locator('[part="indicator"][data-index="0"]')).toHaveClass(/indicator-active/);
  });

  test('does not replay the entrance when backward staging clears', async ({ page, refinePage }) => {
    // The staging animation lives in a custom-property slot so that clearing the staging
    // classes cancels the finished animation instead of swapping animation-name back to the
    // entrance keyframes, which would make the leaving dot blink after the move settled.
    await refinePage.mountComponent('<ore-media-navigation count="3" active-index="1"></ore-media-navigation>');
    const navigation = page.locator('ore-media-navigation');
    await navigation.evaluate((el) => el.setAttribute('active-index', '0'));
    await page.waitForTimeout(900);
    const state = await navigation.evaluate((el) => {
      const leaving = el.shadowRoot!.querySelector<HTMLElement>('.indicator[data-index="1"]')!;
      return {
        cleared: !leaving.className.includes('indicator-leaving'),
        opacity: Number(getComputedStyle(leaving).opacity),
        running: leaving.getAnimations().filter((animation) => animation.playState === 'running').length,
      };
    });
    expect(state.cleared).toBe(true);
    expect(state.running).toBe(0);
    expect(state.opacity).toBe(1);
  });

  test('keeps backward staging identical when the indicator window slides', async ({ page, refinePage }) => {
    // Large collections re-insert every indicator on a backward window slide, so the
    // choreography must come from keyframes rather than transitions.
    await refinePage.mountComponent('<ore-media-navigation count="200" active-index="102"></ore-media-navigation>');
    const navigation = page.locator('ore-media-navigation');
    await navigation.evaluate((el) => el.setAttribute('active-index', '101'));
    const choreography = await navigation.evaluate(async (el) => {
      const root = el.shadowRoot!;
      for (let frame = 0; frame < 2; frame++) await new Promise<number>(requestAnimationFrame);
      for (const animation of root.getAnimations({ subtree: true })) animation.pause();
      // offsetWidth ignores the entrance scale transform that plays on remounted dots.
      const dot = (index: string) => root.querySelector<HTMLElement>(`.indicator[data-index="${index}"]`)!.offsetWidth;
      const fill = (index: string) =>
        root
          .querySelector(`.indicator[data-index="${index}"]`)!
          .querySelector('ore-progress')!
          .shadowRoot!.querySelector('[part="fill"]')!
          .getBoundingClientRect().width;
      return { current: dot('101'), leaving: dot('102'), previousFill: fill('102') };
    });
    expect(choreography.leaving).toBe(32);
    expect(choreography.previousFill).toBeGreaterThan(0);
    expect(choreography.previousFill).toBeLessThan(31);
    expect(choreography.current).toBe(8);
    await expect(navigation.locator('[part="indicator"][data-index="101"]')).toHaveClass(/indicator-active/);
  });

  test('uses a smaller configurable window in a narrow container', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 740, width: 320 });
    await refinePage.mountComponent(
      '<ore-media-navigation count="50" active-index="25" max-indicators="5"></ore-media-navigation>',
    );
    const navigation = page.locator('ore-media-navigation');
    await expect(navigation.locator('[part="indicator"]')).toHaveCount(5);
    expect((await navigation.boundingBox())!.height).toBeLessThanOrEqual(60);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test('requests changes and waits for the owner to update its index', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-media-navigation count="3" label="Browse cards"></ore-media-navigation>');
    const navigation = page.locator('ore-media-navigation');
    await navigation.evaluate((el) =>
      el.addEventListener('navigate', (event) =>
        el.setAttribute('data-requested', String((event as CustomEvent<{ index: number }>).detail.index)),
      ),
    );
    await page.getByRole('button', { name: 'Next item' }).click();
    await expect(navigation).toHaveAttribute('data-requested', '1');
    await expect(page.getByRole('button', { name: 'Go to item 1' })).toHaveAttribute('aria-current', 'true');
    await navigation.evaluate((el) => el.setAttribute('active-index', '1'));
    await expect(page.getByRole('button', { name: 'Go to item 2' })).toHaveAttribute('aria-current', 'true');
  });

  test('owns vertical keyboard navigation and looping', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-media-navigation count="3" orientation="vertical" loop></ore-media-navigation>',
    );
    await page
      .locator('ore-media-navigation')
      .evaluate((el) =>
        el.addEventListener('navigate', (event) =>
          el.setAttribute('active-index', String((event as CustomEvent<{ index: number }>).detail.index)),
        ),
      );
    await page.getByRole('button', { name: 'Go to item 1' }).focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('button', { name: 'Go to item 2' })).toBeFocused();
    await page.keyboard.press('End');
    await expect(page.getByRole('button', { name: 'Go to item 3' })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('button', { name: 'Go to item 1' })).toBeFocused();
  });

  test('renders progress without advancing the owner-controlled index', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-media-navigation count="3" active-index="0" progress-duration="250"></ore-media-navigation>',
    );
    const fill = page.locator('ore-media-navigation .indicator-active ore-progress [part="fill"]');
    await expect(fill).toBeVisible();
    expect(await fill.evaluate((el) => getComputedStyle(el).animationName)).toBe('media-navigation-fill');
    await fill.evaluate(async (el) => {
      await Promise.all(el.getAnimations().map((animation) => animation.finished));
    });
    await expect(page.locator('ore-media-navigation')).toHaveAttribute('active-index', '0');
  });
});

test.describe('Accessibility', () => {
  test('keeps decorative progress out of the accessibility tree', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-media-navigation count="3" label="Browse cards"></ore-media-navigation>');
    await expect(page.getByRole('group', { name: 'Browse cards' })).toBeVisible();
    await expect(page.getByRole('progressbar')).toHaveCount(0);
    expect((await axeCheck(page)).violations).toEqual([]);
  });
});
