import { createNavigation } from 'next-intl/navigation';

import { routing } from './routing';

/** Locale-aware `Link`/router: `/inventory` stays English, `/ka/inventory` stays Georgian. */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
