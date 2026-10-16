import { afterEach, describe, expect, it, vi } from 'vitest';

import { describeError, formatLine, log, maskEmail } from './log';

afterEach(() => vi.restoreAllMocks());

describe('formatLine', () => {
  it('joins scope, message and fields into one readable line', () => {
    expect(
      formatLine('auth.request-code', 'code sent', { email: 'ja***@gmail.com', ms: 412 }),
    ).toBe('[auth.request-code] code sent · email=ja***@gmail.com · 412ms');
  });

  it('drops empty fields and joins lists', () => {
    expect(
      formatLine('inventory.save', 'refused: MISSING_FIELDS', {
        fields: ['mileage', 'body_type'],
        empty: [],
        none: undefined,
        blank: '',
        zero: 0,
      }),
    ).toBe('[inventory.save] refused: MISSING_FIELDS · fields=mileage,body_type · zero=0');
  });
});

describe('describeError', () => {
  it('keeps Postgres/Supabase details', () => {
    expect(
      describeError({ name: 'PostgrestError', message: 'denied', code: '42501', hint: 'grant' }),
    ).toMatchObject({ error: 'PostgrestError', message: 'denied', code: '42501', hint: 'grant' });
  });

  it('drops details that only repeat the message', () => {
    expect(describeError({ message: 'fetch failed', details: 'fetch failed' }).details).toBe(
      undefined,
    );
  });

  it('handles non-objects', () => {
    expect(describeError('boom')).toEqual({ error: 'boom' });
  });
});

describe('maskEmail', () => {
  it('keeps the first two letters and the domain', () => {
    expect(maskEmail('jane.doe@gmail.com')).toBe('ja***@gmail.com');
    expect(maskEmail(undefined)).toBeUndefined();
  });
});

describe('log', () => {
  it('writes errors with their details and stack', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    log.error('request', 'render failed', { route: '/x' }, new Error('kaput'));
    const [line, stack] = spy.mock.calls[0] ?? [];
    expect(line).toBe('[request] render failed · error=Error · message=kaput · route=/x');
    expect(String(stack)).toContain('kaput');
  });

  it('uses warn and info levels', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    log.warn('a', 'b');
    log.info('c', 'd', { ok: true });
    expect(warn).toHaveBeenCalledWith('[a] b');
    expect(info).toHaveBeenCalledWith('[c] d · ok=true');
  });
});
