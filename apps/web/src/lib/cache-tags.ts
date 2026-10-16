/** Cache tags for `'use cache'` reads. Mutations call `revalidateTag(tag, 'max')`. */
export const cacheTags = {
  siteSettings: 'site-settings',
  /** makes, models and features (search suggestions, hero search, facet option lists) */
  catalog: 'catalog',
  vehicles: 'vehicles',
  vehicle: (id: string) => `vehicle:${id}`,
} as const;
