export const autoUpdateExample = {
  code: `import { autoUpdate, computePosition, flip, offset, shift } from '@vielzeug/orbit'

const button = document.createElement('button')
button.textContent = 'Reference'
button.style.cssText = 'position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); padding: 8px 16px;'
document.body.appendChild(button)

const dropdown = document.createElement('div')
dropdown.textContent = 'Dropdown'
// position: fixed with left: 0; top: 0 so left/top writes are absolute viewport coords
dropdown.style.cssText = 'position: fixed; left: 0; top: 0; background: #fff; border: 1px solid #e5e5e5; border-radius: 6px; padding: 12px 16px; box-shadow: 0 4px 12px rgba(0,0,0,.1); z-index: 1000;'
document.body.appendChild(dropdown)

const middleware = [offset(4), flip(), shift({ padding: 8 })]

function update() {
  const { x, y, placement } = computePosition(button, dropdown, {
    placement: 'bottom-start',
    middleware,
  })
  dropdown.style.left = x + 'px'
  dropdown.style.top = y + 'px'
  dropdown.dataset.placement = placement
  console.log('Positioned:', placement)
}

// autoUpdate calls update immediately then re-calls on scroll/resize/mutation
const cleanup = autoUpdate(button, dropdown, update)

console.log('autoUpdate running — try resizing the window')
console.log('cleanup type (call to stop):', typeof cleanup)`,
  name: 'autoUpdate - Track on Scroll/Resize',
};
