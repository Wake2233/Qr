import { describe, expect, it } from 'vitest';

import { uploadFailureMessage } from './images';

describe('uploadFailureMessage', () => {
  it.each([
    [413, 'That file is too large.'],
    [415, 'That file type isn’t supported.'],
    [403, 'Upload link expired. Refresh the page and try again.'],
    [409, 'That file was already uploaded.'],
    [500, 'Upload failed. Please try again.'],
  ])('%i → %s', (status, message) => {
    expect(uploadFailureMessage(status)).toBe(message);
  });

  it('never shows the raw status code', () => {
    expect(uploadFailureMessage(502)).not.toMatch(/\d/);
  });
});
