import { expect, test } from '../testing/fixtures';

test('switches themes instantly through nested shadow roots without disabling later transitions', async ({
  page,
  refinePage,
}) => {
  await refinePage.mountComponent('<div id="scope"><div id="host"></div></div><div id="outside"></div>');
  const result = await page.evaluate(async () => {
    const { Refine } = window as typeof window & { Refine: typeof import('../theme') };
    const scope = document.querySelector<HTMLElement>('#scope')!;
    const outside = document.querySelector<HTMLElement>('#outside')!;
    const shadow = document.querySelector('#host')!.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<div id="nested"></div>';
    const inner = shadow.querySelector('#nested')!.attachShadow({ mode: 'open' });
    inner.innerHTML = `<style>
      .surface { color: light-dark(black, white); transition: color 10s; }
      .surface::before { content: "Palette"; color: light-dark(black, white); transition: color 10s; }
    </style><span class="surface">Content</span>`;
    scope.style.transition = 'color 10s';
    scope.style.color = 'light-dark(black, white)';
    outside.style.transition = 'opacity 10s';
    outside.style.opacity = '1';
    const theme = Refine.createThemeController({ initial: 'light', root: scope });
    void scope.offsetHeight;
    await new Promise(requestAnimationFrame);
    outside.style.opacity = '0.5';
    void outside.offsetHeight;
    theme.setPreference('dark');
    const surface = inner.querySelector<HTMLElement>('.surface')!;
    const afterSwitch = {
      color: getComputedStyle(surface).color,
      duration: getComputedStyle(surface).transitionDuration,
      marker: scope.hasAttribute('data-theme-switching'),
      outsideTransitions: outside.getAnimations().length,
      pseudoColor: getComputedStyle(surface, '::before').color,
      temporaryStyles: inner.querySelectorAll('style').length,
      transitions: scope.getAnimations().length + inner.getAnimations().length,
    };
    surface.style.color = 'red';
    void surface.offsetHeight;
    const laterTransitions = surface.getAnimations().length;
    theme.dispose();
    return { ...afterSwitch, laterTransitions };
  });
  expect(result).toEqual({
    color: 'rgb(255, 255, 255)',
    duration: '10s',
    laterTransitions: 1,
    marker: false,
    outsideTransitions: 1,
    pseudoColor: 'rgb(255, 255, 255)',
    temporaryStyles: 1,
    transitions: 0,
  });
});
