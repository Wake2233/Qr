/**
 * Pure reducers behind the compare tray and "recently viewed" stores. Each app wires them
 * into a persisted Zustand store (localStorage on web, AsyncStorage on mobile).
 */
export const MAX_COMPARE = 4;
export const MAX_RECENTLY_VIEWED = 12;

export type CompareAddResult = 'added' | 'exists' | 'full';

/** Adds a vehicle to the compare tray unless it is already there or the tray is full. */
export function addToCompare(
  ids: readonly string[],
  id: string,
  max = MAX_COMPARE,
): { ids: string[]; result: CompareAddResult } {
  if (ids.includes(id)) return { ids: [...ids], result: 'exists' };
  if (ids.length >= max) return { ids: [...ids], result: 'full' };
  return { ids: [...ids, id], result: 'added' };
}

export function removeFromCompare(ids: readonly string[], id: string): string[] {
  return ids.filter((v) => v !== id);
}

/** Moves the vehicle to the front, de-duplicated and capped. */
export function pushRecentlyViewed(
  ids: readonly string[],
  id: string,
  max = MAX_RECENTLY_VIEWED,
): string[] {
  return [id, ...ids.filter((v) => v !== id)].slice(0, max);
}
