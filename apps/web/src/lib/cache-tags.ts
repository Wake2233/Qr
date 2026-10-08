/** Cache tags for `'use cache'` reads. Mutations call `revalidateTag(tag, 'max')`. */
export const cacheTags = {
  siteSettings: 'site-settings',
  vehicles: 'vehicles',
  vehicle: (id: string) => `vehicle:${id}`,
} as const;
