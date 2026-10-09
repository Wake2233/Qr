import { describe, expect, it } from 'vitest';

import { featureSchema, makeSchema, modelSchema } from './catalog';

describe('catalog schemas', () => {
  it('derives the slug from the name when blank', () => {
    expect(makeSchema.parse({ name: ' Land Rover ' })).toEqual({
      name: 'Land Rover',
      slug: 'land-rover',
    });
    expect(makeSchema.parse({ name: 'Mini', slug: '' })).toEqual({ name: 'Mini', slug: 'mini' });
  });

  it('keeps an explicit slug but validates it', () => {
    expect(modelSchema.parse({ make_id: 3, name: 'X5', slug: 'x5-g05' })).toMatchObject({
      slug: 'x5-g05',
    });
    expect(modelSchema.safeParse({ make_id: 3, name: 'X5', slug: 'Bad Slug' }).success).toBe(false);
  });

  it('requires a feature category', () => {
    expect(featureSchema.safeParse({ name: 'Heated seats' }).success).toBe(false);
    expect(featureSchema.parse({ name: 'Heated seats', category: 'comfort' })).toEqual({
      name: 'Heated seats',
      category: 'comfort',
      slug: 'heated-seats',
    });
  });

  it('rejects empty names', () => {
    expect(makeSchema.safeParse({ name: '  ' }).success).toBe(false);
  });
});
