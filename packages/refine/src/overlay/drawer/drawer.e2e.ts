import { axeCheck, expect, test, touchSwipe } from '../../testing/fixtures';

test.describe('Content touch gestures', () => {
  test.use({ hasTouch: true, viewport: { height: 844, width: 390 } });

  for (const dir of ['ltr', 'rtl'] as const) {
    for (const placement of ['bottom', 'top', 'right', 'left'] as const) {
      for (const handlePlacement of ['inset', 'outside'] as const) {
        test(`drags the enlarged ${handlePlacement} handle on ${placement} in ${dir}`, async ({ page, refinePage }) => {
          await page.emulateMedia({ reducedMotion: 'reduce' });
          await refinePage.mountComponent(
            `<ore-drawer default-open label="Drawer" placement="${placement}" dir="${dir}" size="sm" drag-handle-placement="${handlePlacement}" swipe-from-content="false"></ore-drawer>`,
          );
          const dialog = page.locator('ore-drawer dialog');
          await expect(dialog).toBeVisible();
          const panel = (await page.locator('ore-drawer [part="panel"]').boundingBox())!;
          const horizontal = placement === 'left' || placement === 'right';
          const closesPositive = horizontal ? (placement === 'right') !== (dir === 'rtl') : placement === 'bottom';
          const edge = horizontal
            ? closesPositive
              ? panel.x
              : panel.x + panel.width
            : closesPositive
              ? panel.y
              : panel.y + panel.height;
          const distance = handlePlacement === 'inset' ? 16 : 40;
          const coordinate = edge + (closesPositive ? -distance : distance);
          const from = horizontal
            ? { x: coordinate, y: panel.y + panel.height / 2 }
            : { x: panel.x + panel.width / 2, y: coordinate };
          expect(
            await page.locator('ore-drawer').evaluate((element, point) => {
              return element.shadowRoot?.elementFromPoint(point.x, point.y)?.getAttribute('part');
            }, from),
          ).toBe('drag-handle');
          const delta = closesPositive ? 140 : -140;
          const to = horizontal ? { x: from.x + delta, y: from.y } : { x: from.x, y: from.y + delta };
          await touchSwipe(page, { from, to });
          await expect(dialog).toBeHidden();
        });
      }
    }
  }

  for (const dir of ['ltr', 'rtl']) {
    for (const placement of ['bottom', 'top', 'right', 'left']) {
      test(`dismisses ${placement} in ${dir} from its scroll boundary`, async ({ page, refinePage }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await refinePage.mountComponent(
          `<ore-drawer default-open label="Reading" placement="${placement}" dir="${dir}">
            <div style="width:1200px;height:1200px">Scrollable reading content</div>
          </ore-drawer>`,
        );
        const body = page.locator('ore-drawer [part="body"]');
        await body.evaluate(
          (element, { placement, dir }) => {
            if (placement === 'bottom') element.scrollTop = 60;
            if (placement === 'top') element.scrollTop = element.scrollHeight - element.clientHeight - 60;
            if (placement === 'left' || placement === 'right') {
              const closesRight = (placement === 'right') !== (dir === 'rtl');
              const max = element.scrollWidth - element.clientWidth;
              element.scrollLeft = dir === 'rtl' ? (closesRight ? -max + 60 : -60) : closesRight ? 60 : max - 60;
            }
          },
          { dir, placement },
        );
        const bounds = (await body.boundingBox())!;
        const from = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
        const dx = placement === 'right' ? 100 : placement === 'left' ? -100 : 0;
        const dy = placement === 'bottom' ? 100 : placement === 'top' ? -100 : 0;
        const to = { x: from.x + dx * (dir === 'rtl' ? -1 : 1), y: from.y + dy };
        await touchSwipe(page, { from, to });
        await expect(page.locator('ore-drawer dialog')).toBeVisible();
        await expect
          .poll(() =>
            body.evaluate(
              (element, { placement, dir }) => {
                if (placement === 'bottom') return element.scrollTop;
                if (placement === 'top') return element.scrollHeight - element.clientHeight - element.scrollTop;
                const max = element.scrollWidth - element.clientWidth;
                const position = dir === 'rtl' ? max + element.scrollLeft : element.scrollLeft;
                return (placement === 'right') !== (dir === 'rtl') ? position : max - position;
              },
              { dir, placement },
            ),
          )
          .toBeLessThan(1);
        await touchSwipe(page, { from, to });

        await expect(page.locator('ore-drawer dialog')).toBeHidden();
      });
    }
  }

  test('keeps native scrolling and requires a fresh swipe after reaching the boundary', async ({
    page,
    refinePage,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await refinePage.mountComponent(
      '<ore-drawer default-open label="Reading" placement="bottom" size="lg"><div style="height:2000px">Long content</div></ore-drawer>',
    );
    const body = page.locator('ore-drawer [part="body"]');
    await body.evaluate((element) => {
      element.scrollTop = 90;
    });
    const bounds = (await body.boundingBox())!;
    const from = { x: bounds.x + bounds.width / 2, y: bounds.y + 80 };
    const to = { x: from.x, y: from.y + 220 };
    await touchSwipe(page, { from, to });

    await expect.poll(() => body.evaluate((element) => element.scrollTop)).toBe(0);
    await expect(page.locator('ore-drawer dialog')).toBeVisible();
    expect(await page.locator('ore-drawer [part="panel"]').evaluate((element) => element.style.transform)).toBe('');

    await touchSwipe(page, { from, to });
    await expect(page.locator('ore-drawer dialog')).toBeHidden();
  });

  test('gives a nested scroller priority before allowing a fresh boundary swipe', async ({ page, refinePage }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await refinePage.mountComponent(
      '<ore-drawer default-open label="Nested" placement="bottom" size="lg"><div id="nested" style="height:220px;overflow:auto"><div style="height:1000px">Nested reading content</div></div></ore-drawer>',
    );
    const nested = page.locator('#nested');
    await nested.evaluate((element) => {
      element.scrollTop = 60;
    });
    const bounds = (await nested.boundingBox())!;
    const from = { x: bounds.x + 100, y: bounds.y + 30 };
    const to = { x: from.x, y: from.y + 150 };
    await touchSwipe(page, { from, to });

    await expect.poll(() => nested.evaluate((element) => element.scrollTop)).toBe(0);
    await expect(page.locator('ore-drawer dialog')).toBeVisible();

    await touchSwipe(page, { from, to });
    await expect(page.locator('ore-drawer dialog')).toBeHidden();
  });

  test('preserves vertical scrolling in side drawers', async ({ page, refinePage }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await refinePage.mountComponent(
      '<ore-drawer default-open label="Reading" placement="right"><div style="height:2000px">Long content</div></ore-drawer>',
    );
    const body = page.locator('ore-drawer [part="body"]');
    const bounds = (await body.boundingBox())!;
    const from = { x: bounds.x + 100, y: bounds.y + 300 };
    await touchSwipe(page, { from, to: { x: from.x, y: from.y - 180 } });

    expect(await body.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await expect(page.locator('ore-drawer dialog')).toBeVisible();
  });

  test('respects reversed flex scrollers with negative scroll offsets', async ({ page, refinePage }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await refinePage.mountComponent(
      '<ore-drawer default-open label="Chat" placement="bottom" size="lg"><div id="chat" style="height:220px;display:flex;flex-direction:column-reverse;overflow:auto"><div style="height:1000px;flex-shrink:0">Messages</div></div></ore-drawer>',
    );
    const chat = page.locator('#chat');
    await chat.evaluate((element) => {
      element.addEventListener('scrollend', () => element.setAttribute('data-scroll-ended', ''), { once: true });
    });
    const bounds = (await chat.boundingBox())!;
    const from = { x: bounds.x + 100, y: bounds.y + 30 };
    const to = { x: from.x, y: from.y + 120 };
    await touchSwipe(page, { from, to });
    expect(await chat.evaluate((element) => element.scrollTop)).toBeLessThan(0);
    await expect(page.locator('ore-drawer dialog')).toBeVisible();
    await expect(chat).toHaveAttribute('data-scroll-ended', '');

    await chat.evaluate((element) => {
      element.scrollTop = -element.scrollHeight;
    });
    expect(await chat.evaluate((element) => element.scrollTop + element.scrollHeight - element.clientHeight)).toBe(0);
    await touchSwipe(page, { from, to });
    await expect(page.locator('ore-drawer dialog')).toBeHidden();
  });

  test('restores the panel after the platform cancels an owned touch drag', async ({ page, refinePage }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await refinePage.mountComponent(
      '<ore-drawer default-open label="Reading" placement="bottom" size="lg"><div style="height:2000px">Long content</div></ore-drawer>',
    );
    const bounds = (await page.locator('ore-drawer [part="body"]').boundingBox())!;
    const from = { x: bounds.x + 100, y: bounds.y + 60 };
    const session = await page.context().newCDPSession(page);
    try {
      await session.send('Input.dispatchTouchEvent', { touchPoints: [from], type: 'touchStart' });
      await session.send('Input.dispatchTouchEvent', {
        touchPoints: [{ x: from.x, y: from.y + 100 }],
        type: 'touchMove',
      });
      expect(await page.locator('ore-drawer [part="panel"]').evaluate((element) => element.style.transform)).not.toBe(
        '',
      );
      await session.send('Input.dispatchTouchEvent', { touchPoints: [], type: 'touchCancel' });
    } finally {
      await session.detach();
    }

    await expect(page.locator('ore-drawer dialog')).toBeVisible();
    await expect
      .poll(() => page.locator('ore-drawer [part="panel"]').evaluate((element) => element.style.transform))
      .toBe('');
  });

  test('keeps native pinch zoom available over content', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-drawer default-open label="Reading" placement="bottom" size="lg"><p>Reading content</p></ore-drawer>',
    );
    const bounds = (await page.locator('ore-drawer [part="body"]').boundingBox())!;
    const session = await page.context().newCDPSession(page);
    try {
      await session.send('Input.synthesizePinchGesture', {
        gestureSourceType: 'touch',
        scaleFactor: 1.5,
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
      });
    } finally {
      await session.detach();
    }
    await expect.poll(() => page.evaluate(() => window.visualViewport!.scale)).toBeGreaterThan(1);
    await expect(page.locator('ore-drawer dialog')).toBeVisible();
  });

  test('preserves content interactions and supports subtree and drawer opt-outs', async ({ page, refinePage }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await refinePage.mountComponent(
      '<ore-drawer default-open label="Reading" placement="bottom" size="lg"><button style="height:120px;width:100%">Action</button><div data-no-swipe style="height:120px">Custom gesture</div><p style="height:120px">Reading</p></ore-drawer>',
    );
    for (const target of [page.getByRole('button', { exact: true, name: 'Action' }), page.locator('[data-no-swipe]')]) {
      const bounds = (await target.boundingBox())!;
      const from = { x: bounds.x + 80, y: bounds.y + 10 };
      await touchSwipe(page, { from, to: { x: from.x, y: from.y + 100 } });
      await expect(page.locator('ore-drawer dialog')).toBeVisible();
    }
    await page.locator('ore-drawer').evaluate((element) => element.setAttribute('swipe-from-content', 'false'));
    const bounds = (await page.locator('ore-drawer p').boundingBox())!;
    const from = { x: bounds.x + 80, y: bounds.y + 10 };
    await touchSwipe(page, { from, to: { x: from.x, y: from.y + 100 } });
    await expect(page.locator('ore-drawer dialog')).toBeVisible();
  });
});

