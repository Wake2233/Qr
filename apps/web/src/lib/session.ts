import 'server-only';

import { getSessionContext } from '@cp/api';
import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';

/** Current user's profile + memberships, de-duplicated per request (layout + page share it). */
export const getSession = cache(async () => getSessionContext(await createClient()));
