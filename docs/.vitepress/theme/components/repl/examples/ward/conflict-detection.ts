export const conflictDetectionExample = {
  code: `// Detect rule conflicts — duplicate and shadowed rules — at startup
import { createWard } from '@vielzeug/ward'

const ward = createWard(
  [
    // Rule 0: viewer can read posts
    { role: 'viewer', resource: 'posts', action: 'read', effect: 'allow' },
    // Rule 1: duplicate — same (role, resource, action), different effect.
    //         One of these can never fire.
    { role: 'viewer', resource: 'posts', action: 'read', effect: 'deny' },
    // Rule 2: shadowed — the wildcard-action allow at higher priority
    //         will always win over this specific deny.
    { role: 'admin', resource: 'posts', action: '*', effect: 'allow', priority: 10 },
    { role: 'admin', resource: 'posts', action: 'delete', effect: 'deny', priority: 5 },
  ],
  {
    onConflict: (c) => {
      console.log(
        \`[conflict] \${c.kind}: Rule[\${c.ruleIndex}] shadowed by Rule[\${c.shadowedByIndex}]\`,
      )
    },
  },
)

const conflicts = ward.detectConflicts()
console.log('Total conflicts detected:', conflicts.length)

conflicts.forEach((c) => {
  console.log(\`  - \${c.kind}: Rule[\${c.ruleIndex}] (\${c.rule.effect}) overshadowed by Rule[\${c.shadowedByIndex}] (\${c.shadowedBy.effect})\`)
})`,
  name: 'Conflict Detection',
};
