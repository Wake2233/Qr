import type { SessionContext } from '@cp/api';

export type ConsoleGate = 'loading' | 'signed-out' | 'denied' | 'allowed';

/** What the manage/ layout should render for the current session state. */
export function consoleGate(loading: boolean, context: SessionContext | null): ConsoleGate {
  if (loading) return 'loading';
  if (!context) return 'signed-out';
  return context.canAccessConsole ? 'allowed' : 'denied';
}
