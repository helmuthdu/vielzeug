export const paletteBasicExample = {
  code: `import { contrastRatio, mix, parseColor, ramp, readableOn, toHex } from '@vielzeug/palette'

const brand = parseColor('#3366cc')
const surface = parseColor('rgb(248 250 252)')

const hover = mix(brand, surface, 0.5)
console.log('hover', toHex(hover))

const ink = readableOn(surface, [parseColor('#94a3b8'), parseColor('#0f172a')])
console.log('ink', ink ? toHex(ink) : null)
console.log('contrast', contrastRatio(surface, ink ?? brand).toFixed(2))

console.log('ramp', ramp(brand, { steps: 5 }).map(toHex).join(' '))`,
  name: 'Basics - parse, mix, contrast, ramp',
};
