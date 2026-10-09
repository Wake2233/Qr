/** Supporting documents for dealer applications (private `dealer-docs` bucket). */
export const DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
export const MAX_DOCUMENTS = 5;
