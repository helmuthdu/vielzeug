export const reducedMotionExample = {
  code: `import { animate } from '@vielzeug/necromancer'

const panel = document.createElement('section')
panel.style.cssText = 'display: grid; gap: 12px; max-width: 320px; padding: 20px; border: 1px solid #cbd5e1; border-radius: 12px; background: #fff;'

const card = document.createElement('div')
card.textContent = 'Motion preference'
card.style.cssText = 'padding: 18px; border-radius: 8px; color: #fff; background: #7c3aed; font: 600 16px system-ui;'

const systemButton = document.createElement('button')
systemButton.textContent = 'Animate with system preference'

const skipButton = document.createElement('button')
skipButton.textContent = 'Use reduced motion'

const status = document.createElement('output')
status.textContent = 'Choose a mode'

panel.append(card, systemButton, skipButton, status)
document.body.appendChild(panel)

function run(motion) {
  const handle = animate(
    card,
    [
      { opacity: 0, transform: 'translateX(-18px)' },
      { opacity: 1, transform: 'translateX(0)' },
    ],
    { duration: 320, easing: 'ease-out', motion, fill: 'both' },
  )
  status.textContent = 'Running with motion: ' + motion
  handle.result.then((result) => {
    status.textContent = result.status === 'reduced' ? 'Keyframes finished with reduced timing' : 'Finished'
  })
}

systemButton.addEventListener('click', () => run('system'))
skipButton.addEventListener('click', () => run('reduced'))`,
  name: 'motion - Reduced Motion',
};
