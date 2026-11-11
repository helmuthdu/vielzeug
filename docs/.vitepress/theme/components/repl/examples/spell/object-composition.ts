export const objectCompositionExample = {
  code: `import { s } from '@vielzeug/spell';

const User = s.object({
  email: s.string().email(),
  id: s.string().uuid(),
  name: s.string().min(1),
});

// Derive shapes first; extend() overrides fields with the same key
const Admin = User.extend({ role: s.enum(['owner', 'editor']) });
const PublicUser = User.omit('email');
const UserPatch = User.pick('email', 'name').partial();

console.log(Object.keys(Admin.shape));      // ['email', 'id', 'name', 'role']
console.log(PublicUser.parse({ id: '550e8400-e29b-41d4-a716-446655440000', name: 'Ada' }));
console.log(UserPatch.parse({ name: 'Grace' })); // { name: 'Grace' }

// Checks belong to the final shape: add them after deriving
const Signup = User.pick('email')
  .extend({ confirm: s.string(), password: s.string().min(12) })
  .check((value) => value.password === value.confirm || 'Passwords must match');

console.log(Signup.safeParse({ confirm: 'x', email: 'ada@example.com', password: 'correct horse battery' }).success); // false

// Deriving from a schema with checks throws, because the check was written for the old shape
try {
  Signup.omit('confirm');
} catch (error) {
  console.log(error.name); // 'SpellDefinitionError'
}
`,
  name: 'Object Composition',
};
