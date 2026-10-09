import { slugify } from '@cp/core';
import { Constants } from '@cp/types';
import { z } from 'zod';

import { requiredText, slug } from './shared';

const E = Constants.public.Enums;

/** Optional slug input: blank → derived from the name, then validated. */
const slugInput = z.string().trim().max(120).nullish();
const withDerivedSlug = <T extends { name: string; slug?: string | null | undefined }>(
  value: T,
) => ({
  ...value,
  slug: value.slug || slugify(value.name),
});

export const makeSchema = z
  .object({ name: requiredText(1, 80, 'Enter the make'), slug: slugInput })
  .transform(withDerivedSlug)
  .pipe(z.object({ name: z.string(), slug }));

export const modelSchema = z
  .object({
    make_id: z.number().int().positive(),
    name: requiredText(1, 80, 'Enter the model'),
    slug: slugInput,
    default_body_type: z.enum(E.body_type).nullish(),
  })
  .transform(withDerivedSlug)
  .pipe(
    z.object({
      make_id: z.number(),
      name: z.string(),
      slug,
      default_body_type: z.enum(E.body_type).nullish(),
    }),
  );

export const featureSchema = z
  .object({
    name: requiredText(1, 80, 'Enter the feature'),
    slug: slugInput,
    category: z.enum(E.feature_category),
  })
  .transform(withDerivedSlug)
  .pipe(z.object({ name: z.string(), slug, category: z.enum(E.feature_category) }));

export type MakeInput = z.input<typeof makeSchema>;
export type ModelInput = z.input<typeof modelSchema>;
export type FeatureInput = z.input<typeof featureSchema>;
