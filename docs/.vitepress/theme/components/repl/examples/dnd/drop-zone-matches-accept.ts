export const dropZoneMatchesAcceptExample = {
  code: `import { matchesAccept } from '@vielzeug/dnd'

// matchesAccept tests a File against an accept pattern list
const png = new File([''], 'photo.png', { type: 'image/png' })
const pdf = new File([''], 'report.pdf', { type: 'application/pdf' })
const txt = new File([''], 'readme.txt', { type: 'text/plain' })

console.log('--- MIME wildcard ---')
console.log('image/* matches photo.png:', matchesAccept(png, ['image/*']))  // true
console.log('image/* matches report.pdf:', matchesAccept(pdf, ['image/*'])) // false

console.log('--- File extension ---')
console.log('.pdf matches report.pdf:', matchesAccept(pdf, ['.pdf']))  // true
console.log('.PDF matches report.pdf:', matchesAccept(pdf, ['.PDF']))  // true — case-insensitive
console.log('.pdf matches photo.png:', matchesAccept(png, ['.pdf']))   // false

console.log('--- Exact MIME type ---')
console.log('image/png matches photo.png:', matchesAccept(png, ['image/png']))  // true
console.log('image/jpeg matches photo.png:', matchesAccept(png, ['image/jpeg'])) // false

console.log('--- Empty list accepts everything ---')
console.log('[] matches readme.txt:', matchesAccept(txt, []))  // true

console.log('--- Combined list ---')
const accept = ['image/*', '.pdf']
console.log('Combined matches photo.png:', matchesAccept(png, accept)) // true
console.log('Combined matches report.pdf:', matchesAccept(pdf, accept)) // true
console.log('Combined matches readme.txt:', matchesAccept(txt, accept)) // false`,
  name: 'matchesAccept - Accept Pattern Testing',
};
