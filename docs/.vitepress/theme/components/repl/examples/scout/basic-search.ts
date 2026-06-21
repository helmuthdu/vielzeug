export const basicSearchExample = {
  code: `import { createIndex, highlightField } from '@vielzeug/scout'

const users = [
  { name: 'Alice Johnson', email: 'alice@example.com', role: 'admin' },
  { name: 'Bob Smith',     email: 'bob@example.com',   role: 'editor' },
  { name: 'Charlie Brown', email: 'charlie@example.com', role: 'viewer' },
  { name: 'Alicia Keys',   email: 'alicia@example.com', role: 'editor' },
  { name: 'Dave Alison',   email: 'dave@example.com',   role: 'viewer' },
]

const index = createIndex(users, {
  fields: [
    { field: 'name',  weight: 2 },
    { field: 'email' },
  ],
  threshold: 0.2,
})

const results = index.search('alice')

for (const result of results) {
  const parts   = highlightField(result, 'name', result.item.name)
  const display = parts.map(p => p.highlighted ? \`[\${p.text}]\` : p.text).join('')

  console.log(\`\${display} — \${result.item.email} (\${result.score.toFixed(2)})\`)
}`,
  name: 'Basic Search',
};
