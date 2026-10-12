import { type InferOutput, s } from '@vielzeug/spell';
import { defineArchiveCollection } from '../../src/collection';

/**
 * The recipes fixture collection: the neutral, docs-accurate reference a whole
 * integration suite runs against. It exercises every definition surface — a sorted
 * order-insensitive list (ingredient order is not identity), an enum-constrained
 * filter vocabulary, a derived tag vocabulary, and a bounded searchable title.
 */
export const recipePayloadSchema = s.object({
  cuisine: s.enum(['italian', 'japanese']),
  ingredients: s.array(s.string().trim().min(1).max(64)).min(1).max(20),
  name: s.string().trim().min(1).max(32),
});
export type RecipePayload = InferOutput<typeof recipePayloadSchema>;

export const recipeCollection = defineArchiveCollection({
  // Ingredient order is not identity: sorting folds reordered input into one canonical form.
  canonicalize: (payload) => ({ ...payload, ingredients: [...payload.ingredients].sort() }),
  contentVersion: 1,
  filters: ['italian', 'japanese'],
  index: (payload) => ({
    filter: payload.cuisine,
    tags: [payload.ingredients.length <= 5 ? 'quick' : 'involved'],
    title: payload.name,
  }),
  name: 'recipes',
  payloadSchema: recipePayloadSchema,
  tags: ['quick', 'involved'],
});
