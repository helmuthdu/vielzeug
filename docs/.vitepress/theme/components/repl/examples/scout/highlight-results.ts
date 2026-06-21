export const highlightResultsExample = {
  code: `import { createIndex, highlightField } from '@vielzeug/scout'

const docs = [
  { id: 1, title: 'Getting Started with TypeScript', body: 'TypeScript adds static types to JavaScript.' },
  { id: 2, title: 'Advanced TypeScript Patterns',   body: 'Generics, conditional types, and more.' },
  { id: 3, title: 'JavaScript Fundamentals',        body: 'Learn the basics of JavaScript.' },
  { id: 4, title: 'React with TypeScript',          body: 'Build strongly-typed React components.' },
]

const index = createIndex(docs, {
  fields: [
    { field: 'title', weight: 3 },
    { field: 'body',  weight: 1 },
  ],
})

const results = index.search('typescript')

for (const result of results) {
  const { item } = result
  console.log(\`\\n[doc \${item.id}] \${item.title}\`)

  const titleParts = highlightField(result, 'title', item.title)
  console.log('  title:', titleParts.map(p => p.highlighted ? \`>>>\${p.text}<<<\` : p.text).join(''))

  const bodyParts = highlightField(result, 'body', item.body)
  console.log('  body: ', bodyParts.map(p => p.highlighted ? \`>>>\${p.text}<<<\` : p.text).join(''))
}`,
  name: 'Highlight Results',
};
