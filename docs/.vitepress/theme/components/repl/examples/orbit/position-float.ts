export const positionerExample = {
  code: `import { createPositioner, offset, flip, shift } from '@vielzeug/orbit'

const button = document.createElement('button')
button.textContent = 'Hover me'
button.style.cssText = 'margin: 100px; padding: 8px 16px;'
document.body.appendChild(button)

const tooltip = document.createElement('div')
tooltip.textContent = 'Tooltip with middleware'
tooltip.style.cssText = 'position: fixed; background: #1e293b; color: #fff; padding: 8px 12px; border-radius: 6px; font-size: 13px; pointer-events: none; display: none;'
document.body.appendChild(tooltip)

let positioner = null

function show() {
  tooltip.style.display = 'block'
  positioner?.dispose()
  positioner = createPositioner(button, tooltip, {
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    placement: 'top',
  })
  positioner.start()
  console.log('Placement:', positioner.getPosition()?.placement)
}

function hide() {
  tooltip.style.display = 'none'
  positioner?.dispose()
  positioner = null
}

button.addEventListener('mouseenter', show)
button.addEventListener('mouseleave', hide)

console.log('Hover the button to position the tooltip')`,
  name: 'createPositioner - With Middleware',
};
