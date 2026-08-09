export const flipExample = {
  code: `import { captureLayout } from '@vielzeug/necromancer'

const panel = document.createElement('section')
panel.style.cssText = 'display: grid; gap: 12px; max-width: 320px; padding: 20px; border: 1px solid #cbd5e1; border-radius: 12px; background: #fff;'

const reorder = document.createElement('button')
reorder.textContent = 'Move last item to top'

const list = document.createElement('div')
list.style.cssText = 'display: grid; gap: 8px;'

const items = ['Alpha', 'Beta', 'Gamma'].map((label) => {
  const wrapper = document.createElement('div')
  const content = document.createElement('div')
  content.textContent = label
  content.style.cssText = 'padding: 12px; border-radius: 8px; color: #fff; background: #ea580c; font: 600 14px system-ui;'
  wrapper.dataset.id = label
  wrapper.appendChild(content)
  list.appendChild(wrapper)
  return wrapper
})

const status = document.createElement('output')
status.textContent = 'Ready to reorder'

panel.append(reorder, list, status)
document.body.appendChild(panel)

reorder.addEventListener('click', () => {
  const transition = captureLayout(items, {
    getKey: (item) => item.dataset.id!,
  })
  const last = items.pop()
  if (!last) return

  items.unshift(last)
  const replacements = items.map((item) => item.cloneNode(true) as HTMLDivElement)
  list.replaceChildren(...replacements)
  items.splice(0, items.length, ...replacements)

  const group = transition.animate({
    duration: 260,
    easing: 'ease-out',
    elements: replacements,
  })
  status.textContent = 'Animating layout change'
  group.results.then(() => {
    status.textContent = 'FLIP animation finished'
  })
})`,
  name: 'captureLayout() - FLIP Reorder',
};
