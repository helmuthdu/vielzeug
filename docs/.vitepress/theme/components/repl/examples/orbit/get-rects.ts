export const getRectsExample = {
  code: `import { getRects } from '@vielzeug/orbit'

// getRects() reads the reference and floating rects from the DOM directly —
// useful for custom update loops that need raw measurements without running
// the full computePosition() pipeline.
const button = document.createElement('button')
button.textContent = 'Reference'
button.style.cssText = 'margin: 60px; padding: 8px 16px;'
document.body.appendChild(button)

const panel = document.createElement('div')
panel.textContent = 'Floating'
panel.style.cssText = 'position: fixed; left: 0; top: 0; background: #333; color: #fff; padding: 8px 12px; border-radius: 4px; font-size: 12px;'
document.body.appendChild(panel)

const { reference, floating } = getRects(button, panel)

console.log('Reference rect:', reference)
console.log('Floating rect:', floating)
console.log('Reference width x height:', reference.width, 'x', reference.height)`,
  name: 'getRects - Raw DOM Measurements',
};
