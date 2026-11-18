export const motionExample = {
  code: `import { setMotionMode } from '@vielzeug/refine'

const modes = ['system', 'reduced', 'full'] as const
const panel = document.createElement('section')
panel.style.cssText = 'display:grid;gap:var(--size-4);max-width:var(--size-128)'
panel.innerHTML = \`
  <div role="group" aria-label="Motion mode" style="display:flex;flex-wrap:wrap;gap:var(--size-2)">
    <ore-button data-motion-mode="system">System</ore-button>
    <ore-button data-motion-mode="reduced" variant="outline">Reduced</ore-button>
    <ore-button data-motion-mode="full" variant="outline">Full</ore-button>
  </div>
  <p id="motion-status" role="status"></p>
  <ore-accordion-item>
    <span slot="title">Expand to preview a transition</span>
    <p>Motion follows the mode selected above.</p>
  </ore-accordion-item>
  <ore-carousel label="Motion previews" autoplay autoplay-interval="4000" style="height:var(--size-48)">
    <ore-carousel-slide style="display:grid;place-items:center;background:var(--color-contrast-100)">
      Slide one
    </ore-carousel-slide>
    <ore-carousel-slide style="display:grid;place-items:center;background:var(--color-contrast-200)">
      Slide two
    </ore-carousel-slide>
    <ore-carousel-slide style="display:grid;place-items:center;background:var(--color-contrast-300)">
      Slide three
    </ore-carousel-slide>
  </ore-carousel>
\`
document.body.append(panel)

const status = panel.querySelector<HTMLElement>('#motion-status')
const buttons = [...panel.querySelectorAll<HTMLElement>('[data-motion-mode]')]
if (!status) throw new Error('Expected the motion mode status.')

const applyMode = (mode: (typeof modes)[number]) => {
  setMotionMode(mode)
  status.textContent = \`Motion mode: \${mode}.\`
  for (const button of buttons) {
    button.setAttribute('variant', button.dataset.motionMode === mode ? 'solid' : 'outline')
  }
}

for (const button of buttons) {
  button.addEventListener('click', () => {
    const mode = modes.find((candidate) => candidate === button.dataset.motionMode)
    if (!mode) throw new Error('Expected a supported motion mode.')
    applyMode(mode)
  })
}

applyMode('system')`,
  name: 'Motion mode',
};
