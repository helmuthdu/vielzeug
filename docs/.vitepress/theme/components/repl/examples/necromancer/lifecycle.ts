export const lifecycleExample = {
  code: `import { animate } from '@vielzeug/necromancer'

const panel = document.createElement('section')
panel.style.cssText = 'display: grid; gap: 12px; max-width: 320px; padding: 20px; border: 1px solid #cbd5e1; border-radius: 12px; background: #fff;'

const card = document.createElement('div')
card.textContent = 'Lifecycle-owned animation'
card.style.cssText = 'padding: 18px; border-radius: 8px; color: #fff; background: #2563eb; font: 600 16px system-ui;'

const replay = document.createElement('button')
replay.textContent = 'Replay animation'

const status = document.createElement('output')
status.textContent = 'Ready'

panel.append(card, replay, status)
document.body.appendChild(panel)

let current

function run() {
  current?.dispose('replayed')
  current = animate(
    card,
    [
      { opacity: 0, transform: 'translateY(14px) scale(.96)' },
      { opacity: 1, transform: 'translateY(0) scale(1)' },
    ],
    { duration: 280, easing: 'ease-out', fill: 'both' },
  )
  status.textContent = 'Animating…'
  current.result.then((result) => {
    status.textContent = result.status === 'finished' ? 'Finished — handle remains disposable' : result.status === 'reduced' ? 'Finished with reduced timing' : 'Cancelled'
  })
}

replay.addEventListener('click', run)
`,
  name: 'animate() - Lifecycle Handle',
};
