export const capacityCheckExample = {
  code: `import { encodeQr, qrCapacity, SigilCapacityError } from '@vielzeug/sigil'

// qrCapacity returns the payload limit per version/level/mode —
// characters for numeric/alphanumeric, bytes for byte mode.
for (const [v, ec, mode] of [
  [1, 'L', 'byte'],
  [1, 'M', 'byte'],
  [10, 'M', 'byte'],
  [40, 'L', 'byte'],
  [40, 'L', 'numeric'],
]) {
  console.log(\`v\${v}-\${ec} \${mode}: \${qrCapacity(v, ec, mode)}\`)
}

// Encoding beyond capacity throws SigilCapacityError with the numbers.
const payload = 'x'.repeat(qrCapacity(1, 'M', 'byte') + 1)
try {
  encodeQr(payload, { version: 1 })
} catch (e) {
  if (e instanceof SigilCapacityError) {
    console.log('capacity exceeded:', e.bytes, '>', e.maxBytes, 'at v' + e.version)
  }
}

// Without a pinned version the encoder just grows to the next fitting one
const auto = encodeQr(payload)
console.log('auto-picked version:', auto.version)`,
  name: 'Capacity Check',
};
