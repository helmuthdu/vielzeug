export const inlineMiddlewareExample = {
  code: `import { computePosition, flip, inline, shift } from '@vielzeug/orbit'

// inline() corrects the reference rect for multi-line inline elements.
// It picks the client rect closest to the cursor (or floating element).
const span = document.createElement('span')
span.textContent = 'Hover to reveal tooltip — this is a long inline element that may wrap'
span.style.cssText = 'line-height: 1.8; cursor: pointer; background: #f0f0f0; padding: 2px 4px; border-radius: 3px;'
document.body.appendChild(span)

const tooltip = document.createElement('div')
tooltip.textContent = 'inline() picks the nearest client rect'
tooltip.style.cssText = 'position: fixed; left: 0; top: 0; background: #1a1a2e; color: #e0e0ff; padding: 6px 10px; border-radius: 5px; font-size: 12px; pointer-events: none; z-index: 1000;'
tooltip.hidden = true
document.body.appendChild(tooltip)

let cursorX = 0
let cursorY = 0

span.addEventListener('mousemove', (e) => {
  cursorX = e.clientX
  cursorY = e.clientY
  tooltip.hidden = false

  const { x, y } = computePosition(span, tooltip, {
    placement: 'top',
    middleware: [inline({ x: cursorX, y: cursorY }), flip(), shift({ padding: 4 })],
  })
  tooltip.style.left = x + 'px'
  tooltip.style.top = y + 'px'
})

span.addEventListener('mouseleave', () => { tooltip.hidden = true })

console.log('Hover over the span to see inline() in action')`,
  name: 'inline - Multi-line Inline Reference',
};
