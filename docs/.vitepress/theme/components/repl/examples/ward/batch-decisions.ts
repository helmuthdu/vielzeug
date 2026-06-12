export const batchDecisionsExample = {
  code: `import { createWard, rule } from '@vielzeug/ward'

// checkAll returns WardDecisionResult[] — each entry carries resource + action
const ward = createWard([
  ...rule().allow('editor').on('posts').to('read', 'update').build(),
  ...rule().deny('editor').on('posts').to('delete').build(),
])

const editor = { id: 'u1', roles: ['editor'] }

const results = ward.checkAll(editor, [
  { resource: 'posts', action: 'read' },
  { resource: 'posts', action: 'update' },
  { resource: 'posts', action: 'delete' },
  { resource: 'comments', action: 'read' },
])

for (const r of results) {
  const status = r.allowed ? '✅ allow' : \`❌ \${r.reason}\`
  console.log(\`\${r.resource}:\${r.action.padEnd(8)} \${status}\`)
}`,
  name: 'Batch Decisions',
};
