export const encodeSvgExample = {
  code: `import { encodeQr, toSvg } from '@vielzeug/sigil'

// The encoder picks the most compact mode, smallest version, and best mask.
const matrix = encodeQr('https://vielzeug.dev', { errorCorrection: 'M' })
console.log('version:', matrix.version, '| size:', matrix.size, 'modules | mode:', matrix.mode)

// toSvg returns a complete <svg> string — works in Node (no DOM needed).
// dark defaults to currentColor so the code themes with CSS.
const svg = toSvg(matrix, { label: 'Vielzeug link' })
console.log(svg.slice(0, 120) + '…')
console.log('svg bytes:', svg.length)

// Longer payloads bump the version automatically
const bigger = encodeQr('https://vielzeug.dev/sigil/examples/pair-two-devices')
console.log('longer payload → version:', bigger.version, '| size:', bigger.size)`,
  name: 'Encode to SVG',
};
