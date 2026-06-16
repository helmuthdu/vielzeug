export const batchDecisionsExample = {
  code: `import { allow, createWard, deny } from '@vielzeug/ward'

// checkAll returns WardDecisionResult[] — each entry carries resource + action
const ward = createWard([
  ...allow('editor', 'posts', ['read', 'update']),
  ...deny('editor',  'posts', ['delete']),
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
