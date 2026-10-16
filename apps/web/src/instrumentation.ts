import type { Instrumentation } from 'next';

import { log } from '@/lib/log';

/**
 * Every server error Next.js catches (page renders, Server Actions, route handlers, the proxy)
 * lands here as one log line. `digest` is the "Reference" code the error page shows the visitor,
 * so a screenshot from a customer can be matched to the exact log line in Vercel.
 */
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  const digest =
    error && typeof error === 'object' && 'digest' in error ? String(error.digest) : undefined;
  log.error(
    'request',
    `${context.routeType} failed`,
    {
      method: request.method,
      path: request.path.split('?')[0],
      route: context.routePath,
      source: context.renderSource,
      digest,
    },
    error,
  );
};
