/**
 * Query-key factory shared by web and mobile so invalidations hit the same cache entries.
 * Extended with real filters/params in Phase 3.
 */
export const queryKeys = {
  vehicles: {
    all: ['vehicles'] as const,
    lists: () => [...queryKeys.vehicles.all, 'list'] as const,
    list: (params: Record<string, unknown>) => [...queryKeys.vehicles.lists(), params] as const,
    detail: (slug: string) => [...queryKeys.vehicles.all, 'detail', slug] as const,
  },
} as const;
