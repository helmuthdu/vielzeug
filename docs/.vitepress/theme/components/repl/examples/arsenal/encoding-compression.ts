export const encodingCompressionExample = {
  code: `import { base64UrlToBytes, bytesToBase64Url, compressBytes, decompressBytes } from '@vielzeug/arsenal'

const text = JSON.stringify({ notes: 'An expedition through Alborea. '.repeat(20) })
const original = new TextEncoder().encode(text)
const code = bytesToBase64Url(await compressBytes(original))
const restored = await decompressBytes(base64UrlToBytes(code), { maxOutputBytes: 8192 })

console.log('Original bytes:', original.length)
console.log('Compressed code characters:', code.length)
console.log('Matches original:', new TextDecoder('utf-8', { fatal: true }).decode(restored) === text)`,
  name: 'compressBytes - Bounded share payload compression',
};
