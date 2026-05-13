export const refinementsExample = {
  code: "import { v } from '@vielzeug/validit'\n\nconst passwordSchema = v.string()\n  .min(8)\n  .check((val) => /[A-Z]/.test(val) || 'Must contain uppercase letter')\n  .check((val) => /[a-z]/.test(val) || 'Must contain lowercase letter')\n  .check((val) => /[0-9]/.test(val) || 'Must contain number')\n\nconst passwords = [\n  'weak',\n  'WeakPass',\n  'WeakPass123'\n]\n\npasswords.forEach((pwd) => {\n  const result = passwordSchema.safeParse(pwd)\n  console.log(`\"${pwd}\": ${result.success}`)\n  if (!result.success) {\n    console.log('  →', result.error.issues[0].message)\n  }\n})",
  name: 'Custom Checks',
};
