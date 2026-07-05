export const segmentWordsExample = {
  code: `import { createIndex, segmentWords } from '@vielzeug/scout'

// CJK text has no spaces between words — segmentWords() inserts them via the
// runtime's native Intl.Segmenter, so word-boundary features work like they do for Latin text
const docs = [
  { id: 1, title: '日本語を勉強しています' },
  { id: 2, title: '我喜欢学习中文' },
  { id: 3, title: 'Learning Japanese is fun' },
]

console.log('Segmented:', segmentWords('日本語を勉強しています'))

const index = createIndex(docs, {
  fields: [{ field: 'title', stringify: (v) => segmentWords(String(v)) }],
})

const results = index.search('日本語')
console.log('Search "日本語":', results.map(r => r.item.title))`,
  name: 'Segmenting Non-Latin Text',
};
