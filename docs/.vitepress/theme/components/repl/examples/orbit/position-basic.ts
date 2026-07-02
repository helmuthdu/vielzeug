export const positionBasicExample = {
  code: `import { computePosition } from '@vielzeug/orbit'

// Create reference and floating elements
const button = document.createElement('button')
button.textContent = 'Anchor'
button.style.cssText = 'padding: 8px 16px; margin: 50px;'
document.body.appendChild(button)

const tooltip = document.createElement('div')
tooltip.textContent = 'Tooltip'
tooltip.style.cssText = 'position: fixed; background: #333; color: #fff; padding: 8px 12px; border-radius: 4px; font-size: 12px; z-index: 1000;'
document.body.appendChild(tooltip)

// computePosition is sync and returns x/y/placement/middlewareData
function updatePosition() {
  const { x, y, placement } = computePosition(button, tooltip, {
    placement: 'top',
  })
  tooltip.style.left = x + 'px'
  tooltip.style.top = y + 'px'
  console.log(\`Positioned at \${placement}: (\${Math.round(x)}, \${Math.round(y)})\`)
}

button.addEventListener('click', updatePosition)
updatePosition()
console.log('Tooltip positioned relative to button')`,
  name: 'computePosition - Basic',
};
