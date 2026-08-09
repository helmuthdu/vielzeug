export const staggerExample = {
  code: `import { animateEach } from '@vielzeug/necromancer'

const panel = document.createElement('section')
panel.style.cssText = 'display: grid; gap: 12px; max-width: 320px; padding: 20px; border: 1px solid #cbd5e1; border-radius: 12px; background: #fff;'

const replay = document.createElement('button')
replay.textContent = 'Stagger cards'

const stack = document.createElement('div')
stack.style.cssText = 'display: grid; gap: 8px;'

const cards = ['First', 'Second', 'Third', 'Fourth'].map((label) => {
  const card = document.createElement('div')
  card.textContent = label
  card.style.cssText = 'padding: 12px; border-radius: 8px; color: #fff; background: #0891b2; font: 600 14px system-ui;'
  stack.appendChild(card)
  return card
})

const status = document.createElement('output')
status.textContent = 'Ready'

panel.append(replay, stack, status)
document.body.appendChild(panel)

function run() {
  const group = animateEach(
    cards,
    (_card, index) => [
      { opacity: 0, transform: 'translateY(' + (16 + index * 2) + 'px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    { duration: 240, easing: 'ease-out', stagger: 70, fill: 'both' },
  )
  status.textContent = 'Staggering ' + group.handles.length + ' cards'
  group.results.then(() => {
    status.textContent = 'All cards settled'
  })
}

replay.addEventListener('click', run)
`,
  name: 'animateEach() - Stagger a Group',
};
