export const objectMergeExample = {
  code: `import { s } from '@vielzeug/spell';

// merge() combines two object schemas (right-hand fields win on conflict)
const Base = s.object({
  id: s.string().uuid(),
  createdAt: s.date(),
});

const WithMeta = s.object({
  description: s.string().optional(),
  tags: s.array(s.string()).default(() => []),
});

const Resource = Base.merge(WithMeta);

const result = Resource.parse({
  createdAt: new Date('2025-01-01'),
  id: '550e8400-e29b-41d4-a716-446655440000',
  tags: ['api', 'v2'],
});
console.log(result.tags);   // ['api', 'v2']
console.log(result.id);     // '550e8400-...'

// merge() inherits the right-hand schema's strict/relaxed mode
const Strict = s.object({ a: s.string() });
const Relaxed = s.object({ b: s.number() }).relaxed();

const Merged = Strict.merge(Relaxed);
// Extra keys are allowed because Relaxed is the right-hand schema
console.log(Merged.safeParse({ a: 'hi', b: 1, extra: true }).success); // true

// s.or() is a two-argument alias for s.union()
const IdOrSlug = s.or(s.string().uuid(), s.string().slug());
console.log(IdOrSlug.safeParse('550e8400-e29b-41d4-a716-446655440000').success); // true
console.log(IdOrSlug.safeParse('my-slug').success); // true
console.log(IdOrSlug.safeParse(42).success); // false

// s.and() is a two-argument alias for s.intersect()
const NonEmptyString = s.and(s.string(), s.string().min(1));
console.log(NonEmptyString.parse('hello')); // 'hello'
`,
  name: 'Object Merge & Aliases',
};
