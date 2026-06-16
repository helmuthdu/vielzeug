export const presetsExample = {
  code: `import { float } from '@vielzeug/orbit'
import { tooltip, dropdown, popover, contextMenu } from '@vielzeug/orbit/presets'

// Presets are pre-configured middleware stacks for common UI patterns.
// Each factory returns { placement, middleware } — spread directly into float().

// --- tooltip() ---
const tooltipPreset = tooltip()
console.log('tooltip placement:', tooltipPreset.placement)
console.log('tooltip middleware count:', tooltipPreset.middleware.length)

// Customise placement and offset:
const topTooltip = tooltip({ placement: 'top', offset: 12 })
console.log('custom tooltip placement:', topTooltip.placement)

// --- dropdown() ---
const dropdownPreset = dropdown()
console.log('dropdown placement:', dropdownPreset.placement)

const wideDropdown = dropdown({ offset: 8, padding: 6 })
console.log('wide dropdown middleware count:', wideDropdown.middleware.length)

// --- popover() ---
const popoverPreset = popover()
console.log('popover placement:', popoverPreset.placement)

// --- contextMenu() ---
const menuPreset = contextMenu()
console.log('contextMenu placement:', menuPreset.placement)

const menuTopStart = contextMenu({ placement: 'top-start' })
console.log('contextMenu custom placement:', menuTopStart.placement)

// --- Spread a preset into float() ---
const trigger = document.createElement('button')
trigger.textContent = 'Hover me'
trigger.style.cssText = 'margin: 80px; padding: 8px 16px;'
document.body.appendChild(trigger)

const tip = document.createElement('div')
tip.textContent = 'tooltip()'
tip.style.cssText = 'position: fixed; background: #1e293b; color: #fff; padding: 6px 10px; border-radius: 6px; font-size: 13px; display: none;'
document.body.appendChild(tip)

let handle = null

trigger.addEventListener('mouseenter', () => {
  tip.style.display = 'block'
  handle = float(trigger, tip, tooltip())
})
trigger.addEventListener('mouseleave', () => {
  tip.style.display = 'none'
  handle?.dispose()
  handle = null
})

console.log('Hover the button to see tooltip() in action')`,
  name: 'presets - Ready-made Middleware Stacks',
};