test.describe('Interaction', () => {
  test('insets the drag handle by default for every placement', async ({ page, refinePage }) => {
    const placements = ['left', 'right', 'top', 'bottom'] as const;
    const drawers = placements
      .flatMap((placement) => [
        `<ore-drawer default-open label="Inset ${placement}" placement="${placement}"></ore-drawer>`,
        `<ore-drawer default-open label="Outside ${placement}" placement="${placement}" drag-handle-placement="outside"></ore-drawer>`,
      ])
      .join('');
    await refinePage.mountComponent(drawers);

    const offsets = await page.locator('ore-drawer').evaluateAll((elements) => {
      const handleSide = { bottom: 'top', left: 'right', right: 'left', top: 'bottom' };

      return elements.map((element) => {
        const handle = element.shadowRoot?.querySelector<HTMLElement>('[part="drag-handle"]');
        const side = handleSide[element.getAttribute('placement') as keyof typeof handleSide];

        if (!handle || !side) throw new Error('Expected each drawer to have a drag handle and placement.');

        return Math.abs(Number.parseFloat(getComputedStyle(handle).getPropertyValue(side)));
      });
    });

    expect(offsets).toHaveLength(placements.length * 2);
    for (let index = 0; index < offsets.length; index += 2) {
      expect(offsets[index]).toBeLessThan(offsets[index + 1]!);
    }
  });

  test('content-sized sheets fit short content and scroll long content', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 844, width: 390 });
    await refinePage.mountComponent(
      '<ore-drawer default-open placement="bottom" size="content" title="Reading"><p>Short content.</p><ore-button slot="footer">Done</ore-button></ore-drawer>',
    );
    const panel = page.locator('ore-drawer [part="panel"]');
    await expect(panel).toBeVisible();
    expect((await panel.boundingBox())!.height).toBeLessThan(300);
    await page.locator('ore-drawer > p').evaluate((el) => (el.textContent = 'Long rules. '.repeat(600)));
    await expect.poll(async () => (await panel.boundingBox())!.height).toBeLessThanOrEqual(796);
    const body = page.locator('ore-drawer .body');
    expect(await body.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    await expect(page.getByRole('button', { name: 'Done' })).toBeInViewport();
  });

  test('content marked data-drawer-close closes the drawer', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-drawer default-open label="Task drawer" title="Tasks"><p>Pick a task to continue.</p><ore-button data-drawer-close>Close task</ore-button></ore-drawer>',
    );

    await expect(page.locator('ore-drawer dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Close task' }).click();
    await expect(page.locator('ore-drawer dialog')).toBeHidden();
  });

  test('a close-only header carries no divider; a titled header keeps one', async ({ page, refinePage }) => {
    // A title-less header means neither `title` nor `label` (`label` is also
    // the visible header title), leaving only the close button.
    await refinePage.mountComponent('<ore-drawer default-open><p>Bare content.</p></ore-drawer>');

    const header = page.locator('ore-drawer [part="header"]');

    await expect(header).toBeVisible();
    expect(await header.evaluate((el) => getComputedStyle(el).borderBottomWidth)).toBe('0px');

    await refinePage.mountComponent('<ore-drawer default-open title="Inbox"><p>Mail.</p></ore-drawer>');

    expect(await header.evaluate((el) => getComputedStyle(el).borderBottomWidth)).not.toBe('0px');
  });

  test('opens inside an allow-scripts-only iframe', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<iframe sandbox="allow-scripts" title="Preview"></iframe>');

    await page.evaluate(() => {
      const scripts = Array.from(document.scripts, (script) => `<script>${script.textContent}</script>`).join('');
      const styles = Array.from(
        document.head.querySelectorAll('style'),
        (style) => `<style>${style.textContent}</style>`,
      ).join('');
      const iframe = document.querySelector('iframe')!;

      iframe.srcdoc = `<html><head>${styles}</head><body><ore-button id="open-drawer">Open drawer</ore-button><ore-drawer id="drawer" label="Preview drawer"><p>Drawer content</p></ore-drawer><script>document.getElementById('open-drawer').addEventListener('click', () => document.getElementById('drawer').setAttribute('open', ''))</script><script>const nativeShowModal = HTMLDialogElement.prototype.showModal;HTMLDialogElement.prototype.showModal = function () { try { nativeShowModal.call(this); } catch {} if (!this.open) this.setAttribute('open', ''); };new MutationObserver((records) => { for (const { target } of records) { if (target instanceof HTMLElement && target.tagName === 'ORE-DRAWER') target.shadowRoot?.querySelector('dialog')?.setAttribute('open', ''); } }).observe(document, { attributes: true, attributeFilter: ['open'], subtree: true });</script>${scripts}</body></html>`;
    });

    const preview = page.frameLocator('iframe[title="Preview"]');

    await preview.locator('#drawer').evaluate(() => customElements.whenDefined('ore-drawer'));
    await preview.getByRole('button', { name: 'Open drawer' }).click();
    await page.waitForTimeout(50);

    const drawer = await preview.locator('#drawer').evaluate((element) => {
      const dialog = element.shadowRoot?.querySelector('dialog');
      const rect = dialog?.getBoundingClientRect();

      return { height: rect?.height ?? 0, open: dialog?.open, width: rect?.width ?? 0 };
    });

    expect(drawer.open).toBe(true);
    expect(drawer.width).toBeGreaterThan(0);
    expect(drawer.height).toBeGreaterThan(0);
  });
});

test.describe('Accessibility', () => {
  test('open drawer passes axe checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-drawer default-open label="Preview drawer"><p>Drawer content</p></ore-drawer>',
    );

    await expect(page.locator('ore-drawer').locator('dialog')).toBeVisible();

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });
});
