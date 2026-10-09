import { randomUUID } from 'expo-crypto';

/** RFC 4122 v4 id for storage paths (Hermes has no crypto.randomUUID). */
export const uuid = (): string => randomUUID();
