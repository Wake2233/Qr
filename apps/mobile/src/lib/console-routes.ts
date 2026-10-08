import type { ConsoleSection } from '@cp/core';

/** Phase that delivers each console section (mirrors web lib/nav.ts) for placeholders. */
export const consolePhases: Record<ConsoleSection, number> = {
  overview: 3,
  inventory: 4,
  leads: 6,
  finance: 6,
  dealer: 4,
  dealers: 4,
  catalog: 4,
  settings: 4,
  users: 4,
  audit: 7,
};
