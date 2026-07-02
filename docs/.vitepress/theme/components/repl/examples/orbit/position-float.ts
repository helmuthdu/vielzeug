export const floatExample = {
  code: `import { float, offset, flip, shift } from '@vielzeug/orbit'

const button = document.createElement('button')
button.textContent = 'Hover me'
button.style.cssText = 'margin: 100px; padding: 8px 16px;'
document.body.appendChild(button)

const tooltip = document.createElement('div')
tooltip.textContent = 'Tooltip with middleware'
tooltip.style.cssText = 'position: fixed; background: #1e293b; color: #fff; padding: 8px 12px; border-radius: 6px; font-size: 13px; pointer-events: none; display: none;'
document.body.appendChild(tooltip)

// float() returns a FloatHandle — call handle.dispose() to remove listeners
let handle = null

function show() {
  tooltip.style.display = 'block'
  handle = float(button, tooltip, {
    placement: 'top',
    middleware: [
      offset(8),             // 8px gap
      flip(),                // flip to bottom when no space above
      shift({ padding: 8 }), // stay inside viewport edges
    ],
    apply(result) {
      tooltip.style.left = result.x + 'px'
      tooltip.style.top = result.y + 'px'
      tooltip.dataset.placement = result.placement
      console.log('Placement:', result.placement)
    },
  })
}

function hide() {
  tooltip.style.display = 'none'
  handle?.dispose()
  handle = null
}

button.addEventListener('mouseenter', show)
button.addEventListener('mouseleave', hide)
button.addEventListener('focusin', show)
button.addEventListener('focusout', hide)

console.log('Hover the button to position the tooltip')`,
  name: 'float - With Middleware',
};
