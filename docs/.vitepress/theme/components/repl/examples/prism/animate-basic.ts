export const animateBasicExample = {
  code: `// Animate SVG element attributes using the animate() utility
import { animate } from '@vielzeug/prism'

const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
svg.setAttribute('width', '400')
svg.setAttribute('height', '200')
svg.style.cssText = 'display:block;background:#f8fafc;border-radius:8px'
document.body.appendChild(svg)

// Create three bars starting at zero height
const bars = [
  { color: '#6366f1', targetH: 120, x: 60 },
  { color: '#22d3ee', targetH: 80,  x: 180 },
  { color: '#f59e0b', targetH: 140, x: 300 },
].map(({ color, targetH, x }) => {
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  rect.setAttribute('x', String(x))
  rect.setAttribute('y', '160')
  rect.setAttribute('width', '60')
  rect.setAttribute('height', '0')
  rect.setAttribute('fill', color)
  rect.setAttribute('rx', '4')
  svg.appendChild(rect)
  return { rect, targetH }
})

// Animate bars growing upward with stagger
const targets = bars.map(({ rect, targetH }) => ({
  attrs: { height: { from: 0, to: targetH }, y: { from: 160, to: 160 - targetH } },
  el: rect,
}))

animate(targets, { duration: 600, easing: 'ease-out', stagger: 80 })
  .then(() => console.log('Animation complete'))`,
  name: 'animate() — grow bars with stagger',
};
