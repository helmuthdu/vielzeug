export const refinementsExample = {
  code: "import { v } from '@vielzeug/validit'\n\nconst passwordSchema = v.string()\n  .min(8)\n  .refine(\n    (val) => /[A-Z]/.test(val),\n    'Must contain uppercase letter'\n  )\n  .refine(\n    (val) => /[a-z]/.test(val),\n    'Must contain lowercase letter'\n  )\n  .refine(\n    (val) => /[0-9]/.test(val),\n    'Must contain number'\n  )\n\nconst passwords = [\n  'weak',\n  'WeakPass',\n  'WeakPass123'\n]\n\npasswords.forEach(pwd => {\n  const result = passwordSchema.safeParse(pwd)\n  console.log(`\"${pwd}\": ${result.success}`)\n  if (!result.success) {\n    console.log('  →', result.error.issues[0].message)\n  }\n})",
  name: 'Custom Refinements',
};
