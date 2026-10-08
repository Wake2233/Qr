import { slugify } from '@cp/core';
import { Constants } from '@cp/types';
import { z } from 'zod';

import { requiredText, slug } from './shared';

const E = Constants.public.Enums;

/** Slug derived from the name when left blank. */
const slugFromName = <T extends { name: string; slug?: string | null | undefined }>(value: T) => ({
  ...value,
  slug: value.slug?.trim() || slugify(value.name),
});

const withSlug = <S extends z.ZodObject<{ name: z.ZodString }>>(schema: S) =>
  schema
    .extend({ slug: z.string().trim().max(120).nullish() })
    .transform(slugFromName)
    .pipe(schema.extend({ slug }));

export const makeSchema = withSlug(z.object({ name: requiredText(1, 80, 'Enter the make') }));

export const modelSchema = withSlug(
  z.object({
    make_id: z.number().int().positive(),
    name: requiredText(1, 80, 'Enter the model'),
    default_body_type: z.enum(E.body_type).nullish(),
  }),
);

export const featureSchema = withSlug(
  z.object({
    name: requiredText(1, 80, 'Enter the feature'),
    category: z.enum(E.feature_category),
  }),
);

export type MakeInput = z.input<typeof makeSchema>;
export type ModelInput = z.input<typeof modelSchema>;
export type FeatureInput = z.input<typeof featureSchema>;
